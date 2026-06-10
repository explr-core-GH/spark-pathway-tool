# Accessibility baseline (Playwright + axe-core)

Automated WCAG 2.x A/AA smoke test that scans the public pages with
[axe-core](https://github.com/dequelabs/axe-core) and fails CI on regressions.

## Run it

```bash
npm run test:a11y          # headless, all public routes
npx playwright test --ui   # interactive runner
npx playwright show-report # open the last HTML report
```

The Playwright config (`playwright.config.ts`) auto-starts the dev server on
`http://localhost:8080` (the port the Lovable config pins) and reuses one if it's
already running. Unit tests stay on vitest (`npm test`); Playwright only owns
`e2e/*.spec.ts`, so the two never collide.

## What it checks

`e2e/a11y.spec.ts` visits each public, signed-out route and runs axe with the
`wcag2a`/`wcag2aa`/`wcag21a`/`wcag21aa`/`wcag22aa` rule tags.

**Gate policy**

- **Blocks** on any serious/critical violation — missing form labels, bad ARIA,
  heading/landmark issues, etc.
- **Advisory (printed, non-blocking):** `color-contrast` failures whose
  foreground is an EXPLR brand color (the mint wordmark — a WCAG 1.4.3-exempt
  logotype — and the six tuned RIASEC hues). Changing those is a design decision,
  not a silent test fix. A contrast failure on any **other** color still blocks,
  so genuine regressions (e.g. grey-on-white body text) are caught.

Current advisories (brand palette, for a future design decision):
`#2BEDA1` mint "Pathways" wordmark (~1.46:1) and the `#D9523B` RIASEC-R label
at 11px (~4.02:1).

## Extending to signed-in pages

Authenticated surfaces (student dashboard, educator/admin, the assessment +
survey runners) aren't covered yet. To add them:

1. Create `e2e/auth.setup.ts` that signs in a **seeded test** student/educator
   and saves `storageState` to `e2e/.auth/<role>.json`.
2. Add a Playwright project with `use: { storageState }` and a route list for
   the gated pages.

Keep test credentials out of git (`.auth/` is already gitignored via
`/playwright/.cache/` siblings — add `/e2e/.auth/` if you wire this up).
