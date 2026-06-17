import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GRADE_LABEL, GRADE_VALUES } from "@/components/GradeLevelPicker";

export const Route = createFileRoute("/educator/admin/demographics")({
  head: () => ({ meta: [{ title: "Demographics — Admin" }] }),
  component: DemographicsAdmin,
});

// ---------- shared types (match SchoolDemographics) ----------

type DemoRow = {
  group: string;
  enrollment: number | string;
  pctOfTotal: number | null;
  attendanceRate: number | null;
};

type Building = {
  irn: string;
  name: string;
  districtName?: string;
  city?: string;
  enrollment?: number;
  demographics?: {
    race?: DemoRow[];
    gender?: DemoRow[];
    disabled?: DemoRow[];
    el?: DemoRow[];
    econ?: DemoRow[];
    gifted?: DemoRow[];
  };
};

type Source = {
  kind: "educator" | "program";
  label: string;             // free-text display label
  school_irn: string;
  school_name: string | null;
  student_count: number;     // > 0 only
  grade_levels: number[] | null;
};

const GROUP_LABELS: Record<string, string> = {
  "AMERICAN INDIAN OR ALASKAN NATIVE": "American Indian / Alaskan Native",
  ASIAN: "Asian",
  "BLACK, NON-HISPANIC": "Black",
  HISPANIC: "Hispanic",
  MULTIRACIAL: "Multiracial",
  "PACIFIC ISLANDER": "Pacific Islander",
  "WHITE, NON-HISPANIC": "White",
  FEMALE: "Female",
  MALE: "Male",
  DISABLED: "With disabilities",
  NOTDISABLED: "Without disabilities",
  ENGLEARN: "English learners",
  NOTENGLEARN: "Non-EL",
  ECONDISADV: "Economically disadvantaged",
  NOTECONDISADV: "Not econ. disadvantaged",
  GIFTED: "Gifted",
  NOTGIFTED: "Not gifted",
};
const label = (g: string) =>
  GROUP_LABELS[g] ?? g.toLowerCase().replace(/(^|\s)\w/g, (c) => c.toUpperCase());

// Cache + lazy-loader for building JSON. Memoized across re-renders.
const buildingCache = new Map<string, Promise<Building | null>>();
function fetchBuilding(irn: string): Promise<Building | null> {
  if (!buildingCache.has(irn)) {
    buildingCache.set(
      irn,
      fetch(`/ohio/buildings/${encodeURIComponent(irn)}.json`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    );
  }
  return buildingCache.get(irn)!;
}

// Weighted average across sources, by demographic category. Suppressed cells
// (pctOfTotal == null) are excluded from both numerator and denominator —
// the result is "of the rosters that report this group, the weighted mean".
function aggregate(
  sources: Source[],
  buildings: Map<string, Building | null>,
  category: keyof NonNullable<Building["demographics"]>,
): Array<{ group: string; pct: number; covered: number }> {
  const num = new Map<string, number>();
  const den = new Map<string, number>();
  for (const s of sources) {
    const b = buildings.get(s.school_irn);
    if (!b || !b.demographics) continue;
    const rows = b.demographics[category];
    if (!rows) continue;
    for (const r of rows) {
      if (r.pctOfTotal == null) continue;
      num.set(r.group, (num.get(r.group) ?? 0) + r.pctOfTotal * s.student_count);
      den.set(r.group, (den.get(r.group) ?? 0) + s.student_count);
    }
  }
  return [...num.entries()]
    .map(([group, n]) => ({
      group,
      pct: n / (den.get(group) || 1),
      covered: den.get(group) ?? 0,
    }))
    .sort((a, b) => b.pct - a.pct);
}

function DemographicsAdmin() {
  const [sources, setSources] = useState<Source[]>([]);
  const [buildings, setBuildings] = useState<Map<string, Building | null>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: educators }, { data: programs }] = await Promise.all([
        supabase
          .from("educators")
          .select("full_name, school_irn, school_name, student_count, grade_levels")
          .not("school_irn", "is", null)
          .gt("student_count", 0),
        supabase
          .from("programs")
          .select("name, school_irn, school_name, student_count, grade_levels")
          .not("school_irn", "is", null)
          .gt("student_count", 0),
      ]);

      const ss: Source[] = [];
      for (const e of educators ?? []) {
        if (e.school_irn && e.student_count != null) {
          ss.push({
            kind: "educator",
            label: e.full_name ?? "(educator)",
            school_irn: e.school_irn,
            school_name: e.school_name,
            student_count: e.student_count,
            grade_levels: e.grade_levels ?? null,
          });
        }
      }
      for (const p of programs ?? []) {
        if (p.school_irn && p.student_count != null) {
          ss.push({
            kind: "program",
            label: p.name ?? "(program)",
            school_irn: p.school_irn,
            school_name: p.school_name,
            student_count: p.student_count,
            grade_levels: p.grade_levels ?? null,
          });
        }
      }
      setSources(ss);

      const uniqueIrns = [...new Set(ss.map((s) => s.school_irn))];
      const fetched = await Promise.all(uniqueIrns.map((irn) => fetchBuilding(irn)));
      const map = new Map<string, Building | null>();
      uniqueIrns.forEach((irn, i) => map.set(irn, fetched[i]));
      setBuildings(map);
      setLoading(false);
    })();
  }, []);

  const totalStudents = useMemo(
    () => sources.reduce((s, x) => s + x.student_count, 0),
    [sources],
  );
  const uniqueSchools = useMemo(
    () => new Set(sources.map((s) => s.school_irn)).size,
    [sources],
  );

  const gradeHistogram = useMemo(() => {
    const counts = new Map<number, number>();
    for (const s of sources) {
      if (!s.grade_levels || s.grade_levels.length === 0) continue;
      // Distribute the student_count evenly across the grade levels they teach.
      const per = s.student_count / s.grade_levels.length;
      for (const g of s.grade_levels) {
        counts.set(g, (counts.get(g) ?? 0) + per);
      }
    }
    const max = Math.max(0, ...counts.values());
    return GRADE_VALUES.map((g) => ({
      grade: g,
      label: GRADE_LABEL[g],
      students: counts.get(g) ?? 0,
      width: max > 0 ? ((counts.get(g) ?? 0) / max) * 100 : 0,
    }));
  }, [sources]);

  const race = useMemo(() => aggregate(sources, buildings, "race"), [sources, buildings]);
  const gender = useMemo(() => aggregate(sources, buildings, "gender"), [sources, buildings]);
  const econ = useMemo(() => aggregate(sources, buildings, "econ"), [sources, buildings]);
  const disabled = useMemo(() => aggregate(sources, buildings, "disabled"), [sources, buildings]);
  const el = useMemo(() => aggregate(sources, buildings, "el"), [sources, buildings]);
  const gifted = useMemo(() => aggregate(sources, buildings, "gifted"), [sources, buildings]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <p className="eyebrow">Admin</p>
      <h1 className="display mt-2">Demographics</h1>
      <p className="lead mt-3 max-w-2xl">
        Aggregate Ohio Dept of Ed demographics across every educator and program
        that has reported a school connection + roster size. Each contribution
        is weighted by its student count.
      </p>

      {loading ? (
        <p className="mt-12 text-sm text-charcoal-500">Loading sources and building data…</p>
      ) : sources.length === 0 ? (
        <div className="mt-12 border border-dashed border-charcoal-200 p-8 text-sm text-charcoal-500">
          No sources yet. Demographics aggregate from educators who connect a
          school + student count on their profile, and from admin-managed
          programs that do the same. Add either to populate this dashboard.
        </div>
      ) : (
        <>
          {/* Headline stats */}
          <section className="mt-10 grid gap-4 sm:grid-cols-3">
            <StatTile label="Students reached" value={totalStudents.toLocaleString()} />
            <StatTile label="Unique schools" value={uniqueSchools.toString()} />
            <StatTile
              label="Sources (educators + programs)"
              value={sources.length.toString()}
            />
          </section>

          {/* Grade-level histogram */}
          <section className="mt-12 border border-charcoal-100 p-6">
            <h2 className="eyebrow">Grade-level distribution</h2>
            <p className="mt-1 text-xs text-charcoal-500">
              Student count distributed evenly across each source&apos;s reported grade levels.
            </p>
            <div className="mt-4 space-y-1">
              {gradeHistogram.map((row) => (
                <div key={row.grade} className="flex items-center gap-3 text-xs">
                  <span className="w-6 shrink-0 text-charcoal-500">{row.label}</span>
                  <div className="relative h-5 flex-1 bg-charcoal-50">
                    <div
                      className="absolute inset-y-0 left-0 bg-charcoal-700"
                      style={{ width: `${row.width}%` }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right tabular-nums text-charcoal-500">
                    {Math.round(row.students)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Demographic panels — same 6 categories as the single-school view */}
          <section className="mt-12 grid gap-6 md:grid-cols-2">
            <DemoPanel title="Race / ethnicity" rows={race} totalStudents={totalStudents} />
            <DemoPanel title="Gender" rows={gender} totalStudents={totalStudents} />
            <DemoPanel
              title="Economically disadvantaged"
              rows={econ}
              totalStudents={totalStudents}
            />
            <DemoPanel
              title="Students with disabilities"
              rows={disabled}
              totalStudents={totalStudents}
            />
            <DemoPanel title="English learners" rows={el} totalStudents={totalStudents} />
            <DemoPanel title="Gifted" rows={gifted} totalStudents={totalStudents} />
          </section>

          {/* Source breakdown table */}
          <section className="mt-12">
            <h2 className="eyebrow">Sources contributing to this aggregate</h2>
            <ul className="mt-4 divide-y divide-charcoal-100 border-y border-charcoal-100">
              {sources.map((s, i) => (
                <li key={`${s.kind}-${i}`} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <span className="w-20 shrink-0 text-[10px] uppercase tracking-wider text-charcoal-400">
                    {s.kind}
                  </span>
                  <span className="flex-1 font-medium">{s.label}</span>
                  <span className="text-charcoal-500">{s.school_name ?? `IRN ${s.school_irn}`}</span>
                  <span className="w-20 text-right tabular-nums text-charcoal-500">
                    {s.student_count.toLocaleString()} students
                  </span>
                  <span className="w-32 text-right text-xs text-charcoal-400">
                    {s.grade_levels && s.grade_levels.length > 0
                      ? s.grade_levels.map((g) => GRADE_LABEL[g]).join(", ")
                      : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <p className="mt-10 text-xs text-charcoal-400">
            Source: public school report-card data. A few small groups aren&apos;t
            reported in the underlying data, so they&apos;re excluded from these averages.
          </p>
        </>
      )}
    </main>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-charcoal-100 p-5">
      <p className="text-[10px] uppercase tracking-wider font-semibold text-charcoal-400">
        {label}
      </p>
      <p className="mt-1 text-3xl font-light tabular-nums text-ink">{value}</p>
    </div>
  );
}

function DemoPanel({
  title,
  rows,
  totalStudents,
}: {
  title: string;
  rows: Array<{ group: string; pct: number; covered: number }>;
  totalStudents: number;
}) {
  return (
    <div className="border border-charcoal-100 p-5">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-charcoal-400 italic">
          No data reported for this group in the source.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.group}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-charcoal-700">{label(r.group)}</span>
                <span className="tabular-nums text-charcoal-500">
                  {r.pct.toFixed(1)}%
                  <span className="ml-1 text-charcoal-400">
                    ({Math.round((r.covered / Math.max(1, totalStudents)) * 100)}% covered)
                  </span>
                </span>
              </div>
              <div className="mt-1 h-1.5 bg-charcoal-50">
                <div
                  className="h-full"
                  style={{
                    width: `${Math.max(0, Math.min(100, r.pct))}%`,
                    background: "var(--explr)",
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
