import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { newInviteToken, PROGRAM_TYPES, PROGRAM_META, type ProgramType } from "@/lib/educator";

export const Route = createFileRoute("/educator/admin/")({
  head: () => ({ meta: [{ title: "Admin — EXPLR" }] }),
  component: AdminHome,
});

type Educator = { id: string; full_name: string; email: string; program_type: string; role: string; approved: boolean };

function AdminHome() {
  const [educators, setEducators] = useState<Educator[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteOrg, setInviteOrg] = useState("");
  const [inviteType, setInviteType] = useState<ProgramType>("stem");
  const [generated, setGenerated] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("educators").select("id, full_name, email, program_type, role, approved").order("created_at", { ascending: false }).then(({ data }) => {
      setEducators((data as Educator[]) ?? []);
    });
  }, []);

  async function createInvite(e: React.FormEvent) {
    e.preventDefault();
    const token = newInviteToken();
    const { error } = await supabase.from("educator_invites").insert({
      email: inviteEmail, organization: inviteOrg || null, program_type: inviteType, token,
    });
    if (error) { alert(error.message); return; }
    setGenerated(`${window.location.origin}/educator/invite/${token}`);
    setInviteEmail(""); setInviteOrg("");
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <p className="eyebrow">Admin</p>
      <h1 className="mt-3 text-4xl font-light">Operations</h1>

      <section className="mt-16">
        <h2 className="text-xs uppercase tracking-wider text-charcoal-400 mb-4">Create educator invite</h2>
        <form onSubmit={createInvite} className="grid gap-4 sm:grid-cols-[1fr_1fr_180px_auto]">
          <input className="field" placeholder="email" type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
          <input className="field" placeholder="organization (optional)" value={inviteOrg} onChange={(e) => setInviteOrg(e.target.value)} />
          <select className="field" value={inviteType} onChange={(e) => setInviteType(e.target.value as ProgramType)}>
            {PROGRAM_TYPES.map((pt) => <option key={pt} value={pt}>{PROGRAM_META[pt].label}</option>)}
          </select>
          <button className="btn-ink">Generate link</button>
        </form>
        {generated && (
          <div className="mt-4 border border-charcoal-200 bg-white p-3">
            <p className="eyebrow mb-2">Copyable invite link</p>
            <code className="block break-all text-sm">{generated}</code>
            <button onClick={() => navigator.clipboard.writeText(generated)} className="ink-link mt-2 text-xs">Copy</button>
          </div>
        )}
      </section>

      <section className="mt-16">
        <h2 className="text-xs uppercase tracking-wider text-charcoal-400 mb-4">Educators · {educators.length}</h2>
        <div className="divide-y divide-charcoal-100 border-y border-charcoal-100">
          {educators.map((e) => (
            <Link key={e.id} to="/educator/admin/educators/$id" params={{ id: e.id }} className="grid grid-cols-[1fr_1fr_140px_120px_80px] items-baseline gap-4 py-3 text-sm hover:bg-charcoal-50">
              <span className="font-medium">{e.full_name}</span>
              <span className="text-charcoal-500">{e.email}</span>
              <span className="text-xs text-charcoal-400">{e.program_type}</span>
              <span className="text-xs text-charcoal-400">{e.role}</span>
              <span className="text-xs">{e.approved ? "✓ approved" : "pending"}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
