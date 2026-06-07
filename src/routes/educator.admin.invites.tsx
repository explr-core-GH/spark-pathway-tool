import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { newInviteToken } from "@/lib/educator";

export const Route = createFileRoute("/educator/admin/invites")({
  head: () => ({ meta: [{ title: "Invites — Admin" }] }),
  component: InvitesAdmin,
});

type InviteRole = "educator" | "admin";

type Invite = {
  id: string;
  email: string;
  organization: string | null;
  role: InviteRole;
  token: string;
  invited_at: string;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
};

function InvitesAdmin() {
  const { user } = useSession();
  const [rows, setRows] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState("");
  const [role, setRole] = useState<InviteRole>("educator");
  const [busy, setBusy] = useState(false);
  // Which invite row just had its link copied (for the "Copied!" flash),
  // and which row is showing its link inline as a copy fallback.
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealId, setRevealId] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from("educator_invites")
      .select("*")
      .order("invited_at", { ascending: false });
    setRows(((data ?? []) as unknown) as Invite[]);
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    // Cast through unknown because the generated Database type may not
    // yet include the role column (added in migration 20260518080038).
    // program_type is no longer required on educator invites — teacher
    // tagging by program type was removed.
    const payload = {
      email: email.trim().toLowerCase(),
      organization: org.trim() || null,
      program_type: null,
      role,
      token: newInviteToken(),
      invited_by: user?.id ?? null,
    } as unknown as Record<string, unknown>;
    const { error } = await supabase.from("educator_invites").insert(payload as never);
    setBusy(false);
    if (error) { alert(error.message); return; }
    setEmail(""); setOrg("");
    await load();
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this invite?")) return;
    await supabase.from("educator_invites").delete().eq("id", id);
    await load();
  }

  function inviteUrl(token: string) {
    return `${window.location.origin}/educator/invite/${token}`;
  }

  // Copy with a fallback: navigator.clipboard is blocked in the Lovable
  // preview iframe (and any non-secure context), so fall back to a hidden
  // textarea + execCommand. If even that fails, reveal the link inline so
  // the admin can select and copy it manually.
  async function copy(id: string, token: string) {
    const url = inviteUrl(token);
    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopiedId(id);
      setRevealId(null);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 2000);
    } else {
      // Couldn't copy programmatically — show the link to copy by hand.
      setRevealId(id);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <p className="eyebrow">Admin</p>
      <h1 className="display mt-2">Invites</h1>
      <p className="lead mt-3">
        Generate one-time invite links for new educators and admins. Links
        expire in 14 days.
      </p>

      <form
        onSubmit={create}
        className="mt-10 grid gap-4 border border-charcoal-100 p-6 md:grid-cols-[2fr_2fr_auto]"
      >
        {/* Role picker spans the full width on top */}
        <div className="md:col-span-3">
          <label className="label">Role</label>
          <div className="mt-1 inline-flex border border-charcoal-200">
            {(["educator", "admin"] as InviteRole[]).map((r) => {
              const on = r === role;
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setRole(r)}
                  className={on
                    ? "px-4 py-1.5 text-xs font-semibold"
                    : "px-4 py-1.5 text-xs font-medium text-charcoal-500 hover:text-ink"
                  }
                  style={on ? { background: "var(--ink)", color: "var(--bg)" } : undefined}
                >
                  {r === "educator" ? "Educator" : "Admin"}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-charcoal-500">
            {role === "educator"
              ? "Educator accounts auto-approve on activation. Admins assign them to camp sessions afterwards."
              : "Admin accounts have full access to the admin tools."}
          </p>
        </div>

        <div>
          <label className="label">Email</label>
          <input
            className="field mt-1"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={role === "admin" ? "admin@explr.cc" : "teacher@school.edu"}
          />
        </div>

        <div>
          <label className="label">Organization</label>
          <input
            className="field mt-1"
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            placeholder="School, district, team #, etc."
          />
        </div>

        <div className="flex items-end">
          <button type="submit" disabled={busy} className="btn-ink w-full">
            {busy ? "Creating…" : "Create invite"}
          </button>
        </div>
      </form>

      <h2 className="eyebrow mt-12">All invites</h2>
      <ul className="mt-4 divide-y divide-charcoal-100 border-y border-charcoal-100">
        {rows.map((r) => {
          const expired = new Date(r.expires_at) < new Date();
          const status = r.accepted_at ? "Accepted" : expired ? "Expired" : "Pending";
          const statusColor = r.accepted_at
            ? "var(--color-explr-600)"
            : expired
              ? "var(--color-charcoal-400)"
              : "var(--ink)";
          return (
            <li key={r.id} className="py-3">
              <div className="flex items-center gap-4">
                <span
                  className="w-16 shrink-0 text-[10px] uppercase tracking-wider font-semibold text-charcoal-500"
                  title={r.role === "admin" ? "Admin invite" : "Educator invite"}
                >
                  {r.role === "admin" ? "Admin" : "Educator"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{r.email}</p>
                  <p className="text-xs text-charcoal-500 truncate">
                    {r.role === "admin" ? "Admin" : "Educator"}
                    {r.organization ? ` · ${r.organization}` : ""}
                    {" · invited "}{new Date(r.invited_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs font-medium" style={{ color: statusColor }}>
                  {status}
                </span>
                {!r.accepted_at && !expired && (
                  <button
                    onClick={() => copy(r.id, r.token)}
                    className="text-xs underline hover:text-ink"
                    style={{ color: copiedId === r.id ? "var(--color-explr-600)" : "var(--color-charcoal-500)" }}
                  >
                    {copiedId === r.id ? "Copied!" : "Copy link"}
                  </button>
                )}
                <button
                  onClick={() => revoke(r.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Revoke
                </button>
              </div>
              {/* Fallback: if programmatic copy was blocked, show the link
                  so the admin can select it and copy by hand. */}
              {revealId === r.id && (
                <input
                  readOnly
                  className="field mt-2 text-xs"
                  value={inviteUrl(r.token)}
                  onFocus={(e) => e.currentTarget.select()}
                />
              )}
            </li>
          );
        })}
        {rows.length === 0 && (
          <li className="py-6 text-sm text-charcoal-500">No invites yet.</li>
        )}
      </ul>
    </main>
  );
}
