import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { isOppSlug, oppIdFromSlug, type Opportunity } from "@/lib/opportunities";
import type { RIASECCode } from "@/lib/riasec";
import { hoursCount } from "@/lib/wbl-taxonomy";
import {
  MATCH_WEIGHTS,
  rankFor,
  targetFromOpportunity,
  type Candidate,
  type MatchOutcome,
  type Target,
} from "@/lib/matching/placement";

/**
 * /instructor/admin/matching — the placement matching tool. For every open
 * internship, the requesting students ranked by a weighted score, with the
 * hard requirements each one fails shown plainly. Approve or deny requests
 * from here; approvals flow into the existing two-stage application.
 */
export const Route = createFileRoute("/instructor/admin/matching")({
  head: () => ({ meta: [{ title: "Internship matching — Admin" }] }),
  component: () => (
    <RoleGuard requires="admin">
      <Matching />
    </RoleGuard>
  ),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);

type Sel = {
  id: string;
  student_id: string;
  internship_ref: string;
  status: string;
  rank: number | null;
  acknowledgments: string[] | null;
};

function Matching() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [candidatesByRef, setCandidatesByRef] = useState<Record<string, Candidate[]>>({});
  const [sels, setSels] = useState<Sel[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [view, setView] = useState<"listing" | "student">("listing");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: selRows } = await sb("internship_selections")
      .select("id, student_id, internship_ref, status, rank, acknowledgments")
      .in("status", ["requested", "approved"]);
    const selections = (selRows ?? []) as Sel[];
    const refs = [...new Set(selections.map((s) => s.internship_ref))];
    const oppIds = refs.filter(isOppSlug).map(oppIdFromSlug);
    const studentIds = [...new Set(selections.map((s) => s.student_id))];
    const [
      { data: opps },
      { data: students },
      { data: profiles },
      { data: sessions },
      { data: exps },
    ] = await Promise.all([
      oppIds.length
        ? sb("opportunities").select("*").in("id", oppIds)
        : Promise.resolve({ data: [] }),
      studentIds.length
        ? sb("students").select("id, first_name, grade, date_of_birth").in("id", studentIds)
        : Promise.resolve({ data: [] }),
      studentIds.length
        ? sb("internship_profiles").select("*").in("student_id", studentIds)
        : Promise.resolve({ data: [] }),
      studentIds.length
        ? supabase
            .from("assessment_sessions")
            .select("student_id, holland_code, scale_scores, completed_at")
            .in("student_id", studentIds)
            .not("completed_at", "is", null)
            .order("completed_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      studentIds.length
        ? sb("experiences")
            .select(
              "student_id, status, experience_type, hours, verified_hours, career_cluster, stage",
            )
            .in("student_id", studentIds)
        : Promise.resolve({ data: [] }),
    ]);
    const ratingsByStudent = new Map<string, number>();
    const expIds = ((exps ?? []) as { student_id: string }[]).map((e) => e.student_id);
    if (expIds.length) {
      const { data: verified } = await sb("experiences")
        .select("id, student_id")
        .in("student_id", studentIds)
        .eq("status", "verified");
      const vIds = (verified ?? []) as { id: string; student_id: string }[];
      if (vIds.length) {
        const { data: rts } = await sb("experience_ratings")
          .select("experience_id, omj_skill, rating_final")
          .in(
            "experience_id",
            vIds.map((v) => v.id),
          );
        const owner = new Map(vIds.map((v) => [v.id, v.student_id]));
        const bySkill = new Map<string, Set<string>>();
        for (const r of (rts ?? []) as {
          experience_id: string;
          omj_skill: string | null;
          rating_final: number;
        }[]) {
          if (r.rating_final < 3 || !r.omj_skill) continue;
          const sid = owner.get(r.experience_id)!;
          if (!bySkill.has(sid)) bySkill.set(sid, new Set());
          bySkill.get(sid)!.add(r.omj_skill);
        }
        for (const [sid, set] of bySkill) ratingsByStudent.set(sid, set.size);
      }
    }

    const tgs: Target[] = [];
    for (const ref of refs) {
      // Non-`opp:` refs are legacy catalog slugs; skip them.
      if (!isOppSlug(ref)) continue;
      const o = ((opps ?? []) as Opportunity[]).find((x) => x.id === oppIdFromSlug(ref));
      if (o) tgs.push(targetFromOpportunity(o as never));
    }

    const sessByStudent = new Map<
      string,
      { holland_code: string | null; scale_scores: Record<string, number> | null }
    >();
    for (const s of (sessions ?? []) as {
      student_id: string;
      holland_code: string | null;
      scale_scores: Record<string, number> | null;
    }[]) {
      if (!sessByStudent.has(s.student_id)) sessByStudent.set(s.student_id, s);
    }
    const profByStudent = new Map(
      ((profiles ?? []) as { student_id: string }[]).map((p) => [p.student_id, p]),
    );
    const stuById = new Map(
      (
        (students ?? []) as {
          id: string;
          first_name: string | null;
          grade: number | null;
          date_of_birth: string | null;
        }[]
      ).map((s) => [s.id, s]),
    );
    const expByStudent = new Map<
      string,
      {
        status: string;
        experience_type: string;
        hours: number | null;
        verified_hours: number | null;
        career_cluster: string | null;
        stage: string;
      }[]
    >();
    for (const e of (exps ?? []) as never[]) {
      const row = e as {
        student_id: string;
        status: string;
        experience_type: string;
        hours: number | null;
        verified_hours: number | null;
        career_cluster: string | null;
        stage: string;
      };
      if (!expByStudent.has(row.student_id)) expByStudent.set(row.student_id, []);
      expByStudent.get(row.student_id)!.push(row);
    }

    const byRef: Record<string, Candidate[]> = {};
    for (const sel of selections) {
      const st = stuById.get(sel.student_id);
      if (!st) continue;
      const sess = sessByStudent.get(sel.student_id);
      const prof = profByStudent.get(sel.student_id) as Record<string, unknown> | undefined;
      const ex = expByStudent.get(sel.student_id) ?? [];
      const verifiedHours = ex
        .filter((e) => hoursCount(e.experience_type, st.grade, e.status))
        .reduce((a, e) => a + Number(e.verified_hours ?? e.hours ?? 0), 0);
      const cand: Candidate = {
        studentId: st.id,
        firstName: st.first_name ?? "Student",
        grade: st.grade,
        dateOfBirth: st.date_of_birth,
        hollandCode: sess?.holland_code ?? null,
        scaleScores: (sess?.scale_scores as Partial<Record<RIASECCode, number>> | null) ?? null,
        profile: prof
          ? {
              career_aspiration: (prof.career_aspiration as string) ?? null,
              intended_major: (prof.intended_major as string) ?? null,
              likes: (prof.likes as string) ?? null,
              coursework:
                (prof.coursework as Candidate["profile"] extends infer P
                  ? P extends { coursework: infer C }
                    ? C
                    : never
                  : never) ?? [],
              availability: (prof.availability as { days?: string[] }) ?? {},
              transportation:
                (prof.transportation as Candidate["profile"] extends infer P
                  ? P extends { transportation: infer T }
                    ? T
                    : never
                  : never) ?? null,
            }
          : null,
        passport: {
          verifiedHours,
          skillsProficient: ratingsByStudent.get(st.id) ?? 0,
          clusters: [...new Set(ex.map((e) => e.career_cluster).filter((c): c is string => !!c))],
          exposureCount: ex.filter((e) => e.stage === "awareness" || e.stage === "exploration")
            .length,
        },
        rank: sel.rank,
        acknowledgments: sel.acknowledgments ?? [],
      };
      (byRef[sel.internship_ref] ??= []).push(cand);
    }
    setTargets(tgs.sort((a, b) => a.name.localeCompare(b.name)));
    setCandidatesByRef(byRef);
    setSels(selections);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const outcomes = useMemo(() => {
    const m: Record<string, MatchOutcome[]> = {};
    for (const t of targets) m[t.ref] = rankFor(t, candidatesByRef[t.ref] ?? []);
    return m;
  }, [targets, candidatesByRef]);

  async function decide(
    studentId: string,
    ref: string,
    status: "approved" | "denied",
    outcome?: MatchOutcome,
  ) {
    setBusy(`${studentId}:${ref}`);
    await sb("internship_selections")
      .update({
        status,
        decided_at: new Date().toISOString(),
        ...(outcome
          ? {
              match_score: outcome.score,
              match_breakdown: outcome.breakdown,
              hard_fail: outcome.hardFails,
              match_computed_at: new Date().toISOString(),
            }
          : {}),
      })
      .eq("student_id", studentId)
      .eq("internship_ref", ref);
    await load();
    setBusy(null);
  }

  async function saveScores() {
    setBusy("scores");
    for (const t of targets) {
      for (const o of outcomes[t.ref] ?? []) {
        await sb("internship_selections")
          .update({
            match_score: o.score,
            match_breakdown: o.breakdown,
            hard_fail: o.hardFails,
            match_computed_at: new Date().toISOString(),
          })
          .eq("student_id", o.studentId)
          .eq("internship_ref", t.ref);
      }
    }
    setBusy(null);
  }

  const statusOf = (studentId: string, ref: string) =>
    sels.find((s) => s.student_id === studentId && s.internship_ref === ref)?.status ?? "requested";
  const nameOf = (studentId: string) =>
    Object.values(candidatesByRef)
      .flat()
      .find((c) => c.studentId === studentId)?.firstName ?? "Student";

  const byStudent = useMemo(() => {
    const m: Record<string, MatchOutcome[]> = {};
    for (const t of targets) for (const o of outcomes[t.ref] ?? []) (m[o.studentId] ??= []).push(o);
    for (const k of Object.keys(m))
      m[k].sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score);
    return m;
  }, [targets, outcomes]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <p className="eyebrow">Admin</p>
      <h1 className="mt-2 text-3xl font-light">Internship matching</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-500">
        Each requesting student is scored against each internship they picked. Hard requirements
        come first: grade, age at start, hazardous work under 16, every acknowledgment accepted,
        transportation, and days. Then a weighted score: interest fit{" "}
        {Math.round(MATCH_WEIGHTS.riasec * 100)}%, their rank{" "}
        {Math.round(MATCH_WEIGHTS.interestRank * 100)}%, stated goal{" "}
        {Math.round(MATCH_WEIGHTS.aspiration * 100)}%, coursework{" "}
        {Math.round(MATCH_WEIGHTS.coursework * 100)}%, verified experience{" "}
        {Math.round(MATCH_WEIGHTS.experience * 100)}%, availability{" "}
        {Math.round(MATCH_WEIGHTS.availability * 100)}%.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => setView("listing")}
          className={view === "listing" ? "btn-ink text-sm" : "btn-ghost text-sm"}
        >
          By internship
        </button>
        <button
          type="button"
          onClick={() => setView("student")}
          className={view === "student" ? "btn-ink text-sm" : "btn-ghost text-sm"}
        >
          By student
        </button>
        <button
          type="button"
          disabled={busy === "scores" || targets.length === 0}
          onClick={saveScores}
          className="ml-auto btn-ghost text-sm"
        >
          {busy === "scores" ? "Saving…" : "Save scores to requests"}
        </button>
      </div>

      {loading && <p className="mt-8 text-sm text-ink-500">Loading…</p>}
      {!loading && targets.length === 0 && (
        <p className="mt-8 text-sm text-ink-500">No open internship requests yet.</p>
      )}

      {view === "listing" && (
        <div className="mt-6 divide-y divide-line border-y border-line">
          {targets.map((t) => {
            const list = outcomes[t.ref] ?? [];
            const isOpen = open === t.ref;
            return (
              <div key={t.ref}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : t.ref)}
                  className="flex w-full items-center gap-4 py-4 text-left hover:bg-paper-sunken"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{t.name}</span>
                    <span className="block text-xs text-ink-500">
                      {list.length} requesting · {list.filter((o) => o.eligible).length} eligible ·
                      grades {t.gradeMin ?? "?"}-{t.gradeMax ?? "?"}
                      {t.wbl.legal.minAge ? ` · age ${t.wbl.legal.minAge}+` : ""}
                    </span>
                  </span>
                  <span className="text-xs text-ink-500">{isOpen ? "Hide" : "Show"}</span>
                </button>
                {isOpen && (
                  <ol className="divide-y divide-line bg-paper-sunken px-4">
                    {list.map((o) => (
                      <li key={o.studentId} className="py-3">
                        <OutcomeRow
                          o={o}
                          name={nameOf(o.studentId)}
                          status={statusOf(o.studentId, t.ref)}
                          busy={busy === `${o.studentId}:${t.ref}`}
                          onApprove={() => decide(o.studentId, t.ref, "approved", o)}
                          onDeny={() => decide(o.studentId, t.ref, "denied", o)}
                        />
                      </li>
                    ))}
                    {list.length === 0 && (
                      <li className="py-3 text-xs text-ink-500">No requests.</li>
                    )}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
      )}

      {view === "student" && (
        <div className="mt-6 divide-y divide-line border-y border-line">
          {Object.entries(byStudent).map(([sid, list]) => (
            <div key={sid} className="py-4">
              <p className="text-sm font-medium">{nameOf(sid)}</p>
              <ol className="mt-2 flex flex-col gap-2">
                {list.map((o) => (
                  <li key={o.ref} className="rounded border border-line bg-paper-raised px-3 py-2">
                    <p className="text-xs text-ink-500">
                      {targets.find((t) => t.ref === o.ref)?.name}
                    </p>
                    <OutcomeRow
                      o={o}
                      name=""
                      status={statusOf(sid, o.ref)}
                      busy={busy === `${sid}:${o.ref}`}
                      onApprove={() => decide(sid, o.ref, "approved", o)}
                      onDeny={() => decide(sid, o.ref, "denied", o)}
                    />
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function OutcomeRow({
  o,
  name,
  status,
  busy,
  onApprove,
  onDeny,
}: {
  o: MatchOutcome;
  name: string;
  status: string;
  busy: boolean;
  onApprove: () => void;
  onDeny: () => void;
}) {
  const pct = Math.round(o.score * 100);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="min-w-[200px] flex-1">
        <p className="text-sm">
          {name && <span className="font-medium">{name} · </span>}
          <span className={o.eligible ? "text-green-deep" : "text-ink-500"}>{pct}%</span>
          <span className="text-xs text-ink-500"> · {o.why}</span>
        </p>
        <div className="mt-1 h-1.5 w-full max-w-xs overflow-hidden rounded bg-paper-sunken">
          <div className="h-full bg-mint" style={{ width: `${pct}%` }} />
        </div>
        {o.hardFails.length > 0 && (
          <ul className="mt-1 flex flex-wrap gap-1">
            {o.hardFails.map((f) => (
              <li
                key={f}
                className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800"
              >
                {f}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1 text-[11px] text-ink-500">
          {Object.entries(o.breakdown)
            .map(([k, v]) => `${k} ${Math.round((v ?? 0) * 100)}`)
            .join(" · ")}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-ink-500">{status}</span>
        {status !== "approved" && (
          <button
            type="button"
            disabled={busy}
            onClick={onApprove}
            className="btn-ink text-xs"
            title={o.eligible ? "" : "Fails a hard requirement; approve only if you've resolved it"}
          >
            Approve
          </button>
        )}
        {status !== "denied" && (
          <button type="button" disabled={busy} onClick={onDeny} className="btn-ghost text-xs">
            Deny
          </button>
        )}
      </div>
    </div>
  );
}
