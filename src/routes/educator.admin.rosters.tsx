import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { INTERNSHIPS } from "@/lib/internships-catalog";
import { RIASEC, RIASEC_ORDER, type RIASECCode } from "@/lib/riasec";

export const Route = createFileRoute("/educator/admin/rosters")({
  head: () => ({ meta: [{ title: "Internship rosters — Admin" }] }),
  component: () => (
    <RoleGuard requires="admin">
      <Rosters />
    </RoleGuard>
  ),
});

type Placement = {
  id: string;
  student_id: string;
  approved_internship_id: string;
  approved_at: string;
  staff_notes: string | null;
  application_id: string;
};
type Student = { id: string; first_name: string | null; grade: number; grade_band: string | null };
type Session = {
  student_id: string;
  holland_code: string | null;
  scale_scores: Record<string, number> | null;
  completed_at: string | null;
  started_at: string;
};
type Aptitude = { student_id: string; band: string; total_score: number; total_items: number; subscale_scores: Record<string, number> | null };
type Application = {
  id: string;
  student_id: string;
  selected_internship_ids: string[];
  responses: Record<string, unknown>;
  submission_term: string;
  status: string;
  submitted_at: string;
};

function Rosters() {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [students, setStudents] = useState<Map<string, Student>>(new Map());
  const [sessions, setSessions] = useState<Map<string, Session>>(new Map());
  const [aptitudes, setAptitudes] = useState<Map<string, Aptitude>>(new Map());
  const [applications, setApplications] = useState<Map<string, Application>>(new Map());
  const [loading, setLoading] = useState(true);
  const [openStudent, setOpenStudent] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      const { data: placs } = await supabase
        .from("internship_placements")
        .select("id, student_id, approved_internship_id, approved_at, staff_notes, application_id")
        .order("approved_at", { ascending: false });
      const placRows = (placs as Placement[]) ?? [];
      setPlacements(placRows);

      const ids = Array.from(new Set(placRows.map((p) => p.student_id)));
      const appIds = Array.from(new Set(placRows.map((p) => p.application_id).filter(Boolean)));

      if (ids.length > 0) {
        const [{ data: studs }, { data: sess }, { data: apt }] = await Promise.all([
          supabase.from("students").select("id, first_name, grade, grade_band").in("id", ids),
          supabase
            .from("assessment_sessions")
            .select("student_id, holland_code, scale_scores, completed_at, started_at")
            .in("student_id", ids)
            .order("started_at", { ascending: false }),
          supabase
            .from("aptitude_results")
            .select("student_id, band, total_score, total_items, subscale_scores")
            .in("student_id", ids)
            .order("completed_at", { ascending: false }),
        ]);
        const sMap = new Map<string, Student>();
        ((studs as Student[]) ?? []).forEach((s) => sMap.set(s.id, s));
        setStudents(sMap);
        const sessMap = new Map<string, Session>();
        ((sess as Session[]) ?? []).forEach((r) => { if (!sessMap.has(r.student_id)) sessMap.set(r.student_id, r); });
        setSessions(sessMap);
        const aMap = new Map<string, Aptitude>();
        ((apt as Aptitude[]) ?? []).forEach((r) => { if (!aMap.has(r.student_id)) aMap.set(r.student_id, r); });
        setAptitudes(aMap);
      }

      if (appIds.length > 0) {
        const { data: apps } = await supabase
          .from("internship_applications")
          .select("id, student_id, selected_internship_ids, responses, submission_term, status, submitted_at")
          .in("id", appIds);
        const aMap = new Map<string, Application>();
        ((apps as Application[]) ?? []).forEach((a) => aMap.set(a.id, a));
        setApplications(aMap);
      }

      setLoading(false);
    })();
  }, []);

  // Group placements by internship slug
  const grouped = useMemo(() => {
    const map = new Map<string, Placement[]>();
    placements.forEach((p) => {
      const arr = map.get(p.approved_internship_id) ?? [];
      arr.push(p);
      map.set(p.approved_internship_id, arr);
    });
    return map;
  }, [placements]);

  const internshipsList = useMemo(() => {
    // Show every internship in catalog (even with 0 placements) plus any orphan slug
    const known = new Set(INTERNSHIPS.map((i) => i.slug));
    const orphans = Array.from(grouped.keys()).filter((s) => !known.has(s));
    return [
      ...INTERNSHIPS.map((i) => ({ slug: i.slug, name: i.name, emoji: i.emoji, theme: i.theme })),
      ...orphans.map((s) => ({ slug: s, name: s, emoji: "📦", theme: "" })),
    ];
  }, [grouped]);

  const filteredInternships = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return internshipsList;
    return internshipsList.filter((i) =>
      i.name.toLowerCase().includes(q) ||
      i.slug.toLowerCase().includes(q) ||
      (grouped.get(i.slug) ?? []).some((p) => {
        const s = students.get(p.student_id);
        return s?.first_name?.toLowerCase().includes(q) || p.student_id.toLowerCase().includes(q);
      })
    );
  }, [internshipsList, query, grouped, students]);

  if (loading) {
    return <main className="mx-auto max-w-6xl px-6 py-24 text-sm text-charcoal-400">Loading rosters…</main>;
  }

  const totalPlaced = placements.length;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-baseline justify-between gap-6">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="display mt-2">Internship rosters</h1>
          <p className="mt-2 text-sm text-charcoal-500">
            {totalPlaced} placed student{totalPlaced === 1 ? "" : "s"} across {grouped.size} internship{grouped.size === 1 ? "" : "s"}.
          </p>
        </div>
        <input
          className="field max-w-xs"
          placeholder="Search internship or student…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="mt-10 space-y-4">
        {filteredInternships.map((i) => {
          const roster = grouped.get(i.slug) ?? [];
          return (
            <InternshipBlock
              key={i.slug}
              name={i.name}
              emoji={i.emoji}
              theme={i.theme}
              roster={roster}
              students={students}
              sessions={sessions}
              aptitudes={aptitudes}
              applications={applications}
              openStudent={openStudent}
              setOpenStudent={setOpenStudent}
            />
          );
        })}
      </div>
    </main>
  );
}

function InternshipBlock({
  name, emoji, theme, roster, students, sessions, aptitudes, applications, openStudent, setOpenStudent,
}: {
  name: string; emoji: string; theme: string;
  roster: Placement[];
  students: Map<string, Student>;
  sessions: Map<string, Session>;
  aptitudes: Map<string, Aptitude>;
  applications: Map<string, Application>;
  openStudent: string | null;
  setOpenStudent: (id: string | null) => void;
}) {
  const [collapsed, setCollapsed] = useState(roster.length === 0);

  return (
    <section className="border border-charcoal-100">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-4 bg-canvas px-5 py-4 text-left hover:bg-charcoal-50"
      >
        <span className="text-2xl" aria-hidden>{emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="font-medium">{name}</div>
          {theme && <div className="text-xs text-charcoal-500">{theme}</div>}
        </div>
        <span className="text-xs uppercase tracking-wider text-charcoal-400">
          {roster.length} placed
        </span>
        <span className="text-charcoal-400">{collapsed ? "▸" : "▾"}</span>
      </button>

      {!collapsed && (
        <div className="border-t border-charcoal-100">
          {roster.length === 0 ? (
            <p className="px-5 py-6 text-sm text-charcoal-400">No students placed yet.</p>
          ) : (
            <ul className="divide-y divide-charcoal-100">
              {roster.map((p) => {
                const s = students.get(p.student_id);
                const isOpen = openStudent === p.student_id;
                const sess = sessions.get(p.student_id);
                const apt = aptitudes.get(p.student_id);
                const app = applications.get(p.application_id);
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => setOpenStudent(isOpen ? null : p.student_id)}
                      className="flex w-full items-center gap-4 px-5 py-3 text-left hover:bg-charcoal-50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">
                          {s?.first_name || "Student"} {s?.grade ? `· Grade ${s.grade}` : ""}
                        </div>
                        <div className="text-xs font-mono text-charcoal-400">
                          {p.student_id.slice(0, 8)}… · placed {new Date(p.approved_at).toLocaleDateString()}
                        </div>
                      </div>
                      {sess?.holland_code && (
                        <span className="font-mono text-sm" style={{ color: RIASEC[sess.holland_code[0] as RIASECCode]?.color }}>
                          {sess.holland_code}
                        </span>
                      )}
                      <span className="text-charcoal-400">{isOpen ? "▾" : "▸"}</span>
                    </button>
                    {isOpen && (
                      <StudentDetail
                        placement={p}
                        student={s}
                        session={sess}
                        aptitude={apt}
                        application={app}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function StudentDetail({
  placement, student, session, aptitude, application,
}: {
  placement: Placement;
  student: Student | undefined;
  session: Session | undefined;
  aptitude: Aptitude | undefined;
  application: Application | undefined;
}) {
  return (
    <div className="border-t border-charcoal-100 bg-charcoal-50 px-5 py-6">
      <div className="grid gap-6 md:grid-cols-2">
        <DetailCard title="Profile">
          <Row label="Name" value={student?.first_name ?? "—"} />
          <Row label="Grade" value={student?.grade ? `${student.grade} (${student.grade_band ?? "—"})` : "—"} />
          <Row label="Student ID" value={<span className="font-mono text-xs">{placement.student_id}</span>} />
        </DetailCard>

        <DetailCard title="Placement">
          <Row label="Internship" value={placement.approved_internship_id} />
          <Row label="Approved" value={new Date(placement.approved_at).toLocaleString()} />
          {placement.staff_notes && (
            <div className="mt-2">
              <div className="label">Staff notes</div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{placement.staff_notes}</p>
            </div>
          )}
        </DetailCard>

        <DetailCard title="RIASEC assessment">
          {session ? (
            <>
              <Row label="Holland code" value={
                <span className="font-mono font-medium" style={{ color: RIASEC[session.holland_code?.[0] as RIASECCode]?.color }}>
                  {session.holland_code ?? "—"}
                </span>
              } />
              <Row label="Completed" value={session.completed_at ? new Date(session.completed_at).toLocaleDateString() : "In progress"} />
              {session.scale_scores && (
                <div className="mt-3 space-y-1.5">
                  {RIASEC_ORDER.map((c) => {
                    const score = session.scale_scores?.[c] ?? 0;
                    const pct = Math.min(100, Math.max(0, score * 20));
                    return (
                      <div key={c} className="flex items-center gap-3 text-xs">
                        <span className="w-4 font-mono" style={{ color: RIASEC[c].color }}>{c}</span>
                        <div className="h-1.5 flex-1 bg-charcoal-100">
                          <div className="h-full" style={{ width: `${pct}%`, background: RIASEC[c].color }} />
                        </div>
                        <span className="w-10 text-right tabular-nums text-charcoal-500">{score.toFixed(1)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-charcoal-400">No assessment data.</p>
          )}
        </DetailCard>

        <DetailCard title="Aptitude">
          {aptitude ? (
            <>
              <Row label="Band" value={aptitude.band} />
              <Row label="Score" value={`${aptitude.total_score} / ${aptitude.total_items}`} />
              {aptitude.subscale_scores && (
                <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-charcoal-500">
                  {Object.entries(aptitude.subscale_scores).map(([k, v]) => (
                    <div key={k}><span className="text-charcoal-400">{k}:</span> {String(v)}</div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-charcoal-400">No aptitude data.</p>
          )}
        </DetailCard>

        <DetailCard title="Application" wide>
          {application ? (
            <>
              <Row label="Status" value={<span className="capitalize">{application.status.replace(/_/g, " ")}</span>} />
              <Row label="Submitted" value={new Date(application.submitted_at).toLocaleString()} />
              <Row label="Term" value={application.submission_term} />
              <Row label="Ranked" value={`${application.selected_internship_ids.length} internship${application.selected_internship_ids.length === 1 ? "" : "s"}`} />
              {application.selected_internship_ids.length > 0 && (
                <div className="mt-2">
                  <div className="label">Ranked choices</div>
                  <ol className="mt-1 list-inside list-decimal text-sm">
                    {application.selected_internship_ids.map((slug) => (
                      <li key={slug} className={slug === placement.approved_internship_id ? "font-medium text-ink" : "text-charcoal-500"}>
                        {INTERNSHIPS.find((i) => i.slug === slug)?.name ?? slug}
                        {slug === placement.approved_internship_id && " ✓"}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {application.responses && Object.keys(application.responses).length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs uppercase tracking-wider text-charcoal-500 hover:text-ink">Application responses</summary>
                  <div className="mt-2 space-y-2">
                    {Object.entries(application.responses).map(([k, v]) => (
                      <div key={k}>
                        <div className="text-xs uppercase tracking-wider text-charcoal-400">{k.replace(/_/g, " ")}</div>
                        <p className="whitespace-pre-wrap text-sm">{typeof v === "string" ? v : JSON.stringify(v)}</p>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </>
          ) : (
            <p className="text-sm text-charcoal-400">No application linked.</p>
          )}
        </DetailCard>
      </div>
    </div>
  );
}

function DetailCard({ title, children, wide = false }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`bg-canvas border border-charcoal-100 p-5 ${wide ? "md:col-span-2" : ""}`}>
      <h3 className="text-xs uppercase tracking-wider text-charcoal-500">{title}</h3>
      <div className="mt-3 space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-xs uppercase tracking-wider text-charcoal-400">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
