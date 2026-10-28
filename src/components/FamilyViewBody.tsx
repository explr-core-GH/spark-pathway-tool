import { useState } from "react";
import { Check, Circle } from "lucide-react";
import { Stamp } from "@/components/passport";
import { FamilyResults, type FamilyResultsData } from "@/components/FamilyPortal";
import { FamilyCareers } from "@/components/careers/FamilyCareers";
import type { FamilyView } from "@/lib/family.functions";

/** One sign-off on the family view: a mint check when done, a hollow dot when not. */
function AckMark({ label, on }: { label: string; on: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`grid h-5 w-5 place-items-center rounded-full ${
          on ? "bg-green text-paper-raised" : "border border-line-strong text-ink-500"
        }`}
        aria-hidden
      >
        {on ? <Check className="h-3 w-3" strokeWidth={3} /> : <Circle className="h-1.5 w-1.5" />}
      </span>
      {label}
      <span className="sr-only">{on ? " signed" : " not yet signed"}</span>
    </span>
  );
}

/**
 * The family passport view (plan and sign-offs, stamped experiences,
 * careers, results). Shared by the family-code view and guardian accounts.
 * When `askName` is false the sign-off doesn't ask for a name (the account
 * already knows who the guardian is).
 */
export function FamilyViewBody({
  view,
  askName,
  onSign,
  intro,
}: {
  view: FamilyView;
  askName: boolean;
  onSign: (name: string) => Promise<void>;
  intro: React.ReactNode;
}) {
  const [ackName, setAckName] = useState("");
  const [ackBusy, setAckBusy] = useState(false);
  const data: FamilyResultsData = { riasec: view.riasec, stemDone: view.stemDone };

  async function sign(e: React.FormEvent) {
    e.preventDefault();
    setAckBusy(true);
    try {
      await onSign(ackName.trim());
    } finally {
      setAckBusy(false);
    }
  }

  return (
    <>
      <p className="eyebrow text-green">Family view · grade {view.grade ?? "?"}</p>
      <h1 className="display mt-2">{view.firstName}'s passport</h1>
      <p className="mt-3 text-sm text-ink-700">{intro}</p>
      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-5">
          <p className="eyebrow text-green">This year's plan · {view.plan.schoolYear}</p>
          <ul className="mt-2 text-sm text-ink-700">
            {view.plan.checkpoints.length === 0 && <li>No checkpoints opened yet.</li>}
            {view.plan.checkpoints.map((c) => (
              <li key={c.term}>
                {c.term === "fall" ? "Fall" : "Spring"} checkpoint: {c.status}
                {c.submittedAt ? ` (${new Date(c.submittedAt).toLocaleDateString()})` : ""}
              </li>
            ))}
          </ul>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-700">
            <span>Sign-offs:</span>
            <AckMark label="student" on={!!view.plan.studentAckAt} />
            <AckMark label="family" on={!!view.plan.guardianAckAt} />
            <AckMark label="advisor" on={!!view.plan.advisorAckAt} />
          </p>
          {!view.plan.guardianAckAt ? (
            <form onSubmit={sign} className="mt-3 flex flex-wrap items-end gap-2">
              {askName && (
                <div className="min-w-[180px] flex-1">
                  <label className="label" htmlFor="ack-name">
                    Your name
                  </label>
                  <input
                    id="ack-name"
                    className="field"
                    required
                    maxLength={120}
                    value={ackName}
                    onChange={(e) => setAckName(e.target.value)}
                  />
                </div>
              )}
              <button type="submit" disabled={ackBusy} className="btn-ink">
                {ackBusy ? "Signing…" : "I reviewed this plan with my student"}
              </button>
            </form>
          ) : (
            <p role="status" className="mt-2 text-xs text-ink-500">
              Thank you. Your sign-off is recorded for {view.plan.schoolYear}.
            </p>
          )}
        </div>
        <div className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-5">
          <p className="eyebrow text-green">Stamped experiences</p>
          {view.verified.length === 0 ? (
            <p className="mt-2 text-sm text-ink-700">
              Nothing verified yet. When a supervisor stamps an experience, it shows here.
            </p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2 text-sm">
              {view.verified.map((v, i) => (
                <li key={i} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <strong>{v.title}</strong>
                    {v.organization ? ` · ${v.organization}` : ""}
                    {v.hours != null ? ` · ${v.hours} hrs` : ""}
                  </span>
                  <Stamp label="Verified" rotate={0} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      {view.riasec?.hollandCode && (
        <FamilyCareers code={view.riasec.hollandCode} firstName={view.firstName} />
      )}
      <FamilyResults data={data} grade={view.grade} showCareers={false} />
    </>
  );
}
