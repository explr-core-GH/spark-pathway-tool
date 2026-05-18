import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { INTERNSHIPS } from "@/lib/internships-catalog";

export const Route = createFileRoute("/educator/admin/applications")({
  head: () => ({ meta: [{ title: "Internship applications — Admin" }] }),
  component: ApplicationsPage,
});

type Application = {
  id: string;
  student_id: string;
  selected_internship_ids: string[];
  responses: Record<string, unknown> | null;
  riasec_snapshot: Record<string, unknown> | null;
  submission_term: string;
  status: string;
  staff_notes: string | null;
  submitted_at: string;
  decided_at: string | null;
};

type Student = { id: string; first_name: string | null; grade: number | null };

const SLUG_TO_NAME: Record<string, string> = Object.fromEntries(
  INTERNSHIPS.map((i) => [i.slug, i.name])
);

function ApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [students, setStudents] = useState<Record<string, Student>>({});
  const [selected, setSelected] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const { data: appRows } = await supabase
      .from("internship_applications")
      .select("*")
      .order("submitted_at", { ascending: false });
    const list = (appRows as Application[]) ?? [];
    setApps(list);

    const ids = Array.from(new Set(list.map((a) => a.student_id)));
    if (ids.length) {
      const { data: studs } = await supabase
        .from("students")
        .select("id, first_name, grade")
        .in("id", ids);
      const map: Record<string, Student> = {};
      ((studs as Student[]) ?? []).forEach((s) => (map[s.id] = s));
      setStudents(map);
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { submitted: 0, approved: 0, rejected: 0 };
    apps.forEach((a) => (c[a.status] = (c[a.status] ?? 0) + 1));
    return c;
  }, [apps]);

  async function setStatus(app: Application, status: "approved" | "rejected", placementSlug?: string) {
    const { error: upErr } = await supabase
      .from("internship_applications")
      .update({ status, decided_at: new Date().toISOString() })
      .eq("id", app.id);
    if (upErr) return alert(upErr.message);

    if (status === "approved" && placementSlug) {
      const { error: pErr } = await supabase.from("internship_placements").insert({
        application_id: app.id,
        student_id: app.student_id,
        approved_internship_id: placementSlug,
        staff_notes: app.staff_notes,
      });
      if (pErr) return alert(pErr.message);
    }
    setSelected(null);
    refresh();
  }

  async function saveNotes(app: Application, notes: string) {
    const { error } = await supabase
      .from("internship_applications")
      .update({ staff_notes: notes })
      .eq("id", app.id);
    if (error) return alert(error.message);
    setApps((prev) => prev.map((a) => (a.id === app.id ? { ...a, staff_notes: notes } : a)));
    setSelected((s) => (s && s.id === app.id ? { ...s, staff_notes: notes } : s));
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <p className="eyebrow">Admin</p>
      <h1 className="mt-3 text-4xl font-light">Internship applications</h1>
      <p className="mt-2 text-sm text-charcoal-500">
        {loading ? "Loading…" : `${apps.length} total · ${counts.submitted ?? 0} pending · ${counts.approved ?? 0} approved · ${counts.rejected ?? 0} rejected`}
      </p>

      <div className="mt-10 divide-y divide-charcoal-100 border-y border-charcoal-100">
        <div className="grid grid-cols-[1fr_120px_140px_1fr_120px] gap-4 py-3 text-xs uppercase tracking-wider text-charcoal-400">
          <span>Student</span>
          <span>Grade</span>
          <span>Submitted</span>
          <span>Selected</span>
          <span>Status</span>
        </div>
        {apps.map((a) => {
          const s = students[a.student_id];
          return (
            <button
              key={a.id}
              onClick={() => setSelected(a)}
              className="grid w-full grid-cols-[1fr_120px_140px_1fr_120px] items-baseline gap-4 py-3 text-left text-sm hover:bg-charcoal-50"
            >
              <span className="font-medium">{s?.first_name ?? "—"}</span>
              <span className="text-charcoal-500">{s?.grade ?? "—"}</span>
              <span className="text-xs text-charcoal-500">
                {new Date(a.submitted_at).toLocaleDateString()}
              </span>
              <span className="truncate text-xs text-charcoal-500">
                {a.selected_internship_ids.map((id) => SLUG_TO_NAME[id] ?? id).join(" · ")}
              </span>
              <span className={`text-xs ${a.status === "approved" ? "text-emerald-600" : a.status === "rejected" ? "text-rose-600" : "text-amber-600"}`}>
                {a.status}
              </span>
            </button>
          );
        })}
        {!loading && apps.length === 0 && (
          <p className="py-6 text-sm text-charcoal-400">No applications submitted yet.</p>
        )}
      </div>

      {selected && (
        <ApplicationDetail
          app={selected}
          student={students[selected.student_id]}
          onClose={() => setSelected(null)}
          onApprove={(slug) => setStatus(selected, "approved", slug)}
          onReject={() => setStatus(selected, "rejected")}
          onSaveNotes={(notes) => saveNotes(selected, notes)}
        />
      )}
    </main>
  );
}

function ApplicationDetail({
  app, student, onClose, onApprove, onReject, onSaveNotes,
}: {
  app: Application;
  student: Student | undefined;
  onClose: () => void;
  onApprove: (slug: string) => void;
  onReject: () => void;
  onSaveNotes: (notes: string) => void;
}) {
  const [placement, setPlacement] = useState<string>(app.selected_internship_ids[0] ?? "");
  const [notes, setNotes] = useState<string>(app.staff_notes ?? "");
  const resume = (app.responses ?? {}) as Record<string, unknown>;
  const riasec = (app.riasec_snapshot ?? {}) as Record<string, unknown>;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-2xl overflow-y-auto bg-white p-8 shadow-xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow">Application</p>
            <h2 className="mt-2 text-2xl font-light">{student?.first_name ?? "Unknown student"}</h2>
            <p className="text-xs text-charcoal-500">
              Grade {student?.grade ?? "—"} · submitted {new Date(app.submitted_at).toLocaleString()} · {app.submission_term}
            </p>
          </div>
          <button onClick={onClose} className="text-charcoal-400 hover:text-ink">✕</button>
        </div>

        <section className="mt-6">
          <h3 className="text-xs uppercase tracking-wider text-charcoal-400">Selected internships</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {app.selected_internship_ids.map((id) => (
              <li key={id}>· {SLUG_TO_NAME[id] ?? id}</li>
            ))}
          </ul>
        </section>

        {riasec && Object.keys(riasec).length > 0 && (
          <section className="mt-6">
            <h3 className="text-xs uppercase tracking-wider text-charcoal-400">RIASEC snapshot</h3>
            <pre className="mt-2 overflow-auto rounded bg-charcoal-50 p-3 text-xs">{JSON.stringify(riasec, null, 2)}</pre>
          </section>
        )}

        <section className="mt-6">
          <h3 className="text-xs uppercase tracking-wider text-charcoal-400">Résumé responses</h3>
          <pre className="mt-2 max-h-96 overflow-auto rounded bg-charcoal-50 p-3 text-xs">{JSON.stringify(resume, null, 2)}</pre>
        </section>

        <section className="mt-6">
          <h3 className="text-xs uppercase tracking-wider text-charcoal-400">Staff notes</h3>
          <textarea
            className="field mt-2 h-24 w-full"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => onSaveNotes(notes)}
            placeholder="Internal notes about this candidate"
          />
        </section>

        {app.status === "submitted" ? (
          <section className="mt-8 border-t border-charcoal-100 pt-6">
            <h3 className="text-xs uppercase tracking-wider text-charcoal-400">Decision</h3>
            <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-3">
              <select
                className="field"
                value={placement}
                onChange={(e) => setPlacement(e.target.value)}
              >
                {app.selected_internship_ids.map((id) => (
                  <option key={id} value={id}>{SLUG_TO_NAME[id] ?? id}</option>
                ))}
              </select>
              <button
                className="btn-ink"
                disabled={!placement}
                onClick={() => onApprove(placement)}
              >
                Approve & place
              </button>
              <button
                className="border border-charcoal-200 px-4 py-2 text-sm hover:bg-charcoal-50"
                onClick={onReject}
              >
                Reject
              </button>
            </div>
          </section>
        ) : (
          <section className="mt-8 border-t border-charcoal-100 pt-6 text-sm text-charcoal-500">
            Decided {app.decided_at ? new Date(app.decided_at).toLocaleString() : ""} — status:{" "}
            <span className="font-medium">{app.status}</span>
          </section>
        )}
      </aside>
    </div>
  );
}
