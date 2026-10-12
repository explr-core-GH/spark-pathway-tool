import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { RoleGuard } from "@/components/RoleGuard";
import { Wordmark } from "@/components/passport";
import { WEEKDAYS } from "@/lib/opportunities";

/**
 * /student/profile — the internship general application. Filled once,
 * reused for every internship the student requests. Coursework they think is
 * relevant, likes and dislikes, aspirations, availability, transportation,
 * and optional demographics (used only to see who the portal reaches).
 */
export const Route = createFileRoute("/student_/profile")({
  head: () => ({ meta: [{ title: "Internship profile — EXPLR Pathways" }] }),
  validateSearch: (s: Record<string, unknown>): { next?: string } =>
    typeof s.next === "string" ? { next: s.next } : {},
  component: () => (
    <RoleGuard requires="student">
      <Profile />
    </RoleGuard>
  ),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = (table: string): any => (supabase.from as unknown as (n: string) => any)(table);

type Course = { subject: string; course: string; grade_level: string; relevance: string };
const GRAD_YEARS = Array.from({ length: 7 }, (_, i) => new Date().getFullYear() + i);
const PREFER_NOT = "Prefer not to say";

function Profile() {
  const { user } = useSession();
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [loaded, setLoaded] = useState(false);
  const [dob, setDob] = useState("");
  const [hasDob, setHasDob] = useState(false);
  const [highSchool, setHighSchool] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [aspiration, setAspiration] = useState("");
  const [major, setMajor] = useState("");
  const [college, setCollege] = useState("");
  const [likes, setLikes] = useState("");
  const [dislikes, setDislikes] = useState("");
  const [coursework, setCoursework] = useState<Course[]>([]);
  const [days, setDays] = useState<string[]>([]);
  const [summer, setSummer] = useState(true);
  const [schoolYear, setSchoolYear] = useState(false);
  const [availNotes, setAvailNotes] = useState("");
  const [transportation, setTransportation] = useState("");
  const [workAuth, setWorkAuth] = useState<boolean | null>(null);
  const [gender, setGender] = useState("");
  const [ethnicity, setEthnicity] = useState<string[]>([]);
  const [firstGen, setFirstGen] = useState("");
  const [language, setLanguage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: st }, { data: p }] = await Promise.all([
        sb("students").select("date_of_birth").eq("id", user.id).maybeSingle(),
        sb("internship_profiles").select("*").eq("student_id", user.id).maybeSingle(),
      ]);
      setHasDob(!!st?.date_of_birth);
      if (p) {
        setHighSchool(p.high_school ?? "");
        setGradYear(p.grad_year ? String(p.grad_year) : "");
        setAspiration(p.career_aspiration ?? "");
        setMajor(p.intended_major ?? "");
        setCollege(p.intended_college ?? "");
        setLikes(p.likes ?? "");
        setDislikes(p.dislikes ?? "");
        setCoursework((p.coursework as Course[]) ?? []);
        setDays(p.availability?.days ?? []);
        setSummer(p.availability?.summer ?? true);
        setSchoolYear(p.availability?.school_year ?? false);
        setAvailNotes(p.availability?.notes ?? "");
        setTransportation(p.transportation ?? "");
        setWorkAuth(p.work_authorization ?? null);
        setGender(p.demographics?.gender ?? "");
        setEthnicity(p.demographics?.ethnicity ?? []);
        setFirstGen(p.demographics?.first_gen ?? "");
        setLanguage(p.demographics?.language ?? "");
      }
      setLoaded(true);
    })();
  }, [user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setError(null);
    if (!hasDob && dob) {
      const { error: dErr } = await sb("students").update({ date_of_birth: dob }).eq("id", user.id);
      if (dErr) {
        setError(dErr.message);
        setBusy(false);
        return;
      }
    }
    const { error: err } = await sb("internship_profiles").upsert({
      student_id: user.id,
      high_school: highSchool.trim() || null,
      grad_year: gradYear ? Number(gradYear) : null,
      career_aspiration: aspiration.trim() || null,
      intended_major: major.trim() || null,
      intended_college: college.trim() || null,
      likes: likes.trim() || null,
      dislikes: dislikes.trim() || null,
      coursework: coursework.filter((c) => c.course.trim()),
      availability: { days, summer, school_year: schoolYear, notes: availNotes.trim() || null },
      transportation: transportation || null,
      work_authorization: workAuth,
      demographics: {
        gender: gender || null,
        ethnicity,
        first_gen: firstGen || null,
        language: language.trim() || null,
      },
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    navigate({ href: next ?? "/student/apply" });
  }

  const ETH = [
    "Black or African American",
    "Hispanic or Latino",
    "White",
    "Asian",
    "American Indian or Alaska Native",
    "Native Hawaiian or Pacific Islander",
    "Middle Eastern or North African",
    "Multiracial",
    PREFER_NOT,
  ];

  return (
    <div className="min-h-screen bg-paper text-ink-900">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[900px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Wordmark />
          <Link to="/student" className="text-[15px] font-medium text-green-deep hover:underline">
            ← My passport
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[900px] px-4 py-10 sm:px-6">
        <p className="eyebrow text-green">Internship general application</p>
        <h1 className="display mt-1">Tell us how to place you.</h1>
        <p className="mt-4 max-w-xl text-ink-700">
          Fill this once. It travels with every internship you request, and it's how EXPLR matches
          you to the right one: what you've studied, what you like and don't, where you're headed,
          when you're free, and how you'll get there.
        </p>

        {!loaded ? (
          <p className="mt-8 text-ink-500">Loading…</p>
        ) : (
          <form onSubmit={save} className="mt-8 flex flex-col gap-8">
            {!hasDob && (
              <section className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-5">
                <label className="label" htmlFor="pf-dob">
                  Date of birth
                </label>
                <input
                  id="pf-dob"
                  type="date"
                  className="field max-w-xs"
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
                <p className="mt-1 text-xs text-ink-500">
                  Used only to check age rules for internships. Never shown on your passport.
                </p>
              </section>
            )}

            <section className="grid gap-4 rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 sm:grid-cols-2">
              <h2 className="font-display text-xl font-semibold sm:col-span-2">School and plans</h2>
              <Field
                id="pf-hs"
                label="Current high school"
                value={highSchool}
                onChange={setHighSchool}
                required
              />
              <div>
                <label className="label" htmlFor="pf-grad">
                  Graduation year
                </label>
                <select
                  id="pf-grad"
                  className="field"
                  value={gradYear}
                  onChange={(e) => setGradYear(e.target.value)}
                >
                  <option value="">Choose…</option>
                  {GRAD_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <Field
                id="pf-asp"
                label="Career you're aiming for (or exploring)"
                value={aspiration}
                onChange={setAspiration}
                required
                hint="A job, a field, or 'still deciding between X and Y'."
              />
              <Field
                id="pf-major"
                label="Intended college major, if any"
                value={major}
                onChange={setMajor}
              />
              <Field
                id="pf-college"
                label="Intended college or program, if any"
                value={college}
                onChange={setCollege}
              />
            </section>

            <section className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-5">
              <h2 className="font-display text-xl font-semibold">
                Coursework you think is relevant
              </h2>
              <p className="mt-1 text-sm text-ink-700">
                Classes that connect to the internships you want. Say why in a few words; that's
                what we match on.
              </p>
              <ul className="mt-3 flex flex-col gap-3">
                {coursework.map((c, i) => (
                  <li
                    key={i}
                    className="grid gap-2 rounded-[var(--radius-control)] border border-line p-3 sm:grid-cols-[1fr_1.4fr_90px_2fr_auto]"
                  >
                    <input
                      className="field"
                      placeholder="Subject"
                      value={c.subject}
                      onChange={(e) =>
                        setCoursework(
                          coursework.map((x, j) =>
                            j === i ? { ...x, subject: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <input
                      className="field"
                      placeholder="Course"
                      value={c.course}
                      onChange={(e) =>
                        setCoursework(
                          coursework.map((x, j) =>
                            j === i ? { ...x, course: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <input
                      className="field"
                      placeholder="Grade"
                      value={c.grade_level}
                      onChange={(e) =>
                        setCoursework(
                          coursework.map((x, j) =>
                            j === i ? { ...x, grade_level: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <input
                      className="field"
                      placeholder="Why it's relevant"
                      value={c.relevance}
                      onChange={(e) =>
                        setCoursework(
                          coursework.map((x, j) =>
                            j === i ? { ...x, relevance: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setCoursework(coursework.filter((_, j) => j !== i))}
                      className="text-sm text-ink-500 hover:text-ink-900"
                      aria-label="Remove course"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() =>
                  setCoursework([
                    ...coursework,
                    { subject: "", course: "", grade_level: "", relevance: "" },
                  ])
                }
                className="btn-ghost mt-3 text-sm"
              >
                Add a course
              </button>
            </section>

            <section className="grid gap-4 rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 sm:grid-cols-2">
              <h2 className="font-display text-xl font-semibold sm:col-span-2">
                Likes and dislikes
              </h2>
              <Field
                id="pf-likes"
                label="Work you like doing"
                value={likes}
                onChange={setLikes}
                textarea
                required
                hint="Hands-on, with people, with data, outdoors, quiet, fast, building, fixing, explaining…"
              />
              <Field
                id="pf-dislikes"
                label="Work you'd rather avoid"
                value={dislikes}
                onChange={setDislikes}
                textarea
              />
            </section>

            <section className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-5">
              <h2 className="font-display text-xl font-semibold">When you're available</h2>
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={summer}
                    onChange={(e) => setSummer(e.target.checked)}
                  />{" "}
                  Summer
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={schoolYear}
                    onChange={(e) => setSchoolYear(e.target.checked)}
                  />{" "}
                  During the school year
                </label>
              </div>
              <fieldset className="mt-3">
                <legend className="label">Days you can work</legend>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((d) => {
                    const on = days.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setDays(on ? days.filter((x) => x !== d) : [...days, d])}
                        className={`rounded-full border px-3 py-1.5 text-sm ${on ? "border-emerald bg-mint-tint text-green-deep" : "border-line-strong text-ink-700"}`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <Field
                id="pf-avail"
                label="Anything about your schedule we should know"
                value={availNotes}
                onChange={setAvailNotes}
                textarea
              />
            </section>

            <section className="grid gap-4 rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 sm:grid-cols-2">
              <h2 className="font-display text-xl font-semibold sm:col-span-2">Getting there</h2>
              <div>
                <label className="label" htmlFor="pf-transport">
                  How would you get to an internship?
                </label>
                <select
                  id="pf-transport"
                  className="field"
                  required
                  value={transportation}
                  onChange={(e) => setTransportation(e.target.value)}
                >
                  <option value="">Choose…</option>
                  <option value="own">I drive myself</option>
                  <option value="family">Family drives me</option>
                  <option value="transit">Bus or train</option>
                  <option value="bike_walk">Bike or walk</option>
                  <option value="needs_help">I'd need help with transportation</option>
                </select>
                <p className="mt-1 text-xs text-ink-500">
                  Honest answers help. We only match you with places you can actually get to.
                </p>
              </div>
              <div>
                <span className="label">Are you authorized to work in the U.S.?</span>
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="wa"
                      checked={workAuth === true}
                      onChange={() => setWorkAuth(true)}
                    />{" "}
                    Yes
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="wa"
                      checked={workAuth === false}
                      onChange={() => setWorkAuth(false)}
                    />{" "}
                    No / not sure
                  </label>
                </div>
                <p className="mt-1 text-xs text-ink-500">
                  Some paid internships require it. Unpaid and credit-bearing ones usually don't.
                </p>
              </div>
            </section>

            <section className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-5">
              <h2 className="font-display text-xl font-semibold">About you (optional)</h2>
              <p className="mt-1 text-sm text-ink-700">
                EXPLR uses these answers only in aggregate, to see who the internship portal reaches
                and who it misses. They are never shown to employers and never affect a match.
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="pf-gender">
                    Gender
                  </label>
                  <select
                    id="pf-gender"
                    className="field"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="">Choose…</option>
                    {["Girl / woman", "Boy / man", "Nonbinary", "Another way", PREFER_NOT].map(
                      (g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="pf-firstgen">
                    First in your family to go to college?
                  </label>
                  <select
                    id="pf-firstgen"
                    className="field"
                    value={firstGen}
                    onChange={(e) => setFirstGen(e.target.value)}
                  >
                    <option value="">Choose…</option>
                    {["Yes", "No", "Not sure", PREFER_NOT].map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <fieldset className="sm:col-span-2">
                  <legend className="label">Race or ethnicity (choose any)</legend>
                  <div className="flex flex-wrap gap-2">
                    {ETH.map((e) => {
                      const on = ethnicity.includes(e);
                      return (
                        <button
                          key={e}
                          type="button"
                          aria-pressed={on}
                          onClick={() =>
                            setEthnicity(
                              on
                                ? ethnicity.filter((x) => x !== e)
                                : e === PREFER_NOT
                                  ? [e]
                                  : [...ethnicity.filter((x) => x !== PREFER_NOT), e],
                            )
                          }
                          className={`rounded-full border px-3 py-1.5 text-sm ${on ? "border-emerald bg-mint-tint text-green-deep" : "border-line-strong text-ink-700"}`}
                        >
                          {e}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
                <Field
                  id="pf-lang"
                  label="Language spoken at home, if not English"
                  value={language}
                  onChange={setLanguage}
                />
              </div>
            </section>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={busy} className="btn-ink">
                {busy ? "Saving…" : "Save and continue"}
              </button>
              <Link to="/student" className="btn-ghost">
                Cancel
              </Link>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  textarea,
  required,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {textarea ? (
        <textarea
          id={id}
          className="field min-h-[80px]"
          required={required}
          maxLength={1000}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          className="field"
          required={required}
          maxLength={160}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}
