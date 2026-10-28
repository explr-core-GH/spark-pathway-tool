/**
 * Outbound email, through the connected Resend account.
 *
 * The project's `RESEND_API_KEY` is a connector key for Lovable's gateway, not
 * a Resend key, so direct calls to api.resend.com are rejected. Every message
 * goes to the gateway with both headers below.
 *
 * The default sender uses the domain verified in Resend (`explr.cc`). A
 * different sender can be set with `RESEND_FROM`, but it must be a domain
 * verified there or Resend refuses the message.
 */

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FALLBACK_FROM = "EXPLR Pathways <noreply@explr.cc>";

export type MailResult = { sent: boolean; error?: string };

/** The address messages are sent from. */
export function senderAddress(): string {
  return process.env.RESEND_FROM?.trim() || FALLBACK_FROM;
}

/**
 * Send one HTML email. Returns `sent: false` with the provider's own failure
 * text instead of throwing, so callers can record why a message didn't go.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<MailResult> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const connectionKey = process.env.RESEND_API_KEY;
  if (!lovableKey || !connectionKey)
    return { sent: false, error: "Email is not configured (RESEND_API_KEY)" };

  try {
    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connectionKey,
      },
      body: JSON.stringify({ from: senderAddress(), to: [to], subject, html }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { sent: false, error: `Resend ${res.status}: ${body.slice(0, 200)}` };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : String(e) };
  }
}
