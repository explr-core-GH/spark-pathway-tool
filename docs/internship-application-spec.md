# High school internship application spec

Source of truth for the HS internship application (`/student/apply`), the partner application builder (`/org/application/$id`), staff review (`/instructor/admin/hs-applications`) and the matching in `src/lib/hs-application/`. The working copy lives in Jordan's Claude Doc "EXPLR Internship Application Spec"; update both together.

High school only.

## Shape

Every application has three layers:

1. **A. Core** (locked, the same everywhere)
2. **B. Embedded interest survey** (every application)
3. A track: **C. General** (students who don't know what they want) or **D. Partner** (special or partner-created internships)

**The general application comes first.** A student completes A + B + C once per season. After that, applying to any partner internship asks only that partner's add-on questions (D2) and site requirements (D3). Core and survey carry over.

**Partners do not see student applications.** EXPLR staff review everything and place students. Partners see only who was placed with them (`org_placed_students()`). Field-level "partner could see" flags are kept for later and default off.

Principles: one student record per season; no hard exclusion except age; "never tried but curious" scores nearly as high as "did it and want more"; under about 20 minutes on a phone at an 8th-grade reading level; survey results linked by a pseudonymized student ID for longitudinal RIASEC profiles; save and resume.

## A. Core

- **A1 About you:** legal name; preferred name (optional); email you check most; cell + OK to text; date of birth; school (Ohio directory search + "not listed"); grade this fall (9-12, graduated); home ZIP; **email you used on your Youth Opportunities Unlimited application** (required; helper text: "We use this to connect your EXPLR application with your YOU application. Use the same email so nothing gets held up."; staff see possible duplicates and near-match typos).
- **A2 Logistics:** all program weeks (+ dates you can't); how you'd get to a site; bus pass; work permit (age and schooling certificate; required under 18); prior EXPLR program.
- **A3 Short answers** (75-150 words, voice-to-text OK): something you made, fixed or figured out; what you hope to get out of an internship.
- **A4 Support and consent:** support needs (optional, staff only); parent/guardian name, phone, email (required under 18); emergency contact; student + guardian consent with typed-name e-signature. Optional demographics are a separate page stored in `hs_demographics` (funder reporting and equity checks only).
- **A5 After high school:** specific jobs (optional); plans (multi-select); how sure (1-5); college courses incl. College Credit Plus; career-tech program; credentials; started a college/trade/military application. A5 is reporting only and not scored.

## B. Interest survey

Reuses the existing 48-item RIASEC assessment (`assessment-items.ts`). If the student completed it this school year (since August 1), the application uses those results and offers a retake. Added on top, inside the application:

- 16 Ohio career fields (tap any)
- 8 non-STEM activity items (Yes / Maybe / Not for me), each tagged RIASEC + career fields
- 6 forced-choice pairs (nudge the RIASEC profile)
- 5 work-environment sliders
- 11 experience items with the four-way answer (did it and want more / did it, not for me / never tried, curious / never tried, not interested)

Each of the 48 assessment items is also tagged with career fields (`ASSESSMENT_ITEM_FIELDS`) for the activity-overlap part of matching.

## C. General track

Top 5 eligible matches with a one-line "why this matched"; react to each (Excited / Open to it / Not for me); rank up to 3 or check "Place me where I'll fit best"; optionally add one internship from the full list; optional "kind of work you've always wanted to try". Shown matches are frozen when the student first reaches the step.

## D. Partner track and builder

Partners build an application per internship and publish it with no EXPLR review step; the builder enforces the guardrails. Each publish creates a row in `opp_application_versions`. A version locks when any student starts it; later edits publish a new version, and each student's answers keep the `version_id` they saw. (The listing itself still goes through the existing EXPLR WBL gate.)

- **D1 profile:** title, plain-language description (jargon flagged), 3-6 weekly tasks, learn/earn + credentials, career fields, RIASEC (from the listing), 5 environment sliders, seats, dates, daily hours, address + nearest bus line, nice-to-haves ("helpful, not required").
- **D2 questions:** up to 5 from the bank (B-01 to B-11) and up to 2 custom (short text or multiple choice, under 30 words).
- **D3 site requirements:** age limits (min 14-18, rare max; reason required; checked from DOB on day one; under-age students see "Opens at 16"), health/immunizations, background checks, safety gear, dress code, meals, physical demands, pre-start training, documents/tech, schedule/travel, rules at work. Students answer "I can meet this by the start date" / "I'd need help" / "I have a question"; meals and work rules are acknowledge-only.

**Guardrails** (`guardrails.ts`): no GPA, test or attendance cutoffs; keyword block on questions about race, ethnicity, religion, disability or health, immigration status, family income, gender identity, orientation, pregnancy, marital status or criminal history; no "years of experience"; answers capped at 150 words; uploads and video optional; added time capped at 10 minutes; health items never collect medical details; every cost item says who pays (student-pays items are flagged for EXPLR's support fund); physical demands confirmed essential; every age limit has a reason.

## Matching

`match-config.ts` holds every weight: RIASEC cosine 0.35, career field 0.20, activity overlap 0.20, environment 0.10 (renormalized when a part is missing), plus experience modifiers (capped ±0.08). **Age is the only hard filter.** Soft reductions: each open "I'd need help" answer -0.05 (cap -0.15; staff can clear it once help is confirmed), can't work every week -0.05, only "not sure" for transportation -0.03, grade outside the listing's range -0.10. There is no hazardous-work filter: EXPLR does not place students in hazardous work.

The legacy matcher (`src/lib/matching/placement.ts`) follows the same rule: age is the only hard check; grade, acknowledgments, transportation and availability lower the score.

## Status and notifications

Statuses: Received, Under review, Missing something, Placed, Waitlisted, Not placed this season. Each change is logged in `application_status_events` and sent to the student by email (and text once an SMS provider is connected and they said OK); the same update goes to the parent/guardian. Received includes a copy of the answers; Placed includes the internship, address, start date and D3 cards; Waitlisted lists open internships they might like; Not placed lists other EXPLR opportunities and invites them back next season. Demo addresses never receive mail.

## Data, privacy, equity

Only EXPLR admins read applications (RLS). Demographics are separate and optional. Health information is limited to the three-way answer. Staff see an equity view (applicants vs. placements by school, grade, gender and reported demographics). Unplaced applications are deleted `retention_days` after the season ends (`purge_unplaced_applications()`). The de-identified archive drops `core`, `delivery` and `question_notes`.

Retired: the second stage of the old flow (links, screenshot proofs, partner forms) and the partner applicants view.

Out of scope for now: Spanish versions; partners reviewing applicants.
