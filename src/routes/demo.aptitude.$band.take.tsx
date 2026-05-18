import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { RoleGuard } from "@/components/RoleGuard";
import {
  getItems,
  scoreAptitude,
  SUBSCALE_LABELS,
  type AptitudeBand,
  type AptitudeSubscale,
} from "@/lib/aptitude-items";

export const Route = createFileRoute("/demo/aptitude/$band/take")({
  head: () => ({ meta: [{ title: "Aptitude battery — EXPLR" }] }),
  component: () => (
    <RoleGuard requires="student">
      <AptitudeTake />
    </RoleGuard>
  ),
});

function AptitudeTake() {
  const { band: bandParam } = Route.useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useSession();

  const band: AptitudeBand = bandParam === "HS" ? "HS" : "MS";
  const items = useMemo(() => getItems(band), [band]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof scoreAptitude> | null>(null);
  const [startedAt] = useState(() => new Date().toISOString());

  if (authLoading) {
    return <main className="mx-auto max-w-2xl px-6 py-24 text-sm text-charcoal-400">Loading…</main>;
  }

  async function submit() {
    if (!user) return;
    const unanswered = items.filter((i) => answers[i.id] === undefined);
    if (unanswered.length > 0) {
      setError(`Please answer all ${items.length} items (${unanswered.length} remaining).`);
      return;
    }
    setSubmitting(true);
    setError(null);
    const scored = scoreAptitude(band, answers);
    const { error: insErr } = await supabase.from("aptitude_results").insert({
      student_id: user.id,
      band,
      subscale_scores: scored.subscale_scores,
      total_score: scored.total_score,
      total_items: scored.total_items,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    });
    if (insErr) {
      setError(insErr.message);
      setSubmitting(false);
      return;
    }
    setResult(scored);
    setSubmitting(false);
  }

  const answeredCount = items.filter((i) => answers[i.id] !== undefined).length;

  if (result) {
    return (
      <div className="min-h-screen">
        <header className="border-b border-charcoal-100">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
            <Link to="/" className="text-sm tracking-tight">
              EXPLR <span style={{ color: "var(--explr)" }}>Pathways</span>
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-6 py-16">
          <p className="eyebrow">Aptitude battery · {band}</p>
          <h1 className="display mt-3">Your results</h1>
          <p className="lead mt-6">
            You answered <strong>{result.total_score} of {result.total_items}</strong> correctly.
          </p>
          <ul className="mt-10 space-y-4">
            {(Object.keys(result.subscale_scores) as AptitudeSubscale[]).map((k) => {
              const s = result.subscale_scores[k];
              const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
              return (
                <li key={k} className="border-t border-charcoal-100 pt-4">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-medium">{SUBSCALE_LABELS[k]}</p>
                    <p className="text-sm text-charcoal-500">{s.correct} / {s.total} ({pct}%)</p>
                  </div>
                  <div className="mt-2 h-1.5 w-full bg-charcoal-100">
                    <div className="h-full" style={{ width: `${pct}%`, background: "var(--ink)" }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-12">
            <button onClick={() => navigate({ to: "/student" })} className="btn-ink">
              Back to dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-charcoal-100">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-sm tracking-tight">
            EXPLR <span style={{ color: "var(--explr)" }}>Pathways</span>
          </Link>
          <div className="text-xs text-charcoal-500">{answeredCount} of {items.length}</div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="eyebrow">Aptitude battery · {band}</p>
        <h1 className="display mt-3">{band === "MS" ? "Middle-school" : "High-school"} aptitude</h1>
        <p className="lead mt-6 max-w-2xl">
          A short battery covering numeric, pattern, and verbal reasoning. Pick the best answer for
          each item. You'll see your scores right after you submit.
        </p>

        <ol className="mt-12 space-y-10">
          {items.map((item, idx) => (
            <li key={item.id} className="border-t border-charcoal-100 pt-6">
              <p className="eyebrow" style={{ color: "var(--explr)" }}>
                {idx + 1}. {SUBSCALE_LABELS[item.subscale]}
              </p>
              <p className="mt-3 text-lg">{item.prompt}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {item.choices.map((choice, ci) => {
                  const selected = answers[item.id] === ci;
                  return (
                    <button
                      key={ci}
                      onClick={() => setAnswers((a) => ({ ...a, [item.id]: ci }))}
                      className="border px-4 py-3 text-left text-sm transition-colors"
                      style={{
                        borderColor: selected ? "var(--ink)" : "var(--color-charcoal-200)",
                        background: selected ? "var(--ink)" : "transparent",
                        color: selected ? "white" : "var(--color-charcoal-700)",
                      }}
                    >
                      {choice}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ol>

        {error && <p className="mt-8 text-sm text-destructive">{error}</p>}

        <div className="mt-12 flex items-center justify-between">
          <Link to="/student" className="text-sm text-charcoal-500 hover:text-ink">← Cancel</Link>
          <button onClick={submit} disabled={submitting} className="btn-ink disabled:opacity-50">
            {submitting ? "Saving…" : "Submit aptitude battery"}
          </button>
        </div>
      </main>
    </div>
  );
}
