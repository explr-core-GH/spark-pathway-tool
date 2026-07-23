import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { RoleGuard } from "@/components/RoleGuard";
import { INTERNSHIPS } from "@/lib/internships-catalog";
import { isOppSlug, oppIdFromSlug } from "@/lib/opportunities";

export const Route = createFileRoute("/educator/worksite")({
  head: () => ({ meta: [{ title: "Your interns — EXPLR" }] }),
  component: () => (
    <RoleGuard requires="educator">
      <WorksitePage />
    </RoleGuard>
  ),
});

const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);
const CATALOG_NAME: Record<string, string> = Object.fromEntries(
  INTERNSHIPS.map((i) => [i.slug, i.name]),
);

/** Basic job-skills rubric — 1 (needs growth) to 5 (outstanding). */
const RUBRIC: Array<{ key: string; label: string }> = [
  { key: "attendance", label: "Attendance & punctuality" },
  { key: "professionalism", label: "Professionalism & attitude" },
  { key: "communication", label: "Communication" },
  { key: "teamwork", label: "Teamwork & collaboration" },
  { key: "directions_safety", label: "Following directions & safety" },
  { key: "initiative", label: "Initiative & work ethic" },
  { key: "quality", label: "Quality of work" },
];

type Placement = { student_id: string; approved_internship_id: string };
type EvalState = {
  rubric: Record<string, number>;
  recommend: boolean;
  notes: string;
  savedAt: number | null;
  dirty: boolean;
};

const EMPTY_EVAL: EvalState = { rubric: {}, recommend: false, notes: "", savedAt: null, dirty: false };
const keyOf = (ref: string, sid: string) => `${ref}::${sid}`;

function WorksitePage() {
  const { user } = useSession();
  const [slugs, setSlugs] = useState<string[] | null>(null);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [grades, setGrades] = useState<Record<string, number | null>>({});
  const [oppNames, setOppNames] = useState<Record<string, string>>({});
  const [evals, setEvals] = useState<Record<string, EvalState>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      // Internships this supervisor is connected to.
      const { data: ie } = await supabase
        .from("internship_educators")
        .select("internship_slug")
        .eq("educator_id", user.id);
      const mySlugs = [
        ...new Set(((ie ?? []) as Array<{ internship_slug: string }>).map((r) => r.internship_slug)),
      ];
      if (cancelled) return;
      setSlugs(mySlugs);
      if (mySlugs.length === 0) return;

      // Their placed students (from formal placements).
      const { data: pl, error: plErr } = await supabase
        .from("internship_placements")
        .select("student_id, approved_internship_id")
        .in("approved_internship_id", mySlugs);
      if (cancelled) return;
      if (plErr) {
        setErr(plErr.message);
        return;
      }
      const placementRows = (pl ?? []) as Placement[];

      // Roster-imported interns (excel logins) — merge into the same shape.
      const { data: rosterRows } = await supabase
        .from("internship_student_logins")
        .select("student_id, internship_slug, child_name")
        .in("internship_slug", mySlugs);
      const rosterPlacements: Placement[] = ((rosterRows ?? []) as Array<{
        student_id: string;
        internship_slug: string;
        child_name: string | null;
      }>).map((r) => ({ student_id: r.student_id, approved_internship_id: r.internship_slug }));

      // Dedupe by (slug, student_id).
      const seen = new Set<string>();
      const rows: Placement[] = [];
      for (const p of [...placementRows, ...rosterPlacements]) {
        const k = `${p.approved_internship_id}::${p.student_id}`;
        if (seen.has(k)) continue;
        seen.add(k);
        rows.push(p);
      }
      setPlacements(rows);

      // Names + grades. Prefer roster child_name for excel-imported interns,
      // fall back to students table for real accounts.
      const sids = [...new Set(rows.map((p) => p.student_id))];
      const nm: Record<string, string> = {};
      const gm: Record<string, number | null> = {};
      for (const r of (rosterRows ?? []) as Array<{ student_id: string; child_name: string | null }>) {
        if (r.child_name) nm[r.student_id] = r.child_name;
      }
      if (sids.length) {
        const { data: studs } = await supabase
          .from("students")
          .select("id, first_name, grade")
          .in("id", sids);
        for (const s of (studs ?? []) as Array<{ id: string; first_name: string | null; grade: number | null }>) {
          if (s.first_name && !nm[s.id]) nm[s.id] = s.first_name;
          gm[s.id] = s.grade;
        }
      }
      if (!cancelled) {
        setNames(nm);
        setGrades(gm);
      }

      // Org-created internships carry opp:<id> refs — resolve their names.
      const oppIds = mySlugs.filter(isOppSlug).map(oppIdFromSlug);
      if (oppIds.length) {
        const { data: opps } = await sb("opportunities").select("id, name").in("id", oppIds);
        const m: Record<string, string> = {};
        for (const o of (opps ?? []) as Array<{ id: string; name: string | null }>) m[o.id] = o.name ?? "Internship";
        if (!cancelled) setOppNames(m);
      }

      // Existing evaluations by this supervisor.
      const { data: ev } = await sb("internship_evaluations")
        .select("internship_ref, student_id, rubric, recommend, notes")
        .eq("evaluator_id", user.id);
      if (cancelled) return;
      const map: Record<string, EvalState> = {};
      for (const e of (ev ?? []) as Array<{
        internship_ref: string;
        student_id: string;
        rubric: Record<string, number> | null;
        recommend: boolean;
        notes: string | null;
      }>) {
        map[keyOf(e.internship_ref, e.student_id)] = {
          rubric: e.rubric ?? {},
          recommend: e.recommend,
          notes: e.notes ?? "",
          savedAt: Date.now(),
          dirty: false,
        };
      }
      setEvals(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const nameFor = (slug: string) =>
    isOppSlug(slug) ? oppNames[oppIdFromSlug(slug)] ?? "Internship" : CATALOG_NAME[slug] ?? slug;

  const byInternship = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const p of placements) {
      const arr = m.get(p.approved_internship_id);
      if (arr) arr.push(p.student_id);
      else m.set(p.approved_internship_id, [p.student_id]);
    }
    for (const arr of m.values()) arr.sort((a, b) => (names[a] ?? "").localeCompare(names[b] ?? ""));
    return m;
  }, [placements, names]);

  function patchEval(ref: string, sid: string, patch: Partial<EvalState>) {
    const k = keyOf(ref, sid);
    setEvals((prev) => ({
      ...prev,
      [k]: { ...(prev[k] ?? EMPTY_EVAL), ...patch, dirty: true, savedAt: prev[k]?.savedAt ?? null },
    }));
  }

  async function save(ref: string, sid: string) {
    if (!user) return;
    const k = keyOf(ref, sid);
    const e = evals[k] ?? EMPTY_EVAL;
    setSaving(k);
    setErr(null);
    const { error } = await sb("internship_evaluations").upsert(
      {
        internship_ref: ref,
        student_id: sid,
        evaluator_id: user.id,
        rubric: e.rubric,
        recommend: e.recommend,
        notes: e.notes.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "internship_ref,student_id,evaluator_id" },
    );
    setSaving(null);
    if (error) {
      setErr(error.message);
      return;
    }
    setEvals((prev) => ({ ...prev, [k]: { ...prev[k], dirty: false, savedAt: Date.now() } }));
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link to="/educator/dashboard" className="text-xs text-charcoal-500 hover:text-ink">
        ← Dashboard
      </Link>
      <p className="eyebrow mt-4">Worksite supervisor</p>
      <h1 className="display mt-2">Your interns</h1>
      <p className="lead mt-2 max-w-2xl">
        Rate each intern on basic job skills — 1 (needs growth) to 5 (outstanding) — and
        check the box if you&apos;d recommend them for advanced opportunities. Your ratings
        save per student and you can update them any time.
      </p>

      {err && <p className="mt-4 text-sm text-red-600">{err}</p>}

      {slugs === null ? (
        <p className="mt-10 text-sm text-charcoal-400">Loading…</p>
      ) : slugs.length === 0 ? (
        <div className="mt-10 border border-charcoal-100 bg-charcoal-50 px-6 py-10 text-center text-sm text-charcoal-500">
          No internships are connected to your account yet. Ask an EXPLR admin to add you
          to your internship.
        </div>
      ) : (
        <div className="mt-10 space-y-12">
          {slugs.map((slug) => {
            const sids = byInternship.get(slug) ?? [];
            return (
              <section key={slug}>
                <div className="flex items-baseline justify-between border-b border-charcoal-100 pb-2">
                  <h2 className="text-lg font-medium">{nameFor(slug)}</h2>
                  <span className="text-xs uppercase tracking-wider text-charcoal-400">
                    {sids.length} intern{sids.length === 1 ? "" : "s"}
                  </span>
                </div>
                {sids.length === 0 ? (
                  <p className="mt-4 text-sm text-charcoal-400">
                    No students placed here yet.
                  </p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {sids.map((sid) => {
                      const k = keyOf(slug, sid);
                      const e = evals[k] ?? EMPTY_EVAL;
                      return (
                        <div key={sid} className="border border-charcoal-100 p-5">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="font-medium">
                              {names[sid] ?? "Student"}
                              {grades[sid] != null && (
                                <span className="ml-2 text-xs font-normal text-charcoal-400">
                                  Grade {grades[sid]}
                                </span>
                              )}
                            </p>
                            <span className="text-xs text-charcoal-400">
                              {e.savedAt && !e.dirty ? "✓ saved" : e.dirty ? "unsaved changes" : ""}
                            </span>
                          </div>

                          <div className="mt-4 space-y-2.5">
                            {RUBRIC.map((r) => (
                              <div key={r.key} className="flex flex-wrap items-center gap-3">
                                <span className="w-56 shrink-0 text-sm text-charcoal-600">
                                  {r.label}
                                </span>
                                <div className="flex gap-1.5" role="radiogroup" aria-label={r.label}>
                                  {[1, 2, 3, 4, 5].map((n) => {
                                    const on = e.rubric[r.key] === n;
                                    return (
                                      <button
                                        key={n}
                                        type="button"
                                        role="radio"
                                        aria-checked={on}
                                        aria-label={`${n} out of 5`}
                                        onClick={() =>
                                          patchEval(slug, sid, { rubric: { ...e.rubric, [r.key]: n } })
                                        }
                                        className="h-8 w-8 border text-sm tabular-nums"
                                        style={
                                          on
                                            ? { background: "var(--ink)", color: "white", borderColor: "var(--ink)" }
                                            : { borderColor: "var(--color-charcoal-200)", color: "var(--color-charcoal-500)" }
                                        }
                                      >
                                        {n}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="mt-4 border-t border-charcoal-100 pt-4">
                            <p className="text-sm text-charcoal-600">
                              Based on this student&apos;s work this summer, would you be
                              willing to provide a recommendation or serve as a reference
                              for them?
                            </p>
                            <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Willing to recommend">
                              {[
                                { val: true, label: "Yes" },
                                { val: false, label: "No" },
                              ].map((opt) => {
                                const on = e.recommend === opt.val;
                                return (
                                  <button
                                    key={opt.label}
                                    type="button"
                                    role="radio"
                                    aria-checked={on}
                                    onClick={() => patchEval(slug, sid, { recommend: opt.val })}
                                    className="min-w-[64px] border px-3 py-1.5 text-sm"
                                    style={
                                      on
                                        ? { background: "var(--ink)", color: "white", borderColor: "var(--ink)" }
                                        : { borderColor: "var(--color-charcoal-200)", color: "var(--color-charcoal-500)" }
                                    }
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="mt-3">
                            <label className="label" htmlFor={`notes-${sid}`}>
                              Notes <span className="text-charcoal-400">(optional)</span>
                            </label>
                            <textarea
                              id={`notes-${sid}`}
                              className="field mt-1"
                              rows={2}
                              maxLength={1000}
                              value={e.notes}
                              onChange={(ev2) => patchEval(slug, sid, { notes: ev2.target.value })}
                            />
                          </div>

                          <button
                            onClick={() => save(slug, sid)}
                            disabled={saving === k || !e.dirty}
                            className="btn-ink mt-4 text-sm disabled:opacity-40"
                          >
                            {saving === k ? "Saving…" : e.savedAt && !e.dirty ? "Saved" : "Save rating"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
