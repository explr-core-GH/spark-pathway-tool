import type React from "react";

/**
 * ResumeForm — the student's digital résumé, shared by the internship apply
 * flow (stage 2). Extracted so the selection page and the completion page can
 * both use the same shape.
 */

export type Resume = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  cityStateZip: string;
  whyThisInternship: string;
  schoolName: string;
  schoolCity: string;
  gpa: string;
  expectedGraduation: string;
  coursework: string[];
  projectTitle: string;
  projectWhen: string;
  projectContext: string;
  projectDescription: string;
  activities: Array<{ title: string; org: string; dates: string; description: string }>;
  skillsTechnical: string[];
  skillsSoftware: string[];
  skillsHandsOn: string[];
  skillsTeamwork: string[];
  awards: string[];
  workHistory: Array<{ title: string; org: string; dates: string; description: string }>;
};

export const EMPTY_RESUME: Resume = {
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

export function ResumeForm({
  resume,
  setResume,
}: {
  resume: Resume;
  setResume: React.Dispatch<React.SetStateAction<Resume>>;
}) {
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

      <Section title="Why these internships" hint="3–5 sentences. What excites you about the work? What do you hope to learn or contribute?">
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
