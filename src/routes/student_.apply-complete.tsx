import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { RoleGuard } from "@/components/RoleGuard";
import { ResumeForm, EMPTY_RESUME, type Resume } from "@/components/ResumeForm";
import { InternshipApplySection, type Proof } from "@/components/InternshipApplySection";
import { INTERNSHIPS } from "@/lib/internships-catalog";

export const Route = createFileRoute("/student_/apply-complete")({
  head: () => ({ meta: [{ title: "Complete your application — EXPLR" }] }),
  component: () => (
    <RoleGuard requires="student">
      <CompletePage />
    </RoleGuard>
  ),
});

const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);
const CATALOG_NAME: Record<string, string> = Object.fromEntries(INTERNSHIPS.map((i) => [i.slug, i.name]));

type Selection = {
  id: string;
  internship_ref: string;
  opportunity_id: string | null;
  status: string;
};

function CompletePage() {
  const { user, loading: authLoading } = useSession();
  const navigate = useNavigate();

  const [selections, setSelections] = useState<Selection[]>([]);
  const [oppNames, setOppNames] = useState<Record<string, string>>({});
  const [resume, setResume] = useState<Resume>(EMPTY_RESUME);
  const [riasec, setRiasec] = useState<{ holland_code: string | null; scale_scores: unknown }>({ holland_code: null, scale_scores: {} });
  const [proofsBySel, setProofsBySel] = useState<Record<string, Proof[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: sels }, { data: app }, { data: sess }] = await Promise.all([
        sb("internship_selections").select("*").eq("student_id", user.id).eq("status", "approved"),
        supabase.from("internship_applications").select("responses, riasec_snapshot").eq("student_id", user.id).maybeSingle(),
        supabase
          .from("assessment_sessions")
          .select("holland_code, scale_scores, completed_at")
          .eq("student_id", user.id)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      const list = (sels as Selection[]) ?? [];
      setSelections(list);

      // Names for org internships.
      const oppIds = list.map((s) => s.opportunity_id).filter((x): x is string => !!x);
      if (oppIds.length) {
        const { data: opps } = await sb("opportunities").select("id, name").in("id", oppIds);
        const m: Record<string, string> = {};
        for (const o of (opps as Array<{ id: string; name: string | null }>) ?? []) m[o.id] = o.name ?? "Internship";
        setOppNames(m);
      }

      // Prefill résumé from a prior application, else from auth email.
      const prior = (app?.responses as { resume?: Resume } | null)?.resume;
      setResume(prior ? { ...EMPTY_RESUME, ...prior } : { ...EMPTY_RESUME, email: user.email ?? "" });
      setRiasec({
        holland_code: (sess?.holland_code as string) ?? null,
        scale_scores: (sess?.scale_scores as unknown) ?? {},
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  function nameFor(s: Selection): string {
    if (s.opportunity_id) return oppNames[s.opportunity_id] ?? "Internship";
    return CATALOG_NAME[s.internship_ref] ?? s.internship_ref;
  }

  const onProofs = useMemo(
    () => (selectionId: string, proofs: Proof[]) =>
      setProofsBySel((prev) => ({ ...prev, [selectionId]: proofs })),
    [],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!user) return;
    if (!resume.fullName.trim() || !resume.email.trim()) {
      setError("Full name and email are required.");
      return;
    }
    // Every link proof screenshot must be uploaded.
    for (const s of selections) {
      const p = proofsBySel[s.id] ?? [];
      if (p.some((x) => !x.screenshot_url)) {
        setError(`Upload the required screenshot(s) for ${nameFor(s)} before submitting.`);
        return;
      }
    }
    setSubmitting(true);

    const refs = selections.map((s) => s.internship_ref);
    const { error: appErr } = await supabase.from("internship_applications").upsert(
      {
        student_id: user.id,
        submission_term: "2026-summer",
        selected_internship_ids: refs,
        responses: { resume } as never,
        riasec_snapshot: riasec as never,
        status: "submitted",
        submitted_at: new Date().toISOString(),
        decided_at: null,
        staff_notes: null,
      },
      { onConflict: "student_id,submission_term" },
    );
    if (appErr) {
      setSubmitting(false);
      setError(appErr.message);
      return;
    }

    for (const s of selections) {
      await sb("internship_selections")
        .update({
          status: "submitted",
          submitted_at: new Date().toISOString(),
          link_proofs: proofsBySel[s.id] ?? [],
        })
        .eq("id", s.id);
    }
    setSubmitting(false);
    setDone(true);
  }

  if (authLoading || loading) {
    return <main className="mx-auto max-w-3xl px-6 py-24 text-sm text-charcoal-400">Loading…</main>;
  }

  const orgSelections = selections.filter((s) => s.opportunity_id);

  return (
    <div className="min-h-screen">
      <header className="border-b border-charcoal-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link to="/student" className="text-sm tracking-tight">← Back to dashboard</Link>
          <Link to="/sign-out" className="text-sm text-charcoal-500 hover:text-ink">Sign out</Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <p className="eyebrow">Internships · step 2 of 2</p>
        <h1 className="display mt-3">Complete your application</h1>

        {done ? (
          <div className="mt-8 border border-emerald-200 bg-emerald-50 p-6">
            <p className="text-sm font-medium text-emerald-800">Application submitted.</p>
            <p className="mt-1 text-sm text-emerald-800">
              EXPLR staff and the organization can now review it.
            </p>
            <button onClick={() => navigate({ to: "/student" })} className="btn-ink mt-4 text-sm">
              Back to dashboard
            </button>
          </div>
        ) : selections.length === 0 ? (
          <div className="mt-8 border border-charcoal-100 bg-charcoal-50 p-6 text-sm text-charcoal-600">
            <p>You don&apos;t have any approved internships to complete yet.</p>
            <p className="mt-2">
              <Link to="/student/apply" className="ink-link">Request approval to apply</Link> first — an
              admin reviews your picks, then you complete the application here.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8">
            <p className="text-sm text-charcoal-500">
              Approved internships:{" "}
              <span className="font-medium text-ink">
                {selections.map((s) => nameFor(s)).join(", ")}
              </span>
              . Fill your résumé once below; the per-organization steps follow.
            </p>

            <div className="mt-10 space-y-16">
              <ResumeForm resume={resume} setResume={setResume} />

              {orgSelections.length > 0 && (
                <section className="border-t border-charcoal-100 pt-10">
                  <h2 className="text-xl font-light">Per-organization steps</h2>
                  <p className="mt-2 max-w-2xl text-sm text-charcoal-500">
                    Complete the links (with a screenshot as proof) and forms for each internship.
                  </p>
                  <div className="mt-6 space-y-6">
                    {orgSelections.map((s) => (
                      <InternshipApplySection
                        key={s.id}
                        selectionId={s.id}
                        opportunityId={s.opportunity_id as string}
                        studentId={user!.id}
                        name={nameFor(s)}
                        onProofs={onProofs}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>

            {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

            <div className="mt-8 flex items-center justify-end border-t border-charcoal-100 pt-8">
              <button type="submit" disabled={submitting} className="btn-ink disabled:opacity-50">
                {submitting ? "Submitting…" : "Submit application"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
