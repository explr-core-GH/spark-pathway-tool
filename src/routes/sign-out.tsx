import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/sign-out")({
  head: () => ({ meta: [{ title: "Signing out…" }] }),
  component: SignOut,
});

function SignOut() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.signOut().then(() => navigate({ to: "/" }));
  }, [navigate]);
  return <div className="mx-auto max-w-md px-6 py-32 text-center text-sm text-charcoal-500">Signing you out…</div>;
}
