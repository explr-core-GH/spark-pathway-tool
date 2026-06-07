import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * RosterLiveMonitor — a live grid of a camp's students: who's logged in,
 * what part of the site they're in, and which assessment question they're
 * on. Polls every few seconds while mounted.
 *
 * Online = a presence heartbeat within the last 60s. Location comes from
 * student_presence.label; the assessment question comes from the latest
 * incomplete assessment_sessions row (current_index of item_sequence),
 * both of which an admin can read.
 *
 * Lazy: the caller only mounts this when the admin opens it.
 */

// student_presence isn't in the generated Database type — loosen to any.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = (table: string): any => (supabase.from as unknown as (n: string) => any)(table);

const POLL_MS = 5000;
const ONLINE_WINDOW_MS = 60_000;

type Props = {
  studentIds: string[];
  names: Record<string, string>;
};

type Row = {
  studentId: string;
  name: string;
  online: boolean;
  lastSeen: number | null; // epoch ms
  label: string | null;
  question: string | null; // e.g. "Q12 of 48"
};

function ago(ms: number | null): string {
  if (ms == null) return "never";
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export function RosterLiveMonitor({ studentIds, names }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      if (studentIds.length === 0) {
        setRows([]);
        setLoadedOnce(true);
        return;
      }
      const [{ data: presence, error: pErr }, { data: sessions }] =
        await Promise.all([
          sb("student_presence")
            .select("student_id, label, last_seen_at")
            .in("student_id", studentIds),
          supabase
            .from("assessment_sessions")
            .select("student_id, current_index, item_sequence, completed_at, started_at")
            .in("student_id", studentIds)
            .order("started_at", { ascending: false }),
        ]);
      if (cancelled) return;
      if (pErr) {
        setErr(pErr.message);
        setLoadedOnce(true);
        return;
      }

      const pMap = new Map<string, { label: string | null; seen: number }>();
      for (const p of (presence ?? []) as Array<{
        student_id: string;
        label: string | null;
        last_seen_at: string;
      }>) {
        pMap.set(p.student_id, {
          label: p.label,
          seen: new Date(p.last_seen_at).getTime(),
        });
      }

      // Latest session per student → question position (incomplete only).
      const qMap = new Map<string, string>();
      for (const s of (sessions ?? []) as Array<{
        student_id: string;
        current_index: number;
        item_sequence: unknown;
        completed_at: string | null;
      }>) {
        if (qMap.has(s.student_id)) continue; // newest wins (ordered desc)
        if (s.completed_at) {
          qMap.set(s.student_id, "Finished");
        } else {
          const total = Array.isArray(s.item_sequence)
            ? s.item_sequence.length
            : 0;
          qMap.set(
            s.student_id,
            total ? `Q${(s.current_index ?? 0) + 1} of ${total}` : "—",
          );
        }
      }

      const now = Date.now();
      const out: Row[] = studentIds.map((sid) => {
        const p = pMap.get(sid);
        return {
          studentId: sid,
          name: names[sid] ?? "Student",
          online: !!p && now - p.seen < ONLINE_WINDOW_MS,
          lastSeen: p?.seen ?? null,
          label: p?.label ?? null,
          question: qMap.get(sid) ?? null,
        };
      });
      // Online first, then by name.
      out.sort((a, b) =>
        a.online === b.online
          ? a.name.localeCompare(b.name)
          : a.online
            ? -1
            : 1,
      );
      setRows(out);
      setLoadedOnce(true);
    }

    tick();
    const t = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [studentIds.join(","), names]);

  if (!loadedOnce) {
    return <p className="text-sm text-charcoal-400">Loading…</p>;
  }
  if (err) {
    return <p className="text-sm text-red-600">Couldn&apos;t load monitor: {err}</p>;
  }
  if (rows.length === 0) {
    return <p className="text-sm text-charcoal-400">No students in this roster yet.</p>;
  }

  const onlineCount = rows.filter((r) => r.online).length;

  return (
    <div>
      <p className="text-xs text-charcoal-500">
        <span
          className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
          style={{ background: "var(--color-explr-500)" }}
        />
        {onlineCount} online · refreshes every {POLL_MS / 1000}s
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <div
            key={r.studentId}
            className="border border-charcoal-100 bg-white p-3"
            style={{ opacity: r.online ? 1 : 0.6 }}
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  background: r.online
                    ? "var(--color-explr-500)"
                    : "var(--color-charcoal-200)",
                }}
                aria-hidden
              />
              <p className="min-w-0 flex-1 truncate text-sm font-medium">
                {r.name}
              </p>
            </div>
            <p className="mt-1.5 text-xs text-charcoal-600">
              {r.online ? r.label ?? "Online" : `Offline · ${ago(r.lastSeen)}`}
            </p>
            {r.question && (
              <p className="mt-0.5 text-[11px] text-charcoal-400">{r.question}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
