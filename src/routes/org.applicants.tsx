import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OrgGuard } from "@/components/OrgGuard";
import { PortalHeader, type PortalLink } from "@/components/passport";
import { ChevronDown, ExternalLink } from "lucide-react";
import { useOrg } from "@/lib/auth";

const PARTNER_LINKS: PortalLink[] = [
  { label: "Overview", to: "/org" },
  { label: "New opportunity", to: "/org/new" },
  { label: "Applicants", to: "/org/applicants" },
];

export const Route = createFileRoute("/org/applicants")({
  head: () => ({ meta: [{ title: "Applicants — EXPLR" }] }),
  component: () => <OrgGuard>{() => <Applicants />}</OrgGuard>,
});

const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);

type Proof = { url: string; label: string; screenshot_url: string | null };
type Sel = {
  id: string;
  student_id: string;
  opportunity_id: string | null;
  link_proofs: Proof[];
  submitted_at: string | null;
};
type Resume = Record<string, unknown> & {
  fullName?: string;
  email?: string;
  phone?: string;
  schoolName?: string;
  expectedGraduation?: string;
  whyThisInternship?: string;
};
type FormRow = { id: string; name: string; opportunity_id: string };
type Completion = {
  form_id: string;
  student_id: string;
  completed_file_url: string | null;
  signed_name: string | null;
};

function Applicants() {
  const { user } = useOrg();
  const [sels, setSels] = useState<Sel[]>([]);
  const [resumes, setResumes] = useState<Record<string, Resume>>({});
  const [oppNames, setOppNames] = useState<Record<string, string>>({});
  const [forms, setForms] = useState<FormRow[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: s } = await sb("internship_selections").select("*").eq("status", "submitted");
      const list = (s as Sel[]) ?? [];
      setSels(list);

      const studentIds = [...new Set(list.map((x) => x.student_id))];
      const oppIds = [
        ...new Set(list.map((x) => x.opportunity_id).filter((y): y is string => !!y)),
      ];

      const [{ data: apps }, { data: opps }, { data: f }, { data: c }] = await Promise.all([
        studentIds.length
          ? supabase
              .from("internship_applications")
              .select("student_id, responses")
              .in("student_id", studentIds)
          : Promise.resolve({ data: [] as Array<{ student_id: string; responses: unknown }> }),
        oppIds.length
          ? sb("opportunities").select("id, name").in("id", oppIds)
          : Promise.resolve({ data: [] }),
        oppIds.length
          ? sb("opportunity_forms").select("id, name, opportunity_id").in("opportunity_id", oppIds)
          : Promise.resolve({ data: [] }),
        studentIds.length
          ? sb("form_completions")
              .select("form_id, student_id, completed_file_url, signed_name")
              .in("student_id", studentIds)
          : Promise.resolve({ data: [] }),
      ]);

      const rmap: Record<string, Resume> = {};
      for (const a of (apps as Array<{
        student_id: string;
        responses: { resume?: Resume } | null;
      }>) ?? []) {
        rmap[a.student_id] = a.responses?.resume ?? {};
      }
      setResumes(rmap);
      const nmap: Record<string, string> = {};
      for (const o of (opps as Array<{ id: string; name: string | null }>) ?? [])
        nmap[o.id] = o.name ?? "Internship";
      setOppNames(nmap);
      setForms((f as FormRow[]) ?? []);
      setCompletions((c as Completion[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="bg-paper text-ink-900">
      <PortalHeader role="Partner" links={PARTNER_LINKS} signedIn />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link
          to="/org"
          className="inline-flex min-h-[44px] items-center text-sm font-medium text-green-deep hover:underline"
        >
          ← Partner portal
        </Link>
        <p className="eyebrow text-green">Internships</p>
        <h1 className="display mt-1">Applicants.</h1>
        <p className="lead mt-3 max-w-2xl">
          Students who completed an application to one of your internships.
        </p>

        {loading ? (
          <p className="mt-8 text-sm text-ink-500">Loading…</p>
        ) : sels.length === 0 ? (
          <p className="mt-8 rounded-[var(--radius-card)] border border-dashed border-line-strong bg-paper-raised px-6 py-10 text-center text-sm text-ink-700">
            No completed applications yet.
          </p>
        ) : (
          <div className="mt-8 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper-raised shadow-card">
            {sels.map((s) => {
              const r = resumes[s.student_id] ?? {};
              const isOpen = open === s.id;
              const oppForms = forms.filter((f) => f.opportunity_id === s.opportunity_id);
              const myCompletions = completions.filter((c) => c.student_id === s.student_id);
              return (
                <div key={s.id}>
                  <button
                    onClick={() => setOpen(isOpen ? null : s.id)}
                    aria-expanded={isOpen}
                    className="flex min-h-[44px] w-full items-center gap-4 px-4 py-4 text-left hover:bg-mint-tint/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {r.fullName || "Student"}
                        <span className="ml-2 text-xs font-normal text-ink-700">
                          {s.opportunity_id ? oppNames[s.opportunity_id] : "Internship"}
                        </span>
                      </p>
                      <p className="truncate text-xs text-ink-500">
                        {[r.schoolName, r.expectedGraduation].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-ink-700">
                      {isOpen ? "Hide" : "View"}
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        aria-hidden
                      />
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-line bg-paper px-4 py-5 text-sm">
                      <dl className="grid gap-3 text-xs sm:grid-cols-2">
                        <Detail label="Email" value={r.email} />
                        <Detail label="Phone" value={r.phone} />
                        <Detail label="School" value={r.schoolName} />
                        <Detail label="Expected grad" value={r.expectedGraduation} />
                      </dl>
                      {r.whyThisInternship && (
                        <div className="mt-3">
                          <p className="eyebrow">Why this internship</p>
                          <p className="mt-1 whitespace-pre-wrap text-ink-700">
                            {String(r.whyThisInternship)}
                          </p>
                        </div>
                      )}

                      {s.link_proofs && s.link_proofs.length > 0 && (
                        <div className="mt-4">
                          <p className="eyebrow">Link proofs</p>
                          <ul className="mt-1 space-y-1">
                            {s.link_proofs.map((p, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <span className="text-ink-700">{p.label || p.url}</span>
                                {p.screenshot_url ? (
                                  <a
                                    href={p.screenshot_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-medium text-green-deep hover:underline"
                                  >
                                    screenshot <ExternalLink className="h-3 w-3" aria-hidden />
                                  </a>
                                ) : (
                                  <span className="rounded-full bg-gold-tint px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.08em] text-gold-deep">
                                    missing
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {oppForms.length > 0 && (
                        <div className="mt-4">
                          <p className="eyebrow">Forms</p>
                          <ul className="mt-1 space-y-1">
                            {oppForms.map((f) => {
                              const c = myCompletions.find((x) => x.form_id === f.id);
                              return (
                                <li key={f.id} className="flex items-center gap-2">
                                  <span className="text-ink-700">{f.name}</span>
                                  {c?.completed_file_url && (
                                    <a
                                      href={c.completed_file_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-xs font-medium text-green-deep hover:underline"
                                    >
                                      uploaded <ExternalLink className="h-3 w-3" aria-hidden />
                                    </a>
                                  )}
                                  {c?.signed_name && (
                                    <span className="rounded-full bg-mint-tint px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.08em] text-green-deep">
                                      signed: {c.signed_name}
                                    </span>
                                  )}
                                  {!c?.completed_file_url && !c?.signed_name && (
                                    <span className="text-xs text-ink-500">not submitted</span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: unknown }) {
  if (!value) return null;
  return (
    <div>
      <dt className="label mb-0">{label}</dt>
      <dd className="mt-0.5 text-ink-700">{String(value)}</dd>
    </div>
  );
}
