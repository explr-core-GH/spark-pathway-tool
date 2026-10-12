import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GroupKind } from "@/lib/admin-groups";

/**
 * GroupEducatorsPanel — connect educators to a group, in place.
 *
 *   camps        → explr_camp_educators (many educators per camp)
 *   classes      → classes.educator_id   (one teacher)
 *
 * Connecting an instructor is what lets them see the group's roster and
 * results, so this lives right next to the roster.
 */

const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);

type Educator = { id: string; full_name: string | null };

export function GroupEducatorsPanel({ kind, id }: { kind: GroupKind; id: string }) {
  const [educators, setEducators] = useState<Educator[]>([]);
  const [assigned, setAssigned] = useState<string[]>([]);
  const [classEdu, setClassEdu] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [pick, setPick] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: eds } = await supabase
      .from("educators")
      .select("id, full_name")
      .eq("approved", true)
      .order("full_name");
    setEducators((eds as Educator[]) ?? []);

    if (kind === "camps") {
      const { data } = await supabase
        .from("explr_camp_educators")
        .select("educator_id")
        .eq("explr_camp_id", id);
      setAssigned(((data ?? []) as Array<{ educator_id: string }>).map((r) => r.educator_id));
    } else {
      const { data } = await sb("classes").select("educator_id").eq("id", id).maybeSingle();
      setClassEdu((data?.educator_id as string) ?? "");
    }
    setLoading(false);
  }, [kind, id]);

  useEffect(() => {
    load();
  }, [load]);

  const nameOf = useMemo(() => {
    const m = new Map(educators.map((e) => [e.id, e.full_name ?? "(instructor)"]));
    return (eid: string) => m.get(eid) ?? "(instructor)";
  }, [educators]);

  async function add(eduId: string) {
    if (!eduId) return;
    const res = await supabase
      .from("explr_camp_educators")
      .insert({ explr_camp_id: id, educator_id: eduId });
    if (res.error) {
      alert(res.error.message);
      return;
    }
    setPick("");
    load();
  }

  async function remove(eduId: string) {
    const res = await supabase
      .from("explr_camp_educators")
      .delete()
      .eq("explr_camp_id", id)
      .eq("educator_id", eduId);
    if (res.error) {
      alert(res.error.message);
      return;
    }
    load();
  }

  async function setTeacher(eduId: string) {
    const { error } = await sb("classes")
      .update({ educator_id: eduId || null })
      .eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    setClassEdu(eduId);
  }

  if (loading) return <p className="text-sm text-ink-500">Loading instructors…</p>;

  if (kind === "classes") {
    return (
      <div className="max-w-md">
        <label className="label">Teacher for this class</label>
        <select
          className="field mt-1"
          value={classEdu}
          onChange={(e) => setTeacher(e.target.value)}
        >
          <option value="">— Unassigned —</option>
          {educators.map((e) => (
            <option key={e.id} value={e.id}>
              {e.full_name ?? "(instructor)"}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-ink-500">
          The teacher can see this class&apos;s roster, results, checkpoints, and experiences.
        </p>
      </div>
    );
  }

  const available = educators.filter((e) => !assigned.includes(e.id));

  return (
    <div className="max-w-xl">
      <p className="text-sm text-ink-700">Instructors connected to this camp session.</p>
      {assigned.length === 0 ? (
        <p className="mt-3 text-sm text-ink-500">No instructors connected yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {assigned.map((eid) => (
            <li key={eid} className="flex items-center justify-between py-2.5 text-sm">
              <span>{nameOf(eid)}</span>
              <button onClick={() => remove(eid)} className="text-xs text-red-600 hover:underline">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex items-center gap-2">
        <select className="field max-w-xs" value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">— Add an instructor —</option>
          {available.map((e) => (
            <option key={e.id} value={e.id}>
              {e.full_name ?? "(instructor)"}
            </option>
          ))}
        </select>
        <button className="btn-ink text-sm" disabled={!pick} onClick={() => add(pick)}>
          Connect
        </button>
      </div>
    </div>
  );
}
