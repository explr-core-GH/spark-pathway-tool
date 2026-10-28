import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type ProfileKind = "student" | "educator" | "organization";

/**
 * Self sign-up with email confirmation turned on returns no session, so the
 * profile row (students / educators / organizations) cannot be written at
 * sign-up time. The sign-up pages save what the form collected in the auth
 * user's metadata; on the first sign-in this creates the missing row from it.
 *
 * Safe to call on every sign-in: it does nothing when the row already exists
 * or when the metadata carries no `account` kind (OAuth or older accounts).
 */
export async function completeProfileFromMetadata(user: User): Promise<ProfileKind | null> {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const kind = meta.account;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const email = user.email ?? str(meta.email);

  if (kind === "student") {
    const { data } = await supabase.from("students").select("id").eq("id", user.id).maybeSingle();
    if (data) return null;
    const grade = Number(meta.grade);
    const { error } = await supabase.from("students").insert({
      id: user.id,
      first_name: str(meta.first_name) || null,
      grade: Number.isInteger(grade) && grade >= 4 && grade <= 12 ? grade : 8,
    });
    if (error) throw new Error(error.message);
    return "student";
  }

  if (kind === "educator") {
    const { data } = await supabase.from("educators").select("id").eq("id", user.id).maybeSingle();
    if (data) return null;
    const count = Number(meta.student_count);
    const grades = Array.isArray(meta.grade_levels)
      ? meta.grade_levels.map(Number).filter((g) => Number.isInteger(g))
      : [];
    const { error } = await supabase.from("educators").insert({
      id: user.id,
      full_name: str(meta.full_name) || "Instructor",
      email,
      organization: str(meta.organization) || null,
      program_type: null,
      approved: false,
      school_irn: str(meta.school_irn) || null,
      school_name: str(meta.school_name) || null,
      student_count: Number.isFinite(count) ? count : null,
      grade_levels: grades.length > 0 ? grades : null,
    });
    if (error) throw new Error(error.message);
    return "educator";
  }

  if (kind === "organization") {
    const { data } = await supabase
      .from("organizations")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (data) return null;
    const { error } = await supabase.from("organizations").insert({
      id: user.id,
      name: str(meta.name) || "New partner",
      contact_name: str(meta.contact_name) || null,
      contact_email: email,
      website: str(meta.website) || null,
    });
    if (error) throw new Error(error.message);
    return "organization";
  }

  return null;
}

/** Wording shown when sign-up succeeded but the email must be confirmed first. */
export const CONFIRM_EMAIL_NOTICE =
  "Almost done: check your email for a confirmation link, then sign in to finish setting up.";
