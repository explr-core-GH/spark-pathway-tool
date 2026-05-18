import { useEffect, useState } from "react";

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
  zip?: string;
  gradeSpan?: string;
  buildingType?: string;
  principal?: string;
  superintendent?: string;
  enrollment?: number;
  ratings?: {
    overall?: { stars: number | null };
    achievement?: { stars: number | null };
    gapClosing?: { stars: number | null };
  };
  demographics?: {
    race?: DemoRow[];
    gender?: DemoRow[];
    disabled?: DemoRow[];
    el?: DemoRow[];
    econ?: DemoRow[];
    gifted?: DemoRow[];
  };
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

function label(g: string) {
  return GROUP_LABELS[g] ?? g.toLowerCase().replace(/(^|\s)\w/g, (c) => c.toUpperCase());
}

function Stars({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-charcoal-400">—</span>;
  return <span>{value.toFixed(1)}★</span>;
}

function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-charcoal-100 bg-white px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-charcoal-400">{label}</div>
      <div className="mt-1 text-xl font-light text-charcoal-700">{value}</div>
    </div>
  );
}

function DemoPanel({ title, rows }: { title: string; rows: DemoRow[] | undefined }) {
  const visible = (rows ?? []).filter((r) => r.pctOfTotal != null);
  return (
    <div className="rounded-md border border-charcoal-100 bg-white p-4">
      <div className="text-xs uppercase tracking-wider text-charcoal-400">{title}</div>
      {visible.length === 0 ? (
        <p className="mt-3 text-xs text-charcoal-400">Suppressed (small population).</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {(rows ?? []).map((r) => (
            <li key={r.group}>
              <div className="flex items-baseline justify-between text-xs text-charcoal-700">
                <span>{label(r.group)}</span>
                <span className="font-mono text-charcoal-500">
                  {r.pctOfTotal != null ? `${r.pctOfTotal.toFixed(1)}%` : "—"}
                  <span className="ml-2 text-charcoal-400">n={r.enrollment}</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded bg-charcoal-50">
                <div
                  className="h-full rounded bg-explr-500"
                  style={{ width: `${Math.min(100, r.pctOfTotal ?? 0)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Props = { irn: string };

export function SchoolDemographics({ irn }: Props) {
  const [data, setData] = useState<Building | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    setData(null);
    setMissing(false);
    fetch(`/ohio/buildings/${irn}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setData(d))
      .catch(() => setMissing(true));
  }, [irn]);

  if (missing) {
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        School details not found.
      </div>
    );
  }
  if (!data) {
    return <div className="text-sm text-charcoal-400">Loading school details…</div>;
  }

  const r = data.ratings ?? {};
  return (
    <div className="space-y-6">
      <header className="rounded-md border border-charcoal-100 bg-white p-5">
        <h3 className="text-lg font-medium text-charcoal-700">{data.name}</h3>
        <p className="mt-1 text-sm text-charcoal-500">
          {[data.districtName, data.city, data.zip].filter(Boolean).join(" · ")}
        </p>
        <p className="text-xs text-charcoal-400">
          {[data.gradeSpan, data.buildingType].filter(Boolean).join(" · ")}
        </p>
        <dl className="mt-4 grid gap-x-6 gap-y-1 text-xs text-charcoal-500 sm:grid-cols-2">
          {data.principal && (
            <div>
              <dt className="inline text-charcoal-400">Principal: </dt>
              <dd className="inline text-charcoal-700">{data.principal}</dd>
            </div>
          )}
          {data.superintendent && (
            <div>
              <dt className="inline text-charcoal-400">Superintendent: </dt>
              <dd className="inline text-charcoal-700">{data.superintendent}</dd>
            </div>
          )}
        </dl>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Enrollment" value={data.enrollment ?? "—"} />
        <StatTile label="Overall" value={<Stars value={r.overall?.stars ?? null} />} />
        <StatTile label="Achievement" value={<Stars value={r.achievement?.stars ?? null} />} />
        <StatTile label="Gap Closing" value={<Stars value={r.gapClosing?.stars ?? null} />} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DemoPanel title="Race / Ethnicity" rows={data.demographics?.race} />
        <DemoPanel title="Gender" rows={data.demographics?.gender} />
        <DemoPanel title="Economically Disadvantaged" rows={data.demographics?.econ} />
        <DemoPanel title="Students with Disabilities" rows={data.demographics?.disabled} />
        <DemoPanel title="English Learners" rows={data.demographics?.el} />
        <DemoPanel title="Gifted" rows={data.demographics?.gifted} />
      </div>

      <p className="text-[10px] uppercase tracking-wider text-charcoal-400">
        Source: Ohio Department of Education and Workforce · 2024–2025 Report Card
      </p>
    </div>
  );
}
