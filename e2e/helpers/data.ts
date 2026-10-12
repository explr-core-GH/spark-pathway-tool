import { deflateSync } from "node:zlib";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv, type Session } from "./session";

/**
 * Node-side data helpers for the walkthrough: look at (and clean up) rows and
 * storage objects as the signed-in demo user. Everything goes through the anon
 * key plus the user's own access token, so RLS applies exactly as it does in
 * the browser — nothing here can touch rows the user couldn't.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
export function clientFor(session: Session): SupabaseClient<any, any, any> {
  if (!session.accessToken) throw new Error(`No access token for ${session.role}`);
  const { url, anonKey } = supabaseEnv();
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${session.accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/** Storage object paths under `prefix` (one level deep is all the app ever writes). */
export async function listStoragePrefix(session: Session, bucket: string, prefix: string) {
  const sb = clientFor(session);
  const dir = prefix.replace(/\/$/, "");
  const { data, error } = await sb.storage.from(bucket).list(dir, { limit: 1000 });
  if (error) throw new Error(`list ${bucket}/${dir}: ${error.message}`);
  return (data ?? []).filter((o) => o.id).map((o) => `${dir}/${o.name}`);
}

/** Delete every object under `prefix`; returns the paths removed. */
export async function deleteStoragePrefix(session: Session, bucket: string, prefix: string) {
  const paths = await listStoragePrefix(session, bucket, prefix);
  if (paths.length === 0) return [];
  const sb = clientFor(session);
  const { error } = await sb.storage.from(bucket).remove(paths);
  if (error) throw new Error(`remove ${bucket}: ${error.message}`);
  return paths;
}

/** Rows in `table` whose `column` starts with the E2E prefix (scoped by RLS to the user). */
export async function findTestRows(
  session: Session,
  table: string,
  column: string,
  prefix = "E2E-TEST",
  select = "id",
) {
  const sb = clientFor(session);
  const { data, error } = await sb.from(table).select(select).ilike(column, `${prefix}%`);
  if (error) throw new Error(`select ${table}: ${error.message}`);
  return (data ?? []) as unknown as Array<Record<string, unknown> & { id: string }>;
}

/** Delete E2E rows; returns the ids that could not be removed (RLS or otherwise). */
export async function deleteTestRows(
  session: Session,
  table: string,
  column: string,
  prefix = "E2E-TEST",
): Promise<string[]> {
  const rows = await findTestRows(session, table, column, prefix);
  if (rows.length === 0) return [];
  const sb = clientFor(session);
  const ids = rows.map((r) => r.id);
  const { error } = await sb.from(table).delete().in("id", ids);
  if (error) throw new Error(`delete ${table}: ${error.message}`);
  const left = await findTestRows(session, table, column, prefix);
  return left.map((r) => r.id);
}

/** Reset any checkpoint task whose saved text starts with the E2E prefix back to "todo". */
export async function resetTestCheckpointTasks(session: Session, prefix = "E2E-TEST") {
  const sb = clientFor(session);
  const { data, error } = await sb
    .from("checkpoint_tasks")
    .select("id, payload")
    .ilike("payload->>text", `${prefix}%`);
  if (error) throw new Error(`select checkpoint_tasks: ${error.message}`);
  const ids = (data ?? []).map((r: { id: string }) => r.id);
  if (ids.length === 0) return 0;
  const { error: uErr } = await sb
    .from("checkpoint_tasks")
    .update({ payload: {}, status: "todo", completed_at: null })
    .in("id", ids);
  if (uErr) throw new Error(`reset checkpoint_tasks: ${uErr.message}`);
  return ids.length;
}

/** A valid 64x64 solid-colour PNG, built by hand so the test has no image dependency. */
export function pngBuffer(size = 64, rgb: [number, number, number] = [43, 237, 161]): Buffer {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const i = row + 1 + x * 3;
      raw[i] = rgb[0];
      raw[i + 1] = rgb[1];
      raw[i + 2] = rgb[2];
    }
  }
  const crcTable = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c;
  }
  const crc32 = (buf: Buffer) => {
    let c = -1;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
