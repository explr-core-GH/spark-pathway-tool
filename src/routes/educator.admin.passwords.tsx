import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminCreateEducator, adminResetPassword } from "@/lib/admin-users.functions";
import { INTERNSHIPS } from "@/lib/internships-catalog";
import { oppSlug } from "@/lib/opportunities";

export const Route = createFileRoute("/educator/admin/passwords")({
  head: () => ({ meta: [{ title: "Instructor accounts — Admin" }] }),
  component: AccountsAdmin,
});

const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);

function suggestPassword(): string {
  const words = ["river", "maple", "comet", "harbor", "willow", "summit", "pine", "delta"];
  const w = () => words[Math.floor(Math.random() * words.length)];
  return `${w()}-${w()}-${Math.floor(Math.random() * 90) + 10}`;
}

/** mailto: link with the instructor's login details prefilled. */
function loginMailto(email: string, password: string): string {
  const signIn = `${window.location.origin}/educator/sign-in`;
  const subject = "Your EXPLR Pathways instructor login";
  const body = [
    "Hi,",
    "",
    "Here's your EXPLR Pathways instructor account:",
    "",
    `Sign in: ${signIn}`,
    `Email: ${email}`,
    `Password: ${password}`,
    "",
    "After signing in, open \"Rate your interns\" on your dashboard to see your internship roster and score each student.",
    "",
    "— EXPLR",
  ].join("\n");
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

type InternshipOpt = { ref: string; label: string };

function AccountsAdmin() {
  // ── Create form ──────────────────────────────────────────────────────────
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPw, setCPw] = useState(suggestPassword());
  const [cSlugs, setCSlugs] = useState<string[]>([]);
  const [options, setOptions] = useState<InternshipOpt[]>([]);
  const [cBusy, setCBusy] = useState(false);
  const [cErr, setCErr] = useState<string | null>(null);
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);

  // ── Reset form ───────────────────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [resetCreds, setResetCreds] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    (async () => {
      const opts: InternshipOpt[] = INTERNSHIPS.map((i) => ({ ref: i.slug, label: i.name }));
      const { data: opps } = await sb("opportunities")
        .select("id, name")
        .eq("type", "internship")
        .eq("status", "approved");
      for (const o of (opps ?? []) as Array<{ id: string; name: string | null }>) {
        opts.push({ ref: oppSlug(o.id), label: `${o.name ?? "Internship"} (partner)` });
      }
      setOptions(opts);
    })();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCBusy(true);
    setCErr(null);
    setCreatedCreds(null);
    try {
      const res = await adminCreateEducator({
        data: {
          fullName: cName.trim(),
          email: cEmail.trim(),
          password: cPw,
          internshipSlugs: cSlugs,
        },
      });
      setCreatedCreds({ email: res.email, password: res.password });
      setCName("");
      setCEmail("");
      setCPw(suggestPassword());
      setCSlugs([]);
    } catch (e2) {
      setCErr(e2 instanceof Error ? e2.message : "Couldn't create the account.");
    } finally {
      setCBusy(false);
    }
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);
    setResetCreds(null);
    try {
      await adminResetPassword({ data: { email: email.trim(), newPassword: pw } });
      setMsg(`Password updated for ${email.trim()}.`);
      setResetCreds({ email: email.trim(), password: pw });
      setPw("");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Couldn't reset the password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="eyebrow">Admin</p>
      <h1 className="display mt-2">Instructor accounts</h1>
      <p className="lead mt-2">
        Create an instructor/educator account by hand, connect it to internships, and send
        them their login — or reset any account&apos;s password below.
      </p>

      {/* ── Create ── */}
      <form onSubmit={create} className="mt-8 space-y-5 border border-charcoal-100 p-6">
        <h2 className="eyebrow" style={{ margin: 0 }}>Add an instructor</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="ca-name">Full name</label>
            <input id="ca-name" className="field" required value={cName} onChange={(e) => setCName(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="ca-email">Email</label>
            <input id="ca-email" className="field" type="email" required value={cEmail} onChange={(e) => setCEmail(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="ca-pw">Password</label>
          <div className="flex gap-2">
            <input id="ca-pw" className="field" type="text" required minLength={8} value={cPw} onChange={(e) => setCPw(e.target.value)} />
            <button type="button" onClick={() => setCPw(suggestPassword())} className="btn-ghost text-sm whitespace-nowrap">
              Suggest
            </button>
          </div>
        </div>
        <div>
          <label className="label">Connect to internships <span className="text-charcoal-400">(optional)</span></label>
          <div className="mt-1 max-h-40 space-y-1 overflow-y-auto border border-charcoal-200 bg-white p-2">
            {options.map((o) => (
              <label key={o.ref} className="flex items-center gap-2 px-1 py-0.5 text-sm">
                <input
                  type="checkbox"
                  checked={cSlugs.includes(o.ref)}
                  onChange={(e) =>
                    setCSlugs((prev) =>
                      e.target.checked ? [...prev, o.ref] : prev.filter((r) => r !== o.ref),
                    )
                  }
                />
                {o.label}
              </label>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-charcoal-400">
            They&apos;ll see these rosters on &ldquo;Rate your interns.&rdquo; You can also
            connect later from each internship&apos;s Educators tab.
          </p>
        </div>

        {cErr && <p className="text-sm text-red-600" role="alert">{cErr}</p>}
        <button type="submit" disabled={cBusy || !cName.trim() || !cEmail.trim() || cPw.length < 8} className="btn-ink disabled:opacity-40">
          {cBusy ? "Creating…" : "Create account"}
        </button>

        {createdCreds && (
          <div className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p className="font-medium">Account created — hand them these credentials:</p>
            <p className="mt-1 font-mono text-xs">
              {createdCreds.email} · {createdCreds.password}
            </p>
            <a href={loginMailto(createdCreds.email, createdCreds.password)} className="btn-ink mt-3 inline-block text-xs">
              Email login details
            </a>
            <span className="ml-2 text-xs text-emerald-800">Opens your email app with everything prefilled.</span>
          </div>
        )}
      </form>

      {/* ── Reset ── */}
      <form onSubmit={reset} className="mt-8 space-y-5 border border-charcoal-100 p-6">
        <h2 className="eyebrow" style={{ margin: 0 }}>Reset a password</h2>
        <p className="text-sm text-charcoal-500">
          Works for any account — student, educator, organization, or admin. Camp usernames
          (e.g. <span className="font-mono">maya42</span>) work too, and the printable sheet
          stays in sync.
        </p>
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
            <button type="button" onClick={() => setPw(suggestPassword())} className="btn-ghost text-sm whitespace-nowrap">
              Suggest
            </button>
          </div>
        </div>

        {msg && (
          <div className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {msg}
            {resetCreds && resetCreds.email.includes("@") && !resetCreds.email.endsWith("@camp.explr.local") && (
              <a href={loginMailto(resetCreds.email, resetCreds.password)} className="ml-3 underline">
                Email them the new password
              </a>
            )}
          </div>
        )}
        {err && <p className="text-sm text-red-600" role="alert">{err}</p>}

        <button type="submit" disabled={busy || pw.length < 8 || !email.trim()} className="btn-ink disabled:opacity-40">
          {busy ? "Resetting…" : "Reset password"}
        </button>
      </form>

      <p className="mt-4 text-xs text-charcoal-400">
        Users with a real email can also self-reset from the &ldquo;Forgot password&rdquo; link
        on any sign-in page.
      </p>
    </main>
  );
}
