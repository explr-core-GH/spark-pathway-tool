import { getRequest } from "@tanstack/react-start/server";

const FALLBACK = "https://explrpathways.org";
const EXACT = new Set(["explrpathways.org", "www.explrpathways.org", "localhost"]);
const SUFFIXES = [".lovable.app", ".lovableproject.com", ".lovableproject-dev.com"];

export function isAllowedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return EXACT.has(h) || SUFFIXES.some((s) => h.endsWith(s));
}

/** Public origin for links in emails. Never trusts a browser-supplied value. */
export function publicOriginFromHost(rawHost: string | null | undefined): string {
  const host = (rawHost ?? "").split(",")[0]!.trim().toLowerCase();
  if (!host || !/^[a-z0-9.-]+(:\d+)?$/.test(host)) return FALLBACK;
  const hostname = host.replace(/:\d+$/, "");
  if (!isAllowedHost(hostname)) return FALLBACK;
  return `${hostname === "localhost" ? "http" : "https"}://${host}`;
}

export function getPublicOrigin(): string {
  try {
    const req = getRequest();
    return publicOriginFromHost(
      req.headers.get("x-forwarded-host") ?? req.headers.get("host"),
    );
  } catch {
    return FALLBACK;
  }
}
