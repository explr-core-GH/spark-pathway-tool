import { PortalHeader, type PortalLink } from "@/components/passport/PortalHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HollandHexagon } from "@/components/HollandHexagon";
import { RIASEC, RIASEC_ORDER, type RIASECCode } from "@/lib/riasec";
import { RoleGuard } from "@/components/RoleGuard";

const STUDENT_LINKS: PortalLink[] = [
  { label: "My passport", to: "/student" },
  { label: "Opportunities", to: "/opportunities" },
  { label: "Families", to: "/student/pathway", search: { tab: "families" } },
];

export const Route = createFileRoute("/assessment/$sessionId_/results")({
  head: () => ({ meta: [{ title: "Your results — EXPLR" }] }),
  component: () => (
    <RoleGuard requires="student">
      <Results />
    </RoleGuard>
  ),
});

type SessionRow = {
  holland_code: string | null;
  scale_scores: Record<RIASECCode, number> | null;
  completed_at: string | null;
  flag_uniform: boolean | null;
  flag_speeding: boolean | null;
};

function Results() {
  const { sessionId } = Route.useParams();
  const [row, setRow] = useState<SessionRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("assessment_sessions")
        .select("holland_code, scale_scores, completed_at, flag_uniform, flag_speeding")
        .eq("session_id", sessionId)
        .maybeSingle();
      if (error) {
        setError(error.message);
        return;
      }
      setRow(data as SessionRow);
    })();
  }, [sessionId]);

  if (error)
    return (
      <main role="alert" className="mx-auto max-w-xl px-6 py-24 text-red-700">
        {error}
      </main>
    );
  if (!row)
    return (
      <main role="status" className="mx-auto max-w-xl px-6 py-24 text-ink-500">
        Loading…
      </main>
    );
  if (!row.completed_at || !row.holland_code || !row.scale_scores) {
    return (
      <main className="mx-auto max-w-xl px-6 py-24">
        <h1 className="font-display text-2xl font-bold">This assessment isn't finished yet.</h1>
        <Link to="/assessment/$sessionId" params={{ sessionId }} className="btn-ink mt-4">
          Resume the assessment →
        </Link>
      </main>
    );
  }

  const code = row.holland_code;
  const top = code.split("") as RIASECCode[];
  const primary = RIASEC[top[0]];
  const sorted = [...RIASEC_ORDER].sort((a, b) => row.scale_scores![b] - row.scale_scores![a]);
  const maxScore = Math.max(...Object.values(row.scale_scores));

  return (
    <div className="min-h-screen bg-paper text-ink-900">
      <PortalHeader role="Student" links={STUDENT_LINKS} signedIn />

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Link
          to="/student"
          className="inline-flex min-h-[44px] items-center text-sm font-medium text-green-deep hover:underline"
        >
          ← My passport
        </Link>
        <p className="eyebrow text-green">Your Holland code</p>
        <h1 className="display mt-2">
          <span style={{ color: primary.color }}>{code}</span>
        </h1>
        <p className="lead mt-6 max-w-2xl">
          You leaned strongest toward <strong>{primary.name}</strong>. This is a starting point — a
          lens for asking better questions about what to try next.
        </p>

        <div className="mt-12 grid gap-8 lg:grid-cols-[360px_1fr]">
          <div className="flex justify-center rounded-[var(--radius-card)] border border-line bg-paper-raised p-6 shadow-card">
            <HollandHexagon size={300} active={top[0]} />
          </div>

          <div className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-6 shadow-card">
            <p className="eyebrow">All six dimensions</p>
            <ul className="mt-6 space-y-4">
              {sorted.map((c, i) => {
                const dim = RIASEC[c];
                const score = row.scale_scores![c];
                const pct = maxScore > 0 ? (score / 5) * 100 : 0;
                const isTop = top.includes(c);
                return (
                  <li key={c}>
                    <div className="flex items-baseline justify-between gap-4">
                      <div className="flex items-baseline gap-3">
                        <span className="w-4 text-xs tabular-nums text-ink-500">{i + 1}</span>
                        <span className="text-sm font-medium" style={{ color: dim.color }}>
                          {dim.code}
                        </span>
                        <span className={isTop ? "text-ink-900" : "text-ink-500"}>{dim.name}</span>
                      </div>
                      <span className="text-sm tabular-nums text-ink-500">{score.toFixed(2)}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-sunken">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: dim.color }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <section className="mt-12 border-t border-line pt-10">
          <p className="eyebrow" style={{ color: primary.color }}>
            {primary.code} · {primary.name}
          </p>
          <p className="mt-4 font-display text-2xl font-bold">{primary.hsDescription}</p>
          <p className="mt-4 text-ink-700">Example careers: {primary.examples.join(" · ")}</p>
        </section>

        {(row.flag_uniform || row.flag_speeding) && (
          <p
            role="status"
            className="mt-12 rounded-[var(--radius-card)] bg-gold-tint px-4 py-3 text-sm text-ink-900"
          >
            Heads up: your answers looked {row.flag_uniform ? "very uniform" : "very fast"}.
            Consider re-taking it when you have a quiet ten minutes.
          </p>
        )}
      </main>
      <SiteFooter className="mt-16" />
    </div>
  );
}
