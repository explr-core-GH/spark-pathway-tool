import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { newInviteToken } from "@/lib/educator";

export const Route = createFileRoute("/educator/admin/admin-invites")({
  head: () => ({ meta: [{ title: "Admin invites — Admin" }] }),
  component: AdminInvitesAdmin,
});

type Invite = {
  id: string;
  email: string;
  token: string;
  invited_at: string;
  expires_at: string;
  accepted_at: string | null;
};

type Admin = {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
};

function AdminInvitesAdmin() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [generated, setGenerated] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const [{ data: ads }, { data: invs }] = await Promise.all([
      supabase
        .from("admins")
        .select("id, full_name, email, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("admin_invites")
        .select("id, email, token, invited_at, expires_at, accepted_at")
        .order("invited_at", { ascending: false }),
    ]);
    setAdmins((ads as Admin[]) ?? []);
    setInvites((invs as Invite[]) ?? []);
  }
  useEffect(() => {
    refresh();
  }, []);

  async function createInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const token = newInviteToken();
    const { data: auth } = await supabase.auth.getUser();
    const { error: insErr } = await supabase.from("admin_invites").insert({
      email: inviteEmail.trim(),
      token,
      invited_by: auth.user?.id ?? null,
    });
    if (insErr) {
      setError(insErr.message);
      setBusy(false);
      return;
    }
    setGenerated(`${window.location.origin}/admin/accept/${token}`);
    setInviteEmail("");
    setBusy(false);
    refresh();
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this invite? The link will stop working immediately.")) return;
    await supabase.from("admin_invites").delete().eq("id", id);
    refresh();
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <p className="eyebrow">Admin</p>
      <h1 className="display mt-2">Admin invites</h1>
      <p className="lead mt-3 max-w-2xl">
        Invite another EXPLR admin. Admins do <span className="italic">not</span>{" "}
        need an educator account — they sign in at{" "}
        <code className="bg-charcoal-50 px-1 text-xs">/admin/sign-in</code> and
        manage programs, invites, catalog tags, and curriculum.
      </p>

      {/* Send invite */}
      <form
        onSubmit={createInvite}
        className="mt-10 grid gap-4 border border-charcoal-100 p-6 md:grid-cols-[1fr_auto]"
      >
        <div>
          <label className="label">Admin email</label>
          <input
            type="email"
            required
            className="field mt-1"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="adam@example.org"
          />
        </div>
        <div className="flex items-end">
          <button type="submit" disabled={busy} className="btn-ink w-full">
            {busy ? "Creating…" : "Create invite"}
          </button>
        </div>
        {error && (
          <p className="md:col-span-2 text-sm text-destructive">{error}</p>
        )}
        {generated && (
          <div className="md:col-span-2 border border-explr-200 bg-explr-50 p-3 text-sm">
            <p className="font-semibold text-ink">Invite ready</p>
            <p className="mt-1 break-all font-mono text-xs text-charcoal-700">
              {generated}
            </p>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(generated)}
              className="mt-2 text-xs font-semibold text-explr-700 hover:text-explr-800"
            >
              Copy to clipboard
            </button>
          </div>
        )}
      </form>

      {/* Current admins */}
      <section className="mt-12">
        <h2 className="eyebrow">Current admins · {admins.length}</h2>
        <ul className="mt-4 divide-y divide-charcoal-100 border-y border-charcoal-100">
          {admins.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-3 text-sm">
              <span className="flex-1 font-medium">{a.full_name}</span>
              <span className="text-charcoal-500">{a.email}</span>
              <span className="w-32 text-right text-xs text-charcoal-400">
                Since {new Date(a.created_at).toLocaleDateString()}
              </span>
            </li>
          ))}
          {admins.length === 0 && (
            <li className="py-6 text-sm text-charcoal-500">No admins yet.</li>
          )}
        </ul>
      </section>

      {/* Outstanding invites */}
      <section className="mt-12">
        <h2 className="eyebrow">Invites · {invites.length}</h2>
        <ul className="mt-4 divide-y divide-charcoal-100 border-y border-charcoal-100">
          {invites.map((inv) => {
            const expired = new Date(inv.expires_at) < new Date();
            const status = inv.accepted_at
              ? "Accepted"
              : expired
                ? "Expired"
                : "Pending";
            return (
              <li key={inv.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <span className="flex-1 font-medium">{inv.email}</span>
                <span
                  className="w-20 text-xs"
                  style={{
                    color:
                      status === "Accepted"
                        ? "var(--color-explr-700)"
                        : status === "Expired"
                          ? "var(--color-charcoal-400)"
                          : "var(--color-charcoal-700)",
                  }}
                >
                  {status}
                </span>
                <span className="w-40 text-right text-xs text-charcoal-400">
                  Sent {new Date(inv.invited_at).toLocaleDateString()}
                </span>
                {!inv.accepted_at && (
                  <button
                    onClick={() => revoke(inv.id)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Revoke
                  </button>
                )}
              </li>
            );
          })}
          {invites.length === 0 && (
            <li className="py-6 text-sm text-charcoal-500">No invites yet.</li>
          )}
        </ul>
      </section>
    </main>
  );
}
