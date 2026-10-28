import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { PortalHeader } from "@/components/passport";
import { SiteFooter } from "@/components/SiteFooter";
import { RoleGuard } from "@/components/RoleGuard";
import { FamilyViewBody } from "@/components/FamilyViewBody";
import { getGuardianStudentView, guardianAckPlanForStudent } from "@/lib/family-account.functions";
import type { FamilyView } from "@/lib/family.functions";

export const Route = createFileRoute("/family_/student/$studentId")({
  head: () => ({
    meta: [{ title: "Family view — EXPLR Pathways" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <RoleGuard requires="guardian">
      <GuardianStudent />
    </RoleGuard>
  ),
});

const msg = (e: unknown) => (e instanceof Error ? e.message.replace(/^Error:\s*/, "") : String(e));

function GuardianStudent() {
  const { studentId } = Route.useParams();
  const [view, setView] = useState<FamilyView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setView(await getGuardianStudentView({ data: { studentId } }));
    } catch (e) {
      setError(msg(e));
    }
  }, [studentId]);
  useEffect(() => {
    load();
  }, [load]);

  async function sign() {
    try {
      await guardianAckPlanForStudent({ data: { studentId } });
      await load();
    } catch (e) {
      setError(msg(e));
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink-900">
      <PortalHeader
        role="Family"
        links={[
          { label: "Home", to: "/" },
          { label: "My children", to: "/family/home" },
          { label: "Sign out", to: "/sign-out" },
        ]}
      />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <Link to="/family/home" className="ink-link inline-flex min-h-[44px] items-center text-sm">
          ← My children
        </Link>
        {error && (
          <p role="alert" className="mt-4 rounded-[var(--radius-control)] bg-gold-tint px-3 py-2">
            {error}
          </p>
        )}
        {!error && !view && (
          <p role="status" className="mt-4 text-ink-500">
            Opening the passport…
          </p>
        )}
        {view && (
          <div className="mt-4">
            <FamilyViewBody
              view={view}
              askName={false}
              onSign={sign}
              intro="Linked to your family account. Your student can remove the link at any time from their dashboard."
            />
          </div>
        )}
      </main>
      <SiteFooter className="mt-8" />
    </div>
  );
}
