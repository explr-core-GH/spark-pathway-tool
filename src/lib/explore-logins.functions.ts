import { createServerFn } from "@tanstack/react-start";
import { randomBytes, randomInt } from "node:crypto";
import { exploreSecretHash, exploreTokenHash } from "./server/hash.server";
import { rateLimit } from "./server/rate-limit.server";
import { lockMinutesFor, MAX_FAILED_ATTEMPTS } from "./explore-lockout";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Tables newer than the generated Database type go through an untyped accessor.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = (table: string): any => (supabaseAdmin.from as unknown as (n: string) => any)(table);

/**
 * Explore sign-in (grades 4-8).
 *
 * Students in the Explore band never type a password. Two ways in:
 *
 *   1. Picture sign-in: open the class (join code or the class QR on the
 *      projector), tap your picture, then tap your three secret shapes.
 *   2. Passport card: scan the per-student QR card with the laptop camera.
 *
 * Both paths end the same way: the server verifies the proof, then mints a
 * Supabase magic-link token for the student's auth user and hands the
 * hashed token to the browser, which exchanges it for a session with
 * `supabase.auth.verifyOtp`. Nothing secret is stored in plaintext: the
 * shape sequence and the card token are kept as peppered SHA-256 hashes.
 *
 * Accounts live in `explore_logins`, one per student. Cards are issued by
 * admins, class teachers, and camp educators through `provisionExploreLogins`.
 */

// ── shapes, colors, codes ──────────────────────────────────────────────────

export const AVATAR_SHAPES = [
  "star",
  "leaf",
  "bolt",
  "wave",
  "sun",
  "heart",
  "moon",
  "cloud",
] as const;
export const SECRET_SHAPES = ["star", "leaf", "bolt", "wave", "sun", "heart"] as const;
export const AVATAR_COLORS = ["mint", "amber", "coral", "sky", "violet", "gold"] as const;
export type AvatarShape = (typeof AVATAR_SHAPES)[number];
export type SecretShape = (typeof SECRET_SHAPES)[number];
export type AvatarColor = (typeof AVATAR_COLORS)[number];

export const SECRET_LENGTH = 3;
const EXPLORE_DOMAIN = "@explore.explr.local";

// Join codes read aloud and typed by an instructor: ANIMAL-NN.
const CODE_ANIMALS = [
  "OTTER",
  "FALCON",
  "PANDA",
  "TIGER",
  "ROBIN",
  "LYNX",
  "MOOSE",
  "HERON",
  "KOALA",
  "GECKO",
  "RAVEN",
  "PUMA",
  "BISON",
  "CRANE",
  "FINCH",
  "SHARK",
  "WOLF",
  "HAWK",
  "SEAL",
  "FOX",
  "DEER",
  "EAGLE",
  "ZEBRA",
  "WHALE",
];

const hashSecret = exploreSecretHash;
const hashToken = exploreTokenHash;
const pick = <T>(arr: readonly T[]): T => arr[randomInt(arr.length)];
const randomSecret = (): SecretShape[] =>
  Array.from({ length: SECRET_LENGTH }, () => pick(SECRET_SHAPES));
const randomToken = () => randomBytes(24).toString("base64url");

type Staff = { userId: string; isAdmin: boolean; isEducator: boolean };

async function whoIs(userId: string): Promise<Staff> {
  const [{ data: admin }, { data: edu }] = await Promise.all([
    sb("admins").select("id").eq("id", userId).maybeSingle(),
    sb("educators").select("id, approved").eq("id", userId).maybeSingle(),
  ]);
  return {
    userId,
    isAdmin: !!admin,
    isEducator: !!edu && (edu as { approved: boolean }).approved === true,
  };
}

const GroupRef = z.object({ kind: z.enum(["class", "camp"]), id: z.string().uuid() });
type GroupRef = z.infer<typeof GroupRef>;

/** Can this user manage picture logins for the group? Admins always; teachers for their class; camp educators for their camp. */
async function assertCanManageGroup(staff: Staff, g: GroupRef) {
  if (staff.isAdmin) return;
  if (!staff.isEducator) throw new Error("Instructor access required");
  if (g.kind === "class") {
    const { data } = await sb("classes").select("educator_id").eq("id", g.id).maybeSingle();
    if (!data || (data as { educator_id: string | null }).educator_id !== staff.userId)
      throw new Error("Not your class");
  } else {
    const { data } = await sb("explr_camp_educators")
      .select("educator_id")
      .eq("explr_camp_id", g.id)
      .eq("educator_id", staff.userId)
      .maybeSingle();
    if (!data) throw new Error("Not your camp");
  }
}

async function groupName(g: GroupRef): Promise<string> {
  if (g.kind === "class") {
    const { data } = await sb("classes").select("name").eq("id", g.id).maybeSingle();
    return (data as { name: string } | null)?.name ?? "Class";
  }
  const { data } = await sb("explr_camps").select("title").eq("id", g.id).maybeSingle();
  return (data as { title: string } | null)?.title ?? "Camp";
}

async function rosterStudentIds(g: GroupRef): Promise<string[]> {
  if (g.kind === "class") {
    const { data } = await sb("class_students").select("student_id").eq("class_id", g.id);
    return ((data ?? []) as { student_id: string }[]).map((r) => r.student_id);
  }
  const { data } = await sb("student_camp_links").select("student_id").eq("explr_camp_id", g.id);
  return ((data ?? []) as { student_id: string }[]).map((r) => r.student_id);
}

async function groupByCode(code: string): Promise<(GroupRef & { name: string }) | null> {
  const norm = code.trim().toUpperCase().replace(/\s+/g, "-");
  const [{ data: cls }, { data: camp }] = await Promise.all([
    sb("classes").select("id, name").eq("join_code", norm).maybeSingle(),
    sb("explr_camps").select("id, title").eq("join_code", norm).maybeSingle(),
  ]);
  if (cls)
    return { kind: "class", id: (cls as { id: string }).id, name: (cls as { name: string }).name };
  if (camp)
    return {
      kind: "camp",
      id: (camp as { id: string }).id,
      name: (camp as { title: string }).title,
    };
  return null;
}

/** Mint a one-time magic-link token for the student's auth user. The browser exchanges it with verifyOtp. */
async function issueSession(studentId: string): Promise<{ tokenHash: string }> {
  const { data: u, error: uErr } = await supabaseAdmin.auth.admin.getUserById(studentId);
  if (uErr || !u.user?.email) throw new Error("Student account not found");
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: u.user.email,
  });
  if (error || !data.properties?.hashed_token)
    throw new Error(error?.message ?? "Could not start session");
  return { tokenHash: data.properties.hashed_token };
}

export type ExploreCard = {
  loginId: string;
  studentId: string;
  firstName: string;
  avatarShape: AvatarShape;
  avatarColor: AvatarColor;
  /** Only present when freshly issued (provisioning or rotation). */
  secret?: SecretShape[];
  /** Only present when freshly issued; the QR encodes `${origin}/go/${token}`. */
  token?: string;
};

// ── public: student side ───────────────────────────────────────────────────

/** Resolve a class/camp join code to its picture roster. Names and avatars only. */
export const getExploreGroup = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ code: z.string().min(3).max(24) }).parse(input))
  .handler(async ({ data }) => {
    await rateLimit("getExploreGroup", 60, 600);
    const g = await groupByCode(data.code);
    if (!g) throw new Error("No class with that code. Check with your instructor.");
    const ids = await rosterStudentIds(g);
    if (ids.length === 0) return { kind: g.kind, name: g.name, students: [] as ExploreCard[] };
    const [{ data: logins }, { data: students }] = await Promise.all([
      sb("explore_logins")
        .select("id, student_id, avatar_shape, avatar_color")
        .in("student_id", ids),
      sb("students").select("id, first_name").in("id", ids),
    ]);
    const nameOf = new Map(
      ((students ?? []) as { id: string; first_name: string | null }[]).map((s) => [
        s.id,
        s.first_name ?? "Student",
      ]),
    );
    const cards: ExploreCard[] = (
      (logins ?? []) as {
        id: string;
        student_id: string;
        avatar_shape: AvatarShape;
        avatar_color: AvatarColor;
      }[]
    )
      .map((l) => ({
        loginId: l.id,
        studentId: l.student_id,
        firstName: nameOf.get(l.student_id) ?? "Student",
        avatarShape: l.avatar_shape,
        avatarColor: l.avatar_color,
      }))
      .sort((a, b) => a.firstName.localeCompare(b.firstName));
    return { kind: g.kind, name: g.name, students: cards };
  });

/** Picture sign-in: verify the three-shape secret and mint a session. */
export const exploreSignIn = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        loginId: z.string().uuid(),
        sequence: z.array(z.enum(SECRET_SHAPES)).length(SECRET_LENGTH),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await rateLimit("exploreSignIn", 20, 600);
    const { data: row } = await sb("explore_logins")
      .select("id, student_id, secret_hash, failed_attempts, locked_until")
      .eq("id", data.loginId)
      .maybeSingle();
    const login = row as {
      id: string;
      student_id: string;
      secret_hash: string;
      failed_attempts: number;
      locked_until: string | null;
    } | null;
    if (!login) throw new Error("That picture isn't set up yet. Ask your instructor.");
    if (login.locked_until && new Date(login.locked_until) > new Date()) {
      throw new Error("Too many tries. Ask your instructor, or wait a few minutes.");
    }
    if (hashSecret(login.id, data.sequence) !== login.secret_hash) {
      const attempts = login.failed_attempts + 1;
      // Lock on every 5th failure; keep counting so each re-lock doubles.
      const lock = attempts % MAX_FAILED_ATTEMPTS === 0;
      await sb("explore_logins")
        .update({
          failed_attempts: attempts,
          locked_until: lock
            ? new Date(Date.now() + lockMinutesFor(attempts) * 60_000).toISOString()
            : null,
        })
        .eq("id", login.id);
      throw new Error(
        lock
          ? "Too many tries. Ask your instructor, or wait a few minutes."
          : "Those aren't your shapes. Try again.",
      );
    }
    await sb("explore_logins")
      .update({
        failed_attempts: 0,
        locked_until: null,
        last_signed_in_at: new Date().toISOString(),
      })
      .eq("id", login.id);
    return issueSession(login.student_id);
  });

/** Passport-card QR: redeem the card token and mint a session. */
export const redeemExploreToken = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().min(16).max(64) }).parse(input))
  .handler(async ({ data }) => {
    await rateLimit("redeemExploreToken", 20, 600);
    const { data: row } = await sb("explore_logins")
      .select("id, student_id")
      .eq("token_hash", hashToken(data.token))
      .maybeSingle();
    const login = row as { id: string; student_id: string } | null;
    if (!login) throw new Error("This card isn't active. Ask your instructor for a new one.");
    await sb("explore_logins")
      .update({ last_signed_in_at: new Date().toISOString() })
      .eq("id", login.id);
    return issueSession(login.student_id);
  });

// ── staff: instructors and admins ──────────────────────────────────────────

/** Return the group's join code, creating one if missing. */
export const ensureJoinCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => GroupRef.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanManageGroup(await whoIs(context.userId), data);
    const table = data.kind === "class" ? "classes" : "explr_camps";
    const { data: cur } = await sb(table).select("join_code").eq("id", data.id).maybeSingle();
    const existing = (cur as { join_code: string | null } | null)?.join_code;
    if (existing) return { code: existing, name: await groupName(data) };
    for (let i = 0; i < 20; i++) {
      const code = `${pick(CODE_ANIMALS)}-${randomInt(10, 100)}`;
      if (await groupByCode(code)) continue;
      const { error } = await sb(table).update({ join_code: code }).eq("id", data.id);
      if (!error) return { code, name: await groupName(data) };
    }
    throw new Error("Could not create a join code");
  });

/**
 * Issue picture logins for every student on the roster. Existing logins are
 * kept unless `reissue` is set, which rotates secrets and card tokens (use
 * it to re-print cards). Secrets and tokens are returned once, here.
 */
export const provisionExploreLogins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => GroupRef.extend({ reissue: z.boolean().optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const staff = await whoIs(context.userId);
    await assertCanManageGroup(staff, data);
    const ids = await rosterStudentIds(data);
    const [{ data: students }, { data: existing }] = await Promise.all([
      sb("students")
        .select("id, first_name")
        .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
      sb("explore_logins")
        .select("id, student_id, avatar_shape, avatar_color")
        .in("student_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
    ]);
    const have = new Map(
      (
        (existing ?? []) as {
          id: string;
          student_id: string;
          avatar_shape: AvatarShape;
          avatar_color: AvatarColor;
        }[]
      ).map((e) => [e.student_id, e]),
    );
    const cards: ExploreCard[] = [];
    for (const s of (students ?? []) as { id: string; first_name: string | null }[]) {
      const firstName = s.first_name ?? "Student";
      const prior = have.get(s.id);
      if (prior && !data.reissue) {
        cards.push({
          loginId: prior.id,
          studentId: s.id,
          firstName,
          avatarShape: prior.avatar_shape,
          avatarColor: prior.avatar_color,
        });
        continue;
      }
      const secret = randomSecret();
      const token = randomToken();
      if (prior) {
        await sb("explore_logins")
          .update({
            secret_hash: hashSecret(prior.id, secret),
            token_hash: hashToken(token),
            failed_attempts: 0,
            locked_until: null,
            rotated_at: new Date().toISOString(),
          })
          .eq("id", prior.id);
        cards.push({
          loginId: prior.id,
          studentId: s.id,
          firstName,
          avatarShape: prior.avatar_shape,
          avatarColor: prior.avatar_color,
          secret,
          token,
        });
      } else {
        const avatarShape = pick(AVATAR_SHAPES);
        const avatarColor = pick(AVATAR_COLORS);
        const { data: ins, error } = await sb("explore_logins")
          .insert({
            student_id: s.id,
            avatar_shape: avatarShape,
            avatar_color: avatarColor,
            secret_hash: "pending",
            token_hash: hashToken(token),
            created_by: context.userId,
          })
          .select("id")
          .single();
        if (error || !ins) throw new Error(error?.message ?? "Could not create login");
        const loginId = (ins as { id: string }).id;
        await sb("explore_logins")
          .update({ secret_hash: hashSecret(loginId, secret) })
          .eq("id", loginId);
        cards.push({
          loginId,
          studentId: s.id,
          firstName,
          avatarShape,
          avatarColor,
          secret,
          token,
        });
      }
    }
    cards.sort((a, b) => a.firstName.localeCompare(b.firstName));
    return { name: await groupName(data), cards };
  });

/**
 * Add a grade 4-8 student to a class or camp. Explore students have no
 * email: the auth user gets a generated address and a random password
 * nobody sees. Returns the student's freshly issued card.
 */
export const addExploreStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    GroupRef.extend({
      firstName: z.string().trim().min(1).max(40),
      grade: z.number().int().min(4).max(8),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const staff = await whoIs(context.userId);
    await assertCanManageGroup(staff, data);
    const slug =
      data.firstName
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/g, "")
        .slice(0, 8) || "explorer";
    let uid: string | null = null;
    for (let attempt = 0; attempt < 8 && !uid; attempt++) {
      const digits = String(randomInt(attempt < 4 ? 10 : 100, attempt < 4 ? 100 : 1000));
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: `${slug}${digits}${EXPLORE_DOMAIN}`,
        password: randomBytes(24).toString("base64url"),
        email_confirm: true,
        user_metadata: { generated: true, source: "explore_login", child_name: data.firstName },
      });
      if (!error && created.user) uid = created.user.id;
      else if (!/already|exist|registered|duplicate/i.test(error?.message ?? ""))
        throw new Error(error?.message ?? "createUser failed");
    }
    if (!uid) throw new Error("Could not find an unused username");
    const rollback = async () => {
      await supabaseAdmin.auth.admin.deleteUser(uid!);
    };
    const { error: sErr } = await sb("students").upsert({
      id: uid,
      first_name: data.firstName,
      grade: data.grade,
    });
    if (sErr) {
      await rollback();
      throw new Error(sErr.message);
    }
    const link =
      data.kind === "class"
        ? await sb("class_students").insert({ class_id: data.id, student_id: uid })
        : await sb("student_camp_links").insert({ explr_camp_id: data.id, student_id: uid });
    if (link.error) {
      await rollback();
      throw new Error(link.error.message);
    }
    const secret = randomSecret();
    const token = randomToken();
    const avatarShape = pick(AVATAR_SHAPES);
    const avatarColor = pick(AVATAR_COLORS);
    const { data: ins, error } = await sb("explore_logins")
      .insert({
        student_id: uid,
        avatar_shape: avatarShape,
        avatar_color: avatarColor,
        secret_hash: "pending",
        token_hash: hashToken(token),
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error || !ins) {
      await rollback();
      throw new Error(error?.message ?? "Could not create login");
    }
    const loginId = (ins as { id: string }).id;
    await sb("explore_logins")
      .update({ secret_hash: hashSecret(loginId, secret) })
      .eq("id", loginId);
    const card: ExploreCard = {
      loginId,
      studentId: uid,
      firstName: data.firstName,
      avatarShape,
      avatarColor,
      secret,
      token,
    };
    return { card };
  });
