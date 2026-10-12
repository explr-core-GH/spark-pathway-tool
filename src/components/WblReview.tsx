import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import type { Opportunity } from "@/lib/opportunities";
import { EXPERIENCE_TYPE_BY_KEY, STAGES } from "@/lib/wbl-taxonomy";
import { EMPTY_GATE, gatePasses, hydrateWbl, type GateEvidence } from "@/lib/wbl-gate";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);

/** "EXPLR-endorsed" badge: only when the gate passed. */
export function GateBadge({ o }: { o: Opportunity }) {
  if (o.gate_status === "pass") {
    return (
      <span className="rounded-full border border-explr-600 bg-explr-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-explr-800">
        EXPLR-endorsed
      </span>
    );
  }
  if (o.gate_status === "fail") {
    return (
      <span className="rounded-full border border-charcoal-200 bg-charcoal-50 px-2 py-0.5 text-[10px] uppercase tracking-wider text-charcoal-500">
        Exposure · not EXPLR-endorsed
      </span>
    );
  }
  return null;
}

/** What a student or family needs to decide: pay, hours, mentor, getting there, what to bring. */
export function WblPublicSection({ o }: { o: Opportunity }) {
  const w = hydrateWbl(o.wbl);
  const t = o.experience_type ? EXPERIENCE_TYPE_BY_KEY[o.experience_type] : null;
  const rows: Array<[string, string]> = [];
  if (o.stage)
    rows.push([
      "Stage",
      `${STAGES[o.stage].label}${t ? ` · ${t.label}` : ""}${t?.ohioFormalWbl ? " · counts toward Ohio's 250 hours once stamped" : ""}`,
    ]);
  if (w.compensation.type)
    rows.push([
      "Pay",
      w.compensation.type === "paid"
        ? `Paid${w.compensation.hourlyRate ? ` · $${w.compensation.hourlyRate}/hr` : ""}`
        : w.compensation.type,
    ]);
  if (w.schedule.totalHours)
    rows.push([
      "Hours",
      `${w.schedule.totalHours} total${w.schedule.weeklyHours ? ` · ${w.schedule.weeklyHours}/week` : ""}`,
    ]);
  if (w.schedule.modality) rows.push(["Format", w.schedule.modality.replace("_", " ")]);
  if (w.mentor.name)
    rows.push(["Mentor", `${w.mentor.name}${w.mentor.title ? `, ${w.mentor.title}` : ""}`]);
  if (w.legal.minAge) rows.push(["Minimum age", w.legal.minAge]);
  if (w.site.transportationNotes) rows.push(["Getting there", w.site.transportationNotes]);
  if (w.site.dressCode) rows.push(["Dress", w.site.dressCode]);
  if (w.site.vaccinations) rows.push(["Health requirements", w.site.vaccinations]);
  if (w.site.safetyEquipment) rows.push(["Safety equipment", w.site.safetyEquipment]);
  if (w.site.accessibilityNotes) rows.push(["Accessibility", w.site.accessibilityNotes]);
  if (w.site.other) rows.push(["Good to know", w.site.other]);
  const skills = o.target_competencies ?? [];
  if (rows.length === 0 && skills.length === 0 && !w.work.positionDescription) return null;
  return (
    <section className="mt-6">
      <p className="text-xs uppercase tracking-wider text-charcoal-400">What you need to know</p>
      {w.work.positionDescription && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-charcoal-700">
          {w.work.positionDescription}
        </p>
      )}
      {w.work.duties.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-sm text-charcoal-700">
          {w.work.duties.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
      {rows.length > 0 && (
        <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs uppercase tracking-wider text-charcoal-400">{k}</dt>
              <dd className="mt-0.5 text-charcoal-700">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {skills.length > 0 && (
        <p className="mt-3 text-sm text-charcoal-700">
          <span className="text-xs uppercase tracking-wider text-charcoal-400">
            Skills you'll practice ·{" "}
          </span>
          {skills.join(", ")}
        </p>
      )}
    </section>
  );
}

/** Admin: review the WBL detail and decide the EXPLR gate. */
export function GatePanel({ o, onDone }: { o: Opportunity; onDone: () => void }) {
  const { user } = useSession();
  const [g, setG] = useState<GateEvidence>({
    ...EMPTY_GATE,
    ...((o.gate_evidence as Partial<GateEvidence>) ?? {}),
  });
  const [busy, setBusy] = useState(false);
  const w = hydrateWbl(o.wbl);
  const verdict = gatePasses(g);
  const set = (k: keyof GateEvidence, v: string | boolean) => setG((x) => ({ ...x, [k]: v }));

  async function save(status: "pass" | "fail" | "pending") {
    setBusy(true);
    await sb("opportunities")
      .update({
        gate_status: status,
        gate_evidence: g,
        gate_reviewed_at: new Date().toISOString(),
        gate_reviewed_by: user?.id ?? null,
      })
      .eq("id", o.id);
    setBusy(false);
    onDone();
  }

  return (
    <div className="mt-4 rounded border border-charcoal-200 bg-white p-4 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
        EXPLR gate · currently {o.gate_status ?? "pending"}
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-charcoal-700">
        <div>
          <dt className="uppercase tracking-wider text-charcoal-400">Stage · type</dt>
          <dd>
            {o.stage ? STAGES[o.stage].label : "—"}
            {o.experience_type
              ? ` · ${EXPERIENCE_TYPE_BY_KEY[o.experience_type]?.label ?? o.experience_type}`
              : ""}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-charcoal-400">Mentor</dt>
          <dd>{w.mentor.name ? `${w.mentor.name} · ${w.mentor.email}` : "—"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-charcoal-400">Pay · hours</dt>
          <dd>
            {[
              w.compensation.type || null,
              w.compensation.hourlyRate ? `$${w.compensation.hourlyRate}/hr` : null,
              w.schedule.totalHours ? `${w.schedule.totalHours} hrs` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-charcoal-400">Legal</dt>
          <dd>
            {[
              w.legal.workersComp ? "WC ✓" : "WC ·",
              w.legal.liabilityInsurance ? "Liability ✓" : "Liability ·",
              w.legal.hazardous.length ? `${w.legal.hazardous.length} HO flagged` : "no HO",
            ].join(" · ")}
          </dd>
        </div>
      </dl>
      {w.work.positionDescription && (
        <p className="mt-2 whitespace-pre-wrap text-xs text-charcoal-700">
          {w.work.positionDescription}
        </p>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-xs">
          SOC code or cluster
          <input
            className="field mt-1"
            value={g.socCode}
            onChange={(e) => set("socCode", e.target.value)}
            placeholder="e.g. 29-2061"
          />
        </label>
        <label className="text-xs">
          Demand citation
          <input
            className="field mt-1"
            value={g.demandCitation}
            onChange={(e) => set("demandCitation", e.target.value)}
            placeholder="Ohio Top Jobs 2026 · In-Demand"
          />
        </label>
        <label className="text-xs">
          Entry wage
          <input
            className="field mt-1"
            value={g.entryWage}
            onChange={(e) => set("entryWage", e.target.value)}
            placeholder="$22.10/hr"
          />
        </label>
        <label className="text-xs">
          Wage source
          <input
            className="field mt-1"
            value={g.wageSource}
            onChange={(e) => set("wageSource", e.target.value)}
            placeholder="OhioMeansJobs / BLS OES Cleveland"
          />
        </label>
        <label className="text-xs sm:col-span-2">
          Progression example
          <input
            className="field mt-1"
            value={g.progressionExample}
            onChange={(e) => set("progressionExample", e.target.value)}
            placeholder="Pharmacy tech → certified tech → lead → pharmacy manager"
          />
        </label>
        <label className="flex items-start gap-2 text-xs sm:col-span-2">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={g.realWorkReviewed}
            onChange={(e) => set("realWorkReviewed", e.target.checked)}
          />
          <span>
            I reviewed the position description: these are the occupation's real tasks, not generic
            chores.
          </span>
        </label>
        <label className="text-xs sm:col-span-2">
          Note
          <input
            className="field mt-1"
            value={g.note}
            onChange={(e) => set("note", e.target.value)}
          />
        </label>
      </div>
      {!verdict.pass && (
        <ul className="mt-2 list-disc pl-5 text-xs text-amber-800">
          {verdict.why.map((w2) => (
            <li key={w2}>{w2}</li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !verdict.pass}
          onClick={() => save("pass")}
          className="btn-ink text-xs disabled:opacity-50"
        >
          Pass gate · EXPLR-endorsed
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => save("fail")}
          className="btn-ghost text-xs"
        >
          Fail gate · list as exposure
        </button>
        {o.gate_status !== "pending" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => save("pending")}
            className="text-xs text-charcoal-500 hover:text-ink"
          >
            Reset to pending
          </button>
        )}
      </div>
    </div>
  );
}
