import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SurveyResultsPanel } from "@/components/SurveyResultsPanel";
import { INTERNSHIPS } from "@/lib/internships-catalog";

/**
 * StudentAssessmentDetail — every assessment a single student has taken, with a
 * breakdown of results for each: RIASEC interest scores, the STEM (S-STEM)
 * survey, the internship interest survey, and the aptitude battery. Admin-only
 * data (relies on the admin read policies on these result tables).
 */

const RIASEC = [
  { k: "R", label: "Realistic" },
  { k: "I", label: "Investigative" },
  { k: "A", label: "Artistic" },
  { k: "S", label: "Social" },
  { k: "E", label: "Enterprising" },
  { k: "C", label: "Conventional" },
];
const SLUG_NAME: Record<string, string> = Object.fromEntries(INTERNSHIPS.map((i) => [i.slug, i.name]));

type Riasec = { code: string | null; scores: Record<string, number> };
type Apt = { band: string; subscale: Record<string, number>; total: number; items: number; at: string };
type Interest = { internship_slug: string; response: string };

export function StudentAssessmentDetail({ studentId }: { studentId: string }) {
  const [riasec, setRiasec] = useState<Riasec | null | undefined>(undefined);
  const [interest, setInterest] = useState<Interest[] | null>(null);
  const [apt, setApt] = useState<Apt[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: sess }, { data: ints }, { data: aps }] = await Promise.all([
        supabase
          .from("assessment_sessions")
          .select("holland_code, scale_scores, completed_at")
          .eq("student_id", studentId)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("internship_interest_responses")
          .select("internship_slug, response")
          .eq("student_id", studentId),
        supabase
          .from("aptitude_results")
          .select("band, subscale_scores, total_score, total_items, completed_at")
          .eq("student_id", studentId)
          .order("completed_at", { ascending: false }),
      ]);
      if (cancelled) return;
      setRiasec(
        sess
          ? { code: (sess.holland_code as string) ?? null, scores: (sess.scale_scores as Record<string, number>) ?? {} }
          : null,
      );
      setInterest((ints as Interest[]) ?? []);
      setApt(
        ((aps as Array<{ band: string; subscale_scores: unknown; total_score: number; total_items: number; completed_at: string }>) ?? []).map((a) => ({
          band: a.band,
          subscale: (a.subscale_scores as Record<string, number>) ?? {},
          total: a.total_score,
          items: a.total_items,
          at: a.completed_at,
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const score = (key: string) =>
    riasec?.scores[key] ?? riasec?.scores[key.toLowerCase()] ?? 0;
  const riasecMax = riasec ? Math.max(1, ...RIASEC.map((r) => score(r.k))) : 1;
  const yes = (interest ?? []).filter((i) => i.response === "yes");
  const maybe = (interest ?? []).filter((i) => i.response === "maybe");

  return (
    <div className="space-y-8 bg-white p-5">
      {/* RIASEC */}
      <Section title="RIASEC interest assessment">
        {riasec === undefined ? (
          <Loading />
        ) : riasec === null ? (
          <Empty>Not taken yet.</Empty>
        ) : (
          <div>
            {riasec.code && (
              <p className="text-sm">
                Holland code: <span className="font-mono font-semibold tracking-wider">{riasec.code}</span>
              </p>
            )}
            <ul className="mt-3 space-y-2">
              {RIASEC.map((r) => {
                const v = score(r.k);
                return (
                  <li key={r.k} className="flex items-center gap-3 text-sm">
                    <span className="w-28 shrink-0 text-charcoal-600">{r.label}</span>
                    <div className="relative h-2 flex-1 bg-charcoal-100">
                      <div
                        className="absolute inset-y-0 left-0"
                        style={{ width: `${Math.round((v / riasecMax) * 100)}%`, background: "var(--color-explr-500)" }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right tabular-nums text-charcoal-500">{v}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Section>

      {/* STEM survey — reuses the validated S-STEM scoring */}
      <Section title="STEM survey (S-STEM)">
        <SurveyResultsPanel studentId={studentId} />
      </Section>

      {/* Internship interest */}
      <Section title="Internship interest survey">
        {interest === null ? (
          <Loading />
        ) : interest.length === 0 ? (
          <Empty>Not taken yet.</Empty>
        ) : (
          <div className="text-sm">
            <p className="text-charcoal-500">
              {yes.length} interested · {maybe.length} maybe · {interest.length - yes.length - maybe.length} not for them
            </p>
            {yes.length > 0 && (
              <p className="mt-2">
                <span className="text-charcoal-500">Interested in: </span>
                {yes.map((i) => SLUG_NAME[i.internship_slug] ?? i.internship_slug).join(", ")}
              </p>
            )}
            {maybe.length > 0 && (
              <p className="mt-1 text-charcoal-500">
                Maybe: {maybe.map((i) => SLUG_NAME[i.internship_slug] ?? i.internship_slug).join(", ")}
              </p>
            )}
          </div>
        )}
      </Section>

      {/* Aptitude */}
      <Section title="Aptitude battery">
        {apt === null ? (
          <Loading />
        ) : apt.length === 0 ? (
          <Empty>Not taken yet.</Empty>
        ) : (
          <div className="space-y-4">
            {apt.map((a, idx) => {
              const entries = Object.entries(a.subscale).filter(([, v]) => typeof v === "number");
              const max = Math.max(1, ...entries.map(([, v]) => v as number));
              return (
                <div key={idx}>
                  <p className="text-sm">
                    <span className="font-medium">{a.band}</span>{" "}
                    <span className="text-charcoal-500">
                      · {a.total}/{a.items} overall
                    </span>
                  </p>
                  <ul className="mt-2 space-y-2">
                    {entries.map(([k, v]) => (
                      <li key={k} className="flex items-center gap-3 text-sm">
                        <span className="w-28 shrink-0 text-charcoal-600 capitalize">{k.replace(/_/g, " ")}</span>
                        <div className="relative h-2 flex-1 bg-charcoal-100">
                          <div className="absolute inset-y-0 left-0 bg-charcoal-400" style={{ width: `${Math.round(((v as number) / max) * 100)}%` }} />
                        </div>
                        <span className="w-10 shrink-0 text-right tabular-nums text-charcoal-500">{v as number}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal-400">{title}</h4>
      <div className="mt-2">{children}</div>
    </div>
  );
}
function Loading() {
  return <p className="text-sm text-charcoal-400">Loading…</p>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-charcoal-400">{children}</p>;
}
