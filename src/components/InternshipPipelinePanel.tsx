import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * InternshipPipelinePanel — applicants and placed students for ONE internship,
 * inside its workspace. Approve-and-place / reject an application, or remove a
 * placement (which returns the application to pending) — the same writes the
 * standalone Applications / Placements pages do, scoped to this offering.
 */

type Application = {
  id: string;
  student_id: string;
  selected_internship_ids: string[];
  status: string;
  staff_notes: string | null;
  submitted_at: string;
};
type Placement = {
  id: string;
  application_id: string;
  student_id: string;
  approved_at: string;
};
type Student = { id: string; first_name: string | null; grade: number | null };

function statusStyle(status: string) {
  if (status === "approved")
    return { label: "Approved", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
  if (status === "rejected")
    return { label: "Rejected", className: "bg-rose-50 text-rose-700 border border-rose-200" };
  return { label: "Pending", className: "bg-amber-50 text-amber-700 border border-amber-200" };
}

export function InternshipPipelinePanel({ slug }: { slug: string }) {
  const [apps, setApps] = useState<Application[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [students, setStudents] = useState<Record<string, Student>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: appRows }, { data: placeRows }] = await Promise.all([
      supabase
        .from("internship_applications")
        .select("id, student_id, selected_internship_ids, status, staff_notes, submitted_at")
        .contains("selected_internship_ids", [slug])
        .order("submitted_at", { ascending: false }),
      supabase
        .from("internship_placements")
        .select("id, application_id, student_id, approved_at")
        .eq("approved_internship_id", slug)
        .order("approved_at", { ascending: false }),
    ]);
    const a = (appRows as Application[]) ?? [];
    const p = (placeRows as Placement[]) ?? [];
    setApps(a);
    setPlacements(p);

    const ids = [...new Set([...a.map((x) => x.student_id), ...p.map((x) => x.student_id)])];
    if (ids.length) {
      const { data: studs } = await supabase
        .from("students")
        .select("id, first_name, grade")
        .in("id", ids);
      const m: Record<string, Student> = {};
      for (const s of (studs as Student[]) ?? []) m[s.id] = s;
      setStudents(m);
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const placedStudentIds = useMemo(
    () => new Set(placements.map((p) => p.student_id)),
    [placements],
  );

  async function place(app: Application) {
    const { error: upErr } = await supabase
      .from("internship_applications")
      .update({ status: "approved", decided_at: new Date().toISOString() })
      .eq("id", app.id);
    if (upErr) return alert(upErr.message);
    const { error: pErr } = await supabase.from("internship_placements").insert({
      application_id: app.id,
      student_id: app.student_id,
      approved_internship_id: slug,
      staff_notes: app.staff_notes,
    });
    if (pErr) return alert(pErr.message);
    load();
  }

  async function reject(app: Application) {
    const { error } = await supabase
      .from("internship_applications")
      .update({ status: "rejected", decided_at: new Date().toISOString() })
      .eq("id", app.id);
    if (error) return alert(error.message);
    load();
  }

  async function removePlacement(p: Placement) {
    const name = students[p.student_id]?.first_name ?? "this student";
    if (!confirm(`Remove ${name} from this internship? Their application returns to pending.`))
      return;
    const { error: delErr } = await supabase
      .from("internship_placements")
      .delete()
      .eq("id", p.id);
    if (delErr) return alert(delErr.message);
    await supabase
      .from("internship_applications")
      .update({ status: "submitted", decided_at: null })
      .eq("id", p.application_id);
    load();
  }

  if (loading) return <p className="text-sm text-charcoal-400">Loading pipeline…</p>;

  return (
    <div className="max-w-3xl space-y-10">
      <section>
        <h2 className="text-xs uppercase tracking-wider text-charcoal-400">
          Placed · {placements.length}
        </h2>
        {placements.length === 0 ? (
          <p className="mt-3 text-sm text-charcoal-400">No students placed here yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-charcoal-100 border-y border-charcoal-100">
            {placements.map((p) => {
              const s = students[p.student_id];
              return (
                <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span>
                    <span className="font-medium">{s?.first_name ?? "Student"}</span>
                    <span className="ml-2 text-xs text-charcoal-400">
                      Grade {s?.grade ?? "—"} · placed{" "}
                      {new Date(p.approved_at).toLocaleDateString()}
                    </span>
                  </span>
                  <button
                    onClick={() => removePlacement(p)}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-wider text-charcoal-400">
          Applicants · {apps.length}
        </h2>
        {apps.length === 0 ? (
          <p className="mt-3 text-sm text-charcoal-400">
            No one has applied to this internship yet.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-charcoal-100 border-y border-charcoal-100">
            {apps.map((a) => {
              const s = students[a.student_id];
              const st = statusStyle(a.status);
              const alreadyPlacedHere = placedStudentIds.has(a.student_id);
              return (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="font-medium">{s?.first_name ?? "Student"}</span>
                    <span className="ml-2 text-xs text-charcoal-400">
                      Grade {s?.grade ?? "—"} ·{" "}
                      {new Date(a.submitted_at).toLocaleDateString()}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${st.className}`}>
                      {st.label}
                    </span>
                    {a.status === "submitted" && !alreadyPlacedHere && (
                      <>
                        <button
                          onClick={() => place(a)}
                          className="text-xs font-medium text-explr-600 hover:underline"
                        >
                          Place here
                        </button>
                        <button
                          onClick={() => reject(a)}
                          className="text-xs text-charcoal-500 hover:text-ink"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
