import { useEffect, useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import {
  loadClusters,
  loadOccupations,
  loadInternshipOccupations,
  formatWage,
  formatGrowth,
  type Cluster,
  type Occupation,
  type InternshipOccupationLink,
} from "@/lib/career-pathways";

type Props = { internshipSlug: string };

export function CareerPathwaysDropdown({ internshipSlug }: Props) {
  const [open, setOpen] = useState(false);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [occs, setOccs] = useState<Occupation[]>([]);
  const [links, setLinks] = useState<InternshipOccupationLink[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    (async () => {
      const [c, o, l] = await Promise.all([
        loadClusters(),
        loadOccupations(),
        loadInternshipOccupations(),
      ]);
      if (cancelled) return;
      setClusters(c);
      setOccs(o);
      setLinks(l);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, loaded]);

  const mine = links.filter((l) => l.internship_slug === internshipSlug);
  const myOccs = mine
    .map((l) => occs.find((o) => o.id === l.occupation_id))
    .filter((o): o is Occupation => !!o);
  const clustersById = Object.fromEntries(clusters.map((c) => [c.id, c]));
  const byCluster = new Map<string, Occupation[]>();
  for (const o of myOccs) {
    const arr = byCluster.get(o.cluster_id) ?? [];
    arr.push(o);
    byCluster.set(o.cluster_id, arr);
  }

  return (
    <div className="mt-4 border-t border-line pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="eyebrow flex min-h-[44px] w-full items-center justify-between gap-2 text-left hover:text-ink-900"
        aria-expanded={open}
      >
        <span>Career pathways · {myOccs.length || "—"} occupations</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open && (
        <div className="mt-3 space-y-4">
          {!loaded ? (
            <p className="text-xs text-ink-500">Loading pathways…</p>
          ) : myOccs.length === 0 ? (
            <p className="text-xs text-ink-500">
              No occupations tagged yet. An admin can add them in{" "}
              <span className="font-mono">/instructor/admin/pathways</span>.
            </p>
          ) : (
            Array.from(byCluster.entries()).map(([clusterId, list]) => (
              <div key={clusterId}>
                <p className="eyebrow text-green">{clustersById[clusterId]?.label ?? clusterId}</p>
                <ul className="mt-2 space-y-2">
                  {list.map((o) => (
                    <li
                      key={o.id}
                      className="rounded-[var(--radius-control)] border border-line bg-paper-raised p-3 text-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-display text-sm font-semibold text-ink-900">{o.title}</p>
                        {o.soc_code && (
                          <span className="font-mono text-[10px] text-ink-500">
                            SOC {o.soc_code}
                          </span>
                        )}
                      </div>
                      {o.description && <p className="mt-1 text-ink-700">{o.description}</p>}
                      <dl className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                        <div>
                          <dt className="label mb-0">Median wage</dt>
                          <dd className="font-medium text-ink-700">{formatWage(o.median_wage)}</dd>
                        </div>
                        <div>
                          <dt className="label mb-0">Growth</dt>
                          <dd
                            className="font-medium"
                            style={{
                              color:
                                (o.growth_pct ?? 0) >= 0
                                  ? "var(--color-green-deep)"
                                  : "var(--color-ink-700)",
                            }}
                          >
                            {formatGrowth(o.growth_pct)}
                          </dd>
                        </div>
                        <div>
                          <dt className="label mb-0">Openings / yr</dt>
                          <dd className="font-medium text-ink-700">
                            {o.annual_openings?.toLocaleString() ?? "—"}
                          </dd>
                        </div>
                      </dl>
                      {o.education && (
                        <p className="mt-2 text-[11px] text-ink-500">
                          <span className="label mb-0 inline">Typical entry: </span>
                          {o.education}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
          <p className="text-[11px] text-ink-500">
            Data snapshot · explore more at{" "}
            <a
              href="https://iridescent-panda-3bd940.netlify.app/?tab=dashboard"
              target="_blank"
              rel="noreferrer"
              className="ink-link inline-flex items-center gap-1"
            >
              EXPLR Workforce <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
