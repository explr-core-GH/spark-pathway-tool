import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Camera } from "lucide-react";
import { SiteHeader } from "@/components/passport";

/**
 * /explore — grades 4-8 sign-in, step one. A student (or their instructor)
 * enters the class code shown on the projector, or scans a passport card.
 * No passwords anywhere on this path.
 */
export const Route = createFileRoute("/explore/")({
  head: () => ({
    meta: [
      { title: "Student sign in · Grades 4-8 — EXPLR Pathways" },
      {
        name: "description",
        content:
          "Tap your class, tap your picture, tap your secret shapes. Or scan your passport card.",
      },
    ],
  }),
  component: ExploreEntry,
});

function ExploreEntry() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  function go(e: React.FormEvent) {
    e.preventDefault();
    const norm = code.trim().toUpperCase().replace(/\s+/g, "-");
    if (!norm) return;
    navigate({ to: "/explore/$code", params: { code: norm } });
  }

  return (
    <div className="min-h-screen bg-paper text-ink-900" data-density="explore">
      <SiteHeader />
      <main className="mx-auto max-w-[1312px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div className="flex flex-col gap-5">
            <p className="eyebrow text-green">Student sign in · Grades 4-8</p>
            <h1 className="display">Who are you?</h1>
            <p className="lead max-w-[620px] text-ink-700">
              No typing a password. Enter your class code, tap your picture, then tap your three
              secret shapes. Or scan your passport card with the camera.
            </p>
          </div>
          <img
            src="/passport/grades-4-8.webp"
            alt=""
            width={320}
            height={320}
            className="mx-auto w-full max-w-[320px]"
          />
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_420px]">
          <form
            onSubmit={go}
            className="flex flex-col gap-5 rounded-[var(--radius-card)] border-2 border-line bg-paper-raised p-7 shadow-card"
          >
            <p className="eyebrow text-green">1 · Your class code</p>
            <label htmlFor="class-code" className="font-display text-2xl font-bold">
              What's on the board?
            </label>
            <input
              id="class-code"
              className="w-full rounded-[var(--radius-control)] border-2 border-line-strong bg-paper px-5 py-4 font-mono text-2xl uppercase tracking-[0.1em] text-ink-900 focus:border-emerald focus:outline-none"
              placeholder="OTTER-42"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <button type="submit" className="btn-mint justify-center text-lg">
              Find my class
            </button>
            <p className="text-sm text-ink-500">
              Your instructor shows the code on the board, or opens this page for you.
            </p>
          </form>

          <div className="flex flex-col items-center gap-4 rounded-[var(--radius-card)] border-2 border-line bg-paper-raised p-7 text-center shadow-card">
            <p className="eyebrow text-green">Or scan your passport card</p>
            <Camera className="h-12 w-12 text-green-deep" strokeWidth={1.75} aria-hidden />
            <p className="text-ink-700">Hold your card up to the laptop camera.</p>
            <Link to="/explore/scan" className="btn-ink justify-center text-lg">
              Open camera
            </Link>
            <p className="text-sm text-ink-500">
              Cards print from your instructor's roster. One card, one student.
            </p>
          </div>
        </div>

        <p className="mt-10 text-sm text-ink-500">
          Grades 9-12?{" "}
          <Link to="/sign-in" search={{ band: "9-12" }} className="ink-link">
            Sign in with your email
          </Link>
          . Instructors:{" "}
          <Link to="/instructor/sign-in" className="ink-link">
            sign in here
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
