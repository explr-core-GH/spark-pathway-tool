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
    [...roster, ...waitlist].forEach((row) =>
      Object.keys(row).forEach((k) => set.add(k)),
    );
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
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold">EXPLR Rosters</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live view of rosters and waitlists from the EXPLR backend. Roster data
          contains PII — admin-only.
        </p>
      </header>

      <section className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="camp-select">
          Camp
        </label>
        {campsLoading ? (
          <p className="text-sm text-muted-foreground">Loading camps…</p>
        ) : campsErr ? (
          <p className="text-sm text-destructive">Failed to load camps: {campsErr}</p>
        ) : (
          <select
            id="camp-select"
            className="w-full max-w-xl rounded border border-input bg-background px-3 py-2 text-sm"
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

      {rosterErr && (
        <p className="text-sm text-destructive">Error: {rosterErr}</p>
      )}

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
    </div>
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
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No entries.</p>
      ) : (
        <div className="rounded border">
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
                      v == null
                        ? ""
                        : typeof v === "object"
                          ? JSON.stringify(v)
                          : String(v);
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
