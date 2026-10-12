import { Link } from "@tanstack/react-router";
import { Seal } from "./Seal";
import { Stamp } from "./Stamp";
import { Sticker } from "./Sticker";
import { RIASEC, type RIASECCode } from "@/lib/riasec";
import {
  EXPERIENCE_TYPE_BY_KEY,
  clusterImage,
  CREDENTIAL_TYPES,
  CLUSTER_BY_SLUG,
} from "@/lib/wbl-taxonomy";
import { RATING_LEVELS } from "@/lib/competencies";
import {
  draftAboutMe,
  HOURS_TARGET,
  SEAL_TOTAL,
  type Experience,
  type Passport,
} from "@/lib/passport";
import {
  downloadHoursLogCsv,
  downloadHoursLogPdf,
  downloadOpenBadges,
  downloadResumePdf,
  downloadResumeText,
  downloadSealEvidencePdf,
} from "@/lib/exports";

const MONTH = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", year: "numeric" }).toUpperCase();

function dateRange(e: Experience): string {
  const f = (d: string | null) =>
    d ? new Date(d).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : null;
  const a = f(e.start_date);
  const b = f(e.end_date);
  if (a && b && a !== b) return `${a} to ${b}`;
  return a ?? b ?? "";
}

function SectionHead({
  eyebrow,
  title,
  count,
  action,
}: {
  eyebrow: string;
  title: string;
  count?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="eyebrow text-green">{eyebrow}</p>
        <div className="flex items-center gap-4">
          {count && <span className="eyebrow">{count}</span>}
          {action}
        </div>
      </div>
      <h2 className="font-display text-[26px] font-bold leading-tight tracking-tight">{title}</h2>
    </div>
  );
}

function ExperienceRow({ e }: { e: Experience }) {
  const t = EXPERIENCE_TYPE_BY_KEY[e.experience_type];
  const meta = [
    dateRange(e),
    e.hours != null ? `${e.hours} hrs` : null,
    t?.label ?? e.experience_type,
    e.compensation_type,
  ]
    .filter(Boolean)
    .join(" · ")
    .toUpperCase();
  const verified = e.status === "verified";
  return (
    <li className="flex flex-wrap items-start gap-5 rounded-[var(--radius-control)] border border-line bg-paper p-5">
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-lg font-semibold leading-tight">
          {e.title}
          {e.organization ? <span className="text-ink-700"> · {e.organization}</span> : null}
        </h3>
        <p className="mt-1 font-mono text-[11px] font-medium tracking-[0.08em] text-ink-500">
          {meta}
        </p>
        {e.duties && <p className="mt-2 text-sm leading-relaxed text-ink-700">{e.duties}</p>}
      </div>
      <div className="flex flex-col items-end gap-2 text-right">
        {verified ? (
          <Stamp label={`Verified · ${MONTH(e.verified_at ?? e.created_at)}`} />
        ) : e.status === "pending_supervisor" ? (
          <Stamp kind="self" label="Waiting for stamp" />
        ) : (
          <Stamp kind="self" label="Self-reported" />
        )}
        <span className="max-w-[200px] font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-500">
          {verified && e.supervisor_name
            ? `Stamped by ${e.supervisor_name}`
            : e.status === "pending_supervisor"
              ? `Sent to ${e.supervisor_name ?? "your supervisor"}`
              : "Ask a supervisor to stamp this"}
        </span>
      </div>
    </li>
  );
}

/**
 * The passport sheet: the student's living resume. Section order follows the
 * spec: 9-12 leads with Readiness Seal progress and hours toward 250; 4-8
 * leads with exploration breadth and interest fit, with no behavior ratings.
 */
export function PassportSheet({
  p,
  onEditAbout,
  onEditPicture,
}: {
  p: Passport;
  onEditAbout?: () => void;
  onEditPicture?: () => void;
}) {
  const explore = p.band === "explore";
  const topInterests =
    (
      p.hollandCode?.split("").filter((c) => RIASEC[c as RIASECCode]) as RIASECCode[] | undefined
    )?.slice(0, 3) ?? [];
  const about = p.aboutMe?.trim() || draftAboutMe(p);
  const stamps = p.experiences.filter((e) => e.career_cluster);

  return (
    <article
      className="mx-auto flex w-full max-w-[920px] flex-col gap-10 rounded-[6px] border border-line bg-[#fffefa] p-6 text-[17px] leading-relaxed shadow-lift sm:p-12 lg:min-h-[1056px] lg:p-14"
      style={{ boxShadow: "var(--shadow-lift), 0 0 0 1px rgba(25,32,31,0.03), 0 1px 0 #fff inset" }}
    >
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex min-w-0 items-start gap-5">
          {/* Picture: photo, emoji, or the first letter on mint. */}
          <div className="flex shrink-0 flex-col items-center gap-1.5">
            <div
              className="grid h-24 w-24 place-items-center overflow-hidden rounded-full border-[3px] border-mint-soft bg-mint-tint font-display text-4xl font-extrabold text-green-deep sm:h-28 sm:w-28"
              aria-hidden={!p.photoUrl}
            >
              {p.photoUrl ? (
                <img
                  src={p.photoUrl}
                  alt={`${p.firstName}'s photo`}
                  className="h-full w-full object-cover"
                />
              ) : p.avatarEmoji ? (
                <span className="text-5xl leading-none sm:text-6xl">{p.avatarEmoji}</span>
              ) : (
                <span>{p.firstName.slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            {onEditPicture && (
              <button
                type="button"
                onClick={onEditPicture}
                className="inline-flex min-h-[32px] items-center font-mono text-[11px] uppercase tracking-[0.08em] text-ink-500 hover:text-ink-900"
              >
                {p.photoUrl || p.avatarEmoji ? "Change picture" : "Add picture"}
              </button>
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <p className="eyebrow text-green">
              {explore ? "Your passport" : "Student passport"}
              {p.grade ? ` · Grade ${p.grade}` : ""}
            </p>
            <h1 className="font-display text-[44px] font-extrabold leading-none tracking-tight sm:text-[56px]">
              {explore ? `Hi, ${p.firstName}!` : p.firstName}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Stamp label={`Pathways start here · ${MONTH(p.joinedAt)}`} rotate={-4} />
              <span className="text-sm text-ink-700">
                {explore
                  ? `${p.exposure.length} place${p.exposure.length === 1 ? "" : "s"} explored · ${stamps.length} stamp${stamps.length === 1 ? "" : "s"} collected`
                  : `${Math.round(p.verifiedHours)} verified hours · ${p.exposure.length} places explored · ${p.credentials.length} credential${p.credentials.length === 1 ? "" : "s"}`}
              </span>
            </div>
          </div>
        </div>
        {!explore && (
          <div className="flex items-center gap-3">
            <Seal
              kind="hours"
              value={String(Math.round(p.verifiedHours))}
              caption={`of ${HOURS_TARGET}`}
            />
            <Seal kind="readiness" value={`${p.skillsProficient}/${SEAL_TOTAL}`} caption="seal" />
          </div>
        )}
      </header>

      {/* About me */}
      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="eyebrow text-green">
            {p.aboutMe?.trim() ? "About me" : "About me · drafted from your passport"}
          </p>
          {onEditAbout && (
            <button type="button" onClick={onEditAbout} className="eyebrow hover:text-ink-900">
              Edit
            </button>
          )}
        </div>
        <p className="max-w-[600px] text-lg leading-relaxed text-ink-700">{about}</p>
      </section>

      {/* Explore: stamps collected */}
      {explore && (
        <section className="flex flex-col gap-4">
          <SectionHead
            eyebrow="Stamps I've collected"
            title="Places I've been."
            count={`${stamps.length} stamps`}
          />
          <ul className="flex flex-wrap gap-5">
            {stamps.map((e) => (
              <li key={e.id} className="flex w-[170px] flex-col items-center gap-1.5 text-center">
                <img
                  src={clusterImage(e.career_cluster)!}
                  alt={CLUSTER_BY_SLUG[e.career_cluster!]?.label ?? ""}
                  width={170}
                  height={170}
                  className="h-[170px] w-[170px] object-contain"
                />
                <span className="font-display text-lg font-semibold leading-tight">{e.title}</span>
                <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-500">
                  {e.organization ?? ""}
                </span>
              </li>
            ))}
            <li>
              <Link
                to="/student/experiences/new"
                className="grid h-[170px] w-[170px] place-items-center rounded-[24px] border-2 border-dashed border-line-strong text-center hover:border-emerald"
              >
                <span>
                  <span className="block font-display text-5xl font-extrabold text-line-strong">
                    ?
                  </span>
                  <span className="eyebrow">Next stamp</span>
                </span>
              </Link>
            </li>
          </ul>
        </section>
      )}

      {/* Pro: verified experiences */}
      {!explore && (
        <section className="flex flex-col gap-4">
          <SectionHead
            eyebrow="Verified experiences"
            title="What I've done, stamped by who saw it."
            count={`${p.work.filter((e) => e.status === "verified").length} stamped · ${p.work.filter((e) => e.status !== "verified").length} self-reported`}
            action={
              <Link
                to="/student/experiences/new"
                className="eyebrow text-green-deep hover:underline"
              >
                Add
              </Link>
            }
          />
          {p.work.length === 0 ? (
            <p className="rounded-[var(--radius-control)] border border-dashed border-line-strong p-5 text-sm text-ink-700">
              Nothing here yet. Add an internship, a job, a school-based enterprise, or anything you
              did for real.{" "}
              <Link to="/student/experiences/new" className="ink-link">
                Add your first experience
              </Link>
              .
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {p.work.map((e) => (
                <ExperienceRow key={e.id} e={e} />
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Exposure stickers */}
      <section className="flex flex-col gap-4">
        <SectionHead
          eyebrow={explore ? "Things I tried" : "Places I've been"}
          title={explore ? "My stickers." : "Exposure and exploration."}
          count={`${p.exposure.length} stickers`}
          action={
            <Link
              to="/student/experiences/new"
              search={{ stage: "exploration" }}
              className="eyebrow text-green-deep hover:underline"
            >
              Add
            </Link>
          }
        />
        {p.exposure.length === 0 ? (
          <p className="text-sm text-ink-700">
            Career talks, job shadows, tours, camps, and mentoring go here as stickers.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2.5">
            {p.exposure.map((e) => (
              <li key={e.id}>
                <Sticker
                  module={e.riasec_module ?? "I"}
                  label={`${EXPERIENCE_TYPE_BY_KEY[e.experience_type]?.label ?? e.experience_type} · ${e.organization ?? e.title}`}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Explore: top three interests */}
      {explore && topInterests.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionHead eyebrow="What I like · from my assessment" title="My top three." />
          <ul className="grid gap-4 sm:grid-cols-3">
            {topInterests.map((c) => (
              <li
                key={c}
                className="flex items-center gap-3.5 rounded-[var(--radius-card)] p-4"
                style={{ background: RIASEC[c].colorSoft }}
              >
                <span
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full font-display text-xl font-semibold text-white"
                  style={{ background: RIASEC[c].color }}
                  aria-hidden
                >
                  {c}
                </span>
                <span className="flex flex-col">
                  <span className="font-display text-lg font-semibold">{RIASEC[c].name}</span>
                  <span className="text-sm text-ink-700">
                    {RIASEC[c].msDescription ?? RIASEC[c].hsDescription}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Credentials */}
      {(!explore || p.credentials.length > 0) && (
        <section className="flex flex-col gap-4">
          <SectionHead
            eyebrow="Credits & credentials"
            title="Seals, certificates, and college credit."
            count={`${p.credentials.length} issued`}
            action={
              <Link to="/student/credentials" className="eyebrow text-green-deep hover:underline">
                Add
              </Link>
            }
          />
          {p.credentials.length === 0 ? (
            <p className="text-sm text-ink-700">
              College Credit Plus courses, OSHA cards, industry credentials, and diploma seals live
              here.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-6">
              {p.credentials.map((c) => (
                <li key={c.id} className="flex w-[190px] flex-col items-center gap-2.5 text-center">
                  <Seal
                    kind={c.type === "diploma_seal" ? "readiness" : "credential"}
                    value={c.credits ? `${c.credits}` : c.title.slice(0, 4).toUpperCase()}
                    caption={
                      c.credits
                        ? "credits"
                        : (CREDENTIAL_TYPES.find((t) => t.key === c.type)?.label.split(" ")[0] ??
                          "cert")
                    }
                  />
                  <span className="text-sm text-ink-700">
                    {c.title}
                    {c.issuer ? ` · ${c.issuer}` : ""}
                    {c.verification_method === "self_reported"
                      ? " · self-reported"
                      : " · issuer-signed"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Pro: competencies (verified ratings only) */}
      {!explore && (
        <section className="flex flex-col gap-4">
          <SectionHead
            eyebrow="Competencies · verified ratings only"
            title="Readiness Seal skills, rated by supervisors."
            count="Scale 1 to 4 · 3 is proficient"
          />
          {p.ratings.length === 0 ? (
            <p className="text-sm text-ink-700">
              When a supervisor stamps an experience, they rate the skills they saw on the
              four-level Readiness Seal scale. Those ratings show here. Nothing is self-rated.
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {p.seal
                .filter((s) => s.best !== null)
                .map((s) => (
                  <li key={s.skill} className="flex flex-wrap items-center gap-4">
                    <span className="w-[230px] text-[15px] font-medium">{s.skill}</span>
                    <span
                      className="flex items-center gap-1.5"
                      aria-label={`${RATING_LEVELS[(s.best ?? 1) - 1]}`}
                    >
                      {[1, 2, 3, 4].map((i) => (
                        <span
                          key={i}
                          className="h-2.5 w-10 rounded-full"
                          style={{
                            background:
                              i <= (s.best ?? 0)
                                ? i === 4
                                  ? "var(--color-green-deep)"
                                  : "var(--color-green)"
                                : "var(--color-line)",
                          }}
                        />
                      ))}
                    </span>
                    <span className="eyebrow">
                      {RATING_LEVELS[(s.best ?? 1) - 1]} · {s.raters.size} rater
                      {s.raters.size === 1 ? "" : "s"} ·{" "}
                      {[...s.settings].join(", ") || "no setting"}
                      {s.sealReady ? " · seal-ready" : ""}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </section>
      )}

      {/* Gallery */}
      <section className="flex flex-col gap-4">
        <SectionHead
          eyebrow={explore ? "Keep scrolling · my gallery" : "Keep scrolling · media & products"}
          title="Things I made."
          count={`${p.pieces.length} pieces`}
          action={
            <Link to="/student/pieces" className="eyebrow text-green-deep hover:underline">
              Add
            </Link>
          }
        />
        {p.pieces.length === 0 ? (
          <p className="text-sm text-ink-700">
            Photos, builds, code, writing, designs. Anything you made, with a line about what you
            learned.
          </p>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-3">
            {p.pieces.map((pc) => (
              <li key={pc.id} className="flex flex-col gap-2">
                {pc.artifact_type === "image" && pc.url ? (
                  <img
                    src={pc.url}
                    alt={pc.title}
                    className="aspect-square w-full rounded-[12px] object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="grid aspect-square w-full place-items-center rounded-[12px] border border-line bg-paper font-mono text-[11px] uppercase tracking-[0.08em] text-ink-500">
                    {pc.artifact_type.replace(/_/g, " ")}
                  </span>
                )}
                <span className="font-medium">
                  {pc.url ? (
                    <a href={pc.url} target="_blank" rel="noreferrer" className="ink-link">
                      {pc.title}
                    </a>
                  ) : (
                    pc.title
                  )}
                </span>
                <span className="eyebrow">
                  {[pc.context, pc.reviewed_at ? "reviewed" : "self-reported"]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Export row (Pro): Ohio alignment outputs, generated from verified records only. */}
      {!explore && (
        <section className="flex flex-col gap-3 border-t border-line pt-6">
          <p className="eyebrow text-green">Export my passport</p>
          <div className="flex flex-wrap gap-2.5">
            <button type="button" onClick={() => downloadHoursLogPdf(p)} className="btn-ghost">
              250-hour log (PDF)
            </button>
            <button type="button" onClick={() => downloadHoursLogCsv(p)} className="btn-ghost">
              250-hour log (CSV)
            </button>
            <button type="button" onClick={() => downloadSealEvidencePdf(p)} className="btn-ghost">
              Readiness Seal evidence
            </button>
            <button type="button" onClick={() => downloadResumePdf(p)} className="btn-ghost">
              Resume (PDF)
            </button>
            <button type="button" onClick={() => downloadResumeText(p)} className="btn-ghost">
              Resume (text for OhioMeansJobs)
            </button>
            <button type="button" onClick={() => downloadOpenBadges(p)} className="btn-ghost">
              Open Badges (draft JSON)
            </button>
          </div>
          <p className="text-xs text-ink-500">
            The hours log and seal evidence include verified records only. Badges are an unsigned
            draft until EXPLR configures an issuer key.
          </p>
        </section>
      )}
    </article>
  );
}
