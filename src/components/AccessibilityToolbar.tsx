import { useEffect, useState } from "react";
import { useAccessibility } from "./AccessibilityProvider";

/**
 * Floating accessibility widget bottom-right. Collapsed: a small icon button.
 * Expanded: a tight panel with 4 segmented controls for mode / contrast /
 * spacing / motion, plus a reset link. Reads from + writes to the
 * AccessibilityProvider context.
 *
 * Renders nothing on the server (window guard) to keep TanStack Start's
 * SSR shell clean — appears as soon as the client hydrates.
 */

export function AccessibilityToolbar() {
  const { state, set, reset } = useAccessibility();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="12" cy="4" r="2" />
          <path
            strokeLinecap="round"
            d="M5 8h14M9 8l1 13M15 8l-1 13M10 13h4"
          />
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
