import { useState, type ReactNode } from "react";
import { lovable } from "@/integrations/lovable";

export type SocialProvider = "microsoft" | "google";

type Props = {
  provider?: SocialProvider;
  /** Runs after the provider returns and the Supabase session is set. */
  onSignedIn?: () => Promise<void> | void;
  /** Receives the error message so the page can show it in its error area. */
  onError: (message: string) => void;
  className?: string;
  children?: ReactNode;
};

function ProviderIcon({ provider }: { provider: SocialProvider }) {
  if (provider === "google") {
    return (
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 21 21" width="18" height="18" aria-hidden="true" className="shrink-0">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

const LABELS: Record<SocialProvider, string> = {
  microsoft: "Sign in with Microsoft",
  google: "Sign in with Google",
};

/**
 * SocialSignInButton — the shared "Sign in with Microsoft/Google" button used
 * on every sign-in page. Uses the Lovable Cloud managed social login and goes
 * through lovable.auth.signInWithOAuth so the preview-iframe web_message flow
 * keeps working.
 */
export function SocialSignInButton({
  provider = "microsoft",
  onSignedIn,
  onError,
  className,
  children,
}: Props) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    onError("");
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      // Full-page flow: the browser is on its way to the provider already.
      if (result.redirected) return;
      if (result.error) {
        onError(result.error.message);
        return;
      }
      // Tokens came back and the session is set — send the user onward.
      await onSignedIn?.();
    } catch (e) {
      onError(
        e instanceof Error ? e.message : "Sign-in failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={`btn-ghost w-full justify-center ${className ?? ""}`}
    >
      <ProviderIcon provider={provider} />
      <span>{busy ? "Connecting…" : (children ?? LABELS[provider])}</span>
    </button>
  );
}

/** Divider shown between the password form and the social sign-in buttons. */
export function OrDivider() {
  return (
    <div className="my-4 flex items-center gap-3 text-xs font-semibold text-ink-500">
      <span className="h-px flex-1 border-t border-line" aria-hidden="true" />
      <span>or</span>
      <span className="h-px flex-1 border-t border-line" aria-hidden="true" />
    </div>
  );
}
