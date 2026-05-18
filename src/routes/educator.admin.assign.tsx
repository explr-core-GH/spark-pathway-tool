import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";

/**
 * /educator/admin/assign — assign educators to camp SESSIONS (explr_camps)
 * or to internships (slug-based).
 *
 * Camps moved from slug-based assignment to session-based assignment because
 * a single curriculum (e.g. BoxCraft) runs multiple weeks, each with its
 * own roster. Each "session" is one row in public.explr_camps. Assignment
 * writes to public.explr_camp_educators.
 *
 * Internships still assign at the slug level (one cohort, year-round).
 *
 * Deep-linkable via ?mode=session&filter_slug=<curriculum> to focus on
 * sessions linked to one curriculum (used by the catalog admin's
 * "Assign educators" button).
 */

const searchSchema = z.object({
  mode: z.enum(["session", "internship"]).optional(),
  // Filter sessions to those linked to this curriculum slug (for camps mode).
  filter_slug: z.string().optional(),
  // The explr_camp_id (session) or internship_slug to start with selected.
  pick: z.string().optional(),
});

export const Route = createFileRoute("/educator/admin/assign")({
  head: () => ({ meta: [{ title: "Assign educators — Admin" }] }),
  validateSearch: searchSchema,
  component: AssignAdmin,
});

type Mode = "session" | "internship";

type Educator = { id: string; full_name: string; email: string };
type Internship = { slug: string; name: string; emoji: string };
type Session = {
  id: string;
  title: string;
  date: string | null;
  end_date: string | null;
  location: string | null;
  curricula: string[]; // camp_slug values linked to this session
};

type SessionAssign = { explr_camp_id: string; educator_id: string };
type InternshipAssign = { internship_slug: string; educator_id: string };

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
  const [mode, setMode] = useState<Mode>(search.mode ?? "session");
  const [educators, setEducators] = useState<Educator[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [sessionAssigns, setSessionAssigns] = useState<SessionAssign[]>([]);
  const [intAssigns, setIntAssigns] = useState<InternshipAssign[]>([]);
  const [selected, setSelected] = useState<string | null>(search.pick ?? null);
  const [filter, setFilter] = useState("");

  async function load() {
    const [
      { data: educs },
      { data: ss },
      { data: links },
      { data: is },
      { data: sa },
      { data: ia },
    ] = await Promise.all([
      supabase
        .from("educators")
        .select("id, full_name, email")
        .eq("approved", true)
        .order("full_name"),
      // All sessions. Even if a session has no curriculum linked yet, we want
      // it to be assignable.
      (supabase.from as (n: string) => ReturnType<typeof supabase.from>)(
        "explr_camps",
      )
        .select("id, title, date, end_date, location")
        .order("date", { ascending: true }),
      // The curriculum link join — used for filter_slug + chip display.
      (supabase.from as (n: string) => ReturnType<typeof supabase.from>)(
        "explr_camp_curriculum_links",
      ).select("explr_camp_id, camp_slug"),
      supabase
        .from("internships")
        .select("slug, name, emoji")
        .order("sort_order")
        .order("name"),
      (supabase.from as (n: string) => ReturnType<typeof supabase.from>)(
        "explr_camp_educators",
      ).select("explr_camp_id, educator_id"),
      supabase
        .from("internship_educators")
        .select("internship_slug, educator_id"),
    ]);
    setEducators((educs ?? []) as Educator[]);
    // Join curricula onto sessions client-side.
    const linkMap = new Map<string, string[]>();
    for (const l of (links ?? []) as Array<{
      explr_camp_id: string;
      camp_slug: string;
    }>) {
      const arr = linkMap.get(l.explr_camp_id) ?? [];
      arr.push(l.camp_slug);
      linkMap.set(l.explr_camp_id, arr);
    }
    setSessions(
      ((ss ?? []) as Array<Omit<Session, "curricula">>).map((s) => ({
        ...s,
        curricula: linkMap.get(s.id) ?? [],
      })),
    );
    setInternships((is ?? []) as Internship[]);
    setSessionAssigns((sa ?? []) as SessionAssign[]);
    setIntAssigns((ia ?? []) as InternshipAssign[]);
  }
  useEffect(() => {
    load();
  }, []);
  const firstModeRef = useRef(true);
  useEffect(() => {
    if (firstModeRef.current) {
      firstModeRef.current = false;
      return;
    }
    setSelected(null);
  }, [mode]);

  // For sessions mode, optionally filter to sessions linked to one curriculum.
  const filteredSessions = useMemo(() => {
    if (!search.filter_slug) return sessions;
    return sessions.filter((s) => s.curricula.includes(search.filter_slug!));
  }, [sessions, search.filter_slug]);

  const items =
    mode === "session"
      ? filteredSessions.map((s) => ({
          key: s.id,
          primary: s.title,
          secondary: `${fmtRange(s.date, s.end_date)}${s.location ? ` · ${s.location}` : ""}${s.curricula.length > 0 ? ` · ${s.curricula.join(", ")}` : ""}`,
        }))
      : internships.map((i) => ({
          key: i.slug,
          primary: `${i.emoji} ${i.name}`,
          secondary: i.slug,
        }));
  const selectedItem = items.find((i) => i.key === selected) ?? null;

  const assignedSet = useMemo(() => {
    if (!selected) return new Set<string>();
    if (mode === "session") {
      return new Set(
        sessionAssigns
          .filter((a) => a.explr_camp_id === selected)
          .map((a) => a.educator_id),
      );
    }
    return new Set(
      intAssigns
        .filter((a) => a.internship_slug === selected)
        .map((a) => a.educator_id),
    );
  }, [selected, mode, sessionAssigns, intAssigns]);

  function countFor(key: string) {
    return mode === "session"
      ? sessionAssigns.filter((a) => a.explr_camp_id === key).length
      : intAssigns.filter((a) => a.internship_slug === key).length;
  }

  async function toggle(educatorId: string) {
    if (!selected) return;
    const has = assignedSet.has(educatorId);
    if (mode === "session") {
      if (has) {
        await (supabase.from as (n: string) => ReturnType<typeof supabase.from>)(
          "explr_camp_educators",
        )
          .delete()
          .eq("explr_camp_id", selected)
          .eq("educator_id", educatorId);
      } else {
        await (supabase.from as (n: string) => ReturnType<typeof supabase.from>)(
          "explr_camp_educators",
        ).insert({
          explr_camp_id: selected,
          educator_id: educatorId,
          assigned_by: user?.id ?? null,
        });
      }
    } else {
      if (has) {
        await supabase
          .from("internship_educators")
          .delete()
          .eq("internship_slug", selected)
          .eq("educator_id", educatorId);
      } else {
        await supabase.from("internship_educators").insert({
          internship_slug: selected,
          educator_id: educatorId,
          assigned_by: user?.id ?? null,
        });
      }
    }
    await load();
  }

  const filteredEducators = educators.filter((e) => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return (
      e.full_name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q)
    );
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <p className="eyebrow">Admin</p>
      <h1 className="display mt-2">Assign educators</h1>
      <p className="lead mt-3">
        Pick a {mode === "session" ? "camp session (week)" : "internship"},
        then check off the educators who should run it.
      </p>
      {search.filter_slug && mode === "session" && (
        <p className="mt-2 text-xs text-charcoal-500">
          Filtered to sessions linked to curriculum{" "}
          <span className="font-mono">{search.filter_slug}</span>.
        </p>
      )}

      <div className="mt-8 inline-flex border border-charcoal-100">
        {(["session", "internship"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="px-4 py-2 text-sm"
            style={{
              background: mode === m ? "var(--ink)" : "white",
              color: mode === m ? "white" : "var(--color-charcoal-500)",
            }}
          >
            {m === "session" ? "Camp sessions" : "Internships"}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_1fr]">
        <div>
          <h2 className="eyebrow">
            {mode === "session" ? "Camp sessions" : "Internships"}
          </h2>
          <ul className="mt-4 divide-y divide-charcoal-100 border-y border-charcoal-100">
            {items.map((i) => {
              const count = countFor(i.key);
              const active = selected === i.key;
              return (
                <li key={i.key}>
                  <button
                    onClick={() => setSelected(i.key)}
                    className="flex w-full items-center gap-3 py-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-sm font-medium"
                        style={{ color: active ? "var(--ink)" : "inherit" }}
                      >
                        {i.primary}
                      </p>
                      <p className="truncate text-xs text-charcoal-500">
                        {i.secondary} · {count} educator
                        {count === 1 ? "" : "s"}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
            {items.length === 0 && (
              <li className="py-6 text-sm text-charcoal-500">
                {mode === "session"
                  ? "No camp sessions synced from ExplrMore yet. Run a sync from Admin → Tools → Import from ExplrMore."
                  : "No internships yet."}
              </li>
            )}
          </ul>
        </div>

        <div>
          <h2 className="eyebrow">
            {selectedItem
              ? `Educators · ${selectedItem.primary}`
              : `Pick a ${mode === "session" ? "session" : "internship"}`}
          </h2>
          {selectedItem ? (
            <>
              <input
                className="field mt-4"
                placeholder="Filter educators by name or email…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <ul className="mt-4 divide-y divide-charcoal-100 border-y border-charcoal-100">
                {filteredEducators.map((e) => {
                  const checked = assignedSet.has(e.id);
                  return (
                    <li key={e.id} className="flex items-center gap-3 py-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(e.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {e.full_name}
                        </p>
                        <p className="truncate text-xs text-charcoal-500">
                          {e.email}
                        </p>
                      </div>
                    </li>
                  );
                })}
                {filteredEducators.length === 0 && (
                  <li className="py-6 text-sm text-charcoal-500">
                    {educators.length === 0
                      ? "No approved educators yet."
                      : "No matches."}
                  </li>
                )}
              </ul>
            </>
          ) : (
            <p className="mt-4 text-sm text-charcoal-500">
              Select an item on the left to manage its educators.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
