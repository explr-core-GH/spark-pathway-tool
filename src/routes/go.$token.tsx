import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/passport";
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
    <main
      className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 text-center"
      data-density="explore"
    >
      <Wordmark />
      {error ? (
        <>
          <h1 className="font-display text-3xl font-bold">That card didn't work.</h1>
          <p className="text-ink-700">{error}</p>
          <Link to="/explore" className="btn-ink">
            Use my class code
          </Link>
        </>
      ) : (
        <>
          <h1 className="font-display text-3xl font-bold">Opening your passport…</h1>
          <p className="text-ink-700">One second.</p>
        </>
      )}
    </main>
  );
}
