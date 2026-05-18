import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HollandHexagon } from "@/components/HollandHexagon";
import { RIASEC, RIASEC_ORDER, type RIASECCode } from "@/lib/riasec";

export const Route = createFileRoute("/assessment/$sessionId/results")({
  head: () => ({ meta: [{ title: "Your results — EXPLR" }] }),
  component: Results,
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
        .eq("session_id", sessionId).maybeSingle();
      if (error) { setError(error.message); return; }
      setRow(data as SessionRow);
    })();
  }, [sessionId]);

  if (error) return <div className="mx-auto max-w-xl px-6 py-24 text-destructive">{error}</div>;
  if (!row) return <div className="mx-auto max-w-xl px-6 py-24 text-charcoal-500">Loading…</div>;
  if (!row.completed_at || !row.holland_code || !row.scale_scores) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24">
        <p className="text-charcoal-500">This assessment isn't finished yet.</p>
        <Link to="/assessment/$sessionId" params={{ sessionId }} className="ink-link mt-4 inline-block">Resume →</Link>
      </div>
    );
  }

  const code = row.holland_code;
  const top = code.split("") as RIASECCode[];
  const primary = RIASEC[top[0]];
  const sorted = [...RIASEC_ORDER].sort((a, b) => (row.scale_scores![b] - row.scale_scores![a]));
  const maxScore = Math.max(...Object.values(row.scale_scores));

  return (
    <div className="min-h-screen">
      <header className="border-b border-charcoal-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link to="/" className="text-sm tracking-tight">EXPLR <span style={{ color: "var(--explr)" }}>Pathways</span></Link>
          <Link to="/" className="text-sm text-charcoal-500 hover:text-ink">Done</Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-20">
        <p className="eyebrow">Your Holland code</p>
        <h1 className="display mt-4">
          <span style={{ color: primary.color }}>{code}</span>
        </h1>
        <p className="lead mt-6 max-w-2xl">
          You leaned strongest toward <strong>{primary.name}</strong>. This is a starting
          point — a lens for asking better questions about what to try next.
        </p>

        <div className="mt-16 grid gap-16 lg:grid-cols-[360px_1fr]">
          <div className="flex justify-center">
            <HollandHexagon size={360} active={top[0]} />
          </div>

          <div>
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
                        <span className="text-xs text-charcoal-400 tabular-nums w-4">{i + 1}</span>
                        <span className="text-sm font-medium" style={{ color: dim.color }}>{dim.code}</span>
                        <span className={isTop ? "text-ink" : "text-charcoal-500"}>{dim.name}</span>
                      </div>
                      <span className="text-sm tabular-nums text-charcoal-500">{score.toFixed(2)}</span>
                    </div>
                    <div className="mt-2 h-1 bg-charcoal-100">
                      <div className="h-full" style={{ width: `${pct}%`, background: dim.color }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <section className="mt-20 border-t border-charcoal-100 pt-12">
          <p className="eyebrow" style={{ color: primary.color }}>{primary.code} · {primary.name}</p>
          <p className="mt-4 text-2xl font-light">{primary.hsDescription}</p>
          <p className="mt-4 text-sm text-charcoal-500">
            Example careers: {primary.examples.join(" · ")}
          </p>
        </section>

        {(row.flag_uniform || row.flag_speeding) && (
          <p className="mt-12 border-l-2 border-charcoal-200 pl-4 text-sm text-charcoal-500">
            Heads up: your answers looked {row.flag_uniform ? "very uniform" : "very fast"}.
            Consider re-taking it when you have a quiet ten minutes.
          </p>
        )}
      </main>
    </div>
  );
}
