/** Family-code normalization shared by the code path and guardian accounts. */
export function normalize(code: string): string {
  return code
    .toUpperCase()
    .replace(/^EXPLR[-\s]*/, "")
    .replace(/[^A-Z0-9]/g, "");
}
