# EXPLR Assessment Battery — Implementation Guide

**For the team building digital versions of these surveys on the EXPLR pathways site.**

---

## What's in this bundle

| File | What it is | Use it when |
|------|------------|-------------|
| `1_EXPLR_Camp_Retrospective.docx` | Single-administration retrospective pre/post survey | One-week middle school camps |
| `2_EXPLR_Middle_School_Survey.docx` | Traditional pre/post (two administrations) | Multi-week middle school camps, or anywhere you want a true Day 1 baseline |
| `3_EXPLR_High_School_Internship_Survey.docx` | Pre/post for high school interns | All EXPLR internship placements |
| `4_EXPLR_Combined_All_Surveys.docx` | All three surveys in one document with Google Docs tab structure | When you want everything in one shareable file |
| `items.json` | Every survey item, scale, and scoring rule in a structured format | **Building digital versions** — parse this directly |
| `README.md` | This document | Building digital versions, training staff, onboarding new evaluators |

The DOCX files are the human-readable, printable references. The JSON is the source of truth for the digital implementation.

---

## Why these instruments

EXPLR camps and internships are designed to move students on four constructs that research consistently shows predict STEM persistence:

1. **STEM self-efficacy** — belief that one can succeed at math, science, and engineering tasks (the strongest single predictor in social cognitive career theory).
2. **STEM career interest and awareness** — knowing about STEM careers and being able to see oneself in one (leading indicator of later STEM major choice).
3. **21st-century learning skills** — collaboration, communication, problem-solving, persistence (what employers and grant funders ask about).
4. **Career decision self-efficacy** (high school only) — confidence in making concrete career decisions (the construct most sensitive to internship interventions).

Plus, for interns: **work-based learning quality** — whether the internship felt like real work, whether mentorship happened, whether it shifted the student's sense of future direction.

The battery is built around the **S-STEM Survey** (Friday Institute for Educational Innovation, 2012), the most widely-used and well-validated free instrument for evaluating informal STEM programs. Cronbach's alpha for the four attitude scales ranges from .89 to .91 — these are reliable measures. Career planning items for high school come from the standard 5-domain career decision self-efficacy framework via Falco & Summers (2019).

It complements (does not duplicate) your existing Holland code / RIASEC assessment. Holland codes tell you the type of work environment a student is drawn to. These surveys tell you whether the student believes they can do STEM work, whether they're interested in specific STEM clusters, and whether the program is moving the needle on either. Pair them.

---

## Scale system

Every item in the battery uses one of three response scales. The JSON encodes which scale each construct uses.

### `agreement_5pt` — Standard Likert (S-STEM attitude items, work-based learning items)
```
1 = Strongly Disagree
2 = Disagree
3 = Neither Agree nor Disagree
4 = Agree
5 = Strongly Agree
```

### `interest_4pt` — STEM career interest items
```
1 = Not at all Interested
2 = Not So Interested
3 = Interested
4 = Very Interested
```

### `confidence_5pt` — Career planning confidence items (high school only)
```
1 = Not at All Confident
2 = Slightly Confident
3 = Somewhat Confident
4 = Confident
5 = Totally Confident
```

---

## Reverse-coded items

Four items are worded negatively and must be reverse-scored before computing scale means. The `reverse_coded: true` flag in `items.json` identifies them. They are:

| Item ID | Construct | Item text |
|---------|-----------|-----------|
| `math_1` | Math | "Math has been my worst subject." |
| `math_3` | Math | "Math is hard for me." |
| `math_5` | Math | "I can handle most subjects well, but I cannot do a good job with math." |
| `science_8` | Science | "I can handle most subjects well, but I cannot do a good job with science." |

To reverse-code on a 5-point scale: `reversed = 6 - original`. Apply this before averaging items within a construct.

```javascript
function scoreConstruct(responses, items) {
  const values = items.map(item => {
    const raw = responses[item.id];
    return item.reverse_coded ? 6 - raw : raw;
  });
  return values.reduce((a, b) => a + b, 0) / values.length;
}
```

---

## ID code system

Students do not enter their name. Instead, they generate a code that they (or the device) can reproduce between pre and post administrations:

- First letter of mother's first name
- Day of the month they were born (1–31)
- First letter of the city they were born in

Example: a student whose mother is Karen, born on the 14th in Cleveland → **K14C**

**For the digital implementation, you have a better option than asking students to remember a code:** generate a random ID at first login and store it client-side (browser localStorage keyed to the device, or in the student's pathways-site account if they have one). This is more reliable than asking 5th graders to remember three pieces of trivia a week apart. The DOCX surveys retain the manual code for paper-fallback compatibility.

---

## The three survey flows

### Survey 1: One-week camp retrospective pre/post
- **Single administration** at the end of the last day of camp
- For each attitude item, ask the student to rate themselves twice: **"how I felt before camp" (THEN)** and **"how I feel right now" (NOW)**
- Career interest items: same dual-rating format
- This format avoids the response-shift problem that plagues short camps: on Day 1, students don't know what they don't know, so traditional pre scores are often inflated and the program looks ineffective.
- Trimmed to ~22 attitude items + 12 career interest items to keep it under 15 minutes despite the double ratings.
- **Response storage shape:** `{ then: 1-5, now: 1-5 }` per attitude item; `{ then: 1-4, now: 1-4 }` per career interest item.

### Survey 2: Middle school traditional pre/post
- **Two separate administrations**: PRE on Day 1, POST on the last day
- All 37 attitude items + 12 career interest items each administration
- Match PRE to POST using the student's ID code
- Use this format for longer programs, multi-week camps, or when you specifically want a true Day 1 baseline
- **Response storage shape:** `{ administration: "pre"|"post", responses: { item_id: 1-5 } }`

### Survey 3: High school internship pre/post
- **Two separate administrations**: PRE on Day 1, POST on the final day
- All S-STEM scales (37 attitude items) + 5 career planning confidence items + 12 STEM career interest items
- POST adds a 6-item "Your Internship Experience" block (work-based learning) — these are post-only
- **Response storage shape:** Same as Survey 2, with the WBL items appearing only when `administration === "post"`

---

## Recommended digital UX

Pulled from what works in K-12 informal STEM evaluation; pushback welcome where it conflicts with your platform's patterns.

1. **One construct per screen, items vertical.** Don't put 37 Likert items on one screen — students satisfice (pick a column and run down it). Group by construct (Math, Science, etc.) with the construct name as the screen header. Items vertical, one per row, with the 5 response circles horizontal.

2. **Progress indicator.** "Page 3 of 7" or a progress bar. Survey length is a known drop-off driver, and students perceive a 49-item survey as much longer when they don't know how close they are to the end.

3. **No required fields beyond demographics.** Let students skip individual items. Forced-response on Likert items inflates completion rates but degrades data quality (students click anything to advance). Treat skipped items as missing in scoring.

4. **For the retrospective survey**, lay out THEN and NOW side-by-side per item on each screen. The DOCX version shows the column structure to mimic — students need to see both rating tracks together to make a coherent comparison. Don't ask all THEN ratings first and all NOW ratings second; the cognitive task is "compare for this item" not "remember a whole prior state."

5. **Engineering paragraph stays.** The S-STEM has a required preamble before the Engineering and Technology section ("Engineers use math, science, and creativity..."). Render this on the screen, before the items, in the same place every time. It's part of the validated instrument; removing it changes what you're measuring.

6. **STEM career descriptions stay.** Each of the 12 career interest items has a description of what the field is plus example jobs. These are not optional flavor text — they're how the instrument anchors student interpretation. Show them next to or above the rating, not in a tooltip the student can ignore.

7. **Open-ended responses optional.** The three open-ended questions at the end of the post survey are valuable for qualitative analysis but should not block submission. Provide a "Skip" or treat them as optional.

8. **Mobile-friendly.** Many CMSD students will complete this on a phone. The DOCX layout assumes 8.5×11; your digital layout should reflow for ~375px width. Likert circles need to be tap-target sized (44px+ per Apple HIG / 48dp+ per Material).

9. **Save partial progress.** A 15-20 minute survey is long for a 5th grader. Auto-save after each screen so a student who gets pulled away can return without restarting.

10. **Confirmation screen.** End with a "Thanks, you're done" screen, not a redirect. Students often want to know they actually finished.

---

## Suggested data schema

Below is a starting point for storing responses. Adapt to your existing Supabase tables.

```sql
-- One row per survey administration per student
CREATE TABLE survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),       -- or anonymous ID code as TEXT
  program_id UUID REFERENCES programs(id),       -- which camp or internship
  survey_type TEXT NOT NULL,                     -- 'retrospective' | 'middle_school' | 'high_school'
  administration TEXT NOT NULL,                  -- 'pre' | 'post' | 'retrospective'
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  device_type TEXT                               -- 'mobile' | 'tablet' | 'desktop' (for QA)
);

-- One row per item response
CREATE TABLE item_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_response_id UUID REFERENCES survey_responses(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,                         -- matches the 'id' field in items.json
  value_now INTEGER,                             -- 1-5 or 1-4
  value_then INTEGER,                            -- only for retrospective surveys
  skipped BOOLEAN NOT NULL DEFAULT false
);

-- One row per open-ended response
CREATE TABLE open_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_response_id UUID REFERENCES survey_responses(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  response TEXT
);

-- Optional: computed scale scores (refresh after each completed survey)
CREATE MATERIALIZED VIEW scale_scores AS
SELECT
  sr.id AS survey_response_id,
  sr.student_id,
  sr.program_id,
  sr.administration,
  AVG(CASE WHEN i.item_id LIKE 'math_%' AND NOT i.skipped
    THEN (CASE WHEN i.item_id IN ('math_1','math_3','math_5') THEN 6 - i.value_now ELSE i.value_now END)
  END) AS math_mean,
  AVG(CASE WHEN i.item_id LIKE 'science_%' AND NOT i.skipped
    THEN (CASE WHEN i.item_id = 'science_8' THEN 6 - i.value_now ELSE i.value_now END)
  END) AS science_mean,
  AVG(CASE WHEN i.item_id LIKE 'engtech_%' AND NOT i.skipped THEN i.value_now END) AS engtech_mean,
  AVG(CASE WHEN i.item_id LIKE 'c21_%' AND NOT i.skipped THEN i.value_now END) AS c21_mean,
  AVG(CASE WHEN i.item_id LIKE 'career_%' AND NOT i.skipped AND i.item_id NOT LIKE 'career_planning_%'
    THEN i.value_now END) AS career_interest_mean,
  AVG(CASE WHEN i.item_id LIKE 'career_planning_%' AND NOT i.skipped THEN i.value_now END) AS career_planning_mean,
  AVG(CASE WHEN i.item_id LIKE 'wbl_%' AND NOT i.skipped THEN i.value_now END) AS wbl_mean
FROM survey_responses sr
LEFT JOIN item_responses i ON i.survey_response_id = sr.id
GROUP BY sr.id, sr.student_id, sr.program_id, sr.administration;
```

For the retrospective survey, store both `value_now` and `value_then`. For traditional pre/post, only `value_now` is used (the "administration" field captures whether it's the pre or the post).

---

## Scoring and analysis

### Computing scale scores

For each completed survey administration, compute one mean score per construct:

```python
def score_construct(responses: dict, items: list) -> float | None:
    """
    responses: { item_id: 1-5 or 1-4 }
    items: list of item dicts from items.json
    Returns mean score, or None if no valid responses.
    """
    values = []
    for item in items:
        raw = responses.get(item["id"])
        if raw is None:
            continue
        values.append(6 - raw if item["reverse_coded"] else raw)
    return sum(values) / len(values) if values else None
```

### Pre/post comparison

For matched pre-post pairs (same student ID across both administrations):

```python
from scipy import stats

def construct_change(pre_scores: list[float], post_scores: list[float]):
    """
    Inputs: paired lists of scale scores (same students, same construct, pre vs post).
    Returns dict with paired-samples t-test results and Cohen's d.
    """
    t_stat, p_val = stats.ttest_rel(post_scores, pre_scores)
    diffs = [post - pre for post, pre in zip(post_scores, pre_scores)]
    mean_diff = sum(diffs) / len(diffs)
    sd_diff = (sum((d - mean_diff) ** 2 for d in diffs) / (len(diffs) - 1)) ** 0.5
    cohens_d = mean_diff / sd_diff if sd_diff > 0 else 0
    return {
        "n": len(diffs),
        "mean_change": mean_diff,
        "t": t_stat,
        "p": p_val,
        "cohens_d": cohens_d
    }
```

### Cohen's d interpretation
- **0.2** — small effect
- **0.5** — medium effect
- **0.8** — large effect

Most well-designed STEM camp interventions produce small-to-medium effects (d = 0.2 to 0.5) on self-efficacy and career interest. Effects above 0.5 are notable; above 0.8 should be double-checked for response inflation or sample bias.

### Disaggregation

Always look at subgroup patterns, not just aggregate change. Slice by:
- Grade (5/6 vs 7/8 vs 9–12)
- Gender (when self-reported and large enough to be non-identifying)
- Prior STEM experience (yes/no responses to "Do you know adults working in STEM?")
- For internships: placement site
- Pre-survey baseline level (high-baseline students often show ceiling effects)

For small samples (n < 30), prefer non-parametric tests (Wilcoxon signed-rank) and report effect sizes with confidence intervals rather than relying on p-values.

---

## Common pitfalls

- **Ceiling effects.** Self-selected camp populations often already love STEM, so pre-survey scores cluster at 4–5. They have nowhere to grow on the post. Watch for this in the data; report the change for low-baseline students separately.

- **Confusing "Strongly Agree" patterns.** On a paper survey, students sometimes pick one column and run down it. On a digital survey, watch for response patterns where 90%+ of items get the same value — this is acquiescence bias and you should flag those responses (don't necessarily exclude — just note them).

- **Reverse-coded items confusion.** The four reverse-coded items mean that a student who "Strongly Agrees" with "Math is hard for me" has LOW math self-efficacy, not high. Apply the reverse-coding BEFORE computing means. Sanity check: after reverse-coding, all items within a construct should correlate positively with each other.

- **Don't compute item-level pre-post changes for reporting.** The S-STEM is validated at the construct level. Item-level analysis is fine for diagnostic purposes (e.g., spotting items the camp didn't address) but should not be reported as a standalone finding.

- **Don't drop the engineering preamble.** The text "Engineers use math, science, and creativity..." appears before the engineering items in the validated instrument. Keep it in the digital version, in the same place, every time.

---

## Sources and citations

- **S-STEM Survey items:** Friday Institute for Educational Innovation. (2012). *Middle and High School STEM-Student Survey.* Raleigh, NC: Author. Reproduced under the Friday Institute's terms permitting use, modification, and redistribution for educational, non-commercial purposes with attribution.
- **S-STEM psychometric validation:** Unfried, A., Faber, M., Stanhope, D. S., & Wiebe, E. (2015). The development and validation of a measure of student attitudes toward science, technology, engineering, and math (S-STEM). *Journal of Psychoeducational Assessment, 33*(7), 622–639.
- **Career decision self-efficacy framework:** Falco, L. D., & Summers, J. J. (2019). Improving career decision self-efficacy and STEM self-efficacy in high school girls: Evaluation of an intervention. *Journal of Career Development, 46*(1), 62–76.
- **Social cognitive career theory (theoretical foundation):** Lent, R. W., Brown, S. D., & Hackett, G. (1994). Toward a unifying social cognitive theory of career and academic interest, choice, and performance. *Journal of Vocational Behavior, 45*(1), 79–122.
- **STEM career interest as predictor:** Sadler, P. M., Sonnert, G., Hazari, Z., & Tai, R. (2012). Stability and volatility of STEM career interest in high school: A gender study. *Science Education, 96*(3), 411–427.

---

## Questions or refinements

This battery is designed to be modular. If a specific camp doesn't use math (e.g., FashionForge, where the math content is light), you can drop the math scale and report on the other four — but document the drop so year-over-year comparisons stay honest. If a future camp pulls in additional content like data science or biotech, the existing scales still cover the construct-level changes you care about.

For internship sites, the work-based learning items can be expanded to ask placement-specific questions, but keep the core 6 stable so cross-site comparisons remain possible.

— Prepared for EXPLR K12 Robotics and Work-Based Learning · Cleveland State University × MAGNET
