import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  ALL_ARCHIVE_TABLES,
  ARCHIVE_TABLES,
  OPTIONAL_ARCHIVE_TABLES,
  type ArchiveRow,
  type ArchiveTable,
} from "./archive-deidentify";

/**
 * Archive export — admin-only, service-role reads of every public table.
 *
 * RLS keeps the admin's browser out of several tables (assessment_responses
 * only has a `self` policy, for instance), so the rows are read here with
 * `supabaseAdmin` and the caller is re-checked against `public.admins` on
 * every call. The table name is validated against the fixed allow-list and
 * never interpolated raw.
 *
 * `supabaseAdmin` throws "Missing SUPABASE_SERVICE_ROLE_KEY" outside Lovable
 * Cloud; the page surfaces that as a readable message.
 */

// Tables newer than the generated Database type go through an untyped accessor.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = (table: string): any => (supabaseAdmin.from as unknown as (n: string) => any)(table);

export const ARCHIVE_PAGE_SIZE = 1000;

const optionalSet = new Set<string>(OPTIONAL_ARCHIVE_TABLES);

async function requireAdmin(userId: string): Promise<void> {
  const { data, error } = await sb("admins").select("id").eq("id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Admin access required");
}

export type ArchiveTableInfo = {
  table: ArchiveTable;
  /** Live row count; null when the table could not be counted (see `error`). */
  count: number | null;
  /** True for tables that may not exist yet in this environment. */
  optional: boolean;
  error?: string;
};

async function countTable(table: ArchiveTable): Promise<ArchiveTableInfo> {
  const optional = optionalSet.has(table);
  try {
    const { count, error } = await sb(table).select("*", { count: "exact", head: true });
    if (error) throw new Error(error.message);
    return { table, count: count ?? 0, optional };
  } catch (e) {
    return { table, count: null, optional, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * The fixed table list with live row counts. Optional tables that don't
 * exist yet are left out; required tables that fail to count are returned
 * with `count: null` and the error so the admin can see what's missing.
 */
export const listArchiveTables = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const infos = await Promise.all(ALL_ARCHIVE_TABLES.map(countTable));
    const tables = infos.filter((i) => !(i.optional && i.count === null));
    return { tables, exportedAt: new Date().toISOString() };
  });

const FetchInput = z
  .object({
    table: z.enum(ALL_ARCHIVE_TABLES),
    from: z.number().int().min(0),
    to: z.number().int().min(0),
  })
  .refine((v) => v.to >= v.from && v.to - v.from < ARCHIVE_PAGE_SIZE, {
    message: `Request at most ${ARCHIVE_PAGE_SIZE} rows per call`,
  });

/**
 * One page of rows for one allow-listed table, as stored. Ordered by `id`
 * when the table has one so paging is stable; otherwise in table order.
 */
export const fetchArchiveRows = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => FetchInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const { table, from, to } = data;

    let res = await sb(table).select("*").order("id", { ascending: true }).range(from, to);
    if (res.error) {
      // Tables without an `id` column (composite-key link tables) fall back to natural order.
      res = await sb(table).select("*").range(from, to);
    }
    if (res.error) throw new Error(`${table}: ${res.error.message}`);
    return { table, rows: (res.data ?? []) as ArchiveRow[] };
  });

export { ARCHIVE_TABLES, OPTIONAL_ARCHIVE_TABLES };
