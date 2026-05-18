import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EducatorGate } from "@/components/EducatorGate";
import { INTERNSHIPS } from "@/lib/internships-catalog";
import { RIASEC, type RIASECCode } from "@/lib/riasec";

export const Route = createFileRoute("/educator/students")({
  head: () => ({ meta: [{ title: "Students — EXPLR Educators" }] }),
  component: () => (
    <EducatorGate>
      <StudentsRoster />
    </EducatorGate>
  ),
});

type SessionRow = {
  student_id: string;
  holland_code: string | null;
  completed_at: string | null;
  started_at: string;
};
type AppRow = {
  student_id: string;
  status: string;
  submitted_at: string;
  selected_internship_ids: string[];
};
type PlacementRow = { student_id: string; approved_internship_id: string };
type AptitudeRow = { student_id: string; band: string; total_score: number; total_items: number };
type InterestCompletion = { student_id: string };

type StudentSummary = {
  student_id: string;
  latestSession: SessionRow | null;
  application: AppRow | null;
  placement: PlacementRow | null;
  aptitude: AptitudeRow | null;
  interestDone: boolean;
};

function StudentsRoster() {
  const [rows, setRows] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "placed" | "applied" | "assessed" | "started">("all");

  useEffect(() => {
    (async () => {
      const [{ data: sess }, { data: apps }, { data: placs }, { data: apt }, { data: interest }] = await Promise.all([
        supabase
          .from("assessment_sessions")
          .select("student_id, holland_code, completed_at, started_at")
          .order("started_at", { ascending: false }),
        supabase
          .from("internship_applications")
          .select("student_id, status, submitted_at, selected_internship_ids")
          .order("submitted_at", { ascending: false }),
        // Placements: educators can't read all by RLS, only admins. Try and fall back silently.
        supabase
          .from("internship_placements")
          .select("student_id, approved_internship_id"),
        supabase
          .from("aptitude_results")
          .select("student_id, band, total_score, total_items")
          .order("completed_at", { ascending: false }),
        supabase.from("internship_interest_completions").select("student_id"),
      ]);

      const sessionsByStudent = new Map<string, SessionRow>();
      ((sess as SessionRow[]) ?? []).forEach((s) => {
        if (!sessionsByStudent.has(s.student_id)) sessionsByStudent.set(s.student_id, s);
      });
      const appsByStudent = new Map<string, AppRow>();
      ((apps as AppRow[]) ?? []).forEach((a) => {
        if (!appsByStudent.has(a.student_id)) appsByStudent.set(a.student_id, a);
      });
      const placByStudent = new Map<string, PlacementRow>();
      ((placs as PlacementRow[]) ?? []).forEach((p) => placByStudent.set(p.student_id, p));
      const aptByStudent = new Map<string, AptitudeRow>();
      ((apt as AptitudeRow[]) ?? []).forEach((a) => {
        if (!aptByStudent.has(a.student_id)) aptByStudent.set(a.student_id, a);
      });
      const interestSet = new Set(((interest as InterestCompletion[]) ?? []).map((r) => r.student_id));

      const allIds = new Set<string>([
        ...sessionsByStudent.keys(),
        ...appsByStudent.keys(),
        ...placByStudent.keys(),
        ...aptByStudent.keys(),
        ...interestSet,
      ]);

      const summaries: StudentSummary[] = Array.from(allIds).map((id) => ({
        student_id: id,
        latestSession: sessionsByStudent.get(id) ?? null,
        application: appsByStudent.get(id) ?? null,
        placement: placByStudent.get(id) ?? null,
        aptitude: aptByStudent.get(id) ?? null,
        interestDone: interestSet.has(id),
      }));

      summaries.sort((a, b) => {
        const ad = a.application?.submitted_at ?? a.latestSession?.started_at ?? "";
        const bd = b.application?.submitted_at ?? b.latestSession?.started_at ?? "";
        return bd.localeCompare(ad);
      });
      setRows(summaries);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter === "placed") return !!r.placement;
      if (filter === "applied") return !!r.application;
      if (filter === "assessed") return !!r.latestSession?.completed_at;
      if (filter === "started") return !!r.latestSession && !r.latestSession.completed_at;
      return true;
    });
  }, [rows, filter]);

  const counts = useMemo(() => ({
    total: rows.length,
    assessed: rows.filter((r) => r.latestSession?.completed_at).length,
    applied: rows.filter((r) => r.application).length,
    placed: rows.filter((r) => r.placement).length,
  }), [rows]);

  const internshipName = (slug: string) => INTERNSHIPS.find((i) => i.slug === slug)?.name ?? slug;

  if (loading) {
    return <main className="mx-auto max-w-6xl px-6 py-24 text-sm text-charcoal-400">Loading roster…</main>;
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <p className="eyebrow">Cohort</p>
      <h1 className="mt-3 text-4xl font-light">Students</h1>
      <p className="mt-2 text-sm text-charcoal-500">
        Aggregated view across all students whose data is visible to your educator role.
      </p>

      {/* Stat tiles */}
      <div className="mt-10 grid gap-px bg-charcoal-100 sm:grid-cols-4">
        <StatTile label="Total" value={counts.total} />
        <StatTile label="Assessed" value={counts.assessed} />
        <StatTile label="Applied" value={counts.applied} />
        <StatTile label="Placed" value={counts.placed} />
      </div>

      {/* Filters */}
      <div className="mt-8 flex flex-wrap gap-2 text-xs">
        {([
          ["all", "All"],
          ["assessed", "Assessment complete"],
          ["started", "In progress"],
          ["applied", "Applied"],
          ["placed", "Placed"],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-3 py-1.5 border ${filter === k ? "border-ink bg-ink text-canvas" : "border-charcoal-200 text-charcoal-500 hover:border-ink hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Roster table */}
      <div className="mt-6 overflow-x-auto border border-charcoal-100">
        <table className="w-full text-sm">
          <thead className="bg-charcoal-50 text-left text-xs uppercase tracking-wider text-charcoal-500">
            <tr>
              <th className="px-4 py-3 font-normal">Student</th>
              <th className="px-4 py-3 font-normal">Assessment</th>
              <th className="px-4 py-3 font-normal">Holland</th>
              <th className="px-4 py-3 font-normal">Aptitude</th>
              <th className="px-4 py-3 font-normal">Interest</th>
              <th className="px-4 py-3 font-normal">Application</th>
              <th className="px-4 py-3 font-normal">Placement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-100">
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-charcoal-400">No students match this filter.</td></tr>
            )}
            {filtered.map((r) => {
              const code = r.latestSession?.holland_code;
              const top = code ? (code[0] as RIASECCode) : null;
              return (
                <tr key={r.student_id} className="hover:bg-charcoal-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-charcoal-500">{r.student_id.slice(0, 8)}…</td>
                  <td className="px-4 py-3">
                    {r.latestSession?.completed_at ? (
                      <span className="text-ink">Complete</span>
                    ) : r.latestSession ? (
                      <span className="text-charcoal-500">In progress</span>
                    ) : (
                      <span className="text-charcoal-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {code && top ? (
                      <span className="font-medium" style={{ color: RIASEC[top].color }}>{code}</span>
                    ) : (
                      <span className="text-charcoal-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.aptitude ? `${r.aptitude.total_score}/${r.aptitude.total_items} (${r.aptitude.band})` : <span className="text-charcoal-300">—</span>}
                  </td>
                  <td className="px-4 py-3">{r.interestDone ? "✓" : <span className="text-charcoal-300">—</span>}</td>
                  <td className="px-4 py-3">
                    {r.application ? (
                      <span className="capitalize">{r.application.status.replace(/_/g, " ")}</span>
                    ) : (
                      <span className="text-charcoal-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.placement ? (
                      <span className="text-ink">{internshipName(r.placement.approved_internship_id)}</span>
                    ) : (
                      <span className="text-charcoal-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-xs text-charcoal-400">
        Need finer-grain controls (per-program rosters, exports)?{" "}
        <Link to="/educator/admin" className="ink-link">Admin tools →</Link>
      </p>
    </main>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-canvas p-5">
      <div className="text-xs uppercase tracking-wider text-charcoal-400">{label}</div>
      <div className="mt-2 text-3xl font-light">{value}</div>
    </div>
  );
}
