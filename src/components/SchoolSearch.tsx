import { useEffect, useRef, useState } from "react";

export type SchoolPick = {
  irn: string;
  name: string;
  districtName?: string;
  city?: string;
};

type School = {
  irn: string;
  name: string;
  districtName?: string;
  districtIrn?: string;
  county?: string;
  region?: string;
  city?: string;
  gradeSpan?: string;
  buildingType?: string;
  enrollment?: number;
  overallStars?: number | null;
};

type Props = {
  onSelect: (s: SchoolPick) => void;
  initial?: SchoolPick | null;
  placeholder?: string;
};

let directoryCache: School[] | null = null;
let directoryPromise: Promise<School[]> | null = null;

async function loadDirectory(): Promise<School[]> {
  if (directoryCache) return directoryCache;
  if (!directoryPromise) {
    directoryPromise = fetch("/ohio/directory.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("not found"))))
      .then((d: { buildings: School[] } | School[]) => {
        const arr = Array.isArray(d) ? d : d.buildings;
        directoryCache = arr;
        return arr;
      });
  }
  return directoryPromise;
}

export function SchoolSearch({ onSelect, initial = null, placeholder }: Props) {
  const [picked, setPicked] = useState<SchoolPick | null>(initial);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<School[]>([]);
  const [missing, setMissing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const loadedRef = useRef(false);

  async function ensureLoaded() {
    if (loadedRef.current) return;
    loadedRef.current = true;
    try {
      await loadDirectory();
      setLoaded(true);
    } catch {
      setMissing(true);
    }
  }

  useEffect(() => {
    if (!query.trim() || !directoryCache) {
      setResults([]);
      return;
    }
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const scored: Array<{ s: School; score: number }> = [];
    for (const s of directoryCache) {
      const name = (s.name ?? "").toLowerCase();
      const hay = [
        name,
        (s.districtName ?? "").toLowerCase(),
        (s.city ?? "").toLowerCase(),
        (s.county ?? "").toLowerCase(),
        s.irn ?? "",
      ].join(" ");
      if (!tokens.every((t) => hay.includes(t))) continue;
      let score = 0;
      if (name.startsWith(tokens[0])) score += 1000;
      scored.push({ s, score: score + (s.enrollment ?? 0) / 1e6 });
    }
    scored.sort((a, b) => b.score - a.score || (b.s.enrollment ?? 0) - (a.s.enrollment ?? 0));
    setResults(scored.slice(0, 10).map((x) => x.s));
  }, [query, loaded]);

  function pick(s: School) {
    const p: SchoolPick = { irn: s.irn, name: s.name, districtName: s.districtName, city: s.city };
    setPicked(p);
    setQuery("");
    setOpen(false);
    onSelect(p);
  }

  function clear() {
    setPicked(null);
    onSelect({ irn: "", name: "" });
  }

  if (picked && picked.irn) {
    return (
      <div className="flex items-center justify-between rounded-md border border-explr-700/40 bg-explr-50 px-3 py-2">
        <div className="text-sm text-charcoal-700">
          <span className="font-medium">{picked.name}</span>
          {picked.districtName && <span className="text-charcoal-500"> · {picked.districtName}</span>}
          {picked.city && <span className="text-charcoal-500"> · {picked.city}</span>}
          <span className="ml-2 font-mono text-[10px] text-charcoal-400">IRN {picked.irn}</span>
        </div>
        <button
          type="button"
          onClick={clear}
          className="text-xs uppercase tracking-wider text-explr-700 hover:text-explr-800"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative space-y-2">
      <input
        type="text"
        className="field"
        placeholder={
          missing
            ? "School directory not yet loaded"
            : placeholder ?? "Search Ohio schools by name, district, city, or IRN…"
        }
        value={query}
        onFocus={() => {
          ensureLoaded();
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => setQuery(e.target.value)}
        disabled={missing}
      />
      {missing && (
        <p className="text-xs text-charcoal-400">
          The Ohio school directory is not available right now.
        </p>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-20 max-h-96 w-full overflow-y-auto rounded-md border border-charcoal-100 bg-white shadow-lg">
          {results.map((s) => (
            <li key={s.irn} className="border-b border-charcoal-100 last:border-0">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
                className="block w-full px-3 py-2 text-left hover:bg-explr-50"
              >
                <div className="font-semibold text-charcoal-700">{s.name}</div>
                <div className="text-xs text-charcoal-500">
                  {[s.districtName, s.city, s.gradeSpan, s.buildingType].filter(Boolean).join(" · ")}
                </div>
                <div className="font-mono text-[10px] text-charcoal-400">
                  Enrollment {s.enrollment ?? "—"} ·{" "}
                  {s.overallStars != null ? `${s.overallStars.toFixed(1)}★ overall` : "no rating"} · IRN {s.irn}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
