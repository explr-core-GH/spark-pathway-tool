import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { RoleGuard } from "@/components/RoleGuard";
import { Stamp, Wordmark } from "@/components/passport";
import { usePassport, type Experience } from "@/lib/passport";
import { EXPERIENCE_TYPE_BY_KEY, STAGES } from "@/lib/wbl-taxonomy";

/** /student/experiences — everything the student has added, with status. */
export const Route = createFileRoute("/student_/experiences")({
  head: () => ({ meta: [{ title: "My experiences — EXPLR Pathways" }] }),
  component: () => (
    <RoleGuard requires="student">
      <Experiences />
    </RoleGuard>
  ),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = (table: string): any => (supabase.from as unknown as (n: string) => any)(table);

function Experiences() {
  const { user } = useSession();
  const { data: p, loading, refresh } = usePassport(user?.id ?? null);

  async function remove(e: Experience) {
    if (e.status === "verified") return;
    if (!confirm(`Remove "${e.title}"?`)) return;
    await sb("experiences").delete().eq("id", e.id);
    refresh();
  }

  return (
    <div
      className="min-h-screen bg-paper text-ink-900"
      data-density={p?.band === "explore" ? "explore" : undefined}
    >
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Wordmark />
          <Link to="/student" className="text-[15px] font-medium text-green-deep hover:underline">
            ← My passport
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-green">Experience</p>
            <h1 className="display mt-1">What I've done.</h1>
          </div>
          <div className="flex gap-3">
            <Link to="/student/experiences/new" search={{ mode: "library" }} className="btn-ghost">
              Import from library
            </Link>
            <Link to="/student/experiences/new" className="btn-ink">
              Add an experience
            </Link>
          </div>
        </div>

        {loading && <p className="mt-8 text-ink-500">Loading…</p>}
        {p && p.experiences.length === 0 && (
          <p className="mt-8 max-w-xl text-ink-700">
            Nothing yet. Start with anything real: a camp, a job shadow, a summer job, an
            internship. Exposure shows up as stickers; work experiences can be stamped by a
            supervisor.
          </p>
        )}
        {p && p.experiences.length > 0 && (
          <ul className="mt-8 flex flex-col gap-3">
            {p.experiences.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-[var(--radius-card)] border border-line bg-paper-raised p-5"
              >
                <div className="min-w-0">
                  <p className="eyebrow">
                    {STAGES[e.stage].label} ·{" "}
                    {EXPERIENCE_TYPE_BY_KEY[e.experience_type]?.label ?? e.experience_type}
                  </p>
                  <h2 className="mt-1 font-display text-xl font-semibold">
                    {e.title}
                    {e.organization ? (
                      <span className="text-ink-700"> · {e.organization}</span>
                    ) : null}
                  </h2>
                  <p className="mt-1 text-sm text-ink-700">
                    {[e.start_date, e.end_date].filter(Boolean).join(" to ")}
                    {e.hours != null ? ` · ${e.hours} hrs` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {e.status === "verified" ? (
                    <Stamp label="Verified" />
                  ) : e.status === "pending_supervisor" ? (
                    <Stamp kind="self" label="Waiting for stamp" />
                  ) : (
                    <Stamp kind="self" label="Self-reported" />
                  )}
                  {e.status !== "verified" && (
                    <button
                      type="button"
                      onClick={() => remove(e)}
                      className="text-xs text-ink-500 hover:text-ink-900"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
