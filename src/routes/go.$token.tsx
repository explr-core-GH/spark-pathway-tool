import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CircleAlert, QrCode } from "lucide-react";
import { PortalHeader } from "@/components/passport/PortalHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { redeemExploreToken } from "@/lib/explore-logins.functions";
import { finishExploreSignIn, friendlyError } from "@/lib/explore-session";

/** /go/$token — the URL printed in a passport card's QR code. Redeems the card and opens the passport. */
export const Route = createFileRoute("/go/$token")({
  head: () => ({ meta: [{ title: "Opening your passport — EXPLR Pathways" }] }),
  component: Go,
});

function Go() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    redeemExploreToken({ data: { token } })
      .then(({ tokenHash }) => finishExploreSignIn(tokenHash))
      .then(() => {
        if (active) navigate({ to: "/student" });
      })
      .catch((e) => active && setError(friendlyError(e)));
    return () => {
      active = false;
    };
  }, [token, navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink-900" data-density="explore">
      <PortalHeader
        role="Student"
        links={[
          { label: "Home", to: "/" },
          { label: "Class code", to: "/explore", secondary: true },
        ]}
      />
      <main className="mx-auto flex w-full max-w-[1312px] flex-1 items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div
          className="flex w-full max-w-md flex-col items-center gap-4 rounded-[var(--radius-card)] border-2 border-line bg-paper-raised p-8 text-center shadow-card"
          aria-live="polite"
        >
          <span className="grid h-16 w-16 place-items-center rounded-[18px] border border-mint-soft bg-mint-tint text-green-deep">
            {error ? (
              <CircleAlert className="h-8 w-8" strokeWidth={2} aria-hidden />
            ) : (
              <QrCode className="h-8 w-8" strokeWidth={2} aria-hidden />
            )}
          </span>
          <p className="eyebrow text-green">Students · grades 4-8</p>
          {error ? (
            <>
              <h1 className="font-display text-3xl font-bold">That card didn&apos;t work.</h1>
              <p className="text-ink-700">{error}</p>
              <Link to="/explore" className="btn-ink justify-center">
                Use my class code
              </Link>
            </>
          ) : (
            <>
              <h1 className="font-display text-3xl font-bold">Opening your passport…</h1>
              <p className="text-ink-700">One second.</p>
            </>
          )}
        </div>
      </main>
      <SiteFooter className="mt-10" />
    </div>
  );
}
