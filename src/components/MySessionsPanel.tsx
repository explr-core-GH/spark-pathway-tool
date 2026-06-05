import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * MySessionsPanel — list of ExplrMore camp sessions assigned to one educator.
 *
 * "Session" here = one row in public.explr_camps (a specific offering of a
 * camp, e.g. "BoxCraft · Week 2 · Jun 17-21"). The same curriculum can run
 * many times; each run is a separate session with its own roster and
 * educator assignment. Educators get assigned per-session, not per-curriculum.
 *
 * Data flow:
 *   explr_camp_educators (educator_id = me)
 *     → explr_camps (the session itself)
 *       → explr_camp_curriculum_links → camps (one or more curricula)
 *       → explr_registrations (the roster — count fetched separately)
 *
 * We render the title verbatim from explr_camps.title (admin maintains it
 * upstream in ExplrMore) and surface the date range, location, and a quick
 * peek at linked curricula. Click → /educator/sessions/$id for the full
 * detail page with roster.
 */

type LinkedCurriculum = { slug: string; name: string; emoji: string };
type Session = {
  id: string;
  title: string;
  date: string | null;
  end_date: string | null;
  location: string | null;
  capacity: number | null;
  category: string | null;
  curricula: LinkedCurriculum[];
  registrationCount: number;
};

// Shape of the nested select payload from Supabase. PostgREST returns the
// joined tables as either a single object or an array depending on
// cardinality; we normalize both ways at runtime.
type AssignmentRow = {
  explr_camps: {
    id: string;
    title: string;
    date: string | null;
    end_date: string | null;
    location: string | null;
    capacity: number | null;
    category: string | null;
    explr_camp_curriculum_links: Array<{
      camp_slug: string;
      camps: { slug: string; name: string; emoji: string } | null;
    }>;
  } | null;
};

function fmtRange(date: string | null, end: string | null): string {
  if (!date) return "Dates TBD";
  const d = new Date(date);
  if (!end || end === date) return d.toLocaleDateString();
  const e = new Date(end);
  // Same month/year → "Jun 12-16, 2026"
  if (d.getFullYear() === e.getFullYear() && d.getMonth() === e.getMonth()) {
    return `${d.toLocaleString(undefined, { month: "short", day: "numeric" })}–${e.getDate()}, ${e.getFullYear()}`;
  }
  return `${d.toLocaleDateString()} – ${e.toLocaleDateString()}`;
}

export function MySessionsPanel({ educatorId }: { educatorId: string }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      // One deep join pulls the session, its linked curricula, and the
      // curriculum metadata. Registration counts come from a follow-up
      // query because PostgREST doesn't expose GROUP BY directly.
      const { data, error } = await supabase
        .from("explr_camp_educators")
        .select(
          `
          explr_camps (
            id, title, date, end_date, location, capacity, category,
            explr_camp_curriculum_links (
              camp_slug,
              camps ( slug, name, emoji )
            )
          )
        `,
        )
        .eq("educator_id", educatorId);
      if (cancelled) return;
      if (error) {
        setErr(error.message);
        setSessions([]);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as unknown as AssignmentRow[];
      const flat: Session[] = rows
        .map((r) => r.explr_camps)
        .filter((s): s is NonNullable<typeof s> => !!s)
        .map((s) => ({
          id: s.id,
          title: s.title,
          date: s.date,
          end_date: s.end_date,
          location: s.location,
          capacity: s.capacity,
          category: s.category,
          curricula: (s.explr_camp_curriculum_links ?? [])
            .map((l) => l.camps)
            .filter((c): c is LinkedCurriculum => !!c),
          registrationCount: 0,
        }));

      // Fetch registration counts in one round-trip for all session ids the
      // educator has. We pull just `camp_id` to keep the payload small and
      // group client-side.
      if (flat.length > 0) {
        const ids = flat.map((s) => s.id);
        const { data: regs } = await supabase
          .from("explr_registrations")
          .select("camp_id")
          .in("camp_id", ids);
        if (!cancelled && regs) {
          const counts = new Map<string, number>();
          for (const r of regs as { camp_id: string }[]) {
            counts.set(r.camp_id, (counts.get(r.camp_id) ?? 0) + 1);
          }
          for (const s of flat) {
            s.registrationCount = counts.get(s.id) ?? 0;
          }
        }
      }

      // Sort by start date ascending; null dates go last.
      flat.sort((a, b) => {
        if (a.date && b.date) return a.date.localeCompare(b.date);
        if (a.date) return -1;
        if (b.date) return 1;
        return a.title.localeCompare(b.title);
      });

      setSessions(flat);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [educatorId]);

  if (loading) {
    return <p className="text-sm text-charcoal-400">Loading sessions…</p>;
  }
  if (err) {
    return (
      <p className="text-sm text-red-600">
        Failed to load sessions: {err}
      </p>
    );
  }
  if (sessions.length === 0) {
    return (
      <p className="py-6 text-sm text-charcoal-400">
        You haven&apos;t been assigned to any camp sessions yet. An EXPLR
        admin can add you via{" "}
        <span className="text-charcoal-600">Admin → Catalog → Sessions</span>.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sessions.map((s) => (
        <Link
          key={s.id}
          to="/educator/sessions/$sessionId"
          params={{ sessionId: s.id }}
          className="group block border border-charcoal-100 bg-white p-5 transition-colors hover:border-ink"
        >
          <p className="text-[11px] uppercase tracking-wider text-charcoal-400">
            {fmtRange(s.date, s.end_date)}
          </p>
          <h3 className="mt-2 text-base font-medium leading-snug text-ink">
            {s.title}
          </h3>
          {s.location && (
            <p className="mt-1 text-xs text-charcoal-500">{s.location}</p>
          )}
          {s.curricula.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {s.curricula.slice(0, 4).map((c) => (
                <span
                  key={c.slug}
                  className="inline-flex items-center gap-1 border border-charcoal-100 bg-charcoal-50 px-1.5 py-0.5 text-[11px] text-charcoal-600"
                  title={c.name}
                >
                  <span aria-hidden>{c.emoji}</span>
                  <span className="truncate max-w-[8rem]">{c.name}</span>
                </span>
              ))}
              {s.curricula.length > 4 && (
                <span className="text-[11px] text-charcoal-400">
                  +{s.curricula.length - 4}
                </span>
              )}
            </div>
          )}
          <div className="mt-4 flex items-baseline justify-between text-xs text-charcoal-500">
            <span>
              {s.registrationCount} student{s.registrationCount === 1 ? "" : "s"}
              {s.capacity ? ` / ${s.capacity}` : ""}
            </span>
            <span className="ink-link group-hover:opacity-100">View →</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
