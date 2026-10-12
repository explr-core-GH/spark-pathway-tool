import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
  ARCHIVE_PAGE_SIZE,
  fetchArchiveRows,
  listArchiveTables,
  type ArchiveTableInfo,
} from "@/lib/archive.functions";
import {
  Pseudonymizer,
  columnsOf,
  deidentifyTable,
  fileDateTag,
  serializeRow,
  sheetName,
  type ArchiveRow,
} from "@/lib/archive-deidentify";

export const Route = createFileRoute("/instructor/admin/archive")({
  head: () => ({ meta: [{ title: "Archive export — Admin" }] }),
  component: ArchivePage,
});

/**
 * ArchivePage — one click downloads every public table as an Excel workbook
 * (one sheet per table). Rows are read server-side with the service role
 * (RLS hides some tables from the admin's own session) and cached in memory
 * so the second workbook is instant. "Original" is the data as stored;
 * "Deidentified" swaps person ids for S-/A- tokens, nulls direct
 * identifiers and collapses DOB to an age band — see archive-deidentify.ts.
 */

type Snapshot = {
  exportedAt: string;
  rows: Map<string, ArchiveRow[]>;
};

type Kind = "original" | "deidentified";

const errText = (e: unknown): string => {
  const m = e instanceof Error ? e.message : String(e);
  if (/SUPABASE_SERVICE_ROLE_KEY/.test(m))
    return "The archive needs the server's service-role key, which is only set in Lovable Cloud. Run this page from the deployed app.";
  return m;
};

const fmt = (n: number) => n.toLocaleString();

function ArchivePage() {
  const list = useServerFn(listArchiveTables);
  const fetchRows = useServerFn(fetchArchiveRows);

  const [tables, setTables] = useState<ArchiveTableInfo[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Kind | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Rows fetched by the first download, reused by the second.
  const snapshot = useRef<Snapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    list()
      .then((r) => {
        if (!cancelled) setTables(r.tables);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(errText(e));
      });
    return () => {
      cancelled = true;
    };
  }, [list]);

  const exportable = (tables ?? []).filter((t) => t.count !== null);
  const totalRows = exportable.reduce((n, t) => n + (t.count ?? 0), 0);

  async function loadSnapshot(): Promise<Snapshot> {
    if (snapshot.current) return snapshot.current;
    const rows = new Map<string, ArchiveRow[]>();
    for (const t of exportable) {
      const total = t.count ?? 0;
      const got: ArchiveRow[] = [];
      setProgress(`Fetching ${t.table} 0 / ${fmt(total)}…`);
      for (let from = 0; ; from += ARCHIVE_PAGE_SIZE) {
        const { rows: page } = await fetchRows({
          data: { table: t.table, from, to: from + ARCHIVE_PAGE_SIZE - 1 },
        });
        got.push(...page);
        setProgress(
          `Fetching ${t.table} ${fmt(got.length)} / ${fmt(Math.max(total, got.length))}…`,
        );
        if (page.length < ARCHIVE_PAGE_SIZE) break;
      }
      rows.set(t.table, got);
    }
    snapshot.current = { exportedAt: new Date().toISOString(), rows };
    return snapshot.current;
  }

  async function download(kind: Kind) {
    setBusy(kind);
    setError(null);
    try {
      const snap = await loadSnapshot();
      setProgress(`Building ${kind} workbook…`);
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const used = new Set<string>(["README"]);
      const now = new Date();
      const readme: (string | number | null)[][] = [];

      if (kind === "original") {
        readme.push(
          ["EXPLR Pathways archive — original (as stored)"],
          ["Exported", snap.exportedAt],
          ["Tables", snap.rows.size],
          ["Rows", fmt(totalRows)],
          [],
          ["Contains direct identifiers. Store accordingly."],
          ["jsonb columns are serialized as JSON text."],
          [],
          ["Table", "Rows"],
        );
        for (const t of exportable) readme.push([t.table, snap.rows.get(t.table)?.length ?? 0]);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(readme), "README");
        for (const t of exportable) {
          const rows = (snap.rows.get(t.table) ?? []).map(serializeRow);
          XLSX.utils.book_append_sheet(wb, tableSheet(XLSX, rows), sheetName(t.table, used));
        }
      } else {
        const pseudo = new Pseudonymizer();
        const perTable: {
          table: string;
          n: number;
          dropped: string[];
          pseudonymized: string[];
          banded: string[];
          unscrubbed: string[];
        }[] = [];
        const sheets: { name: string; rows: ArchiveRow[] }[] = [];
        for (const t of exportable) {
          const res = deidentifyTable(t.table, snap.rows.get(t.table) ?? [], pseudo, now);
          perTable.push({ table: t.table, n: res.rows.length, ...res });
          sheets.push({ name: sheetName(t.table, used), rows: res.rows.map(serializeRow) });
        }
        readme.push(
          ["EXPLR Pathways archive — deidentified"],
          ["Exported", snap.exportedAt],
          ["Tables", snap.rows.size],
          ["Rows", fmt(totalRows)],
          ["Students pseudonymized", pseudo.counts.students],
          ["Adults / orgs pseudonymized", pseudo.counts.adults],
          [],
          ["How it was deidentified"],
          [
            "Person ids (student_id, students.id → S-0001…; educator/admin/org ids and *_by columns → A-0001…) are replaced with stable per-export tokens, so joins still work. Non-person uuids are unchanged.",
          ],
          ["Direct identifiers (names, emails, phones, usernames, passwords, tokens) are nulled."],
          ["date_of_birth / dob are replaced with an age band computed on the export date."],
          [
            "WARNING: free-text and jsonb columns (notes, open responses, demographics, reflections…) were NOT scrubbed and may still contain names.",
          ],
          ["jsonb columns are serialized as JSON text."],
          [],
          [
            "Table",
            "Rows",
            "Dropped (nulled)",
            "Pseudonymized",
            "Age-banded",
            "Unscrubbed free text",
          ],
        );
        for (const t of perTable)
          readme.push([
            t.table,
            t.n,
            t.dropped.join(", ") || null,
            t.pseudonymized.join(", ") || null,
            t.banded.join(", ") || null,
            t.unscrubbed.join(", ") || null,
          ]);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(readme), "README");
        for (const s of sheets) XLSX.utils.book_append_sheet(wb, tableSheet(XLSX, s.rows), s.name);
      }

      XLSX.writeFile(wb, `explr-archive-${kind}-${fileDateTag(now)}.xlsx`);
      setProgress(`Downloaded the ${kind} workbook (${fmt(totalRows)} rows).`);
    } catch (e) {
      setError(errText(e));
      setProgress(null);
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto max-w-[1312px] px-4 py-10 sm:px-6 lg:px-8">
      <p className="eyebrow">Admin</p>
      <h1 className="display mt-2">Archive export</h1>
      <p className="lead mt-3 max-w-2xl">
        Download every table in the database as one Excel workbook, one sheet per table. Use it as a
        snapshot before legacy features are removed, or whenever you need all data and rosters in
        one file.
      </p>
      <ul className="mt-4 max-w-2xl space-y-1 text-sm text-ink-700">
        <li>
          <strong>Original</strong> — every column exactly as stored, including names and contact
          details.
        </li>
        <li>
          <strong>Deidentified</strong> — the same tables with person ids swapped for stable S-0001
          / A-0001 tokens, names, emails, phones and credentials removed, and dates of birth
          replaced by an age band. Free-text fields are not scrubbed; the README sheet lists exactly
          what changed.
        </li>
      </ul>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          className="btn-ink disabled:opacity-50"
          disabled={busy !== null || exportable.length === 0}
          onClick={() => download("original")}
        >
          {busy === "original" ? "Working…" : "Download original (Excel)"}
        </button>
        <button
          type="button"
          className="btn-ghost disabled:opacity-50"
          disabled={busy !== null || exportable.length === 0}
          onClick={() => download("deidentified")}
        >
          {busy === "deidentified" ? "Working…" : "Download deidentified (Excel)"}
        </button>
      </div>

      <p className="mt-4 min-h-6 text-sm text-ink-500" aria-live="polite">
        {progress ??
          (snapshot.current
            ? "Rows are cached for this visit — the other workbook builds instantly."
            : "")}
      </p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <section
        aria-labelledby="archive-tables"
        className="mt-10 rounded-[var(--radius-card)] border border-line bg-paper-raised p-6"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="archive-tables" className="font-display text-2xl font-bold">
            Tables
          </h2>
          {tables && (
            <p className="text-sm text-ink-500">
              {exportable.length} tables · {fmt(totalRows)} rows
            </p>
          )}
        </div>

        {loadError ? (
          <p role="alert" className="mt-4 text-sm text-red-700">
            Could not load the table list: {loadError}
          </p>
        ) : !tables ? (
          <p role="status" className="mt-4 text-sm text-ink-500">
            Counting rows…
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-[var(--radius-card)] border border-line">
            <table className="w-full text-sm">
              <thead className="bg-paper-sunken text-left font-mono text-[11px] uppercase tracking-[0.08em] text-ink-700">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Table
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Rows
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {tables.map((t) => (
                  <tr key={t.table}>
                    <td className="px-4 py-2 font-mono text-xs text-ink-700">
                      {t.table}
                      {t.optional && <span className="ml-2 text-ink-500">(new)</span>}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-ink-700">
                      {t.count === null ? (
                        <span className="text-red-700">
                          unavailable
                          {t.error ? <span className="sr-only">: {t.error}</span> : null}
                        </span>
                      ) : (
                        fmt(t.count)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

/** A worksheet for one table; empty tables still get a sheet with a note. */
function tableSheet(XLSX: typeof import("xlsx"), rows: ArchiveRow[]) {
  if (rows.length === 0) return XLSX.utils.aoa_to_sheet([["(no rows)"]]);
  return XLSX.utils.json_to_sheet(rows, { header: columnsOf(rows) });
}
