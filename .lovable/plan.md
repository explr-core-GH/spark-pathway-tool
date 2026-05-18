# EXPLR Assessment — Build Plan

A multi-surface K-12 career-interest platform. Editorial visual tone (Lexend, mint accent, charcoal ink), not SaaS-dashboard. Student RIASEC assessment + educator portal sharing one Supabase backend. Educator surfaces are the priority.

Note on stack: this project is on **TanStack Start** (not plain Vite+React Router). File-based routes live under `src/routes/`. I'll follow that convention — same architecture, same Supabase, same shadcn. Calling this out so the route files look right to you.

## Phase 1 — Foundation

1. **Enable Lovable Cloud** (Supabase).
2. **Run schema migrations** from `schema.sql` then `educator-schema.sql` via the migration tool. Add the extra tables the spec implies but aren't in the SQL files: `curriculum_tags`, `internship_tags`, `unit_rosters`, `educator_invites`, `program_riasec_scores` (admin tool persistence is localStorage per spec, but server copy is cheap insurance — I'll skip unless you want it).
3. **Copy shared types** into the project verbatim:
   - `src/lib/riasec.ts`
   - `src/lib/educator.ts`
   - `src/lib/camp-curriculum.ts`
   - `src/lib/internships-catalog.ts`
   - `src/lib/program-riasec.ts`
   - `src/lib/rosters.ts`

## Phase 2 — Design system

4. Add **Lexend 300–700** via Google Fonts in `__root.tsx` head.
5. Rewrite `src/styles.css`:
   - Brand mint + charcoal scales as CSS tokens (oklch conversions of your hex values).
   - Semantic tokens: `--background` = paper white, `--foreground` = charcoal-700, `--accent` = explr-500, `--muted` = charcoal-50, `--border` = charcoal-100.
   - Font family = Lexend. Generous line-height. No dark mode (out of scope).
6. **No stock shadcn defaults** — I'll add a small editorial primitives file (`src/components/ui/editorial.tsx`) with button/link/card variants tuned to the look. I will still keep the underlying shadcn components installed for forms/dialogs/tabs but restyle them.

## Phase 3 — Routes (TanStack file-based)

Public:
- `src/routes/index.tsx` — hero, **HollandHexagon** SVG, RIASEC color tour
- `about.tsx`, `privacy.tsx`
- `sign-in.tsx`, `sign-up.tsx`, `sign-out.tsx` — student auth (Supabase email/password)

Educator (pathless layout `_educator.tsx` with shared header):
- `educator/index.tsx` — landing
- `educator/sign-in.tsx`, `educator/sign-up.tsx` (email + passphrase + program-type picker + SchoolSearch)
- `educator/invite.$token.tsx`
- `educator/dashboard.tsx` — assignments + curriculum tiles + internship tiles + school panel
- `educator/curriculum/index.tsx` + `educator/curriculum/$slug.tsx`
- `educator/internships/index.tsx` + `educator/internships/$slug.tsx`

Admin (guarded by `_educator/_admin.tsx`):
- `educator/admin/index.tsx`
- `educator/admin/curriculum-tags.tsx`
- `educator/admin/internship-tags.tsx`
- `educator/admin/program-riasec.tsx` (three tabs, localStorage)
- `educator/admin/educators.$id.tsx`

## Phase 4 — Reusable components

`src/components/`:
- `HollandHexagon.tsx` — SVG hexagon, vertex colors from `riasec.ts`
- `SchoolSearch.tsx` — typeahead over `/ohio/directory.json` (**stubbed** — empty placeholder data + TODO comment; you'll upload to Storage later)
- `SchoolDemographics.tsx` — fetches `/ohio/buildings/<irn>.json` (stubbed)
- `RosterPanel.tsx` — textarea + CSV upload, upserts `unit_rosters`
- `EducatorSchoolEditor.tsx`
- `RequireAuth.tsx` — wraps content with `requireAdmin` / `requireEducator` props; pairs with the `_authenticated` / `_admin` layout-route guards
- `SlideViewer.tsx` — **stub**: shows deck filename + "preview coming soon" placeholder

## Phase 5 — Auth wiring

- Student auth via `src/integrations/supabase/client` directly.
- Educator role check via the `educators` table + RLS (already in `educator-schema.sql`).
- `_authenticated` and `_admin` pathless layout routes do redirect-based guards in `beforeLoad`.
- No auto-emailed invites — admin invite form generates a copyable `/educator/invite/<token>` URL.

## Technical notes

- **Stubs**: slide viewer, school directory JSON, school demographics JSON, student auth flows (basic Supabase signUp/signIn — no email confirm UX polish), assessment-taking screens. These are explicitly out of scope for this scaffold per your message.
- **RLS**: I'll rely on the policies in `educator-schema.sql`. If any are missing for new tables (`curriculum_tags`, `internship_tags`, `unit_rosters`, `educator_invites`), I'll add them in the migration.
- **Tags**: `curriculum_tags` and `internship_tags` are `(slug, program_type)` join tables. Admin pages let admins toggle per program type. Educator-facing pages filter the static catalogs by these tags.
- **Routing convention**: TanStack flat dot-separated route files (e.g. `educator.curriculum.$slug.tsx`).
- **Design tokens**: hex → oklch conversion for the two brand scales so they integrate with the existing token system.

## What I'll deliver in this turn

Everything above except the assessment-taking flow (no spec given for question screens, scoring UI, item bank) and Supabase Storage uploads (you mentioned doing those separately). All routes will render, all guards work, all admin tagging persists. The slide viewer + school search render as labeled placeholders so the layout is real but the data wait is honest.

Confirm and I'll execute.