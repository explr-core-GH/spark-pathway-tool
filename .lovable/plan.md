# Build plan

Five phases. Each is a self-contained shippable chunk so you can review and course-correct between them rather than getting a 2,000-line patch all at once.

## Phase 1 — Admin: Internship Applications review queue
Smallest, highest-value piece. Uses existing tables; no migrations.

- New route `educator.admin.applications.tsx` (admin-only).
- Lists all rows from `internship_applications` with student name, grade, submitted_at, selected internships, RIASEC snapshot.
- Detail drawer: full résumé responses + Approve / Reject + staff_notes.
- Approve writes to `internship_placements` (requires new RLS policy + insert grant for admins — small migration).
- Link card on the admin index page.

## Phase 2 — Catalog migration (internships, camps, curriculum) to DB
Foundation for the admin CRUD in Phase 3.

- New tables: `internships`, `camps`, `curriculum_modules` with all fields currently in the TS catalogs (slug, title, description, riasec, holland_fit, image_url, sort_order, visible, etc.).
- RLS: read = any authenticated; write = admin only.
- One-time seed migration that inserts the current TS catalog contents so nothing disappears from the student-facing pages.
- Rewrite reads in `student.internships.tsx`, `student_.apply.tsx`, camps page, curriculum page to query the DB (keeping TS files only as fallback types).

## Phase 3 — Admin CRUD for catalogs
Three sibling admin pages with the same shape:

- `educator.admin.internships.tsx`, `educator.admin.camps.tsx`, `educator.admin.curriculum.tsx`.
- Table view + add / edit / delete dialog. Visibility toggle. Sort order.
- Reuses existing tag pages (curriculum-tags, internship-tags) — those stay.

## Phase 4 — Career Pathways snapshot + per-internship dropdown
Data import + UI.

- New tables: `career_clusters` (16 federal clusters), `occupations` (SOC code, title, median wage, growth %, openings, education level, cluster_id), `occupation_programs` (institution, program name, completions). Read = public/authed; write = admin.
- Seed migration with a snapshot of the Workforce site's social-mobility table (scraped from the markdown I already fetched).
- New join: `internship_occupations` (internship_slug → SOC codes).
- Internship card grows a "Career pathways" collapsible: cluster name, top occupations with wage / growth / openings, link to full EXPLR Workforce site for that SOC.
- Admin can edit the SOC tags per internship from Phase 3's internship editor.

## Phase 5 — Educator invites + programs/rosters admin
- `educator.admin.invites.tsx` — form (email + program_type + organization) writes to `educator_invites`; list of pending/accepted invites; copy-invite-link button.
- `educator.admin.programs.tsx` — create programs, assign educators (`program_educators`), edit rosters (`unit_rosters`).

## Technical notes

- Every new admin page is gated by `educator?.role === 'admin'` in the component and by `is_admin(auth.uid())` in RLS.
- Reads from new public-facing data use `createServerFn` only where RLS isn't sufficient; otherwise direct `supabase` client calls from components.
- Career Pathways data is a **snapshot** — admins can re-seed by re-running a migration. Live sync to the EXPLR site is out of scope.
- I'll re-use the existing shadcn primitives (Table, Dialog, Accordion, Popover) — no new design system work.

## Order of execution

I'll execute Phase 1 in this turn so you have something concrete to test, then stop and confirm before Phase 2 (which touches student-facing pages via the catalog migration). Phases 3–5 follow one per turn unless you tell me to batch them.
