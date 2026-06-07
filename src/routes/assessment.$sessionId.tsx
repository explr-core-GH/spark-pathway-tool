import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ITEMS, LIKERT_LABELS, scoreResponses, type LikertValue } from "@/lib/assessment-items";
import { RIASEC } from "@/lib/riasec";
import { RoleGuard } from "@/components/RoleGuard";

export const Route = createFileRoute("/assessment/$sessionId")({
  head: () => ({ meta: [{ title: "Assessment — EXPLR" }] }),
  component: () => (
    <RoleGuard requires="student">
      <AssessmentRunner />
    </RoleGuard>
  ),
});

type SessionRow = {
  session_id: string;
  student_id: string;
  grade_at_session: number;
  item_sequence: string[];
  current_index: number;
  items_answered: number;
  completed_at: string | null;
};

function AssessmentRunner() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shownAt, setShownAt] = useState<number>(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const itemMap = useMemo(() => new Map(ITEMS.map((i) => [i.id, i])), []);
  // item_id → admin-uploaded context photo URL (overrides the static
  // item.image). Loaded once alongside the session.
  const [photos, setPhotos] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("assessment_sessions")
        .select("session_id, student_id, grade_at_session, item_sequence, current_index, items_answered, completed_at")
        .eq("session_id", sessionId).maybeSingle();
      if (error) { setError(error.message); return; }
      if (!data) { setError("Session not found."); return; }
      if (data.completed_at) {
        navigate({ to: "/assessment/$sessionId/results", params: { sessionId } });
        return;
      }
      setSession(data as SessionRow);
      setShownAt(Date.now());
      // Photos are optional — ignore errors (table may be empty / absent).
      // Loosened to any: assessment_item_photos isn't in the generated type.
      (supabase.from as unknown as (n: string) => {
        select: (c: string) => Promise<{ data: Array<{ item_id: string; url: string }> | null }>;
      })("assessment_item_photos")
        .select("item_id, url")
        .then(({ data: rows }) => {
          const m: Record<string, string> = {};
          for (const r of rows ?? []) m[r.item_id] = r.url;
          setPhotos(m);
        });
    })();
  }, [sessionId, navigate]);

  if (error) return <div className="mx-auto max-w-xl px-6 py-24 text-destructive">{error}</div>;
  if (!session) return <div className="mx-auto max-w-xl px-6 py-24 text-charcoal-500">Loading…</div>;

  const total = session.item_sequence.length;
  const idx = session.current_index;
  const itemId = session.item_sequence[idx];
  const item = itemMap.get(itemId);
  const useMs = session.grade_at_session <= 6;
  const prompt = item ? (useMs ? item.ms : item.hs) : "—";
  const scale = item ? RIASEC[item.scale] : null;
  const pct = Math.round((idx / total) * 100);

  // Emoji faces paired with each Likert value — easier for younger and
  // diverse learners than bare numbers. Labels stay, so the meaning is
  // never carried by the emoji alone (accessibility).
  const FACES: Record<LikertValue, string> = {
    1: "😣",
    2: "🙁",
    3: "😐",
    4: "🙂",
    5: "😄",
  };

  async function answer(value: LikertValue) {
    if (!session || !item || submitting) return;
    setSubmitting(true);
    const response_time_ms = Date.now() - shownAt;
    const { error: respErr } = await supabase.from("assessment_responses").insert({
      session_id: session.session_id,
      student_id: session.student_id,
      item_id: item.id,
      response_value: { likert: value },
      response_time_ms,
      is_practice: false,
    });
    if (respErr) { setError(respErr.message); setSubmitting(false); return; }
    const { error: advErr } = await supabase.rpc("advance_session", { p_session_id: session.session_id });
    if (advErr) { setError(advErr.message); setSubmitting(false); return; }

    const nextIdx = idx + 1;
    if (nextIdx >= total) {
      await finalize();
    } else {
      setSession({ ...session, current_index: nextIdx, items_answered: session.items_answered + 1 });
      setShownAt(Date.now());
      setSubmitting(false);
    }
  }

  async function finalize() {
    setFinishing(true);
    const { data: rows } = await supabase
      .from("assessment_responses")
      .select("item_id, response_value, response_time_ms")
      .eq("session_id", sessionId);
    const responses = (rows ?? []).map((r) => {
      const rv = r.response_value as { likert?: number } | null;
      return {
        item_id: r.item_id,
        value: Number(rv?.likert ?? 0),
        response_time_ms: r.response_time_ms,
      };
    });
    const { scale_scores, holland_code, flag_uniform, flag_speeding } = scoreResponses(responses);
    const { error: upErr } = await supabase.from("assessment_sessions").update({
      completed_at: new Date().toISOString(),
      scale_scores,
      holland_code,
      flag_uniform,
      flag_speeding,
    }).eq("session_id", sessionId);
    if (upErr) { setError(upErr.message); setFinishing(false); return; }
    navigate({ to: "/assessment/$sessionId/results", params: { sessionId } });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-charcoal-100">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-sm tracking-tight">EXPLR <span style={{ color: "var(--explr)" }}>Pathways</span></Link>
          <div className="text-xs text-charcoal-500">{idx + 1} of {total}</div>
        </div>
        <div className="h-0.5 bg-charcoal-100">
          <div className="h-full transition-[width] duration-300" style={{ width: `${pct}%`, background: "var(--color-explr-500)" }} />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-16">
        {/* Context image. Shows the item's photo when set; otherwise a
            dimension-colored band so the layout (and the slot for a photo)
            is consistent for every question. */}
        {scale && (
          <div
            className="relative mb-8 flex h-44 w-full items-center justify-center overflow-hidden rounded-lg sm:h-56"
            style={{ background: scale.colorSoft }}
          >
            {(item && (photos[item.id] ?? item.image)) ? (
              <img
                src={item ? (photos[item.id] ?? item.image) : undefined}
                alt=""
                className="h-full w-full object-cover"
                onError={(e) => {
                  // Missing photo → fall back to the colored band.
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <span
                className="text-center text-sm font-semibold uppercase tracking-wider"
                style={{ color: scale.color }}
              >
                {scale.name}
              </span>
            )}
          </div>
        )}

        {scale && (
          <p className="eyebrow" style={{ color: scale.color }}>How much would you like to…</p>
        )}
        <h2 id="prompt-text" className="mt-4 text-3xl font-light leading-tight md:text-4xl">{prompt}</h2>

        {/* Rating scale as a real radiogroup (WCAG 4.1.2 / 2.1.1): arrow
            keys move between options, Enter/Space selects. Labelled by the
            question prompt. */}
        <div
          role="radiogroup"
          aria-labelledby="prompt-text"
          className="mt-10 grid grid-cols-5 gap-2"
          onKeyDown={(e) => {
            if (submitting || finishing) return;
            if (e.key === "ArrowRight" || e.key === "ArrowDown") {
              e.preventDefault();
              answer(5);
            } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
              e.preventDefault();
              answer(1);
            }
          }}
        >
          {([1,2,3,4,5] as LikertValue[]).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={false}
              disabled={submitting || finishing}
              onClick={() => answer(v)}
              aria-label={LIKERT_LABELS[v]}
              className="group flex flex-col items-center gap-2 border border-charcoal-100 px-1 py-4 transition-colors hover:border-ink hover:bg-charcoal-50 focus-visible:border-ink disabled:opacity-50"
            >
              <span
                className="text-3xl leading-none transition-transform group-hover:scale-110 sm:text-4xl"
                aria-hidden
              >
                {FACES[v]}
              </span>
              <span className="text-center text-[11px] leading-tight text-charcoal-500">{LIKERT_LABELS[v]}</span>
            </button>
          ))}
        </div>

        {finishing && <p className="mt-8 text-sm text-charcoal-500" role="status">Scoring your results…</p>}
        {error && <p className="mt-8 text-sm text-destructive" role="alert">{error}</p>}

        <p className="mt-16 text-xs text-charcoal-400">
          You can close this tab and return later — your progress is saved.
        </p>
      </main>
    </div>
  );
}
