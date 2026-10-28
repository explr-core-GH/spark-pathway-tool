import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import {
  createFamilyCode,
  listFamilyCodes,
  revokeFamilyCode,
  type FamilyCodeRow,
} from "@/lib/family.functions";
import {
  listMyGuardians,
  removeMyGuardian,
  type ConnectedGuardian,
} from "@/lib/family-account.functions";
import { RELATIONSHIP_LABEL } from "@/lib/family-account.schemas";

/**
 * Student-side family codes. Lives at the top of the "For families" tab.
 * A code is shown once, right after it's created; afterwards only its
 * label, dates, and a revoke button remain.
 */
export function FamilyCodePanel() {
  const [rows, setRows] = useState<FamilyCodeRow[]>([]);
  const [guardians, setGuardians] = useState<ConnectedGuardian[]>([]);
  const [fresh, setFresh] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const [codes, people] = await Promise.all([listFamilyCodes(), listMyGuardians()]);
      setRows(codes);
      setGuardians(people);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { code } = await createFamilyCode({ data: { label: label.trim() || undefined } });
      setFresh(code);
      setLabel("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setBusy(true);
    try {
      await revokeFamilyCode({ data: { id } });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function removeGuardian(guardianId: string) {
    setBusy(true);
    try {
      await removeMyGuardian({ data: { guardianId } });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const active = rows.filter((r) => !r.revokedAt && new Date(r.expiresAt) > new Date());

  return (
    <section className="mt-6 rounded-[var(--radius-card)] border border-mint-soft bg-mint-tint/60 p-5">
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border border-mint-soft bg-paper-raised text-green-deep">
          <KeyRound className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
        </span>
        <div>
          <p className="eyebrow text-green-deep">Share with a grown-up</p>
          <h2 className="mt-1 font-display text-xl font-semibold">Family code</h2>
        </div>
      </div>
      <p className="mt-1 text-sm text-ink-700">
        Make a code and give it to a parent or caregiver. They enter it at{" "}
        <span className="font-mono">explrpathways.org/family</span> to see your results, no account
        needed. Codes last 90 days and you can turn one off any time.
      </p>

      {fresh && (
        <div
          role="status"
          className="mt-4 rounded-[var(--radius-control)] border-2 border-emerald bg-paper-raised p-4"
        >
          <p className="eyebrow text-green">Your new code · write it down, it only shows once</p>
          <p className="mt-1 font-display text-3xl font-bold tracking-wide">{fresh}</p>
        </div>
      )}

      <form onSubmit={create} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="label" htmlFor="family-code-label">
            Who is it for? <span className="text-ink-500">(optional)</span>
          </label>
          <input
            id="family-code-label"
            className="field"
            value={label}
            maxLength={40}
            placeholder="Mom, Abuela, Coach J…"
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <button type="submit" disabled={busy} className="btn-ink">
          {busy ? "Working…" : "Make a code"}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {active.length > 0 && (
        <ul className="mt-4 divide-y divide-line text-sm">
          {active.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                <span className="font-medium">{r.label || "Family code"}</span>
                <span className="text-ink-500">
                  {" "}
                  · made {new Date(r.createdAt).toLocaleDateString()} · expires{" "}
                  {new Date(r.expiresAt).toLocaleDateString()}
                  {r.lastUsedAt
                    ? ` · used ${new Date(r.lastUsedAt).toLocaleDateString()}`
                    : " · not used yet"}
                </span>
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => revoke(r.id)}
                className="ink-link inline-flex min-h-[44px] items-center"
              >
                Turn off
                <span className="sr-only"> code for {r.label || "family"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-6 font-display text-lg font-semibold">Who's connected</h3>
      {guardians.length === 0 ? (
        <p className="mt-1 text-sm text-ink-700">
          No family accounts are linked to your passport yet.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-line text-sm">
          {guardians.map((g) => (
            <li
              key={g.guardianId}
              className="flex flex-wrap items-center justify-between gap-2 py-2"
            >
              <span>
                <span className="font-medium">{g.fullName}</span>
                <span className="text-ink-500">
                  {" "}
                  · {RELATIONSHIP_LABEL[g.relationship]} · linked{" "}
                  {new Date(g.linkedAt).toLocaleDateString()}
                </span>
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => removeGuardian(g.guardianId)}
                className="ink-link inline-flex min-h-[44px] items-center"
              >
                Remove
                <span className="sr-only"> {g.fullName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
