import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * GroupFilesPanel — list / upload / delete files under one prefix of the
 * public `curriculum` Storage bucket. Used for class materials
 * (prefix `class/<classId>`); the bucket is public-read with admin-only
 * write, so no primary-deck bookkeeping like the camp curriculum panel.
 */

const BUCKET = "curriculum";
const ACCEPT = ".pptx,.ppt,.docx,.doc,.pdf,.xlsx,.xls,.jpg,.jpeg,.png,.zip";

type StorageFile = { name: string; size: number };

export function GroupFilesPanel({ prefix }: { prefix: string }) {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: 200, sortBy: { column: "name", order: "asc" } });
    setLoading(false);
    if (error) {
      setErr(error.message);
      setFiles([]);
      return;
    }
    setFiles(
      (data ?? [])
        .filter((d) => d.name && !d.name.endsWith("/"))
        .map((d) => ({ name: d.name, size: d.metadata?.size ?? 0 })),
    );
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefix]);

  async function uploadAll(picked: FileList | File[]) {
    const list = Array.from(picked);
    if (list.length === 0) return;
    setUploading({ done: 0, total: list.length });
    setErr(null);
    let firstError: string | null = null;
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(`${prefix}/${f.name}`, f, { contentType: f.type || undefined, upsert: true });
      if (error && !firstError) firstError = `${f.name}: ${error.message}`;
      setUploading({ done: i + 1, total: list.length });
    }
    setUploading(null);
    if (firstError) setErr(firstError);
    await refresh();
  }

  async function removeOne(name: string) {
    if (!confirm(`Delete "${name}" from this class?`)) return;
    const { error } = await supabase.storage.from(BUCKET).remove([`${prefix}/${name}`]);
    if (error) {
      setErr(error.message);
      return;
    }
    await refresh();
  }

  function publicUrl(name: string): string {
    return supabase.storage.from(BUCKET).getPublicUrl(`${prefix}/${name}`).data.publicUrl;
  }

  return (
    <div className="max-w-2xl border border-charcoal-100 bg-charcoal-50 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="eyebrow" style={{ margin: 0 }}>Class materials</p>
        <button onClick={refresh} className="text-xs text-charcoal-500 hover:text-ink">
          ↻ Refresh
        </button>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) uploadAll(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className="mt-3 cursor-pointer border-2 border-dashed bg-white px-4 py-6 text-center text-sm transition-colors"
        style={{
          borderColor: dragOver ? "var(--ink)" : "var(--color-charcoal-200)",
          color: dragOver ? "var(--ink)" : "var(--color-charcoal-500)",
        }}
      >
        {uploading ? (
          <span className="text-ink">
            Uploading {uploading.done} / {uploading.total}…
          </span>
        ) : (
          <>
            <span className="block">Drop files here or click to choose</span>
            <span className="mt-1 block text-[11px] text-charcoal-400">
              .pptx · .pdf · .docx · .xlsx · .jpg · .png · .zip
            </span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) uploadAll(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {err && <p className="mt-3 text-xs text-red-600">{err}</p>}

      <div className="mt-4">
        {loading ? (
          <p className="text-xs text-charcoal-400">Loading…</p>
        ) : files.length === 0 ? (
          <p className="text-xs text-charcoal-500">No files uploaded for this class yet.</p>
        ) : (
          <ul className="divide-y divide-charcoal-100 border-y border-charcoal-100">
            {files.map((f) => (
              <li key={f.name} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <a
                    href={publicUrl(f.name)}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-sm text-explr-600 hover:underline"
                  >
                    {f.name}
                  </a>
                  <p className="text-[11px] text-charcoal-400">
                    {Math.max(1, Math.round(f.size / 1024))} KB
                  </p>
                </div>
                <button
                  onClick={() => removeOne(f.name)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
