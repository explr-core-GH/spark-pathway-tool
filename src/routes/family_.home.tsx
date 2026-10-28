import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { PortalHeader } from "@/components/passport";
import { SiteFooter } from "@/components/SiteFooter";
import { RoleGuard } from "@/components/RoleGuard";
import {
  getGuardianHome,
  linkChildWithCode,
  recordGuardianConsent,
  unlinkChild,
  type GuardianChild,
} from "@/lib/family-account.functions";
import {
  CONSENT_TEXT_VERSION,
  RELATIONSHIPS,
  RELATIONSHIP_LABEL,
  type Relationship,
} from "@/lib/family-account.schemas";

export const Route = createFileRoute("/family_/home")({
  head: () => ({
    meta: [{ title: "My children — EXPLR Pathways" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <RoleGuard requires="guardian">
      <FamilyHome />
    </RoleGuard>
  ),
});

const msg = (e: unknown) => (e instanceof Error ? e.message.replace(/^Error:\s*/, "") : String(e));

function FamilyHome() {
  const [name, setName] = useState<string>("");
  const [children, setChildren] = useState<GuardianChild[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [relationship, setRelationship] = useState<Relationship>("parent");
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await getGuardianHome();
      setName(r.guardian.full_name);
      setChildren(r.children);
    } catch (e) {
      setError(msg(e));
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setAdded(null);
    try {
      const r = await linkChildWithCode({ data: { code, relationship } });
      setAdded(`${r.firstName} is now linked to your account.`);
      setCode("");
      await refresh();
    } catch (err) {
      setError(msg(err));
    } finally {
      setBusy(false);
    }
  }

  async function consent(studentId: string) {
    setBusy(true);
    try {
      await recordGuardianConsent({ data: { studentId, textVersion: CONSENT_TEXT_VERSION } });
      await refresh();
    } catch (err) {
      setError(msg(err));
    } finally {
      setBusy(false);
    }
  }

  async function unlink(studentId: string) {
    setBusy(true);
    try {
      await unlinkChild({ data: { studentId } });
      setConfirming(null);
      await refresh();
    } catch (err) {
      setError(msg(err));
    } finally {
      setBusy(false);
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
        <p className="eyebrow text-green">Family account</p>
        <h1 className="display mt-2">{name ? `Hi, ${name.split(" ")[0]}` : "My children"}</h1>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-[var(--radius-control)] bg-gold-tint px-3 py-2 text-sm"
          >
            {error}
          </p>
        )}

        {children === null && !error && (
          <p role="status" className="mt-6 text-ink-500">
            Loading…
          </p>
        )}
        {children && children.length === 0 && (
          <div className="mt-6 rounded-[var(--radius-card)] border border-line bg-paper-raised p-6">
            <h2 className="font-display text-xl font-semibold">No children linked yet</h2>
            <p className="mt-2 text-sm text-ink-700">
              Ask your student to sign in and open <strong>For families</strong> on their
              dashboard, then tap <strong>Make a code</strong>. Enter that code below. You only
              need to do this once per child.
            </p>
          </div>
        )}
        {children && children.length > 0 && (
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {children.map((c) => (
              <li
                key={c.studentId}
                className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 shadow-card"
              >
                <div>
                  <p className="eyebrow text-green">
                    {RELATIONSHIP_LABEL[c.relationship]} · grade {c.grade ?? "?"}
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-semibold">{c.firstName}</h2>
                  <p className="mt-1 text-sm text-ink-700">
                    {c.stampCount} stamped {c.stampCount === 1 ? "experience" : "experiences"} ·{" "}
                    {c.verifiedHours} verified hours · {c.openCheckpoints} open{" "}
                    {c.openCheckpoints === 1 ? "checkpoint" : "checkpoints"}
                  </p>
                  <p className="text-xs text-ink-500">
                    Linked {new Date(c.linkedAt).toLocaleDateString()}
                  </p>
                </div>
                {!c.consented && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => consent(c.studentId)}
                    className="rounded-[var(--radius-control)] border-2 border-emerald bg-mint-tint px-4 py-3 text-left text-sm font-medium hover:bg-mint-soft"
                  >
                    Confirm you are the parent or legal guardian of {c.firstName} and agree to
                    their participation in EXPLR Pathways
                  </button>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    to="/family/student/$studentId"
                    params={{ studentId: c.studentId }}
                    className="btn-ink"
                  >
                    Open passport
                  </Link>
                  {confirming === c.studentId ? (
                    <span className="flex flex-wrap items-center gap-2 text-sm">
                      Remove {c.firstName} from your account?
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => unlink(c.studentId)}
                        className="btn-ghost"
                      >
                        Yes, unlink
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming(null)}
                        className="ink-link inline-flex min-h-[44px] items-center"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirming(c.studentId)}
                      className="ink-link inline-flex min-h-[44px] items-center"
                    >
                      Unlink
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <form
          onSubmit={add}
          className="mt-8 flex flex-col gap-4 rounded-[var(--radius-card)] border border-mint-soft bg-mint-tint/60 p-6"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border border-mint-soft bg-paper-raised text-green-deep">
              <KeyRound className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
            </span>
            <h2 className="font-display text-xl font-semibold">Add a child</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
            <div>
              <label className="label" htmlFor="add-code">
                Family code
              </label>
              <input
                id="add-code"
                className="field font-mono uppercase tracking-[0.1em]"
                placeholder="EXPLR-7K4P2M"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="add-rel">
                You are their
              </label>
              <select
                id="add-rel"
                className="field"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value as Relationship)}
              >
                {RELATIONSHIPS.map((r) => (
                  <option key={r} value={r}>
                    {RELATIONSHIP_LABEL[r]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {added && (
            <p role="status" className="text-sm text-green-deep">
              {added}
            </p>
          )}
          <button type="submit" disabled={busy} className="btn-ink self-start">
            {busy ? "Adding…" : "Add child"}
          </button>
        </form>
      </main>
      <SiteFooter className="mt-8" />
    </div>
  );
}
