/** Pure role resolution for RoleGuard (client-safe, unit-tested). */

export type RequiredRole = "student" | "educator" | "admin" | "guardian";

export type RoleFacts = {
  signedIn: boolean;
  isAdmin: boolean;
  educator: { approved: boolean } | null;
  isStudent: boolean;
  isGuardian: boolean;
  isOrg: boolean;
};

export type RoleOutcome =
  | "allow"
  | "signed-out"
  | "educator-on-student"
  | "guardian-on-student"
  | "org-on-student"
  | "not-educator"
  | "pending-educator"
  | "not-admin"
  | "not-guardian";

export function resolveRole(requires: RequiredRole, f: RoleFacts): RoleOutcome {
  if (!f.signedIn) return "signed-out";
  switch (requires) {
    case "student":
      if (f.isAdmin) return "allow";
      if (f.educator) return "educator-on-student";
      if (!f.isStudent && f.isGuardian) return "guardian-on-student";
      if (!f.isStudent && f.isOrg) return "org-on-student";
      return "allow";
    case "educator":
      if (f.isAdmin) return "allow";
      if (!f.educator) return "not-educator";
      return f.educator.approved ? "allow" : "pending-educator";
    case "admin":
      return f.isAdmin ? "allow" : "not-admin";
    case "guardian":
      return f.isGuardian ? "allow" : "not-guardian";
  }
}
