import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { RoleGuard } from "@/components/RoleGuard";
import { INTERNSHIPS } from "@/lib/internships-catalog";
import { RIASEC } from "@/lib/riasec";
import {
  EXPERIENCE_KINDS,
  EXPERIENCE_OPTIONS,
  SCALE4_FACES,
  SCALE4_LABELS,
  SECTION_INTROS,
  SECTOR_LABELS,
  SURVEY_ITEMS,
  type SurveyItem,
} from "@/lib/internship-survey/items";
import { ACTIVITY_RIASEC } from "@/lib/internship-survey/config";
import { scoreSurvey } from "@/lib/internship-survey/scoring";
import { rankMatches } from "@/lib/internship-survey/matching";
import type { ExperienceValence, Responses } from "@/lib/internship-survey/types";

export const Route = createFileRoute("/assessment/internship-interest")({
  // retake stays OPTIONAL so existing links to this route (no search) still
  // typecheck; only present (true) when the student explicitly asks to redo it.
  validateSearch: (s: Record<string, unknown>): { retake?: boolean } => {
    const retake = s.retake === "1" || s.retake === true || s.retake === "true";
    return retake ? { retake: true } : {};
  },
  head: () => ({ meta: [{ title: "Internship interest survey — EXPLR" }] }),
  component: () => (
    <RoleGuard requires="student">
      <InternshipInterestSurvey />
    </RoleGuard>
  ),
});

// internship_survey_results isn't in the generated Supabase types yet; loosen to
// any. supabase.from is accessed inline (never detached) so `this` is preserved.
const sb = (table: string): any =>
  (supabase.from as unknown as (n: string) => any)(table);

function InternshipInterestSurvey() {
  const { user, loading: authLoading } = useSession();
  const navigate = useNavigate();
  const { retake } = Route.useSearch();

  const [responses, setResponses] = useState<Responses>({});
  const [idx, setIdx] = useState(0);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If the student already finished (and isn't explicitly retaking), send them
  // to their results instead of making them redo it.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      if (retake) {
        if (!cancelled) setChecking(false);
        return;
      }
      const { data } = await sb("internship_survey_results")
        .select("student_id")
        .eq("student_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        navigate({ to: "/assessment/internship-interest/results" });
        return;
      }
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, retake, navigate]);

  if (authLoading || checking) {
    return <main className="mx-auto max-w-2xl px-6 py-24 text-sm text-charcoal-400">Loading…</main>;
  }

  const total = SURVEY_ITEMS.length;
  const item = SURVEY_ITEMS[idx];
  const intro = SECTION_INTROS[item.section];
  const pct = Math.round((idx / total) * 100);
  const isLast = idx === total - 1;

  function setAnswer(next: Responses) {
    setResponses(next);
  }

  function goNext(next: Responses) {
    if (isLast) {
      void finalize(next);
    } else {
      setIdx((i) => i + 1);
    }
  }

  function back() {
    setIdx((i) => Math.max(0, i - 1));
  }

  async function finalize(final: Responses) {
    if (!user) return;
    setSaving(true);
    setError(null);

    const result = scoreSurvey(final);
    const allScored = rankMatches(result, INTERNSHIPS, INTERNSHIPS.length);
    const top5 = allScored.slice(0, 5);

    // 1) Rich result for the results screen + staff roster data.
    const nowIso = new Date().toISOString();
    const { error: rErr } = await sb("internship_survey_results").upsert(
      {
        student_id: user.id,
        responses: final,
        riasec_raw: result.riasecRaw,
        riasec_norm: result.riasecNorm,
        holland_code: result.hollandCode,
        sector_values: result.sectorValues,
        env_vector: result.envVector,
        experience: {
          topicModifiers: result.topicModifiers,
          intensity: result.intensity,
          band: result.intensityBand,
        },
        activity_tags: result.activityTags,
        matches: top5,
        completed_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "student_id" },
    );
    if (rErr) {
      setError(rErr.message);
      setSaving(false);
      return;
    }

    // 2) Keep the existing completion gate (dashboard + apply) working.
    const { error: cErr } = await supabase
      .from("internship_interest_completions")
      .upsert({ student_id: user.id, completed_at: nowIso }, { onConflict: "student_id" });
    if (cErr) {
      setError(cErr.message);
      setSaving(false);
      return;
    }

    // 3) Keep student_/apply ranking working: derive yes/maybe from match order.
    //    Never write "no" — the survey never asked the student to reject anything.
    const yesCount = Math.max(1, Math.ceil(allScored.length * 0.4));
    const interestRows = allScored.map((m, i) => ({
      student_id: user.id,
      internship_slug: m.slug,
      response: i < yesCount ? "yes" : "maybe",
    }));
    const { error: iErr } = await supabase
      .from("internship_interest_responses")
      .upsert(interestRows, { onConflict: "student_id,internship_slug" });
    if (iErr) {
      setError(iErr.message);
      setSaving(false);
      return;
    }

    navigate({ to: "/assessment/internship-interest/results" });
  }

  // Dimension color band for activity items (visual continuity with the
  // assessment runner); neutral panel for everything else.
  const dim = item.type === "scale4" ? RIASEC[ACTIVITY_RIASEC[item.id]] : null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-charcoal-100">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-sm tracking-tight">
            EXPLR <span style={{ color: "var(--explr)" }}>Pathways</span>
          </Link>
          <div className="text-xs text-charcoal-500">
            {idx + 1} of {total}
          </div>
        </div>
        <div
          className="h-0.5 bg-charcoal-100"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={idx + 1}
          aria-label="Survey progress"
        >
          <div
            className="h-full transition-[width] duration-300"
            style={{ width: `${pct}%`, background: "var(--color-explr-500)" }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-14">
        <p className="eyebrow" style={dim ? { color: dim.color } : undefined}>
          {intro.eyebrow}
        </p>
        <p className="mt-2 text-sm text-charcoal-500">{intro.lead}</p>

        <QuestionScreen
          key={item.id}
          item={item}
          responses={responses}
          saving={saving}
          isLast={isLast}
          onSet={setAnswer}
          onNext={goNext}
        />

        {error && (
          <p className="mt-8 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="mt-12 flex items-center justify-between">
          {idx > 0 ? (
            <button onClick={back} className="text-sm text-charcoal-500 hover:text-ink" disabled={saving}>
              ← Back
            </button>
          ) : (
            <Link to="/student" className="text-sm text-charcoal-500 hover:text-ink">
              ← Cancel
            </Link>
          )}
          {saving && (
            <span className="text-sm text-charcoal-500" role="status">
              Scoring your matches…
            </span>
          )}
        </div>

        <p className="mt-10 text-xs text-charcoal-400">
          Your answers are private to you. About 5–7 minutes — you can use the arrow keys.
        </p>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// One screen per item
// ─────────────────────────────────────────────────────────────────────────────

function QuestionScreen({
  item,
  responses,
  saving,
  isLast,
  onSet,
  onNext,
}: {
  item: SurveyItem;
  responses: Responses;
  saving: boolean;
  isLast: boolean;
  onSet: (r: Responses) => void;
  onNext: (r: Responses) => void;
}) {
  const promptId = "si-prompt";

  if (item.type === "scale4") {
    const current = responses[item.id];
    const value = current?.kind === "scale4" ? String(current.value) : null;
    return (
      <>
        <Prompt id={promptId}>{item.prompt}</Prompt>
        <div className="mt-10">
          <OptionGroup
            labelledBy={promptId}
            columns={4}
            value={value}
            options={SCALE4_LABELS.map((label, v) => ({ value: String(v), label, face: SCALE4_FACES[v] }))}
            disabled={saving}
            onChange={(v) => onSet({ ...responses, [item.id]: { kind: "scale4", value: Number(v) as 0 | 1 | 2 | 3 } })}
            onCommit={(v) => onNext({ ...responses, [item.id]: { kind: "scale4", value: Number(v) as 0 | 1 | 2 | 3 } })}
          />
        </div>
      </>
    );
  }

  if (item.type === "forcedChoice") {
    const current = responses[item.id];
    const value = current?.kind === "forcedChoice" ? current.value : null;
    return (
      <>
        <Prompt id={promptId}>Pick the one that sounds more like you</Prompt>
        <div className="mt-8">
          <OptionGroup
            labelledBy={promptId}
            columns={1}
            big
            value={value}
            options={[
              { value: "a", label: item.optionA },
              { value: "b", label: item.optionB },
            ]}
            disabled={saving}
            onChange={(v) => onSet({ ...responses, [item.id]: { kind: "forcedChoice", value: v as "a" | "b" } })}
            onCommit={(v) => onNext({ ...responses, [item.id]: { kind: "forcedChoice", value: v as "a" | "b" } })}
          />
        </div>
      </>
    );
  }

  if (item.type === "sectorTap") {
    const current = responses[item.id];
    const value = current?.kind === "sectorTap" ? String(current.value) : null;
    return (
      <>
        <Prompt id={promptId}>{item.sector}</Prompt>
        <div className="mt-10">
          <OptionGroup
            labelledBy={promptId}
            columns={3}
            value={value}
            options={SECTOR_LABELS.map((label, v) => ({ value: String(v), label }))}
            disabled={saving}
            onChange={(v) => onSet({ ...responses, [item.id]: { kind: "sectorTap", value: Number(v) as 0 | 1 | 2 } })}
            onCommit={(v) => onNext({ ...responses, [item.id]: { kind: "sectorTap", value: Number(v) as 0 | 1 | 2 } })}
          />
        </div>
      </>
    );
  }

  if (item.type === "slider") {
    return <SliderScreen item={item} promptId={promptId} responses={responses} saving={saving} onSet={onSet} onNext={onNext} />;
  }

  if (item.type === "experience4") {
    return <ExperienceScreen item={item} promptId={promptId} responses={responses} saving={saving} onSet={onSet} onNext={onNext} />;
  }

  // open
  return <OpenScreen item={item} promptId={promptId} responses={responses} saving={saving} isLast={isLast} onSet={onSet} onNext={onNext} />;
}

function Prompt({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h1 id={id} className="mt-4 text-3xl font-light leading-tight md:text-4xl">
      {children}
    </h1>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Accessible radio group: roving tabindex, arrow keys move selection, Enter /
// Space / click commit (native <button> activation, so no double-fire).
// ─────────────────────────────────────────────────────────────────────────────

type Opt = { value: string; label: string; face?: string };

function OptionGroup({
  labelledBy,
  options,
  value,
  columns = 1,
  big = false,
  disabled = false,
  onChange,
  onCommit,
}: {
  labelledBy: string;
  options: Opt[];
  value: string | null;
  columns?: number;
  big?: boolean;
  disabled?: boolean;
  onChange: (v: string) => void;
  onCommit: (v: string) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIdx = options.findIndex((o) => o.value === value);
  const focusIdx = selectedIdx >= 0 ? selectedIdx : 0;

  function move(to: number) {
    const n = options.length;
    const i = ((to % n) + n) % n;
    onChange(options[i].value);
    refs.current[i]?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      move(focusIdx + 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      move(focusIdx - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      move(0);
    } else if (e.key === "End") {
      e.preventDefault();
      move(options.length - 1);
    }
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      onKeyDown={onKeyDown}
    >
      {options.map((o, i) => {
        const checked = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={o.label}
            tabIndex={i === focusIdx ? 0 : -1}
            disabled={disabled}
            onClick={() => {
              onChange(o.value);
              onCommit(o.value);
            }}
            className={`flex items-center justify-center gap-2 border text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 ${
              big ? "px-5 py-6 text-left" : "flex-col px-3 py-4"
            } ${checked ? "border-ink bg-charcoal-50" : "border-charcoal-100 hover:border-ink"}`}
          >
            {o.face && (
              <span className="text-3xl leading-none sm:text-4xl" aria-hidden>
                {o.face}
              </span>
            )}
            <span className={big ? "w-full text-base" : "text-xs leading-tight text-charcoal-700 sm:text-sm"}>
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Slider screen (native range input — accessible by default)
// ─────────────────────────────────────────────────────────────────────────────

function SliderScreen({
  item,
  promptId,
  responses,
  saving,
  onSet,
  onNext,
}: {
  item: Extract<SurveyItem, { type: "slider" }>;
  promptId: string;
  responses: Responses;
  saving: boolean;
  onSet: (r: Responses) => void;
  onNext: (r: Responses) => void;
}) {
  const current = responses[item.id];
  const value = current?.kind === "slider" ? current.value : 50;

  const valueText =
    value <= 40 ? `Closer to: ${item.left}` : value >= 60 ? `Closer to: ${item.right}` : "Right in the middle";

  return (
    <>
      <Prompt id={promptId}>Where do you land?</Prompt>
      <div className="mt-12">
        <div className="flex items-center justify-between text-sm font-medium text-charcoal-700">
          <span>{item.left}</span>
          <span>{item.right}</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          disabled={saving}
          aria-labelledby={promptId}
          aria-valuetext={valueText}
          onChange={(e) => onSet({ ...responses, [item.id]: { kind: "slider", value: Number(e.target.value) } })}
          className="mt-3 w-full accent-[var(--explr)]"
        />
        <p className="mt-2 text-center text-xs text-charcoal-500" aria-hidden>
          {valueText}
        </p>
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={() => onNext({ ...responses, [item.id]: { kind: "slider", value } })}
        className="btn-ink mt-10 disabled:opacity-50"
      >
        Next →
      </button>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Experience screen (four-way; EXP7 reveals a "what kind?" chip select)
// ─────────────────────────────────────────────────────────────────────────────

function ExperienceScreen({
  item,
  promptId,
  responses,
  saving,
  onSet,
  onNext,
}: {
  item: Extract<SurveyItem, { type: "experience4" }>;
  promptId: string;
  responses: Responses;
  saving: boolean;
  onSet: (r: Responses) => void;
  onNext: (r: Responses) => void;
}) {
  const current = responses[item.id];
  const value = current?.kind === "experience4" ? current.value : null;
  const expKind = current?.kind === "experience4" ? current.expKind : undefined;
  const needsKind = !!item.askKind && (value === "DID_LIKE" || value === "DID_DISLIKE");

  function pick(v: ExperienceValence) {
    const stillNeedsKind = !!item.askKind && (v === "DID_LIKE" || v === "DID_DISLIKE");
    const next: Responses = {
      ...responses,
      [item.id]: { kind: "experience4", value: v, expKind: stillNeedsKind ? expKind : undefined },
    };
    if (stillNeedsKind) {
      onSet(next); // stay so they can pick a kind
    } else {
      onNext(next);
    }
  }

  return (
    <>
      <Prompt id={promptId}>{item.topic}</Prompt>
      <div className="mt-8">
        <OptionGroup
          labelledBy={promptId}
          columns={1}
          big
          value={value}
          disabled={saving}
          options={EXPERIENCE_OPTIONS.map((o) => ({ value: o.value, label: `${o.sub}  ${o.label}` }))}
          onChange={(v) =>
            onSet({
              ...responses,
              [item.id]: { kind: "experience4", value: v as ExperienceValence, expKind },
            })
          }
          onCommit={(v) => pick(v as ExperienceValence)}
        />
      </div>

      {needsKind && (
        <fieldset className="mt-8 border-t border-charcoal-100 pt-6">
          <legend className="text-sm text-charcoal-500">What kind of club?</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {EXPERIENCE_KINDS.map((k) => {
              const active = expKind === k;
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={active}
                  disabled={saving}
                  onClick={() =>
                    onSet({
                      ...responses,
                      [item.id]: { kind: "experience4", value: value as ExperienceValence, expKind: active ? undefined : k },
                    })
                  }
                  className={`border px-3 py-1.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    active ? "border-ink bg-charcoal-50" : "border-charcoal-100 hover:border-ink"
                  }`}
                >
                  {k}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              onNext({
                ...responses,
                [item.id]: { kind: "experience4", value: value as ExperienceValence, expKind },
              })
            }
            className="btn-ink mt-6 disabled:opacity-50"
          >
            Continue →
          </button>
        </fieldset>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Open text (optional — never blocks finishing)
// ─────────────────────────────────────────────────────────────────────────────

function OpenScreen({
  item,
  promptId,
  responses,
  saving,
  onSet,
  onNext,
}: {
  item: Extract<SurveyItem, { type: "open" }>;
  promptId: string;
  responses: Responses;
  saving: boolean;
  isLast: boolean;
  onSet: (r: Responses) => void;
  onNext: (r: Responses) => void;
}) {
  const current = responses[item.id];
  const value = current?.kind === "open" ? current.value : "";

  return (
    <>
      <label htmlFor="si-open">
        <Prompt id={promptId}>{item.prompt}</Prompt>
      </label>
      <textarea
        id="si-open"
        rows={5}
        value={value}
        maxLength={2000}
        disabled={saving}
        aria-describedby="si-open-hint"
        onChange={(e) => onSet({ ...responses, [item.id]: { kind: "open", value: e.target.value } })}
        className="mt-6 w-full border border-charcoal-200 bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none disabled:opacity-50"
        placeholder="Totally optional"
      />
      <p id="si-open-hint" className="mt-1 text-xs text-charcoal-400">
        Optional — leave it blank if you want.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => onNext({ ...responses, [item.id]: { kind: "open", value } })}
          className="btn-ink disabled:opacity-50"
        >
          {saving ? "Scoring…" : "See my matches →"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => onNext(responses)}
          className="text-sm text-charcoal-500 hover:text-ink"
        >
          Skip
        </button>
      </div>
    </>
  );
}
