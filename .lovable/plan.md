# High school internship application redesign — phased plan

Extends the current apply flow (`/student/apply` → `/student/apply-complete`), the admin Applications, Matching and Placements pages, the RIASEC assessment, the internship catalog and the partner (organization) portal. No existing rows are deleted or rewritten; old applications keep displaying as "legacy".

## Phase 0 — Save the spec
- Write the spec verbatim to `docs/internship-application-spec.md` and add a line to `docs/README.md`.
- Add an `AGENTS.md` rule: the spec is the source of truth for the HS application.

## Phase 1 — Season record + core (Layer A) with save & resume
- New `application_seasons` (e.g. "Summer 2027": program week dates, open/close, retention days).
- New `hs_applicant_profiles` — one row per student per season, holding A1–A5 (A4 demographics in a separate table). Reused by every application that season. Absorbs the useful fields of `internship_profiles` (prefilled from it; old table untouched).
- New `hs_applicant_demographics` (optional, funder-only, staff read only).
- New `hs_consents` (student + guardian e-signature, timestamp, terms version).
- Phone-first step flow with autosave per step, word counters (75–150), 8th-grade copy.
- A1.9 YOU email: format validation; staff-only "possible duplicate/typo" flag computed server-side against other profiles (exact match, near-match edit distance).
- Under-18 rules: guardian contact + work-permit question required.

## Phase 2 — Embedded interest survey (Layer B)
- Reuse the existing assessment runner. If a completed session exists this school year: show results with Retake / Use these.
- Item bank: add 8 non-STEM activity items (tagged), keep the existing 18, add/confirm 6 forced-choice pairs, 5 environment sliders, 11 experience items with the 4-way answer.
- Replace the career-field taps with Ohio's 16 career fields (new list alongside the old one; old answers kept and mapped).
- Every session links to the season application; a pseudonymized student ID (hash) is stored for longitudinal reporting.
- End screen: 3-letter code + plain-language summary (exists today, reused).

## Phase 3 — Matching config + General track (Layer C)
- New `src/lib/matching/config.ts`: weights RIASEC 0.35, career field 0.20, activity 0.20, environment 0.10, experience modifiers, "I'd need help" reduction + cap. Logic in `placement.ts` reads the config.
- Hard filters reduced to age only (see Conflicts).
- Re-tag internships/opportunities from old sectors to the 16 fields: admin re-tag screen + suggested mapping.
- General track screen: top 5 open internships with "why this matched", react Excited/Open/Not for me, rank up to 3 or "Place me where I'll fit best", optional "See all" add of one unmatched listing, optional free-text.
- Stored in a new `hs_applications` table (one per student per season per track) plus `hs_application_choices` (reaction, rank). `internship_selections` / `internship_applications` stay as legacy.

## Phase 4 — Partner application builder (Layer D)
- Extend the existing `OpportunityWizard` for internship listings: D1 profile fields, D2 add-on questions (bank B-01..B-11, up to 5, or up to 2 custom), D3 site requirements.
- Guardrails enforced in the builder and re-checked server-side on publish: protected-topic keyword block, no GPA/test/attendance cutoffs, no "years of experience", 150-word caps, optional uploads/video, every age limit needs a reason, every cost item needs "who pays", physical demands essential confirmation, estimated time with publish blocked over 10 minutes, live phone preview.
- Publish without EXPLR review for these listings (existing gate kept for other opportunity types).
- Versioning: new `partner_application_versions` (frozen JSON of D1–D3); a version locks when any student starts it; edits create a new version. Answers store `version_id`, shown to staff.
- Every field carries a `partner_visible` flag, default off.
- Student side: partner track answers add-ons + D3 cards ("I can meet this / I'd need help / I have a question"; meals and rules acknowledge-only). Health items store only that 3-way answer.

## Phase 5 — Staff review queue + equity
- Upgrade `/instructor/admin/applications` to read `hs_applications` (legacy tab keeps old rows): core, survey, choices, D3 flags, YOU duplicate flag, version used, match scores from the config.
- "I'd need help" items listed with a Clear button (restores the score).
- Placement writes to the existing `internship_placements`; waitlist / not-placed statuses.
- Partners see only who was placed with them (names + start info) — no applications.
- Equity view: applicants vs placements by school, grade, gender, reported demographics.
- Retention: scheduled purge of unplaced applications after the season's configured days.

## Phase 6 — Status notifications
- Statuses: Received (with copy of answers), Under review, Missing something, Placed, Waitlisted (with suggestions), Not placed.
- Email to student and guardian on each change, via Lovable's email setup (needs a sender domain configured).
- SMS: build a `sendSms` hook that logs and no-ops until an SMS provider is chosen; only fires when "OK to text" is yes.
- New `application_status_events` log.

## Schema migrations (all additive)
1. `application_seasons`
2. `hs_applicant_profiles`, `hs_applicant_demographics`, `hs_consents`
3. `assessment_sessions`: add `application_id`, `pseudo_id` (nullable)
4. `career_fields` (Ohio 16) + `internship_career_fields`, `opportunities.career_fields text[]` default `{}`
5. `hs_applications`, `hs_application_choices`, `hs_requirement_answers` (with `needs_help`, `cleared_by`, `cleared_at`)
6. `partner_application_versions`; `hs_applications.partner_version_id`
7. `application_status_events`
8. `internship_placements`: add nullable `hs_application_id`
All with GRANTs + RLS: students own rows only; staff via `is_admin`; demographics staff-only; organizations get no access to application tables, only a narrow view of their placements.

## Conflicts with current code
- **Partners currently see applicants.** `/org/applicants` shows students' selections and screenshot proofs to orgs, and `internship_selections` RLS likely allows it. Spec says partners see nothing — this page must become "Placed with you" and the policy narrowed.
- **Hard filters.** `placement.ts` excludes on grade band, hazardous work under 16, unaccepted acknowledgments, transportation and availability. Spec: age is the only hard filter; others become score reductions or staff flags. Existing unit tests in `placement.test.ts` will need updating.
- **Weights differ.** Current: RIASEC 0.30, interest rank 0.15, aspiration 0.15, coursework 0.15, experience 0.15, availability 0.10. Spec drops rank/aspiration/coursework (A5 not scored) and adds career field, activity and environment.
- **Minimum 4 choices.** Apply page requires at least 4 picks; spec allows up to 3 or "place me where I fit best".
- **Two-stage flow.** Today: request → staff approve → student completes links/screenshots/forms. Spec: single submission, staff place. Screenshot proofs and partner forms would move to after placement (or be retired).
- **Career sectors.** `career-sectors.ts` and `career_clusters` use the 16 federal clusters; spec uses Ohio's 16 career fields (different names). Needs a mapping and re-tag.
- **Partner publishing.** Opportunities currently go through an EXPLR review / WBL gate (`status`, `gate_status`). Spec says publish without review for partner internships.
- **Two catalogs.** Internships exist both in `internships` (slug) and as org `opportunities`; the new flow should treat both as listings but only org opportunities get the builder.
- **Route names.** The spec says "admin"; current staff pages live under `/instructor/admin/*`. Plan keeps those.

## Open questions
- Is the season record per summer only, or also school-year internships?
- Should old `internship_applications` be migrated into the new view or just shown as a legacy tab? (Plan: legacy tab.)
- Which SMS provider, if any? (Plan: hook only.)
- Retention default for unplaced applications (e.g. 365 days)?

## Order
One phase per turn, stopping for review after each. Phase 0 + 1 first.
