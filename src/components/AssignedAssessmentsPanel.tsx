import { Link } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";
import { useStudentAssignments, type AssignmentItem } from "@/lib/use-assignments";

/**
 * AssignedAssessmentsPanel — the "Assigned to you" section of the student
 * dashboard. Lists the assignments the student still has to complete, within
 * their scheduled window. Resolution + completion + windowing all live in
 * useStudentAssignments so the dashboard, this panel, and the pop-up agree.
 */
export function AssignedAssessmentsPanel({ studentId }: { studentId: string }) {
  const { loading, pending } = useStudentAssignments(studentId);

  if (loading) {
    return <p className="mt-3 text-sm text-ink-500">Loading…</p>;
  }
  if (pending.length === 0) {
    return (
      <p className="mt-3 max-w-2xl text-ink-700">
        You&apos;re all caught up — nothing to complete right now. Anything your instructor or an
        EXPLR admin assigns will show up here.
      </p>
    );
  }

  return (
    <ul className="mt-6 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-paper">
      {pending.map((t) => (
        <li key={t.id} className="flex flex-wrap items-center gap-4 px-4 py-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] border border-mint-soft bg-mint-tint text-green-deep">
            <CalendarClock className="h-5 w-5" strokeWidth={2} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{t.label}</p>
            <p className="truncate text-xs text-ink-700">{subline(t)}</p>
          </div>
          <Link to={t.to as never} params={t.params as never} className="btn-ink shrink-0">
            Start →
          </Link>
        </li>
      ))}
    </ul>
  );
}

function subline(t: AssignmentItem): string {
  const parts: string[] = [];
  if (t.dueAt) parts.push(`Due ${new Date(t.dueAt).toLocaleDateString()}`);
  else if (t.availableUntil)
    parts.push(`Open until ${new Date(t.availableUntil).toLocaleDateString()}`);
  else parts.push("No due date");
  if (t.notes) parts.push(t.notes);
  return parts.join(" · ");
}
