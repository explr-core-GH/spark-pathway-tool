import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { House, UserRound } from "lucide-react";
import { SiteHeader } from "@/components/passport";
import { SiteFooter } from "@/components/SiteFooter";
import { redeemFamilyCode } from "@/lib/family.functions";

/**
 * /family — the families entry point. A caregiver enters the code their
 * student generated and gets a 30-day read-only view at /family/view.
 */
export const Route = createFileRoute("/family")({
  head: () => ({
    meta: [
      { title: "Families — EXPLR Pathways" },
      {
        name: "description",
        content:
          "Use your student's family code or a family account to see their EXPLR passport: results, matches, and next steps.",
      },
    ],
  }),
  component: Family,
});

const FAMILY_TOKEN_KEY = "explr.family.token";

function Family() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { token } = await redeemFamilyCode({ data: { code } });
      try {
        localStorage.setItem(FAMILY_TOKEN_KEY, token);
      } catch {
        // private mode: the view also reads the token from the URL
      }
      navigate({ to: "/family/view", search: { t: token } });
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^Error:\s*/, "") : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink-900">
      <SiteHeader />
      <main className="mx-auto max-w-[1312px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col gap-6">
            <p className="eyebrow text-green">Families</p>
            <h1 className="display">Your student's passport, in your hands.</h1>
            <p className="lead max-w-[600px] text-ink-700">
              See completed interest results, verified experiences, and what your student has
              explored. Use the code your student made for you, or create a family account to keep
              all your children in one place.
            </p>

            <form
              onSubmit={submit}
              className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-paper-raised p-6 shadow-card"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border border-mint-soft bg-mint-tint text-green-deep">
                  <House className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
                </span>
                <label htmlFor="family-code" className="font-display text-xl font-semibold">
                  Enter your family code
                </label>
              </div>
              <input
                id="family-code"
                className="min-h-[52px] w-full rounded-[var(--radius-control)] border-2 border-line-strong bg-paper px-4 py-3 font-mono text-xl uppercase tracking-[0.1em] text-ink-900 focus:border-emerald focus:outline-none"
                placeholder="EXPLR-7K4P2M"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
              {error && (
                <p
                  role="alert"
                  className="rounded-[var(--radius-control)] bg-gold-tint px-3 py-2 text-sm text-ink-900"
                >
                  {error}
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                <button type="submit" disabled={busy} className="btn-ink">
                  {busy ? "Opening…" : "Open the passport"}
                </button>
                <Link to="/student-data" className="btn-ghost">
                  How student data is protected
                </Link>
              </div>
              <p className="text-sm text-ink-500">
                Your student makes the code on their dashboard under <strong>For families</strong>.
                It lasts 90 days, and they can turn it off any time.
              </p>
            </form>

            <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-paper-raised p-6 shadow-card">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border border-mint-soft bg-mint-tint text-green-deep">
                  <UserRound className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
                </span>
                <h2 className="font-display text-xl font-semibold">Create a family account</h2>
              </div>
              <p className="text-sm text-ink-700">
                Have more than one child, or don't want to keep track of codes? Make an account
                with your email, then add each child with their family code once.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/family/sign-up" className="btn-ink">
                  Create a family account
                </Link>
                <Link to="/family/sign-in" className="btn-ghost">
                  Sign in
                </Link>
              </div>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <img
              src="/passport/families.webp"
              alt="Two caregivers and a student looking at a large unfolded exploration map"
              width={520}
              height={520}
              className="w-full max-w-[520px]"
            />
          </div>
        </div>
      </main>
      <SiteFooter className="mt-16" />
    </div>
  );
}
