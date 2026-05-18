import { useEffect, useState } from "react";

// TODO: per-building JSON files will be uploaded to Supabase Storage at
// /ohio/buildings/<irn>.json. This is a stub that surfaces the IRN +
// renders a "data coming soon" placeholder if the JSON is absent.

type Props = { irn: string };

export function SchoolDemographics({ irn }: Props) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetch(`/ohio/buildings/${irn}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setData(d))
      .catch(() => setMissing(true));
  }, [irn]);

  if (missing) {
    return (
      <div className="border border-dashed border-charcoal-200 bg-charcoal-50 px-4 py-3 text-sm text-charcoal-500">
        Demographics for IRN {irn} aren't loaded yet.
      </div>
    );
  }
  if (!data) return <div className="text-sm text-charcoal-400">Loading demographics…</div>;
  return (
    <pre className="overflow-x-auto border border-charcoal-100 bg-white p-3 text-xs">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
