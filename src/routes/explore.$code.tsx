import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, CircleAlert, Smile } from "lucide-react";
import { SiteHeader } from "@/components/passport";
import { SiteFooter } from "@/components/SiteFooter";
import { AvatarTile, SHAPE_LABELS, ShapeIcon } from "@/components/passport/ShapeIcon";
import {
  exploreSignIn,
  getExploreGroup,
  SECRET_SHAPES,
  type ExploreCard,
} from "@/lib/explore-logins.functions";
import { finishExploreSignIn, friendlyError } from "@/lib/explore-session";

/**
 * /explore/$code — picture sign-in for one class or camp.
 * Step 2: tap your picture. Step 3: tap your three secret shapes.
 */
export const Route = createFileRoute("/explore/$code")({
  head: () => ({ meta: [{ title: "Tap your picture — EXPLR Pathways" }] }),
  component: PictureSignIn,
});

type Group = { kind: "class" | "camp"; name: string; students: ExploreCard[] };

function PictureSignIn() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<ExploreCard | null>(null);
  const [seq, setSeq] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getExploreGroup({ data: { code } })
      .then((g) => active && setGroup(g as Group))
      .catch((e) => active && setError(friendlyError(e)));
    return () => {
      active = false;
    };
  }, [code]);

  async function tapShape(shape: string) {
    if (!picked || busy) return;
    const next = [...seq, shape];
    setSeq(next);
    setMsg(null);
    if (next.length < 3) return;
    setBusy(true);
    try {
      const { tokenHash } = await exploreSignIn({
        data: { loginId: picked.loginId, sequence: next as (typeof SECRET_SHAPES)[number][] },
      });
      await finishExploreSignIn(tokenHash);
      navigate({ to: "/student" });
    } catch (e) {
      setMsg(friendlyError(e));
      setSeq([]);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink-900" data-density="explore">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <Link
          to="/explore"
          className="inline-flex min-h-[44px] items-center gap-2 text-ink-700 hover:text-green-deep"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden /> Different class
        </Link>

        {error && (
          <div className="mt-8 flex flex-col gap-3 rounded-[var(--radius-card)] border-2 border-line bg-paper-raised p-7 shadow-card">
            <span className="grid h-14 w-14 place-items-center rounded-[16px] border border-mint-soft bg-mint-tint text-green-deep">
              <CircleAlert className="h-7 w-7" strokeWidth={2} aria-hidden />
            </span>
            <p className="font-display text-2xl font-bold">Hmm, that code didn't work.</p>
            <p className="text-ink-700">{error}</p>
            <Link to="/explore" className="btn-ink mt-2 self-start">
              Try another code
            </Link>
          </div>
        )}

        {!error && !group && <p className="mt-10 text-ink-500">Finding your class…</p>}

        {group && !picked && (
          <section className="mt-6">
            <p className="eyebrow text-green">Students · grades 4-8</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] border border-mint-soft bg-mint-tint text-green-deep">
                <Smile className="h-6 w-6" strokeWidth={2} aria-hidden />
              </span>
              <p className="font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-green">
                2 · Tap your picture · {group.name} · {code}
              </p>
            </div>
            <h1 className="display mt-2">Which one is you?</h1>
            {group.students.length === 0 ? (
              <p className="mt-6 text-ink-700">
                No pictures yet. Ask your instructor to print the class cards.
              </p>
            ) : (
              <ul className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {group.students.map((s) => (
                  <li key={s.loginId}>
                    <button
                      type="button"
                      onClick={() => {
                        setPicked(s);
                        setSeq([]);
                        setMsg(null);
                      }}
                      className="flex w-full flex-col items-center gap-3 rounded-[var(--radius-card)] border-2 border-line bg-paper-raised p-4 shadow-card hover:border-emerald focus-visible:border-emerald"
                    >
                      <AvatarTile shape={s.avatarShape} color={s.avatarColor} size={112} />
                      <span className="text-xl font-semibold">{s.firstName}</span>
                      <span className="sr-only">
                        , {SHAPE_LABELS[s.avatarShape]} on {s.avatarColor}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {group && picked && (
          <section className="mt-6">
            <div className="flex flex-wrap items-center gap-5">
              <AvatarTile
                shape={picked.avatarShape}
                color={picked.avatarColor}
                size={96}
                selected
              />
              <div>
                <p className="eyebrow text-green">Students · grades 4-8</p>
                <p className="mt-1 font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-green">
                  3 · Tap your three secret shapes
                </p>
                <h1 className="display mt-1">Hi, {picked.firstName}!</h1>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPicked(null);
                  setSeq([]);
                  setMsg(null);
                }}
                className="btn-ghost ml-auto"
              >
                Not me
              </button>
            </div>

            <div className="mt-6 flex items-center gap-3" aria-live="polite">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-line-strong bg-paper-raised text-green-deep"
                >
                  {seq[i] ? (
                    <ShapeIcon shape={seq[i]} size={32} />
                  ) : (
                    <span className="sr-only">empty</span>
                  )}
                </span>
              ))}
              <span className="ml-2 text-ink-700">
                {busy ? "Opening your passport…" : `${seq.length} of 3`}
              </span>
            </div>

            <ul className="mt-8 grid grid-cols-3 gap-4 sm:grid-cols-6">
              {SECRET_SHAPES.map((shape) => (
                <li key={shape}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => tapShape(shape)}
                    aria-label={SHAPE_LABELS[shape]}
                    className="grid aspect-square w-full place-items-center rounded-[var(--radius-card)] border-2 border-line bg-paper-raised text-green-deep shadow-card hover:border-emerald focus-visible:border-emerald disabled:opacity-50"
                  >
                    <ShapeIcon shape={shape} size={56} strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ul>

            {msg && (
              <p
                role="alert"
                className="mt-6 rounded-[var(--radius-control)] bg-gold-tint px-4 py-3 text-ink-900"
              >
                {msg}
              </p>
            )}
            <p className="mt-6 text-sm text-ink-500">
              Forgot your shapes? Ask your instructor, they can print you a new card.
            </p>
          </section>
        )}
      </main>
      <SiteFooter className="mt-10" />
    </div>
  );
}
