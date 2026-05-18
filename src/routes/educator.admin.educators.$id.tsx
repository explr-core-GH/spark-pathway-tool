import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EducatorSchoolEditor } from "@/components/EducatorSchoolEditor";
import { PROGRAM_META, PROGRAM_TYPES, type ProgramType } from "@/lib/educator";

export const Route = createFileRoute("/educator/admin/educators/$id")({
  head: () => ({ meta: [{ title: "Manage educator — Admin" }] }),
  component: ManageEducator,
});

type Ed = { id: string; full_name: string; email: string; organization: string | null; program_type: ProgramType; role: "educator" | "admin"; approved: boolean; school_irn: string | null; school_name: string | null };

function ManageEducator() {
  const { id } = Route.useParams();
  const [ed, setEd] = useState<Ed | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("educators").select("*").eq("id", id).maybeSingle().then(({ data }) => setEd(data as Ed));
  }, [id]);

  async function update(patch: Partial<Ed>) {
    if (!ed) return;
    const { error } = await supabase.from("educators").update(patch).eq("id", ed.id);
    if (error) setStatus(error.message);
    else { setEd({ ...ed, ...patch }); setStatus("Saved."); }
  }

  if (!ed) return <main className="mx-auto max-w-2xl px-6 py-24 text-sm text-charcoal-400">Loading…</main>;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link to="/educator/admin" className="ink-link text-sm">← Admin</Link>
      <h1 className="mt-4 text-3xl font-light">{ed.full_name}</h1>
      <p className="mt-1 text-sm text-charcoal-500">{ed.email}</p>

      <section className="mt-10 grid gap-6 sm:grid-cols-2">
        <div>
          <label className="label">Program type</label>
          <select className="field" value={ed.program_type} onChange={(e) => update({ program_type: e.target.value as ProgramType })}>
            {PROGRAM_TYPES.map((pt) => <option key={pt} value={pt}>{PROGRAM_META[pt].label}</option>)}
          </select>
        </div>
        {/* Role is always 'educator' here — admins live in public.admins,
            not in this table. The field is shown read-only so the admin
            doesn't expect to be able to promote an educator from here.
            To make someone an admin, invite them as an admin from
            /educator/admin/invites. */}
        <div>
          <label className="label">Role</label>
          <input
            className="field bg-charcoal-50 text-charcoal-500"
            value="educator"
            readOnly
          />
        </div>
        <div>
          <label className="label">Approved</label>
          <button onClick={() => update({ approved: !ed.approved })} className="btn-ghost">{ed.approved ? "✓ approved · revoke" : "approve"}</button>
        </div>
        <div>
          <label className="label">Organization</label>
          <input className="field" value={ed.organization ?? ""} onChange={(e) => setEd({ ...ed, organization: e.target.value })} onBlur={() => update({ organization: ed.organization })} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xs uppercase tracking-wider text-charcoal-400 mb-3">School</h2>
        <EducatorSchoolEditor educatorId={ed.id} initialIrn={ed.school_irn} initialName={ed.school_name} />
      </section>
      {status && <p className="mt-6 text-xs text-charcoal-500">{status}</p>}
    </main>
  );
}
