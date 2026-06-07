import { Link } from "@tanstack/react-router";
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
    return <p className="mt-3 text-sm text-charcoal-400">Loading…</p>;
  }
  if (pending.length === 0) {
    return (
      <p className="mt-3 text-charcoal-500 max-w-2xl">
        You&apos;re all caught up — nothing to complete right now. Anything your
        educator or an EXPLR admin assigns will show up here.
      </p>
    );
  }

  return (
    <ul className="mt-6 divide-y divide-charcoal-100 border-y border-charcoal-100">
      {pending.map((t) => (
        <li key={t.id} className="flex items-center gap-4 py-4">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{t.label}</p>
            <p className="truncate text-xs text-charcoal-500">{subline(t)}</p>
          </div>
          <Link to={t.to as never} params={t.params as never} className="btn-ink shrink-0 text-xs">
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
  else if (t.availableUntil) parts.push(`Open until ${new Date(t.availableUntil).toLocaleDateString()}`);
  else parts.push("No due date");
  if (t.notes) parts.push(t.notes);
  return parts.join(" · ");
}
