import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { newInviteToken } from "@/lib/educator";

export const Route = createFileRoute("/instructor/admin/invites")({
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
    setRows((data ?? []) as unknown as Invite[]);
  }
  useEffect(() => {
    load();
  }, []);

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
    if (error) {
      alert(error.message);
      return;
    }
    setEmail("");
    setOrg("");
    await load();
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this invite?")) return;
    await supabase.from("educator_invites").delete().eq("id", id);
    await load();
  }

  function inviteUrl(token: string) {
    return `${window.location.origin}/instructor/invite/${token}`;
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
    <main className="mx-auto max-w-[1312px] px-4 py-10 sm:px-6 lg:px-8">
      <p className="eyebrow">Admin</p>
      <h1 className="display mt-2">Invites</h1>
      <p className="lead mt-3 max-w-2xl">
        Generate one-time invite links for new instructors and admins. Links expire in 14 days.
      </p>

      <form
        onSubmit={create}
        className="mt-10 grid gap-4 rounded-[var(--radius-card)] border border-line bg-paper-raised p-6 md:grid-cols-[2fr_2fr_auto]"
      >
        {/* Role picker spans the full width on top */}
        <div className="md:col-span-3">
          <label className="label">Role</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {(["educator", "admin"] as InviteRole[]).map((r) => {
              const on = r === role;
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setRole(r)}
                  className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm font-medium ${on ? "border-ink-900 bg-ink-900 text-paper" : "border-line-strong text-ink-700 hover:border-ink-900 hover:text-ink-900"}`}
                >
                  {r === "educator" ? "Instructor" : "Admin"}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-ink-500">
            {role === "educator"
              ? "Instructor accounts auto-approve on activation. Admins assign them to camp sessions afterwards."
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
      <ul className="mt-4 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-paper-raised">
        {rows.map((r) => {
          const expired = new Date(r.expires_at) < new Date();
          const status = r.accepted_at ? "Accepted" : expired ? "Expired" : "Pending";
          const statusCls = r.accepted_at
            ? "bg-mint-tint text-green-deep"
            : expired
              ? "bg-paper-sunken text-ink-500"
              : "bg-gold-tint text-gold-deep";
          return (
            <li key={r.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span
                  className="eyebrow w-16 shrink-0"
                  title={r.role === "admin" ? "Admin invite" : "Instructor invite"}
                >
                  {r.role === "admin" ? "Admin" : "Instructor"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{r.email}</p>
                  <p className="text-xs text-ink-500 truncate">
                    {r.role === "admin" ? "Admin" : "Instructor"}
                    {r.organization ? ` · ${r.organization}` : ""}
                    {" · invited "}
                    {new Date(r.invited_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCls}`}>
                  {status}
                </span>
                {!r.accepted_at && !expired && (
                  <button
                    onClick={() => copy(r.id, r.token)}
                    className={`inline-flex min-h-[44px] items-center text-xs underline ${
                      copiedId === r.id ? "text-green-deep" : "text-ink-500 hover:text-ink-900"
                    }`}
                  >
                    {copiedId === r.id ? "Copied!" : "Copy link"}
                  </button>
                )}
                <button
                  onClick={() => revoke(r.id)}
                  className="inline-flex min-h-[44px] items-center text-xs text-red-700 hover:underline"
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
        {rows.length === 0 && <li className="px-4 py-6 text-sm text-ink-500">No invites yet.</li>}
      </ul>
    </main>
  );
}
