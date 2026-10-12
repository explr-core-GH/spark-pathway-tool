import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { RoleGuard } from "@/components/RoleGuard";
import { Stamp } from "@/components/passport";
import { usePassport } from "@/lib/passport";
import {
  CHECKLIST,
  TEMPLATES,
  TERM_DUE,
  autoChecklist,
  evaluate,
  schoolYear,
  type RuleContext,
  type Term,
} from "@/lib/checkpoints";
import { EXPERIENCE_TYPE_BY_KEY } from "@/lib/wbl-taxonomy";

/**
 * /instructor/checkpoints/$studentId — review one student's checkpoints:
 * what they entered, what the passport shows, advisor notes, mark reviewed,
 * and the advisor's annual sign-off on the plan.
 */
export const Route = createFileRoute("/instructor/checkpoints/$studentId")({
  head: () => ({ meta: [{ title: "Review checkpoint — EXPLR" }] }),
  component: () => (
    <RoleGuard requires="educator">
      <Review />
    </RoleGuard>
  ),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = (table: string): any => (supabase.from as unknown as (n: string) => any)(table);

type CheckpointRow = {
  id: string;
  term: Term;
  grade: number;
  status: string;
  submitted_at: string | null;
  advisor_notes: string | null;
  reviewed_at: string | null;
};
type TaskRow = {
  checkpoint_id: string;
  task_key: string;
  status: string;
  payload: Record<string, unknown> | null;
};
type GoalRow = {
  checkpoint_id: string | null;
  primary_goal: string;
  cluster: string | null;
  post_hs_plan: string | null;
  why: string | null;
};
type ApprovalRow = {
  student_ack_at: string | null;
  guardian_ack_at: string | null;
  advisor_ack_at: string | null;
};

/** "✓" or "·" with a text equivalent for screen readers (WCAG 1.3.1). */
function AckMark({ on }: { on: boolean }) {
  return (
    <>
      <span aria-hidden="true">{on ? "✓" : "·"}</span>
      <span className="sr-only">{on ? "(signed)" : "(not yet signed)"}</span>
    </>
  );
}

function Review() {
  const { studentId } = Route.useParams();
  const { user } = useSession();
  const { data: p, loading: pLoading, error: pError } = usePassport(studentId);
  const sy = schoolYear();
  const [cps, setCps] = useState<CheckpointRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [approval, setApproval] = useState<ApprovalRow | null>(null);
  const [assessmentAt, setAssessmentAt] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: cpRows } = await sb("checkpoints")
      .select("id, term, grade, status, submitted_at, advisor_notes, reviewed_at")
      .eq("student_id", studentId)
      .eq("school_year", sy);
    const rows = ((cpRows ?? []) as CheckpointRow[]).sort((a) => (a.term === "fall" ? -1 : 1));
    const ids = rows.map((r) => r.id);
    const [{ data: tk }, { data: gl }, { data: ck }, { data: ap }, { data: sess }] =
      await Promise.all([
        ids.length
          ? sb("checkpoint_tasks")
              .select("checkpoint_id, task_key, status, payload")
              .in("checkpoint_id", ids)
          : Promise.resolve({ data: [] }),
        sb("career_goals")
          .select("checkpoint_id, primary_goal, cluster, post_hs_plan, why")
          .eq("student_id", studentId),
        sb("checklist_items")
          .select("item_no, checked_at")
          .eq("student_id", studentId)
          .eq("school_year", sy),
        sb("plan_approvals")
          .select("student_ack_at, guardian_ack_at, advisor_ack_at")
          .eq("student_id", studentId)
          .eq("school_year", sy)
          .maybeSingle(),
        supabase
          .from("assessment_sessions")
          .select("completed_at")
          .eq("student_id", studentId)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
    setCps(rows);
    setTasks((tk ?? []) as TaskRow[]);
    setGoals((gl ?? []) as GoalRow[]);
    setChecked(
      new Set(
        ((ck ?? []) as { item_no: number; checked_at: string | null }[])
          .filter((c) => c.checked_at)
          .map((c) => c.item_no),
      ),
    );
    setApproval((ap as ApprovalRow | null) ?? null);
    setAssessmentAt(sess?.completed_at ?? null);
    setNotes(Object.fromEntries(rows.map((r) => [r.id, r.advisor_notes ?? ""])));
  }, [studentId, sy]);

  useEffect(() => {
    load();
  }, [load]);

  const payloads = useMemo(
    () =>
      Object.fromEntries(
        tasks
          .filter((t) => t.payload && Object.keys(t.payload).length)
          .map((t) => [t.task_key, t.payload]),
      ),
    [tasks],
  );

  const ctx: RuleContext | null = useMemo(() => {
    if (!p) return null;
    const base: RuleContext = {
      passport: p,
      schoolYear: sy,
      assessmentCompletedAt: assessmentAt,
      payloads,
      careerGoal: null,
      checked: new Set(checked),
      approval,
      submittedThisYear: cps.some((c) => c.submitted_at),
      transitionDone: !!payloads.transition_plan,
    };
    for (const n of autoChecklist(base)) base.checked.add(n);
    return base;
  }, [p, sy, assessmentAt, payloads, checked, approval, cps]);

  async function saveNotes(cp: CheckpointRow, markReviewed: boolean) {
    setBusy(cp.id);
    const patch: Record<string, unknown> = { advisor_notes: notes[cp.id]?.trim() || null };
    if (markReviewed)
      Object.assign(patch, {
        status: "reviewed",
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      });
    await sb("checkpoints").update(patch).eq("id", cp.id);
    await load();
    setBusy(null);
  }

  async function advisorSign() {
    setBusy("sign");
    await sb("plan_approvals").upsert(
      {
        student_id: studentId,
        school_year: sy,
        advisor_ack_at: new Date().toISOString(),
        advisor_id: user?.id ?? null,
      },
      { onConflict: "student_id,school_year" },
    );
    await load();
    setBusy(null);
  }

  return (
    <main className="mx-auto max-w-[1312px] px-4 py-10 sm:px-6 lg:px-8">
      <Link
        to="/instructor/checkpoints"
        className="inline-flex min-h-[44px] items-center text-sm text-ink-500 hover:text-ink-900"
      >
        ← All checkpoints
      </Link>
      {pError && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {pError}
        </p>
      )}
      {pLoading && (
        <p role="status" className="mt-6 text-sm text-ink-500">
          Loading…
        </p>
      )}
      {p && ctx && (
        <>
          <p className="eyebrow mt-4 text-green">
            {sy} · grade {p.grade ?? "?"}
          </p>
          <h1 className="display mt-1">{p.firstName}</h1>
          <p className="mt-2 text-sm text-ink-700">
            {p.hollandCode ? `Holland code ${p.hollandCode} · ` : ""}
            {Math.round(p.verifiedHours)} verified hours · {p.exposure.length} exposure items ·{" "}
            {p.work.length} work experiences · {p.skillsProficient} of 15 skills proficient
          </p>

          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            {cps.map((cp) => {
              const templates = TEMPLATES[cp.grade]?.[cp.term] ?? [];
              const goal = goals.find((g) => g.checkpoint_id === cp.id) ?? null;
              const local: RuleContext = { ...ctx, careerGoal: goal };
              const results = templates.map((t) => ({
                t,
                ...evaluate(t, local),
                payload: payloads[t.key] as { text?: string } | undefined,
              }));
              return (
                <article
                  key={cp.id}
                  className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 shadow-card"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <p className="eyebrow text-green">
                        {cp.term === "fall" ? "Fall" : "Spring"} · {TERM_DUE[cp.term]}
                      </p>
                      <h2 className="mt-1 font-display text-2xl font-bold">
                        {cp.term === "fall" ? "Where am I headed?" : "What did I do this year?"}
                      </h2>
                    </div>
                    <span className="eyebrow">
                      {cp.status}
                      {cp.submitted_at
                        ? ` · ${new Date(cp.submitted_at).toLocaleDateString()}`
                        : ""}
                    </span>
                  </div>
                  <ol className="divide-y divide-line">
                    {results.map(({ t, done, note, payload }) => (
                      <li key={t.key} className="flex items-start gap-3 py-2.5">
                        <span
                          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${done ? "bg-green text-white" : "border border-line-strong text-ink-500"}`}
                          aria-hidden
                        >
                          {done ? (
                            <Check className="h-3 w-3" strokeWidth={3} />
                          ) : (
                            <Circle className="h-1.5 w-1.5" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1 text-sm">
                          <p className="font-medium">{t.label}</p>
                          <p className="text-ink-700">{note}</p>
                          {payload?.text && (
                            <p className="mt-1 whitespace-pre-wrap rounded-[var(--radius-control)] bg-paper-sunken p-2 text-ink-900">
                              {payload.text}
                            </p>
                          )}
                          {t.kind === "goal" && goal && (
                            <p className="mt-1 rounded-[var(--radius-control)] bg-paper-sunken p-2 text-ink-900">
                              <strong>{goal.primary_goal}</strong>
                              {goal.cluster ? ` · ${goal.cluster}` : ""}
                              {goal.post_hs_plan
                                ? ` · ${goal.post_hs_plan.replace(/_/g, " ")}`
                                : ""}
                              {goal.why ? ` — ${goal.why}` : ""}
                            </p>
                          )}
                          {t.kind === "checklist" && (
                            <ul className="mt-1 text-ink-700">
                              {CHECKLIST.filter((c) => (t.items ?? []).includes(c.no)).map((c) => (
                                <li key={c.no}>
                                  <span aria-hidden="true">
                                    {local.checked.has(c.no) ? "✓" : "·"}
                                  </span>
                                  <span className="sr-only">
                                    {local.checked.has(c.no) ? "Done:" : "Not done:"}
                                  </span>{" "}
                                  {c.no}. {c.text}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                  <div>
                    <label className="label" htmlFor={`notes-${cp.id}`}>
                      Advisor notes (the student sees these)
                    </label>
                    <textarea
                      id={`notes-${cp.id}`}
                      className="field min-h-[80px]"
                      maxLength={2000}
                      value={notes[cp.id] ?? ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [cp.id]: e.target.value }))}
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy === cp.id}
                        onClick={() => saveNotes(cp, false)}
                        className="btn-ghost text-sm"
                      >
                        Save notes
                      </button>
                      {cp.status !== "reviewed" && (
                        <button
                          type="button"
                          disabled={busy === cp.id}
                          onClick={() => saveNotes(cp, true)}
                          className="btn-ink text-sm"
                        >
                          Mark reviewed
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="mt-8 rounded-[var(--radius-card)] border border-line bg-paper-raised p-5">
            <p className="eyebrow text-green">Annual plan approval · {sy}</p>
            <p className="mt-2 text-sm text-ink-700">
              Student <AckMark on={!!approval?.student_ack_at} /> · Parent/guardian{" "}
              <AckMark on={!!approval?.guardian_ack_at} /> · Advisor{" "}
              <AckMark on={!!approval?.advisor_ack_at} />
            </p>
            {!approval?.advisor_ack_at && (
              <button
                type="button"
                disabled={busy === "sign"}
                onClick={advisorSign}
                className="btn-ink mt-3 text-sm"
              >
                Sign off on this year's plan
              </button>
            )}
          </section>

          <section className="mt-8">
            <p className="eyebrow text-green">This year's experiences</p>
            {p.experiences.length === 0 ? (
              <p className="mt-2 text-sm text-ink-700">None logged yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-paper-raised text-sm">
                {p.experiences.map((e) => (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <span>
                      <strong>{e.title}</strong>
                      {e.organization ? ` · ${e.organization}` : ""} ·{" "}
                      {EXPERIENCE_TYPE_BY_KEY[e.experience_type]?.label ?? e.experience_type}
                      {e.hours != null ? ` · ${e.hours} hrs` : ""}
                      {e.reflection ? "" : " · no reflection"}
                    </span>
                    {e.status === "verified" ? (
                      <Stamp label="Verified" rotate={0} />
                    ) : (
                      <Stamp kind="self" label={e.status.replace(/_/g, " ")} />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
