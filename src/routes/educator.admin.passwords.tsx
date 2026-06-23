import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { adminResetPassword } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/educator/admin/passwords")({
  head: () => ({ meta: [{ title: "Reset passwords — Admin" }] }),
  component: PasswordsAdmin,
});

function PasswordsAdmin() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      await adminResetPassword({ data: { email: email.trim(), newPassword: pw } });
      setMsg(`Password updated for ${email.trim()}. Hand them the new password to sign in.`);
      setPw("");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Couldn't reset the password.");
    } finally {
      setBusy(false);
    }
  }

  function suggest() {
    const words = ["river", "maple", "comet", "harbor", "willow", "summit", "pine", "delta"];
    const w1 = words[Math.floor(Math.random() * words.length)];
    const w2 = words[Math.floor(Math.random() * words.length)];
    setPw(`${w1}-${w2}-${Math.floor(Math.random() * 90) + 10}`);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="eyebrow">Admin</p>
      <h1 className="display mt-2">Reset a password</h1>
      <p className="lead mt-2">
        Set a new password for any account — student, educator, organization, or admin. Enter the
        email on the account (or a camp student&apos;s username), choose a new password, and hand it
        to them. Camp logins also update on the printable sheet.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-5 border border-charcoal-100 p-6">
        <div>
          <label className="label" htmlFor="rp-email">Account email or camp username</label>
          <input
            id="rp-email"
            className="field"
            required
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teacher@school.org  ·  or  maya42"
          />
        </div>
        <div>
          <label className="label" htmlFor="rp-pw">New password</label>
          <div className="flex gap-2">
            <input
              id="rp-pw"
              className="field"
              type="text"
              required
              minLength={8}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="At least 8 characters"
            />
            <button type="button" onClick={suggest} className="btn-ghost text-sm whitespace-nowrap">
              Suggest
            </button>
          </div>
        </div>

        {msg && (
          <p className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {msg}
          </p>
        )}
        {err && <p className="text-sm text-red-600" role="alert">{err}</p>}

        <button type="submit" disabled={busy || pw.length < 8 || !email.trim()} className="btn-ink disabled:opacity-40">
          {busy ? "Resetting…" : "Reset password"}
        </button>
      </form>

      <p className="mt-4 text-xs text-charcoal-400">
        Users can also reset their own password from the{" "}
        <span className="font-medium">Forgot password</span> link on any sign-in page (requires a
        real email on the account).
      </p>
    </main>
  );
}
