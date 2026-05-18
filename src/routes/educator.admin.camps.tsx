import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/educator/admin/camps")({
  head: () => ({ meta: [{ title: "Camps — Admin" }] }),
  component: CampsAdmin,
});

type Row = {
  slug: string;
  name: string;
  emoji: string;
  tagline: string;
  duration: string;
  age_range: string;
  overview: string;
  slides: string | null;
  visible: boolean;
  sort_order: number;
};

const EMPTY: Row = {
  slug: "", name: "", emoji: "🎒", tagline: "", duration: "",
  age_range: "", overview: "", slides: null, visible: true, sort_order: 0,
};

function CampsAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("camps")
      .select("slug,name,emoji,tagline,duration,age_range,overview,slides,visible,sort_order")
      .order("sort_order")
      .order("name");
    setRows((data ?? []) as Row[]);
  }
  useEffect(() => { load(); }, []);

  async function save(row: Row, isNew: boolean) {
    setSaving(true);
    const payload = { ...row, slides: row.slides?.trim() || null };
    const { error } = isNew
      ? await supabase.from("camps").insert(payload)
      : await supabase.from("camps").update(payload).eq("slug", row.slug);
    setSaving(false);
    if (error) { alert(error.message); return; }
    setEditing(null); setCreating(false);
    await load();
  }

  async function remove(slug: string) {
    if (!confirm(`Delete camp "${slug}"?`)) return;
    const { error } = await supabase.from("camps").delete().eq("slug", slug);
    if (error) { alert(error.message); return; }
    await load();
  }

  async function toggleVisible(r: Row) {
    await supabase.from("camps").update({ visible: !r.visible }).eq("slug", r.slug);
    await load();
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="display mt-2">Camps & curriculum</h1>
        </div>
        <button onClick={() => { setCreating(true); setEditing({ ...EMPTY }); }} className="btn-ink">
          + New camp
        </button>
      </div>

      <ul className="mt-10 divide-y divide-charcoal-100 border-y border-charcoal-100">
        {rows.map((r) => (
          <li key={r.slug} className="flex items-center gap-4 py-3">
            <span className="text-2xl" aria-hidden>{r.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{r.name}</p>
              <p className="text-xs text-charcoal-500 truncate">
                {r.duration} · {r.age_range} · {r.slug}
              </p>
            </div>
            <button onClick={() => toggleVisible(r)}
              className="text-xs px-2 py-1 border"
              style={{ borderColor: r.visible ? "var(--color-explr-500)" : "var(--color-charcoal-200)",
                       color: r.visible ? "var(--color-explr-600)" : "var(--color-charcoal-500)" }}>
              {r.visible ? "Visible" : "Hidden"}
            </button>
            <button onClick={() => { setCreating(false); setEditing({ ...r }); }} className="text-xs text-charcoal-500 hover:text-ink">Edit</button>
            <button onClick={() => remove(r.slug)} className="text-xs text-red-600 hover:underline">Delete</button>
          </li>
        ))}
        {rows.length === 0 && <li className="py-6 text-sm text-charcoal-500">No camps yet.</li>}
      </ul>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-6">
          <div className="w-full max-w-2xl border bg-white p-8">
            <h2 className="text-xl font-medium">{creating ? "New camp" : `Edit · ${editing.slug}`}</h2>
            <div className="mt-6 grid gap-4">
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div>
                  <label className="label">Slug</label>
                  <input className="field mt-1" value={editing.slug} disabled={!creating}
                    onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} />
                </div>
                <div>
                  <label className="label">Emoji</label>
                  <input className="field mt-1 w-20 text-center" value={editing.emoji}
                    onChange={(e) => setEditing({ ...editing, emoji: e.target.value })} />
                </div>
              </div>
              <Labeled label="Name"><input className="field" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Labeled>
              <Labeled label="Tagline"><input className="field" value={editing.tagline} onChange={(e) => setEditing({ ...editing, tagline: e.target.value })} /></Labeled>
              <div className="grid grid-cols-2 gap-3">
                <Labeled label="Duration"><input className="field" value={editing.duration} onChange={(e) => setEditing({ ...editing, duration: e.target.value })} placeholder="5 days" /></Labeled>
                <Labeled label="Age range"><input className="field" value={editing.age_range} onChange={(e) => setEditing({ ...editing, age_range: e.target.value })} placeholder="Middle school" /></Labeled>
              </div>
              <Labeled label="Overview"><textarea className="field" rows={4} value={editing.overview} onChange={(e) => setEditing({ ...editing, overview: e.target.value })} /></Labeled>
              <Labeled label="Slide deck filename (optional)"><input className="field" value={editing.slides ?? ""} onChange={(e) => setEditing({ ...editing, slides: e.target.value })} placeholder="MyCamp_Slides.pptx" /></Labeled>
              <div className="grid grid-cols-2 gap-3">
                <Labeled label="Sort order"><input className="field" type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) || 0 })} /></Labeled>
                <Labeled label="Visible">
                  <label className="flex items-center gap-2 pt-2">
                    <input type="checkbox" checked={editing.visible} onChange={(e) => setEditing({ ...editing, visible: e.target.checked })} />
                    <span className="text-sm">{editing.visible ? "Visible" : "Hidden"}</span>
                  </label>
                </Labeled>
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => { setEditing(null); setCreating(false); }} className="btn-ghost">Cancel</button>
              <button onClick={() => save(editing, creating)} disabled={saving || !editing.slug || !editing.name} className="btn-ink">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="label">{label}</label><div className="mt-1">{children}</div></div>;
}
