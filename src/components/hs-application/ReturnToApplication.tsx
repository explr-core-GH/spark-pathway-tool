import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const RETURN_KEY = "explr.apply.return";

/** Shown on survey results when the student came from their application. */
export function ReturnToApplication() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      setShow(sessionStorage.getItem(RETURN_KEY) === "1");
    } catch {
      setShow(false);
    }
  }, []);
  if (!show) return null;
  return (
    <div
      role="status"
      className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-mint-soft bg-mint-tint p-4"
    >
      <p className="text-sm text-ink-900">
        Survey done. Your results are saved to your internship application.
      </p>
      <Link
        to="/student/apply"
        className="btn-ink"
        onClick={() => {
          try {
            sessionStorage.removeItem(RETURN_KEY);
          } catch {
            /* ignore */
          }
        }}
      >
        Back to my application →
      </Link>
    </div>
  );
}
