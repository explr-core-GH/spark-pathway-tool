import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RIASEC, type RIASECCode } from "@/lib/riasec";
import { EXPERIENCE_TYPE_BY_KEY, hoursCount, isExposure, type Stage } from "@/lib/wbl-taxonomy";
import { OMJ_SKILLS, sealProgress, type SkillProgress } from "@/lib/competencies";

// The portfolio tables are newer than the generated Database type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = (table: string): any => (supabase.from as unknown as (n: string) => any)(table);

export type Experience = {
  id: string;
  student_id: string;
  source: "library" | "external";
  title: string;
  organization: string | null;
  role_title: string | null;
  stage: Stage;
  experience_type: string;
  career_cluster: string | null;
  riasec_module: RIASECCode | null;
  start_date: string | null;
  end_date: string | null;
  hours: number | null;
  compensation_type: string | null;
  duties: string | null;
  reflection: string | null;
  supervisor_name: string | null;
  supervisor_email: string | null;
  status: "self_reported" | "pending_supervisor" | "verified" | "disputed" | "revoked";
  verified_at: string | null;
  verified_hours: number | null;
  created_at: string;
};

export type Rating = {
  id: string;
  experience_id: string;
  competency: string;
  omj_skill: string | null;
  rating_baseline: number | null;
  rating_final: number;
  setting: "school" | "work" | "community";
  rater_name: string;
  rater_email: string | null;
  comment: string | null;
  rated_at: string;
};

export type Credential = {
  id: string;
  type: string;
  title: string;
  issuer: string | null;
  issued_at: string | null;
  credits: number | null;
  evidence_url: string | null;
  verification_method: "issuer_signed" | "document_upload" | "self_reported";
};

export type Piece = {
  id: string;
  title: string;
  context: string | null;
  artifact_type: string;
  url: string | null;
  competency_tags: string[];
  reflection: string | null;
  experience_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  visibility: "private" | "family" | "public";
  created_at: string;
};

export type Passport = {
  firstName: string;
  grade: number | null;
  band: "explore" | "pro";
  aboutMe: string | null;
  /** Emoji chosen for the passport picture (any grade). */
  avatarEmoji: string | null;
  /** Uploaded photo (grades 9-12 only). */
  photoUrl: string | null;
  joinedAt: string;
  hollandCode: string | null;
  experiences: Experience[];
  ratings: Rating[];
  credentials: Credential[];
  pieces: Piece[];
  /** Verified, formal-WBL hours for grade 9+ (the 250-hour log). */
  verifiedHours: number;
  /** Hours the student reported that are not yet verified. */
  pendingHours: number;
  seal: SkillProgress[];
  sealReadyCount: number;
  /** Skills with at least one verified rating at Proficient or above. */
  skillsProficient: number;
  exposure: Experience[];
  work: Experience[];
};

export function bandFor(grade: number | null): "explore" | "pro" {
  return grade !== null && grade <= 8 ? "explore" : "pro";
}

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

export function usePassport(studentId: string | null) {
  const [data, setData] = useState<Passport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [{ data: stud }, { data: sess }, { data: exps }, { data: creds }, { data: pcs }] =
          await Promise.all([
            sb("students")
              .select("first_name, grade, about_me, avatar_emoji, photo_url, created_at")
              .eq("id", studentId)
              .maybeSingle(),
            supabase
              .from("assessment_sessions")
              .select("holland_code, completed_at")
              .eq("student_id", studentId)
              .not("completed_at", "is", null)
              .order("completed_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
            sb("experiences")
              .select("*")
              .eq("student_id", studentId)
              .order("start_date", { ascending: false, nullsFirst: false }),
            sb("credentials")
              .select("*")
              .eq("student_id", studentId)
              .order("issued_at", { ascending: false, nullsFirst: false }),
            sb("portfolio_pieces")
              .select("*")
              .eq("student_id", studentId)
              .order("created_at", { ascending: false }),
          ]);
        const experiences = ((exps ?? []) as Experience[]).map((e) => ({
          ...e,
          hours: e.hours === null ? null : Number(e.hours),
          verified_hours: e.verified_hours === null ? null : Number(e.verified_hours),
        }));
        const ids = experiences.map((e) => e.id);
        const { data: rts } = ids.length
          ? await sb("experience_ratings").select("*").in("experience_id", ids)
          : { data: [] };
        if (cancelled) return;
        const ratings = (rts ?? []) as Rating[];
        const grade: number | null = stud?.grade ?? null;
        const verifiedIds = new Set(
          experiences.filter((e) => e.status === "verified").map((e) => e.id),
        );
        const verifiedRatings = ratings.filter((r) => verifiedIds.has(r.experience_id));
        const seal = sealProgress(verifiedRatings);
        const work = experiences.filter((e) => !isExposure(e.stage));
        const exposure = experiences.filter((e) => isExposure(e.stage));
        setData({
          firstName: stud?.first_name ?? "Student",
          grade,
          band: bandFor(grade),
          aboutMe: stud?.about_me ?? null,
          avatarEmoji: stud?.avatar_emoji ?? null,
          photoUrl: stud?.photo_url ?? null,
          joinedAt: stud?.created_at ?? new Date().toISOString(),
          hollandCode: sess?.holland_code ?? null,
          experiences,
          ratings,
          credentials: (creds ?? []) as Credential[],
          pieces: (pcs ?? []) as Piece[],
          verifiedHours: sum(
            experiences
              .filter((e) => hoursCount(e.experience_type, grade, e.status))
              .map((e) => e.verified_hours ?? e.hours ?? 0),
          ),
          pendingHours: sum(
            experiences
              .filter(
                (e) =>
                  e.status !== "verified" &&
                  EXPERIENCE_TYPE_BY_KEY[e.experience_type]?.ohioFormalWbl,
              )
              .map((e) => e.hours ?? 0),
          ),
          seal,
          sealReadyCount: seal.filter((s) => s.sealReady).length,
          skillsProficient: seal.filter((s) => (s.best ?? 0) >= 3).length,
          exposure,
          work,
        });
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId, tick]);

  return { data, loading, error, refresh };
}

/** Draft an About Me from what's on the passport. Shown until the student writes their own. */
export function draftAboutMe(p: Passport): string {
  const parts: string[] = [];
  const top = p.hollandCode
    ? (p.hollandCode.split("").filter((c) => RIASEC[c as RIASECCode]) as RIASECCode[]).slice(0, 2)
    : [];
  if (top.length) {
    const names = top.map((c) => RIASEC[c].name.toLowerCase());
    parts.push(`I lean ${names.join(" and ")} on the interest assessment.`);
  }
  const verified = p.work.filter((e) => e.status === "verified");
  if (verified.length) {
    const orgs = [...new Set(verified.map((e) => e.organization).filter(Boolean))].slice(0, 2);
    parts.push(
      `I've logged ${Math.round(p.verifiedHours)} verified hours${orgs.length ? ` with ${orgs.join(" and ")}` : ""}.`,
    );
  } else if (p.work.length) {
    parts.push(
      `I've added ${p.work.length} work experience${p.work.length === 1 ? "" : "s"} and I'm getting them stamped.`,
    );
  }
  if (p.exposure.length) {
    parts.push(
      `I've explored ${p.exposure.length} place${p.exposure.length === 1 ? "" : "s"} so far.`,
    );
  }
  const strong = p.seal
    .filter((s) => (s.best ?? 0) >= 3)
    .map((s) => s.skill)
    .slice(0, 2);
  if (strong.length) parts.push(`Supervisors rated me Proficient in ${strong.join(" and ")}.`);
  if (!parts.length) return "This is my passport. I'll fill it in as I go.";
  return parts.join(" ");
}

export const SEAL_TOTAL = OMJ_SKILLS.length;
export const HOURS_TARGET = 250;
