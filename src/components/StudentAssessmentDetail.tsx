import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SurveyResultsPanel } from "@/components/SurveyResultsPanel";

/**
 * StudentAssessmentDetail — every assessment a single student has taken, with a
 * breakdown of results for each: RIASEC interest scores and the STEM (S-STEM)
 * survey. Admin-only data (relies on the admin read policies on these result
 * tables).
 */

const RIASEC = [
  { k: "R", label: "Realistic" },
  { k: "I", label: "Investigative" },
  { k: "A", label: "Artistic" },
  { k: "S", label: "Social" },
  { k: "E", label: "Enterprising" },
  { k: "C", label: "Conventional" },
];

type Riasec = { code: string | null; scores: Record<string, number> };

export function StudentAssessmentDetail({ studentId }: { studentId: string }) {
  const [riasec, setRiasec] = useState<Riasec | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase
        .from("assessment_sessions")
        .select("holland_code, scale_scores, completed_at")
        .eq("student_id", studentId)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setRiasec(
        sess
          ? {
              code: (sess.holland_code as string) ?? null,
              scores: (sess.scale_scores as Record<string, number>) ?? {},
            }
          : null,
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const score = (key: string) => riasec?.scores[key] ?? riasec?.scores[key.toLowerCase()] ?? 0;
  const riasecMax = riasec ? Math.max(1, ...RIASEC.map((r) => score(r.k))) : 1;

  return (
    <div className="space-y-8 bg-paper-raised p-4 sm:p-5">
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
                Holland code:{" "}
                <span className="font-mono font-semibold tracking-wider">{riasec.code}</span>
              </p>
            )}
            <ul className="mt-3 space-y-2">
              {RIASEC.map((r) => {
                const v = score(r.k);
                return (
                  <li key={r.k} className="flex items-center gap-3 text-sm">
                    <span className="w-28 shrink-0 text-ink-700">{r.label}</span>
                    <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-paper-sunken">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-green"
                        style={{ width: `${Math.round((v / riasecMax) * 100)}%` }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right tabular-nums text-ink-500">{v}</span>
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
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="eyebrow">{title}</h4>
      <div className="mt-2">{children}</div>
    </div>
  );
}
function Loading() {
  return <p className="text-sm text-ink-500">Loading…</p>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-ink-500">{children}</p>;
}
