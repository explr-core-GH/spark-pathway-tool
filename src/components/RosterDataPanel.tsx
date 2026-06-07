import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * RosterDataPanel — per-student results + overall timing for a roster,
 * plus a roster-level summary. Admin-only data (relies on the admin read
 * policy on assessment_sessions and the staff read on survey_responses —
 * both already in place).
 *
 * Timing is wall-clock: completed_at − started_at, for the interest
 * assessment and for completed surveys. Anything over an hour is reported
 * as "1 hr+" rather than a literal duration — long wall-clock times
 * almost always mean a kid left the tab open, not real work, so an exact
 * "4h 12m" would be misleading.
 *
 * Loaded lazily by the caller (mounted only when the admin asks) so we
 * don't fire these queries on every camp expand.
 */

type Props = {
  studentIds: string[];
  names: Record<string, string>;
};

const ONE_HOUR_SECONDS = 3600;

type SessionRow = {
  student_id: string;
  started_at: string;
  completed_at: string | null;
  holland_code: string | null;
};
type SurveyRow = {
  student_id: string;
  started_at: string;
  completed_at: string | null;
};

type StudentData = {
  studentId: string;
  name: string;
  hollandCode: string | null;
  assessmentStatus: "done" | "in progress" | "not started";
  assessmentSeconds: number | null;
  surveysCompleted: number;
  surveysInProgress: number;
  surveySeconds: number | null; // total wall-clock across completed surveys
};

/** Wall-clock seconds between two ISO timestamps, or null. */
function durationSeconds(start: string, end: string | null): number | null {
  if (!end) return null;
  return (new Date(end).getTime() - new Date(start).getTime()) / 1000;
}

/** Human duration, capped: anything ≥ 1 hour shows as "1 hr+". */
function fmtDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  if (seconds >= ONE_HOUR_SECONDS) return "1 hr+";
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

/** Median of capped values (each clamped to ≤ 1 hour so idle sessions
 *  don't blow up the average). */
function summarize(seconds: number[]): { median: number | null; avg: number | null } {
  if (seconds.length === 0) return { median: null, avg: null };
  const capped = seconds.map((x) => Math.min(x, ONE_HOUR_SECONDS));
  const sorted = [...capped].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const avg = capped.reduce((a, b) => a + b, 0) / capped.length;
  return { median, avg };
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

      const [{ data: sessions, error: sErr }, { data: surveys }] =
        await Promise.all([
          supabase
            .from("assessment_sessions")
            .select("student_id, started_at, completed_at, holland_code")
            .in("student_id", studentIds)
            .order("started_at", { ascending: false }),
          supabase
            .from("survey_responses")
            .select("student_id, started_at, completed_at")
            .in("student_id", studentIds),
        ]);
      if (cancelled) return;
      if (sErr) {
        setErr(sErr.message);
        setLoading(false);
        return;
      }

      // Most-recent assessment session per student.
      const latest = new Map<string, SessionRow>();
      for (const s of (sessions ?? []) as SessionRow[]) {
        if (!latest.has(s.student_id)) latest.set(s.student_id, s);
      }

      // Survey rollups per student.
      const surveyDone = new Map<string, number>();
      const surveyWip = new Map<string, number>();
      const surveySecs = new Map<string, number>();
      for (const r of (surveys ?? []) as SurveyRow[]) {
        if (r.completed_at) {
          surveyDone.set(r.student_id, (surveyDone.get(r.student_id) ?? 0) + 1);
          const d = durationSeconds(r.started_at, r.completed_at);
          if (d != null)
            surveySecs.set(r.student_id, (surveySecs.get(r.student_id) ?? 0) + d);
        } else {
          surveyWip.set(r.student_id, (surveyWip.get(r.student_id) ?? 0) + 1);
        }
      }

      const out: StudentData[] = studentIds.map((sid) => {
        const sess = latest.get(sid);
        let status: StudentData["assessmentStatus"] = "not started";
        let assessmentSeconds: number | null = null;
        if (sess) {
          status = sess.completed_at ? "done" : "in progress";
          assessmentSeconds = durationSeconds(sess.started_at, sess.completed_at);
        }
        return {
          studentId: sid,
          name: names[sid] ?? "Student",
          hollandCode: sess?.holland_code ?? null,
          assessmentStatus: status,
          assessmentSeconds,
          surveysCompleted: surveyDone.get(sid) ?? 0,
          surveysInProgress: surveyWip.get(sid) ?? 0,
          surveySeconds: surveySecs.get(sid) ?? null,
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

  const done = rows.filter((r) => r.assessmentStatus === "done");
  const { median, avg } = summarize(
    done.map((r) => r.assessmentSeconds).filter((x): x is number => x != null),
  );

  return (
    <div>
      {/* Roster summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Students" value={`${rows.length}`} />
        <Stat label="Assessment done" value={`${done.length} / ${rows.length}`} />
        <Stat label="Median time" value={fmtDuration(median)} />
        <Stat label="Average time" value={fmtDuration(avg)} />
      </div>

      {/* Per-student table */}
      <div className="mt-4 overflow-x-auto border border-charcoal-100">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-charcoal-100 bg-charcoal-50 text-left text-xs uppercase tracking-wider text-charcoal-400">
              <th className="px-3 py-2 font-normal">Student</th>
              <th className="px-3 py-2 font-normal">RIASEC</th>
              <th className="px-3 py-2 font-normal">Assessment</th>
              <th className="px-3 py-2 font-normal">Time</th>
              <th className="px-3 py-2 font-normal">Surveys</th>
              <th className="px-3 py-2 font-normal">Survey time</th>
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
                  {fmtDuration(r.assessmentSeconds)}
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
                <td className="px-3 py-2 tabular-nums">
                  {fmtDuration(r.surveySeconds)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[11px] text-charcoal-400">
        Time is wall-clock from start to finish. Anything over an hour shows
        as &ldquo;1 hr+&rdquo; — a long time almost always means the tab was
        left open, not active work.
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
