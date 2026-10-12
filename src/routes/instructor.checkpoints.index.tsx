import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { schoolYear } from "@/lib/checkpoints";

/**
 * /instructor/checkpoints — every student this instructor can see, with
 * the status of this year's fall and spring checkpoints. RLS does the
 * scoping: admins see everyone, teachers their classes, camp staff their camps.
 */
export const Route = createFileRoute("/instructor/checkpoints/")({
  head: () => ({ meta: [{ title: "Checkpoints to review — EXPLR" }] }),
  component: () => (
    <RoleGuard requires="educator">
      <ReviewList />
    </RoleGuard>
  ),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = (table: string): any => (supabase.from as unknown as (n: string) => any)(table);

type Row = {
  id: string;
  student_id: string;
  term: "fall" | "spring";
  grade: number;
  status: string;
  submitted_at: string | null;
  students: { first_name: string | null } | null;
};

function ReviewList() {
  const sy = schoolYear();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    sb("checkpoints")
      .select("id, student_id, term, grade, status, submitted_at, students(first_name)")
      .eq("school_year", sy)
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .then(({ data, error }: { data: Row[] | null; error: { message: string } | null }) => {
        if (!active) return;
        if (error) setError(error.message);
        setRows(data ?? []);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sy]);

  const byStudent = new Map<string, { name: string; grade: number; fall?: Row; spring?: Row }>();
  for (const r of rows) {
    const cur = byStudent.get(r.student_id) ?? {
      name: r.students?.first_name ?? "Student",
      grade: r.grade,
    };
    cur[r.term] = r;
    byStudent.set(r.student_id, cur);
  }
  const students = [...byStudent.entries()].sort((a, b) => {
    const sa = a[1].fall?.status === "submitted" || a[1].spring?.status === "submitted" ? 0 : 1;
    const sb2 = b[1].fall?.status === "submitted" || b[1].spring?.status === "submitted" ? 0 : 1;
    return sa - sb2 || a[1].name.localeCompare(b[1].name);
  });

  const chip = (r?: Row) => {
    if (!r) return <span className="text-xs text-ink-500">not started</span>;
    const cls =
      r.status === "reviewed"
        ? "bg-mint-tint text-green-deep"
        : r.status === "submitted"
          ? "bg-gold-tint text-gold-deep"
          : "bg-paper-sunken text-ink-700";
    return (
      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>
        {r.status === "submitted" ? "ready to review" : r.status}
      </span>
    );
  };

  return (
    <main className="mx-auto max-w-[1312px] px-4 py-10 sm:px-6 lg:px-8">
      <p className="eyebrow text-green">Advising checkpoints · {sy}</p>
      <h1 className="display mt-2">Checkpoints to review</h1>
      <p className="lead mt-3 max-w-2xl">
        Each checkpoint is the record of one advising conversation. Open a student, read what they
        entered, add notes, and mark it reviewed. The spring plan approval is the annual sign-off
        Ohio's Student Success Plan ends with.
      </p>
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}
      {loading && (
        <p role="status" className="mt-8 text-sm text-ink-500">
          Loading…
        </p>
      )}
      {!loading && students.length === 0 && (
        <p className="mt-8 text-sm text-ink-700">
          No students with checkpoints yet. Checkpoints appear once a student opens theirs.
        </p>
      )}
      {students.length > 0 && (
        <div className="mt-8 overflow-x-auto rounded-[var(--radius-card)] border border-line">
          <table className="w-full text-sm">
            <thead className="bg-paper-sunken text-left font-mono text-[11px] uppercase tracking-[0.08em] text-ink-700">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Student
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Grade
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Fall
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Spring
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-paper-raised">
              {students.map(([id, s]) => (
                <tr key={id}>
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3">{s.grade}</td>
                  <td className="px-4 py-3">{chip(s.fall)}</td>
                  <td className="px-4 py-3">{chip(s.spring)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to="/instructor/checkpoints/$studentId"
                      params={{ studentId: id }}
                      className="ink-link inline-flex min-h-[44px] items-center"
                    >
                      Review<span className="sr-only"> {s.name}'s checkpoints</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
