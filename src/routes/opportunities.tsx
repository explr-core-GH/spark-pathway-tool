import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { SiteFooter } from "@/components/SiteFooter";
import { PortalHeader, SiteHeader, type PortalLink } from "@/components/passport";
import { Check, ExternalLink, Sparkles } from "lucide-react";
import {
  OPP_TYPES,
  oppTypeMeta,
  dollars,
  hollandMatch,
  internshipYearOf,
  turns14ByJune1,
  INTERNSHIP_MIN_GRADE,
  type OppType,
  type Opportunity,
} from "@/lib/opportunities";

const STUDENT_LINKS: PortalLink[] = [
  { label: "My passport", to: "/student" },
  { label: "Opportunities", to: "/opportunities" },
  { label: "Careers", to: "/careers" },
  { label: "Families", to: "/student/pathway", search: { tab: "families" } },
];

/** Public visitors get the site header; signed-in students get the passport portal header. */
function BrowseHeader({ signedIn, isStudent }: { signedIn: boolean; isStudent: boolean }) {
  if (!signedIn) return <SiteHeader />;
  return (
    <PortalHeader
      role={isStudent ? "Student" : undefined}
      links={isStudent ? STUDENT_LINKS : []}
      signedIn
    />
  );
}

export const Route = createFileRoute("/opportunities")({
  head: () => ({ meta: [{ title: "Explore opportunities — EXPLR" }] }),
  component: Browse,
});

const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);

type StudentRow = {
  id: string;
  first_name: string | null;
  grade: number | null;
  date_of_birth: string | null;
};
type Filter = OppType | "all";

function Browse() {
  const { user } = useSession();
  const [opps, setOpps] = useState<Opportunity[] | null>(null);
  const [student, setStudent] = useState<StudentRow | null>(null);
  const [holland, setHolland] = useState<string | null>(null);
  const [regs, setRegs] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("all");
  const [matchOnly, setMatchOnly] = useState(false);
  const [dob, setDob] = useState("");
  const [savingDob, setSavingDob] = useState(false);

  useEffect(() => {
    sb("opportunities")
      .select("*")
      .eq("status", "approved")
      .order("start_date", { ascending: true })
      .then(({ data }: { data: Opportunity[] | null }) => setOpps((data as Opportunity[]) ?? []));
  }, []);

  useEffect(() => {
    if (!user) {
      setStudent(null);
      setHolland(null);
      setRegs(new Set());
      return;
    }
    sb("students")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }: { data: StudentRow | null }) => setStudent((data as StudentRow) ?? null));
    supabase
      .from("assessment_sessions")
      .select("holland_code, completed_at")
      .eq("student_id", user.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(1)
      .then(({ data }) => setHolland((data?.[0]?.holland_code as string) ?? null));
    sb("opportunity_registrations")
      .select("opportunity_id")
      .eq("student_id", user.id)
      .then(({ data }: { data: Array<{ opportunity_id: string }> | null }) =>
        setRegs(new Set((data ?? []).map((r) => r.opportunity_id))),
      );
  }, [user]);

  const now = new Date();
  const isStudent = !!student;

  // Internship access state for this viewer.
  const internshipState: "ok" | "signin" | "grade" | "dob" | "staff" = useMemo(() => {
    if (isStudent) {
      if ((student!.grade ?? 0) < INTERNSHIP_MIN_GRADE) return "grade";
      if (!student!.date_of_birth) return "dob";
      return "ok";
    }
    return user ? "staff" : "signin";
  }, [isStudent, student, user]);

  function internshipVisible(o: Opportunity): boolean {
    if (internshipState === "staff") return true;
    if (internshipState !== "ok") return false;
    return turns14ByJune1(student!.date_of_birth!, internshipYearOf(o.start_date, now));
  }

  const cards = useMemo(() => {
    if (!opps) return [];
    let list = opps.filter((o) => filter === "all" || o.type === filter);
    list = list.filter((o) => (o.type === "internship" ? internshipVisible(o) : true));
    if (matchOnly && holland) list = list.filter((o) => hollandMatch(holland, o.riasec_code) > 0);
    return list
      .map((o) => ({ o, m: hollandMatch(holland, o.riasec_code) }))
      .sort((a, b) => b.m - a.m)
      .map((x) => x.o);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opps, filter, matchOnly, holland, internshipState, student]);

  async function register(o: Opportunity) {
    if (!user || !isStudent) return;
    const { error } = await sb("opportunity_registrations").insert({
      opportunity_id: o.id,
      student_id: user.id,
      contact_name: student?.first_name ?? null,
    });
    if (error) {
      alert(error.message);
      return;
    }
    setRegs((prev) => new Set(prev).add(o.id));
  }

  async function saveDob() {
    if (!user || !dob) return;
    setSavingDob(true);
    const { error } = await sb("students").update({ date_of_birth: dob }).eq("id", user.id);
    setSavingDob(false);
    if (error) {
      alert(error.message);
      return;
    }
    setStudent((s) => (s ? { ...s, date_of_birth: dob } : s));
  }

  const showInternshipGate =
    (filter === "all" || filter === "internship") &&
    internshipState !== "ok" &&
    internshipState !== "staff";

  return (
    <div className="min-h-screen bg-paper text-ink-900">
      <BrowseHeader signedIn={!!user} isStudent={isStudent} />
      <main className="mx-auto max-w-[1312px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="eyebrow text-green">Opportunities</p>
            <h1 className="display mt-1">Explore opportunities.</h1>
            <p className="lead mt-3">
              Camps, workshops, internships, and clubs from EXPLR partner organizations.
              {holland ? ` Your interest code is ${holland} — matches are highlighted.` : ""}
            </p>
          </div>
          <img
            src="/passport/organizations.webp"
            alt=""
            width={220}
            height={130}
            className="hidden h-[130px] w-auto object-contain md:block"
            loading="lazy"
          />
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          {(
            [
              { key: "all", label: "All" },
              ...OPP_TYPES.map((t) => ({ key: t.key, label: t.label })),
            ] as Array<{ key: Filter; label: string }>
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm font-medium transition-colors ${
                filter === f.key
                  ? "border-ink-900 bg-ink-900 text-paper"
                  : "border-line-strong bg-paper-raised text-ink-700 hover:border-ink-900"
              }`}
            >
              {f.label}
            </button>
          ))}
          {holland && (
            <label className="ml-2 flex min-h-[44px] items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                className="h-5 w-5 accent-green-deep"
                checked={matchOnly}
                onChange={(e) => setMatchOnly(e.target.checked)}
              />
              Match my interests
            </label>
          )}
        </div>

        {showInternshipGate && (
          <InternshipGate
            state={internshipState}
            dob={dob}
            setDob={setDob}
            saveDob={saveDob}
            savingDob={savingDob}
          />
        )}

        {opps === null ? (
          <p role="status" className="mt-10 text-sm text-ink-500">
            Loading…
          </p>
        ) : cards.length === 0 ? (
          <p className="mt-10 rounded-[var(--radius-card)] border border-dashed border-line-strong bg-paper-raised px-6 py-10 text-center text-sm text-ink-700">
            {filter === "internship" && internshipState === "ok"
              ? "No internships you're eligible for yet — check back as new ones are posted."
              : "No opportunities here yet."}
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((o) => (
              <OppCard
                key={o.id}
                o={o}
                match={hollandMatch(holland, o.riasec_code)}
                registered={regs.has(o.id)}
                canRegister={isStudent}
                onRegister={() => register(o)}
              />
            ))}
          </div>
        )}
      </main>
      <SiteFooter className="mt-16" />
    </div>
  );
}

function InternshipGate({
  state,
  dob,
  setDob,
  saveDob,
  savingDob,
}: {
  state: "ok" | "signin" | "grade" | "dob" | "staff";
  dob: string;
  setDob: (v: string) => void;
  saveDob: () => void;
  savingDob: boolean;
}) {
  return (
    <div className="mt-8 rounded-[var(--radius-card)] bg-gold-tint p-5">
      {state === "signin" && (
        <p className="text-sm text-ink-700">
          Internships are for signed-in students.{" "}
          <Link to="/sign-in" className="ink-link">
            Sign in
          </Link>{" "}
          to see the ones you&apos;re eligible for.
        </p>
      )}
      {state === "grade" && (
        <p className="text-sm text-ink-700">
          Internships open up in <span className="font-medium">8th grade</span>. You&apos;ll see
          them here once you&apos;re in 8th grade or above.
        </p>
      )}
      {state === "dob" && (
        <div>
          <p className="font-display text-lg font-semibold">One quick check before internships</p>
          <p className="mt-1 text-sm text-ink-700">
            Students must turn <span className="font-medium">14 by June 1</span> of the
            internship&apos;s year. Enter your date of birth to see the internships you qualify for.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="label" htmlFor="internship-dob">
                Date of birth
              </label>
              <input
                id="internship-dob"
                type="date"
                autoComplete="bday"
                className="field w-48"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </div>
            <button
              onClick={saveDob}
              disabled={!dob || savingDob}
              className="btn-ink disabled:opacity-40"
            >
              {savingDob ? "Saving…" : "Save & view internships"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OppCard({
  o,
  match,
  registered,
  canRegister,
  onRegister,
}: {
  o: Opportunity;
  match: number;
  registered: boolean;
  canRegister: boolean;
  onRegister: () => void;
}) {
  const meta = oppTypeMeta(o.type);
  const grades = [o.grade_min, o.grade_max].filter((x) => x != null).join("–");
  return (
    <div className="flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper-raised shadow-card transition-colors hover:border-emerald">
      {o.image_url ? (
        <img src={o.image_url} alt="" className="h-36 w-full object-cover" />
      ) : (
        <div className="flex h-36 w-full items-center justify-center bg-mint-tint/50">
          <img
            src="/passport/organizations.webp"
            alt=""
            width={200}
            height={110}
            className="h-[110px] w-auto object-contain"
            loading="lazy"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-paper-sunken px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-700">
            {meta.label}
          </span>
          {match > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-mint-tint px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-green-deep">
              <Sparkles className="h-3 w-3" aria-hidden /> Matches {o.riasec_code}
            </span>
          )}
        </div>
        <Link
          to="/opportunity/$id"
          params={{ id: o.id }}
          className="mt-3 block font-display text-lg font-semibold leading-snug hover:underline"
        >
          {o.name || "Opportunity"}
        </Link>
        <div className="mt-1 flex items-center gap-1.5 text-sm text-ink-700">
          {o.org_logo_url && (
            <img src={o.org_logo_url} alt="" className="h-4 w-4 rounded object-cover" />
          )}
          <span className="truncate">{o.org_name || "Organization"}</span>
        </div>
        <p className="mt-2 text-xs text-ink-500">
          {[o.start_date, o.location].filter(Boolean).join(" · ") || "—"}
          {grades ? ` · grades ${grades}` : ""}
        </p>
        <p className="mt-1 text-sm font-medium text-ink-900">
          {o.is_free ? "Free" : dollars(o.cost_cents)}
        </p>

        <div className="mt-auto pt-4">
          {o.type === "internship" ? (
            canRegister ? (
              <Link
                to="/student/apply"
                search={{ opportunity: o.id }}
                className="btn-ink w-full justify-center"
              >
                Apply<span className="sr-only"> to {o.name || "this opportunity"}</span>
              </Link>
            ) : (
              <Link to="/sign-in" className="btn-ghost w-full justify-center">
                Sign in to apply
              </Link>
            )
          ) : o.registration_mode === "external" && o.external_url ? (
            <a
              href={o.external_url}
              target="_blank"
              rel="noreferrer"
              className="btn-ink w-full justify-center"
            >
              Register on their site <ExternalLink className="h-4 w-4" aria-hidden />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : registered ? (
            <span className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-mint-tint px-4 text-sm font-semibold text-green-deep">
              <Check className="h-4 w-4" aria-hidden /> Registered
            </span>
          ) : canRegister ? (
            <button type="button" onClick={onRegister} className="btn-ink w-full justify-center">
              Register<span className="sr-only"> for {o.name || "this opportunity"}</span>
            </button>
          ) : (
            <Link to="/sign-in" className="btn-ghost w-full justify-center">
              Sign in to register
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
