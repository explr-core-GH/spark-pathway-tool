import { useEffect, useState } from "react";

// TODO: the Ohio Dept of Ed directory will be uploaded to Supabase Storage and
// served at /ohio/directory.json. Until then this is a placeholder that
// gracefully no-ops when the JSON is missing.

type School = { irn: string; name: string; district?: string; city?: string };

type Props = {
  value: { irn: string; name: string } | null;
  onChange: (v: { irn: string; name: string } | null) => void;
};

export function SchoolSearch({ value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<School[]>([]);
  const [allSchools, setAllSchools] = useState<School[] | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetch("/ohio/directory.json")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setAllSchools(data as School[]))
      .catch(() => setMissing(true));
  }, []);

  useEffect(() => {
    if (!allSchools || !query.trim()) {
      setResults([]);
      return;
    }
    const q = query.toLowerCase();
    setResults(
      allSchools
        .filter((s) => s.name.toLowerCase().includes(q) || s.irn.includes(q))
        .slice(0, 8),
    );
  }, [query, allSchools]);

  if (value) {
    return (
      <div className="flex items-center justify-between border border-charcoal-200 bg-white px-3 py-2">
        <div>
          <div className="text-sm font-medium">{value.name}</div>
          <div className="text-xs text-charcoal-400">IRN {value.irn}</div>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs uppercase tracking-wider text-charcoal-400 hover:text-ink"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        type="text"
        className="field"
        placeholder={missing ? "School directory not yet loaded" : "Search Ohio schools by name or IRN…"}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={missing}
      />
      {missing && (
        <p className="text-xs text-charcoal-400">
          The Ohio school directory will be available once it's uploaded to storage.
        </p>
      )}
      {results.length > 0 && (
        <ul className="border border-charcoal-100 bg-white">
          {results.map((s) => (
            <li key={s.irn}>
              <button
                type="button"
                onClick={() => {
                  onChange({ irn: s.irn, name: s.name });
                  setQuery("");
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-charcoal-50"
              >
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-charcoal-400">
                  IRN {s.irn}
                  {s.district ? ` · ${s.district}` : ""}
                  {s.city ? ` · ${s.city}` : ""}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
