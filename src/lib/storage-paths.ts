/** Buckets that are private and must be read through signed URLs. */
export const PRIVATE_BUCKETS = ["student-photos", "form-uploads", "curriculum"] as const;
export type PrivateBucket = (typeof PRIVATE_BUCKETS)[number];

/**
 * Object path inside `bucket` for a stored value. New rows store the bare
 * path; older rows hold a full public URL, which this unwraps.
 */
export function storagePath(bucket: string, value: string | null | undefined): string | null {
  if (!value) return null;
  const m = value.match(new RegExp(`/storage/v1/object/(?:public|sign)/${bucket}/([^?#]+)`));
  if (m) return decodeURIComponent(m[1]!);
  if (/^https?:\/\//i.test(value)) return null;
  return value.replace(/^\/+/, "");
}
