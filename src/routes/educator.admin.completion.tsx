import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RosterDataPanel } from "@/components/RosterDataPanel";

export const Route = createFileRoute("/educator/admin/completion")({
  head: () => ({ meta: [{ title: "Completion by roster — Admin" }] }),
  component: CompletionByRoster,
});

type Camp = { id: string; title: string; date: string | null };
type Login = { explr_camp_id: string; student_id: string | null; child_name: string };

type Stats = {
  campId: string;
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
  const [doneSessions, setDoneSessions] = useState<Set<string>>(new Set());
  const [studentsWithSurvey, setStudentsWithSurvey] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      const [{ data: cs, error: cErr }, { data: lg, error: lErr }] = await Promise.all([
        supabase
          .from("explr_camps")
          .select("id, title, date")
          .order("date", { ascending: true }),
        supabase
          .from("camp_student_logins")
          .select("explr_camp_id, student_id, child_name"),
      ]);
      if (cErr || lErr) {
        setErr((cErr ?? lErr)!.message);
        setLoading(false);
        return;
      }
      setCamps((cs ?? []) as Camp[]);
      const loginRows = (lg ?? []) as Login[];
      setLogins(loginRows);

      const ids = Array.from(
        new Set(loginRows.map((l) => l.student_id).filter((x): x is string => !!x)),
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
    const byCamp = new Map<string, Login[]>();
    for (const l of logins) {
      if (!l.student_id) continue;
      const arr = byCamp.get(l.explr_camp_id) ?? [];
      arr.push(l);
      byCamp.set(l.explr_camp_id, arr);
    }
    return camps.map((c) => {
      const rows = byCamp.get(c.id) ?? [];
      const studentIds = rows.map((r) => r.student_id as string);
      const names = Object.fromEntries(rows.map((r) => [r.student_id as string, r.child_name]));
      const total = studentIds.length;
      const assessmentDone = studentIds.filter((id) => doneSessions.has(id)).length;
      const surveysDone = studentIds.filter((id) => studentsWithSurvey.has(id)).length;
      return {
        campId: c.id,
        title: c.title,
        date: c.date,
        total,
        assessmentDone,
        surveysDone,
        studentIds,
        names,
      };
    });
  }, [camps, logins, doneSessions, studentsWithSurvey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = stats.filter((s) => s.total > 0);
    if (!q) return visible;
    return visible.filter((s) => s.title.toLowerCase().includes(q));
  }, [stats, query]);

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
    <main className="mx-auto max-w-6xl px-6 py-16">
      <p className="eyebrow">Admin</p>
      <h1 className="mt-3 text-4xl font-light">Completion by roster</h1>
      <p className="mt-2 max-w-2xl text-sm text-charcoal-500">
        Assessment and survey completion grouped by camp roster. Click a row to
        see per-student results and timing.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <input
          className="field max-w-sm"
          placeholder="Filter camps…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="text-xs text-charcoal-500">
          {filtered.length} roster{filtered.length === 1 ? "" : "s"} ·{" "}
          {totals.assessmentDone}/{totals.total} assessment ·{" "}
          {totals.surveysDone}/{totals.total} survey
        </span>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-charcoal-400">Loading…</p>
      ) : err ? (
        <p className="mt-8 text-sm text-red-600">Error: {err}</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-sm text-charcoal-400">No rosters with students yet.</p>
      ) : (
        <div className="mt-6 divide-y divide-charcoal-100 border-y border-charcoal-100">
          {filtered.map((s) => {
            const isOpen = open === s.campId;
            const aPct = s.total ? Math.round((s.assessmentDone / s.total) * 100) : 0;
            const sPct = s.total ? Math.round((s.surveysDone / s.total) * 100) : 0;
            return (
              <div key={s.campId}>
                <button
                  onClick={() => setOpen(isOpen ? null : s.campId)}
                  className="grid w-full grid-cols-[1fr_120px_140px_140px_60px] items-baseline gap-4 py-4 text-left text-sm hover:bg-charcoal-50"
                >
                  <span>
                    <span className="font-medium">{s.title}</span>
                    {s.date && (
                      <span className="ml-2 text-xs text-charcoal-400">{s.date}</span>
                    )}
                  </span>
                  <span className="text-xs text-charcoal-500 tabular-nums">
                    {s.total} student{s.total === 1 ? "" : "s"}
                  </span>
                  <span className="tabular-nums">
                    <span className="font-medium">{s.assessmentDone}/{s.total}</span>{" "}
                    <span className="text-xs text-charcoal-400">assessment ({aPct}%)</span>
                  </span>
                  <span className="tabular-nums">
                    <span className="font-medium">{s.surveysDone}/{s.total}</span>{" "}
                    <span className="text-xs text-charcoal-400">survey ({sPct}%)</span>
                  </span>
                  <span className="text-right text-xs text-charcoal-500">
                    {isOpen ? "Hide" : "View"}
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-charcoal-100 bg-charcoal-50 px-4 py-4">
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
