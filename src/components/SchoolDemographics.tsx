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
  if (value == null) return <span className="text-ink-500">—</span>;
  return <span>{value.toFixed(1)}★</span>;
}

function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-paper-raised px-4 py-3">
      <div className="eyebrow">{label}</div>
      <div className="mt-1 font-display text-xl font-bold text-ink-900">{value}</div>
    </div>
  );
}

function DemoPanel({ title, rows }: { title: string; rows: DemoRow[] | undefined }) {
  const visible = (rows ?? []).filter((r) => r.pctOfTotal != null);
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-4">
      <div className="font-display text-base font-semibold text-ink-900">{title}</div>
      {visible.length === 0 ? (
        <p className="mt-3 text-xs text-ink-500">Suppressed (small population).</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {(rows ?? []).map((r) => (
            <li key={r.group}>
              <div className="flex items-baseline justify-between text-xs text-ink-700">
                <span>{label(r.group)}</span>
                <span className="font-mono text-ink-500">
                  {r.pctOfTotal != null ? `${r.pctOfTotal.toFixed(1)}%` : "—"}
                  <span className="ml-2 text-ink-500">n={r.enrollment}</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-paper-sunken">
                <div
                  className="h-full rounded-full bg-green"
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
      <div
        role="status"
        className="rounded-[var(--radius-control)] border border-gold bg-gold-tint px-4 py-3 text-sm text-ink-900"
      >
        School details not found.
      </div>
    );
  }
  if (!data) {
    return (
      <div role="status" className="text-sm text-ink-500">
        Loading school details…
      </div>
    );
  }

  const r = data.ratings ?? {};
  return (
    <div className="space-y-6">
      <header className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-5">
        <h3 className="font-display text-xl font-bold text-ink-900">{data.name}</h3>
        <p className="mt-1 text-sm text-ink-500">
          {[data.districtName, data.city, data.zip].filter(Boolean).join(" · ")}
        </p>
        <p className="text-xs text-ink-500">
          {[data.gradeSpan, data.buildingType].filter(Boolean).join(" · ")}
        </p>
        <dl className="mt-4 grid gap-x-6 gap-y-1 text-xs text-ink-500 sm:grid-cols-2">
          {data.principal && (
            <div>
              <dt className="inline text-ink-500">Principal: </dt>
              <dd className="inline text-ink-700">{data.principal}</dd>
            </div>
          )}
          {data.superintendent && (
            <div>
              <dt className="inline text-ink-500">Superintendent: </dt>
              <dd className="inline text-ink-700">{data.superintendent}</dd>
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

      <p className="eyebrow">
        Source: Ohio Department of Education and Workforce · 2024–2025 Report Card
      </p>
    </div>
  );
}
