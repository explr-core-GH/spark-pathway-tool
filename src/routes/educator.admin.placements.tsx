import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { INTERNSHIPS } from "@/lib/internships-catalog";

export const Route = createFileRoute("/educator/admin/placements")({
  head: () => ({ meta: [{ title: "Internship placements — Admin" }] }),
  component: PlacementsPage,
});

type Placement = {
  id: string;
  application_id: string;
  student_id: string;
  approved_internship_id: string;
  staff_notes: string | null;
  approved_at: string;
  approved_by: string | null;
};
type Student = { id: string; first_name: string | null; grade: number | null };

const SLUG_TO_NAME: Record<string, string> = Object.fromEntries(INTERNSHIPS.map((i) => [i.slug, i.name]));
const SLUG_TO_EMOJI: Record<string, string> = Object.fromEntries(INTERNSHIPS.map((i) => [i.slug, i.emoji]));

function initials(name?: string | null) {
  if (!name) return "—";
  return name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function PlacementsPage() {
  const [rows, setRows] = useState<Placement[]>([]);
  const [students, setStudents] = useState<Record<string, Student>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  async function refresh() {
    setLoading(true);
    const { data } = await supabase
      .from("internship_placements")
      .select("*")
      .order("approved_at", { ascending: false });
    const list = (data as Placement[]) ?? [];
    setRows(list);
    const ids = Array.from(new Set(list.map((r) => r.student_id)));
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

  const grouped = useMemo(() => {
    const m: Record<string, Placement[]> = {};
    rows.forEach((r) => {
      (m[r.approved_internship_id] ??= []).push(r);
    });
    return m;
  }, [rows]);

  const internshipOptions = useMemo(
    () => Object.keys(grouped).sort((a, b) => (SLUG_TO_NAME[a] ?? a).localeCompare(SLUG_TO_NAME[b] ?? b)),
    [grouped],
  );

  const visibleGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filterSlug = filter === "all" ? null : filter;
    return internshipOptions
      .filter((slug) => !filterSlug || slug === filterSlug)
      .map((slug) => ({
        slug,
        items: grouped[slug].filter((p) => {
          if (!q) return true;
          const name = students[p.student_id]?.first_name?.toLowerCase() ?? "";
          return name.includes(q);
        }),
      }))
      .filter((g) => g.items.length > 0);
  }, [grouped, internshipOptions, filter, search, students]);

  async function removePlacement(p: Placement) {
    if (!confirm(`Remove ${students[p.student_id]?.first_name ?? "this student"} from ${SLUG_TO_NAME[p.approved_internship_id] ?? p.approved_internship_id}? Their application will return to pending.`)) {
      return;
    }
    const { error: delErr } = await supabase.from("internship_placements").delete().eq("id", p.id);
    if (delErr) return alert(delErr.message);
    const { error: upErr } = await supabase
      .from("internship_applications")
      .update({ status: "submitted", decided_at: null })
      .eq("id", p.application_id);
    if (upErr) alert(upErr.message);
    refresh();
  }

  async function saveNotes(p: Placement, notes: string) {
    const { error } = await supabase
      .from("internship_placements")
      .update({ staff_notes: notes })
      .eq("id", p.id);
    if (error) return alert(error.message);
    setRows((prev) => prev.map((r) => (r.id === p.id ? { ...r, staff_notes: notes } : r)));
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <p className="eyebrow">Admin</p>
      <h1 className="mt-2 text-4xl font-light">Internship placements</h1>
      <p className="mt-2 text-sm text-charcoal-500">
        Students who've been approved and placed into an internship. Grouped by internship for roster planning.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilter("all")}
          className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            background: filter === "all" ? "var(--ink)" : "transparent",
            color: filter === "all" ? "white" : "var(--color-charcoal-600)",
            border: `1px solid ${filter === "all" ? "var(--ink)" : "var(--color-charcoal-200)"}`,
          }}
        >
          All <span className="ml-1 opacity-70">{rows.length}</span>
        </button>
        {internshipOptions.map((slug) => {
          const active = filter === slug;
          return (
            <button
              key={slug}
              onClick={() => setFilter(slug)}
              className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: active ? "var(--ink)" : "transparent",
                color: active ? "white" : "var(--color-charcoal-600)",
                border: `1px solid ${active ? "var(--ink)" : "var(--color-charcoal-200)"}`,
              }}
            >
              <span className="mr-1">{SLUG_TO_EMOJI[slug] ?? "•"}</span>
              {SLUG_TO_NAME[slug] ?? slug}
              <span className="ml-1 opacity-70">{grouped[slug].length}</span>
            </button>
          );
        })}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search student…"
          className="ml-auto w-56 rounded-full border border-charcoal-200 bg-white px-4 py-1.5 text-sm placeholder:text-charcoal-400 focus:border-charcoal-400 focus:outline-none"
        />
      </div>

      <div className="mt-8 space-y-8">
        {loading ? (
          <p className="text-sm text-charcoal-400">Loading…</p>
        ) : visibleGroups.length === 0 ? (
          <div className="rounded-lg border border-dashed border-charcoal-200 bg-white p-10 text-center">
            <p className="text-sm text-charcoal-500">
              {rows.length === 0 ? (
                <>No placements yet. Approve applications from the{" "}
                  <Link to="/educator/admin/applications" className="underline">applications queue</Link> to place students.
                </>
              ) : (
                "No placements match this filter."
              )}
            </p>
          </div>
        ) : (
          visibleGroups.map((group) => (
            <section key={group.slug}>
              <div className="flex items-baseline justify-between border-b border-charcoal-100 pb-2">
                <h2 className="text-lg font-medium">
                  <span className="mr-2">{SLUG_TO_EMOJI[group.slug] ?? "•"}</span>
                  {SLUG_TO_NAME[group.slug] ?? group.slug}
                </h2>
                <p className="text-xs uppercase tracking-wider text-charcoal-400">
                  {group.items.length} {group.items.length === 1 ? "student" : "students"}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {group.items.map((p) => {
                  const s = students[p.student_id];
                  return (
                    <div key={p.id} className="rounded-lg border border-charcoal-100 bg-white p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-charcoal-100 text-sm font-medium text-charcoal-600">
                          {initials(s?.first_name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-medium">{s?.first_name ?? "Unknown student"}</p>
                          <p className="text-xs text-charcoal-500">
                            Grade {s?.grade ?? "—"} · Placed {new Date(p.approved_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                        <button
                          onClick={() => removePlacement(p)}
                          className="text-xs text-rose-600 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                      <textarea
                        defaultValue={p.staff_notes ?? ""}
                        onBlur={(e) => {
                          if (e.target.value !== (p.staff_notes ?? "")) saveNotes(p, e.target.value);
                        }}
                        placeholder="Staff notes for this placement"
                        className="mt-3 h-16 w-full rounded-md border border-charcoal-200 bg-white p-2 text-xs focus:border-charcoal-400 focus:outline-none"
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}
