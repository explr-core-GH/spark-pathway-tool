import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { HollandHexagon } from "@/components/HollandHexagon";
import { RIASEC, type RIASECCode } from "@/lib/riasec";
import {
  AGE_BANDS,
  CAREER_CLUSTERS,
  CULMINATING_EVENTS,
  DIFFICULTIES,
  FORMAT_TYPES,
  ONET_SKILLS,
  OUTPUT_TYPES,
  RIASEC_LETTERS,
  SOCIAL_STRUCTURES,
  STORAGE_KEY,
  activitySum,
  computeRiasecProfile,
  emptyActivity,
  emptyProgram,
  exampleSeed,
  type Activity,
  type ActivityScore,
  type CareerCluster,
  type Program,
  type StoredState,
} from "@/lib/program-riasec";

export const Route = createFileRoute("/educator/admin/program-riasec")({
  head: () => ({ meta: [{ title: "Program RIASEC — Admin" }] }),
  component: ProgramRiasecPage,
});

type Tab = "programs" | "compare" | "reference";

function ProgramRiasecPage() {
  const [tab, setTab] = useState<Tab>("programs");
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredState;
        if (parsed.version === 1 && Array.isArray(parsed.programs)) {
          setPrograms(parsed.programs);
          setSelectedId(parsed.selectedId ?? parsed.programs[0]?.id ?? null);
          setHydrated(true);
          return;
        }
      }
    } catch {
      /* fall through to seed */
    }
    const seed = exampleSeed();
    setPrograms(seed);
    setSelectedId(seed[0]?.id ?? null);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 1, programs, selectedId } satisfies StoredState),
      );
    } catch { /* private mode etc. */ }
  }, [programs, selectedId, hydrated]);

  const selected = programs.find((p) => p.id === selectedId) ?? null;

  function updateSelected(mutator: (p: Program) => Program) {
    if (!selected) return;
    setPrograms((arr) => arr.map((p) => (p.id === selected.id ? mutator(p) : p)));
  }

  function addProgram() {
    const fresh = emptyProgram(`New program ${programs.length + 1}`);
    setPrograms((arr) => [...arr, fresh]);
    setSelectedId(fresh.id);
    setTab("programs");
  }

  function deleteProgram(id: string) {
    const remaining = programs.filter((p) => p.id !== id);
    setPrograms(remaining);
    if (selectedId === id) setSelectedId(remaining[0]?.id ?? null);
  }

  function resetToExamples() {
    if (!confirm("Replace all programs with the example set? This can't be undone.")) return;
    const seed = exampleSeed();
    setPrograms(seed);
    setSelectedId(seed[0]?.id ?? null);
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify({ version: 1, programs }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `program-riasec-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const data = JSON.parse(text);
        if (!data?.programs || !Array.isArray(data.programs)) {
          alert("This file doesn't look like a Program-RIASEC export.");
          return;
        }
        if (!confirm(
          `Import ${data.programs.length} program${data.programs.length === 1 ? "" : "s"}? Replaces your current set.`,
        )) return;
        setPrograms(data.programs);
        setSelectedId(data.programs[0]?.id ?? null);
      } catch (err) {
        alert(`Couldn't parse JSON: ${err instanceof Error ? err.message : err}`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  if (!hydrated) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-16 text-sm text-charcoal-500">
        Loading…
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <p className="eyebrow">Admin</p>
      <h1 className="display mt-2">Program-RIASEC coder</h1>
      <p className="lead mt-3 max-w-2xl">
        Score EXPLR programs by Holland interest dimension. Break a program
        into activities, rate each 0-3 across R/I/A/S/E/C, and the tool
        weights by time % and normalizes to a six-vector summing to 100%.
      </p>

      {/* Toolbar */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-charcoal-100 pb-3">
        <div className="flex gap-1">
          {(["programs", "compare", "reference"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="border-b-2 px-4 py-2 text-sm"
              style={{
                borderColor: tab === t ? "var(--ink)" : "transparent",
                color: tab === t ? "var(--ink)" : "var(--color-charcoal-400)",
              }}
            >
              {t === "programs" ? "Programs" : t === "compare" ? "Compare" : "Reference"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-ghost">
            Import JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onImportFile}
          />
          <button type="button" onClick={exportJson} className="btn-ghost">Export JSON</button>
          <button type="button" onClick={resetToExamples} className="btn-ghost">Reset to examples</button>
        </div>
      </div>

      {tab === "programs" && (
        <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
          <aside>
            <button onClick={addProgram} className="btn-mint w-full justify-center">+ New program</button>
            <ul className="mt-4 divide-y divide-charcoal-100 border-y border-charcoal-100">
              {programs.length === 0 && (
                <li className="py-4 text-sm text-charcoal-400">No programs yet.</li>
              )}
              {programs.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => setSelectedId(p.id)}
                    className="block w-full py-3 text-left"
                  >
                    <p
                      className="truncate text-sm font-medium"
                      style={{ color: selectedId === p.id ? "var(--ink)" : "inherit" }}
                    >
                      {p.name || "Untitled"}
                    </p>
                    <p className="mt-0.5 text-xs text-charcoal-500">
                      {p.ageBand || "—"} · {p.formatType || "—"}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          {selected ? (
            <ProgramEditor
              program={selected}
              onChange={updateSelected}
              onDelete={() => deleteProgram(selected.id)}
            />
          ) : (
            <div className="border border-dashed border-charcoal-200 p-10 text-center">
              <p className="text-sm text-charcoal-500">No program selected.</p>
              <button onClick={addProgram} className="btn-ink mt-4">+ New program</button>
            </div>
          )}
        </div>
      )}

      {tab === "compare" && <CompareTab programs={programs} />}
      {tab === "reference" && <ReferenceTab />}
    </main>
  );
}

// ---------- Program editor ----------

function ProgramEditor({
  program,
  onChange,
  onDelete,
}: {
  program: Program;
  onChange: (mutator: (p: Program) => Program) => void;
  onDelete: () => void;
}) {
  const profile = useMemo(() => computeRiasecProfile(program), [program]);
  const top = useMemo<RIASECCode | null>(() => {
    const entries = RIASEC_LETTERS.map((l) => [l, profile[l]] as const).sort((a, b) => b[1] - a[1]);
    return entries[0] && entries[0][1] > 0 ? entries[0][0] : null;
  }, [profile]);

  function set<K extends keyof Program>(key: K, value: Program[K]) {
    onChange((p) => ({ ...p, [key]: value }));
  }

  function toggleSecondaryCluster(c: CareerCluster) {
    onChange((p) => {
      const has = p.secondaryClusters.includes(c);
      return {
        ...p,
        secondaryClusters: has
          ? p.secondaryClusters.filter((x) => x !== c)
          : [...p.secondaryClusters, c],
      };
    });
  }

  function addActivity() {
    onChange((p) => ({ ...p, activities: [...p.activities, emptyActivity()] }));
  }
  function updateActivity(id: string, mutator: (a: Activity) => Activity) {
    onChange((p) => ({
      ...p,
      activities: p.activities.map((a) => (a.id === id ? mutator(a) : a)),
    }));
  }
  function removeActivity(id: string) {
    onChange((p) => ({ ...p, activities: p.activities.filter((a) => a.id !== id) }));
  }

  const totalTime = program.activities.reduce((s, a) => s + (a.timePct || 0), 0);

  return (
    <div className="space-y-10">
      {/* Identity + metadata */}
      <section className="border border-charcoal-100 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Program name">
            <input
              className="field"
              value={program.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </Field>
          <Field label="Program ID">
            <input className="field bg-charcoal-50 text-charcoal-500" value={program.id} readOnly />
          </Field>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="Age band"
            value={program.ageBand}
            onChange={(v) => set("ageBand", v as Program["ageBand"])}
            options={AGE_BANDS}
          />
          <Field label="Duration">
            <input
              className="field"
              placeholder="e.g. 5 days, 10 weeks"
              value={program.duration}
              onChange={(e) => set("duration", e.target.value)}
            />
          </Field>
          <Select
            label="Format type"
            value={program.formatType}
            onChange={(v) => set("formatType", v as Program["formatType"])}
            options={FORMAT_TYPES}
          />
          <Select
            label="Difficulty"
            value={program.difficulty}
            onChange={(v) => set("difficulty", v as Program["difficulty"])}
            options={DIFFICULTIES}
          />
          <Select
            label="Social structure"
            value={program.socialStructure}
            onChange={(v) => set("socialStructure", v as Program["socialStructure"])}
            options={SOCIAL_STRUCTURES}
          />
          <Select
            label="Output type"
            value={program.outputType}
            onChange={(v) => set("outputType", v as Program["outputType"])}
            options={OUTPUT_TYPES}
          />
          <Select
            label="Culminating event"
            value={program.culminatingEvent}
            onChange={(v) => set("culminatingEvent", v as Program["culminatingEvent"])}
            options={CULMINATING_EVENTS}
          />
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              checked={program.branchingPaths}
              onChange={(e) => set("branchingPaths", e.target.checked)}
            />
            <span className="text-charcoal-700">Branching paths</span>
          </label>
        </div>
        <Field label="Notes" className="mt-4">
          <textarea
            className="field"
            rows={2}
            value={program.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Field>
      </section>

      {/* Computed Holland profile + hexagon */}
      <section className="grid gap-6 md:grid-cols-2">
        <div className="border border-charcoal-100 p-5">
          <h3 className="text-sm font-semibold text-ink">Computed Holland profile</h3>
          {program.activities.length === 0 ? (
            <p className="mt-3 text-xs text-charcoal-400">
              Add activities below to compute a profile.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {RIASEC_LETTERS.map((l) => {
                const pct = profile[l];
                const d = RIASEC[l];
                return (
                  <li key={l}>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-semibold">
                        <span
                          className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
                          style={{ background: d.color }}
                        />
                        {l} · {d.name}
                      </span>
                      <span className="tabular-nums text-charcoal-500">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="mt-1 h-1.5 bg-charcoal-50">
                      <div
                        className="h-full"
                        style={{ background: d.color, width: `${Math.max(0, Math.min(100, pct))}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-center border border-charcoal-100 p-5">
          <HollandHexagon size={300} active={top} />
        </div>
      </section>

      {/* Activities */}
      <section className="border border-charcoal-100 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">Activities</h3>
          <button onClick={addActivity} className="btn-mint">+ Add activity</button>
        </div>
        {program.activities.length === 0 ? (
          <p className="mt-3 text-sm text-charcoal-500">
            Add the activities that make up this program, allocate time %, and rate each one 0-3
            across the six dimensions.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-charcoal-500">
                <tr>
                  <th className="py-2 pr-3 font-semibold">Activity</th>
                  <th className="px-2 py-2 font-semibold">Time %</th>
                  {RIASEC_LETTERS.map((l) => (
                    <th
                      key={l}
                      title={RIASEC[l].name}
                      className="px-1 py-2 text-center font-semibold"
                    >
                      {l}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center font-semibold">Sum</th>
                  <th className="pl-2" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {program.activities.map((a) => {
                  const sum = activitySum(a);
                  return (
                    <tr key={a.id} className="border-t border-charcoal-100 align-top">
                      <td className="py-2 pr-3">
                        <input
                          className="field h-8"
                          value={a.name}
                          placeholder="Activity name"
                          onChange={(e) => updateActivity(a.id, (x) => ({ ...x, name: e.target.value }))}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={a.timePct}
                          onChange={(e) =>
                            updateActivity(a.id, (x) => ({
                              ...x,
                              timePct: Number(e.target.value),
                            }))
                          }
                          className="field h-8 w-16 text-center tabular-nums"
                        />
                      </td>
                      {RIASEC_LETTERS.map((l) => (
                        <td key={l} className="px-1 py-2 text-center">
                          <input
                            type="number"
                            min={0}
                            max={3}
                            step={1}
                            value={a.scores[l]}
                            onChange={(e) =>
                              updateActivity(a.id, (x) => ({
                                ...x,
                                scores: {
                                  ...x.scores,
                                  [l]: Math.max(0, Math.min(3, Number(e.target.value))),
                                } as ActivityScore,
                              }))
                            }
                            className="field h-8 w-12 text-center tabular-nums"
                            style={{
                              borderColor: a.scores[l] > 0 ? RIASEC[l].color : undefined,
                            }}
                          />
                        </td>
                      ))}
                      <td className="px-2 py-2 text-center tabular-nums text-charcoal-500">{sum}</td>
                      <td className="pl-2 text-right">
                        <button
                          onClick={() => removeActivity(a.id)}
                          aria-label={`Delete ${a.name || a.id}`}
                          className="px-2 py-1 text-charcoal-400 hover:text-destructive"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-charcoal-200">
                  <td className="py-2 pr-3 text-xs font-semibold uppercase tracking-wider text-charcoal-500">
                    Total time
                  </td>
                  <td className="px-2 py-2 text-xs tabular-nums text-charcoal-700">{totalTime}%</td>
                  <td colSpan={8} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* Skills */}
      <section className="border border-charcoal-100 p-6">
        <h3 className="text-sm font-semibold text-ink">Top 5 skills built</h3>
        <p className="mt-1 text-xs text-charcoal-500">From the O*NET cross-functional skill list.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {program.topSkills.map((s, idx) => (
            <Select
              key={idx}
              label={`Skill ${idx + 1}`}
              value={s}
              onChange={(v) =>
                onChange((p) => ({
                  ...p,
                  topSkills: p.topSkills.map((cur, i) =>
                    i === idx ? (v as (typeof ONET_SKILLS)[number]) : cur,
                  ),
                }))
              }
              options={ONET_SKILLS}
            />
          ))}
        </div>
      </section>

      {/* Career clusters */}
      <section className="border border-charcoal-100 p-6">
        <h3 className="text-sm font-semibold text-ink">Career clusters</h3>
        <div className="mt-3">
          <Select
            label="Primary career cluster"
            value={program.primaryCluster}
            onChange={(v) => set("primaryCluster", v as CareerCluster)}
            options={CAREER_CLUSTERS}
          />
        </div>
        <p className="label mt-5">Secondary career clusters (multi-select)</p>
        <ul className="mt-1 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {CAREER_CLUSTERS.map((c) => {
            const on = program.secondaryClusters.includes(c);
            return (
              <li key={c}>
                <label
                  className={
                    on
                      ? "flex cursor-pointer items-start gap-2 border border-explr-500 bg-explr-50 px-2.5 py-2 text-sm"
                      : "flex cursor-pointer items-start gap-2 border border-charcoal-200 px-2.5 py-2 text-sm hover:border-charcoal-400"
                  }
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleSecondaryCluster(c)}
                    className="mt-0.5"
                  />
                  <span className="text-charcoal-700">{c}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Danger */}
      <section className="border-2 border-dashed border-red-200 bg-red-50 p-5">
        <h3 className="text-sm font-semibold text-red-900">Danger zone</h3>
        <p className="mt-1 text-sm text-red-800">
          Permanently delete this program from local storage. Export the JSON first if you might
          need it back.
        </p>
        <button
          onClick={() => {
            if (confirm(`Delete program "${program.name}"?`)) onDelete();
          }}
          className="mt-3 bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
        >
          Delete program
        </button>
      </section>
    </div>
  );
}

// ---------- Compare tab ----------

function CompareTab({ programs }: { programs: Program[] }) {
  if (programs.length === 0) {
    return <p className="mt-8 text-sm text-charcoal-500">Add at least one program to compare.</p>;
  }
  return (
    <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {programs.map((p) => {
        const profile = computeRiasecProfile(p);
        const sorted = RIASEC_LETTERS.slice().sort((a, b) => profile[b] - profile[a]);
        const code = sorted.slice(0, 3).join("");
        const top = sorted[0] && profile[sorted[0]] > 0 ? sorted[0] : null;
        return (
          <article key={p.id} className="border border-charcoal-100 p-5">
            <header className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{p.name || "Untitled"}</p>
                <p className="mt-0.5 text-xs text-charcoal-500">
                  {p.ageBand || "—"} · {p.formatType || "—"} · {p.duration || "—"}
                </p>
              </div>
              <span className="bg-charcoal-700 px-2 py-1 text-xs font-semibold tabular-nums text-white">
                {code || "—"}
              </span>
            </header>
            <div className="my-3 flex items-center justify-center">
              <HollandHexagon size={180} active={top} />
            </div>
            <ul className="space-y-1 text-xs">
              {RIASEC_LETTERS.map((l) => (
                <li key={l} className="flex items-center justify-between">
                  <span className="text-charcoal-600">
                    <span
                      className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle"
                      style={{ background: RIASEC[l].color }}
                    />
                    {RIASEC[l].name}
                  </span>
                  <span className="tabular-nums text-charcoal-500">{profile[l].toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          </article>
        );
      })}
    </div>
  );
}

// ---------- Reference tab ----------

function ReferenceTab() {
  return (
    <div className="mt-8 space-y-8">
      <section className="border border-charcoal-100 p-5">
        <h3 className="text-sm font-semibold text-ink">How the score works</h3>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-charcoal-700">
          <li>Break the program into activities — 3 to 12 is typical.</li>
          <li>Estimate each activity&apos;s relative time %. Doesn&apos;t have to sum to 100, but cleaner if it does.</li>
          <li>Rate each activity 0-3 on each RIASEC dimension. 0 = not present, 3 = central.</li>
          <li>The tool weights each activity&apos;s scores by its time %, sums across activities, normalizes to a 6-vector summing to 100%.</li>
          <li>Use the Holland hexagon for the top dimension at a glance.</li>
        </ol>
      </section>
      <section className="border border-charcoal-100 p-5">
        <h3 className="text-sm font-semibold text-ink">The six dimensions</h3>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {RIASEC_LETTERS.map((l) => {
            const d = RIASEC[l];
            return (
              <li key={l} className="border border-charcoal-100 p-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-sm font-semibold">{l} — {d.name}</span>
                </div>
                <p className="mt-1 text-xs italic text-charcoal-500">{d.hsPlainName}</p>
                <p className="mt-1 text-sm text-charcoal-700">{d.hsDescription}</p>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="border border-charcoal-100 p-5">
        <h3 className="text-sm font-semibold text-ink">Tips</h3>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-charcoal-700">
          <li>Rate the activity, not what you wish students did. Be honest.</li>
          <li>A single activity can score on multiple dimensions — a team build is Realistic (3) and Social (2).</li>
          <li>Use the Compare tab when scheduling a season — aim for variety across the six.</li>
          <li>Export the JSON regularly. The tool saves to browser local storage, so clearing cache wipes it.</li>
        </ul>
      </section>
    </div>
  );
}

// ---------- Small primitives ----------

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="label">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Select<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly T[];
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field mt-1"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
