import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Circle, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { RoleGuard } from "@/components/RoleGuard";
import { PortalHeader, type PortalLink } from "@/components/passport";
import { SiteFooter } from "@/components/SiteFooter";
import { usePassport, type Passport } from "@/lib/passport";
import { downloadStudentSuccessPlanPdf } from "@/lib/exports";
import { CAREER_CLUSTERS } from "@/lib/wbl-taxonomy";
import {
  CHECKLIST,
  POST_HS_PLANS,
  TEMPLATES,
  TERM_DUE,
  autoChecklist,
  evaluate,
  schoolYear,
  type RuleContext,
  type TaskTemplate,
  type Term,
} from "@/lib/checkpoints";

/**
 * /student/checkpoints — this school year's fall and spring advising
 * checkpoints. Tasks are evaluated from the passport and the short forms
 * here; a checkpoint is complete when every required task is done.
 */
const STUDENT_LINKS: PortalLink[] = [
  { label: "My passport", to: "/student" },
  { label: "Opportunities", to: "/opportunities" },
  { label: "Families", to: "/student/pathway", search: { tab: "families" } },
];

export const Route = createFileRoute("/student_/checkpoints")({
  head: () => ({ meta: [{ title: "Checkpoints — EXPLR Pathways" }] }),
  component: () => (
    <RoleGuard requires="student">
      <Checkpoints />
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
};
type TaskRow = {
  id: string;
  checkpoint_id: string;
  task_key: string;
  status: string;
  payload: Record<string, unknown> | null;
};
type GoalRow = {
  id: string;
  checkpoint_id: string | null;
  primary_goal: string;
  secondary_goal: string | null;
  cluster: string | null;
  post_hs_plan: string | null;
  changed_since_last: boolean | null;
  why: string | null;
};
type ChecklistRow = {
  item_no: number;
  checked_at: string | null;
  comment: string | null;
  auto: boolean;
};
type ApprovalRow = {
  student_ack_at: string | null;
  guardian_ack_at: string | null;
  advisor_ack_at: string | null;
};

function Checkpoints() {
  const { user } = useSession();
  const { data: p, loading: pLoading } = usePassport(user?.id ?? null);
  const sy = schoolYear();
  const [cps, setCps] = useState<CheckpointRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [checks, setChecks] = useState<ChecklistRow[]>([]);
  const [approval, setApproval] = useState<ApprovalRow | null>(null);
  const [assessmentAt, setAssessmentAt] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !p || p.grade === null) return;
    try {
      const grade = Math.min(12, Math.max(4, p.grade));
      // Make sure this year's two checkpoints and their tasks exist.
      await sb("checkpoints").upsert(
        [
          { student_id: user.id, school_year: sy, term: "fall", grade },
          { student_id: user.id, school_year: sy, term: "spring", grade },
        ],
        { onConflict: "student_id,school_year,term", ignoreDuplicates: true },
      );
      const { data: cpRows } = await sb("checkpoints")
        .select("id, term, grade, status, submitted_at, advisor_notes")
        .eq("student_id", user.id)
        .eq("school_year", sy);
      const rows = (cpRows ?? []) as CheckpointRow[];
      const taskRows = rows.flatMap((cp) =>
        (TEMPLATES[cp.grade]?.[cp.term] ?? []).map((t) => ({
          checkpoint_id: cp.id,
          task_key: t.key,
          required: t.required !== false,
        })),
      );
      if (taskRows.length) {
        await sb("checkpoint_tasks").upsert(taskRows, {
          onConflict: "checkpoint_id,task_key",
          ignoreDuplicates: true,
        });
      }
      const ids = rows.map((r) => r.id);
      const [{ data: tk }, { data: gl }, { data: ck }, { data: ap }, { data: sess }] =
        await Promise.all([
          ids.length
            ? sb("checkpoint_tasks")
                .select("id, checkpoint_id, task_key, status, payload")
                .in("checkpoint_id", ids)
            : Promise.resolve({ data: [] }),
          sb("career_goals")
            .select("*")
            .eq("student_id", user.id)
            .order("created_at", { ascending: false }),
          sb("checklist_items")
            .select("item_no, checked_at, comment, auto")
            .eq("student_id", user.id)
            .eq("school_year", sy),
          sb("plan_approvals")
            .select("student_ack_at, guardian_ack_at, advisor_ack_at")
            .eq("student_id", user.id)
            .eq("school_year", sy)
            .maybeSingle(),
          supabase
            .from("assessment_sessions")
            .select("completed_at")
            .eq("student_id", user.id)
            .not("completed_at", "is", null)
            .order("completed_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);
      setCps([...rows].sort((a) => (a.term === "fall" ? -1 : 1)));
      setTasks((tk ?? []) as TaskRow[]);
      setGoals((gl ?? []) as GoalRow[]);
      setChecks((ck ?? []) as ChecklistRow[]);
      setApproval((ap as ApprovalRow | null) ?? null);
      setAssessmentAt(sess?.completed_at ?? null);
      setReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [user, p, sy]);

  useEffect(() => {
    load();
  }, [load]);

  const payloads = useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const t of tasks)
      if (t.payload && Object.keys(t.payload).length) out[t.task_key] = t.payload;
    return out;
  }, [tasks]);

  const ctx: RuleContext | null = useMemo(() => {
    if (!p) return null;
    const manual = new Set(checks.filter((c) => c.checked_at).map((c) => c.item_no));
    const base: RuleContext = {
      passport: p,
      schoolYear: sy,
      assessmentCompletedAt: assessmentAt,
      payloads,
      careerGoal: null,
      checked: manual,
      approval,
      submittedThisYear: cps.some((c) => c.submitted_at),
      transitionDone: !!payloads.transition_plan,
    };
    for (const n of autoChecklist(base)) manual.add(n);
    return { ...base, checked: manual };
  }, [p, sy, assessmentAt, payloads, approval, cps, checks]);

  async function savePayload(task: TaskRow, payload: Record<string, unknown>) {
    await sb("checkpoint_tasks")
      .update({ payload, status: "done", completed_at: new Date().toISOString() })
      .eq("id", task.id);
    await load();
  }

  async function toggleCheck(no: number, on: boolean) {
    if (!user) return;
    await sb("checklist_items").upsert(
      {
        student_id: user.id,
        school_year: sy,
        item_no: no,
        checked_at: on ? new Date().toISOString() : null,
        auto: false,
      },
      { onConflict: "student_id,school_year,item_no" },
    );
    await load();
  }

  async function ackPlan() {
    if (!user) return;
    await sb("plan_approvals").upsert(
      {
        student_id: user.id,
        school_year: sy,
        student_ack_at: new Date().toISOString(),
        method: "typed",
      },
      { onConflict: "student_id,school_year" },
    );
    await load();
  }

  async function submit(cp: CheckpointRow) {
    await sb("checkpoints")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", cp.id);
    await load();
  }

  const explore = p?.band === "explore";

  return (
    <div
      className="min-h-screen bg-paper text-ink-900"
      data-density={explore ? "explore" : undefined}
    >
      <PortalHeader role="Student" links={STUDENT_LINKS} signedIn />
      <main className="mx-auto max-w-[1000px] px-4 py-10 sm:px-6">
        <Link
          to="/student"
          className="inline-flex min-h-[44px] items-center text-sm font-medium text-green-deep hover:underline"
        >
          ← My passport
        </Link>
        <p className="eyebrow text-green">Checkpoints · {sy}</p>
        <h1 className="display mt-1">
          {explore ? "Little goals on your path." : "Your plan, twice a year."}
        </h1>
        <p className="mt-4 max-w-xl text-ink-700">
          {explore
            ? "Two check-ins each year. Fall is about finding out what you like. Spring is about what you tried and what you learned."
            : "Two check-ins each school year, lined up with Ohio's Student Success Plan. Fall collects your assessments and sets a goal; spring records what you explored, your reflections, and next year's courses."}
        </p>

        {ready && p && !explore && (
          <button
            type="button"
            onClick={() =>
              downloadStudentSuccessPlanPdf(p, {
                schoolYear: sy,
                goals: goals.map((g) => ({
                  grade: cps.find((c) => c.id === g.checkpoint_id)?.grade ?? p.grade,
                  primary_goal: g.primary_goal,
                  secondary_goal: g.secondary_goal,
                  cluster: g.cluster,
                  post_hs_plan: g.post_hs_plan,
                  changed_since_last: g.changed_since_last,
                  why: g.why,
                })),
                checkpoints: cps.map((cp) => ({
                  term: cp.term,
                  grade: cp.grade,
                  status: cp.status,
                  submitted_at: cp.submitted_at,
                  advisor_notes: cp.advisor_notes,
                  tasks: (TEMPLATES[cp.grade]?.[cp.term] ?? []).map((t) => {
                    const row = tasks.find(
                      (x) => x.checkpoint_id === cp.id && x.task_key === t.key,
                    );
                    return {
                      key: t.key,
                      label: t.label,
                      status: row?.status ?? "todo",
                      payload: row?.payload ?? null,
                    };
                  }),
                })),
                checklist: checks,
                checklistText: CHECKLIST.map((c) => ({ no: c.no, text: c.text })),
                approval,
                postHsLabels: Object.fromEntries(POST_HS_PLANS.map((o) => [o.key, o.label])),
              })
            }
            className="btn-ghost mt-6 text-sm"
          >
            <FileDown className="h-4 w-4" aria-hidden />
            Download Student Success Plan (PDF)
          </button>
        )}

        {error && (
          <p role="alert" className="mt-6 text-sm text-red-700">
            {error}
          </p>
        )}
        {(pLoading || !ready) && !error && (
          <p className="mt-8 text-ink-500">Loading your checkpoints…</p>
        )}

        {ready && p && ctx && (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {cps.map((cp) => (
              <CheckpointCard
                key={cp.id}
                cp={cp}
                tasks={tasks.filter((t) => t.checkpoint_id === cp.id)}
                goal={goals.find((g) => g.checkpoint_id === cp.id) ?? null}
                lastGoal={goals.find((g) => g.checkpoint_id !== cp.id) ?? null}
                ctx={ctx}
                p={p}
                checks={checks}
                onPayload={savePayload}
                onGoalSaved={load}
                onToggleCheck={toggleCheck}
                onAck={ackPlan}
                onSubmit={() => submit(cp)}
                userId={user!.id}
              />
            ))}
          </div>
        )}
      </main>
      <SiteFooter className="mt-16" />
    </div>
  );
}

function CheckpointCard({
  cp,
  tasks,
  goal,
  lastGoal,
  ctx,
  p,
  checks,
  onPayload,
  onGoalSaved,
  onToggleCheck,
  onAck,
  onSubmit,
  userId,
}: {
  cp: CheckpointRow;
  tasks: TaskRow[];
  goal: GoalRow | null;
  lastGoal: GoalRow | null;
  ctx: RuleContext;
  p: Passport;
  checks: ChecklistRow[];
  onPayload: (t: TaskRow, payload: Record<string, unknown>) => Promise<void>;
  onGoalSaved: () => Promise<void>;
  onToggleCheck: (no: number, on: boolean) => Promise<void>;
  onAck: () => Promise<void>;
  onSubmit: () => Promise<void>;
  userId: string;
}) {
  const templates = TEMPLATES[cp.grade]?.[cp.term] ?? [];
  const localCtx: RuleContext = { ...ctx, careerGoal: goal };
  const results = templates.map((t) => ({
    t,
    row: tasks.find((r) => r.task_key === t.key),
    ...evaluate(t, localCtx),
  }));
  const requiredDone = results.filter((r) => r.t.required !== false).every((r) => r.done);
  const doneCount = results.filter((r) => r.done).length;

  return (
    <section className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="eyebrow text-green">
            {cp.term === "fall" ? "Fall" : "Spring"} · grade {cp.grade} · {TERM_DUE[cp.term]}
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold">
            {cp.term === "fall" ? "Where am I headed?" : "What did I do this year?"}
          </h2>
        </div>
        <span className="eyebrow">
          {cp.status === "reviewed"
            ? "Reviewed"
            : cp.status === "submitted"
              ? "Submitted"
              : `${doneCount} of ${results.length} done`}
        </span>
      </div>

      <ol className="flex flex-col divide-y divide-line">
        {results.map(({ t, row, done, note }) => (
          <li key={t.key} className="py-3">
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                  done ? "bg-green text-paper-raised" : "border border-line-strong text-ink-500"
                }`}
                aria-hidden
              >
                {done ? (
                  <Check className="h-4 w-4" strokeWidth={3} />
                ) : (
                  <Circle className="h-2 w-2" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {t.label}
                  {t.required === false && <span className="text-ink-500"> · optional</span>}
                </p>
                <p className="text-sm text-ink-700">{note}</p>
                {!done && t.kind === "auto" && (
                  <p className="mt-1 text-sm text-ink-700">
                    {t.prompt}{" "}
                    {t.link && (
                      <Link to={t.link.to} className="ink-link">
                        {t.link.label}
                      </Link>
                    )}
                  </p>
                )}
                {t.kind === "form" && row && (
                  <FormTask t={t} row={row} done={done} onSave={onPayload} />
                )}
                {t.kind === "goal" && (
                  <GoalTask
                    cp={cp}
                    goal={goal}
                    lastGoal={lastGoal}
                    userId={userId}
                    onSaved={onGoalSaved}
                  />
                )}
                {t.kind === "checklist" && (
                  <ChecklistTask
                    items={t.items ?? []}
                    ctx={localCtx}
                    checks={checks}
                    onToggle={onToggleCheck}
                  />
                )}
                {t.kind === "approval" && <ApprovalTask ctx={localCtx} onAck={onAck} />}
              </div>
            </div>
          </li>
        ))}
      </ol>

      {cp.status === "open" && (
        <button
          type="button"
          disabled={!requiredDone}
          onClick={onSubmit}
          className="btn-ink disabled:opacity-50"
          title={requiredDone ? "" : "Finish every required task first"}
        >
          Submit {cp.term} checkpoint
        </button>
      )}
      {cp.advisor_notes && (
        <div className="rounded-[var(--radius-control)] bg-gold-tint p-3 text-sm">
          <p className="eyebrow text-gold-deep">From your advisor</p>
          <p className="mt-1 text-ink-700">{cp.advisor_notes}</p>
        </div>
      )}
      {p.grade !== null && p.grade < 6 && cp.term === "spring" && (
        <p className="text-xs text-ink-500">
          Ohio's Student Success Plan starts in grade 6. Your checkpoints are practice for that.
        </p>
      )}
    </section>
  );
}

function FormTask({
  t,
  row,
  done,
  onSave,
}: {
  t: TaskTemplate;
  row: TaskRow;
  done: boolean;
  onSave: (t: TaskRow, payload: Record<string, unknown>) => Promise<void>;
}) {
  const [open, setOpen] = useState(!done);
  const [text, setText] = useState(String(row.payload?.text ?? ""));
  const [busy, setBusy] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 text-sm text-green-deep hover:underline"
      >
        Edit
      </button>
    );
  }
  return (
    <form
      className="mt-2 flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await onSave(row, { text: text.trim() });
        setBusy(false);
        setOpen(false);
      }}
    >
      <label className="text-sm text-ink-700" htmlFor={`task-${row.id}`}>
        {t.prompt}
      </label>
      <textarea
        id={`task-${row.id}`}
        className="field min-h-[90px]"
        value={text}
        maxLength={2000}
        onChange={(e) => setText(e.target.value)}
        required
      />
      <div>
        <button
          type="submit"
          disabled={busy || text.trim().length < 10}
          className="btn-ink text-sm"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

function GoalTask({
  cp,
  goal,
  lastGoal,
  userId,
  onSaved,
}: {
  cp: CheckpointRow;
  goal: GoalRow | null;
  lastGoal: GoalRow | null;
  userId: string;
  onSaved: () => Promise<void>;
}) {
  const [open, setOpen] = useState(!goal);
  const [primary, setPrimary] = useState(goal?.primary_goal ?? "");
  const [cluster, setCluster] = useState(goal?.cluster ?? "");
  const [plan, setPlan] = useState(goal?.post_hs_plan ?? "");
  const [changed, setChanged] = useState<boolean | null>(goal?.changed_since_last ?? null);
  const [why, setWhy] = useState(goal?.why ?? "");
  const [busy, setBusy] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 text-sm text-green-deep hover:underline"
      >
        Edit goal
      </button>
    );
  }
  return (
    <form
      className="mt-2 grid gap-3 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const row = {
          student_id: userId,
          checkpoint_id: cp.id,
          grade: cp.grade,
          primary_goal: primary.trim(),
          cluster: cluster || null,
          post_hs_plan: plan || null,
          changed_since_last: changed,
          why: why.trim() || null,
        };
        if (goal) await sb("career_goals").update(row).eq("id", goal.id);
        else await sb("career_goals").insert(row);
        setBusy(false);
        setOpen(false);
        await onSaved();
      }}
    >
      {lastGoal && (
        <p className="text-sm text-ink-700 sm:col-span-2">
          Last time you said: <strong>{lastGoal.primary_goal}</strong>
        </p>
      )}
      <div className="sm:col-span-2">
        <label className="label" htmlFor={`goal-${cp.id}`}>
          My career goal (a job, a field, or "still exploring")
        </label>
        <input
          id={`goal-${cp.id}`}
          className="field"
          required
          maxLength={120}
          value={primary}
          onChange={(e) => setPrimary(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor={`cluster-${cp.id}`}>
          Career cluster
        </label>
        <select
          id={`cluster-${cp.id}`}
          className="field"
          value={cluster}
          onChange={(e) => setCluster(e.target.value)}
        >
          <option value="">Not sure</option>
          {CAREER_CLUSTERS.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      {cp.grade >= 8 && (
        <div>
          <label className="label" htmlFor={`plan-${cp.id}`}>
            After high school
          </label>
          <select
            id={`plan-${cp.id}`}
            className="field"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
          >
            <option value="">Choose…</option>
            {POST_HS_PLANS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {lastGoal && (
        <fieldset className="sm:col-span-2">
          <legend className="label">Did your goal change since last time?</legend>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name={`chg-${cp.id}`}
                checked={changed === true}
                onChange={() => setChanged(true)}
              />{" "}
              Yes
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name={`chg-${cp.id}`}
                checked={changed === false}
                onChange={() => setChanged(false)}
              />{" "}
              No
            </label>
          </div>
        </fieldset>
      )}
      <div className="sm:col-span-2">
        <label className="label" htmlFor={`why-${cp.id}`}>
          Why this goal?
        </label>
        <textarea
          id={`why-${cp.id}`}
          className="field min-h-[70px]"
          maxLength={800}
          value={why}
          onChange={(e) => setWhy(e.target.value)}
        />
      </div>
      <div className="sm:col-span-2">
        <button type="submit" disabled={busy} className="btn-ink text-sm">
          {busy ? "Saving…" : "Save goal"}
        </button>
      </div>
    </form>
  );
}

function ChecklistTask({
  items,
  ctx,
  checks,
  onToggle,
}: {
  items: number[];
  ctx: RuleContext;
  checks: ChecklistRow[];
  onToggle: (no: number, on: boolean) => Promise<void>;
}) {
  const auto = autoChecklist(ctx);
  return (
    <ul className="mt-2 flex flex-col gap-1.5">
      {CHECKLIST.filter((c) => items.includes(c.no)).map((c) => {
        const manual = checks.find((r) => r.item_no === c.no)?.checked_at;
        const on = auto.has(c.no) || !!manual;
        return (
          <li key={c.no} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              id={`ck-${c.no}`}
              checked={on}
              disabled={c.auto}
              onChange={(e) => onToggle(c.no, e.target.checked)}
              className="mt-1"
              title={c.auto ? "Checked automatically from your passport" : ""}
            />
            <label htmlFor={`ck-${c.no}`} className={on ? "text-ink-900" : "text-ink-700"}>
              {c.no}. {c.text}
              {c.auto && <span className="text-ink-500"> (from your passport)</span>}
            </label>
          </li>
        );
      })}
    </ul>
  );
}

/** One sign-off in the plan approval row: a mint check when done, a hollow dot when not. */
function AckMark({ label, on }: { label: string; on: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`grid h-5 w-5 place-items-center rounded-full ${
          on ? "bg-green text-paper-raised" : "border border-line-strong text-ink-500"
        }`}
        aria-hidden
      >
        {on ? <Check className="h-3 w-3" strokeWidth={3} /> : <Circle className="h-1.5 w-1.5" />}
      </span>
      {label}
      <span className="sr-only">{on ? " signed" : " not yet signed"}</span>
    </span>
  );
}

function ApprovalTask({ ctx, onAck }: { ctx: RuleContext; onAck: () => Promise<void> }) {
  const a = ctx.approval;
  return (
    <div className="mt-2 text-sm text-ink-700">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <AckMark label="Student" on={!!a?.student_ack_at} />
        <AckMark label="Parent/guardian" on={!!a?.guardian_ack_at} />
        <AckMark label="Advisor" on={!!a?.advisor_ack_at} />
      </p>
      {!a?.student_ack_at && (
        <button type="button" onClick={onAck} className="btn-ghost mt-2 text-sm">
          I reviewed this year's plan with my family
        </button>
      )}
      {a?.student_ack_at && !a.advisor_ack_at && (
        <p className="mt-1 text-ink-500">
          Your advisor signs off from their side; guardian sign-off arrives with family codes.
        </p>
      )}
    </div>
  );
}
