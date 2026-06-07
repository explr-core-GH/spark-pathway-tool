import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * RosterDataPanel — per-student results + timing for a set of students,
 * plus a roster-level summary. Admin-only data (relies on the admin read
 * policies on assessment_sessions / assessment_responses / survey_responses).
 *
 * Timing: we report two numbers where available —
 *   • Active time  = sum of assessment_responses.response_time_ms for the
 *                    student's most recent session. Excludes idle/away time.
 *   • Elapsed time = completed_at − started_at (wall clock). Shown when
 *                    active time isn't available (e.g. survey responses,
 *                    which don't record per-item ms).
 *
 * Loaded lazily by the caller (mounted only when the admin asks) so we
 * don't fire these queries on every camp expand.
 */

type Props = {
  /** auth user ids of the students in this roster */
  studentIds: string[];
  /** display name per student id */
  names: Record<string, string>;
};

type SessionRow = {
  session_id: string;
  student_id: string;
  started_at: string;
  completed_at: string | null;
  holland_code: string | null;
};

type StudentData = {
  studentId: string;
  name: string;
  hollandCode: string | null;
  assessmentStatus: "done" | "in progress" | "not started";
  /** seconds of active time on the interest assessment, or null */
  activeSeconds: number | null;
  /** seconds wall-clock on the interest assessment, or null */
  elapsedSeconds: number | null;
  surveysCompleted: number;
  surveysInProgress: number;
};

function fmtDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function RosterDataPanel({ studentIds, names }: Props) {
  const [rows, setRows] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      if (studentIds.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      // 1. Interest-assessment sessions for these students.
      const { data: sessions, error: sErr } = await supabase
        .from("assessment_sessions")
        .select("session_id, student_id, started_at, completed_at, holland_code")
        .in("student_id", studentIds)
        .order("started_at", { ascending: false });
      if (cancelled) return;
      if (sErr) {
        setErr(sErr.message);
        setLoading(false);
        return;
      }
      const sessRows = (sessions ?? []) as SessionRow[];

      // Most-recent session per student.
      const latestByStudent = new Map<string, SessionRow>();
      for (const s of sessRows) {
        if (!latestByStudent.has(s.student_id)) latestByStudent.set(s.student_id, s);
      }

      // 2. Active time — sum response_time_ms per session (admin read).
      const sessionIds = [...latestByStudent.values()].map((s) => s.session_id);
      const activeMsBySession = new Map<string, number>();
      if (sessionIds.length > 0) {
        const { data: resp } = await supabase
          .from("assessment_responses")
          .select("session_id, response_time_ms")
          .in("session_id", sessionIds);
        if (!cancelled) {
          for (const r of (resp ?? []) as Array<{
            session_id: string;
            response_time_ms: number;
          }>) {
            activeMsBySession.set(
              r.session_id,
              (activeMsBySession.get(r.session_id) ?? 0) + (r.response_time_ms ?? 0),
            );
          }
        }
      }

      // 3. Survey responses for these students (started/completed only).
      const { data: surveys } = await supabase
        .from("survey_responses")
        .select("student_id, completed_at")
        .in("student_id", studentIds);
      if (cancelled) return;
      const surveyDone = new Map<string, number>();
      const surveyWip = new Map<string, number>();
      for (const r of (surveys ?? []) as Array<{
        student_id: string;
        completed_at: string | null;
      }>) {
        if (r.completed_at) {
          surveyDone.set(r.student_id, (surveyDone.get(r.student_id) ?? 0) + 1);
        } else {
          surveyWip.set(r.student_id, (surveyWip.get(r.student_id) ?? 0) + 1);
        }
      }

      // 4. Assemble one row per student.
      const out: StudentData[] = studentIds.map((sid) => {
        const sess = latestByStudent.get(sid);
        let status: StudentData["assessmentStatus"] = "not started";
        let activeSeconds: number | null = null;
        let elapsedSeconds: number | null = null;
        if (sess) {
          status = sess.completed_at ? "done" : "in progress";
          const ms = activeMsBySession.get(sess.session_id);
          if (ms != null && ms > 0) activeSeconds = ms / 1000;
          if (sess.completed_at) {
            elapsedSeconds =
              (new Date(sess.completed_at).getTime() -
                new Date(sess.started_at).getTime()) /
              1000;
          }
        }
        return {
          studentId: sid,
          name: names[sid] ?? "Student",
          hollandCode: sess?.holland_code ?? null,
          assessmentStatus: status,
          activeSeconds,
          elapsedSeconds,
          surveysCompleted: surveyDone.get(sid) ?? 0,
          surveysInProgress: surveyWip.get(sid) ?? 0,
        };
      });
      out.sort((a, b) => a.name.localeCompare(b.name));
      setRows(out);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [studentIds.join(","), names]);

  if (loading) {
    return <p className="text-sm text-charcoal-400">Loading results…</p>;
  }
  if (err) {
    return <p className="text-sm text-red-600">Couldn&apos;t load results: {err}</p>;
  }
  if (rows.length === 0) {
    return <p className="text-sm text-charcoal-400">No students in this roster yet.</p>;
  }

  // Roster summary.
  const done = rows.filter((r) => r.assessmentStatus === "done");
  const times = done
    .map((r) => r.activeSeconds ?? r.elapsedSeconds)
    .filter((x): x is number => x != null);
  const medianTime = median(times);
  const avgTime =
    times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : null;

  return (
    <div>
      {/* Roster summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Students" value={`${rows.length}`} />
        <Stat
          label="Assessment done"
          value={`${done.length} / ${rows.length}`}
        />
        <Stat label="Median time" value={fmtDuration(medianTime)} />
        <Stat label="Average time" value={fmtDuration(avgTime)} />
      </div>

      {/* Per-student table */}
      <div className="mt-4 overflow-x-auto border border-charcoal-100">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-charcoal-100 bg-charcoal-50 text-left text-xs uppercase tracking-wider text-charcoal-400">
              <th className="px-3 py-2 font-normal">Student</th>
              <th className="px-3 py-2 font-normal">RIASEC</th>
              <th className="px-3 py-2 font-normal">Assessment</th>
              <th className="px-3 py-2 font-normal">Time taken</th>
              <th className="px-3 py-2 font-normal">Surveys</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-100">
            {rows.map((r) => (
              <tr key={r.studentId}>
                <td className="px-3 py-2 font-medium">{r.name}</td>
                <td className="px-3 py-2">
                  {r.hollandCode ? (
                    <span className="font-mono font-semibold tracking-wide">
                      {r.hollandCode}
                    </span>
                  ) : (
                    <span className="text-charcoal-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span
                    className="text-xs"
                    style={{
                      color:
                        r.assessmentStatus === "done"
                          ? "var(--color-explr-600)"
                          : r.assessmentStatus === "in progress"
                            ? "var(--ink)"
                            : "var(--color-charcoal-400)",
                    }}
                  >
                    {r.assessmentStatus}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {fmtDuration(r.activeSeconds ?? r.elapsedSeconds)}
                  {r.activeSeconds == null && r.elapsedSeconds != null && (
                    <span
                      className="ml-1 text-[10px] text-charcoal-400"
                      title="Wall-clock time (active per-item time unavailable)"
                    >
                      elapsed
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-charcoal-600">
                  {r.surveysCompleted > 0 || r.surveysInProgress > 0
                    ? `${r.surveysCompleted} done${
                        r.surveysInProgress > 0
                          ? ` · ${r.surveysInProgress} in progress`
                          : ""
                      }`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[11px] text-charcoal-400">
        Time taken is active time on the interest assessment (sum of per-item
        response times). Rows marked &ldquo;elapsed&rdquo; show wall-clock time
        instead, when per-item timing isn&apos;t available.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-charcoal-100 bg-white p-3">
      <p className="text-[10px] uppercase tracking-wider text-charcoal-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-light tabular-nums text-ink">{value}</p>
    </div>
  );
}
