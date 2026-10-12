import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

// A big, projector-friendly page educators put on screen so students know
// exactly where and how to log in. No passwords here — just the URL, the
// steps, and a QR code. The login link stays on a single line for kids who
// are typing it in.
export const Route = createFileRoute("/instructor/login-display")({
  head: () => ({ meta: [{ title: "How students log in — EXPLR" }] }),
  component: LoginDisplay,
});

function LoginDisplay() {
  const [url, setUrl] = useState("");
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    const u = `${window.location.origin}/sign-in`;
    setUrl(u);
    let active = true;
    // Dynamic import keeps qrcode out of the SSR bundle.
    import("qrcode")
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(u, {
          width: 360,
          margin: 1,
          color: { dark: "#16181C", light: "#ffffff" },
        }),
      )
      .then((d) => {
        if (active) setQr(d);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-[1312px] flex-col justify-center px-4 py-10 text-center sm:px-6 lg:px-8">
      <p className="eyebrow">EXPLR Pathways</p>
      <h1 className="display mt-3 text-4xl md:text-6xl">Let&rsquo;s log in.</h1>

      <p className="mt-8 text-lg text-ink-700">Type this into your web browser:</p>
      <p className="mt-3">
        <span className="inline-block max-w-full overflow-x-auto whitespace-nowrap rounded-[var(--radius-card)] border border-line bg-paper-raised px-4 py-4 font-mono text-xl font-semibold tracking-tight text-ink-900 shadow-card sm:px-6 sm:text-2xl md:text-4xl">
          {url || "…"}
        </span>
      </p>

      <div className="mx-auto mt-12 grid w-full max-w-4xl items-center gap-10 text-left sm:grid-cols-[1fr_auto]">
        <ol className="space-y-4 text-lg text-ink-700">
          <Step n={1}>Go to the link above.</Step>
          <Step n={2}>
            Type your <strong>username</strong> from your card.
          </Step>
          <Step n={3}>
            Type your <strong>password</strong> from your card.
          </Step>
          <Step n={4}>
            Tap <strong>Sign in</strong>. You&rsquo;re in!
          </Step>
        </ol>
        {qr && (
          <div className="mx-auto rounded-[var(--radius-card)] border border-line bg-paper-raised p-4 text-center shadow-card">
            <img src={qr} alt={`QR code linking to ${url}`} className="h-44 w-44 md:h-56 md:w-56" />
            <p className="mt-2 text-xs text-ink-500">Or scan with a phone camera</p>
          </div>
        )}
      </div>

      <p className="mt-12 text-sm text-ink-500">
        Stuck? On the sign-in page, tap &ldquo;Show&rdquo; next to the password box to check it.{" "}
        <Link to="/instructor/dashboard" className="ink-link">
          Back to dashboard
        </Link>
      </p>
    </main>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-900 text-sm font-semibold text-paper">
        {n}
      </span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}
