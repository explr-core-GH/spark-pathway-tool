import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { APP_STATUS_LABEL } from "@/lib/hs-application/content";
import type { ListingRow, Season } from "@/lib/hs-application/data";
import type { GeneralApplication } from "@/lib/hs-application/types";
import type { MatchCard } from "./GeneralSteps";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);

type PartnerRow = { opportunity_id: string; status: string; submitted_at: string | null };
type EventRow = { id: string; status: string; note: string | null; created_at: string };

/** After the general application: status, plus partner applications to start. */
export function ApplicationHub(props: {
  app: GeneralApplication;
  season: Season;
  cards: MatchCard[];
  listings: ListingRow[];
  highlight: string | null;
}) {
  const [partner, setPartner] = useState<Record<string, PartnerRow>>({});
  const [events, setEvents] = useState<EventRow[]>([]);
  useEffect(() => {
    sb("hs_partner_applications")
      .select("opportunity_id, status, submitted_at")
      .eq("general_id", props.app.id)
      .then(({ data }: { data: PartnerRow[] | null }) =>
        setPartner(Object.fromEntries((data ?? []).map((r) => [r.opportunity_id, r]))),
      );
    sb("application_status_events")
      .select("id, status, note, created_at")
      .eq("general_id", props.app.id)
      .order("created_at", { ascending: false })
      .then(({ data }: { data: EventRow[] | null }) => setEvents(data ?? []));
  }, [props.app.id]);

  const byId = new Map(props.listings.map((l) => [l.id, l]));
  const ranked = new Set(props.app.choices.ranked);
  const highlightId = props.highlight?.replace(/^opp:/, "") ?? null;
  const cards = [...props.cards].sort((a, b) => {
    const ah = a.ref === `opp:${highlightId}` ? 1 : 0;
    const bh = b.ref === `opp:${highlightId}` ? 1 : 0;
    return (
      bh - ah ||
      Number(ranked.has(b.ref)) - Number(ranked.has(a.ref)) ||
      b.match.score - a.match.score
    );
  });
  const placed = props.app.placed_opportunity_id ? byId.get(props.app.placed_opportunity_id) : null;

  return (
    <>
      <p className="eyebrow mt-4 text-green">{props.season.name} internships</p>
      <h1 className="mt-1 font-display text-3xl font-bold leading-tight sm:text-4xl">
        Your application
      </h1>

      <section className="mt-6 rounded-[var(--radius-card)] border border-mint-soft bg-mint-tint p-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-green-deep" aria-hidden />
          <p className="font-display text-lg font-semibold">
            General application: {APP_STATUS_LABEL[props.app.status] ?? props.app.status}
          </p>
        </div>
        <p className="mt-2 text-sm text-ink-700">
          {props.app.submitted_at
            ? `Submitted ${new Date(props.app.submitted_at).toLocaleDateString()}. `
            : ""}
          We sent a copy to you{props.app.core.guardianEmail ? " and your parent or guardian" : ""}.
          EXPLR staff place every student, and we'll update you both at each step.
        </p>
        {props.app.status === "missing" && props.app.missing_note && (
          <p role="alert" className="mt-3 rounded-[var(--radius-control)] bg-gold-tint p-3 text-sm">
            <strong>We need one more thing:</strong> {props.app.missing_note}
          </p>
        )}
        {props.app.status === "placed" && placed && (
          <p className="mt-3 text-sm">
            <strong>You're placed:</strong> {placed.version?.builder.profile.title || placed.name}
            {placed.org_name ? ` with ${placed.org_name}` : ""}.
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-2xl font-semibold">Apply to specific internships</h2>
        <p className="mt-1 text-sm text-ink-700">
          You don't redo anything. Each one only asks that partner's questions and what you need to
          know about the site. Applying to more gives you more chances.
        </p>
        <ul className="mt-5 grid gap-4">
          {cards.length === 0 && (
            <li className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-4 text-sm text-ink-700">
              No internships are open yet. We'll email you when they are.
            </li>
          )}
          {cards.map((c) => {
            const id = c.ref.replace(/^opp:/, "");
            const l = byId.get(id);
            const p = partner[id];
            const qs = l?.version?.builder.questions.length ?? 0;
            const reqs =
              (l?.version?.builder.requirements.length ?? 0) +
              (l?.version?.builder.age.min ? 1 : 0);
            const isHighlight = id === highlightId;
            return (
              <li
                key={c.ref}
                className={`rounded-[var(--radius-card)] border bg-paper-raised p-4 shadow-card ${isHighlight ? "border-green-deep ring-2 ring-green-deep/30" : "border-line"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-semibold">{c.name}</p>
                    {c.org && <p className="text-sm text-ink-700">{c.org}</p>}
                  </div>
                  {ranked.has(c.ref) && (
                    <span className="rounded-full bg-ink-900 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-paper">
                      Your #{props.app.choices.ranked.indexOf(c.ref) + 1}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-green-deep">{c.match.why}</p>
                <p className="mt-1 text-xs text-ink-700">
                  {qs === 0 ? "No extra questions" : `${qs} question${qs === 1 ? "" : "s"}`}
                  {reqs ? ` · ${reqs} thing${reqs === 1 ? "" : "s"} to know about the site` : ""}
                </p>
                <div className="mt-3">
                  {c.match.blockedLabel ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-paper-sunken px-3 py-1.5 text-sm text-ink-700">
                      <Clock className="h-4 w-4" aria-hidden /> {c.match.blockedLabel}
                    </span>
                  ) : p?.status === "submitted" ? (
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-green-deep">
                      <CheckCircle2 className="h-4 w-4" aria-hidden /> Applied
                    </span>
                  ) : (
                    <Link
                      to="/student/apply/$opportunityId"
                      params={{ opportunityId: id }}
                      className={isHighlight ? "btn-ink" : "btn-ghost"}
                    >
                      {p
                        ? "Finish this application →"
                        : qs === 0
                          ? "Apply →"
                          : `Apply · ${qs} question${qs === 1 ? "" : "s"} →`}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {events.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold">Updates</h2>
          <ol className="mt-3 grid gap-2 text-sm">
            {events.map((e) => (
              <li key={e.id} className="flex flex-wrap gap-2 border-b border-line py-2">
                <span className="font-medium">{APP_STATUS_LABEL[e.status] ?? e.status}</span>
                <span className="text-ink-500">{new Date(e.created_at).toLocaleDateString()}</span>
                {e.note && <span className="w-full text-ink-700">{e.note}</span>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}
