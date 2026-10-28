import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Browser-side errors have nowhere to go on Cloudflare Workers unless the
 * page sends them. This writes one structured line to the Worker log
 * (Lovable Cloud → Logs) per report, rate-limited per IP. No personal data:
 * the page path, the error text, a trimmed stack and the user's role label.
 */
export const reportClientError = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        message: z.string().trim().min(1).max(500),
        stack: z.string().max(4000).optional(),
        path: z.string().max(300),
        role: z.string().max(40).optional(),
        kind: z.enum(["render", "window", "promise"]).default("render"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { rateLimit } = await import("./server/rate-limit.server");
    await rateLimit("reportClientError", 30, 600);
    console.error(
      JSON.stringify({
        at: new Date().toISOString(),
        source: "client",
        kind: data.kind,
        path: data.path,
        role: data.role ?? null,
        message: data.message,
        stack: data.stack?.split("\n").slice(0, 8).join("\n") ?? null,
      }),
    );
    return { ok: true };
  });
