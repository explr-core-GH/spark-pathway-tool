# EXPLR Pathways

Ohio work-based and career-connected learning passport for grades 4-12.
Live at https://explrpathways.org. Built with TanStack Start (React 19, SSR on
Cloudflare Workers through Lovable Cloud), Supabase (Postgres with row-level
security on every table, Auth, Storage, one edge function) and Tailwind 4.

## How changes reach production

1. Push to `main` on this repository (or edit in Lovable; it syncs both ways).
2. CI (`.github/workflows/ci.yml`) runs type check, lint, unit tests, build and
   the accessibility gate.
3. Click **Publish** in Lovable. Publishing takes a minute or two to roll out;
   if you need to seed the demo, wait for `data-commit-sha` in the page source
   to match before clicking "Seed demo data".

Database changes: Lovable applies SQL in `supabase/migrations/` and
`drizzle/migrations/` to the live project when they are created in the editor.
When applying SQL by hand, add the same file here so the history stays whole.

## Local development

```bash
bun install --frozen-lockfile
bun run dev          # http://localhost:8080
bun x tsc --noEmit   # type check
bun run lint         # eslint + prettier
bun run test         # vitest unit tests
bun run build        # production build (.output/)
bun run test:a11y    # Playwright + axe over the public routes
```

Copy `.env.example` to `.env`. Only the two `VITE_` values are needed for the
browser build; the server-only secrets live in Lovable Cloud and are read from
`process.env` inside `*.functions.ts` and `*.server.ts` modules.

## Where things are

| Area                                    | Path                                                                                                 |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Routes (file-based)                     | `src/routes/` (`student_*`, `instructor.*`, `instructor.admin.*`, `org.*`, `family*`, public pages)  |
| Role guards                             | `src/components/RoleGuard.tsx`, `src/lib/role-resolution.ts`, `OrgGuard`, `EducatorGate`             |
| Server functions (service role)         | `src/lib/*.functions.ts`; privileged helpers in `src/lib/server/*.server.ts`                         |
| Shared security helpers                 | `src/lib/server/hash.server.ts`, `rate-limit.server.ts`, `origin.server.ts`, `credentials.server.ts` |
| Supabase client, types, auth middleware | `src/integrations/supabase/`                                                                         |
| Migrations                              | `supabase/migrations/` (history), `drizzle/migrations/` (recent)                                     |
| Edge function                           | `supabase/functions/sync-explr/` (daily ExplrMore mirror; needs `SYNC_SECRET`)                       |
| Ohio careers data                       | `scripts/build-ohio-careers.mjs` → `src/data/ohio-careers.json`                                      |
| Specs                                   | `docs/`                                                                                              |
| Tests                                   | `src/**/*.test.ts` (unit), `e2e/` (Playwright: a11y, live flows)                                     |

## Operational notes

- Demo accounts live under `@demo.explrpathways.org`; `/demo` gives one-click
  sessions. Seeding and reset are admin-only.
- Family codes are reusable for 90 days; guardian accounts link to children with
  them. Picture sign-in (grades 4-8) uses class codes `ANIMAL-NNNN`.
- Rate limits for unauthenticated server functions are in
  `src/lib/server/rate-limit.server.ts` (table `rate_limit_hits`). The limiter
  fails open if the database call itself errors.
- Client-side errors are reported to the Worker log through
  `src/lib/error-report.functions.ts`; server errors go to `console.error`.
  Read them in Lovable Cloud → Logs.
- Rotating a hash pepper invalidates the matching codes or cards; see
  `.env.example`.
- To revoke a family code or guardian link, the student does it from their
  dashboard; admins can update `family_links.revoked_at` or
  `guardian_students.revoked_at` directly.
