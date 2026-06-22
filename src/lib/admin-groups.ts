import { supabase } from "@/integrations/supabase/client";

/**
 * admin-groups — the data layer behind the entity-first admin
 * (/educator/admin/groups/<kind>). A "group" is a rostered cohort the admin
 * works with: a camp session, an internship, or a teacher's class. Each kind
 * resolves to the same shape — a name, a small meta line, and the roster as
 * studentIds + names — so the card grid and the per-group workspace (and the
 * shared RosterDataPanel) don't need to know which kind they're showing.
 *
 * `classes` / `class_students` are newer than the generated Supabase types,
 * so those reads go through the untyped `sb()` cast. Callers should catch
 * errors from the classes kind (the migration may not be applied yet).
 */

const sb = (table: string): any =>
  (supabase.from as unknown as (n: string) => any)(table);

export type GroupKind = "camps" | "internships" | "classes";
export const GROUP_KINDS: GroupKind[] = ["camps", "internships", "classes"];

export function isGroupKind(x: string): x is GroupKind {
  return (GROUP_KINDS as string[]).includes(x);
}

export type KindMeta = {
  label: string; // plural — nav + page header
  singular: string;
  /** Inline-create button label, or null when groups are created elsewhere. */
  newLabel: string | null;
  /** Where the admin goes to create one when there's no inline create. */
  createHint: { to: string; label: string } | null;
};

export const KIND_META: Record<GroupKind, KindMeta> = {
  camps: {
    label: "Camps",
    singular: "Camp",
    newLabel: null,
    createHint: { to: "/educator/admin/camp-logins", label: "Add camps & logins" },
  },
  internships: {
    label: "Internships",
    singular: "Internship",
    newLabel: null,
    createHint: { to: "/educator/admin/internships", label: "Edit offerings" },
  },
  classes: {
    label: "Classes",
    singular: "Class",
    newLabel: "New class",
    createHint: null,
  },
};

export type GroupSummary = {
  /** camp id · internship slug · class id */
  id: string;
  name: string;
  /** small subtitle: dates, theme, grade/teacher */
  meta: string;
  studentIds: string[];
  names: Record<string, string>;
  extra?: Record<string, unknown>;
};

export type Completion = {
  assessmentDone: Set<string>;
  surveyDone: Set<string>;
  /** student_id → most-recent Holland code */
  holland: Map<string, string>;
};

const EMPTY_COMPLETION: Completion = {
  assessmentDone: new Set(),
  surveyDone: new Set(),
  holland: new Map(),
};

/** Assessment + survey completion (and latest Holland code) for a set of students. */
export async function fetchCompletion(studentIds: string[]): Promise<Completion> {
  const ids = [...new Set(studentIds)];
  if (ids.length === 0) return EMPTY_COMPLETION;

  const [{ data: sess }, { data: surv }] = await Promise.all([
    supabase
      .from("assessment_sessions")
      .select("student_id, completed_at, holland_code")
      .in("student_id", ids)
      .order("started_at", { ascending: false }),
    supabase
      .from("survey_responses")
      .select("student_id, completed_at")
      .in("student_id", ids)
      .not("completed_at", "is", null),
  ]);

  const assessmentDone = new Set<string>();
  const holland = new Map<string, string>();
  for (const r of (sess ?? []) as Array<{
    student_id: string;
    completed_at: string | null;
    holland_code: string | null;
  }>) {
    if (r.completed_at) assessmentDone.add(r.student_id);
    if (r.holland_code && !holland.has(r.student_id)) holland.set(r.student_id, r.holland_code);
  }
  const surveyDone = new Set<string>(
    ((surv ?? []) as Array<{ student_id: string }>).map((r) => r.student_id),
  );
  return { assessmentDone, surveyDone, holland };
}

export async function fetchGroups(kind: GroupKind): Promise<GroupSummary[]> {
  if (kind === "camps") return fetchCampGroups();
  if (kind === "internships") return fetchInternshipGroups();
  return fetchClassGroups();
}

export async function fetchGroup(kind: GroupKind, id: string): Promise<GroupSummary | null> {
  const all = await fetchGroups(kind);
  return all.find((g) => g.id === id) ?? null;
}

async function fetchCampGroups(): Promise<GroupSummary[]> {
  const [{ data: camps }, { data: logins }] = await Promise.all([
    supabase
      .from("explr_camps")
      .select("id, title, date, end_date, age_range")
      .order("date", { ascending: true }),
    supabase.from("camp_student_logins").select("explr_camp_id, student_id, child_name"),
  ]);

  const byCamp = new Map<string, { ids: string[]; names: Record<string, string> }>();
  for (const l of (logins ?? []) as Array<{
    explr_camp_id: string | null;
    student_id: string | null;
    child_name: string;
  }>) {
    if (!l.explr_camp_id || !l.student_id) continue;
    const e = byCamp.get(l.explr_camp_id) ?? { ids: [], names: {} };
    e.ids.push(l.student_id);
    e.names[l.student_id] = l.child_name;
    byCamp.set(l.explr_camp_id, e);
  }

  const out: GroupSummary[] = [];
  for (const c of (camps ?? []) as Array<{
    id: string;
    title: string;
    date: string | null;
    end_date: string | null;
    age_range: string | null;
  }>) {
    const e = byCamp.get(c.id);
    if (!e || e.ids.length === 0) continue; // only rostered camp sessions
    const dates = [c.date, c.end_date].filter(Boolean).join(" – ");
    out.push({
      id: c.id,
      name: c.title,
      meta: [dates, c.age_range].filter(Boolean).join(" · "),
      studentIds: e.ids,
      names: e.names,
    });
  }
  return out;
}

async function fetchInternshipGroups(): Promise<GroupSummary[]> {
  const [{ data: list }, { data: places }] = await Promise.all([
    supabase
      .from("internships")
      .select("slug, name, theme, riasec, sort_order")
      .order("sort_order")
      .order("name"),
    supabase.from("internship_placements").select("approved_internship_id, student_id"),
  ]);

  const placeRows = (places ?? []) as Array<{
    approved_internship_id: string;
    student_id: string;
  }>;
  const bySlug = new Map<string, string[]>();
  for (const p of placeRows) {
    const arr = bySlug.get(p.approved_internship_id) ?? [];
    arr.push(p.student_id);
    bySlug.set(p.approved_internship_id, arr);
  }

  const allIds = [...new Set(placeRows.map((p) => p.student_id))];
  const names: Record<string, string> = {};
  if (allIds.length) {
    const { data: studs } = await supabase
      .from("students")
      .select("id, first_name")
      .in("id", allIds);
    for (const s of (studs ?? []) as Array<{ id: string; first_name: string | null }>) {
      names[s.id] = s.first_name ?? "Student";
    }
  }

  return ((list ?? []) as Array<{
    slug: string;
    name: string;
    theme: string | null;
    riasec: string[] | null;
  }>).map((i) => {
    const ids = bySlug.get(i.slug) ?? [];
    return {
      id: i.slug,
      name: i.name,
      meta: [i.theme, (i.riasec ?? []).join("")].filter(Boolean).join(" · "),
      studentIds: ids,
      names: Object.fromEntries(ids.map((id) => [id, names[id] ?? "Student"])),
    };
  });
}

async function fetchClassGroups(): Promise<GroupSummary[]> {
  const { data: classes, error } = await sb("classes")
    .select("id, name, grade, period, educator_id")
    .order("name");
  if (error) throw error;

  const cls = (classes ?? []) as Array<{
    id: string;
    name: string;
    grade: number | null;
    period: string | null;
    educator_id: string | null;
  }>;
  if (cls.length === 0) return [];

  const { data: members } = await sb("class_students")
    .select("class_id, student_id")
    .in("class_id", cls.map((c) => c.id));
  const mem = (members ?? []) as Array<{ class_id: string; student_id: string }>;

  const studentIds = [...new Set(mem.map((m) => m.student_id))];
  const eduIds = [...new Set(cls.map((c) => c.educator_id).filter(Boolean))] as string[];
  const [studsRes, eduRes] = await Promise.all([
    studentIds.length
      ? supabase.from("students").select("id, first_name").in("id", studentIds)
      : Promise.resolve({ data: [] as Array<{ id: string; first_name: string | null }> }),
    eduIds.length
      ? supabase.from("educators").select("id, full_name").in("id", eduIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null }> }),
  ]);

  const sName: Record<string, string> = {};
  for (const s of (studsRes.data ?? []) as Array<{ id: string; first_name: string | null }>) {
    sName[s.id] = s.first_name ?? "Student";
  }
  const eName: Record<string, string> = {};
  for (const e of (eduRes.data ?? []) as Array<{ id: string; full_name: string | null }>) {
    eName[e.id] = e.full_name ?? "";
  }

  const byClass = new Map<string, string[]>();
  for (const m of mem) {
    const a = byClass.get(m.class_id) ?? [];
    a.push(m.student_id);
    byClass.set(m.class_id, a);
  }

  return cls.map((c) => {
    const ids = byClass.get(c.id) ?? [];
    const metaParts = [
      c.grade != null ? `Grade ${c.grade}` : null,
      c.educator_id ? eName[c.educator_id] || null : null,
      c.period,
    ].filter(Boolean) as string[];
    return {
      id: c.id,
      name: c.name,
      meta: metaParts.join(" · "),
      studentIds: ids,
      names: Object.fromEntries(ids.map((id) => [id, sName[id] ?? "Student"])),
      extra: { educator_id: c.educator_id, grade: c.grade, period: c.period },
    };
  });
}

const RIASEC_LETTERS = ["R", "I", "A", "S", "E", "C"] as const;
export const RIASEC_LABEL: Record<string, string> = {
  R: "Realistic",
  I: "Investigative",
  A: "Artistic",
  S: "Social",
  E: "Enterprising",
  C: "Conventional",
};

/**
 * Dominant-interest mix for a roster: the share of students whose top
 * (first-letter) Holland code is each letter. Returns only letters that
 * appear, sorted most-common first.
 */
export function hollandMix(
  studentIds: string[],
  holland: Map<string, string>,
): Array<{ letter: string; label: string; count: number; pct: number }> {
  const counts = new Map<string, number>();
  let scored = 0;
  for (const id of studentIds) {
    const code = holland.get(id);
    if (!code) continue;
    const top = code[0]?.toUpperCase();
    if (!top || !RIASEC_LETTERS.includes(top as (typeof RIASEC_LETTERS)[number])) continue;
    counts.set(top, (counts.get(top) ?? 0) + 1);
    scored += 1;
  }
  if (scored === 0) return [];
  return [...counts.entries()]
    .map(([letter, count]) => ({
      letter,
      label: RIASEC_LABEL[letter] ?? letter,
      count,
      pct: Math.round((count / scored) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}
