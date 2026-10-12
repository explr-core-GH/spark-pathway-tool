import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PortalHeader } from "@/components/passport/PortalHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/sign-out")({
  head: () => ({ meta: [{ title: "Signing out…" }] }),
  component: SignOut,
});

function SignOut() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.signOut().then(() => navigate({ to: "/" }));
  }, [navigate]);
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink-900">
      <PortalHeader links={[{ label: "Home", to: "/" }]} />
      <main className="mx-auto flex w-full max-w-[1312px] flex-1 items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div
          className="flex w-full max-w-md flex-col items-center gap-4 rounded-[var(--radius-card)] border border-line bg-paper-raised p-8 text-center shadow-card"
          aria-live="polite"
        >
          <span className="grid h-12 w-12 place-items-center rounded-[14px] border border-mint-soft bg-mint-tint text-green-deep">
            <LogOut className="h-6 w-6" strokeWidth={2} aria-hidden />
          </span>
          <p className="eyebrow">Signing out</p>
          <h1 className="font-display text-2xl font-bold">Signing you out…</h1>
          <p className="text-sm text-ink-500">One second, then we&apos;ll take you home.</p>
        </div>
      </main>
      <SiteFooter className="mt-10" />
    </div>
  );
}
