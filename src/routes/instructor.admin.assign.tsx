import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";

/**
 * /instructor/admin/assign — assign instructors to camp SESSIONS (explr_camps).
 *
 * Each "session" is one row in public.explr_camps (one week / offering with
 * its own roster). Assignment writes to public.explr_camp_educators.
 * Deep-linkable via ?pick=<explr_camp_id> to start with a session selected.
 */

const searchSchema = z.object({
  pick: z.string().optional(),
});

export const Route = createFileRoute("/instructor/admin/assign")({
  head: () => ({ meta: [{ title: "Assign instructors — Admin" }] }),
  validateSearch: searchSchema,
  component: AssignAdmin,
});

type Educator = { id: string; full_name: string; email: string };
type Session = {
  id: string;
  title: string;
  date: string | null;
  end_date: string | null;
  location: string | null;
};
type SessionAssign = { explr_camp_id: string; educator_id: string };

function fmtRange(date: string | null, end: string | null): string {
  if (!date) return "Dates TBD";
  const d = new Date(date);
  if (!end || end === date) return d.toLocaleDateString();
  const e = new Date(end);
  if (d.getFullYear() === e.getFullYear() && d.getMonth() === e.getMonth()) {
    return `${d.toLocaleString(undefined, { month: "short", day: "numeric" })}–${e.getDate()}`;
  }
  return `${d.toLocaleDateString()} – ${e.toLocaleDateString()}`;
}

function AssignAdmin() {
  const { user } = useSession();
  const search = Route.useSearch();
  const [educators, setEducators] = useState<Educator[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionAssigns, setSessionAssigns] = useState<SessionAssign[]>([]);
  const [selected, setSelected] = useState<string | null>(search.pick ?? null);
  const [filter, setFilter] = useState("");

  async function load() {
    const [{ data: educs }, { data: ss }, { data: sa }] = await Promise.all([
      supabase
        .from("educators")
        .select("id, full_name, email")
        .eq("approved", true)
        .order("full_name"),
      supabase
        .from("explr_camps")
        .select("id, title, date, end_date, location")
        .order("date", { ascending: true }),
      supabase.from("explr_camp_educators").select("explr_camp_id, educator_id"),
    ]);
    setEducators((educs ?? []) as Educator[]);
    setSessions((ss ?? []) as Session[]);
    setSessionAssigns((sa ?? []) as SessionAssign[]);
  }
  useEffect(() => {
    load();
  }, []);

  const selectedSession = sessions.find((s) => s.id === selected) ?? null;

  const assignedSet = useMemo(() => {
    if (!selected) return new Set<string>();
    return new Set(
      sessionAssigns.filter((a) => a.explr_camp_id === selected).map((a) => a.educator_id),
    );
  }, [selected, sessionAssigns]);

  function countFor(key: string) {
    return sessionAssigns.filter((a) => a.explr_camp_id === key).length;
  }

  async function toggle(educatorId: string) {
    if (!selected) return;
    const has = assignedSet.has(educatorId);
    if (has) {
      await supabase
        .from("explr_camp_educators")
        .delete()
        .eq("explr_camp_id", selected)
        .eq("educator_id", educatorId);
    } else {
      await supabase.from("explr_camp_educators").insert({
        explr_camp_id: selected,
        educator_id: educatorId,
        assigned_by: user?.id ?? null,
      });
    }
    await load();
  }

  const filteredEducators = educators.filter((e) => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return e.full_name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q);
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <p className="eyebrow">Admin</p>
      <h1 className="display mt-2">Assign instructors</h1>
      <p className="lead mt-3">
        Pick a camp session (week), then check off the instructors who should run it.
      </p>

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_1fr]">
        <div>
          <h2 className="eyebrow">Camp sessions</h2>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {sessions.map((s) => {
              const count = countFor(s.id);
              const active = selected === s.id;
              return (
                <li key={s.id}>
                  <button
                    onClick={() => setSelected(s.id)}
                    className="flex w-full items-center gap-3 py-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-sm font-medium"
                        style={{ color: active ? "var(--ink)" : "inherit" }}
                      >
                        {s.title}
                      </p>
                      <p className="truncate text-xs text-ink-500">
                        {fmtRange(s.date, s.end_date)}
                        {s.location ? ` · ${s.location}` : ""} · {count} instructor
                        {count === 1 ? "" : "s"}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
            {sessions.length === 0 && (
              <li className="py-6 text-sm text-ink-500">
                No camp sessions synced from ExplrMore yet. Run a sync from Admin → Library → Import
                from ExplrMore.
              </li>
            )}
          </ul>
        </div>

        <div>
          <h2 className="eyebrow">
            {selectedSession ? `Instructors · ${selectedSession.title}` : "Pick a session"}
          </h2>
          {selectedSession ? (
            <>
              <input
                className="field mt-4"
                placeholder="Filter instructors by name or email…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {filteredEducators.map((e) => {
                  const checked = assignedSet.has(e.id);
                  return (
                    <li key={e.id} className="flex items-center gap-3 py-3">
                      <input type="checkbox" checked={checked} onChange={() => toggle(e.id)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{e.full_name}</p>
                        <p className="truncate text-xs text-ink-500">{e.email}</p>
                      </div>
                    </li>
                  );
                })}
                {filteredEducators.length === 0 && (
                  <li className="py-6 text-sm text-ink-500">
                    {educators.length === 0 ? "No approved instructors yet." : "No matches."}
                  </li>
                )}
              </ul>
            </>
          ) : (
            <p className="mt-4 text-sm text-ink-500">
              Select a session on the left to manage its instructors.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
