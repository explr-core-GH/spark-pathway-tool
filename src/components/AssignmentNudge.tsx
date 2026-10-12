import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { useEducator } from "@/lib/auth";
import { useStudentAssignments } from "@/lib/use-assignments";

/**
 * AssignmentNudge — a dismissible bottom-right card that tells a signed-in
 * student they have assigned assessments/surveys to complete, with a
 * one-click button straight to the first one. Mounted globally so it shows on
 * every student page; it self-gates so it never renders for admins,
 * instructors, or guests, and it stays out of the way while a student is
 * mid-assessment.
 */
export function AssignmentNudge() {
  const { user, isAdmin, educator, loading } = useEducator();
  const pathname = useLocation({ select: (l) => l.pathname });
  // Only students get nudged. Guests, admins, and instructors are excluded,
  // and we never interrupt a student who's mid-assessment.
  if (loading || !user || isAdmin || educator) return null;
  if (isSuppressedPath(pathname)) return null;
  return <StudentNudge studentId={user.id} />;
}

// Routes where a nudge would interrupt active work — don't pop there.
function isSuppressedPath(pathname: string): boolean {
  return /^\/(assessment|survey)\b/.test(pathname);
}

function StudentNudge({ studentId }: { studentId: string }) {
  const { loading, pending } = useStudentAssignments(studentId);
  const [dismissed, setDismissed] = useState(false);

  // Signature of the current pending set — if it changes (new assignment),
  // a previously-dismissed nudge comes back.
  const sig = pending
    .map((p) => p.id)
    .sort()
    .join(",");

  useEffect(() => {
    if (!sig) return;
    try {
      const prev = sessionStorage.getItem("explr_nudge_dismissed");
      setDismissed(prev === sig);
    } catch {
      setDismissed(false);
    }
  }, [sig]);

  const show = !loading && pending.length > 0 && !dismissed;

  if (!show) return null;

  const first = pending[0];
  const n = pending.length;

  function close() {
    try {
      sessionStorage.setItem("explr_nudge_dismissed", sig);
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") close();
  }

  return (
    <div
      role="region"
      aria-labelledby="nudge-title"
      onKeyDown={onKeyDown}
      className="fixed right-4 bottom-4 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 text-ink-900 shadow-lift"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border border-mint-soft bg-mint-tint text-green-deep">
          <BellRing className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-green">
            {n === 1 ? "1 thing to complete" : `${n} things to complete`}
          </p>
          <h2 id="nudge-title" className="mt-1 font-display text-xl font-semibold">
            You have {n === 1 ? "an assignment" : "assignments"} waiting.
          </h2>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Dismiss"
          className="-mt-1 -mr-1 grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-control)] text-ink-500 hover:bg-mint-tint hover:text-ink-900"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <p className="mt-3 text-sm text-ink-700">
        Your instructor or an EXPLR admin asked you to complete {n === 1 ? "this" : `these ${n}`}:
      </p>

      <ul className="mt-2 space-y-1">
        {pending.slice(0, 4).map((p) => (
          <li key={p.id} className="flex items-baseline gap-2 text-sm">
            <span aria-hidden className="text-green">
              •
            </span>
            <span className="min-w-0 truncate text-ink-900">{p.label}</span>
          </li>
        ))}
        {n > 4 && <li className="text-xs text-ink-500">…and {n - 4} more</li>}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          to={first.to as never}
          params={first.params as never}
          onClick={close}
          className="btn-mint"
        >
          Start →
        </Link>
        <button
          type="button"
          onClick={close}
          className="inline-flex min-h-[44px] items-center px-2 text-sm text-ink-500 hover:text-ink-900"
        >
          Later
        </button>
      </div>
    </div>
  );
}
