import { createFileRoute, Link } from "@tanstack/react-router";
import { useSession } from "@/lib/auth";
import { RoleGuard } from "@/components/RoleGuard";
import { PortalHeader, type PortalLink } from "@/components/passport";
import { SiteFooter } from "@/components/SiteFooter";
import { usePassport, SEAL_TOTAL } from "@/lib/passport";
import { COMPETENCIES, RATING_LEVELS } from "@/lib/competencies";

/** /student/skills — Readiness Seal progress, grouped under the NACE competencies. Verified ratings only. */
const STUDENT_LINKS: PortalLink[] = [
  { label: "My passport", to: "/student" },
  { label: "Opportunities", to: "/opportunities" },
  { label: "Families", to: "/student/pathway", search: { tab: "families" } },
];

export const Route = createFileRoute("/student_/skills")({
  head: () => ({ meta: [{ title: "Skills — EXPLR Pathways" }] }),
  component: () => (
    <RoleGuard requires="student">
      <Skills />
    </RoleGuard>
  ),
});

function Skills() {
  const { user } = useSession();
  const { data: p } = usePassport(user?.id ?? null);
  const bySkill = new Map((p?.seal ?? []).map((s) => [s.skill, s]));

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
        <p className="eyebrow text-green">Skills · OhioMeansJobs-Readiness Seal</p>
        <h1 className="display mt-1">What supervisors have seen.</h1>
        <p className="mt-4 max-w-xl text-ink-700">
          Each time a supervisor stamps an experience, they rate the skills they watched you use on
          a four-level scale. The Readiness Seal needs a skill shown in two of three settings
          (school, work, community) and rated Proficient or better by three different mentors.
        </p>
        {p && (
          <p className="mt-3 eyebrow">
            {p.skillsProficient} of {SEAL_TOTAL} skills at Proficient · {p.sealReadyCount}{" "}
            seal-ready
          </p>
        )}

        <div className="mt-8 flex flex-col gap-6">
          {COMPETENCIES.filter((c) => c.omjSkills.length > 0).map((c) => (
            <section
              key={c.key}
              className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-5"
            >
              <h2 className="font-display text-xl font-semibold">{c.label}</h2>
              <ul className="mt-3 flex flex-col gap-2.5">
                {c.omjSkills.map((skill) => {
                  const s = bySkill.get(skill);
                  const best = s?.best ?? 0;
                  return (
                    <li key={skill} className="flex flex-wrap items-center gap-4">
                      <span className="w-[260px] text-[15px] font-medium">{skill}</span>
                      <span
                        className="flex items-center gap-1.5"
                        aria-label={best ? RATING_LEVELS[best - 1] : "Not rated yet"}
                      >
                        {[1, 2, 3, 4].map((i) => (
                          <span
                            key={i}
                            className="h-2.5 w-10 rounded-full"
                            style={{
                              background:
                                i <= best
                                  ? i === 4
                                    ? "var(--color-green-deep)"
                                    : "var(--color-green)"
                                  : "var(--color-line)",
                            }}
                          />
                        ))}
                      </span>
                      <span className="eyebrow">
                        {best
                          ? `${RATING_LEVELS[best - 1]} · ${s!.raters.size} rater${s!.raters.size === 1 ? "" : "s"} · ${[...s!.settings].join(", ")}`
                          : "Not rated yet"}
                        {s?.sealReady ? " · seal-ready" : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter className="mt-16" />
    </div>
  );
}
