import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { ITEMS } from "@/lib/assessment-items";
import { RIASEC, type RIASECCode } from "@/lib/riasec";

/**
 * AssessmentPhotosPanel — upload a context photo per RIASEC question.
 *
 * Files go to the public "assessment-photos" bucket keyed by item id;
 * the resolved URL is recorded in assessment_item_photos. The assessment
 * runner reads that map and shows the photo above each prompt. Items
 * without a photo show the dimension-colored band, so this is purely
 * additive — fill them in over time.
 */

const BUCKET = "assessment-photos";
// assessment_item_photos isn't in the generated Database type yet; loosen
// to any so column names on this table don't fail the typed-client check.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = (table: string): any => (supabase.from as unknown as (n: string) => any)(table);

const ACCEPT = ".jpg,.jpeg,.png,.webp";
const SCALE_ORDER: RIASECCode[] = ["R", "I", "A", "S", "E", "C"];

export function AssessmentPhotosPanel() {
  const { user } = useSession();
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const bulkInput = useRef<HTMLInputElement | null>(null);

  // Valid item ids, for matching uploaded filenames (R1.jpg → R1).
  const validIds = useMemo(() => new Set(ITEMS.map((i) => i.id)), []);

  async function load() {
    setLoading(true);
    const { data, error } = await sb("assessment_item_photos").select("item_id, url");
    if (error) setErr(error.message);
    const m: Record<string, string> = {};
    for (const r of (data ?? []) as Array<{ item_id: string; url: string }>) {
      m[r.item_id] = r.url;
    }
    setUrls(m);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const byScale = useMemo(() => {
    const g: Record<RIASECCode, typeof ITEMS> = { R: [], I: [], A: [], S: [], E: [], C: [] };
    for (const it of ITEMS) g[it.scale].push(it);
    return g;
  }, []);

  // Upload one file for one item. Returns the new URL, or null + sets err.
  async function uploadOne(itemId: string, file: File): Promise<string | null> {
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(itemId, file, { upsert: true, contentType: file.type || undefined });
    if (upErr) {
      setErr(`${itemId}: ${upErr.message}`);
      return null;
    }
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(itemId);
    const url = `${pub.publicUrl}?t=${Date.now()}`;
    const { error: rowErr } = await sb("assessment_item_photos").upsert({
      item_id: itemId,
      url,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    } as never);
    if (rowErr) {
      setErr(`${itemId}: ${rowErr.message}`);
      return null;
    }
    return url;
  }

  async function upload(itemId: string, file: File) {
    setBusy(itemId);
    setErr(null);
    const url = await uploadOne(itemId, file);
    if (url) setUrls((m) => ({ ...m, [itemId]: url }));
    setBusy(null);
  }

  /**
   * Bulk import: take a multi-file selection where each filename matches
   * a question id (R1.jpg, c2.png, …), upload them all, and register
   * each. Files whose name doesn't match a known item are skipped.
   */
  async function bulkImport(files: FileList) {
    setErr(null);
    const matched: Array<{ id: string; file: File }> = [];
    const skipped: string[] = [];
    for (const f of Array.from(files)) {
      const base = f.name.replace(/\.[^.]+$/, "").trim().toUpperCase();
      if (validIds.has(base)) matched.push({ id: base, file: f });
      else skipped.push(f.name);
    }
    if (matched.length === 0) {
      setErr(
        "No files matched a question id. Name each file by its id, e.g. R1.jpg.",
      );
      return;
    }
    setBulk({ done: 0, total: matched.length });
    const next: Record<string, string> = {};
    for (let i = 0; i < matched.length; i++) {
      const { id, file } = matched[i];
      const url = await uploadOne(id, file);
      if (url) next[id] = url;
      setBulk({ done: i + 1, total: matched.length });
    }
    setUrls((m) => ({ ...m, ...next }));
    setBulk(null);
    const okCount = Object.keys(next).length;
    setErr(
      `Imported ${okCount} photo${okCount === 1 ? "" : "s"}.` +
        (skipped.length ? ` Skipped ${skipped.length} (name didn't match an id).` : ""),
    );
  }

  async function remove(itemId: string) {
    if (!confirm(`Remove the photo for ${itemId}?`)) return;
    setBusy(itemId);
    await supabase.storage.from(BUCKET).remove([itemId]);
    await sb("assessment_item_photos").delete().eq("item_id", itemId);
    setUrls((m) => {
      const next = { ...m };
      delete next[itemId];
      return next;
    });
    setBusy(null);
  }

  const withPhoto = Object.keys(urls).length;

  return (
    <div>
      <p className="lead">
        Add a context photo to each assessment question. Students see it
        above the prompt; questions without a photo show a colored band.
      </p>
      <p className="mt-2 text-xs text-charcoal-500">
        {withPhoto} of {ITEMS.length} questions have a photo. Use clear,
        realistic, classroom-appropriate images (JPG, PNG, or WebP).
      </p>

      {/* Bulk import: pick many files named by question id at once. */}
      <div className="mt-4 flex flex-wrap items-center gap-3 border border-charcoal-100 bg-charcoal-50 p-3">
        <button
          onClick={() => bulkInput.current?.click()}
          disabled={!!bulk}
          className="btn-ink text-xs disabled:opacity-50"
        >
          {bulk ? `Importing ${bulk.done}/${bulk.total}…` : "Bulk import photos"}
        </button>
        <span className="text-xs text-charcoal-500">
          Select all files at once — each named by its question id
          (<code className="font-mono">R1.jpg</code>, <code className="font-mono">C2.png</code>…).
        </span>
        <input
          ref={bulkInput}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) bulkImport(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {err && <p className="mt-3 text-sm text-charcoal-600">{err}</p>}

      {loading ? (
        <p className="mt-6 text-sm text-charcoal-400">Loading…</p>
      ) : (
        <div className="mt-6 space-y-8">
          {SCALE_ORDER.map((code) => {
            const dim = RIASEC[code];
            return (
              <div key={code}>
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: dim.color }}
                  />
                  <h3 className="text-sm font-semibold">{dim.name}</h3>
                </div>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {byScale[code].map((it) => {
                    const url = urls[it.id];
                    return (
                      <li
                        key={it.id}
                        className="flex gap-3 border border-charcoal-100 p-3"
                      >
                        <div
                          className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded"
                          style={{ background: dim.colorSoft }}
                        >
                          {url ? (
                            <img
                              src={url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span
                              className="text-[10px] font-semibold"
                              style={{ color: dim.color }}
                            >
                              {it.id}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-charcoal-500">
                            {it.id}
                          </p>
                          <p className="text-xs leading-snug text-ink line-clamp-2">
                            {it.hs}
                          </p>
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => inputs.current[it.id]?.click()}
                              disabled={busy === it.id}
                              className="text-xs text-explr-600 hover:underline disabled:opacity-50"
                            >
                              {busy === it.id
                                ? "Uploading…"
                                : url
                                  ? "Replace"
                                  : "Upload"}
                            </button>
                            {url && (
                              <button
                                onClick={() => remove(it.id)}
                                disabled={busy === it.id}
                                className="text-xs text-red-600 hover:underline disabled:opacity-50"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <input
                            ref={(el) => {
                              inputs.current[it.id] = el;
                            }}
                            type="file"
                            accept={ACCEPT}
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) upload(it.id, f);
                              e.target.value = "";
                            }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
