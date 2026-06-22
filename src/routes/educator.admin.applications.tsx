import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { INTERNSHIPS } from "@/lib/internships-catalog";
import { isOppSlug, oppIdFromSlug } from "@/lib/opportunities";

const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);

export const Route = createFileRoute("/educator/admin/applications")({
  head: () => ({ meta: [{ title: "Internship applications — Admin" }] }),
  component: ApplicationsPage,
});

type Resume = {
  fullName?: string; email?: string; phone?: string; address?: string; cityStateZip?: string;
  whyThisInternship?: string;
  schoolName?: string; schoolCity?: string; gpa?: string; expectedGraduation?: string;
  coursework?: string[];
  projectTitle?: string; projectWhen?: string; projectContext?: string; projectDescription?: string;
  activities?: Array<{ title?: string; org?: string; dates?: string; description?: string }>;
  skillsTechnical?: string[]; skillsSoftware?: string[]; skillsHandsOn?: string[]; skillsTeamwork?: string[];
  awards?: string[];
  workHistory?: Array<{ title?: string; org?: string; dates?: string; description?: string }>;
};

type Responses = { resume?: Resume; interest_snapshot?: Record<string, string> };
type Riasec = { holland_code?: string; scale_scores?: Record<string, number> };

type Application = {
  id: string;
  student_id: string;
  selected_internship_ids: string[];
  responses: Responses | null;
  riasec_snapshot: Riasec | null;
  submission_term: string;
  status: string;
  staff_notes: string | null;
  submitted_at: string;
  decided_at: string | null;
};

type Student = { id: string; first_name: string | null; grade: number | null };
type StatusFilter = "all" | "submitted" | "approved" | "rejected";

const SLUG_TO_NAME: Record<string, string> = Object.fromEntries(
  INTERNSHIPS.map((i) => [i.slug, i.name]),
);
const SLUG_TO_EMOJI: Record<string, string> = Object.fromEntries(
  INTERNSHIPS.map((i) => [i.slug, i.emoji]),
);

// Org-created internships apply with synthetic `opp:<id>` slugs; resolve their
// names from the opportunities table (populated on load).
const OPP_NAMES: Record<string, string> = {};
function nameFor(slug: string): string {
  if (isOppSlug(slug)) return OPP_NAMES[oppIdFromSlug(slug)] ?? "Partner internship";
  return SLUG_TO_NAME[slug] ?? slug;
}
function emojiFor(slug: string): string {
  if (isOppSlug(slug)) return "💼";
  return SLUG_TO_EMOJI[slug] ?? "•";
}

const RIASEC_LETTERS = ["R", "I", "A", "S", "E", "C"] as const;
const RIASEC_LABEL: Record<string, string> = {
  R: "Realistic", I: "Investigative", A: "Artistic", S: "Social", E: "Enterprising", C: "Conventional",
};

function initials(name?: string | null) {
  if (!name) return "—";
  return name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function statusStyle(status: string) {
  if (status === "approved") return { label: "Approved", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
  if (status === "rejected") return { label: "Rejected", className: "bg-rose-50 text-rose-700 border border-rose-200" };
  return { label: "Pending", className: "bg-amber-50 text-amber-700 border border-amber-200" };
}

function ApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [students, setStudents] = useState<Record<string, Student>>({});
  const [selected, setSelected] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  async function refresh() {
    setLoading(true);
    const { data: appRows } = await supabase
      .from("internship_applications")
      .select("*")
      .order("submitted_at", { ascending: false });
    const list = (appRows as Application[]) ?? [];
    setApps(list);

    // Resolve names for any org-created internships referenced in these apps.
    const oppIds = [
      ...new Set(
        list.flatMap((a) => a.selected_internship_ids).filter(isOppSlug).map(oppIdFromSlug),
      ),
    ];
    if (oppIds.length) {
      const { data: oppRows } = await sb("opportunities").select("id, name").in("id", oppIds);
      for (const o of (oppRows as Array<{ id: string; name: string | null }>) ?? [])
        OPP_NAMES[o.id] = o.name ?? "Partner internship";
    }

    const ids = Array.from(new Set(list.map((a) => a.student_id)));
    if (ids.length) {
      const { data: studs } = await supabase
        .from("students")
        .select("id, first_name, grade")
        .in("id", ids);
      const map: Record<string, Student> = {};
      ((studs as Student[]) ?? []).forEach((s) => (map[s.id] = s));
      setStudents(map);
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { submitted: 0, approved: 0, rejected: 0 };
    apps.forEach((a) => (c[a.status] = (c[a.status] ?? 0) + 1));
    return c;
  }, [apps]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return apps.filter((a) => {
      if (filter !== "all" && a.status !== filter) return false;
      if (!q) return true;
      const s = students[a.student_id];
      const name = s?.first_name?.toLowerCase() ?? "";
      const internships = a.selected_internship_ids
        .map((id) => nameFor(id).toLowerCase())
        .join(" ");
      return name.includes(q) || internships.includes(q);
    });
  }, [apps, students, filter, search]);

  async function setStatus(app: Application, status: "approved" | "rejected", placementSlug?: string) {
    const { error: upErr } = await supabase
      .from("internship_applications")
      .update({ status, decided_at: new Date().toISOString() })
      .eq("id", app.id);
    if (upErr) return alert(upErr.message);

    if (status === "approved" && placementSlug) {
      const { error: pErr } = await supabase.from("internship_placements").insert({
        application_id: app.id,
        student_id: app.student_id,
        approved_internship_id: placementSlug,
        staff_notes: app.staff_notes,
      });
      if (pErr) return alert(pErr.message);
    }
    setSelected(null);
    refresh();
  }

  async function saveNotes(app: Application, notes: string) {
    const { error } = await supabase
      .from("internship_applications")
      .update({ staff_notes: notes })
      .eq("id", app.id);
    if (error) return alert(error.message);
    setApps((prev) => prev.map((a) => (a.id === app.id ? { ...a, staff_notes: notes } : a)));
    setSelected((s) => (s && s.id === app.id ? { ...s, staff_notes: notes } : s));
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <p className="eyebrow">Admin</p>
      <h1 className="mt-2 text-4xl font-light">Internship applications</h1>
      <p className="mt-2 text-sm text-charcoal-500">
        Review submissions, place students into internships, and keep notes for the team.
      </p>

      {/* Filter chips */}
      <div className="mt-8 flex flex-wrap items-center gap-2">
        {([
          { id: "all", label: "All", count: apps.length },
          { id: "submitted", label: "Pending", count: counts.submitted ?? 0 },
          { id: "approved", label: "Approved", count: counts.approved ?? 0 },
          { id: "rejected", label: "Rejected", count: counts.rejected ?? 0 },
        ] as Array<{ id: StatusFilter; label: string; count: number }>).map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: active ? "var(--ink)" : "transparent",
                color: active ? "white" : "var(--color-charcoal-600)",
                border: `1px solid ${active ? "var(--ink)" : "var(--color-charcoal-200)"}`,
              }}
            >
              {f.label} <span className="ml-1 opacity-70">{f.count}</span>
            </button>
          );
        })}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search student or internship…"
          className="ml-auto w-64 rounded-full border border-charcoal-200 bg-white px-4 py-1.5 text-sm placeholder:text-charcoal-400 focus:border-charcoal-400 focus:outline-none"
        />
      </div>

      {/* Cards */}
      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        {loading ? (
          <p className="text-sm text-charcoal-400">Loading…</p>
        ) : visible.length === 0 ? (
          <div className="col-span-full rounded-lg border border-dashed border-charcoal-200 bg-white p-10 text-center">
            <p className="text-sm text-charcoal-500">
              {apps.length === 0 ? "No applications submitted yet." : "No applications match this filter."}
            </p>
          </div>
        ) : (
          visible.map((a) => {
            const s = students[a.student_id];
            const st = statusStyle(a.status);
            const top = a.selected_internship_ids.slice(0, 3);
            const extra = a.selected_internship_ids.length - top.length;
            return (
              <button
                key={a.id}
                onClick={() => setSelected(a)}
                className="group flex flex-col rounded-lg border border-charcoal-100 bg-white p-5 text-left transition-shadow hover:border-charcoal-300 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-charcoal-100 text-sm font-medium text-charcoal-600">
                    {initials(s?.first_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-medium">{s?.first_name ?? "Unknown student"}</p>
                    <p className="text-xs text-charcoal-500">
                      Grade {s?.grade ?? "—"} · {new Date(a.submitted_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${st.className}`}>
                    {st.label}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {top.map((id) => (
                    <span key={id} className="inline-flex items-center gap-1 rounded-full bg-charcoal-50 px-2.5 py-1 text-xs text-charcoal-700">
                      <span>{emojiFor(id)}</span>
                      <span className="truncate max-w-[160px]">{nameFor(id)}</span>
                    </span>
                  ))}
                  {extra > 0 && (
                    <span className="rounded-full bg-charcoal-50 px-2.5 py-1 text-xs text-charcoal-500">
                      +{extra} more
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {selected && (
        <ApplicationDetail
          app={selected}
          student={students[selected.student_id]}
          onClose={() => setSelected(null)}
          onApprove={(slug) => setStatus(selected, "approved", slug)}
          onReject={() => setStatus(selected, "rejected")}
          onSaveNotes={(notes) => saveNotes(selected, notes)}
        />
      )}
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="text-xs uppercase tracking-wider text-charcoal-400">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-charcoal-400">{label}</p>
      <p className="mt-0.5 text-sm text-charcoal-700">{value}</p>
    </div>
  );
}

function Chips({ items }: { items?: string[] }) {
  const filtered = (items ?? []).map((x) => x?.trim()).filter(Boolean);
  if (filtered.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {filtered.map((x, i) => (
        <span key={i} className="rounded-full bg-charcoal-50 px-2.5 py-1 text-xs text-charcoal-700">{x}</span>
      ))}
    </div>
  );
}

function ApplicationDetail({
  app, student, onClose, onApprove, onReject, onSaveNotes,
}: {
  app: Application;
  student: Student | undefined;
  onClose: () => void;
  onApprove: (slug: string) => void;
  onReject: () => void;
  onSaveNotes: (notes: string) => void;
}) {
  const [placement, setPlacement] = useState<string>(app.selected_internship_ids[0] ?? "");
  const [notes, setNotes] = useState<string>(app.staff_notes ?? "");
  const responses = (app.responses ?? {}) as Responses;
  const resume = responses.resume ?? {};
  const interest = responses.interest_snapshot ?? {};
  const riasec = (app.riasec_snapshot ?? {}) as Riasec;
  const scores = riasec.scale_scores ?? {};
  const maxScore = Math.max(1, ...RIASEC_LETTERS.map((l) => Number(scores[l] ?? scores[l.toLowerCase()] ?? 0)));
  const st = statusStyle(app.status);

  const hasCoursework = (resume.coursework ?? []).some((c) => c?.trim());
  const skillGroups: Array<[string, string[] | undefined]> = [
    ["Technical", resume.skillsTechnical],
    ["Software", resume.skillsSoftware],
    ["Hands-on", resume.skillsHandsOn],
    ["Teamwork", resume.skillsTeamwork],
  ];
  const hasSkills = skillGroups.some(([, arr]) => (arr ?? []).some((x) => x?.trim()));
  const activities = (resume.activities ?? []).filter((a) => a?.title?.trim() || a?.org?.trim() || a?.description?.trim());
  const work = (resume.workHistory ?? []).filter((a) => a?.title?.trim() || a?.org?.trim() || a?.description?.trim());

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-2xl overflow-y-auto bg-white shadow-xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-charcoal-100 bg-white/95 px-8 py-5 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-charcoal-100 text-base font-medium text-charcoal-700">
                {initials(student?.first_name)}
              </div>
              <div>
                <h2 className="text-xl font-medium leading-tight">{student?.first_name ?? "Unknown student"}</h2>
                <p className="text-xs text-charcoal-500">
                  Grade {student?.grade ?? "—"} · Submitted {new Date(app.submitted_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · {app.submission_term}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${st.className}`}>{st.label}</span>
              <button onClick={onClose} aria-label="Close" className="text-charcoal-400 hover:text-charcoal-700">✕</button>
            </div>
          </div>
        </div>

        <div className="px-8 pb-10">
          {/* Selected internships */}
          <Section title="Internships applied for">
            <ul className="space-y-1.5">
              {app.selected_internship_ids.map((id) => {
                const interestNote = interest[id];
                return (
                  <li key={id} className="flex items-start gap-2 rounded-md border border-charcoal-100 bg-charcoal-50/50 px-3 py-2 text-sm">
                    <span className="mt-0.5">{emojiFor(id)}</span>
                    <div className="flex-1">
                      <p className="font-medium text-charcoal-700">{nameFor(id)}</p>
                      {interestNote && (
                        <p className="mt-0.5 text-xs italic text-charcoal-500">"{interestNote}"</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Section>

          {/* RIASEC */}
          {(riasec.holland_code || Object.keys(scores).length > 0) && (
            <Section title="RIASEC profile">
              {riasec.holland_code && (
                <p className="mb-3 text-sm text-charcoal-600">
                  Holland code: <span className="font-mono font-medium text-charcoal-800">{riasec.holland_code}</span>
                </p>
              )}
              {Object.keys(scores).length > 0 && (
                <div className="space-y-1.5">
                  {RIASEC_LETTERS.map((letter) => {
                    const raw = Number(scores[letter] ?? scores[letter.toLowerCase()] ?? 0);
                    const pct = Math.round((raw / maxScore) * 100);
                    return (
                      <div key={letter} className="flex items-center gap-3 text-xs">
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded font-mono text-[11px] font-bold text-white"
                          style={{ background: `var(--color-riasec-${letter.toLowerCase()})` }}
                        >
                          {letter}
                        </span>
                        <span className="w-24 text-charcoal-500">{RIASEC_LABEL[letter]}</span>
                        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-charcoal-100">
                          <div
                            className="absolute inset-y-0 left-0 rounded-full"
                            style={{ width: `${pct}%`, background: `var(--color-riasec-${letter.toLowerCase()})` }}
                          />
                        </div>
                        <span className="w-10 text-right font-mono text-charcoal-500">{raw}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          )}

          {/* Contact */}
          {(resume.fullName || resume.email || resume.phone) && (
            <Section title="Contact">
              <div className="grid grid-cols-2 gap-4">
                <Detail label="Full name" value={resume.fullName} />
                <Detail label="Email" value={resume.email} />
                <Detail label="Phone" value={resume.phone} />
                <Detail label="Address" value={[resume.address, resume.cityStateZip].filter(Boolean).join(", ") || undefined} />
              </div>
            </Section>
          )}

          {/* Why */}
          {resume.whyThisInternship?.trim() && (
            <Section title="Why this internship">
              <p className="whitespace-pre-wrap rounded-md border border-charcoal-100 bg-charcoal-50/50 p-3 text-sm leading-relaxed text-charcoal-700">
                {resume.whyThisInternship}
              </p>
            </Section>
          )}

          {/* Education */}
          {(resume.schoolName || resume.gpa || resume.expectedGraduation || hasCoursework) && (
            <Section title="Education">
              <div className="grid grid-cols-2 gap-4">
                <Detail label="School" value={[resume.schoolName, resume.schoolCity].filter(Boolean).join(" · ") || undefined} />
                <Detail label="GPA" value={resume.gpa} />
                <Detail label="Expected graduation" value={resume.expectedGraduation} />
              </div>
              {hasCoursework && (
                <div className="mt-3">
                  <p className="mb-1.5 text-[11px] uppercase tracking-wider text-charcoal-400">Coursework</p>
                  <Chips items={resume.coursework} />
                </div>
              )}
            </Section>
          )}

          {/* Project */}
          {(resume.projectTitle?.trim() || resume.projectDescription?.trim()) && (
            <Section title="Featured project">
              <div className="rounded-md border border-charcoal-100 bg-charcoal-50/50 p-3">
                <p className="text-sm font-medium text-charcoal-700">{resume.projectTitle || "Untitled"}</p>
                {(resume.projectWhen || resume.projectContext) && (
                  <p className="mt-0.5 text-xs text-charcoal-500">
                    {[resume.projectWhen, resume.projectContext].filter(Boolean).join(" · ")}
                  </p>
                )}
                {resume.projectDescription && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-charcoal-700">{resume.projectDescription}</p>
                )}
              </div>
            </Section>
          )}

          {/* Skills */}
          {hasSkills && (
            <Section title="Skills">
              <div className="space-y-3">
                {skillGroups.map(([label, items]) => {
                  const filtered = (items ?? []).filter((x) => x?.trim());
                  if (filtered.length === 0) return null;
                  return (
                    <div key={label}>
                      <p className="mb-1.5 text-[11px] uppercase tracking-wider text-charcoal-400">{label}</p>
                      <Chips items={filtered} />
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Activities */}
          {activities.length > 0 && (
            <Section title="Activities">
              <ul className="space-y-3">
                {activities.map((a, i) => (
                  <li key={i} className="rounded-md border border-charcoal-100 bg-charcoal-50/50 p-3">
                    <p className="text-sm font-medium text-charcoal-700">{a.title || "—"}</p>
                    <p className="text-xs text-charcoal-500">{[a.org, a.dates].filter(Boolean).join(" · ")}</p>
                    {a.description && <p className="mt-1.5 text-sm text-charcoal-700">{a.description}</p>}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Awards */}
          {(resume.awards ?? []).some((x) => x?.trim()) && (
            <Section title="Awards">
              <Chips items={resume.awards} />
            </Section>
          )}

          {/* Work history */}
          {work.length > 0 && (
            <Section title="Work history">
              <ul className="space-y-3">
                {work.map((a, i) => (
                  <li key={i} className="rounded-md border border-charcoal-100 bg-charcoal-50/50 p-3">
                    <p className="text-sm font-medium text-charcoal-700">{a.title || "—"}</p>
                    <p className="text-xs text-charcoal-500">{[a.org, a.dates].filter(Boolean).join(" · ")}</p>
                    {a.description && <p className="mt-1.5 text-sm text-charcoal-700">{a.description}</p>}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Staff notes */}
          <Section title="Staff notes">
            <textarea
              className="h-24 w-full rounded-md border border-charcoal-200 bg-white p-3 text-sm focus:border-charcoal-400 focus:outline-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => onSaveNotes(notes)}
              placeholder="Internal notes about this candidate"
            />
          </Section>

          {/* Decision */}
          {app.status === "submitted" ? (
            <div className="mt-8 rounded-lg border border-charcoal-100 bg-charcoal-50/60 p-4">
              <p className="text-xs uppercase tracking-wider text-charcoal-400">Decision</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="text-xs text-charcoal-500">Place into</label>
                <select
                  className="rounded-md border border-charcoal-200 bg-white px-2 py-1.5 text-sm"
                  value={placement}
                  onChange={(e) => setPlacement(e.target.value)}
                >
                  {app.selected_internship_ids.map((id) => (
                    <option key={id} value={id}>{nameFor(id)}</option>
                  ))}
                </select>
                <div className="ml-auto flex gap-2">
                  <button
                    className="rounded-md border border-charcoal-200 bg-white px-4 py-2 text-sm hover:bg-charcoal-50"
                    onClick={onReject}
                  >
                    Reject
                  </button>
                  <button
                    className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    style={{ background: "var(--ink)" }}
                    disabled={!placement}
                    onClick={() => onApprove(placement)}
                  >
                    Approve & place
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-8 border-t border-charcoal-100 pt-4 text-sm text-charcoal-500">
              Decided {app.decided_at ? new Date(app.decided_at).toLocaleString() : ""} — status: <span className="font-medium">{app.status}</span>
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
