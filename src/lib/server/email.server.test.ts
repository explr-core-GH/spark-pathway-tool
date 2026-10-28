import { afterEach, describe, expect, it } from "vitest";
import { senderAddress, sendEmail } from "./email.server";

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
});

function stubFetch(response: { ok: boolean; status?: number; body?: string }) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return {
      ok: response.ok,
      status: response.status ?? 200,
      text: async () => response.body ?? "",
    } as Response;
  }) as typeof fetch;
  return calls;
}

describe("outbound email", () => {
  it("goes to the connector gateway with both keys, never api.resend.com", async () => {
    process.env.LOVABLE_API_KEY = "lk";
    process.env.RESEND_API_KEY = "rk";
    const calls = stubFetch({ ok: true });
    const res = await sendEmail("a@b.org", "Hi", "<p>x</p>");
    expect(res.sent).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://connector-gateway.lovable.dev/resend/emails");
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer lk");
    expect(headers["X-Connection-Api-Key"]).toBe("rk");
    expect(JSON.stringify(calls[0].init.body)).not.toContain("api.resend.com");
  });

  it("sends from the domain verified in Resend unless RESEND_FROM says otherwise", async () => {
    process.env.LOVABLE_API_KEY = "lk";
    process.env.RESEND_API_KEY = "rk";
    delete process.env.RESEND_FROM;
    expect(senderAddress()).toContain("@explr.cc");
    const calls = stubFetch({ ok: true });
    await sendEmail("a@b.org", "Hi", "<p>x</p>");
    expect(JSON.parse(String(calls[0].init.body)).from).toContain("@explr.cc");
    process.env.RESEND_FROM = "EXPLR <hello@explr.cc>";
    expect(senderAddress()).toBe("EXPLR <hello@explr.cc>");
  });

  it("reports the provider's status and text when a send fails", async () => {
    process.env.LOVABLE_API_KEY = "lk";
    process.env.RESEND_API_KEY = "rk";
    stubFetch({ ok: false, status: 422, body: "domain not verified" });
    const res = await sendEmail("a@b.org", "Hi", "<p>x</p>");
    expect(res.sent).toBe(false);
    expect(res.error).toBe("Resend 422: domain not verified");
  });

  it("does nothing when the connection is not configured", async () => {
    delete process.env.LOVABLE_API_KEY;
    delete process.env.RESEND_API_KEY;
    const calls = stubFetch({ ok: true });
    const res = await sendEmail("a@b.org", "Hi", "<p>x</p>");
    expect(res).toEqual({ sent: false, error: "Email is not configured (RESEND_API_KEY)" });
    expect(calls).toHaveLength(0);
  });
});
