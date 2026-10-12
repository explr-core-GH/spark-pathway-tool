import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Stamp, Wordmark } from "@/components/passport";
import { COMPETENCIES, RATING_LEVELS } from "@/lib/competencies";
import { EXPERIENCE_TYPE_BY_KEY } from "@/lib/wbl-taxonomy";
import {
  declineAttestation,
  getAttestation,
  submitAttestation,
  type AttestationView,
} from "@/lib/attestation.functions";

/**
 * /stamp/$token — the supervisor's one link. Confirm hours and duties, rate
 * the skills you watched, sign. No account. About three minutes.
 */
export const Route = createFileRoute("/stamp/$token")({
  head: () => ({
    meta: [
      { title: "Verify an experience — EXPLR Pathways" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StampPage,
});

const friendly = (e: unknown) =>
  (e instanceof Error ? e.message : String(e)).replace(/^Error:\s*/, "");

function StampPage() {
  const { token } = Route.useParams();
  const [view, setView] = useState<AttestationView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"stamped" | "declined" | null>(null);

  const [hours, setHours] = useState("");
  const [dutiesOk, setDutiesOk] = useState(false);
  const [setting, setSetting] = useState<"school" | "work" | "community">("work");
  const [ratings, setRatings] = useState<Record<string, { final: number; comment: string }>>({});
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    let active = true;
    getAttestation({ data: { token } })
      .then((v) => {
        if (!active) return;
        setView(v);
        setHours(v.experience.hours != null ? String(v.experience.hours) : "");
        setName(v.supervisorName);
      })
      .catch((e) => active && setError(friendly(e)));
    return () => {
      active = false;
    };
  }, [token]);

  function setRating(skill: string, final: number | null) {
    setRatings((r) => {
      const next = { ...r };
      if (final === null) delete next[skill];
      else next[skill] = { final, comment: next[skill]?.comment ?? "" };
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const list = Object.entries(ratings).map(([skill, r]) => ({
      skill,
      final: r.final,
      comment: r.comment || undefined,
    }));
    if (list.length === 0) {
      setFormError("Rate at least one skill you watched this student use.");
      return;
    }
    const low = list.filter((r) => r.final <= 2 && !(r.comment && r.comment.length >= 10));
    if (low.length) {
      setFormError(
        `Add a short comment for ${low.map((r) => r.skill).join(", ")}. Ratings of 1 or 2 need one so the student knows what to work on.`,
      );
      return;
    }
    if (!dutiesOk || !terms) {
      setFormError("Confirm the duties and the statement at the bottom.");
      return;
    }
    setBusy(true);
    try {
      await submitAttestation({
        data: {
          token,
          hours: Number(hours || 0),
          dutiesConfirmed: true,
          setting,
          ratings: list,
          comment: comment.trim() || undefined,
          name: name.trim(),
          title: title.trim() || undefined,
          termsAccepted: true,
        },
      });
      setDone("stamped");
    } catch (err) {
      setFormError(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  async function decline(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await declineAttestation({ data: { token, reason: reason.trim() } });
      setDone("declined");
    } catch (err) {
      setFormError(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  const ex = view?.experience;
  const dateRange = ex ? [ex.start_date, ex.end_date].filter(Boolean).join(" to ") : "";

  return (
    <div className="min-h-screen bg-paper text-ink-900">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[900px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Wordmark />
          <span className="eyebrow">Supervisor verification</span>
        </div>
      </header>
      <main className="mx-auto max-w-[900px] px-4 py-10 sm:px-6">
        {error && (
          <div className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-6">
            <h1 className="font-display text-2xl font-bold">This link didn't work.</h1>
            <p className="mt-2 text-ink-700">{error}</p>
          </div>
        )}
        {!error && !view && <p className="text-ink-500">Loading…</p>}

        {done === "stamped" && (
          <div className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-8 text-center">
            <Stamp label="Verified · thank you" />
            <h1 className="mt-4 font-display text-3xl font-bold">Stamped.</h1>
            <p className="mx-auto mt-2 max-w-md text-ink-700">
              {view?.studentFirstName}'s experience is now verified on their passport, with your
              ratings attached. They can't change what you confirmed; if they edit the details, the
              stamp comes off until it's re-verified.
            </p>
            <p className="mt-6 text-sm text-ink-500">
              Curious what this is?{" "}
              <Link to="/about" className="ink-link">
                EXPLR Pathways for Ohio partners
              </Link>
            </p>
          </div>
        )}
        {done === "declined" && (
          <div className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-8 text-center">
            <h1 className="font-display text-3xl font-bold">Thanks for letting us know.</h1>
            <p className="mx-auto mt-2 max-w-md text-ink-700">
              The student will see that this wasn't verified and why.
            </p>
          </div>
        )}

        {view && ex && !done && (
          <>
            <p className="eyebrow text-green">About three minutes · no account needed</p>
            <h1 className="display mt-1">Did {view.studentFirstName} do this?</h1>
            <p className="mt-3 max-w-xl text-ink-700">
              {view.studentFirstName} listed you as the supervisor who saw this work. Confirm what
              happened and rate the skills you watched. Your answers become a stamp on their EXPLR
              Pathways passport that they can't edit.
            </p>

            <section className="mt-8 rounded-[var(--radius-card)] border border-line bg-paper-raised p-6">
              <p className="eyebrow">
                {EXPERIENCE_TYPE_BY_KEY[ex.experience_type]?.label ?? ex.experience_type}
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold">
                {ex.title}
                {ex.organization ? (
                  <span className="text-ink-700"> · {ex.organization}</span>
                ) : null}
              </h2>
              <p className="mt-1 text-sm text-ink-700">
                {[ex.role_title, dateRange, ex.hours != null ? `${ex.hours} hours reported` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {ex.duties && <p className="mt-3 text-ink-700">{ex.duties}</p>}
            </section>

            {!declining ? (
              <form onSubmit={submit} className="mt-6 flex flex-col gap-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="st-hours">
                      Hours you can confirm
                    </label>
                    <input
                      id="st-hours"
                      type="number"
                      min={0}
                      step={0.5}
                      className="field"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      required
                    />
                    <p className="mt-1 text-xs text-ink-500">
                      Adjust if the student's number is off. This is what counts toward Ohio's 250
                      hours.
                    </p>
                  </div>
                  <div>
                    <label className="label" htmlFor="st-setting">
                      Where did this happen?
                    </label>
                    <select
                      id="st-setting"
                      className="field"
                      value={setting}
                      onChange={(e) => setSetting(e.target.value as typeof setting)}
                    >
                      <option value="work">A workplace</option>
                      <option value="school">A school</option>
                      <option value="community">A community setting</option>
                    </select>
                  </div>
                </div>
                <label className="flex items-start gap-2 text-ink-700">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={dutiesOk}
                    onChange={(e) => setDutiesOk(e.target.checked)}
                  />
                  <span>
                    The description above is accurate. This was real work of the field, not just
                    helping out.
                  </span>
                </label>

                <fieldset>
                  <legend className="font-display text-xl font-semibold">
                    Rate the skills you watched
                  </legend>
                  <p className="mt-1 text-sm text-ink-700">
                    Only the ones you actually saw. Leave the rest blank. Scale:{" "}
                    {RATING_LEVELS.join(" · ")}. Level 3 is the bar for Ohio's Readiness Seal. A 1
                    or 2 needs a short note so the student knows what to work on.
                  </p>
                  <div className="mt-4 flex flex-col gap-5">
                    {COMPETENCIES.filter((c) => c.omjSkills.length).map((c) => (
                      <div key={c.key}>
                        <p className="eyebrow text-green">{c.label}</p>
                        <ul className="mt-2 flex flex-col gap-3">
                          {c.omjSkills.map((skill) => {
                            const r = ratings[skill];
                            return (
                              <li
                                key={skill}
                                className="rounded-[var(--radius-control)] border border-line bg-paper-raised p-3"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <span className="font-medium">{skill}</span>
                                  <div
                                    className="flex flex-wrap gap-1.5"
                                    role="radiogroup"
                                    aria-label={`${skill} rating`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => setRating(skill, null)}
                                      aria-pressed={!r}
                                      className={`rounded-full border px-3 py-1 text-xs ${!r ? "border-ink-900 bg-ink-900 text-paper" : "border-line-strong text-ink-700"}`}
                                    >
                                      Didn't see
                                    </button>
                                    {RATING_LEVELS.map((lvl, i) => (
                                      <button
                                        key={lvl}
                                        type="button"
                                        onClick={() => setRating(skill, i + 1)}
                                        aria-pressed={r?.final === i + 1}
                                        className={`rounded-full border px-3 py-1 text-xs ${r?.final === i + 1 ? "border-emerald bg-mint-tint text-green-deep" : "border-line-strong text-ink-700"}`}
                                      >
                                        {i + 1} {lvl}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                {r && r.final <= 2 && (
                                  <input
                                    className="field mt-2"
                                    placeholder="What would move this up a level?"
                                    value={r.comment}
                                    maxLength={600}
                                    onChange={(e) =>
                                      setRatings((prev) => ({
                                        ...prev,
                                        [skill]: { ...prev[skill], comment: e.target.value },
                                      }))
                                    }
                                  />
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                </fieldset>

                <div>
                  <label className="label" htmlFor="st-comment">
                    Anything the student should hear from you? (optional)
                  </label>
                  <textarea
                    id="st-comment"
                    className="field min-h-[80px]"
                    maxLength={1000}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="st-name">
                      Your name
                    </label>
                    <input
                      id="st-name"
                      className="field"
                      required
                      maxLength={120}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="st-title">
                      Your role or title
                    </label>
                    <input
                      id="st-title"
                      className="field"
                      maxLength={120}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Shop lead, program director, teacher…"
                    />
                  </div>
                </div>
                <label className="flex items-start gap-2 text-sm text-ink-700">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={terms}
                    onChange={(e) => setTerms(e.target.checked)}
                  />
                  <span>
                    I supervised or directly observed this student's work and the information above
                    is accurate to the best of my knowledge. EXPLR may show my name and role next to
                    this stamp on the student's passport and in exports to their school.
                  </span>
                </label>
                {formError && (
                  <p role="alert" className="text-sm text-destructive">
                    {formError}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <button type="submit" disabled={busy} className="btn-ink">
                    {busy ? "Stamping…" : "Stamp this experience"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeclining(true)}
                    className="text-sm text-ink-500 hover:text-ink-900"
                  >
                    I didn't supervise this, or it isn't accurate
                  </button>
                </div>
              </form>
            ) : (
              <form
                onSubmit={decline}
                className="mt-6 flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-paper-raised p-6"
              >
                <h2 className="font-display text-xl font-semibold">Decline to verify</h2>
                <label className="label" htmlFor="st-reason">
                  Tell the student why (they'll see this)
                </label>
                <textarea
                  id="st-reason"
                  className="field min-h-[80px]"
                  required
                  minLength={3}
                  maxLength={600}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                {formError && (
                  <p role="alert" className="text-sm text-destructive">
                    {formError}
                  </p>
                )}
                <div className="flex gap-3">
                  <button type="submit" disabled={busy} className="btn-ink">
                    Send
                  </button>
                  <button type="button" onClick={() => setDeclining(false)} className="btn-ghost">
                    Back
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  );
}
