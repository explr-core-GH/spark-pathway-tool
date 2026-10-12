import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EducatorGate } from "@/components/EducatorGate";
import { useInternshipRefs } from "@/lib/internship-refs";
import { RIASEC, type RIASECCode } from "@/lib/riasec";

export const Route = createFileRoute("/instructor/students")({
  head: () => ({ meta: [{ title: "Students — EXPLR Instructors" }] }),
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

type StudentSummary = {
  student_id: string;
  latestSession: SessionRow | null;
  application: AppRow | null;
  placement: PlacementRow | null;
};

function StudentsRoster() {
  const [rows, setRows] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "placed" | "applied" | "assessed" | "started">(
    "all",
  );

  useEffect(() => {
    (async () => {
      const [{ data: sess }, { data: apps }, { data: placs }] = await Promise.all([
        supabase
          .from("assessment_sessions")
          .select("student_id, holland_code, completed_at, started_at")
          .order("started_at", { ascending: false }),
        supabase
          .from("internship_applications")
          .select("student_id, status, submitted_at, selected_internship_ids")
          .order("submitted_at", { ascending: false }),
        // Placements: educators can't read all by RLS, only admins. Try and fall back silently.
        supabase.from("internship_placements").select("student_id, approved_internship_id"),
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

      const allIds = new Set<string>([
        ...sessionsByStudent.keys(),
        ...appsByStudent.keys(),
        ...placByStudent.keys(),
      ]);

      const summaries: StudentSummary[] = Array.from(allIds).map((id) => ({
        student_id: id,
        latestSession: sessionsByStudent.get(id) ?? null,
        application: appsByStudent.get(id) ?? null,
        placement: placByStudent.get(id) ?? null,
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

  const counts = useMemo(
    () => ({
      total: rows.length,
      assessed: rows.filter((r) => r.latestSession?.completed_at).length,
      applied: rows.filter((r) => r.application).length,
      placed: rows.filter((r) => r.placement).length,
    }),
    [rows],
  );

  // Placements point at partner opportunities (`opp:<id>`); staff may see unapproved ones.
  const { nameFor: internshipName } = useInternshipRefs({ includeUnapproved: true });

  if (loading) {
    return (
      <main className="mx-auto max-w-[1312px] px-4 py-24 text-sm text-ink-500 sm:px-6 lg:px-8">
        Loading roster…
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1312px] px-4 py-10 sm:px-6 lg:px-8">
      <p className="eyebrow">Cohort</p>
      <h1 className="display mt-2">Students</h1>
      <p className="lead mt-3 max-w-2xl">
        Aggregated view across all students whose data is visible to your instructor role.
      </p>

      {/* Stat tiles */}
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatTile label="Total" value={counts.total} />
        <StatTile label="Assessed" value={counts.assessed} />
        <StatTile label="Applied" value={counts.applied} />
        <StatTile label="Placed" value={counts.placed} />
      </div>

      {/* Filters */}
      <div className="mt-8 flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["assessed", "Assessment complete"],
            ["started", "In progress"],
            ["applied", "Applied"],
            ["placed", "Placed"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm font-medium ${filter === k ? "border-ink-900 bg-ink-900 text-paper" : "border-line-strong text-ink-700 hover:border-ink-900 hover:text-ink-900"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Roster table */}
      <div className="mt-6 overflow-x-auto rounded-[var(--radius-card)] border border-line">
        <table className="w-full text-sm">
          <thead className="bg-paper-sunken text-left font-mono text-[11px] uppercase tracking-[0.08em] text-ink-500">
            <tr>
              <th className="px-4 py-3 font-normal">Student</th>
              <th className="px-4 py-3 font-normal">Assessment</th>
              <th className="px-4 py-3 font-normal">Holland</th>
              <th className="px-4 py-3 font-normal">Application</th>
              <th className="px-4 py-3 font-normal">Placement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-500">
                  No students match this filter.
                </td>
              </tr>
            )}
            {filtered.map((r) => {
              const code = r.latestSession?.holland_code;
              const top = code ? (code[0] as RIASECCode) : null;
              return (
                <tr key={r.student_id} className="bg-paper-raised hover:bg-paper-sunken">
                  <td className="px-4 py-3 font-mono text-xs text-ink-500">
                    {r.student_id.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3">
                    {r.latestSession?.completed_at ? (
                      <span className="rounded-full bg-mint-tint px-2.5 py-0.5 text-xs font-medium text-green-deep">
                        Complete
                      </span>
                    ) : r.latestSession ? (
                      <span className="rounded-full bg-gold-tint px-2.5 py-0.5 text-xs font-medium text-gold-deep">
                        In progress
                      </span>
                    ) : (
                      <span className="text-ink-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {code && top ? (
                      <span className="font-medium" style={{ color: RIASEC[top].color }}>
                        {code}
                      </span>
                    ) : (
                      <span className="text-ink-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.application ? (
                      <span className="capitalize">{r.application.status.replace(/_/g, " ")}</span>
                    ) : (
                      <span className="text-ink-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.placement ? (
                      <span className="text-ink-900">
                        {internshipName(r.placement.approved_internship_id)}
                      </span>
                    ) : (
                      <span className="text-ink-500">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-sm text-ink-700">
        Need finer-grain controls (per-program rosters, exports)?{" "}
        <Link to="/instructor/admin" className="ink-link">
          Admin tools →
        </Link>
      </p>
    </main>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-5">
      <div className="eyebrow">{label}</div>
      <div className="mt-2 font-display text-3xl font-bold">{value}</div>
    </div>
  );
}
