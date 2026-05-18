import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { newInviteToken } from "@/lib/educator";

export const Route = createFileRoute("/educator/admin/")({
  head: () => ({ meta: [{ title: "Admin — EXPLR" }] }),
  component: AdminHome,
});

type Educator = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  approved: boolean;
};

function AdminHome() {
  const [educators, setEducators] = useState<Educator[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteOrg, setInviteOrg] = useState("");
  const [generated, setGenerated] = useState<string | null>(null);

  function refresh() {
    supabase
      .from("educators")
      .select("id, full_name, email, role, approved")
      .order("created_at", { ascending: false })
      .then(({ data }) => setEducators((data as Educator[]) ?? []));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function createInvite(e: React.FormEvent) {
    e.preventDefault();
    const token = newInviteToken();
    const { error } = await supabase.from("educator_invites").insert({
      email: inviteEmail,
      organization: inviteOrg || null,
      program_type: null as never,
      token,
    });
    if (error) {
      alert(error.message);
      return;
    }
    setGenerated(`${window.location.origin}/educator/invite/${token}`);
    setInviteEmail("");
    setInviteOrg("");
  }

  async function approve(id: string) {
    const { error } = await supabase
      .from("educators")
      .update({ approved: true })
      .eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    refresh();
  }

  const pending = educators.filter((e) => !e.approved);
  const active = educators.filter((e) => e.approved);

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <p className="eyebrow">Admin</p>
      <h1 className="mt-3 text-4xl font-light">Operations</h1>

      <section className="mt-16">
        <h2 className="text-xs uppercase tracking-wider text-charcoal-400 mb-4">
          Pending approval · {pending.length}
        </h2>
        {pending.length === 0 ? (
          <p className="py-3 text-sm text-charcoal-400">No pending educators.</p>
        ) : (
          <div className="divide-y divide-charcoal-100 border-y border-charcoal-100">
            {pending.map((e) => (
              <div
                key={e.id}
                className="grid grid-cols-[1fr_1fr_auto] items-center gap-4 py-3 text-sm"
              >
                <span className="font-medium">{e.full_name}</span>
                <span className="text-charcoal-500">{e.email}</span>
                <button className="btn-ink text-xs" onClick={() => approve(e.id)}>
                  Approve
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-16">
        <h2 className="text-xs uppercase tracking-wider text-charcoal-400 mb-4">
          Create educator invite
        </h2>
        <p className="mb-3 text-xs text-charcoal-500">
          Invited educators activate instantly — no further admin approval
          needed. Use Admin → Catalog → Sessions to assign them to camp
          sessions afterwards.
        </p>
        <form
          onSubmit={createInvite}
          className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]"
        >
          <input
            className="field"
            placeholder="email"
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <input
            className="field"
            placeholder="organization (optional)"
            value={inviteOrg}
            onChange={(e) => setInviteOrg(e.target.value)}
          />
          <button className="btn-ink">Generate link</button>
        </form>
        {generated && (
          <div className="mt-4 border border-charcoal-200 bg-white p-3">
            <p className="eyebrow mb-2">Copyable invite link</p>
            <code className="block break-all text-sm">{generated}</code>
            <button
              onClick={() => navigator.clipboard.writeText(generated)}
              className="ink-link mt-2 text-xs"
            >
              Copy
            </button>
          </div>
        )}
      </section>

      <section className="mt-16">
        <h2 className="text-xs uppercase tracking-wider text-charcoal-400 mb-4">
          Active educators · {active.length}
        </h2>
        <div className="divide-y divide-charcoal-100 border-y border-charcoal-100">
          {active.map((e) => (
            <Link
              key={e.id}
              to="/educator/admin/educators/$id"
              params={{ id: e.id }}
              className="grid grid-cols-[1fr_1fr_120px_80px] items-baseline gap-4 py-3 text-sm hover:bg-charcoal-50"
            >
              <span className="font-medium">{e.full_name}</span>
              <span className="text-charcoal-500">{e.email}</span>
              <span className="text-xs text-charcoal-400">{e.role}</span>
              <span className="text-xs">✓ approved</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
