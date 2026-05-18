import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";

export const Route = createFileRoute("/educator/admin/assign")({
  head: () => ({ meta: [{ title: "Assign camps & internships — Admin" }] }),
  component: AssignAdmin,
});

type Educator = { id: string; full_name: string; email: string };
type Camp = { slug: string; name: string; emoji: string };
type Internship = { slug: string; name: string; emoji: string };
type CampAssign = { camp_slug: string; educator_id: string };
type IntAssign = { internship_slug: string; educator_id: string };

type Mode = "camp" | "internship";

function AssignAdmin() {
  const { user } = useSession();
  const [mode, setMode] = useState<Mode>("camp");
  const [educators, setEducators] = useState<Educator[]>([]);
  const [camps, setCamps] = useState<Camp[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [campAssigns, setCampAssigns] = useState<CampAssign[]>([]);
  const [intAssigns, setIntAssigns] = useState<IntAssign[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  async function load() {
    const [{ data: educs }, { data: cs }, { data: is }, { data: ca }, { data: ia }] = await Promise.all([
      supabase.from("educators").select("id, full_name, email").eq("approved", true).order("full_name"),
      supabase.from("camps").select("slug,name,emoji").order("sort_order").order("name"),
      supabase.from("internships").select("slug,name,emoji").order("sort_order").order("name"),
      supabase.from("camp_educators").select("camp_slug, educator_id"),
      supabase.from("internship_educators").select("internship_slug, educator_id"),
    ]);
    setEducators((educs ?? []) as Educator[]);
    setCamps((cs ?? []) as Camp[]);
    setInternships((is ?? []) as Internship[]);
    setCampAssigns((ca ?? []) as CampAssign[]);
    setIntAssigns((ia ?? []) as IntAssign[]);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => { setSelected(null); }, [mode]);

  const items = mode === "camp" ? camps : internships;
  const selectedItem = items.find((i) => i.slug === selected) ?? null;

  const assignedSet = useMemo(() => {
    if (!selected) return new Set<string>();
    if (mode === "camp") {
      return new Set(campAssigns.filter((a) => a.camp_slug === selected).map((a) => a.educator_id));
    }
    return new Set(intAssigns.filter((a) => a.internship_slug === selected).map((a) => a.educator_id));
  }, [selected, mode, campAssigns, intAssigns]);

  function countFor(slug: string) {
    return mode === "camp"
      ? campAssigns.filter((a) => a.camp_slug === slug).length
      : intAssigns.filter((a) => a.internship_slug === slug).length;
  }

  async function toggle(educatorId: string) {
    if (!selected) return;
    const has = assignedSet.has(educatorId);
    if (mode === "camp") {
      if (has) {
        await supabase.from("camp_educators").delete()
          .eq("camp_slug", selected).eq("educator_id", educatorId);
      } else {
        await supabase.from("camp_educators").insert({
          camp_slug: selected, educator_id: educatorId, assigned_by: user?.id ?? null,
        });
      }
    } else {
      if (has) {
        await supabase.from("internship_educators").delete()
          .eq("internship_slug", selected).eq("educator_id", educatorId);
      } else {
        await supabase.from("internship_educators").insert({
          internship_slug: selected, educator_id: educatorId, assigned_by: user?.id ?? null,
        });
      }
    }
    await load();
  }

  const filteredEducators = educators.filter((e) => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return e.full_name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q);
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <p className="eyebrow">Admin</p>
      <h1 className="display mt-2">Assign camps & internships</h1>
      <p className="lead mt-3">Pick a {mode}, then check the educators who should be assigned to it.</p>

      <div className="mt-8 inline-flex border border-charcoal-100">
        {(["camp", "internship"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="px-4 py-2 text-sm"
            style={{
              background: mode === m ? "var(--ink)" : "white",
              color: mode === m ? "white" : "var(--color-charcoal-500)",
            }}
          >
            {m === "camp" ? "Camps" : "Internships"}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_1fr]">
        <div>
          <h2 className="eyebrow">{mode === "camp" ? "Camps" : "Internships"}</h2>
          <ul className="mt-4 divide-y divide-charcoal-100 border-y border-charcoal-100">
            {items.map((i) => {
              const count = countFor(i.slug);
              const active = selected === i.slug;
              return (
                <li key={i.slug}>
                  <button onClick={() => setSelected(i.slug)} className="flex w-full items-center gap-3 py-3 text-left">
                    <span className="text-2xl" aria-hidden>{i.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" style={{ color: active ? "var(--ink)" : "inherit" }}>{i.name}</p>
                      <p className="text-xs text-charcoal-500 truncate">
                        {i.slug} · {count} educator{count === 1 ? "" : "s"}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
            {items.length === 0 && <li className="py-6 text-sm text-charcoal-500">None yet.</li>}
          </ul>
        </div>

        <div>
          <h2 className="eyebrow">
            {selectedItem ? `Educators · ${selectedItem.name}` : `Pick a ${mode}`}
          </h2>
          {selectedItem ? (
            <>
              <input
                className="field mt-4"
                placeholder="Filter educators by name or email…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <ul className="mt-4 divide-y divide-charcoal-100 border-y border-charcoal-100">
                {filteredEducators.map((e) => {
                  const checked = assignedSet.has(e.id);
                  return (
                    <li key={e.id} className="flex items-center gap-3 py-3">
                      <input type="checkbox" checked={checked} onChange={() => toggle(e.id)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{e.full_name}</p>
                        <p className="text-xs text-charcoal-500 truncate">{e.email}</p>
                      </div>
                    </li>
                  );
                })}
                {filteredEducators.length === 0 && (
                  <li className="py-6 text-sm text-charcoal-500">
                    {educators.length === 0 ? "No approved educators yet." : "No matches."}
                  </li>
                )}
              </ul>
            </>
          ) : (
            <p className="mt-4 text-sm text-charcoal-500">Select an item to manage its educators.</p>
          )}
        </div>
      </div>
    </main>
  );
}
