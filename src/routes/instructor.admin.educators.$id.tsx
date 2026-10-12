import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EducatorSchoolEditor } from "@/components/EducatorSchoolEditor";

export const Route = createFileRoute("/instructor/admin/educators/$id")({
  head: () => ({ meta: [{ title: "Manage instructor — Admin" }] }),
  component: ManageEducator,
});

type Ed = {
  id: string;
  full_name: string;
  email: string;
  organization: string | null;
  role: "educator" | "admin";
  approved: boolean;
  school_irn: string | null;
  school_name: string | null;
};

function ManageEducator() {
  const { id } = Route.useParams();
  const [ed, setEd] = useState<Ed | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("educators")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setEd(data as Ed));
  }, [id]);

  async function update(patch: Partial<Ed>) {
    if (!ed) return;
    const { error } = await supabase.from("educators").update(patch).eq("id", ed.id);
    if (error) setStatus(error.message);
    else {
      setEd({ ...ed, ...patch });
      setStatus("Saved.");
    }
  }

  if (!ed)
    return (
      <main
        role="status"
        className="mx-auto max-w-[1312px] px-4 py-24 text-sm text-ink-500 sm:px-6 lg:px-8"
      >
        Loading…
      </main>
    );

  return (
    <main className="mx-auto max-w-[1312px] px-4 py-10 sm:px-6 lg:px-8">
      <Link
        to="/instructor/admin"
        className="inline-flex min-h-[44px] items-center text-sm text-ink-500 hover:text-ink-900"
      >
        ← Admin
      </Link>
      <p className="eyebrow mt-4">Instructor</p>
      <h1 className="mt-2 font-display text-3xl font-bold">{ed.full_name}</h1>
      <p className="mt-1 text-sm text-ink-500">{ed.email}</p>

      <section className="mt-10 grid max-w-3xl gap-6 rounded-[var(--radius-card)] border border-line bg-paper-raised p-6 sm:grid-cols-2">
        {/* Role is always 'educator' here — admins live in public.admins,
            not in this table. The field is shown read-only so the admin
            doesn't expect to be able to promote from here. To make
            someone an admin, invite them as an admin from
            /educator/admin/invites. */}
        <div>
          <label className="label" htmlFor="ed-role">
            Role
          </label>
          <input
            id="ed-role"
            className="field bg-paper-sunken text-ink-700"
            value="instructor"
            readOnly
          />
        </div>
        <div>
          <p className="label">Approved</p>
          <button
            type="button"
            onClick={() => update({ approved: !ed.approved })}
            aria-pressed={ed.approved}
            className="btn-ghost"
          >
            {ed.approved ? "Approved · revoke" : "Approve"}
          </button>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="ed-org">
            Organization
          </label>
          <input
            id="ed-org"
            autoComplete="organization"
            className="field"
            value={ed.organization ?? ""}
            onChange={(e) => setEd({ ...ed, organization: e.target.value })}
            onBlur={() => update({ organization: ed.organization })}
          />
        </div>
      </section>

      <section className="mt-10 max-w-3xl">
        <h2 className="eyebrow mb-3">School</h2>
        <EducatorSchoolEditor
          educatorId={ed.id}
          initialIrn={ed.school_irn}
          initialName={ed.school_name}
        />
      </section>
      {status && (
        <p role="status" className="mt-6 text-sm text-ink-700">
          {status}
        </p>
      )}
    </main>
  );
}
