// scripts/upload-curriculum.mjs
//
// One-shot bulk uploader for the seeded camp curriculum decks + resources.
// Reads files from ./.curriculum-staging/Curriculum/<camp-folder>/<file> and
// uploads each one to the Supabase Storage "curriculum" bucket at
// curriculum/<slug>/<file>.
//
// Each camp folder maps to one slug via the FOLDER_TO_SLUG table below — the
// zip arrived with emoji-prefixed folder names that got mangled on Windows
// extraction, so we match by suffix (case-insensitive substring) instead of
// the exact folder name. New camps: add a row to the table.
//
// USAGE (PowerShell or bash):
//   $env:SUPABASE_URL="https://<proj>.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY="<paste from Supabase → Settings → API>"
//   node scripts/upload-curriculum.mjs
//
// The service-role key bypasses RLS — required for writing to the bucket.
// Don't commit the key. After the run, you can rotate it from the same UI.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing env. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running.",
  );
  process.exit(1);
}

const STAGING = resolve(".curriculum-staging/Curriculum");

// folder-name substring (lowercased) → camp slug. Substring match because
// Windows extraction butchered the emoji prefixes — "­ܦ Bike Cleveland" etc.
const FOLDER_TO_SLUG = [
  ["bike cleveland", "bike-cleveland"],
  ["boxcraft", "boxcraft"],
  ["fashionforge", "fashionforge"],
  ["fll challenge", "fll-challenge"],
  ["microclimate", "microclimate"],
  ["oda workshop", "oda-workshop"],
  ["robobattles", "robobattles"],
  ["roller coasters", "roller-coasters-drones"],
  ["seaperch", "seaperch"],
  ["seamate", "seamate"],
  ["xrp", "xrp"],
];

function resolveSlug(folder) {
  const lc = folder.toLowerCase();
  for (const [needle, slug] of FOLDER_TO_SLUG) {
    if (lc.includes(needle)) return slug;
  }
  return null;
}

// The seed catalog (src/lib/camp-curriculum.ts) declares the "primary deck"
// filename for camps that have one — used to update camps.slides after upload.
// Camps with day-by-day decks don't have a primary; they get slides=null.
const PRIMARY_SLIDE = {
  "bike-cleveland": "GearUpForSTEM_Slides.pptx",
  "fll-challenge": "FLL_Camp_Slide_Deck.pptx",
  seamate: "Pufferfish_Combined_Slide_Deck.pptx",
};

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function uploadOne(slug, srcPath, fileName) {
  const data = readFileSync(srcPath);
  const dest = `${slug}/${fileName}`;
  const contentType = guessContentType(fileName);
  const { error } = await supabase.storage
    .from("curriculum")
    .upload(dest, data, { contentType, upsert: true });
  if (error) {
    console.error(`  ✗ ${dest} — ${error.message}`);
    return false;
  }
  console.log(`  ✓ ${dest} (${(data.length / 1024).toFixed(0)} KB)`);
  return true;
}

function guessContentType(file) {
  const ext = file.slice(file.lastIndexOf(".") + 1).toLowerCase();
  return (
    {
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ppt: "application/vnd.ms-powerpoint",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      doc: "application/msword",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      xls: "application/vnd.ms-excel",
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      zip: "application/zip",
    }[ext] ?? "application/octet-stream"
  );
}

async function main() {
  let folders;
  try {
    folders = readdirSync(STAGING);
  } catch (e) {
    console.error(`Staging directory missing: ${STAGING}`);
    console.error(
      `Unzip Curriculum.zip into .curriculum-staging/ first, then re-run.`,
    );
    process.exit(1);
  }

  let totalOk = 0;
  let totalFail = 0;
  const slugsTouched = new Set();

  for (const folder of folders) {
    const folderPath = join(STAGING, folder);
    if (!statSync(folderPath).isDirectory()) continue;
    const slug = resolveSlug(folder);
    if (!slug) {
      console.warn(`! No slug mapping for folder: "${folder}" — skipping`);
      continue;
    }
    console.log(`\n[${slug}]  ←  ${folder}`);
    slugsTouched.add(slug);

    const files = readdirSync(folderPath, { withFileTypes: true });
    for (const ent of files) {
      if (!ent.isFile()) continue;
      const ok = await uploadOne(slug, join(folderPath, ent.name), ent.name);
      ok ? totalOk++ : totalFail++;
    }
  }

  // Update camps.slides for the camps that have a primary deck. For camps
  // with day-by-day decks (boxcraft, fashionforge, etc.) the per-day decks
  // are read from the seed catalog client-side, so no DB update is needed.
  console.log(`\nUpdating camps.slides for primary decks…`);
  for (const slug of slugsTouched) {
    const slides = PRIMARY_SLIDE[slug] ?? null;
    if (slides === null) continue;
    const { error } = await supabase
      .from("camps")
      .update({ slides })
      .eq("slug", slug);
    if (error) console.error(`  ✗ ${slug}: ${error.message}`);
    else console.log(`  ✓ ${slug} → slides=${slides}`);
  }

  console.log(`\nDone. ${totalOk} uploaded, ${totalFail} failed.`);
  if (totalFail > 0) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
