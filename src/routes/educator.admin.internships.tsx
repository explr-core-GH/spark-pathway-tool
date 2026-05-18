import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RIASEC_ORDER, type RIASECCode } from "@/lib/riasec";

export const Route = createFileRoute("/educator/admin/internships")({
  head: () => ({ meta: [{ title: "Internships — Admin" }] }),
  component: InternshipsAdmin,
});

type Row = {
  slug: string;
  name: string;
  emoji: string;
  theme: string;
  lead: string | null;
  outside_partners: string;
  deliverables: string;
  external_url: string;
  riasec: string[];
  visible: boolean;
  sort_order: number;
};

const EMPTY: Row = {
  slug: "", name: "", emoji: "💼", theme: "", lead: "",
  outside_partners: "", deliverables: "", external_url: "",
  riasec: [], visible: true, sort_order: 0,
};

function InternshipsAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("internships")
      .select("*")
      .order("sort_order")
      .order("name");
    setRows((data ?? []) as Row[]);
  }
  useEffect(() => { load(); }, []);

  async function save(row: Row, isNew: boolean) {
    setSaving(true);
    const payload = { ...row, lead: row.lead?.trim() || null };
    const { error } = isNew
      ? await supabase.from("internships").insert(payload)
      : await supabase.from("internships").update(payload).eq("slug", row.slug);
    setSaving(false);
    if (error) { alert(error.message); return; }
    setEditing(null); setCreating(false);
    await load();
  }

  async function remove(slug: string) {
    if (!confirm(`Delete internship "${slug}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("internships").delete().eq("slug", slug);
    if (error) { alert(error.message); return; }
    await load();
  }

  async function toggleVisible(r: Row) {
    await supabase.from("internships").update({ visible: !r.visible }).eq("slug", r.slug);
    await load();
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="display mt-2">Internships</h1>
        </div>
        <button onClick={() => { setCreating(true); setEditing({ ...EMPTY }); }} className="btn-ink">
          + New internship
        </button>
      </div>

      <ul className="mt-10 divide-y divide-charcoal-100 border-y border-charcoal-100">
        {rows.map((r) => (
          <li key={r.slug} className="flex items-center gap-4 py-3">
            <span className="text-2xl" aria-hidden>{r.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{r.name}</p>
              <p className="text-xs text-charcoal-500 truncate">
                {r.theme} · {r.slug}{r.lead ? ` · ${r.lead}` : ""}
                {r.riasec.length > 0 ? ` · ${r.riasec.join("")}` : ""}
              </p>
            </div>
            <button onClick={() => toggleVisible(r)}
              className="text-xs px-2 py-1 border"
              style={{ borderColor: r.visible ? "var(--color-explr-500)" : "var(--color-charcoal-200)",
                       color: r.visible ? "var(--color-explr-600)" : "var(--color-charcoal-500)" }}>
              {r.visible ? "Visible" : "Hidden"}
            </button>
            <Link to="/educator/admin/assign" search={{ mode: "internship", slug: r.slug }} className="text-xs text-explr-600 hover:underline">Assign educators</Link>
            <button onClick={() => { setCreating(false); setEditing({ ...r }); }} className="text-xs text-charcoal-500 hover:text-ink">Edit</button>
            <button onClick={() => remove(r.slug)} className="text-xs text-red-600 hover:underline">Delete</button>
          </li>
        ))}
        {rows.length === 0 && <li className="py-6 text-sm text-charcoal-500">No internships yet.</li>}
      </ul>

      {editing && (
        <EditModal
          row={editing}
          isNew={creating}
          saving={saving}
          onCancel={() => { setEditing(null); setCreating(false); }}
          onChange={setEditing}
          onSave={() => save(editing, creating)}
        />
      )}
    </main>
  );
}

function EditModal({
  row, isNew, saving, onCancel, onChange, onSave,
}: {
  row: Row; isNew: boolean; saving: boolean;
  onCancel: () => void; onChange: (r: Row) => void; onSave: () => void;
}) {
  function toggleRiasec(c: RIASECCode) {
    const has = row.riasec.includes(c);
    onChange({ ...row, riasec: has ? row.riasec.filter((x) => x !== c) : [...row.riasec, c] });
  }
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-6">
      <div className="w-full max-w-2xl border bg-white p-8">
        <h2 className="text-xl font-medium">{isNew ? "New internship" : `Edit · ${row.slug}`}</h2>
        <div className="mt-6 grid gap-4">
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <Field label="Slug"><input className="field" value={row.slug} disabled={!isNew}
              onChange={(e) => onChange({ ...row, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} /></Field>
            <Field label="Emoji"><input className="field w-20 text-center" value={row.emoji}
              onChange={(e) => onChange({ ...row, emoji: e.target.value })} /></Field>
          </div>
          <Field label="Name"><input className="field" value={row.name} onChange={(e) => onChange({ ...row, name: e.target.value })} /></Field>
          <Field label="Theme"><input className="field" value={row.theme} onChange={(e) => onChange({ ...row, theme: e.target.value })} /></Field>
          <Field label="Lead"><input className="field" value={row.lead ?? ""} onChange={(e) => onChange({ ...row, lead: e.target.value })} placeholder="TBD" /></Field>
          <Field label="External URL"><input className="field" value={row.external_url} onChange={(e) => onChange({ ...row, external_url: e.target.value })} /></Field>
          <Field label="Outside partners"><textarea className="field" rows={2} value={row.outside_partners} onChange={(e) => onChange({ ...row, outside_partners: e.target.value })} /></Field>
          <Field label="Deliverables"><textarea className="field" rows={2} value={row.deliverables} onChange={(e) => onChange({ ...row, deliverables: e.target.value })} /></Field>
          <Field label="RIASEC tags (dominant 1–3)">
            <div className="flex gap-2">
              {RIASEC_ORDER.map((c) => (
                <button key={c} type="button" onClick={() => toggleRiasec(c)}
                  className="rounded-full border px-3 py-1 text-xs"
                  style={{
                    borderColor: row.riasec.includes(c) ? "var(--ink)" : "var(--color-charcoal-200)",
                    background: row.riasec.includes(c) ? "var(--ink)" : "white",
                    color: row.riasec.includes(c) ? "white" : "var(--color-charcoal-500)",
                  }}>{c}</button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sort order"><input className="field" type="number" value={row.sort_order} onChange={(e) => onChange({ ...row, sort_order: Number(e.target.value) || 0 })} /></Field>
            <Field label="Visible to students">
              <label className="flex items-center gap-2 pt-2">
                <input type="checkbox" checked={row.visible} onChange={(e) => onChange({ ...row, visible: e.target.checked })} />
                <span className="text-sm">{row.visible ? "Visible" : "Hidden"}</span>
              </label>
            </Field>
          </div>
        </div>
        <div className="mt-8 flex justify-end gap-3">
          <button onClick={onCancel} className="btn-ghost">Cancel</button>
          <button onClick={onSave} disabled={saving || !row.slug || !row.name} className="btn-ink">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
