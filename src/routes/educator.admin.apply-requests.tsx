import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { INTERNSHIPS } from "@/lib/internships-catalog";

export const Route = createFileRoute("/educator/admin/apply-requests")({
  head: () => ({ meta: [{ title: "Apply requests — Admin" }] }),
  component: ApplyRequests,
});

const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);
const CATALOG_NAME: Record<string, string> = Object.fromEntries(INTERNSHIPS.map((i) => [i.slug, i.name]));

type Sel = {
  id: string;
  student_id: string;
  internship_ref: string;
  opportunity_id: string | null;
  status: string;
};
type Student = { id: string; first_name: string | null; grade: number | null; date_of_birth: string | null };

function ApplyRequests() {
  const [sels, setSels] = useState<Sel[]>([]);
  const [students, setStudents] = useState<Record<string, Student>>({});
  const [oppNames, setOppNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  // student_id → set of refs the admin will approve (defaults to all).
  const [approve, setApprove] = useState<Record<string, Set<string>>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await sb("internship_selections").select("*").eq("status", "requested");
    const list = (data as Sel[]) ?? [];
    setSels(list);

    const studentIds = [...new Set(list.map((s) => s.student_id))];
    if (studentIds.length) {
      const { data: studs } = await sb("students")
        .select("id, first_name, grade, date_of_birth")
        .in("id", studentIds);
      const m: Record<string, Student> = {};
      for (const s of (studs as Student[]) ?? []) m[s.id] = s;
      setStudents(m);
    }
    const oppIds = list.map((s) => s.opportunity_id).filter((x): x is string => !!x);
    if (oppIds.length) {
      const { data: opps } = await sb("opportunities").select("id, name").in("id", oppIds);
      const m: Record<string, string> = {};
      for (const o of (opps as Array<{ id: string; name: string | null }>) ?? []) m[o.id] = o.name ?? "Internship";
      setOppNames(m);
    }
    // Default: approve everything.
    const init: Record<string, Set<string>> = {};
    for (const s of list) {
      (init[s.student_id] ??= new Set()).add(s.internship_ref);
    }
    setApprove(init);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byStudent = useMemo(() => {
    const m = new Map<string, Sel[]>();
    for (const s of sels) {
      const arr = m.get(s.student_id);
      if (arr) arr.push(s);
      else m.set(s.student_id, [s]);
    }
    return [...m.entries()];
  }, [sels]);

  function nameFor(s: Sel): string {
    if (s.opportunity_id) return oppNames[s.opportunity_id] ?? "Internship";
    return CATALOG_NAME[s.internship_ref] ?? s.internship_ref;
  }

  function toggle(studentId: string, ref: string) {
    setApprove((prev) => {
      const next = { ...prev };
      const set = new Set(next[studentId] ?? []);
      if (set.has(ref)) set.delete(ref);
      else set.add(ref);
      next[studentId] = set;
      return next;
    });
  }

  async function decide(studentId: string, rows: Sel[]) {
    setBusy(studentId);
    const approveSet = approve[studentId] ?? new Set();
    const now = new Date().toISOString();
    for (const s of rows) {
      const status = approveSet.has(s.internship_ref) ? "approved" : "denied";
      const { error } = await sb("internship_selections")
        .update({ status, decided_at: now })
        .eq("id", s.id);
      if (error) {
        alert(error.message);
        setBusy(null);
        return;
      }
    }
    setBusy(null);
    load();
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <p className="eyebrow">Admin</p>
      <h1 className="display mt-2">Requests to apply</h1>
      <p className="lead mt-2 max-w-2xl">
        Students who selected internships and are waiting to be cleared to apply. Approve all, or
        uncheck any a student isn&apos;t qualified for (e.g. age) before approving — unchecked ones
        are declined.
      </p>

      {loading ? (
        <p className="mt-8 text-sm text-charcoal-400">Loading…</p>
      ) : byStudent.length === 0 ? (
        <p className="mt-8 text-sm text-charcoal-400">No pending requests.</p>
      ) : (
        <div className="mt-8 space-y-6">
          {byStudent.map(([studentId, rows]) => {
            const st = students[studentId];
            const approveSet = approve[studentId] ?? new Set();
            return (
              <div key={studentId} className="border border-charcoal-100 p-5">
                <div className="flex items-baseline justify-between">
                  <p className="font-medium">
                    {st?.first_name ?? "Student"}
                    <span className="ml-2 text-xs text-charcoal-400">
                      Grade {st?.grade ?? "—"}
                      {st?.date_of_birth ? ` · DOB ${st.date_of_birth}` : ""}
                    </span>
                  </p>
                  <button
                    onClick={() => decide(studentId, rows)}
                    disabled={busy === studentId}
                    className="btn-ink text-sm disabled:opacity-40"
                  >
                    {busy === studentId ? "Saving…" : `Approve ${approveSet.size} · decline ${rows.length - approveSet.size}`}
                  </button>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {rows.map((s) => (
                    <li key={s.id}>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={approveSet.has(s.internship_ref)}
                          onChange={() => toggle(studentId, s.internship_ref)}
                        />
                        {nameFor(s)}
                        {s.opportunity_id && (
                          <span className="text-xs text-charcoal-400">· partner internship</span>
                        )}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
