import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { RoleGuard } from "@/components/RoleGuard";
import { INTERNSHIPS } from "@/lib/internships-catalog";
import { RIASEC, type RIASECCode } from "@/lib/riasec";
import { sectorLabel } from "@/lib/internship-survey/items";
import type { MatchResult, SectorTapValue } from "@/lib/internship-survey/types";

export const Route = createFileRoute("/assessment/internship-interest_/results")({
  head: () => ({ meta: [{ title: "Your internship matches — EXPLR" }] }),
  component: () => (
    <RoleGuard requires="student">
      <InternshipResults />
    </RoleGuard>
  ),
});

const sb = (table: string): any =>
  (supabase.from as unknown as (n: string) => any)(table);

type ResultRow = {
  holland_code: string | null;
  riasec_norm: Record<RIASECCode, number> | null;
  sector_values: Record<string, SectorTapValue> | null;
  matches: MatchResult[] | null;
};

function InternshipResults() {
  const { user, loading: authLoading } = useSession();
  const navigate = useNavigate();
  const [row, setRow] = useState<ResultRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await sb("internship_survey_results")
        .select("holland_code, riasec_norm, sector_values, matches")
        .eq("student_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!data) {
        navigate({ to: "/assessment/internship-interest", search: { retake: true } });
        return;
      }
      setRow(data as ResultRow);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, navigate]);

  if (authLoading || loading || !row) {
    return <main className="mx-auto max-w-2xl px-6 py-24 text-sm text-charcoal-400">Loading…</main>;
  }

  const code = (row.holland_code ?? "").split("").filter(Boolean) as RIASECCode[];
  const topDims = code.slice(0, 2).map((c) => RIASEC[c]).filter(Boolean);

  // Sectors the student said "yes" to (fall back to "maybe" if none).
  const sv = row.sector_values ?? {};
  let sectorIds = Object.entries(sv).filter(([, v]) => v === 2).map(([id]) => id);
  if (sectorIds.length === 0) sectorIds = Object.entries(sv).filter(([, v]) => v === 1).map(([id]) => id);

  const matches = row.matches ?? [];

  return (
    <div className="min-h-screen">
      <header className="border-b border-charcoal-100">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link to="/student" className="text-sm tracking-tight">
            ← Back to dashboard
          </Link>
          <Link to="/sign-out" className="text-sm text-charcoal-500 hover:text-ink">
            Sign out
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        {/* 1. Here's you */}
        <p className="eyebrow">Your results</p>
        <h1 className="display mt-3">Here&apos;s you.</h1>
        {topDims.length > 0 ? (
          <p className="lead mt-6 max-w-2xl">
            You lean toward{" "}
            {topDims.map((d, i) => (
              <span key={d.code}>
                {i > 0 && " and "}
                <span style={{ color: d.color }} className="font-medium">
                  {d.hsPlainName}
                </span>
              </span>
            ))}
            . {topDims[0].hsDescription} This is a strength to build on — not a box.
          </p>
        ) : (
          <p className="lead mt-6 max-w-2xl">
            Your interests are spread evenly across the board — that&apos;s a great place to
            explore widely. The internships below are a starting point.
          </p>
        )}

        {/* Sector themes */}
        {sectorIds.length > 0 && (
          <div className="mt-8">
            <p className="eyebrow">Areas you&apos;re drawn to</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {sectorIds.map((id) => (
                <li
                  key={id}
                  className="border border-charcoal-200 px-3 py-1.5 text-sm text-charcoal-700"
                >
                  {sectorLabel(id)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 2. Internships you might love */}
        <section className="mt-14 border-t border-charcoal-100 pt-10">
          <h2 className="text-2xl font-light">Internships you might love</h2>
          <p className="mt-2 text-sm text-charcoal-500">
            Ranked for you. You can apply to any EXPLR internship — these are just the
            closest fits to what you told us.
          </p>

          <ul className="mt-8 space-y-4">
            {matches.map((m, i) => {
              const full = INTERNSHIPS.find((x) => x.slug === m.slug);
              return (
                <li key={m.slug} className="border border-charcoal-100 p-5 transition-colors hover:border-ink">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="eyebrow" style={{ color: "var(--explr)" }}>
                        {i + 1}. {m.theme}
                      </p>
                      <h3 className="mt-1 text-lg font-medium leading-tight">
                        <span className="mr-2" aria-hidden>
                          {m.emoji}
                        </span>
                        {m.name}
                      </h3>
                    </div>
                    {full && (
                      <a
                        href={full.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 text-xs text-charcoal-500 hover:text-ink"
                      >
                        Visit site →
                      </a>
                    )}
                  </div>
                  {full?.deliverables && (
                    <p className="mt-3 text-sm text-charcoal-500">{full.deliverables}</p>
                  )}
                  <p className="mt-3 text-sm italic" style={{ color: "var(--explr)" }}>
                    Why this fits you: {m.whyFit}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* 3. CTA */}
        <section className="mt-14 border-t border-charcoal-100 pt-10">
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/student/apply" className="btn-ink">
              Apply to internships →
            </Link>
            <Link to="/student" className="btn-ghost">
              Back to dashboard
            </Link>
            <Link
              to="/assessment/internship-interest"
              search={{ retake: true }}
              className="text-sm text-charcoal-500 hover:text-ink"
            >
              Retake the survey
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
