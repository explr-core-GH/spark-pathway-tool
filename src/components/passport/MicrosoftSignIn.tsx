import { useState, type ReactNode } from "react";
import { lovable } from "@/integrations/lovable";

type Props = {
  /** Runs after Microsoft returns and the Supabase session is set. */
  onSignedIn?: () => Promise<void> | void;
  /** Receives the error message so the page can show it in its error area. */
  onError: (message: string) => void;
  className?: string;
  children?: ReactNode;
};

/**
 * MicrosoftSignIn — the shared "Sign in with Microsoft" button used on every
 * sign-in page. Uses the Lovable Cloud managed Microsoft login (no per-app
 * Azure credentials to maintain) and goes through lovable.auth.signInWithOAuth
 * so the preview-iframe web_message flow keeps working.
 */
export function MicrosoftSignIn({ onSignedIn, onError, className, children }: Props) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    onError("");
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("microsoft", {
        redirect_uri: window.location.origin,
      });
      // Full-page flow: the browser is on its way to Microsoft already.
      if (result.redirected) return;
      if (result.error) {
        onError(result.error.message);
        return;
      }
      // Tokens came back and the session is set — send the user onward.
      await onSignedIn?.();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Microsoft sign-in failed. Please try again.");
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
      <svg viewBox="0 0 21 21" width="18" height="18" aria-hidden="true" className="shrink-0">
        <rect x="1" y="1" width="9" height="9" fill="#f25022" />
        <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
        <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
        <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
      </svg>
      <span>{busy ? "Connecting to Microsoft…" : (children ?? "Sign in with Microsoft")}</span>
    </button>
  );
}

/** Divider shown between the password form and the Microsoft button. */
export function OrDivider() {
  return (
    <div className="my-4 flex items-center gap-3 text-xs font-semibold text-ink-500">
      <span className="h-px flex-1 border-t border-line" aria-hidden="true" />
      <span>or</span>
      <span className="h-px flex-1 border-t border-line" aria-hidden="true" />
    </div>
  );
}
