import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { RoleGuard } from "@/components/RoleGuard";
import { PortalHeader, Seal, type PortalLink } from "@/components/passport";
import { SiteFooter } from "@/components/SiteFooter";
import { usePassport } from "@/lib/passport";
import { CREDENTIAL_TYPES } from "@/lib/wbl-taxonomy";

/** /student/credentials — seals, certificates, college credit, badges. */
const STUDENT_LINKS: PortalLink[] = [
  { label: "My passport", to: "/student" },
  { label: "Opportunities", to: "/opportunities" },
  { label: "Families", to: "/student/pathway", search: { tab: "families" } },
];

export const Route = createFileRoute("/student_/credentials")({
  head: () => ({ meta: [{ title: "Credits & credentials — EXPLR Pathways" }] }),
  component: () => (
    <RoleGuard requires="student">
      <Credentials />
    </RoleGuard>
  ),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = (table: string): any => (supabase.from as unknown as (n: string) => any)(table);

function Credentials() {
  const { user } = useSession();
  const { data: p, refresh } = usePassport(user?.id ?? null);
  const [type, setType] = useState("certificate");
  const [title, setTitle] = useState("");
  const [issuer, setIssuer] = useState("");
  const [issued, setIssued] = useState("");
  const [credits, setCredits] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setError(null);
    const { error: err } = await sb("credentials").insert({
      student_id: user.id,
      type,
      title: title.trim(),
      issuer: issuer.trim() || null,
      issued_at: issued || null,
      credits: type === "dual_credit_ccp" && credits ? Number(credits) : null,
      evidence_url: url.trim(),
      verification_method: "self_reported",
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setTitle("");
    setIssuer("");
    setIssued("");
    setCredits("");
    setUrl("");
    refresh();
  }

  async function remove(id: string) {
    if (!confirm("Remove this credential?")) return;
    await sb("credentials").delete().eq("id", id);
    refresh();
  }

  return (
    <div className="min-h-screen bg-paper text-ink-900">
      <PortalHeader role="Student" links={STUDENT_LINKS} signedIn />
      <main className="mx-auto max-w-[900px] px-4 py-10 sm:px-6">
        <Link
          to="/student"
          className="inline-flex min-h-[44px] items-center text-sm font-medium text-green-deep hover:underline"
        >
          ← My passport
        </Link>
        <p className="eyebrow text-green">Credits & credentials</p>
        <h1 className="display mt-1">Seals and certificates.</h1>

        <form
          onSubmit={add}
          className="mt-8 grid gap-4 rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 sm:grid-cols-2"
        >
          <p className="text-sm text-ink-700 sm:col-span-2">
            Fields marked <span aria-hidden="true">*</span>
            <span className="sr-only">with an asterisk</span> are required.
          </p>
          <div>
            <label className="label" htmlFor="cred-type">
              Type
            </label>
            <select
              id="cred-type"
              className="field"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {CREDENTIAL_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="cred-title">
              Name <span aria-hidden="true">*</span>
            </label>
            <input
              id="cred-title"
              className="field"
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="OSHA 10 General Industry"
            />
          </div>
          <div>
            <label className="label" htmlFor="cred-issuer">
              Issued by
            </label>
            <input
              id="cred-issuer"
              className="field"
              maxLength={120}
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              placeholder="Tri-C, OSHA, Ohio DEW…"
            />
          </div>
          <div>
            <label className="label" htmlFor="cred-date">
              Date
            </label>
            <input
              id="cred-date"
              type="date"
              className="field"
              value={issued}
              onChange={(e) => setIssued(e.target.value)}
            />
          </div>
          {type === "dual_credit_ccp" && (
            <div>
              <label className="label" htmlFor="cred-credits">
                College credits
              </label>
              <input
                id="cred-credits"
                type="number"
                min={0}
                step={0.5}
                className="field"
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
              />
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="label" htmlFor="cred-url">
              Link to proof <span aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <input
              id="cred-url"
              type="url"
              className="field"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://"
              required
              aria-describedby="cred-url-hint"
            />
            <p id="cred-url-hint" className="mt-1 text-xs text-ink-500">
              A credential or seal needs proof: the issuer&apos;s verification page, a certificate,
              a badge link, or a transcript. No link, no credential on the passport.
            </p>
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-700 sm:col-span-2">
              {error}
            </p>
          )}
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className="btn-ink">
              {busy ? "Saving…" : "Add credential"}
            </button>
            <p className="mt-2 text-xs text-ink-500">
              Credentials you add are marked self-reported until an issuer or EXPLR confirms them.
            </p>
          </div>
        </form>

        <ul className="mt-8 flex flex-col gap-3">
          {(p?.credentials ?? []).map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-paper-raised p-4"
            >
              <Seal
                kind={c.type === "diploma_seal" ? "readiness" : "credential"}
                value={c.credits ? `${c.credits}` : c.title.slice(0, 4).toUpperCase()}
                caption={c.credits ? "credits" : "cert"}
                size={72}
              />
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-semibold">{c.title}</p>
                <p className="text-sm text-ink-700">
                  {[CREDENTIAL_TYPES.find((t) => t.key === c.type)?.label, c.issuer, c.issued_at]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(c.id)}
                className="inline-flex min-h-[44px] items-center px-2 text-xs text-ink-500 hover:text-ink-900"
              >
                Remove<span className="sr-only"> {c.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter className="mt-16" />
    </div>
  );
}
