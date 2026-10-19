import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BellRing } from "lucide-react";
import { APP_STATUS_LABEL } from "@/lib/hs-application/content";

const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);

/**
 * ApplyStatusBanner: the student's internship application state on the
 * dashboard. A draft general application, partner applications still in
 * progress, or the latest status.
 */
export function ApplyStatusBanner({ studentId }: { studentId: string }) {
  const [state, setState] = useState<{ status: string; drafts: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: season } = await sb("application_seasons")
        .select("id")
        .eq("is_current", true)
        .maybeSingle();
      if (!season) return;
      const { data: g } = await sb("hs_general_applications")
        .select("id, status")
        .eq("student_id", studentId)
        .eq("season_id", season.id)
        .maybeSingle();
      if (!g) return;
      const { data: drafts } = await sb("hs_partner_applications")
        .select("id")
        .eq("general_id", g.id)
        .eq("status", "draft");
      setState({ status: g.status, drafts: drafts?.length ?? 0 });
    })();
  }, [studentId]);

  if (!state) return null;
  const message =
    state.status === "draft"
      ? "Your internship application is in progress. Pick up where you left off."
      : state.drafts > 0
        ? `${state.drafts} internship application${state.drafts === 1 ? "" : "s"} started. Finish and submit.`
        : `Internship application: ${APP_STATUS_LABEL[state.status] ?? state.status}.`;

  return (
    <div className="mt-6 flex flex-wrap items-center gap-4 rounded-[var(--radius-card)] bg-gold-tint px-5 py-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-paper-raised text-gold-deep">
        <BellRing className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-900">{message}</p>
        <Link to="/student/apply" className="btn-ink">
          {state.status === "draft" ? "Continue →" : "My application →"}
        </Link>
      </div>
    </div>
  );
}
