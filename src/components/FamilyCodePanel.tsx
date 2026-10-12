import { useEffect, useState } from "react";
import {
  createFamilyCode,
  listFamilyCodes,
  revokeFamilyCode,
  type FamilyCodeRow,
} from "@/lib/family.functions";

/**
 * Student-side family codes. Lives at the top of the "For families" tab.
 * A code is shown once, right after it's created; afterwards only its
 * label, dates, and a revoke button remain.
 */
export function FamilyCodePanel() {
  const [rows, setRows] = useState<FamilyCodeRow[]>([]);
  const [fresh, setFresh] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setRows(await listFamilyCodes());
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

  const active = rows.filter((r) => !r.revokedAt && new Date(r.expiresAt) > new Date());

  return (
    <section className="mt-6 rounded-[var(--radius-card)] border border-line bg-mint-tint/60 p-5">
      <p className="eyebrow text-green-deep">Share with a grown-up</p>
      <h2 className="mt-1 font-display text-xl font-semibold">Family code</h2>
      <p className="mt-1 text-sm text-ink-700">
        Make a code and give it to a parent or caregiver. They enter it at{" "}
        <span className="font-mono">explrpathways.org/family</span> to see your results, no account
        needed. Codes last 90 days and you can turn one off any time.
      </p>

      {fresh && (
        <div className="mt-4 rounded-[var(--radius-control)] border-2 border-emerald bg-paper-raised p-4">
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
        <p role="alert" className="mt-3 text-sm text-destructive">
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
                className="ink-link"
              >
                Turn off
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
