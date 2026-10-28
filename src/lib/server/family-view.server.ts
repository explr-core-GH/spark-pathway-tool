import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Builds the read-only family view for one student. Shared by the
 * family-code session path (getFamilyView) and the guardian account path
 * (getGuardianStudentView) so the two can never drift.
 */

export type Db = SupabaseClient<Database>;

export type FamilyView = {
  firstName: string;
  grade: number | null;
  riasec: { hollandCode: string; scaleScores: Record<string, number> } | null;
  stemDone: boolean;
  /** When the family-code session ends; null for guardian accounts (no expiry). */
  expiresAt: string | null;
  /** This school year's advising plan: checkpoint statuses and the three sign-offs. */
  plan: {
    schoolYear: string;
    checkpoints: Array<{ term: string; status: string; submittedAt: string | null }>;
    studentAckAt: string | null;
    guardianAckAt: string | null;
    advisorAckAt: string | null;
  };
  /** Verified work experiences, for the family to see what was stamped. */
  verified: Array<{
    title: string;
    organization: string | null;
    hours: number | null;
    verifiedAt: string | null;
  }>;
};

export function currentSchoolYear(d = new Date()): string {
  const y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-${String(y + 1).slice(2)}`;
}

export async function buildFamilyView(
  db: Db,
  studentId: string,
  expiresAt: string | null,
  now = new Date(),
): Promise<FamilyView> {
  const sy = currentSchoolYear(now);
  const [
    { data: student },
    { data: session },
    { data: stem },
    { data: cps },
    { data: approval },
    { data: ver },
  ] = await Promise.all([
    db.from("students").select("first_name, grade").eq("id", studentId).maybeSingle(),
    db
      .from("assessment_sessions")
      .select("holland_code, scale_scores, completed_at")
      .eq("student_id", studentId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("survey_responses")
      .select("id")
      .eq("student_id", studentId)
      .not("completed_at", "is", null)
      .limit(1),
    db
      .from("checkpoints")
      .select("term, status, submitted_at")
      .eq("student_id", studentId)
      .eq("school_year", sy),
    db
      .from("plan_approvals")
      .select("student_ack_at, guardian_ack_at, advisor_ack_at")
      .eq("student_id", studentId)
      .eq("school_year", sy)
      .maybeSingle(),
    db
      .from("experiences")
      .select("title, organization, verified_hours, verified_at")
      .eq("student_id", studentId)
      .eq("status", "verified")
      .order("verified_at", { ascending: false }),
  ]);
  return {
    firstName: student?.first_name ?? "Your student",
    grade: student?.grade ?? null,
    riasec: session?.holland_code
      ? {
          hollandCode: session.holland_code,
          scaleScores: (session.scale_scores as Record<string, number> | null) ?? {},
        }
      : null,
    stemDone: (stem ?? []).length > 0,
    expiresAt,
    plan: {
      schoolYear: sy,
      checkpoints: (cps ?? []).map((c) => ({
        term: c.term,
        status: c.status,
        submittedAt: c.submitted_at,
      })),
      studentAckAt: approval?.student_ack_at ?? null,
      guardianAckAt: approval?.guardian_ack_at ?? null,
      advisorAckAt: approval?.advisor_ack_at ?? null,
    },
    verified: (ver ?? []).map((v) => ({
      title: v.title,
      organization: v.organization,
      hours: v.verified_hours === null ? null : Number(v.verified_hours),
      verifiedAt: v.verified_at,
    })),
  };
}

/** True when this guardian has an unrevoked link to the student. */
export async function isGuardianOf(db: Db, guardianId: string, studentId: string) {
  const { data } = await db
    .from("guardian_students")
    .select("student_id")
    .eq("guardian_id", guardianId)
    .eq("student_id", studentId)
    .is("revoked_at", null)
    .maybeSingle();
  return !!data;
}
