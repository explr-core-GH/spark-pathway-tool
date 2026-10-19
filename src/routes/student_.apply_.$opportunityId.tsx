import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { RoleGuard } from "@/components/RoleGuard";
import { SiteFooter } from "@/components/SiteFooter";
import { PortalHeader, type PortalLink } from "@/components/passport";
import { Section } from "@/components/hs-application/fields";
import {
  isAnswered,
  ListingProfile,
  QuestionInput,
  RequirementCards,
} from "@/components/hs-application/PartnerApplicationView";
import { REQUIREMENT_BY_KEY, REQUIREMENT_CATEGORIES } from "@/lib/hs-application/content";
import { hydrateGeneral, loadCurrentSeason } from "@/lib/hs-application/data";
import { listingFromOpportunity, type OppRow } from "@/lib/hs-application/listings";
import {
  EMPTY_BUILDER,
  EMPTY_PARTNER_ANSWERS,
  hydrateBuilder,
  type ApplicationBuilder,
  type GeneralApplication,
  type PartnerAnswers,
} from "@/lib/hs-application/types";
import { ageOn, wordCount } from "@/lib/hs-application/validate";
import { isDemoEmail } from "@/lib/hs-application/data";
import { demoPartnerAnswers } from "@/lib/hs-application/demo-fill";
import { DemoBar } from "@/components/hs-application/DemoBar";

const STUDENT_LINKS: PortalLink[] = [
  { label: "My passport", to: "/student" },
  { label: "Opportunities", to: "/opportunities" },
  { label: "Careers", to: "/careers" },
  { label: "Families", to: "/student/pathway", search: { tab: "families" } },
];

export const Route = createFileRoute("/student_/apply_/$opportunityId")({
  head: () => ({ meta: [{ title: "Apply to an internship — EXPLR" }] }),
  component: () => (
    <RoleGuard requires="student">
      <PartnerApplyPage />
    </RoleGuard>
  ),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);

type Existing = { id: string; status: string; version_id: string | null } & PartnerAnswers;

function PartnerApplyPage() {
  const { opportunityId } = Route.useParams();
  const { user } = useSession();
  const navigate = useNavigate();
  const [general, setGeneral] = useState<GeneralApplication | null | undefined>(undefined);
  const [opp, setOpp] = useState<OppRow | null>(null);
  const [builder, setBuilder] = useState<ApplicationBuilder>(EMPTY_BUILDER);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [existing, setExisting] = useState<Existing | null>(null);
  const [answers, setAnswers] = useState<PartnerAnswers>(EMPTY_PARTNER_ANSWERS);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const season = await loadCurrentSeason();
      const { data: g } = season
        ? await sb("hs_general_applications")
            .select("*")
            .eq("student_id", user.id)
            .eq("season_id", season.id)
            .maybeSingle()
        : { data: null };
      const gen = g ? hydrateGeneral(g) : null;
      setGeneral(gen);
      const { data: o } = await sb("opportunities")
        .select("*")
        .eq("id", opportunityId)
        .maybeSingle();
      if (!o) {
        setLoadError("This internship isn't open right now.");
        return;
      }
      setOpp(o as OppRow);
      // A student who already started keeps the version they saw.
      let ex: Existing | null = null;
      if (gen) {
        const { data: pa } = await sb("hs_partner_applications")
          .select("id, status, version_id, answers, requirements, question_notes")
          .eq("general_id", gen.id)
          .eq("opportunity_id", opportunityId)
          .maybeSingle();
        if (pa)
          ex = {
            id: pa.id,
            status: pa.status,
            version_id: pa.version_id,
            answers: pa.answers ?? {},
            requirements: pa.requirements ?? {},
            questionNotes: pa.question_notes ?? {},
          };
      }
      setExisting(ex);
      if (ex)
        setAnswers({
          answers: ex.answers,
          requirements: ex.requirements,
          questionNotes: ex.questionNotes,
        });
      const vid = ex?.version_id ?? (o as OppRow).application_version_id ?? null;
      setVersionId(vid);
      if (vid) {
        const { data: v } = await sb("opp_application_versions")
          .select("builder")
          .eq("id", vid)
          .maybeSingle();
        setBuilder(hydrateBuilder(v?.builder));
      } else {
        setBuilder({
          ...EMPTY_BUILDER,
          profile: {
            ...EMPTY_BUILDER.profile,
            title: o.name ?? "Internship",
            description: o.description ?? "",
            startDate: o.start_date ?? "",
            endDate: o.end_date ?? "",
            address: o.location ?? "",
          },
        });
      }
    })().catch((e) => setLoadError(e instanceof Error ? e.message : String(e)));
  }, [user, opportunityId]);

  if (general === undefined && !loadError) {
    return (
      <main role="status" className="mx-auto max-w-3xl px-6 py-24 text-sm text-ink-500">
        Loading…
      </main>
    );
  }

  const listing = opp ? listingFromOpportunity(opp, versionId ? builder : undefined) : null;
  const age =
    general?.core.dob && listing?.startDate
      ? ageOn(general.core.dob, new Date(`${listing.startDate}T12:00:00`))
      : null;
  const tooYoung = !!(listing?.ageMin && age !== null && age < listing.ageMin);
  const tooOld = !!(listing?.ageMax && age !== null && age > listing.ageMax);
  const submitted = existing?.status === "submitted";

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    for (const q of builder.questions) {
      const v = answers.answers[q.id];
      if (!isAnswered(q, v)) e[`q.${q.id}`] = "Answer this question.";
      if (q.kind === "text" && q.maxWords && wordCount(String(v ?? "")) > q.maxWords)
        e[`q.${q.id}`] = `Keep it to ${q.maxWords} words or fewer.`;
    }
    for (const r of builder.requirements) {
      if (!answers.requirements[r.key]) {
        const ackOnly = REQUIREMENT_CATEGORIES.find(
          (c) => c.key === REQUIREMENT_BY_KEY.get(r.key)?.category,
        )?.ackOnly;
        e[`req.${r.key}`] = ackOnly ? "Check “Got it.”" : "Tell us if this works for you.";
      }
    }
    return e;
  }

  async function save(status: "draft" | "submitted") {
    if (!general || !user) return;
    if (status === "submitted") {
      const e = validate();
      setErrors(e);
      if (Object.keys(e).length) {
        requestAnimationFrame(() =>
          document
            .querySelector<HTMLElement>("[role='alert']")
            ?.scrollIntoView({ block: "center" }),
        );
        return;
      }
    }
    setBusy(true);
    const row = {
      general_id: general.id,
      student_id: user.id,
      opportunity_id: opportunityId,
      version_id: versionId,
      answers: answers.answers,
      requirements: answers.requirements,
      question_notes: answers.questionNotes,
      status,
    };
    const res = existing
      ? await sb("hs_partner_applications")
          .update(row)
          .eq("id", existing.id)
          .select("id, status")
          .single()
      : await sb("hs_partner_applications").insert(row).select("id, status").single();
    setBusy(false);
    if (res.error) {
      setErrors({ save: res.error.message });
      return;
    }
    setExisting({ id: res.data.id, status: res.data.status, version_id: versionId, ...answers });
    if (status === "submitted")
      navigate({ to: "/student/apply", search: { opportunity: opportunityId } });
    else setNotice("Saved. You can finish later.");
  }

  return (
    <div className="min-h-screen bg-paper text-ink-900">
      <PortalHeader role="Student" links={STUDENT_LINKS} signedIn />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link
          to="/student/apply"
          className="inline-flex min-h-[44px] items-center text-sm font-medium text-green-deep hover:underline"
        >
          ← My application
        </Link>
        {loadError && (
          <p role="alert" className="mt-6 rounded-[var(--radius-card)] bg-gold-tint p-4 text-sm">
            {loadError}
          </p>
        )}
        {!loadError && (!general || general.status === "draft") && (
          <div className="mt-6 rounded-[var(--radius-card)] border border-line bg-gold-tint p-5">
            <p className="font-display text-xl font-semibold">
              Finish your general application first.
            </p>
            <p className="mt-1 text-sm text-ink-700">
              It's one application for every EXPLR internship. When it's done, you'll come back here
              and answer just this partner's questions.
            </p>
            <Link
              to="/student/apply"
              search={{ opportunity: opportunityId }}
              className="btn-ink mt-4"
            >
              {general ? "Continue my general application →" : "Start my general application →"}
            </Link>
          </div>
        )}
        {opp && (
          <article className="mt-6 grid gap-6">
            <section className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 shadow-card sm:p-6">
              <ListingProfile b={builder} org={opp.org_name ?? ""} />
            </section>
            {general && general.status !== "draft" && (
              <>
                {submitted && (
                  <p
                    role="status"
                    className="rounded-[var(--radius-card)] border border-mint-soft bg-mint-tint p-4 text-sm"
                  >
                    You applied to this internship. EXPLR staff will be in touch.
                  </p>
                )}
                {(tooYoung || tooOld) && (
                  <p
                    role="status"
                    className="rounded-[var(--radius-card)] bg-paper-sunken p-4 text-sm"
                  >
                    {tooYoung
                      ? `This internship opens at age ${listing!.ageMin}. You'll be ${age} on the first day, so keep it in mind for a future season.`
                      : `This internship is for ages ${listing!.ageMax} and under.`}
                  </p>
                )}
                {!tooYoung && !tooOld && (
                  <>
                    {isDemoEmail(user?.email) && !submitted && (
                      <DemoBar
                        onFill={() => {
                          setErrors({});
                          setAnswers(demoPartnerAnswers(builder));
                        }}
                        fillLabel="Fill with sample answers"
                      />
                    )}
                    <p className="text-sm text-ink-700">
                      Your general application is already done, so this only takes a few minutes.
                    </p>
                    <RequirementCards
                      b={builder}
                      answers={answers}
                      onChange={submitted ? undefined : setAnswers}
                      ageNote={
                        age !== null && listing?.ageMin
                          ? `You'll be ${age} on the first day.`
                          : null
                      }
                      errors={errors}
                    />
                    {builder.questions.length > 0 && (
                      <Section title={`${opp.org_name ?? "Partner"}'s questions`}>
                        {builder.questions.map((q) => (
                          <QuestionInput
                            key={q.id}
                            q={q}
                            value={answers.answers[q.id]}
                            onChange={(v) =>
                              !submitted &&
                              setAnswers({ ...answers, answers: { ...answers.answers, [q.id]: v } })
                            }
                            error={errors[`q.${q.id}`]}
                          />
                        ))}
                      </Section>
                    )}
                    {errors.save && (
                      <p role="alert" className="text-sm text-red-700">
                        Couldn't save: {errors.save}
                      </p>
                    )}
                    {Object.keys(errors).length > 0 && !errors.save && (
                      <p role="alert" className="text-sm text-red-700">
                        A few answers need attention.
                      </p>
                    )}
                    {notice && (
                      <p role="status" className="text-sm text-green-deep">
                        {notice}
                      </p>
                    )}
                    {!submitted && (
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
                        <button
                          type="button"
                          className="btn-ghost"
                          disabled={busy}
                          onClick={() => save("draft")}
                        >
                          Save and finish later
                        </button>
                        <button
                          type="button"
                          className="btn-ink"
                          disabled={busy}
                          onClick={() => save("submitted")}
                        >
                          {busy ? "Sending…" : "Submit this application"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </article>
        )}
      </main>
      <SiteFooter className="mt-16" />
    </div>
  );
}
