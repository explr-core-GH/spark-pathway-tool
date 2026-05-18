import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { PROGRAM_TYPES, PROGRAM_META, type ProgramType } from "@/lib/educator";
import { SchoolSearch, type SchoolPick } from "@/components/SchoolSearch";
import { GradeLevelPicker, GRADE_LABEL } from "@/components/GradeLevelPicker";

export const Route = createFileRoute("/educator/admin/programs")({
  head: () => ({ meta: [{ title: "Programs — Admin" }] }),
  component: ProgramsAdmin,
});

type Program = {
  id: string;
  name: string;
  program_type: ProgramType;
  grade_band: string | null;
  description: string | null;
  school_irn: string | null;
  school_name: string | null;
  student_count: number | null;
  grade_levels: number[] | null;
  created_at: string;
};

type Educator = { id: string; full_name: string; email: string };
type Assignment = { program_id: string; educator_id: string };

function ProgramsAdmin() {
  const { user } = useSession();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [educators, setEducators] = useState<Educator[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  // create form
  const [name, setName] = useState("");
  const [pt, setPt] = useState<ProgramType>("stem");
  const [gradeBand, setGradeBand] = useState("");
  const [desc, setDesc] = useState("");
  const [school, setSchool] = useState<SchoolPick | null>(null);
  const [studentCount, setStudentCount] = useState<string>("");
  const [gradeLevels, setGradeLevels] = useState<number[]>([]);

  async function load() {
    const [{ data: progs }, { data: educs }, { data: assigns }] = await Promise.all([
      supabase.from("programs").select("*").order("created_at", { ascending: false }),
      supabase.from("educators").select("id, full_name, email").eq("approved", true).order("full_name"),
      supabase.from("program_educators").select("program_id, educator_id"),
    ]);
    setPrograms((progs ?? []) as Program[]);
    setEducators((educs ?? []) as Educator[]);
    setAssignments((assigns ?? []) as Assignment[]);
  }
  useEffect(() => { load(); }, []);

  async function createProgram(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const sc = studentCount.trim() === "" ? null : Math.max(0, parseInt(studentCount, 10) || 0);
    const { error } = await supabase.from("programs").insert({
      name: name.trim(),
      program_type: pt,
      grade_band: gradeBand.trim() || null,
      description: desc.trim() || null,
      created_by: user?.id ?? null,
      school_irn: school?.irn ?? null,
      school_name: school?.name ?? null,
      student_count: sc,
      grade_levels: gradeLevels.length > 0 ? gradeLevels : null,
    });
    if (error) { alert(error.message); return; }
    setName(""); setGradeBand(""); setDesc("");
    setSchool(null); setStudentCount(""); setGradeLevels([]);
    await load();
  }

  async function deleteProgram(id: string) {
    if (!confirm("Delete program and all its assignments?")) return;
    await supabase.from("program_educators").delete().eq("program_id", id);
    await supabase.from("programs").delete().eq("id", id);
    if (selected === id) setSelected(null);
    await load();
  }

  async function toggleEducator(programId: string, educatorId: string) {
    const has = assignments.some((a) => a.program_id === programId && a.educator_id === educatorId);
    if (has) {
      await supabase.from("program_educators").delete()
        .eq("program_id", programId).eq("educator_id", educatorId);
    } else {
      await supabase.from("program_educators").insert({ program_id: programId, educator_id: educatorId });
    }
    await load();
  }

  const selectedProg = programs.find((p) => p.id === selected) ?? null;
  const assignedSet = new Set(
    assignments.filter((a) => a.program_id === selected).map((a) => a.educator_id),
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <p className="eyebrow">Admin</p>
      <h1 className="display mt-2">Programs</h1>
      <p className="lead mt-3">Create programs and assign educators. Assignments scope what each educator sees.</p>

      <form onSubmit={createProgram} className="mt-10 grid gap-4 border border-charcoal-100 p-6 md:grid-cols-[2fr_1fr_1fr_auto]">
        <div>
          <label className="label">Program name</label>
          <input className="field mt-1" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Lincoln HS Robotics 2026" />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="field mt-1" value={pt} onChange={(e) => setPt(e.target.value as ProgramType)}>
            {PROGRAM_TYPES.map((p) => <option key={p} value={p}>{PROGRAM_META[p].label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Grade band (display)</label>
          <input className="field mt-1" value={gradeBand} onChange={(e) => setGradeBand(e.target.value)} placeholder="9-12" />
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn-ink w-full">Create</button>
        </div>

        {/* School + roster size + grade levels — feed the admin demographics dashboard */}
        <div className="md:col-span-4">
          <label className="label">School (Ohio Dept of Ed directory)</label>
          <div className="mt-1">
            <SchoolSearch
              initial={school}
              onSelect={setSchool}
              placeholder="Search Ohio schools by name, district, or city"
            />
          </div>
        </div>
        <div>
          <label className="label">Number of students</label>
          <input
            type="number"
            min={0}
            className="field mt-1"
            value={studentCount}
            onChange={(e) => setStudentCount(e.target.value)}
            placeholder="e.g. 24"
          />
        </div>
        <div className="md:col-span-3">
          <label className="label">Grade levels</label>
          <div className="mt-1">
            <GradeLevelPicker value={gradeLevels} onChange={setGradeLevels} />
          </div>
        </div>

        <div className="md:col-span-4">
          <label className="label">Description (optional)</label>
          <textarea className="field mt-1" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
      </form>

      <div className="mt-12 grid gap-8 md:grid-cols-[1fr_1fr]">
        <div>
          <h2 className="eyebrow">Programs</h2>
          <ul className="mt-4 divide-y divide-charcoal-100 border-y border-charcoal-100">
            {programs.map((p) => {
              const count = assignments.filter((a) => a.program_id === p.id).length;
              return (
                <li key={p.id} className="flex items-center gap-3 py-3">
                  <button onClick={() => setSelected(p.id)} className="flex-1 text-left">
                    <p className="text-sm font-medium" style={{ color: selected === p.id ? "var(--ink)" : "inherit" }}>{p.name}</p>
                    <p className="text-xs text-charcoal-500">
                      {PROGRAM_META[p.program_type]?.label ?? p.program_type}
                      {p.grade_band ? ` · ${p.grade_band}` : ""} · {count} educator{count === 1 ? "" : "s"}
                    </p>
                    {(p.school_name || p.student_count != null || (p.grade_levels && p.grade_levels.length > 0)) && (
                      <p className="text-xs text-charcoal-400 mt-0.5">
                        {p.school_name && <>🏫 {p.school_name}</>}
                        {p.student_count != null && <> · {p.student_count} student{p.student_count === 1 ? "" : "s"}</>}
                        {p.grade_levels && p.grade_levels.length > 0 && (
                          <> · {p.grade_levels.map((g) => GRADE_LABEL[g]).join(", ")}</>
                        )}
                      </p>
                    )}
                  </button>
                  <button onClick={() => deleteProgram(p.id)} className="text-xs text-red-600 hover:underline">Delete</button>
                </li>
              );
            })}
            {programs.length === 0 && <li className="py-6 text-sm text-charcoal-500">No programs yet.</li>}
          </ul>
        </div>

        <div>
          <h2 className="eyebrow">{selectedProg ? `Educators · ${selectedProg.name}` : "Pick a program"}</h2>
          {selectedProg ? (
            <ul className="mt-4 divide-y divide-charcoal-100 border-y border-charcoal-100">
              {educators.map((e) => {
                const checked = assignedSet.has(e.id);
                return (
                  <li key={e.id} className="flex items-center gap-3 py-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleEducator(selectedProg.id, e.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{e.full_name}</p>
                      <p className="text-xs text-charcoal-500 truncate">{e.email}</p>
                    </div>
                  </li>
                );
              })}
              {educators.length === 0 && (
                <li className="py-6 text-sm text-charcoal-500">No approved educators yet. Invite some first.</li>
              )}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-charcoal-500">Select a program from the list to manage its educators.</p>
          )}
        </div>
      </div>
    </main>
  );
}
