import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/passport";
import { SiteFooter } from "@/components/SiteFooter";
import { FamilyResults, type FamilyResultsData } from "@/components/FamilyPortal";
import { getFamilyView, type FamilyView } from "@/lib/family.functions";

const FAMILY_TOKEN_KEY = "explr.family.token";

/** /family/view — read-only passport view for a caregiver holding a family session. */
export const Route = createFileRoute("/family/view")({
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
        setView(v as FamilyView);
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

  const data: FamilyResultsData | null = view
    ? {
        riasec: view.riasec,
        survey: view.survey as FamilyResultsData["survey"],
        apt: view.apt,
        stemDone: view.stemDone,
      }
    : null;

  return (
    <div className="min-h-screen bg-paper text-ink-900">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        {error && (
          <div className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-6">
            <p className="eyebrow text-green">For families</p>
            <h1 className="mt-2 font-display text-3xl font-bold">We couldn't open that.</h1>
            <p className="mt-2 text-ink-700">{error}</p>
            <Link to="/family" className="btn-ink mt-5">
              Enter a family code
            </Link>
          </div>
        )}
        {!error && !view && <p className="text-ink-500">Opening the passport…</p>}
        {view && data && (
          <>
            <p className="eyebrow text-green">Family view · grade {view.grade ?? "?"}</p>
            <h1 className="display mt-2">{view.firstName}'s passport</h1>
            <p className="mt-3 text-sm text-ink-500">
              This link works until {new Date(view.expiresAt).toLocaleDateString()}. Your student
              can turn it off at any time from their dashboard.
            </p>
            <FamilyResults data={data} grade={view.grade} />
          </>
        )}
      </main>
      <SiteFooter className="mt-8" />
    </div>
  );
}
