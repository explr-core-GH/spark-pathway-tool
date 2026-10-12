import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Circle } from "lucide-react";
import { SiteHeader } from "@/components/passport";
import { SiteFooter } from "@/components/SiteFooter";
import { FamilyResults, type FamilyResultsData } from "@/components/FamilyPortal";
import { getFamilyView, guardianAckPlan, type FamilyView } from "@/lib/family.functions";
import { Stamp } from "@/components/passport";

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

/** One sign-off on the family view: a mint check when done, a hollow dot when not. */
function AckMark({ label, on }: { label: string; on: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`grid h-5 w-5 place-items-center rounded-full ${
          on ? "bg-green text-paper-raised" : "border border-line-strong text-ink-500"
        }`}
        aria-hidden
      >
        {on ? <Check className="h-3 w-3" strokeWidth={3} /> : <Circle className="h-1.5 w-1.5" />}
      </span>
      {label}
      <span className="sr-only">{on ? " signed" : " not yet signed"}</span>
    </span>
  );
}

function View() {
  const { t } = Route.useSearch();
  const [view, setView] = useState<FamilyView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ackName, setAckName] = useState("");
  const [ackBusy, setAckBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  async function signPlan(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setAckBusy(true);
    try {
      await guardianAckPlan({ data: { token, name: ackName.trim() } });
      const v = await getFamilyView({ data: { token } });
      setView(v as FamilyView);
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^Error:\s*/, "") : String(err));
    } finally {
      setAckBusy(false);
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
        setView(v as FamilyView);
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

  const data: FamilyResultsData | null = view
    ? { riasec: view.riasec, stemDone: view.stemDone }
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
            <p className="mt-3 text-sm text-ink-700">
              This link works until {new Date(view.expiresAt).toLocaleDateString()}. Your student
              can turn it off at any time from their dashboard.
            </p>
            <section className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-5">
                <p className="eyebrow text-green">This year's plan · {view.plan.schoolYear}</p>
                <ul className="mt-2 text-sm text-ink-700">
                  {view.plan.checkpoints.length === 0 && <li>No checkpoints opened yet.</li>}
                  {view.plan.checkpoints.map((c) => (
                    <li key={c.term}>
                      {c.term === "fall" ? "Fall" : "Spring"} checkpoint: {c.status}
                      {c.submittedAt ? ` (${new Date(c.submittedAt).toLocaleDateString()})` : ""}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-700">
                  <span>Sign-offs:</span>
                  <AckMark label="student" on={!!view.plan.studentAckAt} />
                  <AckMark label="family" on={!!view.plan.guardianAckAt} />
                  <AckMark label="advisor" on={!!view.plan.advisorAckAt} />
                </p>
                {!view.plan.guardianAckAt ? (
                  <form onSubmit={signPlan} className="mt-3 flex flex-wrap items-end gap-2">
                    <div className="min-w-[180px] flex-1">
                      <label className="label" htmlFor="ack-name">
                        Your name
                      </label>
                      <input
                        id="ack-name"
                        className="field"
                        required
                        maxLength={120}
                        value={ackName}
                        onChange={(e) => setAckName(e.target.value)}
                      />
                    </div>
                    <button type="submit" disabled={ackBusy} className="btn-ink">
                      {ackBusy ? "Signing…" : "I reviewed this plan with my student"}
                    </button>
                  </form>
                ) : (
                  <p className="mt-2 text-xs text-ink-500">
                    Thank you. Your sign-off is recorded for {view.plan.schoolYear}.
                  </p>
                )}
              </div>
              <div className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-5">
                <p className="eyebrow text-green">Stamped experiences</p>
                {view.verified.length === 0 ? (
                  <p className="mt-2 text-sm text-ink-700">
                    Nothing verified yet. When a supervisor stamps an experience, it shows here.
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-2 text-sm">
                    {view.verified.map((v, i) => (
                      <li key={i} className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          <strong>{v.title}</strong>
                          {v.organization ? ` · ${v.organization}` : ""}
                          {v.hours != null ? ` · ${v.hours} hrs` : ""}
                        </span>
                        <Stamp label="Verified" rotate={0} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
            <FamilyResults data={data} grade={view.grade} />
          </>
        )}
      </main>
      <SiteFooter className="mt-8" />
    </div>
  );
}
