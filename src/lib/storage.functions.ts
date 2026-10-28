import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PRIVATE_BUCKETS } from "./storage-paths";

const SIGNED_URL_SECONDS = 600;

/**
 * Signed, 10-minute URL for a file in a private bucket, after checking the
 * caller may see it:
 * - student-photos: the student themselves, staff who can see that student, or an admin
 * - form-uploads: the student who uploaded it, the internship's organization, or an admin
 * - curriculum: approved educators and admins
 */
export const signedFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        bucket: z.enum(PRIVATE_BUCKETS),
        path: z
          .string()
          .min(1)
          .max(512)
          .refine((p) => !p.split("/").includes(".."), "Invalid path"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = (t: string): any => (supabaseAdmin.from as unknown as (n: string) => any)(t);
    const uid = context.userId;
    const path = data.path.replace(/^\/+/, "");

    const isAdmin = async () =>
      !!(await sb("admins").select("id").eq("id", uid).maybeSingle()).data;

    let allowed = false;
    if (data.bucket === "student-photos") {
      const owner = path.split("/")[0] ?? "";
      if (owner === uid) allowed = true;
      else if (/^[0-9a-f-]{36}$/i.test(owner)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rpc = supabaseAdmin.rpc as unknown as (f: string, a: object) => Promise<any>;
        const { data: ok } = await rpc("staff_can_see_student", { _uid: uid, _student_id: owner });
        allowed = ok === true || (await isAdmin());
      } else allowed = await isAdmin();
    } else if (data.bucket === "form-uploads") {
      const { data: rows } = await sb("form_completions")
        .select("student_id, completed_file_url, opportunity_forms(opportunity_id)")
        .or(`completed_file_url.eq.${path},completed_file_url.like.%/form-uploads/${path}`);
      const list = (rows ?? []) as {
        student_id: string;
        opportunity_forms: { opportunity_id: string } | null;
      }[];
      if (list.some((r) => r.student_id === uid)) allowed = true;
      else if (await isAdmin()) allowed = true;
      else {
        const oppIds = list.map((r) => r.opportunity_forms?.opportunity_id).filter(Boolean);
        if (oppIds.length) {
          const { data: opps } = await sb("opportunities")
            .select("id")
            .in("id", oppIds)
            .eq("org_id", uid);
          allowed = (opps ?? []).length > 0;
        }
      }
    } else {
      const { data: edu } = await sb("educators").select("approved").eq("id", uid).maybeSingle();
      allowed = (edu as { approved: boolean } | null)?.approved === true || (await isAdmin());
    }
    if (!allowed) throw new Error("You don't have access to that file.");

    const { data: signed, error } = await supabaseAdmin.storage
      .from(data.bucket)
      .createSignedUrl(path, SIGNED_URL_SECONDS);
    if (error || !signed) throw new Error("That file couldn't be opened.");
    return { url: signed.signedUrl, expiresIn: SIGNED_URL_SECONDS };
  });
