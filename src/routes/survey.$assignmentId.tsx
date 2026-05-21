import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { RoleGuard } from "@/components/RoleGuard";
import {
  getSurveyScreens,
  getOpenEndedPrompts,
  getDemographicFields,
  SURVEY_TYPE_LABEL,
  type SurveyType,
  type Administration,
  type ConstructScreenDef,
} from "@/lib/explr-stem";
import { ConstructScreen } from "@/components/survey/ConstructScreen";
import { ProgressIndicator } from "@/components/survey/ProgressIndicator";
import { OpenEndedQuestion } from "@/components/survey/OpenEndedQuestion";
import {
  DemographicsScreen,
  type DemographicValues,
} from "@/components/survey/DemographicsScreen";
import { EMPTY_ITEM_STATE, type SurveyItemState } from "@/components/survey/types";

// Untyped table access — survey_* tables aren't in the generated Database
// type until it regenerates after this migration applies. Call inline so
// `this` stays bound to the supabase client (a detached
// `const sb = supabase.from` throws "cannot read properties of undefined").
const sb = (table: string) =>
  (supabase.from as (n: string) => ReturnType<typeof supabase.from>)(table);

export const Route = createFileRoute("/survey/$assignmentId")({
  head: () => ({ meta: [{ title: "Survey — EXPLR" }] }),
  component: () => (
    <RoleGuard requires="student">
      <SurveyRunner />
    </RoleGuard>
  ),
  notFoundComponent: () => (
    <main className="mx-auto max-w-md px-6 py-24 text-center text-sm text-charcoal-500">
      Survey not found.{" "}
      <Link to="/student" className="ink-link">
        Back to dashboard
      </Link>
    </main>
  ),
});

type Assignment = {
  id: string;
  survey_type: SurveyType;
  administration: Administration;
  unit_type: string;
  unit_ref: string;
  title: string;
};

type Step =
  | { kind: "demographics" }
  | { kind: "construct"; def: ConstructScreenDef }
  | { kind: "open" };

function deviceType(): string {
  if (typeof window === "undefined") return "unknown";
  const w = window.innerWidth;
  return w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop";
}

function SurveyRunner() {
  const { assignmentId } = Route.useParams();
  const { user, loading: authLoading } = useSession();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [responseId, setResponseId] = useState<string | null>(null);
  const [grade, setGrade] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [gateBlocked, setGateBlocked] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [justFinished, setJustFinished] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [itemState, setItemState] = useState<Record<string, SurveyItemState>>({});
  const [demographics, setDemographics] = useState<DemographicValues>({});
  const [openResponses, setOpenResponses] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // ── Load everything on mount ────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      // 1. The assignment.
      const { data: a } = await sb("survey_assignments")
        .select("id, survey_type, administration, unit_type, unit_ref, title")
        .eq("id", assignmentId)
        .maybeSingle();
      if (cancelled) return;
      if (!a) {
        setLoadError("notfound");
        setLoading(false);
        return;
      }
      const asg = a as Assignment;
      setAssignment(asg);

      // 2. Post-administration gate: block until a matching pre is done.
      if (asg.administration === "post") {
        const { data: preAsg } = await sb("survey_assignments")
          .select("id")
          .eq("survey_type", asg.survey_type)
          .eq("unit_ref", asg.unit_ref)
          .eq("administration", "pre");
        const preIds = (preAsg ?? []).map((r: { id: string }) => r.id);
        if (preIds.length > 0) {
          const { data: preDone } = await sb("survey_responses")
            .select("id")
            .in("assignment_id", preIds)
            .eq("student_id", user.id)
            .not("completed_at", "is", null)
            .limit(1);
          if (cancelled) return;
          if (!preDone || preDone.length === 0) {
            setGateBlocked(true);
            setLoading(false);
            return;
          }
        }
      }

      // 3. The student's grade (prefilled demographic).
      const { data: stud } = await supabase
        .from("students")
        .select("grade")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled && stud?.grade) setGrade(stud.grade);

      // 4. Existing in-progress / completed response for this assignment.
      const { data: existing } = await sb("survey_responses")
        .select("id, completed_at, progress_index, demographics")
        .eq("assignment_id", assignmentId)
        .eq("student_id", user.id)
        .maybeSingle();
      if (cancelled) return;

      if (existing) {
        const ex = existing as {
          id: string;
          completed_at: string | null;
          progress_index: number;
          demographics: DemographicValues | null;
        };
        setResponseId(ex.id);
        if (ex.completed_at) {
          setAlreadyDone(true);
          setLoading(false);
          return;
        }
        setStepIndex(ex.progress_index ?? 0);
        if (ex.demographics) setDemographics(ex.demographics);
        // Hydrate item + open responses for resume.
        const [{ data: items }, { data: opens }] = await Promise.all([
          sb("survey_item_responses")
            .select("item_id, value_now, value_then, skipped")
            .eq("survey_response_id", ex.id),
          sb("survey_open_responses")
            .select("prompt, response")
            .eq("survey_response_id", ex.id),
        ]);
        if (cancelled) return;
        const istate: Record<string, SurveyItemState> = {};
        for (const it of (items ?? []) as Array<{
          item_id: string;
          value_now: number | null;
          value_then: number | null;
          skipped: boolean;
        }>) {
          istate[it.item_id] = {
            now: it.value_now,
            then: it.value_then,
            skipped: it.skipped,
          };
        }
        setItemState(istate);
        const ostate: Record<string, string> = {};
        for (const o of (opens ?? []) as Array<{
          prompt: string;
          response: string | null;
        }>) {
          ostate[o.prompt] = o.response ?? "";
        }
        setOpenResponses(ostate);
      } else {
        // Create the response row up front so item rows have a parent.
        const { data: created, error } = await sb("survey_responses")
          .insert({
            assignment_id: assignmentId,
            student_id: user.id,
            survey_type: asg.survey_type,
            administration: asg.administration,
            device_type: deviceType(),
          })
          .select("id")
          .maybeSingle();
        if (cancelled) return;
        if (error || !created) {
          setLoadError(error?.message ?? "Could not start the survey.");
          setLoading(false);
          return;
        }
        setResponseId((created as { id: string }).id);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [assignmentId, user, authLoading]);

  // ── Build the ordered steps ─────────────────────────────────────────────
  const steps: Step[] = useMemo(() => {
    if (!assignment) return [];
    const constructScreens = getSurveyScreens(
      assignment.survey_type,
      assignment.administration,
    );
    const prompts = getOpenEndedPrompts(
      assignment.survey_type,
      assignment.administration,
    );
    const list: Step[] = [{ kind: "demographics" }];
    for (const def of constructScreens) list.push({ kind: "construct", def });
    if (prompts.length > 0) list.push({ kind: "open" });
    return list;
  }, [assignment]);

  const retrospective = assignment?.administration === "retrospective";

  const setItem = useCallback(
    (itemId: string, patch: Partial<SurveyItemState>) => {
      setItemState((prev) => ({
        ...prev,
        [itemId]: { ...(prev[itemId] ?? EMPTY_ITEM_STATE), ...patch },
      }));
    },
    [],
  );

  // ── Persist the current step, then move ─────────────────────────────────
  async function persistStep(step: Step) {
    if (!responseId) return;
    if (step.kind === "demographics") {
      await sb("survey_responses")
        .update({
          demographics: {
            ...demographics,
            grade: grade ?? null,
            program_name: assignment?.title ?? null,
          },
        })
        .eq("id", responseId);
    } else if (step.kind === "construct") {
      // Upsert only items the student actually touched (answered or skipped).
      const rows = step.def.items
        .map((it) => ({ it, st: itemState[it.id] }))
        .filter(
          ({ st }) =>
            st && (st.now != null || st.then != null || st.skipped),
        )
        .map(({ it, st }) => ({
          survey_response_id: responseId,
          item_id: it.id,
          value_now: st!.now,
          value_then: st!.then,
          skipped: st!.skipped,
        }));
      if (rows.length > 0) {
        await sb("survey_item_responses").upsert(rows as never, {
          onConflict: "survey_response_id,item_id",
        });
      }
    } else if (step.kind === "open") {
      const rows = Object.entries(openResponses)
        .filter(([, v]) => v.trim() !== "")
        .map(([prompt, response]) => ({
          survey_response_id: responseId,
          prompt,
          response,
        }));
      // Clear then re-insert — open responses are few and idempotency is
      // simpler than a composite upsert key here.
      await sb("survey_open_responses")
        .delete()
        .eq("survey_response_id", responseId);
      if (rows.length > 0) {
        await sb("survey_open_responses").insert(rows as never);
      }
    }
  }

  async function advance() {
    if (!responseId || saving) return;
    setSaving(true);
    await persistStep(steps[stepIndex]);
    const next = stepIndex + 1;
    if (next >= steps.length) {
      // Final step — mark complete.
      await sb("survey_responses")
        .update({
          completed_at: new Date().toISOString(),
          progress_index: steps.length,
        })
        .eq("id", responseId);
      setSaving(false);
      setJustFinished(true);
      return;
    }
    await sb("survey_responses")
      .update({ progress_index: next })
      .eq("id", responseId);
    setStepIndex(next);
    setSaving(false);
    window.scrollTo({ top: 0 });
  }

  function back() {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
      window.scrollTo({ top: 0 });
    }
  }

  // ── Render gates ────────────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24 text-sm text-charcoal-400">
        Loading…
      </main>
    );
  }
  if (loadError === "notfound") throw notFound();
  if (loadError) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="eyebrow text-destructive">Error</p>
        <h1 className="mt-3 text-2xl font-light">Couldn&apos;t start the survey</h1>
        <p className="mt-3 text-sm text-charcoal-500">{loadError}</p>
        <Link to="/student" className="btn-ink mt-6 inline-block">
          Back to dashboard
        </Link>
      </main>
    );
  }
  if (gateBlocked) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="eyebrow">Not yet</p>
        <h1 className="mt-3 text-2xl font-light">
          Finish the start-of-program survey first
        </h1>
        <p className="mt-3 text-sm text-charcoal-500">
          This is the end-of-program survey. You&apos;ll be able to take it
          once you&apos;ve completed the matching start-of-program one.
        </p>
        <Link to="/student" className="btn-ink mt-6 inline-block">
          Back to dashboard
        </Link>
      </main>
    );
  }
  if (alreadyDone || justFinished) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="text-4xl" aria-hidden>
          ✓
        </p>
        <h1 className="mt-4 text-2xl font-light">
          {justFinished ? "All done — thank you!" : "You already finished this survey"}
        </h1>
        <p className="mt-3 text-sm text-charcoal-500">
          {justFinished
            ? "Your responses are saved. There's nothing else to do."
            : "Your responses for this survey have already been recorded."}
        </p>
        <Link to="/student" className="btn-ink mt-6 inline-block">
          Back to dashboard
        </Link>
      </main>
    );
  }
  if (!assignment || steps.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24 text-sm text-charcoal-400">
        Loading…
      </main>
    );
  }

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;
  const openPrompts = getOpenEndedPrompts(
    assignment.survey_type,
    assignment.administration,
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="eyebrow">{SURVEY_TYPE_LABEL[assignment.survey_type]}</p>
      <h1 className="mt-1 text-lg font-medium text-ink">{assignment.title}</h1>

      <div className="mt-5">
        <ProgressIndicator current={stepIndex + 1} total={steps.length} />
      </div>

      <div className="mt-8">
        {step.kind === "demographics" && (
          <DemographicsScreen
            fields={getDemographicFields(assignment.survey_type)}
            values={demographics}
            onChange={(id, value) =>
              setDemographics((prev) => ({ ...prev, [id]: value }))
            }
          />
        )}

        {step.kind === "construct" && (
          <ConstructScreen
            screen={step.def}
            retrospective={retrospective}
            responses={itemState}
            onSet={setItem}
          />
        )}

        {step.kind === "open" && (
          <div>
            <p className="eyebrow">Reflection</p>
            <h2 className="mt-1 text-2xl font-light">A few last questions</h2>
            <p className="mt-3 text-sm text-charcoal-500">
              These are optional — answer any you&apos;d like.
            </p>
            <div className="mt-4">
              {openPrompts.map((prompt, i) => (
                <OpenEndedQuestion
                  key={prompt}
                  number={i + 1}
                  prompt={prompt}
                  value={openResponses[prompt] ?? ""}
                  onChange={(v) =>
                    setOpenResponses((prev) => ({ ...prev, [prompt]: v }))
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-10 flex items-center justify-between border-t border-charcoal-100 pt-6">
        <button
          type="button"
          onClick={back}
          disabled={stepIndex === 0 || saving}
          className="btn-ghost disabled:opacity-40"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={advance}
          disabled={saving}
          className="btn-ink"
        >
          {saving ? "Saving…" : isLast ? "Finish" : "Next →"}
        </button>
      </div>
    </main>
  );
}
