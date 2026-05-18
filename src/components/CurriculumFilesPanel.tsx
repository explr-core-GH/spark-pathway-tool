import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * CurriculumFilesPanel — lists + uploads slide decks and resources for one
 * camp. Lives inside the camp Edit modal (educator.admin.camps).
 *
 * Files land in Supabase Storage at curriculum/<slug>/<filename>. The bucket
 * is public-read (so the Office Online Viewer can fetch URLs from outside
 * the app), and policies restrict insert/update/delete to is_admin(auth.uid()).
 * That means we don't pass a service-role key — the admin's existing session
 * is enough.
 *
 * Marking a file as the primary deck writes its filename to camps.slides;
 * the SlideViewer reads that for camps without per-day breakdowns. Camps
 * with day-by-day decks (BoxCraft, FashionForge, etc.) ignore camps.slides
 * and look up per-day filenames from the static seed catalog instead.
 */

const BUCKET = "curriculum";

type Props = {
  slug: string;
  primaryDeck: string | null;
  onPrimaryChange: (filename: string | null) => void;
};

type StorageFile = { name: string; size: number };

const ACCEPT = ".pptx,.ppt,.docx,.doc,.pdf,.xlsx,.xls,.jpg,.jpeg,.png,.zip";

export function CurriculumFilesPanel({ slug, primaryDeck, onPrimaryChange }: Props) {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [dragOver, setDragOver] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(slug, { limit: 200, sortBy: { column: "name", order: "asc" } });
    setLoading(false);
    if (error) {
      // Most common error here: bucket doesn't exist yet (migration not
      // applied). Show the message so the admin can act on it.
      setErr(`${error.message}. If this says "bucket not found", run the curriculum_storage migration in Supabase first.`);
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
  }, [slug]);

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
        .upload(`${slug}/${f.name}`, f, {
          contentType: f.type || undefined,
          upsert: true,
        });
      if (error && !firstError) firstError = `${f.name}: ${error.message}`;
      setUploading({ done: i + 1, total: list.length });
    }
    setUploading(null);
    if (firstError) setErr(firstError);
    await refresh();
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) uploadAll(e.dataTransfer.files);
  }

  async function removeOne(name: string) {
    if (!confirm(`Delete "${name}" from this camp?`)) return;
    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([`${slug}/${name}`]);
    if (error) {
      setErr(error.message);
      return;
    }
    if (primaryDeck === name) {
      // Drop the primary pointer if we just deleted the primary deck.
      onPrimaryChange(null);
    }
    await refresh();
  }

  async function setPrimary(name: string) {
    // Persist immediately so the next viewer load picks it up. Also notify
    // the parent so the unsaved-form state stays consistent.
    const { error } = await supabase
      .from("camps")
      .update({ slides: name })
      .eq("slug", slug);
    if (error) {
      setErr(error.message);
      return;
    }
    onPrimaryChange(name);
  }

  async function clearPrimary() {
    const { error } = await supabase
      .from("camps")
      .update({ slides: null })
      .eq("slug", slug);
    if (error) {
      setErr(error.message);
      return;
    }
    onPrimaryChange(null);
  }

  return (
    <div className="border border-charcoal-100 bg-charcoal-50 p-4">
      <div className="flex items-baseline justify-between">
        <p className="eyebrow" style={{ margin: 0 }}>Slide decks & files</p>
        <span className="text-[11px] text-charcoal-500">
          curriculum/{slug}/
        </span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
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
            e.target.value = ""; // allow re-selecting the same file
          }}
        />
      </div>

      {err && (
        <p className="mt-3 text-xs text-red-600">{err}</p>
      )}

      {/* File list */}
      <div className="mt-4">
        {loading ? (
          <p className="text-xs text-charcoal-400">Loading…</p>
        ) : files.length === 0 ? (
          <p className="text-xs text-charcoal-400">No files yet for this camp.</p>
        ) : (
          <ul className="divide-y divide-charcoal-100 border-y border-charcoal-100">
            {files.map((f) => {
              const isPrimary = f.name === primaryDeck;
              const isDeck = /\.(pptx?|pdf)$/i.test(f.name);
              return (
                <li
                  key={f.name}
                  className="flex items-center gap-3 py-2"
                  style={{ background: isPrimary ? "white" : undefined }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate" style={{ color: isPrimary ? "var(--ink)" : undefined }}>
                      {isPrimary && (
                        <span
                          className="mr-2 inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                          style={{ background: "var(--ink)", color: "var(--bg)" }}
                        >
                          Primary
                        </span>
                      )}
                      {f.name}
                    </p>
                    <p className="text-[11px] text-charcoal-400">
                      {Math.max(1, Math.round(f.size / 1024))} KB
                    </p>
                  </div>
                  {isDeck && !isPrimary && (
                    <button
                      type="button"
                      onClick={() => setPrimary(f.name)}
                      className="text-xs text-explr-600 hover:underline"
                    >
                      Set as primary
                    </button>
                  )}
                  {isPrimary && (
                    <button
                      type="button"
                      onClick={clearPrimary}
                      className="text-xs text-charcoal-500 hover:text-ink"
                    >
                      Unset primary
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeOne(f.name)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
