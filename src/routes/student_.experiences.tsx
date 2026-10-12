import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { RoleGuard } from "@/components/RoleGuard";
import { PortalHeader, Stamp, type PortalLink } from "@/components/passport";
import { SiteFooter } from "@/components/SiteFooter";
import { usePassport, type Experience } from "@/lib/passport";
import { EXPERIENCE_TYPE_BY_KEY, STAGES, isExposure } from "@/lib/wbl-taxonomy";
import { requestAttestation } from "@/lib/attestation.functions";

/** /student/experiences — everything the student has added, with status and the stamp request flow. */
const STUDENT_LINKS: PortalLink[] = [
  { label: "My passport", to: "/student" },
  { label: "Opportunities", to: "/opportunities" },
  { label: "Families", to: "/student/pathway", search: { tab: "families" } },
];

export const Route = createFileRoute("/student_/experiences")({
  head: () => ({ meta: [{ title: "My experiences — EXPLR Pathways" }] }),
  component: () => (
    <RoleGuard requires="student">
      <Experiences />
    </RoleGuard>
  ),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = (table: string): any => (supabase.from as unknown as (n: string) => any)(table);

function Experiences() {
  const { user } = useSession();
  const { data: p, loading, refresh } = usePassport(user?.id ?? null);

  async function remove(e: Experience) {
    if (e.status === "verified") return;
    if (!confirm(`Remove "${e.title}"?`)) return;
    await sb("experiences").delete().eq("id", e.id);
    refresh();
  }

  return (
    <div
      className="min-h-screen bg-paper text-ink-900"
      data-density={p?.band === "explore" ? "explore" : undefined}
    >
      <PortalHeader role="Student" links={STUDENT_LINKS} signedIn />
      <main className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6">
        <Link
          to="/student"
          className="inline-flex min-h-[44px] items-center text-sm font-medium text-green-deep hover:underline"
        >
          ← My passport
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-green">Experience</p>
            <h1 className="display mt-1">What I've done.</h1>
          </div>
          <div className="flex gap-3">
            <Link to="/student/experiences/new" search={{ mode: "library" }} className="btn-ghost">
              Import from library
            </Link>
            <Link to="/student/experiences/new" className="btn-ink">
              Add an experience
            </Link>
          </div>
        </div>

        {loading && (
          <p role="status" className="mt-8 text-ink-500">
            Loading…
          </p>
        )}
        {p && p.experiences.length === 0 && (
          <p className="mt-8 max-w-xl text-ink-700">
            Nothing yet. Start with anything real: a camp, a job shadow, a summer job, an
            internship. Exposure shows up as stickers; work experiences can be stamped by a
            supervisor.
          </p>
        )}
        {p && p.experiences.length > 0 && (
          <ul className="mt-8 flex flex-col gap-3">
            {p.experiences.map((e) => (
              <ExperienceItem key={e.id} e={e} onRemove={() => remove(e)} onChanged={refresh} />
            ))}
          </ul>
        )}
      </main>
      <SiteFooter className="mt-16" />
    </div>
  );
}

function ExperienceItem({
  e,
  onRemove,
  onChanged,
}: {
  e: Experience;
  onRemove: () => void;
  onChanged: () => void;
}) {
  const [asking, setAsking] = useState(false);
  const [name, setName] = useState(e.supervisor_name ?? "");
  const [email, setEmail] = useState(e.supervisor_email ?? "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    link: string;
    emailed: boolean;
    emailError: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const exposure = isExposure(e.stage);
  const canAsk =
    !exposure &&
    (e.status === "self_reported" || e.status === "disputed" || e.status === "pending_supervisor");

  async function ask(ev: React.FormEvent) {
    ev.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await requestAttestation({
        data: {
          experienceId: e.id,
          supervisorName: name.trim(),
          supervisorEmail: email.trim(),
          origin: window.location.origin,
        },
      });
      setResult(r);
      setAsking(false);
      onChanged();
    } catch (err) {
      setError((err instanceof Error ? err.message : String(err)).replace(/^Error:\s*/, ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">
            {STAGES[e.stage].label} ·{" "}
            {EXPERIENCE_TYPE_BY_KEY[e.experience_type]?.label ?? e.experience_type}
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold">
            {e.title}
            {e.organization ? <span className="text-ink-700"> · {e.organization}</span> : null}
          </h2>
          <p className="mt-1 text-sm text-ink-700">
            {[e.start_date, e.end_date].filter(Boolean).join(" to ")}
            {e.hours != null ? ` · ${e.hours} hrs` : ""}
            {e.status === "verified" && e.verified_hours != null
              ? ` · ${e.verified_hours} verified`
              : ""}
          </p>
          {e.status === "disputed" && (
            <p className="mt-2 rounded-[var(--radius-control)] bg-gold-tint px-3 py-2 text-sm text-ink-900">
              Your supervisor declined to verify this. Check the details with them, fix anything
              that's off, and ask again.
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {e.status === "verified" ? (
            <Stamp label="Verified" />
          ) : e.status === "pending_supervisor" ? (
            <Stamp kind="self" label="Waiting for stamp" />
          ) : exposure ? (
            <Stamp kind="self" label="Sticker" rotate={0} />
          ) : (
            <Stamp kind="self" label="Self-reported" />
          )}
          {e.status === "pending_supervisor" && e.supervisor_name && (
            <span className="text-xs text-ink-500">Sent to {e.supervisor_name}</span>
          )}
          <div className="flex gap-3">
            {canAsk && !asking && (
              <button
                type="button"
                onClick={() => setAsking(true)}
                aria-expanded={asking}
                className="inline-flex min-h-[44px] items-center text-xs font-semibold text-green-deep hover:underline"
              >
                {e.status === "pending_supervisor" ? "Send again" : "Ask for a stamp"}
                <span className="sr-only"> for {e.title}</span>
              </button>
            )}
            {e.status !== "verified" && (
              <button
                type="button"
                onClick={onRemove}
                className="inline-flex min-h-[44px] items-center text-xs text-ink-500 hover:text-ink-900"
              >
                Remove<span className="sr-only"> {e.title}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {asking && (
        <form
          onSubmit={ask}
          className="mt-4 grid gap-3 rounded-[var(--radius-control)] border border-line bg-paper p-4 sm:grid-cols-[1fr_1fr_auto]"
        >
          <div>
            <label className="label" htmlFor={`sup-name-${e.id}`}>
              Supervisor's name
            </label>
            <input
              id={`sup-name-${e.id}`}
              className="field"
              required
              maxLength={120}
              value={name}
              onChange={(ev) => setName(ev.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor={`sup-email-${e.id}`}>
              Their email
            </label>
            <input
              id={`sup-email-${e.id}`}
              type="email"
              className="field"
              required
              maxLength={160}
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" disabled={busy} className="btn-ink">
              {busy ? "Sending…" : "Send the link"}
            </button>
            <button type="button" onClick={() => setAsking(false)} className="btn-ghost">
              Cancel
            </button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-700 sm:col-span-3">
              {error}
            </p>
          )}
          <p className="text-xs text-ink-500 sm:col-span-3">
            They get one link, confirm the hours and what you did, and rate the skills they watched.
            No account needed on their end.
          </p>
        </form>
      )}

      {result && (
        <div
          role="status"
          className="mt-4 rounded-[var(--radius-control)] bg-mint-tint p-4 text-sm"
        >
          <p className="font-medium">
            {result.emailed ? `Sent to ${name}.` : "Email didn't go out, but the link works."}
            {result.emailError && !result.emailed ? ` (${result.emailError})` : ""}
          </p>
          <p className="mt-1 text-ink-700">
            Share this link if they'd rather get it by text or in person. It works for 30 days.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded bg-paper-raised px-2 py-1 text-xs">{result.link}</code>
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => {
                navigator.clipboard?.writeText(result.link);
                setCopied(true);
              }}
            >
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
