import { useEffect, useRef, useState } from "react";
import { ImageUp, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { storagePath } from "@/lib/storage-paths";

/** Emoji a student can pick as their passport picture. */
export const PASSPORT_EMOJI = [
  "😀",
  "😎",
  "🤓",
  "🥳",
  "🦊",
  "🐼",
  "🦉",
  "🐢",
  "🦋",
  "🐙",
  "🚀",
  "🛰️",
  "🔬",
  "🧪",
  "🩺",
  "🧰",
  "🎨",
  "🎧",
  "🎸",
  "📚",
  "⚽",
  "🏀",
  "🌱",
  "⭐",
];

const MAX_BYTES = 5 * 1024 * 1024;

type Props = {
  studentId: string;
  /** Grades 4-8: emoji only, no photo upload. */
  explore: boolean;
  emoji: string | null;
  photoUrl: string | null;
  onClose: () => void;
  onSaved: () => void;
};

// students.avatar_emoji / photo_url are newer than the generated types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = (table: string): any => (supabase.from as unknown as (n: string) => any)(table);

const BUCKET = "student-photos";

/** Object path for a stored value (bare path, or a legacy public URL). */
const photoPathFromUrl = (v: string | null) => storagePath(BUCKET, v);

/**
 * PictureDialog — set the passport picture: pick an emoji (any grade) or
 * upload a photo (grades 9-12, with a consent note). One picture at a time:
 * choosing an emoji clears the photo and vice versa.
 */
export function PictureDialog({ studentId, explore, emoji, photoUrl, onClose, onSaved }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstRef = useRef<HTMLButtonElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  async function save(patch: { avatar_emoji: string | null; photo_url: string | null }) {
    setBusy(true);
    setError(null);
    const { error: err } = await sb("students").update(patch).eq("id", studentId);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    // Removing or replacing a photo must also delete the old object, or the
    // bucket fills with pictures nobody can see or remove. Best effort: the
    // URL is already cleared, so a failed delete only leaves an orphan.
    const old = photoPathFromUrl(photoUrl);
    if (old && patch.photo_url !== photoUrl) {
      await supabase.storage
        .from(BUCKET)
        .remove([old])
        .catch(() => undefined);
    }
    setBusy(false);
    onSaved();
    onClose();
  }

  async function upload(file: File) {
    if (file.size > MAX_BYTES) {
      setError("That photo is over 5 MB. Pick a smaller one.");
      return;
    }
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError("Use a JPG, PNG, or WebP photo.");
      return;
    }
    setBusy(true);
    setError(null);
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${studentId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) {
      setBusy(false);
      setError(upErr.message);
      return;
    }
    // The bucket is private: store the object path and sign it when shown.
    await save({ avatar_emoji: null, photo_url: path });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="picture-title"
      aria-describedby="picture-hint"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 p-4"
    >
      <div className="w-full max-w-lg rounded-[var(--radius-card)] bg-paper-raised p-6 shadow-lift">
        <h2 id="picture-title" className="font-display text-2xl font-bold">
          Your picture
        </h2>
        <p id="picture-hint" className="mt-1 text-sm text-ink-700">
          {explore
            ? "Pick an emoji that feels like you. It shows at the top of your passport."
            : "Pick an emoji, or upload a photo of yourself. It shows at the top of your passport and on exports you choose to share."}
        </p>

        <fieldset className="mt-4">
          <legend className="eyebrow">Emoji</legend>
          <div className="mt-2 grid grid-cols-6 gap-2 sm:grid-cols-8">
            {PASSPORT_EMOJI.map((e, i) => {
              const on = emoji === e && !photoUrl;
              return (
                <button
                  key={e}
                  ref={i === 0 ? firstRef : undefined}
                  type="button"
                  aria-pressed={on}
                  aria-label={`Use ${e}`}
                  disabled={busy}
                  onClick={() => save({ avatar_emoji: e, photo_url: null })}
                  className={`grid h-11 w-11 place-items-center rounded-[var(--radius-control)] border text-2xl transition-colors ${
                    on ? "border-green bg-mint-tint" : "border-line bg-paper hover:border-ink-900"
                  }`}
                >
                  <span aria-hidden>{e}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {!explore && (
          <div className="mt-5 rounded-[var(--radius-control)] border border-line bg-paper p-4">
            <p className="eyebrow">Photo</p>
            <p className="mt-1 text-sm text-ink-700">
              Only a photo of yourself, JPG, PNG, or WebP up to 5 MB. Anyone with your family code
              or a shared export can see it. You can remove it any time.
            </p>
            <input
              ref={fileRef}
              id="passport-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
                e.target.value = "";
              }}
            />
            <label
              htmlFor="passport-photo"
              className={`btn-ghost mt-3 cursor-pointer ${busy ? "pointer-events-none opacity-50" : ""}`}
            >
              <ImageUp className="h-4 w-4" aria-hidden />
              {photoUrl ? "Replace photo" : "Upload a photo"}
            </label>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {(emoji || photoUrl) && (
            <button
              type="button"
              disabled={busy}
              onClick={() => save({ avatar_emoji: null, photo_url: null })}
              className="btn-ghost text-red-700"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Remove picture
            </button>
          )}
          <button type="button" onClick={onClose} className="btn-ghost ml-auto">
            {busy ? "Working…" : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}
