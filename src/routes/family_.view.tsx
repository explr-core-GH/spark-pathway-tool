import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PortalHeader } from "@/components/passport";
import { SiteFooter } from "@/components/SiteFooter";
import { FamilyViewBody } from "@/components/FamilyViewBody";
import { getFamilyView, guardianAckPlan, type FamilyView } from "@/lib/family.functions";

const FAMILY_TOKEN_KEY = "explr.family.token";

/** /family/view — read-only passport view for a caregiver holding a family session. */
export const Route = createFileRoute("/family_/view")({
  head: () => ({
    meta: [{ title: "Family view — EXPLR Pathways" }, { name: "robots", content: "noindex" }],
  }),
  validateSearch: (s: Record<string, unknown>): { t?: string } =>
    typeof s.t === "string" ? { t: s.t } : {},
  component: View,
});

function View() {
  const { t } = Route.useSearch();
  const [view, setView] = useState<FamilyView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  async function signPlan(name: string) {
    if (!token) return;
    try {
      await guardianAckPlan({ data: { token, name } });
      setView(await getFamilyView({ data: { token } }));
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^Error:\s*/, "") : String(err));
    }
  }

  useEffect(() => {
    let token = t;
    if (!token) {
      try {
        token = localStorage.getItem(FAMILY_TOKEN_KEY) ?? undefined;
      } catch {
        token = undefined;
      }
    }
    if (!token) {
      setError("No family code is open on this device.");
      return;
    }
    const tok = token;
    let active = true;
    getFamilyView({ data: { token: tok } })
      .then((v) => {
        if (!active) return;
        setView(v);
        setToken(tok);
        try {
          localStorage.setItem(FAMILY_TOKEN_KEY, tok);
        } catch {
          // ignore
        }
      })
      .catch(
        (e) =>
          active && setError(e instanceof Error ? e.message.replace(/^Error:\s*/, "") : String(e)),
      );
    return () => {
      active = false;
    };
  }, [t]);

  return (
    <div className="min-h-screen bg-paper text-ink-900">
      {/* Caregivers hold a code, not an account: no Sign in / Start buttons here. */}
      <PortalHeader
        role="Family"
        links={[
          { label: "Home", to: "/" },
          { label: "Use a different code", to: "/family" },
        ]}
      />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        {error && (
          <div className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-6">
            <p className="eyebrow text-green">For families</p>
            <h1 className="mt-2 font-display text-3xl font-bold">We couldn't open that.</h1>
            <p role="alert" className="mt-2 text-ink-700">
              {error}
            </p>
            <Link to="/family" className="btn-ink mt-5">
              Enter a family code
            </Link>
          </div>
        )}
        {!error && !view && (
          <p role="status" className="text-ink-500">
            Opening the passport…
          </p>
        )}
        {view && (
          <>
            <FamilyViewBody
              view={view}
              askName
              onSign={signPlan}
              intro={
                <>
                  This link works until{" "}
                  {view.expiresAt
                    ? new Date(view.expiresAt).toLocaleDateString()
                    : "it is turned off"}
                  . Your student can turn it off at any time from their dashboard.
                </>
              }
            />
            <p className="mt-10 text-sm text-ink-700">
              Want to keep this without a code?{" "}
              <Link to="/family/sign-up" className="ink-link">
                Create a family account.
              </Link>
            </p>
          </>
        )}
      </main>
      <SiteFooter className="mt-8" />
    </div>
  );
}
