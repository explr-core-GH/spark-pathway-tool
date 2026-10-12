import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BellRing } from "lucide-react";

const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);

/**
 * ApplyStatusBanner — surfaces the student's two-stage internship application
 * state on the dashboard: pending requests, approvals to complete, submissions.
 */
export function ApplyStatusBanner({ studentId }: { studentId: string }) {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    sb("internship_selections")
      .select("status")
      .eq("student_id", studentId)
      .then(({ data }: { data: Array<{ status: string }> | null }) => {
        const c: Record<string, number> = { requested: 0, approved: 0, denied: 0, submitted: 0 };
        for (const r of data ?? []) if (r.status in c) c[r.status] += 1;
        setCounts(c);
      });
  }, [studentId]);

  if (!counts) return null;
  if (counts.approved === 0 && counts.requested === 0) return null;

  return (
    <div className="mt-6 flex flex-wrap items-center gap-4 rounded-[var(--radius-card)] bg-gold-tint px-5 py-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-paper-raised text-gold-deep">
        <BellRing className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
      </span>
      {counts.approved > 0 ? (
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-900">
            <span className="font-semibold">{counts.approved}</span> internship
            {counts.approved === 1 ? "" : "s"} approved — finish your application.
          </p>
          <Link to="/student/apply-complete" className="btn-ink">
            Complete application →
          </Link>
        </div>
      ) : (
        <p className="min-w-0 flex-1 text-sm text-ink-900">
          <span className="font-semibold">{counts.requested}</span> internship request
          {counts.requested === 1 ? "" : "s"} pending admin approval. We&apos;ll let you know when
          you can complete your application.
        </p>
      )}
    </div>
  );
}
