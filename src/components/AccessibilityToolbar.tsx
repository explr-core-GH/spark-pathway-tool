import { useCallback, useEffect, useState } from "react";
import { Accessibility, X } from "lucide-react";
import { useAccessibility } from "./AccessibilityProvider";

/**
 * Floating accessibility widget bottom-right. Collapsed: a round ink
 * button with the accessibility glyph. Expanded: a passport card with
 * five segmented controls (mode / contrast / spacing / motion / read
 * aloud), a 'Read page' action when read-aloud is on, and a reset link.
 *
 * Read-aloud uses the browser's window.speechSynthesis. When the user
 * toggles it off mid-speech the active utterance is cancelled.
 *
 * Renders nothing on the server (mounted guard) to keep TanStack Start's
 * SSR shell clean — appears as soon as the client hydrates.
 */

const SUPPORTS_SPEECH = typeof window !== "undefined" && "speechSynthesis" in window;

const SEG_ON =
  "inline-flex min-h-[40px] items-center rounded-[calc(var(--radius-control)-3px)] bg-ink-900 px-3 text-xs font-semibold text-paper";
const SEG_OFF =
  "inline-flex min-h-[40px] items-center rounded-[calc(var(--radius-control)-3px)] px-3 text-xs font-medium text-ink-500 hover:text-ink-900";

export function AccessibilityToolbar() {
  const { state, set, reset } = useAccessibility();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Voices load asynchronously on Chrome — the first call to getVoices() can
  // return []. Listen for voiceschanged to pick them up once ready. Filter
  // to English variants when present (most users on this app), but fall
  // back to the full list if the browser only ships non-English voices.
  useEffect(() => {
    if (!SUPPORTS_SPEECH) return;
    function refresh() {
      const list = window.speechSynthesis.getVoices();
      const en = list.filter((v) => /^en/i.test(v.lang));
      setVoices(en.length > 0 ? en : list);
    }
    refresh();
    window.speechSynthesis.addEventListener("voiceschanged", refresh);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", refresh);
  }, []);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Pull text from the current page's main region (falling back to body).
  // Trim runs of whitespace so the speech doesn't read out odd gaps.
  const speak = useCallback(() => {
    if (!SUPPORTS_SPEECH) return;
    const root = document.querySelector("main") ?? document.body;
    const text = (root.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!text) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = state.readAloudRate || 1;
    if (state.readAloudVoice) {
      const chosen = voices.find((v) => v.name === state.readAloudVoice);
      if (chosen) utter.voice = chosen;
    }
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
  }, [state.readAloudRate, state.readAloudVoice, voices]);

  const stop = useCallback(() => {
    if (!SUPPORTS_SPEECH) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  // Turning the toggle off mid-speech: cancel.
  useEffect(() => {
    if (state.readAloud === "default" && speaking) stop();
  }, [state.readAloud, speaking, stop]);

  // Stop speech on unmount (route changes etc).
  useEffect(() => {
    return () => {
      if (SUPPORTS_SPEECH) window.speechSynthesis.cancel();
    };
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div
          role="dialog"
          aria-label="Accessibility settings"
          className="mb-3 w-[min(18rem,calc(100vw-2rem))] rounded-[var(--radius-card)] border border-line bg-paper-raised p-4 text-ink-900 shadow-lift"
        >
          <div className="flex items-center justify-between">
            <p className="eyebrow">Accessibility</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="-mr-2 grid h-11 w-11 place-items-center rounded-[var(--radius-control)] text-ink-500 hover:bg-mint-tint hover:text-ink-900"
            >
              <X className="h-4 w-4" strokeWidth={2.2} aria-hidden />
            </button>
          </div>

          <Toggle
            label="Reading level"
            value={state.mode}
            options={[
              { value: "hs", label: "High school" },
              { value: "ms", label: "Middle school" },
            ]}
            onChange={(v) => set("mode", v)}
          />

          <Toggle
            label="Contrast"
            value={state.contrast}
            options={[
              { value: "default", label: "Default" },
              { value: "high", label: "High" },
            ]}
            onChange={(v) => set("contrast", v)}
          />

          <Toggle
            label="Text spacing"
            value={state.spacing}
            options={[
              { value: "default", label: "Default" },
              { value: "loose", label: "Loose" },
            ]}
            onChange={(v) => set("spacing", v)}
          />

          <Toggle
            label="Motion"
            value={state.motion}
            options={[
              { value: "default", label: "Default" },
              { value: "reduced", label: "Reduced" },
            ]}
            onChange={(v) => set("motion", v)}
          />

          <Toggle
            label="Read aloud"
            value={state.readAloud}
            options={[
              { value: "default", label: "Off" },
              { value: "on", label: "On" },
            ]}
            onChange={(v) => set("readAloud", v)}
          />

          {state.readAloud === "on" && (
            <div className="mt-3 space-y-3">
              {!SUPPORTS_SPEECH ? (
                <p className="text-xs text-ink-500">
                  Your browser doesn&apos;t support speech synthesis.
                </p>
              ) : (
                <>
                  {/* Voice picker — populates from speechSynthesis.getVoices(). */}
                  <div>
                    <p className="label">Voice</p>
                    <select
                      className="field mt-1 w-full text-sm"
                      value={state.readAloudVoice ?? ""}
                      onChange={(e) => set("readAloudVoice", e.target.value || null)}
                    >
                      <option value="">System default</option>
                      {voices.map((v) => (
                        <option key={`${v.name}-${v.lang}`} value={v.name}>
                          {v.name} · {v.lang}
                          {v.localService ? "" : " · cloud"}
                        </option>
                      ))}
                    </select>
                    {voices.length === 0 && (
                      <p className="mt-1 text-[11px] text-ink-500">
                        Loading voices… (browser-dependent)
                      </p>
                    )}
                  </div>

                  {/* Rate */}
                  <div>
                    <p className="label">Rate</p>
                    <div className="mt-1 inline-flex flex-wrap rounded-[var(--radius-control)] border border-line-strong bg-paper p-0.5">
                      {[
                        { v: 0.75, label: "Slow" },
                        { v: 1, label: "Normal" },
                        { v: 1.25, label: "Fast" },
                        { v: 1.5, label: "Faster" },
                      ].map((opt) => {
                        const on = state.readAloudRate === opt.v;
                        return (
                          <button
                            key={opt.v}
                            type="button"
                            aria-pressed={on}
                            onClick={() => set("readAloudRate", opt.v)}
                            className={on ? SEG_ON : SEG_OFF}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Read + Stop */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={speak}
                      disabled={speaking}
                      className="btn-ink px-3.5 text-xs disabled:opacity-50"
                    >
                      {speaking ? "Reading…" : "Read this page"}
                    </button>
                    {speaking && (
                      <button type="button" onClick={stop} className="btn-ghost px-3.5 text-xs">
                        Stop
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3 text-xs">
            <button
              type="button"
              onClick={reset}
              className="ink-link inline-flex min-h-[44px] items-center text-ink-700"
            >
              Reset to defaults
            </button>
            <span className="text-ink-500">Saved to this browser</span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Accessibility settings"
        aria-expanded={open}
        className="grid h-12 w-12 place-items-center rounded-full bg-ink-900 text-paper shadow-lift ring-1 ring-line-strong hover:bg-green-deep"
      >
        <Accessibility className="h-6 w-6" strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}

function Toggle<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="mt-4">
      <p className="label">{label}</p>
      <div className="mt-1 inline-flex rounded-[var(--radius-control)] border border-line-strong bg-paper p-0.5">
        {options.map((opt) => {
          const on = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(opt.value)}
              className={on ? SEG_ON : SEG_OFF}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
