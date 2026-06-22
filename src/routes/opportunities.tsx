import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import {
  OPP_TYPES,
  oppTypeMeta,
  dollars,
  hollandMatch,
  internshipYearOf,
  turns14ByJune1,
  INTERNSHIP_MIN_GRADE,
  type OppType,
  type Opportunity,
} from "@/lib/opportunities";

export const Route = createFileRoute("/opportunities")({
  head: () => ({ meta: [{ title: "Explore opportunities — EXPLR" }] }),
  component: Browse,
});

const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);

type StudentRow = {
  id: string;
  first_name: string | null;
  grade: number | null;
  date_of_birth: string | null;
};
type Filter = OppType | "all";

function Browse() {
  const { user } = useSession();
  const [opps, setOpps] = useState<Opportunity[] | null>(null);
  const [student, setStudent] = useState<StudentRow | null>(null);
  const [holland, setHolland] = useState<string | null>(null);
  const [regs, setRegs] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("all");
  const [matchOnly, setMatchOnly] = useState(false);
  const [dob, setDob] = useState("");
  const [savingDob, setSavingDob] = useState(false);

  useEffect(() => {
    sb("opportunities")
      .select("*")
      .eq("status", "approved")
      .order("start_date", { ascending: true })
      .then(({ data }: { data: Opportunity[] | null }) => setOpps((data as Opportunity[]) ?? []));
  }, []);

  useEffect(() => {
    if (!user) {
      setStudent(null);
      setHolland(null);
      setRegs(new Set());
      return;
    }
    sb("students")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }: { data: StudentRow | null }) => setStudent((data as StudentRow) ?? null));
    supabase
      .from("assessment_sessions")
      .select("holland_code, completed_at")
      .eq("student_id", user.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(1)
      .then(({ data }) => setHolland((data?.[0]?.holland_code as string) ?? null));
    sb("opportunity_registrations")
      .select("opportunity_id")
      .eq("student_id", user.id)
      .then(({ data }: { data: Array<{ opportunity_id: string }> | null }) =>
        setRegs(new Set((data ?? []).map((r) => r.opportunity_id))),
      );
  }, [user]);

  const now = new Date();
  const isStudent = !!student;

  // Internship access state for this viewer.
  const internshipState: "ok" | "signin" | "grade" | "dob" | "staff" = useMemo(() => {
    if (isStudent) {
      if ((student!.grade ?? 0) < INTERNSHIP_MIN_GRADE) return "grade";
      if (!student!.date_of_birth) return "dob";
      return "ok";
    }
    return user ? "staff" : "signin";
  }, [isStudent, student, user]);

  function internshipVisible(o: Opportunity): boolean {
    if (internshipState === "staff") return true;
    if (internshipState !== "ok") return false;
    return turns14ByJune1(student!.date_of_birth!, internshipYearOf(o.start_date, now));
  }

  const cards = useMemo(() => {
    if (!opps) return [];
    let list = opps.filter((o) => filter === "all" || o.type === filter);
    list = list.filter((o) => (o.type === "internship" ? internshipVisible(o) : true));
    if (matchOnly && holland) list = list.filter((o) => hollandMatch(holland, o.riasec_code) > 0);
    return list
      .map((o) => ({ o, m: hollandMatch(holland, o.riasec_code) }))
      .sort((a, b) => b.m - a.m)
      .map((x) => x.o);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opps, filter, matchOnly, holland, internshipState, student]);

  async function register(o: Opportunity) {
    if (!user || !isStudent) return;
    const { error } = await sb("opportunity_registrations").insert({
      opportunity_id: o.id,
      student_id: user.id,
      contact_name: student?.first_name ?? null,
    });
    if (error) {
      alert(error.message);
      return;
    }
    setRegs((prev) => new Set(prev).add(o.id));
  }

  async function saveDob() {
    if (!user || !dob) return;
    setSavingDob(true);
    const { error } = await sb("students").update({ date_of_birth: dob }).eq("id", user.id);
    setSavingDob(false);
    if (error) {
      alert(error.message);
      return;
    }
    setStudent((s) => (s ? { ...s, date_of_birth: dob } : s));
  }

  const showInternshipGate =
    (filter === "all" || filter === "internship") &&
    internshipState !== "ok" &&
    internshipState !== "staff";

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link to="/" className="eyebrow inline-block">← EXPLR</Link>
      <h1 className="mt-3 text-4xl font-light">Explore opportunities</h1>
      <p className="mt-2 max-w-2xl text-sm text-charcoal-500">
        Camps, workshops, internships, and clubs from EXPLR partner organizations.
        {holland ? ` Your interest code is ${holland} — matches are highlighted.` : ""}
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        {([{ key: "all", label: "All" }, ...OPP_TYPES.map((t) => ({ key: t.key, label: t.label }))] as Array<{ key: Filter; label: string }>).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="rounded-full px-3 py-1.5 text-xs font-medium"
            style={{
              background: filter === f.key ? "var(--ink)" : "transparent",
              color: filter === f.key ? "white" : "var(--color-charcoal-600)",
              border: `1px solid ${filter === f.key ? "var(--ink)" : "var(--color-charcoal-200)"}`,
            }}
          >
            {f.label}
          </button>
        ))}
        {holland && (
          <label className="ml-2 flex items-center gap-1.5 text-xs text-charcoal-600">
            <input type="checkbox" checked={matchOnly} onChange={(e) => setMatchOnly(e.target.checked)} />
            Match my interests
          </label>
        )}
      </div>

      {showInternshipGate && <InternshipGate state={internshipState} dob={dob} setDob={setDob} saveDob={saveDob} savingDob={savingDob} />}

      {opps === null ? (
        <p className="mt-10 text-sm text-charcoal-400">Loading…</p>
      ) : cards.length === 0 ? (
        <p className="mt-10 text-sm text-charcoal-400">
          {filter === "internship" && internshipState === "ok"
            ? "No internships you're eligible for yet — check back as new ones are posted."
            : "No opportunities here yet."}
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((o) => (
            <OppCard
              key={o.id}
              o={o}
              match={hollandMatch(holland, o.riasec_code)}
              registered={regs.has(o.id)}
              canRegister={isStudent}
              onRegister={() => register(o)}
            />
          ))}
        </div>
      )}
    </main>
  );
}

function InternshipGate({
  state,
  dob,
  setDob,
  saveDob,
  savingDob,
}: {
  state: "ok" | "signin" | "grade" | "dob" | "staff";
  dob: string;
  setDob: (v: string) => void;
  saveDob: () => void;
  savingDob: boolean;
}) {
  return (
    <div className="mt-8 border border-charcoal-200 bg-charcoal-50 p-5">
      {state === "signin" && (
        <p className="text-sm text-charcoal-600">
          Internships are for signed-in students.{" "}
          <Link to="/sign-in" className="ink-link">Sign in</Link> to see the ones you&apos;re eligible for.
        </p>
      )}
      {state === "grade" && (
        <p className="text-sm text-charcoal-600">
          Internships open up in <span className="font-medium">8th grade</span>. You&apos;ll see them
          here once you&apos;re in 8th grade or above.
        </p>
      )}
      {state === "dob" && (
        <div>
          <p className="text-sm font-medium">One quick check before internships</p>
          <p className="mt-1 text-sm text-charcoal-600">
            Students must turn <span className="font-medium">14 by June 1</span> of the internship&apos;s
            year. Enter your date of birth to see the internships you qualify for.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input type="date" className="field w-48" value={dob} onChange={(e) => setDob(e.target.value)} />
            <button onClick={saveDob} disabled={!dob || savingDob} className="btn-ink text-sm disabled:opacity-40">
              {savingDob ? "Saving…" : "Save & view internships"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OppCard({
  o,
  match,
  registered,
  canRegister,
  onRegister,
}: {
  o: Opportunity;
  match: number;
  registered: boolean;
  canRegister: boolean;
  onRegister: () => void;
}) {
  const meta = oppTypeMeta(o.type);
  const grades = [o.grade_min, o.grade_max].filter((x) => x != null).join("–");
  return (
    <div className="flex flex-col border border-charcoal-100 bg-white">
      {o.image_url ? (
        <img src={o.image_url} alt="" className="h-36 w-full object-cover" />
      ) : (
        <div className="flex h-36 w-full items-center justify-center bg-charcoal-50 text-xs uppercase tracking-wider text-charcoal-300">
          {meta.label}
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-charcoal-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-charcoal-500">
            {meta.label}
          </span>
          {match > 0 && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
              Matches {o.riasec_code}
            </span>
          )}
        </div>
        <p className="mt-2 text-sm font-medium leading-snug">{o.name || "Opportunity"}</p>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-charcoal-500">
          {o.org_logo_url && <img src={o.org_logo_url} alt="" className="h-4 w-4 rounded object-cover" />}
          <span className="truncate">{o.org_name || "Organization"}</span>
        </div>
        <p className="mt-2 text-xs text-charcoal-500">
          {[o.start_date, o.location].filter(Boolean).join(" · ") || "—"}
          {grades ? ` · grades ${grades}` : ""}
        </p>
        <p className="mt-1 text-xs font-medium text-charcoal-700">
          {o.is_free ? "Free" : dollars(o.cost_cents)}
        </p>

        <div className="mt-auto pt-4">
          {o.type === "internship" ? (
            canRegister ? (
              <Link
                to="/student/apply"
                search={{ opportunity: o.id }}
                className="btn-ink w-full justify-center text-sm"
              >
                Apply
              </Link>
            ) : (
              <Link to="/sign-in" className="btn-ghost w-full justify-center text-sm">
                Sign in to apply
              </Link>
            )
          ) : o.registration_mode === "external" && o.external_url ? (
            <a
              href={o.external_url}
              target="_blank"
              rel="noreferrer"
              className="btn-ink w-full justify-center text-sm"
            >
              Register on their site ↗
            </a>
          ) : registered ? (
            <span className="block w-full border border-emerald-200 bg-emerald-50 py-2 text-center text-sm text-emerald-700">
              ✓ Registered
            </span>
          ) : canRegister ? (
            <button onClick={onRegister} className="btn-ink w-full justify-center text-sm">
              Register
            </button>
          ) : (
            <Link to="/sign-in" className="btn-ghost w-full justify-center text-sm">
              Sign in to register
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
