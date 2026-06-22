import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import {
  dollars,
  oppTypeMeta,
  type Opportunity,
  type OpportunityForm,
} from "@/lib/opportunities";

export const Route = createFileRoute("/opportunity/$id")({
  head: () => ({ meta: [{ title: "Opportunity — EXPLR" }] }),
  component: OpportunityDetail,
});

const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);

function OpportunityDetail() {
  const { id } = useParams({ from: "/opportunity/$id" });
  const { user } = useSession();
  const [o, setO] = useState<Opportunity | null | undefined>(undefined);
  const [forms, setForms] = useState<OpportunityForm[]>([]);
  const [registered, setRegistered] = useState(false);
  const [isStudent, setIsStudent] = useState(false);

  useEffect(() => {
    sb("opportunities")
      .select("*")
      .eq("id", id)
      .eq("status", "approved")
      .maybeSingle()
      .then(({ data }: { data: Opportunity | null }) => setO((data as Opportunity) ?? null));
    sb("opportunity_forms")
      .select("*")
      .eq("opportunity_id", id)
      .order("sort_order")
      .then(({ data }: { data: OpportunityForm[] | null }) => setForms((data as OpportunityForm[]) ?? []));
  }, [id]);

  useEffect(() => {
    if (!user) return;
    sb("students")
      .select("id")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }: { data: { id: string } | null }) => setIsStudent(!!data));
    sb("opportunity_registrations")
      .select("opportunity_id")
      .eq("student_id", user.id)
      .eq("opportunity_id", id)
      .maybeSingle()
      .then(({ data }: { data: unknown }) => setRegistered(!!data));
  }, [user, id]);

  async function register() {
    if (!user || !o) return;
    const { error } = await sb("opportunity_registrations").insert({
      opportunity_id: o.id,
      student_id: user.id,
    });
    if (error) {
      alert(error.message);
      return;
    }
    setRegistered(true);
  }

  if (o === undefined) {
    return <main className="mx-auto max-w-3xl px-6 py-16 text-sm text-charcoal-400">Loading…</main>;
  }
  if (o === null) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-sm text-charcoal-500">
          That opportunity isn&apos;t available.{" "}
          <Link to="/opportunities" className="ink-link">Back to all opportunities</Link>
        </p>
      </main>
    );
  }

  const meta = oppTypeMeta(o.type);
  const grades = [o.grade_min, o.grade_max].filter((x) => x != null).join("–");

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link to="/opportunities" className="text-xs text-charcoal-500 hover:text-ink">
        ← All opportunities
      </Link>

      {o.image_url && (
        <img src={o.image_url} alt="" className="mt-4 h-56 w-full rounded object-cover" />
      )}

      <div className="mt-5 flex items-center gap-2">
        <span className="rounded-full bg-charcoal-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-charcoal-500">
          {meta.label}
        </span>
        {o.riasec_code && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
            {o.riasec_code}
          </span>
        )}
      </div>
      <h1 className="mt-2 text-3xl font-light">{o.name || "Opportunity"}</h1>
      <div className="mt-2 flex items-center gap-2 text-sm text-charcoal-500">
        {o.org_logo_url && <img src={o.org_logo_url} alt="" className="h-5 w-5 rounded object-cover" />}
        <span>{o.org_name || "Organization"}</span>
      </div>

      {o.description && (
        <p className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-charcoal-700">
          {o.description}
        </p>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-charcoal-100 py-5 text-sm sm:grid-cols-3">
        <Detail label="Dates" value={[o.start_date, o.end_date].filter(Boolean).join(" – ") || "—"} />
        <Detail label="Schedule" value={o.schedule || "—"} />
        <Detail label="Grades" value={grades || "—"} />
        <Detail label="Spots" value={o.capacity != null ? String(o.capacity) : "—"} />
        <Detail label="Cost" value={o.is_free ? "Free" : dollars(o.cost_cents)} />
        <Detail label="Location" value={o.location || "—"} />
      </dl>

      {o.lat != null && o.lng != null && (
        <div className="mt-6">
          <p className="text-xs uppercase tracking-wider text-charcoal-400">Where you&apos;ll be</p>
          <iframe
            title="Map"
            loading="lazy"
            className="mt-2 h-64 w-full border border-charcoal-100"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${o.lng - 0.012}%2C${o.lat - 0.01}%2C${o.lng + 0.012}%2C${o.lat + 0.01}&layer=mapnik&marker=${o.lat}%2C${o.lng}`}
          />
          <a
            href={`https://www.openstreetmap.org/?mlat=${o.lat}&mlon=${o.lng}#map=15/${o.lat}/${o.lng}`}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-xs text-explr-600 hover:underline"
          >
            View larger map ↗
          </a>
        </div>
      )}

      {o.requirements && o.requirements.length > 0 && (
        <section className="mt-6">
          <p className="text-xs uppercase tracking-wider text-charcoal-400">Requirements</p>
          <ul className="mt-2 space-y-1 text-sm text-charcoal-700">
            {o.requirements.map((r) => (
              <li key={r} className="flex items-start gap-2">
                <span className="text-charcoal-400">•</span>
                {r}
              </li>
            ))}
          </ul>
        </section>
      )}

      {o.application_links && o.application_links.length > 0 && (
        <section className="mt-6">
          <p className="text-xs uppercase tracking-wider text-charcoal-400">Links to complete</p>
          <ul className="mt-2 space-y-1 text-sm">
            {o.application_links.map((l, i) => (
              <li key={i}>
                <a href={l.url} target="_blank" rel="noreferrer" className="text-explr-600 hover:underline">
                  {l.label || l.url} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {forms.length > 0 && (
        <section className="mt-6">
          <p className="text-xs uppercase tracking-wider text-charcoal-400">Forms</p>
          <ul className="mt-2 space-y-1 text-sm">
            {forms.map((f) => (
              <li key={f.id}>
                {f.file_url ? (
                  <a href={f.file_url} target="_blank" rel="noreferrer" className="text-explr-600 hover:underline">
                    {f.name} — download
                  </a>
                ) : (
                  f.name
                )}
                {f.requires_signature && <span className="ml-2 text-xs text-charcoal-400">· signature required</span>}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-charcoal-400">
            You&apos;ll download, complete, and sign these as part of applying.
          </p>
        </section>
      )}

      <div className="mt-8 border-t border-charcoal-100 pt-6">
        {o.type === "internship" ? (
          isStudent || user ? (
            <Link to="/student/apply" search={{ opportunity: o.id }} className="btn-ink">
              Apply for this internship
            </Link>
          ) : (
            <Link to="/sign-in" className="btn-ink">Sign in to apply</Link>
          )
        ) : o.registration_mode === "external" && o.external_url ? (
          <a href={o.external_url} target="_blank" rel="noreferrer" className="btn-ink">
            Register on their site ↗
          </a>
        ) : registered ? (
          <span className="inline-block border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
            ✓ Registered
          </span>
        ) : isStudent ? (
          <button onClick={register} className="btn-ink">Register</button>
        ) : (
          <Link to="/sign-in" className="btn-ghost">Sign in to register</Link>
        )}
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-charcoal-400">{label}</dt>
      <dd className="mt-0.5 text-charcoal-700">{value}</dd>
    </div>
  );
}
