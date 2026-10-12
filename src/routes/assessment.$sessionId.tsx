import { PortalHeader, type PortalLink } from "@/components/passport/PortalHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Annoyed, Frown, Laugh, Meh, Smile, type LucideIcon } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ITEMS, LIKERT_LABELS, scoreResponses, type LikertValue } from "@/lib/assessment-items";
import { RIASEC } from "@/lib/riasec";
import { RoleGuard } from "@/components/RoleGuard";

const STUDENT_LINKS: PortalLink[] = [
  { label: "My passport", to: "/student" },
  { label: "Opportunities", to: "/opportunities" },
  { label: "Families", to: "/student/pathway", search: { tab: "families" } },
];

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
        .select(
          "session_id, student_id, grade_at_session, item_sequence, current_index, items_answered, completed_at",
        )
        .eq("session_id", sessionId)
        .maybeSingle();
      if (error) {
        setError(error.message);
        return;
      }
      if (!data) {
        setError("Session not found.");
        return;
      }
      if (data.completed_at) {
        navigate({ to: "/assessment/$sessionId/results", params: { sessionId } });
        return;
      }
      setSession(data as SessionRow);
      setShownAt(Date.now());
      // Photos are optional — ignore errors (table may be empty / absent).
      // Loosened to any: assessment_item_photos isn't in the generated type.
      (
        supabase.from as unknown as (n: string) => {
          select: (c: string) => Promise<{ data: Array<{ item_id: string; url: string }> | null }>;
        }
      )("assessment_item_photos")
        .select("item_id, url")
        .then(({ data: rows }) => {
          const m: Record<string, string> = {};
          for (const r of rows ?? []) m[r.item_id] = r.url;
          setPhotos(m);
        });
    })();
  }, [sessionId, navigate]);

  if (error)
    return (
      <main role="alert" className="mx-auto max-w-xl px-6 py-24 text-red-700">
        {error}
      </main>
    );
  if (!session)
    return (
      <main role="status" className="mx-auto max-w-xl px-6 py-24 text-ink-500">
        Loading…
      </main>
    );

  const total = session.item_sequence.length;
  const idx = session.current_index;
  const itemId = session.item_sequence[idx];
  const item = itemMap.get(itemId);
  const useMs = session.grade_at_session <= 6;
  const prompt = item ? (useMs ? item.ms : item.hs) : "—";
  const scale = item ? RIASEC[item.scale] : null;
  const pct = Math.round((idx / total) * 100);

  // Faces paired with each Likert value — easier for younger and diverse
  // learners than bare numbers. Labels stay, so the meaning is never carried
  // by the icon alone (accessibility).
  const FACES: Record<LikertValue, LucideIcon> = {
    1: Frown,
    2: Annoyed,
    3: Meh,
    4: Smile,
    5: Laugh,
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
    if (respErr) {
      setError(respErr.message);
      setSubmitting(false);
      return;
    }
    const { error: advErr } = await supabase.rpc("advance_session", {
      p_session_id: session.session_id,
    });
    if (advErr) {
      setError(advErr.message);
      setSubmitting(false);
      return;
    }

    const nextIdx = idx + 1;
    if (nextIdx >= total) {
      await finalize();
    } else {
      setSession({
        ...session,
        current_index: nextIdx,
        items_answered: session.items_answered + 1,
      });
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
    const { error: upErr } = await supabase
      .from("assessment_sessions")
      .update({
        completed_at: new Date().toISOString(),
        scale_scores,
        holland_code,
        flag_uniform,
        flag_speeding,
      })
      .eq("session_id", sessionId);
    if (upErr) {
      setError(upErr.message);
      setFinishing(false);
      return;
    }
    navigate({ to: "/assessment/$sessionId/results", params: { sessionId } });
  }

  return (
    <div
      className="min-h-screen bg-paper text-ink-900"
      data-density={session.grade_at_session <= 8 ? "explore" : undefined}
    >
      <PortalHeader
        role="Student"
        links={STUDENT_LINKS}
        signedIn
        right={
          <span className="font-mono text-xs text-ink-500" aria-live="polite">
            {idx + 1} of {total}
          </span>
        }
        subbar={
          <div className="h-1 bg-paper-sunken" aria-hidden>
            <div
              className="h-full bg-green transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        }
      />

      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        {/* Context image. Shows the item's photo when set; otherwise a
            dimension-colored band so the layout (and the slot for a photo)
            is consistent for every question. */}
        {scale && (
          <div
            className="relative mb-8 flex h-64 w-full items-center justify-center overflow-hidden rounded-[var(--radius-card)] border border-line sm:h-80"
            style={{ background: scale.colorSoft }}
          >
            {item && (photos[item.id] ?? item.image) ? (
              <img
                src={item ? (photos[item.id] ?? item.image) : undefined}
                alt=""
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  // Missing photo → fall back to the colored band.
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <span
                className="text-center font-mono text-sm font-medium uppercase tracking-[0.08em]"
                style={{ color: scale.color }}
              >
                {scale.name}
              </span>
            )}
          </div>
        )}

        {scale && (
          <p className="eyebrow" style={{ color: scale.color }}>
            How much would you like to…
          </p>
        )}
        <h1
          id="prompt-text"
          className="mt-3 font-display text-3xl font-bold leading-tight md:text-4xl"
        >
          {prompt}
        </h1>

        {/* Rating scale as a real radiogroup (WCAG 4.1.2 / 2.1.1): arrow
            keys move between options, Enter/Space selects. Labelled by the
            question prompt. */}
        <div
          role="radiogroup"
          aria-labelledby="prompt-text"
          className="mt-10 grid grid-cols-5 gap-2"
          onKeyDown={(e) => {
            if (submitting || finishing) return;
            const dir =
              e.key === "ArrowRight" || e.key === "ArrowDown"
                ? 1
                : e.key === "ArrowLeft" || e.key === "ArrowUp"
                  ? -1
                  : 0;
            if (!dir) return;
            e.preventDefault();
            const radios = Array.from(
              e.currentTarget.querySelectorAll<HTMLButtonElement>("button[role='radio']"),
            );
            const i = radios.indexOf(document.activeElement as HTMLButtonElement);
            const next = radios[(i + dir + radios.length) % radios.length];
            next?.focus();
          }}
        >
          {([1, 2, 3, 4, 5] as LikertValue[]).map((v) => {
            const Face = FACES[v];
            return (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={false}
                disabled={submitting || finishing}
                onClick={() => answer(v)}
                aria-label={LIKERT_LABELS[v]}
                className="group flex min-h-[44px] flex-col items-center gap-2 rounded-[var(--radius-card)] border border-line bg-paper-raised px-1 py-4 transition-colors hover:border-emerald hover:bg-mint-tint/50 focus-visible:border-emerald disabled:opacity-50"
              >
                <span
                  className="grid h-12 w-12 place-items-center rounded-full border border-mint-soft bg-mint-tint text-green-deep transition-transform group-hover:scale-110 sm:h-14 sm:w-14"
                  aria-hidden
                >
                  <Face className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={1.75} />
                </span>
                <span className="text-center text-[11px] font-medium leading-tight text-ink-700">
                  {LIKERT_LABELS[v]}
                </span>
              </button>
            );
          })}
        </div>

        {finishing && (
          <p className="mt-8 text-sm text-ink-500" role="status">
            Scoring your results…
          </p>
        )}
        {error && (
          <p className="mt-8 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <p className="mt-16 text-sm text-ink-500">
          You can close this tab and return later — your progress is saved.
        </p>
      </main>
      <SiteFooter className="mt-16" />
    </div>
  );
}
