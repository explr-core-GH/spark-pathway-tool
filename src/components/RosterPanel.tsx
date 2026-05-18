import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { parseRosterText, stringifyRoster, type RosterStudent, type RosterUnitType } from "@/lib/rosters";

type Props = { unitType: RosterUnitType; unitSlug: string };

export function RosterPanel({ unitType, unitSlug }: Props) {
  const [text, setText] = useState("");
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("unit_rosters")
      .select("students, updated_at")
      .eq("unit_type", unitType)
      .eq("unit_slug", unitSlug)
      .maybeSingle()
      .then(({ data }) => {
        const list = (data?.students as RosterStudent[] | undefined) ?? [];
        setStudents(list);
        setText(stringifyRoster(list));
        setUpdatedAt((data?.updated_at as string | undefined) ?? null);
      });
  }, [unitType, unitSlug]);

  async function save(parsed: RosterStudent[]) {
    setSaving(true);
    setStatus(null);
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase.from("unit_rosters").upsert({
      unit_type: unitType,
      unit_slug: unitSlug,
      students: parsed,
      updated_by: userRes.user?.id ?? null,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) setStatus(`Error: ${error.message}`);
    else {
      setStatus(`Saved ${parsed.length} student${parsed.length === 1 ? "" : "s"}.`);
      setStudents(parsed);
      setUpdatedAt(new Date().toISOString());
    }
  }

  function handleSave() {
    const parsed = parseRosterText(text);
    void save(parsed);
  }

  async function handleCsv(file: File) {
    const csv = await file.text();
    setText(csv);
    void save(parseRosterText(csv));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-medium uppercase tracking-wider text-charcoal-500">
          Roster · {students.length} students
        </h3>
        {updatedAt && (
          <span className="text-xs text-charcoal-400">
            Updated {new Date(updatedAt).toLocaleDateString()}
          </span>
        )}
      </div>
      <p className="text-xs text-charcoal-400">
        One student per line. Optional fields after the name, comma-separated: grade (1–12), email, notes.
      </p>
      <textarea
        className="field min-h-[200px] font-mono text-sm"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Casey Chen, 9, casey@example.org, returning"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-ink" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save roster"}
        </button>
        <label className="btn-ghost cursor-pointer">
          Upload CSV
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleCsv(f);
            }}
          />
        </label>
        {status && <span className="text-xs text-charcoal-500">{status}</span>}
      </div>
    </div>
  );
}
