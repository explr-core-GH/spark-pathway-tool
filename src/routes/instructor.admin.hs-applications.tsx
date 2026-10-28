import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  APP_STATUS_LABEL,
  APP_STATUSES,
  CAREER_FIELD_LABEL,
  ENVIRONMENT_DIMS,
  POST_HS_PLANS,
  REACTIONS,
  REQUIREMENT_BY_KEY,
  STUDENT_REQ_ANSWERS,
  TRANSPORT_OPTIONS,
  type AppStatus,
} from "@/lib/hs-application/content";
import { hydrateGeneral, type ListingRow, type Season } from "@/lib/hs-application/data";
import { listingFromOpportunity, isDemoListing } from "@/lib/hs-application/listings";
import { rankListings, type HsMatch } from "@/lib/hs-application/match";
import { clearNeedHelp, recordApplicationStatus } from "@/lib/hs-application/notify.functions";
import {
  hydrateBuilder,
  type ApplicationBuilder,
  type Demographics,
  type GeneralApplication,
} from "@/lib/hs-application/types";
import { youEmailFlags } from "@/lib/hs-application/validate";

export const Route = createFileRoute("/instructor/admin/hs-applications")({
  head: () => ({ meta: [{ title: "Internship applications — EXPLR admin" }] }),
  component: HsApplicationsPage,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);

type PartnerApp = {
  id: string;
  general_id: string;
  opportunity_id: string;
  version_id: string | null;
  answers: Record<string, unknown>;
  requirements: Record<string, string>;
  question_notes: Record<string, string>;
  cleared_help: string[];
  status: string;
  submitted_at: string | null;
};
type Assess = {
  session_id: string;
  holland_code: string | null;
  scale_scores: Record<string, number> | null;
};
type EventRow = {
  id: string;
  general_id: string;
  status: string;
  note: string | null;
  created_at: string;
  delivery: Record<string, unknown>;
};

const nameOf = (a: GeneralApplication) =>
  `${a.core.preferredName || a.core.legalFirst || "Student"} ${a.core.legalLast || ""}`.trim();

function HsApplicationsPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState<string>("");
  const [apps, setApps] = useState<GeneralApplication[]>([]);
  const [partner, setPartner] = useState<PartnerApp[]>([]);
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [versions, setVersions] = useState<
    Map<string, { version: number; builder: ApplicationBuilder }>
  >(new Map());
  const [assess, setAssess] = useState<Map<string, Assess>>(new Map());
  const [items, setItems] = useState<Map<string, Record<string, number>>>(new Map());
  const [demo, setDemo] = useState<Map<string, Demographics>>(new Map());
  const [events, setEvents] = useState<EventRow[]>([]);
  const [filter, setFilter] = useState<"all" | AppStatus>("all");
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"list" | "equity">("list");
  const [openId, setOpenId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    sb("application_seasons")
      .select("*")
      .order("program_start", { ascending: false })
      .then(({ data }: { data: Array<Season & { is_current: boolean }> | null }) => {
        setSeasons(data ?? []);
        setSeasonId((data ?? []).find((s) => s.is_current)?.id ?? data?.[0]?.id ?? "");
      });
  }, []);

  useEffect(() => {
    if (!seasonId) return;
    (async () => {
      const { data: g } = await sb("hs_general_applications")
        .select("*")
        .eq("season_id", seasonId)
        .order("submitted_at", { ascending: false, nullsFirst: false });
      const gens = ((g ?? []) as Record<string, unknown>[]).map(hydrateGeneral);
      setApps(gens);
      const ids = gens.map((a) => a.id);
      const [{ data: pa }, { data: opps }, { data: dm }, { data: ev }] = await Promise.all([
        ids.length
          ? sb("hs_partner_applications").select("*").in("general_id", ids)
          : Promise.resolve({ data: [] }),
        sb("opportunities").select("*").eq("type", "internship").order("name"),
        ids.length
          ? sb("hs_demographics").select("application_id, data").in("application_id", ids)
          : Promise.resolve({ data: [] }),
        ids.length
          ? sb("application_status_events")
              .select("*")
              .in("general_id", ids)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);
      setPartner(pa ?? []);
      setDemo(
        new Map(
          ((dm ?? []) as Array<{ application_id: string; data: Demographics }>).map((d) => [
            d.application_id,
            d.data,
          ]),
        ),
      );
      setEvents(ev ?? []);
      const vIds = new Set<string>();
      for (const o of opps ?? []) if (o.application_version_id) vIds.add(o.application_version_id);
      for (const p of (pa ?? []) as PartnerApp[]) if (p.version_id) vIds.add(p.version_id);
      const { data: vs } = vIds.size
        ? await sb("opp_application_versions")
            .select("id, version, builder")
            .in("id", [...vIds])
        : { data: [] };
      const vmap = new Map<string, { version: number; builder: ApplicationBuilder }>();
      for (const v of (vs ?? []) as Array<{ id: string; version: number; builder: unknown }>)
        vmap.set(v.id, { version: v.version, builder: hydrateBuilder(v.builder) });
      setVersions(vmap);
      setListings(
        ((opps ?? []) as ListingRow[]).map((o) => ({
          ...o,
          version:
            o.application_version_id && vmap.has(o.application_version_id)
              ? { id: o.application_version_id, ...vmap.get(o.application_version_id)! }
              : null,
        })),
      );
      const sessIds = gens.map((a) => a.assessment_session_id).filter(Boolean) as string[];
      if (sessIds.length) {
        const [{ data: ss }, { data: rs }] = await Promise.all([
          sb("assessment_sessions")
            .select("session_id, holland_code, scale_scores")
            .in("session_id", sessIds),
          sb("assessment_responses")
            .select("session_id, item_id, response_value, is_practice")
            .in("session_id", sessIds),
        ]);
        setAssess(new Map(((ss ?? []) as Assess[]).map((s) => [s.session_id, s])));
        const im = new Map<string, Record<string, number>>();
        for (const r of (rs ?? []) as Array<{
          session_id: string;
          item_id: string;
          response_value: { likert?: number } | number;
          is_practice: boolean;
        }>) {
          if (r.is_practice) continue;
          const v =
            typeof r.response_value === "number"
              ? r.response_value
              : Number(r.response_value?.likert);
          if (!Number.isFinite(v)) continue;
          im.set(r.session_id, { ...(im.get(r.session_id) ?? {}), [r.item_id]: v });
        }
        setItems(im);
      }
    })();
  }, [seasonId, reload]);

  const submitted = apps.filter((a) => a.status !== "draft");
  const shown = submitted.filter(
    (a) =>
      (filter === "all" || a.status === filter) &&
      (!q ||
        `${nameOf(a)} ${a.core.school} ${a.core.email}`.toLowerCase().includes(q.toLowerCase())),
  );
  const drafts = apps.length - submitted.length;
  const open = apps.find((a) => a.id === openId) ?? null;

  const youFlags = useMemo(() => {
    const m = new Map<string, ReturnType<typeof youEmailFlags>>();
    for (const a of apps)
      m.set(
        a.id,
        youEmailFlags(
          a.core.youEmail,
          apps.filter((o) => o.id !== a.id).map((o) => ({ id: o.id, email: o.core.youEmail })),
        ),
      );
    return m;
  }, [apps]);

  const openHelp = (a: GeneralApplication) =>
    partner
      .filter((p) => p.general_id === a.id)
      .reduce(
        (n, p) =>
          n +
          Object.entries(p.requirements).filter(
            ([k, v]) => v === "help" && !p.cleared_help.includes(k),
          ).length,
        0,
      );

  async function purge() {
    if (
      !confirm(
        "Delete unplaced applications from seasons past their retention period? This can't be undone.",
      )
    )
      return;
    // Call rpc as a method on the client so `this` stays bound.
    const { data, error } = await (
      supabase as unknown as {
        rpc: (f: string) => Promise<{ data: number; error: { message: string } | null }>;
      }
    ).rpc("purge_unplaced_applications");
    setMsg(error ? error.message : `Deleted ${data} expired application${data === 1 ? "" : "s"}.`);
    setReload((n) => n + 1);
  }

  return (
    <div>
      <p className="eyebrow text-green">Internships</p>
      <h1 className="mt-1 font-display text-3xl font-bold">Applications</h1>
      <p className="mt-2 max-w-3xl text-sm text-ink-700">
        Students submit one general application, then partner-specific answers. Only EXPLR admins
        see applications; partners only see who's placed with them. Status changes email the student
        and their parent or guardian.
      </p>
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="label">Season</span>
          <select
            className="field min-h-[44px]"
            value={seasonId}
            onChange={(e) => setSeasonId(e.target.value)}
          >
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <div role="tablist" aria-label="View" className="flex gap-2">
          <button
            role="tab"
            aria-selected={tab === "list"}
            className={tab === "list" ? "btn-ink" : "btn-ghost"}
            onClick={() => setTab("list")}
          >
            Applications
          </button>
          <button
            role="tab"
            aria-selected={tab === "equity"}
            className={tab === "equity" ? "btn-ink" : "btn-ghost"}
            onClick={() => setTab("equity")}
          >
            Equity view
          </button>
        </div>
        <button type="button" className="btn-ghost ml-auto" onClick={purge}>
          Run retention cleanup
        </button>
      </div>
      {msg && (
        <p role="status" className="mt-3 text-sm text-green-deep">
          {msg}
        </p>
      )}

      {tab === "equity" ? (
        <EquityView apps={submitted} demo={demo} listings={listings} />
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <input
              className="field min-h-[44px] max-w-xs"
              placeholder="Search name, school, email"
              aria-label="Search applications"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              className="field min-h-[44px] max-w-[220px]"
              aria-label="Filter by status"
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
            >
              <option value="all">All submitted ({submitted.length})</option>
              {APP_STATUSES.filter((s) => s.key !== "draft").map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label} ({submitted.filter((a) => a.status === s.key).length})
                </option>
              ))}
            </select>
            <span className="text-sm text-ink-500">{drafts} in progress (not submitted)</span>
          </div>
          <div className="mt-4 overflow-x-auto rounded-[var(--radius-card)] border border-line">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-paper-sunken text-xs uppercase tracking-[0.08em] text-ink-700">
                <tr>
                  <th className="p-3">Student</th>
                  <th className="p-3">School · grade</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">#1 choice</th>
                  <th className="p-3">Partner apps</th>
                  <th className="p-3">Flags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-ink-700">
                      No applications here yet.
                    </td>
                  </tr>
                )}
                {shown.map((a) => {
                  const first = a.choices.ranked[0];
                  const firstName = first
                    ? listings.find((l) => `opp:${l.id}` === first)?.name
                    : a.choices.placeAnywhere
                      ? "Place anywhere"
                      : "—";
                  const pas = partner.filter(
                    (p) => p.general_id === a.id && p.status === "submitted",
                  ).length;
                  const yf = youFlags.get(a.id) ?? [];
                  const help = openHelp(a);
                  return (
                    <tr key={a.id} className="hover:bg-mint-tint/40">
                      <td className="p-3">
                        <button
                          type="button"
                          className="min-h-[44px] text-left font-medium text-green-deep underline"
                          onClick={() => setOpenId(a.id)}
                        >
                          {nameOf(a)}
                        </button>
                      </td>
                      <td className="p-3">
                        {a.core.school} · {a.core.gradeFall}
                      </td>
                      <td className="p-3">{APP_STATUS_LABEL[a.status]}</td>
                      <td className="p-3">{firstName}</td>
                      <td className="p-3">{pas}</td>
                      <td className="p-3 text-xs">
                        {yf.length > 0 && (
                          <span className="mr-2 rounded bg-gold-tint px-2 py-1">
                            YOU email {yf[0].kind === "duplicate" ? "duplicate" : "near-match"}
                          </span>
                        )}
                        {help > 0 && (
                          <span className="mr-2 rounded bg-gold-tint px-2 py-1">
                            {help} need help
                          </span>
                        )}
                        {a.core.workPermit && a.core.workPermit !== "yes" && (
                          <span className="rounded bg-paper-sunken px-2 py-1">
                            Work permit: {a.core.workPermit.replace("_", " ")}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {open && (
        <Detail
          app={open}
          onClose={() => setOpenId(null)}
          partner={partner.filter((p) => p.general_id === open.id)}
          listings={listings}
          versions={versions}
          assess={
            open.assessment_session_id ? (assess.get(open.assessment_session_id) ?? null) : null
          }
          items={open.assessment_session_id ? (items.get(open.assessment_session_id) ?? {}) : {}}
          demographics={demo.get(open.id) ?? null}
          events={events.filter((e) => e.general_id === open.id)}
          youFlags={(youFlags.get(open.id) ?? []).map((f) => ({
            ...f,
            name: nameOf(apps.find((a) => a.id === f.id)!),
          }))}
          onChanged={() => setReload((n) => n + 1)}
        />
      )}
    </div>
  );
}

function Detail(props: {
  app: GeneralApplication;
  onClose: () => void;
  partner: PartnerApp[];
  listings: ListingRow[];
  versions: Map<string, { version: number; builder: ApplicationBuilder }>;
  assess: Assess | null;
  items: Record<string, number>;
  demographics: Demographics | null;
  events: EventRow[];
  youFlags: Array<{ id: string; email: string; kind: string; name: string }>;
  onChanged: () => void;
}) {
  const { app: a } = props;
  const c = a.core;
  const [note, setNote] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [staffNotes, setStaffNotes] = useState(a.staff_notes ?? "");
  const listingName = (id: string) => {
    const l = props.listings.find((x) => x.id === id);
    return l?.version?.builder.profile.title || l?.name || "Internship";
  };

  const matches: HsMatch[] = useMemo(() => {
    // Demo students are matched against demo listings only, everyone else against real ones.
    const demoIds = new Set(
      props.listings.filter((l) => isDemoListing(l)).map((l) => `opp:${l.id}`),
    );
    const isDemoApp = a.choices.shown.some((r) => demoIds.has(r));
    const ls = props.listings.filter(
      (l) => l.status === "approved" && isDemoListing(l) === isDemoApp,
    );
    return ls
      .map((l) => {
        const pa = props.partner.find((p) => p.opportunity_id === l.id);
        const builder = pa?.version_id
          ? props.versions.get(pa.version_id)?.builder
          : l.version?.builder;
        const openHelp = pa
          ? Object.entries(pa.requirements)
              .filter(([k, v]) => v === "help" && !pa.cleared_help.includes(k))
              .map(([k]) => k)
          : [];
        return rankListings(
          {
            core: c,
            extras: a.extras,
            scaleScores: props.assess?.scale_scores ?? null,
            hollandCode: props.assess?.holland_code ?? null,
            itemResponses: props.items,
            openNeedHelp: openHelp,
          },
          [listingFromOpportunity(l, builder)],
        )[0];
      })
      .sort((x, y) => Number(y.eligible) - Number(x.eligible) || y.score - x.score);
  }, [a, c, props.listings, props.partner, props.versions, props.assess, props.items]);

  async function setStatus(
    status: "under_review" | "missing" | "placed" | "waitlisted" | "not_placed",
  ) {
    if (status === "missing" && !note.trim())
      return setMsg("Write what's missing first. The student and family will see it.");
    if (status === "placed" && !placeId) return setMsg("Pick the internship to place them in.");
    setBusy(true);
    setMsg(null);
    try {
      const r = await recordApplicationStatus({
        data: {
          generalId: a.id,
          status,
          note: note.trim() || undefined,
          placedOpportunityId: placeId || undefined,
        },
      });
      const sent = Object.values(r.delivery as Record<string, { sent?: boolean }>).filter(
        (d) => d?.sent,
      ).length;
      setMsg(`Status set to ${r.label}. ${sent} message${sent === 1 ? "" : "s"} sent.`);
      setNote("");
      props.onChanged();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  }

  async function toggleHelp(p: PartnerApp, key: string, clear: boolean) {
    await clearNeedHelp({ data: { partnerAppId: p.id, requirement: key, clear } });
    props.onChanged();
  }

  async function saveNotes() {
    const { error } = await sb("hs_general_applications")
      .update({ staff_notes: staffNotes })
      .eq("id", a.id);
    setMsg(error ? error.message : "Notes saved.");
  }

  const lbl = (opts: ReadonlyArray<{ key: string; label: string }>, keys: string[]) =>
    keys.map((k) => opts.find((o) => o.key === k)?.label ?? k).join(", ");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Application from ${nameOf(a)}`}
      className="fixed inset-0 z-50 flex justify-end bg-ink-900/40"
      onClick={props.onClose}
    >
      <div
        className="h-full w-full max-w-3xl overflow-y-auto bg-paper p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">{APP_STATUS_LABEL[a.status]}</p>
            <h2 className="font-display text-2xl font-bold">{nameOf(a)}</h2>
            <p className="text-sm text-ink-700">
              {c.school} · grade {c.gradeFall} · ID {a.pseudo_id}
            </p>
          </div>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-[var(--radius-control)] hover:bg-paper-sunken"
            aria-label="Close"
            onClick={props.onClose}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {props.youFlags.length > 0 && (
          <p className="mt-4 flex items-start gap-2 rounded-[var(--radius-control)] bg-gold-tint p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            YOU email {c.youEmail}:{" "}
            {props.youFlags
              .map(
                (f) => `${f.kind === "duplicate" ? "same as" : "close to"} ${f.name} (${f.email})`,
              )
              .join("; ")}
          </p>
        )}

        <section className="mt-6 rounded-[var(--radius-card)] border border-line p-4">
          <h3 className="font-display text-lg font-semibold">Status</h3>
          <div className="mt-3 grid gap-3">
            <textarea
              className="field"
              rows={2}
              placeholder="Note to the student and family (required for “Missing something”)"
              aria-label="Note to student"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <button
                className="btn-ghost"
                disabled={busy}
                onClick={() => setStatus("under_review")}
              >
                Under review
              </button>
              <button className="btn-ghost" disabled={busy} onClick={() => setStatus("missing")}>
                Missing something
              </button>
              <button className="btn-ghost" disabled={busy} onClick={() => setStatus("waitlisted")}>
                Waitlist
              </button>
              <button className="btn-ghost" disabled={busy} onClick={() => setStatus("not_placed")}>
                Not placed
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="field min-h-[44px] max-w-sm"
                aria-label="Internship to place in"
                value={placeId}
                onChange={(e) => setPlaceId(e.target.value)}
              >
                <option value="">Place in…</option>
                {matches.map((m) => {
                  const id = m.ref.replace(/^opp:/, "");
                  return (
                    <option key={id} value={id} disabled={!m.eligible}>
                      {listingName(id)} · {Math.round(m.score * 100)}%
                      {m.eligible ? "" : ` (${m.blockedLabel})`}
                    </option>
                  );
                })}
              </select>
              <button className="btn-ink" disabled={busy} onClick={() => setStatus("placed")}>
                Place
              </button>
            </div>
            {msg && (
              <p role="status" className="text-sm text-green-deep">
                {msg}
              </p>
            )}
          </div>
          {props.events.length > 0 && (
            <ol className="mt-4 grid gap-1 text-xs text-ink-700">
              {props.events.map((e) => (
                <li key={e.id}>
                  {new Date(e.created_at).toLocaleString()} ·{" "}
                  {APP_STATUS_LABEL[e.status] ?? e.status}
                  {e.note ? ` · “${e.note}”` : ""}
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="mt-6">
          <h3 className="font-display text-lg font-semibold">Matches</h3>
          <ol className="mt-2 grid gap-2 text-sm">
            {matches.slice(0, 8).map((m) => {
              const id = m.ref.replace(/^opp:/, "");
              const reaction = a.choices.reactions[m.ref];
              const rank = a.choices.ranked.indexOf(m.ref);
              return (
                <li key={m.ref} className="rounded-[var(--radius-control)] border border-line p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">
                      {listingName(id)}
                      {rank >= 0 && (
                        <span className="ml-2 rounded-full bg-ink-900 px-2 py-0.5 text-xs text-paper">
                          #{rank + 1}
                        </span>
                      )}
                      {reaction && (
                        <span className="ml-2 text-xs text-ink-700">
                          {REACTIONS.find((r) => r.key === reaction)?.label}
                        </span>
                      )}
                    </span>
                    <span className="font-mono">
                      {m.eligible ? `${Math.round(m.score * 100)}%` : m.blockedLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-700">
                    {Object.entries(m.parts)
                      .map(([k, v]) => `${k} ${Math.round((v ?? 0) * 100)}`)
                      .join(" · ")}
                    {m.adjustments.length
                      ? ` · ${m.adjustments.map((x) => `${x.label} ${x.amount > 0 ? "+" : ""}${Math.round(x.amount * 100)}`).join(" · ")}`
                      : ""}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>

        {props.partner.length > 0 && (
          <section className="mt-6">
            <h3 className="font-display text-lg font-semibold">Partner applications</h3>
            {props.partner.map((p) => {
              const v = p.version_id ? props.versions.get(p.version_id) : null;
              return (
                <div
                  key={p.id}
                  className="mt-3 rounded-[var(--radius-card)] border border-line p-4 text-sm"
                >
                  <p className="font-medium">
                    {listingName(p.opportunity_id)}{" "}
                    <span className="text-xs text-ink-700">
                      · {p.status}{" "}
                      {v ? `· answered version ${v.version}` : "· no partner questions"}
                    </span>
                  </p>
                  {v?.builder.questions.map((qq) => (
                    <div key={qq.id} className="mt-2">
                      <p className="text-ink-700">{qq.prompt}</p>
                      <p className="whitespace-pre-wrap">{formatAnswer(p.answers[qq.id])}</p>
                    </div>
                  ))}
                  {Object.keys(p.requirements).length > 0 && (
                    <ul className="mt-3 grid gap-1">
                      {Object.entries(p.requirements).map(([k, val]) => {
                        const cleared = p.cleared_help.includes(k);
                        return (
                          <li key={k} className="flex flex-wrap items-center gap-2">
                            <span>{REQUIREMENT_BY_KEY.get(k)?.label ?? k}:</span>
                            <span
                              className={
                                val === "help" && !cleared ? "font-medium text-red-700" : ""
                              }
                            >
                              {val === "ack"
                                ? "Acknowledged"
                                : STUDENT_REQ_ANSWERS.find((x) => x.key === val)?.label}
                              {cleared ? " (help arranged)" : ""}
                            </span>
                            {val === "help" && (
                              <button
                                className="min-h-[44px] text-xs underline"
                                onClick={() => toggleHelp(p, k, !cleared)}
                              >
                                {cleared ? "Undo" : "Help arranged: clear"}
                              </button>
                            )}
                            {p.question_notes[k] && (
                              <span className="w-full text-ink-700">
                                Question: {p.question_notes[k]}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </section>
        )}

        <section className="mt-6 grid gap-2 text-sm">
          <h3 className="font-display text-lg font-semibold">General application</h3>
          <Row
            k="Email · cell"
            v={`${c.email} · ${c.phone} (text OK: ${c.okToText ? "yes" : "no"})`}
          />
          <Row k="DOB · ZIP" v={`${c.dob} · ${c.zip}`} />
          <Row k="YOU application email" v={c.youEmail} />
          <Row k="All weeks" v={c.allWeeks ? "Yes" : `No: ${c.datesCant}`} />
          <Row
            k="Getting there"
            v={`${lbl(TRANSPORT_OPTIONS, c.transport)}${c.needsBusPass ? " · needs bus pass" : ""}`}
          />
          <Row k="Work permit" v={c.workPermit || "—"} />
          <Row k="Prior EXPLR" v={c.priorExplr ? c.priorExplrWhich || "Yes" : "No"} />
          <Row k="Made / fixed / figured out" v={c.madeFixed} />
          <Row k="Hopes" v={c.hopeToGet} />
          <Row k="Support needs" v={c.supportNeeds || "—"} />
          <Row
            k="Guardian"
            v={
              [c.guardianName, c.guardianPhone, c.guardianEmail].filter(Boolean).join(" · ") || "—"
            }
          />
          <Row k="Emergency" v={`${c.emergencyName} · ${c.emergencyPhone}`} />
          <Row
            k="Signed"
            v={[c.consentStudentName, c.consentGuardianName].filter(Boolean).join(" · ")}
          />
          <Row k="Jobs thought about" v={c.jobsThought || "—"} />
          <Row
            k="After high school"
            v={`${lbl(POST_HS_PLANS, c.postHs)} (sure: ${c.planSure}/5)`}
          />
          <Row k="College courses" v={c.collegeCourses ? c.collegeCoursesWhich : "No"} />
          <Row k="Career-tech" v={c.careerTech ? c.careerTechWhich : "No"} />
          <Row
            k="Credentials"
            v={[...c.credentials, c.credentialsOther].filter(Boolean).join(", ") || "—"}
          />
          <Row k="Holland code" v={props.assess?.holland_code ?? "—"} />
          <Row
            k="Career fields"
            v={a.extras.fields.map((f) => CAREER_FIELD_LABEL[f] ?? f).join(", ")}
          />
          <Row
            k="Work style"
            v={ENVIRONMENT_DIMS.map(
              (d) => `${d.left}↔${d.right}: ${a.extras.environment[d.key] ?? "—"}`,
            ).join(" · ")}
          />
          <Row k="Want to try" v={a.choices.tryText || "—"} />
          {props.demographics && (
            <Row
              k="Demographics (reporting)"
              v={Object.entries(props.demographics)
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join("/") : v}`)
                .join(" · ")}
            />
          )}
        </section>

        <section className="mt-6">
          <label className="label" htmlFor="staff-notes">
            Staff notes (never shared)
          </label>
          <textarea
            id="staff-notes"
            className="field"
            rows={3}
            value={staffNotes}
            onChange={(e) => setStaffNotes(e.target.value)}
          />
          <button className="btn-ghost mt-2" onClick={saveNotes}>
            Save notes
          </button>
        </section>
        <p className="mt-6 text-xs text-ink-500">
          Older applications are under{" "}
          <Link to="/instructor/admin/applications" className="ink-link">
            Legacy applications
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[200px_1fr]">
      <span className="text-ink-700">{k}</span>
      <span className="whitespace-pre-wrap break-words">{v || "—"}</span>
    </div>
  );
}

function formatAnswer(v: unknown): string {
  if (v === undefined || v === null || v === "") return "—";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("yes" in o) return `${o.yes ? "Yes" : "No"}${o.text ? `: ${o.text}` : ""}`;
    return Object.entries(o)
      .map(([k, x]) => `${k}: ${String(x).replace(/_/g, " ")}`)
      .join("\n");
  }
  return String(v);
}

function EquityView({
  apps,
  demo,
  listings,
}: {
  apps: GeneralApplication[];
  demo: Map<string, Demographics>;
  listings: ListingRow[];
}) {
  const placed = (a: GeneralApplication) => a.status === "placed";
  const group = (label: string, keyOf: (a: GeneralApplication) => string[]) => {
    const m = new Map<string, { applied: number; placed: number }>();
    for (const a of apps)
      for (const k of keyOf(a)) {
        const cur = m.get(k) ?? { applied: 0, placed: 0 };
        cur.applied++;
        if (placed(a)) cur.placed++;
        m.set(k, cur);
      }
    const rows = [...m.entries()].sort((x, y) => y[1].applied - x[1].applied);
    return (
      <section key={label} className="rounded-[var(--radius-card)] border border-line p-4">
        <h3 className="font-display text-lg font-semibold">By {label}</h3>
        <table className="mt-2 w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-[0.08em] text-ink-700">
            <tr>
              <th className="py-1">{label}</th>
              <th className="py-1 text-right">Applied</th>
              <th className="py-1 text-right">Placed</th>
              <th className="py-1 text-right">Rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-t border-line">
                <td className="py-1">{k}</td>
                <td className="py-1 text-right tabular-nums">{v.applied}</td>
                <td className="py-1 text-right tabular-nums">{v.placed}</td>
                <td className="py-1 text-right tabular-nums">
                  {v.applied ? Math.round((100 * v.placed) / v.applied) : 0}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    );
  };
  const d = (a: GeneralApplication) => demo.get(a.id) ?? {};
  const seats = listings
    .filter((l) => l.status === "approved")
    .reduce((n, l) => n + (l.version?.builder.profile.seats ?? 0), 0);
  return (
    <div className="mt-6 grid gap-4">
      <p className="text-sm text-ink-700">
        {apps.length} submitted · {apps.filter(placed).length} placed · {seats} seats listed in
        published partner applications. Demographics are self-reported and optional; “Not reported”
        counts students who skipped.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {group("school", (a) => [a.core.school || "Unknown"])}
        {group("grade", (a) => [a.core.gradeFall || "Unknown"])}
        {group("gender", (a) => [d(a).gender || "Not reported"])}
        {group("race", (a) => (d(a).race?.length ? d(a).race! : ["Not reported"]))}
        {group("Hispanic or Latino", (a) => [d(a).ethnicity || "Not reported"])}
        {group("first-gen college", (a) => [d(a).firstGen || "Not reported"])}
      </div>
    </div>
  );
}
