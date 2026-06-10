import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useEducator } from "@/lib/auth";
import { useStudentAssignments } from "@/lib/use-assignments";

/**
 * AssignmentNudge — a dismissible pop-up that tells a signed-in student they
 * have assigned assessments/surveys to complete, with a one-click button
 * straight to the first one. Mounted globally so it shows on every student
 * page; it self-gates so it never renders for admins, educators, or guests,
 * and it stays out of the way while a student is mid-assessment.
 */
export function AssignmentNudge() {
  const { user, isAdmin, educator, loading } = useEducator();
  const pathname = useLocation({ select: (l) => l.pathname });
  // Only students get nudged. Guests, admins, and educators are excluded, and
  // we never interrupt a student who's mid-assessment.
  if (loading || !user || isAdmin || educator) return null;
  if (isSuppressedPath(pathname)) return null;
  return <StudentNudge studentId={user.id} />;
}

// Routes where a nudge would interrupt active work — don't pop there.
function isSuppressedPath(pathname: string): boolean {
  return /^\/(assessment|survey|demo)\b/.test(pathname);
}

function StudentNudge({ studentId }: { studentId: string }) {
  const { loading, pending } = useStudentAssignments(studentId);
  const [dismissed, setDismissed] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Signature of the current pending set — if it changes (new assignment),
  // a previously-dismissed nudge comes back.
  const sig = pending.map((p) => p.id).sort().join(",");

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

  // Modal focus management (WCAG 2.4.3 / 4.1.2): move focus into the dialog on
  // open, restore it to the previously-focused element on close.
  useEffect(() => {
    if (!show) return;
    const prev = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => prev?.focus?.();
  }, [show]);

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

  // Keep Tab focus inside the dialog while it's open.
  function trapFocus(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      close();
      return;
    }
    if (e.key !== "Tab" || !dialogRef.current) return;
    const focusables = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusables.length === 0) return;
    const firstEl = focusables[0];
    const lastEl = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === firstEl) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && document.activeElement === lastEl) {
      e.preventDefault();
      firstEl.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nudge-title"
        onKeyDown={trapFocus}
        className="w-full max-w-md border border-charcoal-100 bg-canvas p-7 shadow-xl focus:outline-none"
      >
        <p className="eyebrow" style={{ color: "var(--explr)" }}>
          {n === 1 ? "1 thing to complete" : `${n} things to complete`}
        </p>
        <h2 id="nudge-title" className="mt-2 text-2xl font-light">
          You have {n === 1 ? "an assignment" : "assignments"} waiting.
        </h2>
        <p className="mt-3 text-sm text-charcoal-500">
          Your educator or an EXPLR admin asked you to complete{" "}
          {n === 1 ? "this" : `these ${n}`}:
        </p>

        <ul className="mt-4 space-y-1.5">
          {pending.slice(0, 4).map((p) => (
            <li key={p.id} className="flex items-baseline gap-2 text-sm">
              <span aria-hidden style={{ color: "var(--explr)" }}>
                •
              </span>
              <span className="text-charcoal-700">{p.label}</span>
            </li>
          ))}
          {n > 4 && <li className="text-xs text-charcoal-500">…and {n - 4} more</li>}
        </ul>

        <div className="mt-6 flex items-center gap-3">
          <Link
            to={first.to as never}
            params={first.params as never}
            onClick={close}
            className="btn-ink"
          >
            Go to it →
          </Link>
          <button type="button" onClick={close} className="text-sm text-charcoal-500 hover:text-ink">
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
