import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Printer, RefreshCw, UserPlus } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AvatarTile, SHAPE_LABELS, ShapeIcon } from "@/components/passport/ShapeIcon";
import {
  addExploreStudent,
  ensureJoinCode,
  provisionExploreLogins,
  type ExploreCard,
} from "@/lib/explore-logins.functions";

/**
 * /educator/explore-cards/$kind/$id — picture sign-in for one class or camp.
 * Shows the join code (for the board), lets the instructor print passport
 * cards (name, picture, three secret shapes, QR), and add a grade 4-8
 * student who isn't on any roster yet. Admins, the class's teacher, and the
 * camp's instructors can use it; the server enforces that.
 */
export const Route = createFileRoute("/instructor/explore-cards/$kind/$id")({
  head: () => ({ meta: [{ title: "Picture sign-in cards — EXPLR" }] }),
  component: () => (
    <RoleGuard requires="educator">
      <ExploreCards />
    </RoleGuard>
  ),
});

type Kind = "class" | "camp";

function ExploreCards() {
  const { kind, id } = Route.useParams();
  const k = (kind === "camp" ? "camp" : "class") as Kind;
  const [name, setName] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [codeQr, setCodeQr] = useState<string | null>(null);
  const [cards, setCards] = useState<ExploreCard[]>([]);
  const [qrs, setQrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newGrade, setNewGrade] = useState(6);

  const origin = typeof window === "undefined" ? "" : window.location.origin;

  const load = useCallback(async () => {
    setError(null);
    try {
      const [jc, prov] = await Promise.all([
        ensureJoinCode({ data: { kind: k, id } }),
        provisionExploreLogins({ data: { kind: k, id, reissue: false } }),
      ]);
      setName(jc.name);
      setCode(jc.code);
      setCards(prov.cards);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [k, id]);

  useEffect(() => {
    load();
  }, [load]);

  // QR images: the class QR opens /explore/CODE; each card QR opens /go/TOKEN.
  useEffect(() => {
    if (!code || !origin) return;
    let active = true;
    import("qrcode")
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(`${origin}/explore/${code}`, { width: 320, margin: 1 }),
      )
      .then((d) => active && setCodeQr(d))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [code, origin]);

  useEffect(() => {
    const withTokens = cards.filter((c) => c.token);
    if (withTokens.length === 0 || !origin) return;
    let active = true;
    import("qrcode").then(async ({ default: QRCode }) => {
      const out: Record<string, string> = {};
      for (const c of withTokens) {
        out[c.loginId] = await QRCode.toDataURL(`${origin}/go/${c.token}`, {
          width: 240,
          margin: 1,
        });
      }
      if (active) setQrs(out);
    });
    return () => {
      active = false;
    };
  }, [cards, origin]);

  async function reissue() {
    if (!confirm("Print new cards for everyone? Old cards and secret shapes stop working.")) return;
    setBusy("reissue");
    setError(null);
    try {
      const prov = await provisionExploreLogins({ data: { kind: k, id, reissue: true } });
      setCards(prov.cards);
      setTimeout(() => window.print(), 600);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy("add");
    setError(null);
    try {
      const { card } = await addExploreStudent({
        data: { kind: k, id, firstName: newName, grade: newGrade },
      });
      setCards((prev) => [...prev, card].sort((a, b) => a.firstName.localeCompare(b.firstName)));
      setNewName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  const printable = cards.filter((c) => c.secret && c.token);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="print:hidden">
        <Link to="/instructor/dashboard" className="eyebrow inline-block">
          ← Dashboard
        </Link>
        <p className="eyebrow mt-6 text-green">Picture sign-in · grades 4-8</p>
        <h1 className="mt-2 font-display text-4xl font-bold">{name || "Loading…"}</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-700">
          Students in this group sign in by tapping their picture and three secret shapes, or by
          scanning their passport card. Put the class code on the board, or open{" "}
          <span className="font-mono">
            {origin}/explore/{code}
          </span>{" "}
          on each laptop.
        </p>

        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_1fr]">
          <section className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-6 shadow-card">
            <p className="eyebrow text-green">Class code · for the board</p>
            <p className="mt-2 font-display text-5xl font-extrabold tracking-wide">{code || "…"}</p>
            {codeQr && (
              <img
                src={codeQr}
                alt={`QR code opening the picture sign-in for ${name}`}
                className="mt-4 h-40 w-40"
              />
            )}
            <p className="mt-2 text-xs text-ink-500">
              Scanning this opens the class picture page. It never signs anyone in by itself.
            </p>
          </section>

          <section className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-6 shadow-card">
            <p className="eyebrow text-green">Passport cards</p>
            <p className="mt-2 text-sm text-ink-700">
              Each card has the student's picture, their three secret shapes, and a QR code that
              signs them in. Printing issues fresh shapes and codes for everyone, so old cards stop
              working.
            </p>
            <button
              type="button"
              disabled={!!busy || cards.length === 0}
              onClick={reissue}
              className="btn-ink mt-4"
            >
              {busy === "reissue" ? (
                <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Printer className="h-4 w-4" aria-hidden />
              )}
              Print cards for everyone
            </button>

            <form
              onSubmit={add}
              className="mt-6 flex flex-wrap items-end gap-3 border-t border-line pt-5"
            >
              <div className="min-w-[160px] flex-1">
                <label className="label" htmlFor="new-first">
                  Add a student · first name
                </label>
                <input
                  id="new-first"
                  className="field"
                  required
                  maxLength={40}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="new-grade">
                  Grade
                </label>
                <select
                  id="new-grade"
                  className="field"
                  value={newGrade}
                  onChange={(e) => setNewGrade(Number(e.target.value))}
                >
                  {[4, 5, 6, 7, 8].map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" disabled={!!busy} className="btn-ghost">
                <UserPlus className="h-4 w-4" aria-hidden /> Add
              </button>
            </form>
          </section>
        </div>

        <section className="mt-10">
          <p className="eyebrow">Roster · {cards.length} students</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <li
                key={c.loginId}
                className="flex items-center gap-3 rounded-[var(--radius-control)] border border-line bg-paper-raised px-3 py-2"
              >
                <AvatarTile shape={c.avatarShape} color={c.avatarColor} size={44} />
                <span className="font-medium">{c.firstName}</span>
                <span className="ml-auto text-xs text-ink-500">
                  {c.secret ? "new card ready" : "card issued"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Print layout: 8 cards per Letter page. Only freshly issued cards carry secrets. */}
      {printable.length > 0 && (
        <section className="hidden print:block">
          <div className="grid grid-cols-2 gap-4">
            {printable.map((c) => (
              <article
                key={c.loginId}
                className="flex gap-4 border border-ink-900 p-4"
                style={{ breakInside: "avoid" }}
              >
                <div className="flex flex-col items-center gap-2">
                  <AvatarTile shape={c.avatarShape} color={c.avatarColor} size={72} />
                  <span className="text-lg font-bold">{c.firstName}</span>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-wider">
                    EXPLR Pathways · {name} · {code}
                  </p>
                  <p className="mt-1 text-xs">My three secret shapes, in order:</p>
                  <p className="mt-1 flex gap-2">
                    {c.secret!.map((s, i) => (
                      <span
                        key={i}
                        className="grid h-9 w-9 place-items-center rounded-full border border-ink-900"
                      >
                        <ShapeIcon shape={s} size={20} />
                        <span className="sr-only">{SHAPE_LABELS[s]}</span>
                      </span>
                    ))}
                  </p>
                  <p className="mt-2 text-[10px]">Or scan this at {origin}/explore</p>
                </div>
                {qrs[c.loginId] && <img src={qrs[c.loginId]} alt="" className="h-24 w-24" />}
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
