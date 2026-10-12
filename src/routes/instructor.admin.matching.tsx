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
 * /instructor/admin/matching — the placement matching tool. Students apply
 * directly; at the end of the window every listing shows its applicants
 * ranked by the weighted score, with the hard requirements each one fails
 * shown plainly. Place (or un-place) a student from here; placements are
 * what the passport and the hours log read.
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
  const [placements, setPlacements] = useState<
    Array<{ student_id: string; approved_internship_id: string }>
  >([]);
  const [applicationIds, setApplicationIds] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data: selRows } = await sb("internship_selections")
      .select("id, student_id, internship_ref, status, rank, acknowledgments")
      .in("status", ["submitted", "approved"]);
    const selections = (selRows ?? []) as Sel[];
    const [{ data: plRows }, { data: appRows }] = await Promise.all([
      sb("internship_placements").select("student_id, approved_internship_id"),
      sb("internship_applications").select("id, student_id"),
    ]);
    setPlacements((plRows ?? []) as Array<{ student_id: string; approved_internship_id: string }>);
    setApplicationIds(
      Object.fromEntries(
        ((appRows ?? []) as Array<{ id: string; student_id: string }>).map((a) => [
          a.student_id,
          a.id,
        ]),
      ),
    );
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

  const placedAt = (studentId: string, ref: string) =>
    placements.some((p) => p.student_id === studentId && p.approved_internship_id === ref);

  /** Place a student at a listing (or remove the placement). Scores are stored with the selection. */
  async function place(studentId: string, ref: string, on: boolean, outcome?: MatchOutcome) {
    setBusy(`${studentId}:${ref}`);
    if (on) {
      const applicationId = applicationIds[studentId];
      if (!applicationId) {
        alert("This student has not finished their application yet.");
        setBusy(null);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await sb("internship_placements").insert({
        application_id: applicationId,
        student_id: studentId,
        approved_internship_id: ref,
        approved_by: user?.id ?? null,
      });
      if (error) alert(error.message);
      if (outcome)
        await sb("internship_selections")
          .update({
            match_score: outcome.score,
            match_breakdown: outcome.breakdown,
            hard_fail: outcome.hardFails,
            match_computed_at: new Date().toISOString(),
            decided_at: new Date().toISOString(),
          })
          .eq("student_id", studentId)
          .eq("internship_ref", ref);
    } else {
      const { error } = await sb("internship_placements")
        .delete()
        .eq("student_id", studentId)
        .eq("approved_internship_id", ref);
      if (error) alert(error.message);
    }
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
    sels.find((s) => s.student_id === studentId && s.internship_ref === ref)?.status ?? "approved";
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
    <main className="mx-auto max-w-[1312px] px-4 py-10 sm:px-6 lg:px-8">
      <p className="eyebrow">Admin</p>
      <h1 className="display mt-2">Internship matching</h1>
      <p className="mt-3 max-w-2xl text-sm text-ink-700">
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
      <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => setView("listing")}
          aria-pressed={view === "listing"}
          className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm font-medium ${view === "listing" ? "border-ink-900 bg-ink-900 text-paper" : "border-line-strong text-ink-700 hover:border-ink-900 hover:text-ink-900"}`}
        >
          By internship
        </button>
        <button
          type="button"
          onClick={() => setView("student")}
          aria-pressed={view === "student"}
          className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm font-medium ${view === "student" ? "border-ink-900 bg-ink-900 text-paper" : "border-line-strong text-ink-700 hover:border-ink-900 hover:text-ink-900"}`}
        >
          By student
        </button>
        <button
          type="button"
          disabled={busy === "scores" || targets.length === 0}
          onClick={saveScores}
          className="btn-ghost text-sm sm:ml-auto"
        >
          {busy === "scores" ? "Saving…" : "Save scores to requests"}
        </button>
      </div>

      {loading && (
        <p role="status" className="mt-8 text-sm text-ink-500">
          Loading…
        </p>
      )}
      {!loading && targets.length === 0 && (
        <p className="mt-8 text-sm text-ink-500">No open internship requests yet.</p>
      )}

      {view === "listing" && (
        <div className="mt-6 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-paper-raised">
          {targets.map((t) => {
            const list = outcomes[t.ref] ?? [];
            const isOpen = open === t.ref;
            return (
              <div key={t.ref}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : t.ref)}
                  aria-expanded={isOpen}
                  aria-controls={`match-${t.ref.replace(/[^a-zA-Z0-9_-]/g, "-")}`}
                  className="flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-paper-sunken"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-base font-semibold">{t.name}</span>
                    <span className="block text-xs text-ink-500">
                      {list.length} requesting · {list.filter((o) => o.eligible).length} eligible ·
                      grades {t.gradeMin ?? "?"}-{t.gradeMax ?? "?"}
                      {t.wbl.legal.minAge ? ` · age ${t.wbl.legal.minAge}+` : ""}
                    </span>
                  </span>
                  <span className="text-xs font-medium text-green-deep">
                    {isOpen ? "Hide" : "Show"}
                  </span>
                </button>
                {isOpen && (
                  <ol
                    id={`match-${t.ref.replace(/[^a-zA-Z0-9_-]/g, "-")}`}
                    className="divide-y divide-line border-t border-line bg-paper-sunken px-4"
                  >
                    {list.map((o) => (
                      <li key={o.studentId} className="py-3">
                        <OutcomeRow
                          o={o}
                          name={nameOf(o.studentId)}
                          status={statusOf(o.studentId, t.ref)}
                          placed={placedAt(o.studentId, t.ref)}
                          busy={busy === `${o.studentId}:${t.ref}`}
                          onPlace={() => place(o.studentId, t.ref, true, o)}
                          onUnplace={() => place(o.studentId, t.ref, false)}
                        />
                      </li>
                    ))}
                    {list.length === 0 && (
                      <li className="py-3 text-xs text-ink-500">No applicants yet.</li>
                    )}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
      )}

      {view === "student" && (
        <div className="mt-6 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-paper-raised">
          {Object.entries(byStudent).map(([sid, list]) => (
            <div key={sid} className="px-4 py-4">
              <p className="font-display text-base font-semibold">{nameOf(sid)}</p>
              <ol className="mt-2 flex flex-col gap-2">
                {list.map((o) => (
                  <li
                    key={o.ref}
                    className="rounded-[var(--radius-control)] border border-line bg-paper-sunken px-3 py-2"
                  >
                    <p className="text-xs text-ink-500">
                      {targets.find((t) => t.ref === o.ref)?.name}
                    </p>
                    <OutcomeRow
                      o={o}
                      name=""
                      status={statusOf(sid, o.ref)}
                      placed={placedAt(sid, o.ref)}
                      busy={busy === `${sid}:${o.ref}`}
                      onPlace={() => place(sid, o.ref, true, o)}
                      onUnplace={() => place(sid, o.ref, false)}
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
  placed,
  busy,
  onPlace,
  onUnplace,
}: {
  o: MatchOutcome;
  name: string;
  status: string;
  placed: boolean;
  busy: boolean;
  onPlace: () => void;
  onUnplace: () => void;
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
        <div className="mt-1 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-paper-sunken">
          <div className="h-full rounded-full bg-green" style={{ width: `${pct}%` }} />
        </div>
        {o.hardFails.length > 0 && (
          <ul className="mt-1 flex flex-wrap gap-1">
            {o.hardFails.map((f) => (
              <li
                key={f}
                className="rounded-full bg-gold-tint px-2 py-0.5 text-[11px] font-medium text-gold-deep"
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
        <span className="rounded-full bg-paper-sunken px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-700">
          {placed ? "Placed" : status === "submitted" ? "Applied" : "In progress"}
        </span>
        {placed ? (
          <button type="button" disabled={busy} onClick={onUnplace} className="btn-ghost text-xs">
            Remove placement{name ? <span className="sr-only"> for {name}</span> : null}
          </button>
        ) : (
          <button
            type="button"
            disabled={busy || status !== "submitted"}
            onClick={onPlace}
            className="btn-ink text-xs disabled:opacity-40"
            title={status !== "submitted" ? "Waits for the student to finish applying" : undefined}
          >
            Place here
            {name ? <span className="sr-only"> {name}</span> : null}
            {!o.eligible && (
              <span className="sr-only"> (fails a hard requirement; place only if resolved)</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
