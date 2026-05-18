import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { INTERNSHIPS, type Internship } from "@/lib/internships-catalog";
import { useSession } from "@/lib/auth";
import { CareerPathwaysDropdown } from "@/components/CareerPathwaysDropdown";

export const Route = createFileRoute("/assessment/internship-interest")({
  head: () => ({ meta: [{ title: "Internship preferences — EXPLR" }] }),
  component: () => (
    <RoleGuard requires="student">
      <InternshipInterest />
    </RoleGuard>
  ),
});

type Response = "yes" | "maybe" | "no";
const OPTIONS: { value: Response; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "No" },
];

function InternshipInterest() {
  const { user, loading: authLoading } = useSession();
  const navigate = useNavigate();
  const [visible, setVisible] = useState<Internship[]>([]);
  const [answers, setAnswers] = useState<Record<string, Response>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: vis }, { data: prev }] = await Promise.all([
        supabase.from("internship_visibility").select("internship_slug, visible"),
        supabase
          .from("internship_interest_responses")
          .select("internship_slug, response")
          .eq("student_id", user.id),
      ]);
      if (cancelled) return;
      const hidden = new Set(
        (vis ?? []).filter((r) => r.visible === false).map((r) => r.internship_slug),
      );
      setVisible(INTERNSHIPS.filter((i) => !hidden.has(i.slug)));
      const prior: Record<string, Response> = {};
      for (const r of prev ?? []) prior[r.internship_slug] = r.response as Response;
      setAnswers(prior);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  async function submit() {
    if (!user) return;
    const missing = visible.filter((i) => !answers[i.slug]);
    if (missing.length > 0) {
      setError(`Please answer all ${visible.length} internships before submitting.`);
      return;
    }
    setSaving(true); setError(null);
    const rows = visible.map((i) => ({
      student_id: user.id,
      internship_slug: i.slug,
      response: answers[i.slug],
    }));
    const { error: respErr } = await supabase
      .from("internship_interest_responses")
      .upsert(rows, { onConflict: "student_id,internship_slug" });
    if (respErr) { setError(respErr.message); setSaving(false); return; }
    const { error: compErr } = await supabase
      .from("internship_interest_completions")
      .upsert({ student_id: user.id, completed_at: new Date().toISOString() }, { onConflict: "student_id" });
    if (compErr) { setError(compErr.message); setSaving(false); return; }
    navigate({ to: "/student" });
  }

  if (authLoading || loading) {
    return <main className="mx-auto max-w-2xl px-6 py-24 text-sm text-charcoal-400">Loading…</main>;
  }

  const answered = visible.filter((i) => answers[i.slug]).length;

  return (
    <div className="min-h-screen">
      <header className="border-b border-charcoal-100">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-sm tracking-tight">EXPLR <span style={{ color: "var(--explr)" }}>Pathways</span></Link>
          <div className="text-xs text-charcoal-500">{answered} of {visible.length}</div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="eyebrow">Internship preferences</p>
        <h1 className="display mt-3">Which internships interest you?</h1>
        <p className="lead mt-6 max-w-2xl">
          This is a quick preference picker — separate from your main RIASEC interest assessment.
          Mark <strong>yes</strong>, <strong>maybe</strong>, or <strong>no</strong> for each EXPLR
          internship so we can rank your application list. You can change your answers later.
        </p>

        <ul className="mt-12 space-y-6">
          {visible.map((i) => (
            <li key={i.slug} className="border-t border-charcoal-100 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow" style={{ color: "var(--explr)" }}>{i.theme}</p>
                  <h3 className="mt-1 text-lg font-medium">
                    <span className="mr-2" aria-hidden>{i.emoji}</span>{i.name}
                  </h3>
                  <p className="mt-1 text-sm text-charcoal-500">{i.deliverables}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {OPTIONS.map((opt) => {
                  const selected = answers[i.slug] === opt.value;
                  const tone =
                    opt.value === "yes"
                      ? { bg: "#16a34a", border: "#15803d" }
                      : opt.value === "maybe"
                      ? { bg: "#d97706", border: "#b45309" }
                      : { bg: "#dc2626", border: "#b91c1c" };
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setAnswers((a) => ({ ...a, [i.slug]: opt.value }))}
                      className="border px-3 py-2 text-sm font-medium transition-colors"
                      style={{
                        borderColor: selected ? tone.border : "var(--color-charcoal-200)",
                        background: selected ? tone.bg : "transparent",
                        color: selected ? "#ffffff" : "var(--color-charcoal-600)",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <CareerPathwaysDropdown internshipSlug={i.slug} />
            </li>
          ))}
        </ul>

        {error && <p className="mt-8 text-sm text-destructive">{error}</p>}

        <div className="mt-12 flex items-center justify-between">
          <Link to="/student" className="text-sm text-charcoal-500 hover:text-ink">← Cancel</Link>
          <button onClick={submit} disabled={saving} className="btn-ink disabled:opacity-50">
            {saving ? "Saving…" : "Submit and see internships"}
          </button>
        </div>
      </main>
    </div>
  );
}
