import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RIASEC, type RIASECCode } from "@/lib/riasec";
import { HollandHexagon } from "@/components/HollandHexagon";

export const Route = createFileRoute("/educator/admin/program-riasec")({
  head: () => ({ meta: [{ title: "Program RIASEC — Admin" }] }),
  component: ProgramRiasec,
});

const STORAGE_KEY = "explr.program-riasec.scores.v1";
const TABS = ["Score", "Saved programs", "Export"] as const;
type Tab = (typeof TABS)[number];

type Score = { name: string; values: Record<RIASECCode, number>; savedAt: string };

function ProgramRiasec() {
  const [tab, setTab] = useState<Tab>("Score");
  const [name, setName] = useState("");
  const [values, setValues] = useState<Record<RIASECCode, number>>({ R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 });
  const [scores, setScores] = useState<Score[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setScores(JSON.parse(raw));
    } catch {}
  }, []);

  function save() {
    if (!name.trim()) return;
    const next = [...scores, { name: name.trim(), values, savedAt: new Date().toISOString() }];
    setScores(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setName("");
    setValues({ R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 });
  }

  function remove(idx: number) {
    const next = scores.filter((_, i) => i !== idx);
    setScores(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  const top: RIASECCode | null = (Object.entries(values).sort((a, b) => b[1] - a[1])[0]?.[0] as RIASECCode) || null;
  const topActive = (top && values[top] > 0) ? top : null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <p className="eyebrow">Admin</p>
      <h1 className="mt-3 text-4xl font-light">Program RIASEC coder</h1>
      <p className="lead mt-3">Score EXPLR programs by RIASEC dimension. Saved locally in this browser.</p>

      <div className="mt-10 flex gap-1 border-b border-charcoal-100">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="border-b-2 px-4 py-2 text-sm"
            style={{ borderColor: tab === t ? "var(--ink)" : "transparent", color: tab === t ? "var(--ink)" : "var(--color-charcoal-400)" }}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Score" && (
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <div><label className="label">Program name</label><input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. BoxCraft" /></div>
            {(Object.values(RIASEC)).map((d) => (
              <div key={d.code}>
                <div className="flex items-baseline justify-between">
                  <label className="label" style={{ color: d.color }}>{d.code} · {d.name}</label>
                  <span className="text-sm tabular-nums text-charcoal-500">{values[d.code]}</span>
                </div>
                <input type="range" min={0} max={5} step={1}
                  value={values[d.code]}
                  onChange={(e) => setValues({ ...values, [d.code]: Number(e.target.value) })}
                  className="w-full accent-current" style={{ color: d.color }} />
              </div>
            ))}
            <button onClick={save} className="btn-ink">Save program</button>
          </div>
          <div className="flex flex-col items-center"><HollandHexagon size={300} active={topActive} /></div>
        </div>
      )}

      {tab === "Saved programs" && (
        <div className="mt-8 divide-y divide-charcoal-100 border-y border-charcoal-100">
          {scores.length === 0 && <p className="py-6 text-sm text-charcoal-400">No programs saved yet.</p>}
          {scores.map((s, idx) => (
            <div key={idx} className="flex items-baseline justify-between gap-4 py-3 text-sm">
              <span className="font-medium">{s.name}</span>
              <span className="font-mono text-xs text-charcoal-500">
                R{s.values.R} I{s.values.I} A{s.values.A} S{s.values.S} E{s.values.E} C{s.values.C}
              </span>
              <button onClick={() => remove(idx)} className="text-xs text-destructive">remove</button>
            </div>
          ))}
        </div>
      )}

      {tab === "Export" && (
        <div className="mt-8">
          <p className="text-sm text-charcoal-500">JSON export of all saved scores. Copy and paste anywhere.</p>
          <textarea className="field mt-4 min-h-[300px] font-mono text-xs" readOnly value={JSON.stringify(scores, null, 2)} />
        </div>
      )}
    </main>
  );
}
