import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RosterDataPanel } from "@/components/RosterDataPanel";
import { loadInternshipRefs } from "@/lib/internship-refs";

export const Route = createFileRoute("/instructor/admin/completion")({
  head: () => ({ meta: [{ title: "Completion by roster — Admin" }] }),
  component: CompletionByRoster,
});

type Camp = { id: string; title: string; date: string | null };
type Login = { explr_camp_id: string; student_id: string | null; child_name: string };
type Internship = { slug: string; name: string };
type IntLogin = { internship_slug: string; student_id: string | null; child_name: string };

type Stats = {
  key: string;
  kind: "camp" | "internship";
  title: string;
  date: string | null;
  total: number;
  assessmentDone: number;
  surveysDone: number;
  studentIds: string[];
  names: Record<string, string>;
};

function CompletionByRoster() {
  const [camps, setCamps] = useState<Camp[]>([]);
  const [logins, setLogins] = useState<Login[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [intLogins, setIntLogins] = useState<IntLogin[]>([]);
  const [doneSessions, setDoneSessions] = useState<Set<string>>(new Set());
  const [studentsWithSurvey, setStudentsWithSurvey] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | "camp" | "internship">("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      const [
        { data: cs, error: cErr },
        { data: lg, error: lErr },
        refs,
        { data: pl, error: pErr },
      ] = await Promise.all([
        supabase.from("explr_camps").select("id, title, date").order("date", { ascending: true }),
        supabase.from("camp_student_logins").select("explr_camp_id, student_id, child_name"),
        loadInternshipRefs({ includeUnapproved: true }),
        supabase.from("internship_placements").select("approved_internship_id, student_id"),
      ]);
      if (cErr || lErr || pErr) {
        setErr((cErr ?? lErr ?? pErr)!.message);
        setLoading(false);
        return;
      }
      setCamps((cs ?? []) as Camp[]);
      const loginRows = (lg ?? []) as Login[];
      setLogins(loginRows);
      setInternships([...refs.values()].map((r) => ({ slug: r.ref, name: r.name })));
      // Placed interns, with first names from the students table.
      const placements = (pl ?? []) as Array<{
        approved_internship_id: string;
        student_id: string;
      }>;
      const placedIds = [...new Set(placements.map((p) => p.student_id))];
      const firstName: Record<string, string> = {};
      if (placedIds.length > 0) {
        const { data: studs } = await supabase
          .from("students")
          .select("id, first_name")
          .in("id", placedIds);
        for (const st of (studs ?? []) as Array<{ id: string; first_name: string | null }>)
          firstName[st.id] = st.first_name ?? "Student";
      }
      const intLoginRows: IntLogin[] = placements.map((p) => ({
        internship_slug: p.approved_internship_id,
        student_id: p.student_id,
        child_name: firstName[p.student_id] ?? "Student",
      }));
      setIntLogins(intLoginRows);

      const ids = Array.from(
        new Set(
          [...loginRows, ...intLoginRows].map((l) => l.student_id).filter((x): x is string => !!x),
        ),
      );
      if (ids.length > 0) {
        const [{ data: sess }, { data: surv }] = await Promise.all([
          supabase
            .from("assessment_sessions")
            .select("student_id, completed_at")
            .in("student_id", ids)
            .not("completed_at", "is", null),
          supabase
            .from("survey_responses")
            .select("student_id, completed_at")
            .in("student_id", ids)
            .not("completed_at", "is", null),
        ]);
        setDoneSessions(
          new Set(((sess ?? []) as { student_id: string }[]).map((r) => r.student_id)),
        );
        setStudentsWithSurvey(
          new Set(((surv ?? []) as { student_id: string }[]).map((r) => r.student_id)),
        );
      }
      setLoading(false);
    })();
  }, []);

  const stats = useMemo<Stats[]>(() => {
    const out: Stats[] = [];

    const byCamp = new Map<string, Login[]>();
    for (const l of logins) {
      if (!l.student_id) continue;
      const arr = byCamp.get(l.explr_camp_id) ?? [];
      arr.push(l);
      byCamp.set(l.explr_camp_id, arr);
    }
    for (const c of camps) {
      const rows = byCamp.get(c.id) ?? [];
      const studentIds = rows.map((r) => r.student_id as string);
      const names = Object.fromEntries(rows.map((r) => [r.student_id as string, r.child_name]));
      out.push({
        key: `camp:${c.id}`,
        kind: "camp",
        title: c.title,
        date: c.date,
        total: studentIds.length,
        assessmentDone: studentIds.filter((id) => doneSessions.has(id)).length,
        surveysDone: studentIds.filter((id) => studentsWithSurvey.has(id)).length,
        studentIds,
        names,
      });
    }

    const byInt = new Map<string, IntLogin[]>();
    for (const l of intLogins) {
      if (!l.student_id) continue;
      const arr = byInt.get(l.internship_slug) ?? [];
      arr.push(l);
      byInt.set(l.internship_slug, arr);
    }
    for (const i of internships) {
      const rows = byInt.get(i.slug) ?? [];
      const studentIds = rows.map((r) => r.student_id as string);
      const names = Object.fromEntries(rows.map((r) => [r.student_id as string, r.child_name]));
      out.push({
        key: `int:${i.slug}`,
        kind: "internship",
        title: i.name,
        date: null,
        total: studentIds.length,
        assessmentDone: studentIds.filter((id) => doneSessions.has(id)).length,
        surveysDone: studentIds.filter((id) => studentsWithSurvey.has(id)).length,
        studentIds,
        names,
      });
    }

    return out;
  }, [camps, logins, internships, intLogins, doneSessions, studentsWithSurvey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let visible = stats.filter((s) => s.total > 0);
    if (kindFilter !== "all") visible = visible.filter((s) => s.kind === kindFilter);
    if (!q) return visible;
    return visible.filter((s) => s.title.toLowerCase().includes(q));
  }, [stats, query, kindFilter]);

  const totals = useMemo(() => {
    const t = filtered.reduce(
      (acc, s) => {
        acc.total += s.total;
        acc.assessmentDone += s.assessmentDone;
        acc.surveysDone += s.surveysDone;
        return acc;
      },
      { total: 0, assessmentDone: 0, surveysDone: 0 },
    );
    return t;
  }, [filtered]);

  return (
    <main className="mx-auto max-w-[1312px] px-4 py-10 sm:px-6 lg:px-8">
      <p className="eyebrow">Admin</p>
      <h1 className="display mt-2">Completion by roster</h1>
      <p className="lead mt-3 max-w-2xl">
        Assessment and survey completion grouped by camp or internship roster. Click a row to see
        per-student results and timing.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <input
          className="field max-w-sm"
          placeholder="Filter rosters…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {(["all", "camp", "internship"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKindFilter(k)}
              className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm font-medium ${kindFilter === k ? "border-ink-900 bg-ink-900 text-paper" : "border-line-strong text-ink-700 hover:border-ink-900 hover:text-ink-900"}`}
            >
              {k === "all" ? "All" : k === "camp" ? "Camps" : "Internships"}
            </button>
          ))}
        </div>
        <span className="text-sm text-ink-500">
          {filtered.length} roster{filtered.length === 1 ? "" : "s"} · {totals.assessmentDone}/
          {totals.total} assessment · {totals.surveysDone}/{totals.total} survey
        </span>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-ink-500">Loading…</p>
      ) : err ? (
        <p className="mt-8 text-sm text-red-700">Error: {err}</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-sm text-ink-500">No rosters with students yet.</p>
      ) : (
        <div className="mt-6 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-paper-raised">
          {filtered.map((s) => {
            const isOpen = open === s.key;
            const aPct = s.total ? Math.round((s.assessmentDone / s.total) * 100) : 0;
            const sPct = s.total ? Math.round((s.surveysDone / s.total) * 100) : 0;
            return (
              <div key={s.key}>
                <button
                  onClick={() => setOpen(isOpen ? null : s.key)}
                  aria-expanded={isOpen}
                  className="flex w-full flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-4 text-left text-sm hover:bg-paper-sunken md:grid md:grid-cols-[1fr_120px_140px_140px_60px]"
                >
                  <span className="w-full md:w-auto">
                    <span className="mr-2 rounded-full bg-paper-sunken px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-700">
                      {s.kind === "camp" ? "Camp" : "Internship"}
                    </span>
                    <span className="font-medium">{s.title}</span>
                    {s.date && <span className="ml-2 text-xs text-ink-500">{s.date}</span>}
                  </span>
                  <span className="text-xs text-ink-500 tabular-nums">
                    {s.total} student{s.total === 1 ? "" : "s"}
                  </span>
                  <span className="tabular-nums">
                    <span className="font-medium">
                      {s.assessmentDone}/{s.total}
                    </span>{" "}
                    <span className="text-xs text-ink-500">assessment ({aPct}%)</span>
                  </span>
                  <span className="tabular-nums">
                    <span className="font-medium">
                      {s.surveysDone}/{s.total}
                    </span>{" "}
                    <span className="text-xs text-ink-500">survey ({sPct}%)</span>
                  </span>
                  <span className="text-xs font-medium text-green-deep md:text-right">
                    {isOpen ? "Hide" : "View"}
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-line bg-paper-sunken px-4 py-4">
                    <RosterDataPanel studentIds={s.studentIds} names={s.names} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
