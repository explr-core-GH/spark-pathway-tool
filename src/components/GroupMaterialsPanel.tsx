import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { CurriculumFilesPanel } from "@/components/CurriculumFilesPanel";
import type { GroupKind } from "@/lib/admin-groups";

/**
 * GroupMaterialsPanel — the materials a group works from, in place.
 *
 *   camps        → the linked curriculum item's Storage files (reuses
 *                  CurriculumFilesPanel: upload, set primary deck, delete).
 *   internships  → the offering's partners / deliverables / project link.
 *   classes      → no materials model yet; points back to the library.
 */

export function GroupMaterialsPanel({ kind, id }: { kind: GroupKind; id: string }) {
  if (kind === "camps") return <CampMaterials campId={id} />;
  if (kind === "internships") return <InternshipMaterials slug={id} />;
  return (
    <p className="max-w-xl text-sm text-charcoal-600">
      Class materials aren&apos;t wired up yet. For now, share resources through the{" "}
      <Link to="/educator/admin/camps" className="ink-link">
        curriculum library
      </Link>
      .
    </p>
  );
}

function CampMaterials({ campId }: { campId: string }) {
  const [slug, setSlug] = useState<string | null | undefined>(undefined);
  const [primary, setPrimary] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: camp } = await supabase
        .from("explr_camps")
        .select("linked_camp_slug")
        .eq("id", campId)
        .maybeSingle();
      const s = (camp?.linked_camp_slug as string | null) ?? null;
      if (cancelled) return;
      setSlug(s);
      if (s) {
        const { data: cur } = await supabase
          .from("camps")
          .select("slides")
          .eq("slug", s)
          .maybeSingle();
        if (!cancelled) setPrimary((cur?.slides as string | null) ?? null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campId]);

  if (slug === undefined) return <p className="text-sm text-charcoal-400">Loading materials…</p>;
  if (slug === null) {
    return (
      <p className="max-w-xl text-sm text-charcoal-600">
        This camp session isn&apos;t linked to a curriculum item, so there are no
        shared files. Link it from{" "}
        <Link to="/educator/admin/camps" className="ink-link">
          Curriculum
        </Link>{" "}
        to attach slide decks and resources.
      </p>
    );
  }
  return (
    <div className="max-w-2xl">
      <CurriculumFilesPanel slug={slug} primaryDeck={primary} onPrimaryChange={setPrimary} />
    </div>
  );
}

type Offering = {
  name: string;
  theme: string | null;
  outside_partners: string | null;
  deliverables: string | null;
  external_url: string | null;
};

function InternshipMaterials({ slug }: { slug: string }) {
  const [row, setRow] = useState<Offering | null | undefined>(undefined);

  useEffect(() => {
    supabase
      .from("internships")
      .select("name, theme, outside_partners, deliverables, external_url")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => setRow((data as Offering) ?? null));
  }, [slug]);

  if (row === undefined) return <p className="text-sm text-charcoal-400">Loading…</p>;
  if (row === null) return <p className="text-sm text-charcoal-400">Offering not found.</p>;

  return (
    <div className="max-w-2xl space-y-5">
      {row.theme && <Field label="Theme" value={row.theme} />}
      {row.outside_partners && <Field label="Outside partners" value={row.outside_partners} />}
      {row.deliverables && <Field label="Deliverables" value={row.deliverables} />}
      {row.external_url && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-charcoal-400">Project link</p>
          <a
            href={row.external_url}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 block text-sm text-explr-600 hover:underline"
          >
            {row.external_url}
          </a>
        </div>
      )}
      <p className="border-t border-charcoal-100 pt-4 text-xs text-charcoal-500">
        Edit these on the{" "}
        <Link to="/educator/admin/internships" className="ink-link">
          offering
        </Link>
        .
      </p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-charcoal-400">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap text-sm text-charcoal-700">{value}</p>
    </div>
  );
}
