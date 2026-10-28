import { z } from "zod";

/** Client-safe input schemas for guardian (family account) server functions. */

export const RELATIONSHIPS = ["parent", "guardian", "grandparent", "other"] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

export const RELATIONSHIP_LABEL: Record<Relationship, string> = {
  parent: "Parent",
  guardian: "Legal guardian",
  grandparent: "Grandparent",
  other: "Other caregiver",
};

export const CONSENT_TEXT_VERSION = "2026-10";

export const linkChildInput = z.object({
  code: z.string().trim().min(4).max(20),
  relationship: z.enum(RELATIONSHIPS),
});

export const studentIdInput = z.object({ studentId: z.string().uuid() });

export const consentInput = z.object({
  studentId: z.string().uuid(),
  textVersion: z.string().trim().min(1).max(20),
});

export const guardianIdInput = z.object({ guardianId: z.string().uuid() });
