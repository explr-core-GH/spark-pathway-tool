import { useCallback, useEffect, useState } from "react";
import { useAccessibility } from "./AccessibilityProvider";

/**
 * Floating accessibility widget bottom-right. Collapsed: a small robot
 * icon button. Expanded: a tight panel with five segmented controls
 * (mode / contrast / spacing / motion / read aloud), a 'Read page'
 * action when read-aloud is on, and a reset link.
 *
 * Read-aloud uses the browser's window.speechSynthesis. When the user
 * toggles it off mid-speech the active utterance is cancelled.
 *
 * Renders nothing on the server (mounted guard) to keep TanStack Start's
 * SSR shell clean — appears as soon as the client hydrates.
 */

const SUPPORTS_SPEECH =
  typeof window !== "undefined" && "speechSynthesis" in window;

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
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", refresh);
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
          className="mb-3 w-72 border border-charcoal-200 bg-white p-4 shadow-lg"
        >
          <div className="flex items-baseline justify-between">
            <p className="eyebrow">Accessibility</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-xs text-charcoal-400 hover:text-ink"
            >
              ✕
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
                <p className="text-xs text-charcoal-500">
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
                      onChange={(e) =>
                        set("readAloudVoice", e.target.value || null)
                      }
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
                      <p className="mt-1 text-[11px] text-charcoal-400">
                        Loading voices… (browser-dependent)
                      </p>
                    )}
                  </div>

                  {/* Rate */}
                  <div>
                    <p className="label">Rate</p>
                    <div className="mt-1 inline-flex border border-charcoal-200">
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
                            className={
                              on
                                ? "px-2.5 py-1.5 text-xs font-semibold"
                                : "px-2.5 py-1.5 text-xs font-medium text-charcoal-500 hover:text-ink"
                            }
                            style={
                              on
                                ? { background: "var(--ink)", color: "var(--bg)" }
                                : undefined
                            }
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Read + Stop */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={speak}
                      disabled={speaking}
                      className="px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                      style={{ background: "var(--ink)", color: "var(--bg)" }}
                    >
                      {speaking ? "Reading…" : "Read this page"}
                    </button>
                    {speaking && (
                      <button
                        type="button"
                        onClick={stop}
                        className="px-3 py-1.5 text-xs font-semibold border border-charcoal-200 text-charcoal-700 hover:border-ink"
                      >
                        Stop
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={reset}
              className="text-charcoal-500 underline hover:text-ink"
            >
              Reset to defaults
            </button>
            <span className="text-charcoal-400">Saved to this browser</span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Accessibility settings"
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-full shadow-lg ring-1 ring-charcoal-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explr-500"
        style={{ background: "var(--ink)", color: "var(--bg)" }}
      >
        {/* Friendly robot — antenna with tip dot, rounded head, two eyes,
            small mouth grille. Drawn in currentColor so it inherits the
            bg-contrast color from the button's style attribute. */}
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3.5v2" />
          <circle cx="12" cy="2.5" r="1.1" fill="currentColor" stroke="none" />
          <rect x="5" y="6" width="14" height="11" rx="2.5" />
          <circle cx="9" cy="11" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="15" cy="11" r="1.2" fill="currentColor" stroke="none" />
          <path d="M9.5 14h5" />
          <path d="M3 12h2M19 12h2" />
        </svg>
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
      <div className="mt-1 inline-flex border border-charcoal-200">
        {options.map((opt) => {
          const on = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(opt.value)}
              className={
                on
                  ? "px-3 py-1.5 text-xs font-semibold"
                  : "px-3 py-1.5 text-xs font-medium text-charcoal-500 hover:text-ink"
              }
              style={
                on
                  ? { background: "var(--ink)", color: "var(--bg)" }
                  : undefined
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
