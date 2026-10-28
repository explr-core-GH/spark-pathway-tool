import { reportClientError } from "./error-report.functions";

const seen = new Set<string>();

/** Send one browser error to the server log; de-duplicated per page load. */
export function reportError(
  err: unknown,
  kind: "render" | "window" | "promise",
  role?: string,
): void {
  if (typeof window === "undefined") return;
  const message = err instanceof Error ? err.message : String(err ?? "Unknown error");
  const key = `${kind}:${message}`;
  if (seen.has(key)) return;
  seen.add(key);
  const stack = err instanceof Error ? err.stack : undefined;
  void reportClientError({
    data: { message, stack, path: window.location.pathname, role, kind },
  }).catch(() => undefined);
}

/** Install window-level listeners once (uncaught errors and unhandled promise rejections). */
export function installGlobalErrorReporting(): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onError = (e: ErrorEvent) => reportError(e.error ?? e.message, "window");
  const onRejection = (e: PromiseRejectionEvent) => reportError(e.reason, "promise");
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
