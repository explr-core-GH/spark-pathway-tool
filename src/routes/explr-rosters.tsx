import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { RoleGuard } from "@/components/RoleGuard";
import {
  getExplrCamps,
  getExplrRoster,
  getExplrWaitlist,
  type ExplrCamp,
  type ExplrRosterEntry,
} from "@/lib/explr";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/explr-rosters")({
  head: () => ({ meta: [{ title: "EXPLR Rosters — Admin" }] }),
  component: () => (
    <RoleGuard requires="admin">
      <ExplrRostersPage />
    </RoleGuard>
  ),
});

function campLabel(c: ExplrCamp): string {
  const title = c.title ?? c.name ?? c.id;
  const date = c.date ? ` — ${c.date}` : "";
  return `${title}${date}`;
}

function ExplrRostersPage() {
  const [camps, setCamps] = useState<ExplrCamp[]>([]);
  const [campsErr, setCampsErr] = useState<string | null>(null);
  const [campsLoading, setCampsLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string>("");
  const [roster, setRoster] = useState<ExplrRosterEntry[]>([]);
  const [waitlist, setWaitlist] = useState<ExplrRosterEntry[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterErr, setRosterErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCampsLoading(true);
    getExplrCamps()
      .then((c) => {
        if (cancelled) return;
        setCamps(c);
        if (c[0]?.id) setSelectedId(String(c[0].id));
      })
      .catch((e) => !cancelled && setCampsErr(e.message ?? String(e)))
      .finally(() => !cancelled && setCampsLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setRosterLoading(true);
    setRosterErr(null);
    Promise.all([getExplrRoster(selectedId), getExplrWaitlist(selectedId)])
      .then(([r, w]) => {
        if (cancelled) return;
        setRoster(r);
        setWaitlist(w);
      })
      .catch((e) => !cancelled && setRosterErr(e.message ?? String(e)))
      .finally(() => !cancelled && setRosterLoading(false));
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const columns = useMemo(() => {
    const set = new Set<string>();
    [...roster, ...waitlist].forEach((row) => Object.keys(row).forEach((k) => set.add(k)));
    // Prefer common columns first
    const preferred = [
      "child_name",
      "child_age",
      "parent_name",
      "parent_email",
      "parent_phone",
      "status",
      "medical_notes",
    ];
    const ordered = preferred.filter((k) => set.has(k));
    const extras = [...set].filter((k) => !preferred.includes(k) && k !== "id");
    return [...ordered, ...extras];
  }, [roster, waitlist]);

  return (
    <main className="mx-auto max-w-[1312px] space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <header>
        <p className="eyebrow">Admin</p>
        <h1 className="display mt-2">EXPLR Rosters</h1>
        <p className="lead mt-3 max-w-2xl">
          Live view of rosters and waitlists from the EXPLR backend. Roster data contains PII —
          admin-only.
        </p>
      </header>

      <section className="max-w-xl space-y-2">
        <label className="label" htmlFor="camp-select">
          Camp
        </label>
        {campsLoading ? (
          <p className="text-sm text-ink-500">Loading camps…</p>
        ) : campsErr ? (
          <p className="text-sm text-red-700">Failed to load camps: {campsErr}</p>
        ) : (
          <select
            id="camp-select"
            className="field"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {camps.length === 0 && <option value="">No camps returned</option>}
            {camps.map((c) => (
              <option key={String(c.id)} value={String(c.id)}>
                {campLabel(c)}
              </option>
            ))}
          </select>
        )}
      </section>

      {rosterErr && <p className="text-sm text-red-700">Error: {rosterErr}</p>}

      <RosterTable
        title={`Roster (${roster.length})`}
        rows={roster}
        columns={columns}
        loading={rosterLoading}
      />
      <RosterTable
        title={`Waitlist (${waitlist.length})`}
        rows={waitlist}
        columns={columns}
        loading={rosterLoading}
      />
    </main>
  );
}

function RosterTable({
  title,
  rows,
  columns,
  loading,
}: {
  title: string;
  rows: ExplrRosterEntry[];
  columns: string[];
  loading: boolean;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      {loading ? (
        <p className="text-sm text-ink-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink-500">No entries.</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-paper-raised">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => (
                  <TableHead key={c}>{c}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={(row.id as string) ?? i}>
                  {columns.map((c) => {
                    const v = row[c];
                    const display =
                      v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
                    return <TableCell key={c}>{display}</TableCell>;
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
