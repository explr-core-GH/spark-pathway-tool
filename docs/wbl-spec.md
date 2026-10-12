# EXPLR Pathways: Work-Based Learning Spec for the Portfolio Rebuild

Context file for Claude Code. Read this before touching the data model, the experience taxonomy, competency tagging, verification, exports, or any student-facing copy. Everything here is derived from EXPLR's research base (Jordan Seigler, October 2026) and is tied to named sources listed at the end. When a product decision is not covered here, prefer the choice that keeps a student's record portable, supervisor-attested, and aligned to Ohio's own definitions.

## 1. What the product is

EXPLR Pathways is two sites sharing one backend and one taxonomy:

- **K-12 site** (grades 6-12). Middle school is exploration only. High school accrues verified hours and Readiness Seal evidence.
- **Undergraduate site**. Experiential learning language (internship, co-op, research, capstone), NACE competencies, and pay as a first-class field.

The rebuild turns a student's main page into a **living resume / portfolio**: a resume-shaped page the student builds by adding experiences, opportunities applied for or completed, credits and credentials, media, and products (GitHub repos, CAD models, builds, writing, data). Employers and community organizations submit opportunities through a portal. Supervisors verify what students actually did. Verified items carry the EXPLR mark and export as portable credentials.

Three non-negotiables:

1. **Nothing displayed as verified is self-reported.** The verification mark depends on a supervisor rating delivered through an attestation flow the student cannot edit. Student reflection is required but supplementary.
2. **The EXPLR gate applies before anything is promoted.** An opportunity is sub-par, not gold standard, unless it is in a high-growth, high-demand field with a real path to social mobility and the student does or observes real work of that field. Sub-par opportunities can be listed as exposure; they are not endorsed, badged, or featured.
3. **Awareness and exploration are logged as exposure, never as WBL hours.** Only Ohio's six formal WBL types accrue hours toward the 250-hour graduation option, and only from grade 9.

## 2. Definitions the code should use (and the copy should match)

| Term | Working definition | Where it shows up |
| --- | --- | --- |
| Work-based learning (WBL) | Sustained interactions with industry or community professionals in real workplace settings, or simulated environments at a school, giving in-depth, firsthand engagement with the tasks of a career field, aligned to curriculum and instruction. (Perkins V, 20 U.S.C. 2302; adopted verbatim by Ohio DEW) | Taxonomy stage Participation; hours logic |
| Career-connected learning (CCL) | The broader continuum: Awareness, Exploration, Preparation, Participation (Ohio's names). WBL is the Participation end. | Every experience has a `stage` |
| Learning agreement | Ohio's term for the written plan behind formal WBL: competencies, evaluation method and frequency, roles, four signatures (student, parent, instructor, employer). Never call it a "training agreement". | Opportunity and Experience records for 9-12 |
| Internship (undergrad) | NACE's six criteria: real learning not merely advancing operations; transferable skills; defined start and end dates; written position description; learning objectives tied to the academic program; qualified supervision with feedback. NACE's position: all internships should be paid. | Undergrad opportunity validation |
| Youth apprenticeship | Paid, mentored on-the-job learning plus related instruction, ongoing competency assessment, and a portable credential with postsecondary credit. Apprentices must be 16+. | 9-12 taxonomy |
| Pre-apprenticeship | Program preparing entry into a Registered Apprenticeship: employer-aligned curriculum, hands-on learning, a credential opportunity, and an RA partner. | 9-12 and undergrad taxonomy |
| High-Impact Practices (HIPs) | AAC&U's list; internships, service learning, undergraduate research, capstones, and ePortfolios are all HIPs. | Undergrad site framing |

## 3. Experience taxonomy (shared enum)

Every Opportunity, Experience, and Portfolio Piece carries `stage` and `experience_type`. The `audience` field routes to the correct site. `ohio_formal_wbl` and `hours_count` drive the hours logic. Do not let employers invent types; they choose from this list.

### Stage enum

```
awareness      // learning about work
exploration    // learning about work, firsthand
preparation    // learning through work
participation  // learning for work (Ohio's name; Advance CTE calls this Training)
```

### K-12 experience types

| `experience_type` | Stage | Grades | `ohio_formal_wbl` | `hours_count` | Notes |
| --- | --- | --- | --- | --- | --- |
| `career_day_speaker_fair` | awareness | K-12 | false | false | Benchmark 30-60 min |
| `worksite_tour` | awareness | 5-12 | false | false | Benchmark 1.5-2 hrs |
| `informational_interview` | exploration | 6-12 | false | false | |
| `job_shadow` | exploration | 7-12 | false | false | CMSD PACE requires 3-4 shadows; count them for the PACE export |
| `career_mentoring` | exploration | 6-12 | false | false | ~15 hrs/semester; mentors can validate Readiness Seal skills |
| `industry_design_challenge` | exploration | 6-12 | false | false | Robotics, hackathons, maker projects with professional judges |
| `ctso_competition` | exploration | 7-12 | false | false | Recognized in Perkins V |
| `service_learning` | preparation | 6-12 | false | false | Not a formal Ohio WBL type |
| `school_based_enterprise` | preparation | 9-12 | true | true | |
| `simulated_workplace` | preparation | 9-12 | true | true | |
| `entrepreneurship` | preparation | 9-12 | true | true | Under a learning agreement |
| `remote_virtual_placement` | participation | 9-12 | true | true | |
| `internship_offsite_placement` | participation | 10-12 | true | true | HS Tech Internship reimburses 75% of wages |
| `cooperative_education` | participation | 11-12 | true | true | Recorded under Ohio's internship/placement category in EMIS |
| `clinical_experience` | participation | 11-12 | true | true | Health Science pathway |
| `pre_apprenticeship` | participation | 10-12 | true | true | ApprenticeOhio recognition |
| `youth_apprenticeship` | participation | 11-12 | true | true | Must be 16+ |

### Undergraduate experience types

| `experience_type` | HIP? | Notes |
| --- | --- | --- |
| `internship` | yes | NACE six criteria enforced at submission; `paid` flag surfaced first in listings |
| `coop` | yes | Alternating or parallel paid work terms |
| `registered_apprenticeship` | | DOL RAP; national credential |
| `degree_apprenticeship` | | RA that includes an associate, bachelor's, or master's degree |
| `pre_apprenticeship_adult` | | |
| `clinical_practicum_student_teaching` | yes | Licensure-required practice |
| `undergraduate_research` | yes | Mentored inquiry producing original work |
| `service_learning` | yes | Course-embedded with structured reflection |
| `capstone_industry_project` | yes | Scoped with an external partner |
| `micro_internship` | | 10-40 hours, fixed fee, paid |
| `virtual_job_simulation` | | Exposure only; never supervisor-attested; never verified |

### Rules derived from the taxonomy

- `hours_count` is true only when `ohio_formal_wbl` is true AND the student's grade is 9 or above AND the experience is verified.
- Middle school (6-8) experiences must be in `awareness` or `exploration` stages. Reject `preparation` and `participation` opportunities whose `min_grade` is below 9 unless an admin override is set.
- `virtual_job_simulation` and any `awareness` item can appear on the resume as exposure but cannot carry the verified mark or competency ratings.
- A single Opportunity can target multiple grade bands only if every targeted band passes the age and labor checks in section 7.

## 4. The EXPLR gate

Implement as a pass/fail check on every Opportunity, evaluated at submission and re-evaluated annually. Store the result and the evidence so the review history is auditable.

| Gate question | Passes when | Data captured |
| --- | --- | --- |
| High-growth, high-demand field | Occupation (SOC code) or cluster appears on Ohio's Top Jobs list (In-Demand or Critical Jobs) or a regional demand analysis (Team NEO Aligning Opportunities) | `soc_code`, `demand_list_citation` |
| Path to social mobility | Entry roles reachable with a credential, associate, or bachelor's pay a family-sustaining wage for Cuyahoga County and the field has a visible advancement ladder | `entry_wage`, `wage_source`, `progression_example` |
| Real work of that field | Tasks observed or performed are the occupation's tasks, not generic chores or unrelated help | `position_description` reviewed by EXPLR |

`gate_status`: `pending | pass | fail`. Only `pass` opportunities get the EXPLR endorsement badge, appear in "featured" surfaces, or feed verified records. `fail` opportunities can be published as exposure with a visible "not EXPLR-endorsed" state. For 6-8, the gate applies to the field explored, not to the student's commitment to it.

## 5. Competency taxonomy (shared tag set)

One tag set across both sites. Anchor on the eight NACE competencies. Nest Ohio's 15 OhioMeansJobs-Readiness Seal skills under them for grades 9-12. Use grade-band descriptors so the same tag means something age-appropriate.

### NACE anchors (top level, both sites)

```
career_self_development
communication
critical_thinking
equity_inclusion
leadership
professionalism
teamwork
technology
growth_mindset_metacognition   // durable-skills addition, no NACE equivalent
```

### OMJ-Readiness Seal skills nested under NACE (9-12 only)

| NACE parent | OMJ seal skills (exact Ohio names) |
| --- | --- |
| career_self_development | Career Management; Learning Agility |
| communication | Oral and Written Communications |
| critical_thinking | Critical Thinking/Problem-Solving; Creativity/Innovation |
| equity_inclusion | Global/Intercultural Fluency |
| leadership | Leadership |
| professionalism | Drug Free; Reliability; Work Ethic; Punctuality; Discipline; Professionalism |
| teamwork | Teamwork/Collaboration |
| technology | Digital Technology |

Keep the Ohio names exactly as written so the Readiness Seal export matches the state form.

### Grade-band descriptors (what the tag means at each level)

| Tag | 6-8 (self-knowledge and exposure) | 9-12 (workplace readiness) | Undergrad (professional proficiency) |
| --- | --- | --- | --- |
| career_self_development | Interest and aptitude inventories (RIASEC), goal-setting, using career information | OMJ Career Management and Learning Agility; grade 6-12 advising plan | NACE; stackable credentials |
| communication | Presenting to adults at exploration events | OMJ Oral and Written Communications | NACE; AAC&U VALUE rubrics |
| teamwork | Collaboration in robotics and club teams | OMJ Teamwork/Collaboration | NACE; VALUE Teamwork |
| critical_thinking | Career-related project-based learning; responsible decision-making | OMJ Critical Thinking and Creativity | NACE; VALUE Critical Thinking, Problem Solving |
| professionalism | Responsibility, self-discipline, time management as classroom and club norms, not job norms | Six OMJ seal skills, mentor-validated | NACE; internships and co-ops as proving ground |
| leadership | Team roles, self-advocacy in diverse groups | OMJ Leadership; CTSO and team officer roles | NACE; sustained project leadership |
| equity_inclusion | Cultural awareness, social awareness | OMJ Global/Intercultural Fluency | NACE; VALUE Intercultural Knowledge |
| technology | Media and technology skills, emerging AI literacy | OMJ Digital Technology | NACE |
| growth_mindset_metacognition | Perseverance, managing transitions | OMJ Learning Agility; durable skills Metacognition, Fortitude | VALUE Lifelong Learning; NSSE Reflective and Integrative Learning |

### Rules

- **6-8 is never rated on workplace behavior.** Do not expose rubric ratings for professionalism, punctuality, or work ethic to middle school students or their mentors. Middle school outcomes are self-knowledge, exposure breadth, engagement, and STEM self-efficacy. Capture these as exposure counts, inventory results, and reflections, not ratings.
- **9-12 ratings use the four-level scale** Beginner, Developing, Proficient, Expert (matches the Ohio 4-H Readiness Seal evaluation tool). An even number of levels, level 3 is the proficiency bar. Store `rating_baseline` and `rating_final` per competency per experience.
- **Readiness Seal evidence** requires a skill shown across 2 of 3 settings (school, work, community), validated by 3+ distinct mentors. Every rating carries `setting` and `rater_id` so the seal export can prove both.
- **Undergrad surfaces leadership and professionalism first.** NACE's employer vs student data shows the largest proficiency gaps there (Leadership 31% vs 66%, Professionalism 50% vs 80%, Critical Thinking 56% vs 81%, Communication 54% vs 78%). Resume ordering and recruiter views should lead with verified evidence of those four.

## 6. Data model

Build one shared model behind both sites. Names below are suggestions; keep the relationships.

### Student (credential subject)

- `id`, `site` (k12 | undergrad), `school_or_institution`, `grade_or_year`, `date_of_birth` (for age and COPPA checks only; never displayed), `guardian_contact` (required under 18)
- `riasec_profile` (from the existing Pathways assessment)
- `career_plan` (grade 6-12 advising artifact; can serve as the district's ORC 3313.6020 documentation)
- Privacy: `visibility_default`, `media_consent_status`, `district_contract_id` (SB 29 scope)

### Opportunity (what an employer or org submits)

| Field group | Fields | Why |
| --- | --- | --- |
| Issuer identity | `org_name`, `site_address`, `industry_career_field` (Ohio's 17 career fields), `ein_or_verification_token`, `primary_contact` | Legitimacy of the issuer |
| Mentor | `mentor_name`, `mentor_title`, `mentor_email`, `mentor_phone`, `mentor_guidance_ack` | NACE qualified supervision; Ohio requires a main mentor |
| Classification | `stage`, `experience_type`, `ohio_formal_wbl`, `audience_grade_bands[]`, `min_age` | Routing, hours, labor checks |
| Work | `position_description`, `duties[]`, `no_displacement_attestation` | NACE; FLSA factor 6 |
| Learning | `learning_objectives[]`, `target_competencies[]` (from section 5; 9-12 must include seal skills) | Clear skill goals; mentor validation |
| Schedule | `start_date`, `end_date`, `weekly_schedule`, `total_hours`, `modality` (in_person, remote, hybrid) | Defined duration; 250-hour logic |
| Compensation | `compensation_type` (paid, stipend, credit, unpaid), `hourly_rate`, `w2`, `primary_beneficiary_attestation` (required if unpaid), `reimbursement_eligible[]` (hs_tech_internship, techcred) | Pay predicts outcomes; Ohio reimburses |
| Legal | `age_band_check`, `hours_within_limits`, `hazardous_occupation_checklist[]`, `workers_comp`, `liability_insurance`, `safety_training_plan` | Auto-run; see section 7 |
| Access | `capacity_slots`, `transportation_notes`, `accessibility_notes`, `inclusive_recruitment_flag` | Transportation is Ohio's top barrier |
| Commitments | `evaluation_commitment` (baseline and final rating via emailed link), `hours_confirmation_commitment` | One-link verification |
| Review | `gate_status`, `gate_evidence`, `explr_review_status`, `bac_or_district_alignment_flag` (K-12 placements) | EMIS requires BAC approval for non-CTE students |

### Experience (a student's participation in an Opportunity)

| Field | Why |
| --- | --- |
| `student_id`, `opportunity_id`, `issuer_org_id` | Provenance |
| `dates`, `verified_total_hours`, `experience_type`, `stage`, `compensation_type` | Hours toward 250; type decides seal eligibility |
| `role_title`, `duties_as_performed[]` | Resume line |
| `competency_ratings[]`: `{competency, omj_skill?, rating_baseline, rating_final, setting, rater_id, rated_at, comment}` | Two-review structure; comments required for ratings of 1 or 2 |
| `supervisor_attestation`: `{name, title, email, timestamp, method: unique_link_email, terms_accepted, comment}` | The verification mark depends on this |
| `school_cosign` (required under 18 or credit-bearing): `{name, role, timestamp}` | Ohio co-supervision principle |
| `student_reflection` (required, supplementary) | Never stands alone |
| `evidence_links[]` (portfolio pieces, employer evaluation) | Evidence field |
| `status`: draft, pending_supervisor, pending_school, verified, disputed, revoked | Credential status |
| `retention_until` (5-7 years) | State retention norms |

### Portfolio Piece

| Field | Why |
| --- | --- |
| `title`, `date_range`, `context` (course, placement, robotics team, hackathon, camp, personal) | Inside and outside classroom evidence |
| `artifact_type`: file, link, image, video, audio, `git_repo`, `cad_model`, `dataset`, `writing`, `design`, `build` | Products like GitHub and CAD are first-class |
| `artifacts[]` with `media_consent_flag` (required for any image, video, or audio of a minor) | COPPA treats child images as personal information |
| `competency_tags[]` (section 5) | Same tags everywhere |
| `reflection`: what I did, what I learned, how it connects to my goal | Reflection is the condition for ePortfolio impact |
| `reviewer_attestation` (teacher or supervisor approves, or returns with feedback); unreviewed pieces render as "self-reported" | Mastery Transcript rule |
| `linked_experience_id` (optional) | Bundling into CLR |
| `visibility` (student-controlled; guardian-controlled under 13 or where the district contract requires), `audience_log` | Learner-controlled privacy |

### Credit / Credential (resume "credits" section)

- `type`: industry_recognized_credential, dual_credit_ccp, diploma_seal, micro_credential, certificate, badge
- `issuer`, `issued_at`, `evidence_url`, `verification_method` (issuer-signed, document upload, self-reported)
- Ohio IRC list membership flag for 9-12 (separate lists for classes through 2029 and 2030+)

### Product (git, CAD, builds)

Treat as a Portfolio Piece with `artifact_type` in `{git_repo, cad_model, build, dataset, design}` plus structured metadata: repo URL and default branch, CAD file format and viewer link, bill of materials, and a `made_with` tag (tools and languages). Render inline previews where safe (README, STL/STEP viewer, image gallery). Products can be reviewer-attested like any other piece.

## 7. Verification and legal automation

### Verification flow (Handshake pattern; approvers need no account)

1. Student adds an Experience linked to an Opportunity and names the supervisor (prefilled from the Opportunity's mentor).
2. System emails the supervisor a unique link. Supervisor accepts terms, confirms hours and duties, completes the baseline and final competency ratings on the four-level scale, adds comments (required for low ratings), and submits. Rubric is prefilled from the Opportunity's target competencies to keep the burden to one link and one short form.
3. For students under 18 or credit-bearing experiences, a school or program contact co-signs the same way.
4. Status becomes `verified`. The record is frozen; later edits create a new version and clear the mark until re-attested.
5. Disputes and revocations set `credentialStatus` so exported badges fail verification.

### Legal checks (run at submission, never rely on employer knowledge)

- **Ages 14-15:** outside school hours only; max 3 hrs on a school day, 18 hrs in a school week, 8 and 40 on non-school days and weeks; 7 a.m. to 7 p.m. (9 p.m. June 1 through Labor Day); no manufacturing, power-driven machinery, construction, or warehousing.
- **Ages 16-17:** no federal hour limits; blocked from the 17 Hazardous Occupations Orders; enrolled student-learners in approved programs may get limited exemptions under a written agreement (flag, do not auto-approve).
- **Unpaid roles:** require the FLSA primary-beneficiary attestation (no expectation of pay, educational training, tied to coursework, fits the academic calendar, limited duration, complements rather than displaces staff, no job promise).
- **Apprenticeship:** reject if `min_age` < 16.
- Record `workers_comp` and `liability_insurance` as required fields for any placement with a minor.

### Rubric gate for promotion (from the Quality CCL Rubric)

Experiences EXPLR features as Gold Standard must pass the gate and score 3 or above on every rubric criterion for the grade band. Store `rubric_score_proposed` and `rubric_score_completed`; the post-completion score is the one that counts. Safety/supervision (6-8) and legal/safety compliance (9-12) are critical criteria: a 1 is sub-par regardless of total.

## 8. Ohio alignment outputs (one-click exports)

A student with verified records should be able to generate, from the resume page:

| Export | Logic | Source alignment |
| --- | --- | --- |
| **250-hour WBL log** | Sum `verified_total_hours` where `hours_count` is true, grade 9+, with positive supervisor evaluations; EMIS-ready format | ORC 3313.618 career-focused competency alternative |
| **OhioMeansJobs-Readiness Seal evidence** | For each of the 15 skills: ratings of Proficient or above, grouped by `setting`, with distinct `rater_id`s; flag skills meeting "2 of 3 settings" and "3+ mentors" | ORC 3313.6112 |
| **CMSD PACE success-plan artifact** | Count of job shadows (target 3-4), reflections, summer job or internship, career plan | Greater Cleveland Career Consortium |
| **OhioMeansJobs resume PDF** | Resume page rendered to the OMJ K-12 resume builder's structure | ODEW OhioMeansJobs K-12 |
| **Open Badges 3.0** | One AchievementCredential per verified Experience, issuer EXPLR, `credentialSubject`, `achievement` with criteria, `evidence[]`, `results[]` against the four-level scale, `credentialStatus` for revocation, signed (VC-JWT or Data Integrity) | 1EdTech Open Badges 3.0 |
| **CLR 2.0** | Bundle all signed credentials and reviewer endorsements into one learner-held record | 1EdTech CLR 2.0 |
| **NACE competency summary (undergrad)** | Verified evidence grouped under the eight NACE competencies, leadership and professionalism first | NACE |

Third parties must be able to verify an exported badge by signature without contacting EXPLR.

## 9. Privacy and compliance constraints

- **Ohio SB 29 (ORC 3319.325-.327):** if a district adopts Pathways, student records are the district's property; no sale, sharing, or commercial use (de-identified aggregates may improve the service); breach disclosure, districts notify parents within 72 hours; return or destroy records within 90 days of contract end; access limited to official duties. Build `district_contract_id` scoping and a return-or-destroy routine now.
- **COPPA:** photos, video, and audio of a child under 13 are personal information. School consent covers only the school's use. Student-published portfolio media for under-13s requires direct parental consent (`media_consent_status`).
- **FERPA consent for employer sharing:** any share of an under-18 record to an employer outside the verification flow is logged in `audience_log` and gated by consent.
- **Student ownership:** the student can export the full portfolio (CLR plus files) and keeps access after leaving school. SB 29 return-or-destroy applies to district-held records; the student-owned export is what makes the record portable.
- Age-of-majority and minor-labor checks use `date_of_birth`, which is never rendered.

## 10. Resume page behavior

- **Sections:** Verified Experiences, Exposure (awareness and exploration items, shadows, talks), Products, Credits and Credentials, Media, Competencies (verified ratings only), Career Plan (K-12), Reflections (visible to student and reviewers; student chooses whether to publish).
- **Verified mark** appears only on items with a frozen supervisor attestation. Self-reported items show a muted "self-reported" label; never hide them, never upgrade them.
- **Ordering:** undergrad leads with verified Leadership, Professionalism, Critical Thinking, Communication evidence. K-12 9-12 leads with Readiness Seal progress and hours toward 250. 6-8 leads with exploration breadth (fields explored, formats, professionals met) and RIASEC fit, with no behavior ratings anywhere.
- **Compensation badge** on opportunities and experiences; paid opportunities sort first by default on the undergrad site.
- **Gate badge** ("EXPLR-endorsed") only on `gate_status = pass`.

## 11. Design cautions (from the research)

1. Employer burden is the binding constraint: most employers host 1-5 trainees a year and supervision time is the barrier chosen by more than half. Keep verification to one emailed link and one prefilled rubric.
2. Transportation is the top Ohio barrier (about 80% of stakeholders); surface transportation and schedule fields prominently and allow filters on them.
3. Internship access gaps are real: 48% of seniors nationally have had one, with Black (36%), Hispanic (39%), and first-generation (41%) students lower. Track participation data disaggregated so EXPLR can see who the portal reaches.
4. Do not build features that make middle schoolers feel graded on workplace behavior. Exposure breadth and fit are the outcomes.
5. Draft district contract language to SB 29 before any CMSD or consortium pilot.
6. Perkins indicator 5S3 (share of CTE concentrators completing 250 hours) is the state's own measure; the hours log should be able to report in a form a district can use.

## 12. Key numbers for copy and onboarding (cite when used)

- Career academies: +11% earnings eight years later, no loss in attainment (MDRC, Kemple and Willner 2008).
- Each additional year of upper-level CTE: ~2% wage premium (Kreisman and Stange, NBER 2017).
- Number of career talks at ages 14-16 linearly predicts adult earnings (Kashefpakdel and Percy 2017, via AMLE).
- Girls in after-school robotics 3.4x more likely to take an engineering course (Burack et al. 2019, via AMLE).
- One internship cuts odds of underemployment one year out by 48.5%; paid internship associated with +$3,096 first-year wages; unpaid shows no gain (Strada / Burning Glass 2024; Strada 2022).
- 52% of bachelor's graduates underemployed one year out; 73% of those remain so a decade later (Talent Disrupted 2024).
- Ohio: about 40% of 2022-23 graduates met a readiness benchmark, under 1.5% through WBL; only 0.8% earned the Readiness Seal with 250+ hours (ExcelinEd / Ohio Excels 2024).
- Ohio HS Tech Internship: 75% of wages up to $5,000 per intern, $12+/hr W-2, 120+ hours, ages 19 and under.
- ePortfolios raised persistence (98% vs 88% at Queensborough) conditional on structured reflection (Watson, Kuh et al. 2016).

## 13. Sources

Full citations live in the Project document "Work-Based Learning and Career-Connected Learning: Research Foundations for EXPLR Pathways" (Oct 11, 2026). Primary anchors:

- Perkins V definitions: https://www.law.cornell.edu/uscode/text/20/2302
- Ohio DEW Work-Based Learning: https://education.ohio.gov/Topics/Career-Tech/Work-Based-Learning
- Ohio Employer Guide to WBL (2024): https://education.ohio.gov/getattachment/Topics/Career-Tech/Work-Based-Learning/Work-Based-Learning-for-Businesses-and-Communities/2024-Employer-Guide-to-Work-Based-Learning.pdf.aspx?lang=en-US
- Ohio WBL Agreement template: https://education.ohio.gov/getattachment/Topics/Career-Tech/Career-based-Intervention-CBI/CBI-Resources-and-Tools/Work-Based-Learning-Agreement.pdf.aspx?lang=en-US
- ORC 3313.618 (diploma), 3313.6112 (Readiness Seal), 3313.6020 (career advising), 3319.325-.326 (SB 29): https://codes.ohio.gov/ohio-revised-code
- OhioMeansJobs-Readiness Seal: https://education.ohio.gov/Topics/Ohio-s-Graduation-Requirements/Ohio%E2%80%99s-Graduation-Requirements/Graduation-Seals/OhioMeansJobs-Readiness-Seal
- Ohio 4-H Readiness Seal rubric: https://ohio4h.org/sites/ohio4h/files/imce/4H_Pathways/OMJ_ReadinessSeal_Combined.pdf
- Ohio Top Jobs: https://topjobs.ohio.gov/
- NACE competencies: https://www.naceweb.org/career-readiness/competencies/career-readiness-defined/
- NACE internship criteria: https://www.naceweb.org/internships/
- NACE proficiency gap: https://naceweb.org/career-readiness/competencies/the-gap-in-perceptions-of-new-grads-competency-proficiency-and-resources-to-shrink-it
- Advance CTE / ESG continuum: https://careertech.org/wp-content/uploads/2023/01/WBL-Report-FINAL.pdf
- JFF WBL Framework: https://jff.org/work-based-learning-framework
- DOL Fact Sheet 43 (minors): https://www.dol.gov/agencies/whd/fact-sheets/43-child-labor-non-agriculture
- DOL Fact Sheet 71 (unpaid internships): https://www.dol.gov/agencies/whd/fact-sheets/71-flsa-internships
- AIR WBL Measures (rubric design): https://air.org/sites/default/files/2024-07/WBLMeasures_Module3_Transcript.pdf
- 1EdTech Open Badges 3.0: https://www.imsglobal.org/spec/ob/v3p0/
- 1EdTech CLR 2.0: https://www.1edtech.org/standards/clr
- Handshake Experiences flow: https://support.joinhandshake.com/hc/en-us/articles/360021081654-Experiences-Emails
- Mastery Transcript Consortium: https://mastery.org/what-we-do/
- FTC COPPA FAQ: https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions
- Strada paid internship study: https://www.strada.org/news-insights/new-study-shows-paid-internships-boost-first-job-salaries-by-3000-and-student-confidence-about-their-careers
- Talent Disrupted 2024: https://stradaeducation.org/wp-content/uploads/2024/02/Talent-Disrupted-Exec-Summary.pdf
- ExcelinEd / Ohio Excels 2024: https://excelined.org/wp-content/uploads/2024/04/OH-Work-Based-Learning-REPORT-UPDATED.pdf
- AMLE middle-grades research summary: https://amle.org/?p=12928
- Watson, Kuh et al., ePortfolios (2016): https://eportfolios.capilanou.ca/wp-content/uploads/sites/4/2019/03/ePortfolios_Eleventh-High-Impact-Practice-IJEP_6.2.2016.pdf
