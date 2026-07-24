import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  generateInternshipLogins,
  addInternshipRosterEntry,
} from "@/lib/internship-logins.functions";

export const Route = createFileRoute("/educator/admin/internship-logins")({
  head: () => ({ meta: [{ title: "Internship rosters & logins — Admin" }] }),
  component: InternshipLoginsAdmin,
});

type Internship = { slug: string; name: string; emoji: string };
type RosterRow = { id: string; internship_slug: string; student_name: string };
type LoginRow = {
  id: string;
  internship_slug: string;
  child_name: string;
  username: string;
  password_plain: string;
  roster_id: string | null;
};

function InternshipLoginsAdmin() {
  const [internships, setInternships] = useState<Internship[]>([]);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [logins, setLogins] = useState<LoginRow[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [addForm, setAddForm] = useState<{ slug: string; name: string } | null>(null);

  async function load() {
    const [{ data: ints }, { data: r }, { data: l }] = await Promise.all([
      supabase.from("internships").select("slug, name, emoji").order("name"),
      supabase.from("internship_rosters").select("id, internship_slug, student_name").order("student_name"),
      supabase.from("internship_student_logins").select("id, internship_slug, child_name, username, password_plain, roster_id"),
    ]);
    setInternships((ints ?? []) as Internship[]);
    setRoster((r ?? []) as RosterRow[]);
    setLogins((l ?? []) as LoginRow[]);
  }
  useEffect(() => { void load(); }, []);

  async function handleGenerate(slug: string) {
    setBusy(slug); setStatus(null);
    try {
      const res = await generateInternshipLogins({ data: { internshipSlug: slug } });
      setStatus(`${slug}: created ${res.created}, skipped ${res.skipped}, failed ${res.failed}`);
      await load();
    } catch (e) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  }

  async function handleAdd() {
    if (!addForm || !addForm.name.trim()) return;
    setBusy(addForm.slug); setStatus(null);
    try {
      await addInternshipRosterEntry({ data: { internshipSlug: addForm.slug, studentName: addForm.name.trim() } });
      setAddForm(null);
      await load();
    } catch (e) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  }

  // Only show internships that actually have a roster imported.
  const shown = internships.filter((i) => roster.some((r) => r.internship_slug === i.slug));

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-light">Internship rosters & logins</h1>
      <p className="mt-2 text-sm text-charcoal-500">
        Imported from the SYEP worksite attendance file. Generate logins to let interns
        take assessments and surveys.
      </p>
      {status && <p className="mt-4 text-sm text-charcoal-700">{status}</p>}

      <div className="mt-8 space-y-3">
        {shown.map((i) => {
          const r = roster.filter((x) => x.internship_slug === i.slug);
          const l = logins.filter((x) => x.internship_slug === i.slug);
          const isOpen = expanded === i.slug;
          return (
            <div key={i.slug} className="border border-charcoal-200">
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-charcoal-50"
                onClick={() => setExpanded(isOpen ? null : i.slug)}
              >
                <span className="flex items-baseline gap-3">
                  <span className="text-xl">{i.emoji}</span>
                  <span className="font-medium">{i.name}</span>
                  <span className="text-xs text-charcoal-500">
                    {r.length} students · {l.length} logins
                  </span>
                </span>
                <span className="text-xs text-charcoal-400">{isOpen ? "▾" : "▸"}</span>
              </button>
              {isOpen && (
                <div className="border-t border-charcoal-100 px-4 py-4 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-ink"
                      onClick={() => handleGenerate(i.slug)}
                      disabled={busy === i.slug || l.length >= r.length}
                    >
                      {busy === i.slug ? "Generating…" : l.length >= r.length ? "All logins generated" : `Generate ${r.length - l.length} logins`}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setAddForm({ slug: i.slug, name: "" })}
                    >
                      + Add student
                    </button>
                    {l.length > 0 && (
                      <button type="button" className="btn-ghost" onClick={() => window.print()}>
                        Print credentials
                      </button>
                    )}
                  </div>

                  {addForm?.slug === i.slug && (
                    <div className="flex gap-2">
                      <input
                        className="field flex-1"
                        placeholder="Last, First"
                        value={addForm.name}
                        onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                        autoFocus
                      />
                      <button type="button" className="btn-ink" onClick={handleAdd}>Add</button>
                      <button type="button" className="btn-ghost" onClick={() => setAddForm(null)}>Cancel</button>
                    </div>
                  )}

                  <div>
                    <h3 className="eyebrow mb-2">Roster</h3>
                    <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      {r.map((s, idx) => (
                        <li key={s.id} className="text-charcoal-700">
                          {idx + 1}. {s.student_name}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {l.length > 0 && (
                    <div>
                      <h3 className="eyebrow mb-2">Credentials</h3>
                      <table className="w-full text-sm">
                        <thead className="text-left text-xs uppercase text-charcoal-500">
                          <tr>
                            <th className="py-1">Student</th>
                            <th className="py-1">Username</th>
                            <th className="py-1">Password</th>
                          </tr>
                        </thead>
                        <tbody>
                          {l.map((row) => (
                            <tr key={row.id} className="border-t border-charcoal-100">
                              <td className="py-1">{row.child_name}</td>
                              <td className="py-1 font-mono">{row.username}</td>
                              <td className="py-1 font-mono">{row.password_plain}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {shown.length === 0 && (
          <p className="text-sm text-charcoal-500">No internship rosters imported yet.</p>
        )}
      </div>
    </main>
  );
}
