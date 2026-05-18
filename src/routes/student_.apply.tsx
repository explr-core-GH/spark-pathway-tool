import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { RoleGuard } from "@/components/RoleGuard";
import { INTERNSHIPS, type Internship } from "@/lib/internships-catalog";
import type { RIASECCode } from "@/lib/riasec";

export const Route = createFileRoute("/student_/apply")({
  head: () => ({ meta: [{ title: "Apply for an internship — EXPLR" }] }),
  component: () => (
    <RoleGuard requires="student">
      <ApplyPage />
    </RoleGuard>
  ),
});

type InterestMap = Record<string, "yes" | "maybe" | "no">;
type ScaleScores = Partial<Record<RIASECCode, number>>;

type Resume = {
  // contact (retained so staff can reach the student about the application)
  fullName: string;
  email: string;
  phone: string;
  address: string;
  cityStateZip: string;
  // narrative
  whyThisInternship: string;
  // education
  schoolName: string;
  schoolCity: string;
  gpa: string;
  expectedGraduation: string;
  coursework: string[];
  // featured project
  projectTitle: string;
  projectWhen: string;
  projectContext: string;
  projectDescription: string;
  // activities
  activities: Array<{ title: string; org: string; dates: string; description: string }>;
  // skills
  skillsTechnical: string[];
  skillsSoftware: string[];
  skillsHandsOn: string[];
  skillsTeamwork: string[];
  // optional
  awards: string[];
  workHistory: Array<{ title: string; org: string; dates: string; description: string }>;
};

const EMPTY_RESUME: Resume = {
  fullName: "", email: "", phone: "", address: "", cityStateZip: "",
  whyThisInternship: "",
  schoolName: "", schoolCity: "", gpa: "", expectedGraduation: "",
  coursework: [""],
  projectTitle: "", projectWhen: "", projectContext: "", projectDescription: "",
  activities: [{ title: "", org: "", dates: "", description: "" }],
  skillsTechnical: [""], skillsSoftware: [""], skillsHandsOn: [""], skillsTeamwork: [""],
  awards: [],
  workHistory: [],
};

function ApplyPage() {
  const { user, loading: authLoading } = useSession();
  const navigate = useNavigate();

  const [internships, setInternships] = useState<Internship[]>([]);
  const [interest, setInterest] = useState<InterestMap>({});
  const [hollandCode, setHollandCode] = useState<string | null>(null);
  const [scaleScores, setScaleScores] = useState<ScaleScores>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [resume, setResume] = useState<Resume>(EMPTY_RESUME);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: vis }, { data: ints }, { data: sess }] = await Promise.all([
        supabase.from("internship_visibility").select("internship_slug, visible"),
        supabase.from("internship_interest_responses").select("internship_slug, response").eq("student_id", user.id),
        supabase
          .from("assessment_sessions")
          .select("holland_code, scale_scores, completed_at")
          .eq("student_id", user.id)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      const hidden = new Set((vis ?? []).filter((r) => r.visible === false).map((r) => r.internship_slug));
      setInternships(INTERNSHIPS.filter((i) => !hidden.has(i.slug)));
      const map: InterestMap = {};
      for (const r of ints ?? []) map[r.internship_slug] = r.response as "yes" | "maybe" | "no";
      setInterest(map);
      setHollandCode(sess?.holland_code ?? null);
      setScaleScores((sess?.scale_scores as ScaleScores) ?? {});
      // prefill email from auth
      setResume((prev) => ({ ...prev, email: user.email ?? "" }));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Ranked list — interest first (yes > maybe > unanswered > no),
  // tie-broken by RIASEC match score against student scale_scores
  // (falls back to holland_code overlap if scores are missing).
  const ranked = useMemo(() => {
    const interestWeight = (slug: string) => {
      const r = interest[slug];
      if (r === "yes") return 3;
      if (r === "maybe") return 2;
      if (r === "no") return 0;
      return 1;
    };
    const riasecScore = (i: Internship) => {
      if (Object.keys(scaleScores).length > 0) {
        return i.riasec.reduce((s, c) => s + (scaleScores[c] ?? 0), 0);
      }
      if (hollandCode) {
        const codes = hollandCode.split("");
        return i.riasec.reduce(
          (s, c) => s + (codes.includes(c) ? (3 - codes.indexOf(c)) : 0),
          0,
        );
      }
      return 0;
    };
    return [...internships].sort((a, b) => {
      const iw = interestWeight(b.slug) - interestWeight(a.slug);
      if (iw !== 0) return iw;
      return riasecScore(b) - riasecScore(a);
    });
  }, [internships, interest, scaleScores, hollandCode]);

  function toggleSelected(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!user) return;
    if (selected.size === 0) {
      setError("Pick at least one internship to apply to.");
      return;
    }
    if (!resume.fullName.trim() || !resume.email.trim()) {
      setError("Full name and email are required so we can contact you.");
      return;
    }
    setSubmitting(true);
    const { error: insErr } = await supabase.from("internship_applications").insert({
      student_id: user.id,
      selected_internship_ids: Array.from(selected),
      responses: { resume, interest_snapshot: interest } as never,
      riasec_snapshot: { holland_code: hollandCode, scale_scores: scaleScores } as never,
    });
    setSubmitting(false);
    if (insErr) {
      setError(insErr.message);
      return;
    }
    navigate({ to: "/student" });
  }

  if (authLoading || loading) {
    return <main className="mx-auto max-w-3xl px-6 py-24 text-sm text-charcoal-400">Loading…</main>;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-charcoal-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link to="/student" className="text-sm tracking-tight">← Back to dashboard</Link>
          <Link to="/sign-out" className="text-sm text-charcoal-500 hover:text-ink">Sign out</Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <p className="eyebrow">Internship application</p>
        <h1 className="display mt-3">Apply</h1>
        <p className="mt-4 max-w-2xl text-charcoal-500">
          Pick the internships you want to apply to, then fill in your digital résumé.
          Your information is kept private and used only by EXPLR staff to contact you
          about your application.
        </p>

        <form onSubmit={handleSubmit} className="mt-12 space-y-16">
          {/* Internship picker — pre-sorted by interest + Holland match */}
          <section className="border-t border-charcoal-100 pt-10">
            <p className="eyebrow">Choose internships</p>
            <p className="mt-3 text-sm text-charcoal-500">
              Listed in order of fit — based on your interest survey
              {hollandCode ? <> and your Holland code <span className="font-medium text-ink">{hollandCode}</span></> : null}.
            </p>
            <ul className="mt-6 grid gap-3">
              {ranked.map((i, idx) => {
                const r = interest[i.slug];
                const tag = r === "yes" ? "Interested" : r === "maybe" ? "Maybe" : r === "no" ? "Not for me" : "Unrated";
                const checked = selected.has(i.slug);
                const why = buildWhyFits(i, r, scaleScores, hollandCode);
                return (
                  <li key={i.slug}>
                    <label className={`flex cursor-pointer items-start gap-4 border p-4 transition-colors ${checked ? "border-ink bg-charcoal-50" : "border-charcoal-100 hover:border-charcoal-300"}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelected(i.slug)}
                        className="mt-1"
                      />
                      <span className="flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="font-medium">
                            <span className="text-charcoal-400 mr-2">{idx + 1}.</span>
                            {i.emoji} {i.name}
                          </span>
                          <span className="text-xs uppercase tracking-wider text-charcoal-500">{tag}</span>
                        </span>
                        <span className="mt-1 block text-sm text-charcoal-500">{i.deliverables}</span>
                        <span className="mt-1 block text-xs text-charcoal-400">Holland fit: {i.riasec.join(" · ")}</span>
                        {why && (
                          <span className="mt-2 block text-sm italic" style={{ color: "var(--explr)" }}>
                            Why this fits you: {why}
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Resume */}
          <ResumeForm resume={resume} setResume={setResume} />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-between border-t border-charcoal-100 pt-8">
            <p className="text-sm text-charcoal-500">
              {selected.size} internship{selected.size === 1 ? "" : "s"} selected
            </p>
            <button type="submit" disabled={submitting} className="btn-ink disabled:opacity-50">
              {submitting ? "Submitting…" : "Submit application"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Resume form
// ─────────────────────────────────────────────────────────────────────────────

function ResumeForm({ resume, setResume }: { resume: Resume; setResume: React.Dispatch<React.SetStateAction<Resume>> }) {
  const u = <K extends keyof Resume>(k: K, v: Resume[K]) => setResume((p) => ({ ...p, [k]: v }));

  return (
    <>
      <Section title="Personal info" hint="So we can reach you about your application.">
        <Grid2>
          <Field label="Full name *" value={resume.fullName} onChange={(v) => u("fullName", v)} />
          <Field label="Email *" type="email" value={resume.email} onChange={(v) => u("email", v)} />
          <Field label="Phone" value={resume.phone} onChange={(v) => u("phone", v)} />
          <Field label="Street address" value={resume.address} onChange={(v) => u("address", v)} />
          <Field label="City, State ZIP" value={resume.cityStateZip} onChange={(v) => u("cityStateZip", v)} />
        </Grid2>
      </Section>

      <Section title="Why this internship" hint="3–5 sentences. What excites you about the work? What do you hope to learn or contribute?">
        <TextArea value={resume.whyThisInternship} onChange={(v) => u("whyThisInternship", v)} rows={5} />
      </Section>

      <Section title="Education">
        <Grid2>
          <Field label="High school name" value={resume.schoolName} onChange={(v) => u("schoolName", v)} />
          <Field label="City, State" value={resume.schoolCity} onChange={(v) => u("schoolCity", v)} />
          <Field label="GPA" value={resume.gpa} onChange={(v) => u("gpa", v)} />
          <Field label="Expected graduation" value={resume.expectedGraduation} onChange={(v) => u("expectedGraduation", v)} />
        </Grid2>
        <p className="mt-6 text-xs uppercase tracking-wider text-charcoal-500">Relevant coursework</p>
        <RepeatingList items={resume.coursework} onChange={(v) => u("coursework", v)} placeholder="e.g. AP Biology" />
      </Section>

      <Section title="Featured project or experience" hint="Pick the one project, role, or experience you're most proud of.">
        <Grid2>
          <Field label="Title" value={resume.projectTitle} onChange={(v) => u("projectTitle", v)} />
          <Field label="When" value={resume.projectWhen} onChange={(v) => u("projectWhen", v)} />
        </Grid2>
        <div className="mt-4">
          <Field label="Context / where this happened (optional)" value={resume.projectContext} onChange={(v) => u("projectContext", v)} />
        </div>
        <div className="mt-4">
          <TextArea value={resume.projectDescription} onChange={(v) => u("projectDescription", v)} rows={4} placeholder="What you did and what you learned. Use action verbs and include numbers when you can." />
        </div>
      </Section>

      <Section title="Activities, projects & experiences" hint="Clubs, volunteer work, sports, side projects, summer programs.">
        <RepeatingBlocks
          items={resume.activities}
          onChange={(v) => u("activities", v)}
          empty={{ title: "", org: "", dates: "", description: "" }}
          render={(item, set) => (
            <>
              <Grid2>
                <Field label="Title / role" value={item.title} onChange={(v) => set({ ...item, title: v })} />
                <Field label="Organization" value={item.org} onChange={(v) => set({ ...item, org: v })} />
              </Grid2>
              <div className="mt-3">
                <Field label="Dates" value={item.dates} onChange={(v) => set({ ...item, dates: v })} />
              </div>
              <div className="mt-3">
                <TextArea value={item.description} onChange={(v) => set({ ...item, description: v })} rows={3} placeholder="What you did / accomplished" />
              </div>
            </>
          )}
        />
      </Section>

      <Section title="Skills" hint="Be honest about your level — 'Learning' and 'Familiar with' are fine.">
        <SkillGroup label="Technical & engineering" items={resume.skillsTechnical} onChange={(v) => u("skillsTechnical", v)} />
        <SkillGroup label="Software & tools" items={resume.skillsSoftware} onChange={(v) => u("skillsSoftware", v)} />
        <SkillGroup label="Lab & hands-on" items={resume.skillsHandsOn} onChange={(v) => u("skillsHandsOn", v)} />
        <SkillGroup label="Teamwork & communication" items={resume.skillsTeamwork} onChange={(v) => u("skillsTeamwork", v)} />
      </Section>

      <Section title="Awards & honors (optional)">
        <RepeatingList items={resume.awards} onChange={(v) => u("awards", v)} placeholder="e.g. Honor Roll, 2024" />
      </Section>

      <Section title="Work & volunteer experience (optional)" hint="Paid jobs, regular volunteering, tutoring, babysitting — anything where you showed up consistently.">
        <RepeatingBlocks
          items={resume.workHistory}
          onChange={(v) => u("workHistory", v)}
          empty={{ title: "", org: "", dates: "", description: "" }}
          render={(item, set) => (
            <>
              <Grid2>
                <Field label="Title / role" value={item.title} onChange={(v) => set({ ...item, title: v })} />
                <Field label="Organization" value={item.org} onChange={(v) => set({ ...item, org: v })} />
              </Grid2>
              <div className="mt-3">
                <Field label="Dates" value={item.dates} onChange={(v) => set({ ...item, dates: v })} />
              </div>
              <div className="mt-3">
                <TextArea value={item.description} onChange={(v) => set({ ...item, description: v })} rows={3} placeholder="What you did" />
              </div>
            </>
          )}
        />
      </Section>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small input primitives
// ─────────────────────────────────────────────────────────────────────────────

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-charcoal-100 pt-10">
      <h2 className="text-xl font-light">{title}</h2>
      {hint && <p className="mt-2 max-w-2xl text-sm text-charcoal-500">{hint}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-charcoal-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={500}
        className="mt-1 w-full border border-charcoal-200 bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none"
      />
    </label>
  );
}

function TextArea({ value, onChange, rows = 4, placeholder }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      maxLength={4000}
      className="w-full border border-charcoal-200 bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none"
    />
  );
}

function RepeatingList({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  return (
    <div className="space-y-2">
      {items.map((it, idx) => (
        <div key={idx} className="flex gap-2">
          <input
            value={it}
            onChange={(e) => {
              const next = [...items]; next[idx] = e.target.value; onChange(next);
            }}
            placeholder={placeholder}
            maxLength={300}
            className="flex-1 border border-charcoal-200 bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none"
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, i) => i !== idx))}
            className="px-3 text-sm text-charcoal-400 hover:text-ink"
            aria-label="Remove"
          >×</button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="text-sm text-charcoal-500 hover:text-ink"
      >+ Add</button>
    </div>
  );
}

function RepeatingBlocks<T>({
  items, onChange, empty, render,
}: {
  items: T[];
  onChange: (v: T[]) => void;
  empty: T;
  render: (item: T, set: (v: T) => void) => React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      {items.map((item, idx) => (
        <div key={idx} className="border border-charcoal-100 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-charcoal-500">#{idx + 1}</span>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
              className="text-xs text-charcoal-400 hover:text-ink"
            >Remove</button>
          </div>
          {render(item, (next) => {
            const arr = [...items]; arr[idx] = next; onChange(arr);
          })}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, empty])}
        className="text-sm text-charcoal-500 hover:text-ink"
      >+ Add</button>
    </div>
  );
}

function SkillGroup({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="mt-6 first:mt-0">
      <p className="text-xs uppercase tracking-wider text-charcoal-500">{label}</p>
      <div className="mt-2"><RepeatingList items={items} onChange={onChange} placeholder="Skill" /></div>
    </div>
  );
}
