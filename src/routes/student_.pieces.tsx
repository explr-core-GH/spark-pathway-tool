import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { RoleGuard } from "@/components/RoleGuard";
import { PortalHeader, type PortalLink } from "@/components/passport";
import { SiteFooter } from "@/components/SiteFooter";
import { usePassport } from "@/lib/passport";
import { ARTIFACT_TYPES } from "@/lib/wbl-taxonomy";
import { COMPETENCIES } from "@/lib/competencies";

/** /student/pieces — the gallery: things the student made. */
const STUDENT_LINKS: PortalLink[] = [
  { label: "My passport", to: "/student" },
  { label: "Opportunities", to: "/opportunities" },
  { label: "Careers", to: "/careers" },
  { label: "Families", to: "/student/pathway", search: { tab: "families" } },
];

export const Route = createFileRoute("/student_/pieces")({
  head: () => ({ meta: [{ title: "Things I made — EXPLR Pathways" }] }),
  component: () => (
    <RoleGuard requires="student">
      <Pieces />
    </RoleGuard>
  ),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = (table: string): any => (supabase.from as unknown as (n: string) => any)(table);

function Pieces() {
  const { user } = useSession();
  const { data: p, refresh } = usePassport(user?.id ?? null);
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [artifact, setArtifact] = useState("link");
  const [url, setUrl] = useState("");
  const [reflection, setReflection] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [experienceId, setExperienceId] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsConsent = artifact === "image" || artifact === "video" || artifact === "audio";

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (needsConsent && !consent) {
      setError(
        "Check the box to confirm you have permission to share this photo, video, or audio.",
      );
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await sb("portfolio_pieces").insert({
      student_id: user.id,
      title: title.trim(),
      context: context.trim() || null,
      artifact_type: artifact,
      url: url.trim() || null,
      media_consent: needsConsent ? consent : false,
      competency_tags: tags,
      reflection: reflection.trim() || null,
      experience_id: experienceId || null,
      visibility: "private",
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setTitle("");
    setContext("");
    setUrl("");
    setReflection("");
    setTags([]);
    setExperienceId("");
    setConsent(false);
    refresh();
  }

  async function remove(id: string) {
    if (!confirm("Remove this piece?")) return;
    await sb("portfolio_pieces").delete().eq("id", id);
    refresh();
  }

  return (
    <div
      className="min-h-screen bg-paper text-ink-900"
      data-density={p?.band === "explore" ? "explore" : undefined}
    >
      <PortalHeader role="Student" links={STUDENT_LINKS} signedIn />
      <main className="mx-auto max-w-[900px] px-4 py-10 sm:px-6">
        <Link
          to="/student"
          className="inline-flex min-h-[44px] items-center text-sm font-medium text-green-deep hover:underline"
        >
          ← My passport
        </Link>
        <p className="eyebrow text-green">My gallery</p>
        <h1 className="display mt-1">Things I made.</h1>

        <form
          onSubmit={add}
          className="mt-8 grid gap-4 rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 sm:grid-cols-2"
        >
          <p className="text-sm text-ink-700 sm:col-span-2">
            Fields marked <span aria-hidden="true">*</span>
            <span className="sr-only">with an asterisk</span> are required.
          </p>
          <div>
            <label className="label" htmlFor="pc-title">
              What is it? <span aria-hidden="true">*</span>
            </label>
            <input
              id="pc-title"
              className="field"
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Drivetrain CAD model"
            />
          </div>
          <div>
            <label className="label" htmlFor="pc-type">
              Kind
            </label>
            <select
              id="pc-type"
              className="field"
              value={artifact}
              onChange={(e) => setArtifact(e.target.value)}
            >
              {ARTIFACT_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="pc-context">
              Where did you make it?
            </label>
            <input
              id="pc-context"
              className="field"
              maxLength={80}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Robotics team, camp, class, at home…"
            />
          </div>
          <div>
            <label className="label" htmlFor="pc-exp">
              Part of an experience?
            </label>
            <select
              id="pc-exp"
              className="field"
              value={experienceId}
              onChange={(e) => setExperienceId(e.target.value)}
            >
              <option value="">No</option>
              {(p?.experiences ?? []).map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="pc-url">
              Link (a photo, a repo, a doc, a video)
            </label>
            <input
              id="pc-url"
              type="url"
              className="field"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="pc-reflection">
              What did you do, what did you learn, how does it connect to where you're headed?
            </label>
            <textarea
              id="pc-reflection"
              className="field min-h-[90px]"
              maxLength={800}
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
            />
          </div>
          <fieldset className="sm:col-span-2">
            <legend className="label">Skills it shows</legend>
            <div className="flex flex-wrap gap-2">
              {COMPETENCIES.map((c) => {
                const on = tags.includes(c.key);
                return (
                  <button
                    key={c.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setTags(on ? tags.filter((t) => t !== c.key) : [...tags, c.key])}
                    className={`inline-flex min-h-[44px] items-center rounded-full border px-3 text-sm ${on ? "border-emerald bg-mint-tint text-green-deep" : "border-line-strong text-ink-700"}`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
          {needsConsent && (
            <label className="flex min-h-[44px] items-start gap-2 py-2 text-sm text-ink-700 sm:col-span-2">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-green-deep"
              />
              <span>
                I have permission to share this. If it shows other people, they said yes. If I'm
                under 13, a parent said yes.
              </span>
            </label>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-700 sm:col-span-2">
              {error}
            </p>
          )}
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className="btn-ink">
              {busy ? "Saving…" : "Add to my gallery"}
            </button>
            <p className="mt-2 text-xs text-ink-500">
              Pieces are private until a teacher or supervisor reviews them. Unreviewed pieces show
              as self-reported.
            </p>
          </div>
        </form>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {(p?.pieces ?? []).map((pc) => (
            <li
              key={pc.id}
              className="flex flex-col gap-1 rounded-[var(--radius-card)] border border-line bg-paper-raised p-4"
            >
              <p className="eyebrow">
                {ARTIFACT_TYPES.find((t) => t.key === pc.artifact_type)?.label ?? pc.artifact_type}
              </p>
              <p className="font-display text-lg font-semibold">
                {pc.url ? (
                  <a href={pc.url} target="_blank" rel="noreferrer" className="ink-link">
                    {pc.title}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : (
                  pc.title
                )}
              </p>
              {pc.reflection && <p className="text-sm text-ink-700">{pc.reflection}</p>}
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-ink-500">
                  {pc.reviewed_at ? `Reviewed by ${pc.reviewed_by}` : "Self-reported"}
                </span>
                <button
                  type="button"
                  onClick={() => remove(pc.id)}
                  className="inline-flex min-h-[44px] items-center px-2 text-xs text-ink-500 hover:text-ink-900"
                >
                  Remove<span className="sr-only"> {pc.title}</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter className="mt-16" />
    </div>
  );
}
