import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Drives the data attributes on <html> that styles.css already keys off:
 *   data-mode="hs" | "ms"           (radius scale)
 *   data-contrast="default" | "high"
 *   data-spacing="default" | "loose" (dyslexia-friendly)
 *   data-motion="default" | "reduced"
 *
 * Persists to localStorage so the choice survives reloads.
 */

export type Mode = "hs" | "ms";
export type Contrast = "default" | "high";
export type Spacing = "default" | "loose";
export type Motion = "default" | "reduced";

export type AccessibilityState = {
  mode: Mode;
  contrast: Contrast;
  spacing: Spacing;
  motion: Motion;
};

const DEFAULTS: AccessibilityState = {
  mode: "hs",
  contrast: "default",
  spacing: "default",
  motion: "default",
};

const STORAGE_KEY = "explr.a11y.v1";

type Ctx = {
  state: AccessibilityState;
  set: <K extends keyof AccessibilityState>(key: K, value: AccessibilityState[K]) => void;
  reset: () => void;
};

const AccessibilityContext = createContext<Ctx | null>(null);

function applyToDocument(s: AccessibilityState) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.dataset.mode = s.mode;
  // Only set non-default values — keeps the DOM uncluttered for the default case.
  if (s.contrast !== "default") html.dataset.contrast = s.contrast;
  else delete html.dataset.contrast;
  if (s.spacing !== "default") html.dataset.spacing = s.spacing;
  else delete html.dataset.spacing;
  if (s.motion !== "default") html.dataset.motion = s.motion;
  else delete html.dataset.motion;
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AccessibilityState>(DEFAULTS);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AccessibilityState>;
        const next = { ...DEFAULTS, ...parsed };
        setState(next);
        applyToDocument(next);
      } else {
        applyToDocument(DEFAULTS);
      }
    } catch {
      applyToDocument(DEFAULTS);
    }
  }, []);

  // Apply + persist on every change.
  useEffect(() => {
    applyToDocument(state);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* private mode etc. */
    }
  }, [state]);

  const set = useCallback<Ctx["set"]>((key, value) => {
    setState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => setState(DEFAULTS), []);

  const value = useMemo<Ctx>(() => ({ state, set, reset }), [state, set, reset]);

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility(): Ctx {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    // Provider not mounted — return a stub so callers don't crash. Useful
    // during SSR shells where the provider only renders on the client.
    return {
      state: DEFAULTS,
      set: () => undefined,
      reset: () => undefined,
    };
  }
  return ctx;
}
