import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Backpack,
  Briefcase,
  GraduationCap,
  Heart,
  Leaf,
  RefreshCw,
  Star,
  Sun,
  Users,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEducator } from "@/lib/auth";
import { DEMO, type DemoRole } from "@/lib/demo";
import { demoLogin, demoStatus, seedDemo } from "@/lib/demo.functions";
import { PortalHeader } from "@/components/passport/PortalHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Try the demo — EXPLR Pathways" },
      {
        name: "description",
        content:
          "Open EXPLR Pathways as a grade 4-8 student, a grade 9-12 student, a family member, a partner organization, or an instructor. Fake data, no passwords.",
      },
    ],
  }),
  component: DemoPage,
});

const FAMILY_TOKEN_KEY = "explr.family.token";

type Card = {
  role: DemoRole;
  eyebrow: string;
  title: string;
  body: string;
  icon: LucideIcon;
  image: string;
  explore?: boolean;
};

const CARDS: Card[] = [
  {
    role: "explorer",
    eyebrow: "Students · grades 4-8",
    title: `${DEMO.explorer.firstName}, grade ${DEMO.explorer.grade}`,
    body: "A picture-and-shapes sign-in, a camp stamp, career-day stickers, and a first portfolio piece.",
    icon: Backpack,
    image: "/passport/grades-4-8.webp",
    explore: true,
  },
  {
    role: "student",
    eyebrow: "Students · grades 9-12",
    title: `${DEMO.student.firstName}, grade ${DEMO.student.grade}`,
    body: "A verified hospital internship with supervisor ratings, credentials, a submitted checkpoint, and an internship application in review.",
    icon: GraduationCap,
    image: "/passport/grades-9-12.webp",
  },
  {
    role: "family",
    eyebrow: "Families",
    title: `${DEMO.student.firstName}'s family`,
    body: "The read-only family view: results, verified experiences, and the yearly plan waiting for a guardian sign-off.",
    icon: Heart,
    image: "/passport/families.webp",
  },
  {
    role: "partner",
    eyebrow: "Partners & organizations",
    title: DEMO.partner.org,
    body: "An approved internship that passed the EXPLR gate, a camp with a registration, and a career day still in review.",
    icon: Briefcase,
    image: "/passport/organizations.webp",
  },
  {
    role: "instructor",
    eyebrow: "Instructors",
    title: DEMO.instructor.name,
    body: "Two classes, a checkpoint to review, picture sign-in cards to print, and verified experiences to see.",
    icon: Users,
    image: "/passport/assessments.webp",
  },
];

const SHAPE_ICON: Record<string, LucideIcon> = { star: Star, leaf: Leaf, sun: Sun };

function DemoPage() {
  const navigate = useNavigate();
  const { isAdmin } = useEducator();
  const [seeded, setSeeded] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reset, setReset] = useState(false);

  useEffect(() => {
    demoStatus()
      .then((r) => setSeeded(r.seeded))
      .catch(() => setSeeded(false));
  }, []);

  async function enter(role: DemoRole) {
    setBusy(role);
    setError(null);
    try {
      const r = await demoLogin({ data: { role } });
      if (r.kind === "family") {
        try {
          localStorage.setItem(FAMILY_TOKEN_KEY, r.token);
        } catch {
          // private mode: the view also reads the token from the URL
        }
        navigate({ to: "/family/view", search: { t: r.token } });
        return;
      }
      await supabase.auth.signOut();
      const { error: otpErr } = await supabase.auth.verifyOtp({
        token_hash: r.tokenHash,
        type: "magiclink",
      });
      if (otpErr) throw new Error(otpErr.message);
      navigate({ to: r.to as never });
    } catch (e) {
      setError(e instanceof Error ? e.message.replace(/^Error:\s*/, "") : String(e));
      setBusy(null);
    }
  }

  async function seed() {
    setBusy("seed");
    setError(null);
    try {
      await seedDemo({ data: { reset } });
      setSeeded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message.replace(/^Error:\s*/, "") : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink-900">
      <PortalHeader
        links={[
          { label: "Home", to: "/" },
          { label: "About", to: "/about", secondary: true },
        ]}
      />
      <main className="mx-auto max-w-[1312px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <p className="eyebrow">Demo</p>
        <h1 className="display mt-3">Walk through EXPLR Pathways.</h1>
        <p className="lead mt-4 max-w-2xl">
          Pick a role and you are in. Every account is fake, the data is made up, and nothing you do
          here touches a real student.
        </p>

        {seeded === false && (
          <div
            role="status"
            className="mt-8 rounded-[var(--radius-card)] border border-gold bg-gold-tint px-5 py-4 text-sm text-ink-700"
          >
            The demo accounts aren&apos;t set up yet.{" "}
            {isAdmin ? "Seed them below." : "Ask an EXPLR admin to seed them from this page."}
          </div>
        )}
        {error && (
          <p role="alert" className="mt-6 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((c) => (
            <article
              key={c.role}
              data-density={c.explore ? "explore" : undefined}
              className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-paper-raised p-6 shadow-card"
            >
              <img
                src={c.image}
                alt=""
                width={252}
                height={150}
                loading="lazy"
                className="h-[150px] w-full object-contain"
              />
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-[14px] border border-mint-soft bg-mint-tint text-green-deep">
                  <c.icon className="h-6 w-6" strokeWidth={2} aria-hidden />
                </span>
                <span className="font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-green">
                  {c.eyebrow}
                </span>
              </div>
              <h2 className="font-display text-[26px] font-bold leading-tight tracking-tight">
                {c.title}
              </h2>
              <p className="text-sm leading-relaxed text-ink-700">{c.body}</p>
              <button
                type="button"
                onClick={() => enter(c.role)}
                disabled={busy !== null || seeded === false}
                className="btn-mint mt-auto justify-center disabled:opacity-50"
              >
                {busy === c.role ? "Opening…" : `Enter as ${c.title.split(",")[0]}`}
              </button>
            </article>
          ))}
        </div>

        <section className="mt-16 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-6">
            <p className="eyebrow text-green">Try the picture sign-in by hand</p>
            <h2 className="mt-2 font-display text-2xl font-bold">
              Grades 4-8 sign in without a password.
            </h2>
            <ol className="mt-4 space-y-3 text-ink-700">
              <li>
                1. Go to{" "}
                <Link to="/explore" className="ink-link">
                  Student sign in · grades 4-8
                </Link>{" "}
                and type the class code{" "}
                <span className="rounded-[var(--radius-control)] border border-line-strong bg-paper px-2 py-0.5 font-mono text-sm">
                  {DEMO.classCodes.explorer}
                </span>
                .
              </li>
              <li>
                2. Tap <strong>{DEMO.explorer.firstName}</strong>&apos;s picture (the mint star).
              </li>
              <li className="flex flex-wrap items-center gap-2">
                3. Tap the three secret shapes:
                {DEMO.exploreSecret.map((s, i) => {
                  const Icon = SHAPE_ICON[s];
                  return (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 rounded-full border border-mint-soft bg-mint-tint px-2.5 py-1 text-sm text-green-deep"
                    >
                      {Icon && <Icon className="h-4 w-4" aria-hidden />}
                      {i + 1}. {s}
                    </span>
                  );
                })}
              </li>
            </ol>
            <p className="mt-4 text-sm text-ink-500">
              Or open the QR link printed on her passport card:{" "}
              <Link to="/go/$token" params={{ token: DEMO.exploreCardToken }} className="ink-link">
                /go/{DEMO.exploreCardToken}
              </Link>
            </p>
          </div>

          <div className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-6">
            <p className="eyebrow text-green">Try the family code by hand</p>
            <h2 className="mt-2 font-display text-2xl font-bold">
              Families connect with a code, not an account.
            </h2>
            <p className="mt-4 text-ink-700">
              Go to{" "}
              <Link to="/family" className="ink-link">
                Families
              </Link>{" "}
              and enter one of these codes:
            </p>
            <ul className="mt-3 space-y-2 text-ink-700">
              <li>
                <span className="rounded-[var(--radius-control)] border border-line-strong bg-paper px-2 py-0.5 font-mono text-sm">
                  {DEMO.familyCodes.student}
                </span>{" "}
                · {DEMO.student.firstName}, grade {DEMO.student.grade}
              </li>
              <li>
                <span className="rounded-[var(--radius-control)] border border-line-strong bg-paper px-2 py-0.5 font-mono text-sm">
                  {DEMO.familyCodes.explorer}
                </span>{" "}
                · {DEMO.explorer.firstName}, grade {DEMO.explorer.grade}
              </li>
            </ul>
            <p className="mt-4 text-sm text-ink-500">
              Instructor and partner demos open with one click above; admins sign in with their own
              account.
            </p>
          </div>
        </section>

        {isAdmin && (
          <section className="mt-16 rounded-[var(--radius-card)] border border-line bg-paper-sunken p-6">
            <p className="eyebrow">Admin</p>
            <h2 className="mt-2 font-display text-2xl font-bold">Seed or reset the demo data</h2>
            <p className="mt-2 max-w-2xl text-sm text-ink-700">
              Creates the five demo accounts and their fake experiences, ratings, opportunities,
              checkpoints, and codes. Safe to run again; tick reset to wipe and rebuild them.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={seed}
                disabled={busy !== null}
                className="btn-ink disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" aria-hidden />
                {busy === "seed" ? "Seeding…" : seeded ? "Re-seed demo data" : "Seed demo data"}
              </button>
              <label className="flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  checked={reset}
                  onChange={(e) => setReset(e.target.checked)}
                />
                Wipe the demo accounts first
              </label>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
