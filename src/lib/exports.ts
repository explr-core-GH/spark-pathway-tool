import { COMPETENCIES, OMJ_SKILLS, RATING_LEVELS } from "@/lib/competencies";
import { HOURS_TARGET, type Experience, type Passport } from "@/lib/passport";
import { EXPERIENCE_TYPE_BY_KEY, STAGES, hoursCount } from "@/lib/wbl-taxonomy";

/**
 * Ohio alignment exports (spec section 8), generated in the browser from the
 * passport. Verified records only: the 250-hour log and seal evidence never
 * include a self-reported item.
 *
 *   - 250-hour WBL log (CSV + PDF): verified formal-WBL hours, grade 9+,
 *     EMIS-ready columns.
 *   - OhioMeansJobs-Readiness Seal evidence (PDF): the 15 skills with every
 *     Proficient-or-better rating, its setting and rater, and the
 *     "2 of 3 settings / 3+ mentors" flags.
 *   - Resume (PDF + plain text for the OMJ K-12 resume builder).
 *   - Open Badges 3.0 (JSON): one AchievementCredential per verified
 *     experience. Unsigned until an issuer key is configured server-side;
 *     the file says so.
 */

const fmt = (d: string | null | undefined) =>
  d
    ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

function download(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ── 250-hour log ───────────────────────────────────────────────────────────

export type HoursRow = {
  title: string;
  organization: string;
  type: string;
  stage: string;
  start: string;
  end: string;
  hours: number;
  counts: boolean;
  verifiedBy: string;
  verifiedOn: string;
};

export function hoursLogRows(p: Passport): HoursRow[] {
  return p.experiences
    .filter((e) => e.status === "verified")
    .map((e) => ({
      title: e.title,
      organization: e.organization ?? "",
      type: EXPERIENCE_TYPE_BY_KEY[e.experience_type]?.label ?? e.experience_type,
      stage: STAGES[e.stage].label,
      start: e.start_date ?? "",
      end: e.end_date ?? "",
      hours: Number(e.verified_hours ?? e.hours ?? 0),
      counts: hoursCount(e.experience_type, p.grade, e.status),
      verifiedBy: e.supervisor_name ?? "",
      verifiedOn: e.verified_at ?? "",
    }));
}

export function downloadHoursLogCsv(p: Passport) {
  const rows = hoursLogRows(p);
  const head = [
    "Student",
    "Grade",
    "Experience",
    "Organization",
    "Type",
    "Stage",
    "Start",
    "End",
    "Verified hours",
    "Counts toward 250",
    "Verified by",
    "Verified on",
  ];
  const lines = [head.join(",")];
  for (const r of rows) {
    lines.push(
      [
        p.firstName,
        p.grade ?? "",
        r.title,
        r.organization,
        r.type,
        r.stage,
        r.start,
        r.end,
        r.hours,
        r.counts ? "yes" : "no",
        r.verifiedBy,
        r.verifiedOn.slice(0, 10),
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  lines.push(
    [
      "",
      "",
      "TOTAL counting toward 250",
      "",
      "",
      "",
      "",
      "",
      Math.round(p.verifiedHours * 10) / 10,
      "",
      "",
      "",
    ]
      .map(csvEscape)
      .join(","),
  );
  download(
    `explr-wbl-hours-${p.firstName.toLowerCase()}.csv`,
    new Blob([lines.join("\n")], { type: "text/csv" }),
  );
}

type Doc = {
  text: (s: string | string[], x: number, y: number, opts?: Record<string, unknown>) => void;
  setFontSize: (n: number) => void;
  setFont: (f: string, s?: string) => void;
  addPage: () => void;
  splitTextToSize: (s: string, w: number) => string[];
  save: (name: string) => void;
  setDrawColor: (r: number, g?: number, b?: number) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  internal: { pageSize: { getHeight: () => number } };
};

async function newDoc(): Promise<Doc> {
  const { jsPDF } = await import("jspdf");
  return new jsPDF({ unit: "pt", format: "letter" }) as unknown as Doc;
}

class Writer {
  y = 54;
  constructor(private d: Doc) {}
  private pageBreak(need = 40) {
    if (this.y + need > this.d.internal.pageSize.getHeight() - 48) {
      this.d.addPage();
      this.y = 54;
    }
  }
  h1(s: string) {
    this.pageBreak(40);
    this.d.setFont("helvetica", "bold");
    this.d.setFontSize(18);
    this.d.text(s, 54, this.y);
    this.y += 26;
  }
  h2(s: string) {
    this.pageBreak(30);
    this.d.setFont("helvetica", "bold");
    this.d.setFontSize(12);
    this.d.text(s, 54, this.y);
    this.y += 18;
  }
  p(s: string, size = 10) {
    this.d.setFont("helvetica", "normal");
    this.d.setFontSize(size);
    const lines = this.d.splitTextToSize(s, 504);
    for (const l of lines) {
      this.pageBreak(14);
      this.d.text(l, 54, this.y);
      this.y += size * 1.35;
    }
  }
  small(s: string) {
    this.p(s, 8.5);
  }
  rule() {
    this.pageBreak(12);
    this.d.setDrawColor(200);
    this.d.line(54, this.y, 558, this.y);
    this.y += 12;
  }
  gap(n = 8) {
    this.y += n;
  }
}

export async function downloadHoursLogPdf(p: Passport) {
  const d = await newDoc();
  const w = new Writer(d);
  w.h1(`Work-based learning hours log · ${p.firstName}`);
  w.small(
    `EXPLR Pathways · grade ${p.grade ?? "?"} · generated ${fmt(new Date().toISOString())} · Ohio Revised Code 3313.618, 250-hour option`,
  );
  w.gap();
  w.p(
    `Verified hours counting toward 250: ${Math.round(p.verifiedHours * 10) / 10} of ${HOURS_TARGET}. Only Ohio's formal work-based learning types, in grade 9 or later, verified by a supervisor through EXPLR's attestation link, are counted. Exposure items are listed for context and do not count.`,
  );
  w.gap(4);
  w.rule();
  const rows = hoursLogRows(p);
  if (rows.length === 0) w.p("No verified experiences yet.");
  for (const r of rows) {
    w.h2(`${r.title}${r.organization ? ` · ${r.organization}` : ""}`);
    w.p(
      `${r.type} · ${r.stage} · ${[fmt(r.start), fmt(r.end)].filter(Boolean).join(" to ")} · ${r.hours} verified hours · ${r.counts ? "COUNTS toward 250" : "does not count (exposure or pre-grade-9)"}`,
    );
    w.small(
      `Verified by ${r.verifiedBy || "supervisor"} on ${fmt(r.verifiedOn)} via emailed attestation link.`,
    );
    w.gap(6);
  }
  d.save(`explr-wbl-hours-${p.firstName.toLowerCase()}.pdf`);
}

// ── Readiness Seal evidence ────────────────────────────────────────────────

export async function downloadSealEvidencePdf(p: Passport) {
  const d = await newDoc();
  const w = new Writer(d);
  w.h1(`OhioMeansJobs-Readiness Seal evidence · ${p.firstName}`);
  w.small(
    `EXPLR Pathways · grade ${p.grade ?? "?"} · generated ${fmt(new Date().toISOString())} · ORC 3313.6112. Each skill needs Proficient or better in 2 of 3 settings (school, work, community) from 3 or more distinct mentors. Ratings below come only from supervisor attestations on verified experiences; nothing is self-rated.`,
  );
  w.gap();
  w.p(
    `${p.skillsProficient} of ${OMJ_SKILLS.length} skills rated Proficient or better · ${p.sealReadyCount} meet the seal's settings-and-mentors rule.`,
  );
  w.rule();
  const byId = new Map(p.experiences.map((e) => [e.id, e]));
  const verified = new Set(p.experiences.filter((e) => e.status === "verified").map((e) => e.id));
  for (const c of COMPETENCIES.filter((c) => c.omjSkills.length)) {
    w.h2(c.label);
    for (const skill of c.omjSkills) {
      const s = p.seal.find((x) => x.skill === skill);
      const rts = p.ratings.filter((r) => r.omj_skill === skill && verified.has(r.experience_id));
      const best = s?.best ? RATING_LEVELS[s.best - 1] : "not rated";
      w.p(
        `${skill}: ${best}${s?.sealReady ? " · SEAL-READY" : ""}${rts.length ? ` · ${rts.length} rating${rts.length === 1 ? "" : "s"}` : ""}`,
      );
      for (const r of rts) {
        const e = byId.get(r.experience_id) as Experience | undefined;
        w.small(
          `  ${RATING_LEVELS[r.rating_final - 1]} · ${r.setting} · ${r.rater_name}${r.rater_email ? ` <${r.rater_email}>` : ""} · ${fmt(r.rated_at)} · ${e?.title ?? ""}${e?.organization ? `, ${e.organization}` : ""}${r.comment ? ` · "${r.comment}"` : ""}`,
        );
      }
    }
    w.gap(4);
  }
  d.save(`explr-readiness-seal-${p.firstName.toLowerCase()}.pdf`);
}

// ── Resume ─────────────────────────────────────────────────────────────────

export type ResumeExtras = {
  fullName?: string;
  email?: string;
  phone?: string;
  highSchool?: string;
  gradYear?: number | null;
  careerAspiration?: string;
};

export function resumeText(p: Passport, x: ResumeExtras = {}): string {
  const lines: string[] = [];
  lines.push(x.fullName ?? p.firstName);
  const contact = [x.email, x.phone].filter(Boolean).join(" · ");
  if (contact) lines.push(contact);
  if (x.highSchool) lines.push(`${x.highSchool}${x.gradYear ? ` · Class of ${x.gradYear}` : ""}`);
  lines.push("");
  const about = p.aboutMe?.trim();
  if (about || x.careerAspiration) {
    lines.push("SUMMARY");
    lines.push(about ?? `Aiming for ${x.careerAspiration}.`);
    lines.push("");
  }
  const verified = p.work.filter((e) => e.status === "verified");
  const other = p.work.filter((e) => e.status !== "verified");
  if (verified.length) {
    lines.push("VERIFIED EXPERIENCE");
    for (const e of verified) {
      lines.push(
        `${e.role_title ?? e.title} · ${e.organization ?? ""} · ${[fmt(e.start_date), fmt(e.end_date)].filter(Boolean).join(" to ")}${e.verified_hours ? ` · ${e.verified_hours} hrs` : ""}`,
      );
      if (e.duties) lines.push(`  ${e.duties}`);
      lines.push(`  Verified by ${e.supervisor_name ?? "supervisor"} (EXPLR Pathways)`);
    }
    lines.push("");
  }
  if (other.length) {
    lines.push("OTHER EXPERIENCE");
    for (const e of other) {
      lines.push(
        `${e.role_title ?? e.title} · ${e.organization ?? ""} · ${[fmt(e.start_date), fmt(e.end_date)].filter(Boolean).join(" to ")}`,
      );
      if (e.duties) lines.push(`  ${e.duties}`);
    }
    lines.push("");
  }
  const skills = p.seal
    .filter((s) => (s.best ?? 0) >= 3)
    .map((s) => `${s.skill} (${RATING_LEVELS[(s.best ?? 1) - 1]}, supervisor-rated)`);
  if (skills.length) {
    lines.push("SKILLS · OhioMeansJobs-Readiness Seal");
    lines.push(skills.join("; "));
    lines.push("");
  }
  if (p.credentials.length) {
    lines.push("CREDENTIALS & CREDIT");
    for (const c of p.credentials)
      lines.push(
        `${c.title}${c.issuer ? ` · ${c.issuer}` : ""}${c.issued_at ? ` · ${fmt(c.issued_at)}` : ""}${c.credits ? ` · ${c.credits} credits` : ""}${c.verification_method === "self_reported" ? " (self-reported)" : ""}`,
      );
    lines.push("");
  }
  if (p.exposure.length) {
    lines.push("CAREER EXPLORATION");
    lines.push(
      p.exposure
        .map(
          (e) =>
            `${EXPERIENCE_TYPE_BY_KEY[e.experience_type]?.label ?? e.experience_type}: ${e.organization ?? e.title}`,
        )
        .join("; "),
    );
    lines.push("");
  }
  if (p.pieces.length) {
    lines.push("PORTFOLIO");
    for (const pc of p.pieces)
      lines.push(
        `${pc.title}${pc.context ? ` · ${pc.context}` : ""}${pc.url ? ` · ${pc.url}` : ""}`,
      );
    lines.push("");
  }
  if (p.hollandCode) lines.push(`Interest profile (RIASEC): ${p.hollandCode}`);
  return lines.join("\n");
}

export function downloadResumeText(p: Passport, x: ResumeExtras = {}) {
  download(
    `explr-resume-${p.firstName.toLowerCase()}.txt`,
    new Blob([resumeText(p, x)], { type: "text/plain" }),
  );
}

export async function downloadResumePdf(p: Passport, x: ResumeExtras = {}) {
  const d = await newDoc();
  const w = new Writer(d);
  const text = resumeText(p, x);
  const [name, ...rest] = text.split("\n");
  w.h1(name);
  for (const line of rest) {
    if (/^[A-Z &·-]+$/.test(line.trim()) && line.trim().length > 3) w.h2(line.trim());
    else if (line.trim() === "") w.gap(4);
    else w.p(line.replace(/^ {2}/, "   "));
  }
  w.gap(10);
  w.small(
    "Generated by EXPLR Pathways. Items marked verified were confirmed by a named supervisor through an attestation link the student cannot edit.",
  );
  d.save(`explr-resume-${p.firstName.toLowerCase()}.pdf`);
}

// ── Open Badges 3.0 (unsigned draft) ───────────────────────────────────────

export function openBadges(p: Passport, origin: string) {
  const verified = p.experiences.filter((e) => e.status === "verified");
  const creds = verified.map((e) => {
    const rts = p.ratings.filter((r) => r.experience_id === e.id);
    return {
      "@context": [
        "https://www.w3.org/ns/credentials/v2",
        "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
      ],
      type: ["VerifiableCredential", "OpenBadgeCredential"],
      issuer: { id: `${origin}/issuer`, type: ["Profile"], name: "EXPLR Pathways" },
      validFrom: e.verified_at,
      name: e.title,
      credentialSubject: {
        type: ["AchievementSubject"],
        achievement: {
          type: ["Achievement"],
          name: e.title,
          description: e.duties ?? "",
          criteria: {
            narrative: `Completed ${e.verified_hours ?? e.hours ?? 0} verified hours as ${e.role_title ?? "a participant"}${e.organization ? ` at ${e.organization}` : ""}; attested by ${e.supervisor_name ?? "a supervisor"}.`,
          },
          achievementType: "LearningCertificate",
          resultDescription: rts.map((r) => ({
            type: ["ResultDescription"],
            name: r.omj_skill ?? r.competency,
            resultType: "RubricCriterionLevel",
            allowedValue: RATING_LEVELS,
          })),
        },
        result: rts.map((r) => ({
          type: ["Result"],
          achievedLevel: RATING_LEVELS[r.rating_final - 1],
          resultDescription: r.omj_skill ?? r.competency,
        })),
      },
      evidence: [
        {
          type: ["Evidence"],
          name: "Supervisor attestation",
          description: `${e.supervisor_name ?? "Supervisor"} confirmed hours and duties on ${fmt(e.verified_at)} via EXPLR's one-link attestation.`,
        },
      ],
      credentialStatus: { type: "1EdTechRevocationList" },
      "x-explr-unsigned":
        "Draft: this credential is not yet signed. EXPLR signs badges server-side once an issuer key is configured; third parties cannot verify this file by signature until then.",
    };
  });
  return creds;
}

export function downloadOpenBadges(p: Passport) {
  const creds = openBadges(
    p,
    typeof window === "undefined" ? "https://explrpathways.org" : window.location.origin,
  );
  download(
    `explr-open-badges-${p.firstName.toLowerCase()}.json`,
    new Blob([JSON.stringify(creds, null, 2)], { type: "application/json" }),
  );
}

// ── Student Success Plan (Ohio Model SSP order) ────────────────────────────

export type SspTask = {
  key: string;
  label: string;
  status: string;
  payload?: Record<string, unknown> | null;
};

export type SspInput = {
  schoolYear: string;
  goals: Array<{
    grade: number | null;
    primary_goal: string;
    secondary_goal: string | null;
    cluster: string | null;
    post_hs_plan: string | null;
    changed_since_last: boolean | null;
    why: string | null;
  }>;
  checkpoints: Array<{
    term: string;
    grade: number;
    status: string;
    submitted_at: string | null;
    advisor_notes: string | null;
    tasks: SspTask[];
  }>;
  checklist: Array<{ item_no: number; checked_at: string | null; comment: string | null }>;
  checklistText: Array<{ no: number; text: string }>;
  approval: {
    student_ack_at: string | null;
    guardian_ack_at: string | null;
    advisor_ack_at: string | null;
  } | null;
  postHsLabels: Record<string, string>;
  extras?: ResumeExtras & { email?: string };
};

function payloadText(p: Record<string, unknown> | null | undefined): string {
  if (!p) return "";
  return Object.entries(p)
    .filter(([, v]) => v !== null && v !== undefined && v !== "" && v !== false)
    .map(([k, v]) => {
      const label = k.replace(/_/g, " ");
      if (Array.isArray(v)) return `${label}: ${v.join(", ")}`;
      if (typeof v === "object") return `${label}: ${JSON.stringify(v)}`;
      return `${label}: ${String(v)}`;
    })
    .join(" · ");
}

const PLAN_KEYS = [
  "course_plan",
  "elective_plan",
  "hs_pathway_choice",
  "credential_program_review",
];
const ASSESS_KEYS = [
  "learning_style_survey",
  "strengths_inventory",
  "work_values",
  "career_profile",
];
const TRANSITION_KEYS = [
  "postsecondary_search",
  "college_admission_research",
  "financing_plan",
  "application_tracker",
  "transition_plan",
  "test_prep_plan",
];

/**
 * Student Success Plan PDF: Ohio's forms in Ohio's order — Contact, Career
 * Pathway Organizer, Academic Pathway Plan, Assessment Record, Career
 * Readiness Skills, Career Exploration Activities, Additional Learning
 * Activities, Transitions, Planning Checklist, Approval. One PDF per school
 * year, built from the passport plus this year's checkpoints.
 */
export async function downloadStudentSuccessPlanPdf(p: Passport, s: SspInput) {
  const d = await newDoc();
  const w = new Writer(d);
  const name = s.extras?.fullName ?? p.firstName;
  const signed = (v: string | null | undefined) => (v ? `signed ${fmt(v)}` : "not yet signed");
  const tasksWhere = (keys: string[]) =>
    s.checkpoints.flatMap((c) => c.tasks.filter((t) => keys.includes(t.key)));
  const taskLines = (tasks: SspTask[], empty: string) => {
    if (tasks.length === 0) w.p(empty);
    for (const t of tasks) {
      w.p(`${t.label}: ${t.status === "done" ? "done" : t.status}`);
      const txt = payloadText(t.payload);
      if (txt) w.small(`  ${txt}`);
    }
  };

  w.h1(`Student Success Plan · ${name}`);
  w.small(
    `EXPLR Pathways · school year ${s.schoolYear} · grade ${p.grade ?? "?"} · generated ${fmt(new Date().toISOString())} · follows Ohio's Model Student Success Plan (ORC 3313.6020)`,
  );
  w.rule();

  w.h2("1. Contact information");
  w.p(
    [
      `Name: ${name}`,
      `Grade: ${p.grade ?? "—"}`,
      s.extras?.highSchool ? `School: ${s.extras.highSchool}` : null,
      s.extras?.gradYear ? `Graduation year: ${s.extras.gradYear}` : null,
      s.extras?.email ? `Email: ${s.extras.email}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
  );
  w.small("Home address and phone are kept by the district, not EXPLR Pathways.");
  w.gap(6);

  w.h2("2. Career pathway goals");
  if (s.goals.length === 0) w.p("No career goal recorded this year.");
  for (const g of s.goals) {
    w.p(
      `Grade ${g.grade ?? p.grade ?? "—"}: ${g.primary_goal}${g.secondary_goal ? ` (also considering ${g.secondary_goal})` : ""}${g.cluster ? ` · cluster: ${g.cluster}` : ""}`,
    );
    w.small(
      `After high school: ${g.post_hs_plan ? (s.postHsLabels[g.post_hs_plan] ?? g.post_hs_plan) : "not chosen"} · changed since last year: ${g.changed_since_last === null ? "—" : g.changed_since_last ? "yes" : "no"}${g.why ? ` · why: ${g.why}` : ""}`,
    );
  }
  w.gap(6);

  w.h2("3. Academic pathway plan");
  taskLines(tasksWhere(PLAN_KEYS), "No course plan recorded this year.");
  w.gap(6);

  w.h2("4. Assessment record");
  w.p(
    `Career interests: EXPLR RIASEC interest assessment · ${p.hollandCode ? `Holland code ${p.hollandCode}` : "not yet completed"}`,
  );
  taskLines(tasksWhere(ASSESS_KEYS), "");
  w.gap(6);

  w.h2("5. Career readiness skills (OhioMeansJobs-Readiness Seal)");
  const rated = p.seal.filter((x) => x.best !== null);
  if (rated.length === 0) w.p("No supervisor ratings yet.");
  for (const x of rated) {
    w.p(
      `${x.skill}: ${RATING_LEVELS[(x.best ?? 1) - 1]} · ${x.settings.size} setting${x.settings.size === 1 ? "" : "s"} · ${x.raters.size} rater${x.raters.size === 1 ? "" : "s"}${x.sealReady ? " · seal-ready" : ""}`,
    );
  }
  for (const t of tasksWhere(["competency_self_rating"]).filter((t) => t.payload))
    w.small(`  Self-description: ${payloadText(t.payload)}`);
  w.gap(6);

  w.h2("6. Career exploration activities");
  if (p.experiences.length === 0) w.p("No experiences logged yet.");
  for (const e of p.experiences) {
    const dates = [fmt(e.start_date), fmt(e.end_date)].filter(Boolean).join(" to ");
    const status =
      e.status === "verified"
        ? `verified${e.verified_hours != null ? ` (${e.verified_hours} h)` : ""}`
        : e.status.replace(/_/g, " ");
    w.p(
      `${e.title}${e.organization ? ` · ${e.organization}` : ""} · ${EXPERIENCE_TYPE_BY_KEY[e.experience_type]?.label ?? e.experience_type} · ${STAGES[e.stage].label} · ${dates}${e.hours != null ? ` · ${e.hours} h` : ""} · ${status}`,
    );
    if (e.reflection) w.small(`  Reflection: ${e.reflection}`);
  }
  w.gap(6);

  w.h2("7. Additional learning activities");
  if (p.credentials.length === 0 && p.pieces.length === 0) w.p("None recorded yet.");
  for (const c of p.credentials) {
    w.p(
      `${c.title}${c.issuer ? ` · ${c.issuer}` : ""}${c.issued_at ? ` · ${fmt(c.issued_at)}` : ""}${c.credits ? ` · ${c.credits} credits` : ""} · ${c.type.replace(/_/g, " ")} · ${c.verification_method.replace(/_/g, " ")}`,
    );
  }
  for (const pc of p.pieces) w.p(`Portfolio: ${pc.title}${pc.context ? ` · ${pc.context}` : ""}`);
  w.gap(6);

  w.h2("8. Postsecondary, military, and workforce transitions");
  taskLines(tasksWhere(TRANSITION_KEYS), "Not applicable this year.");
  w.gap(6);

  w.h2("9. Planning checklist");
  const byNo = new Map(s.checklist.map((c) => [c.item_no, c]));
  for (const item of s.checklistText) {
    const c = byNo.get(item.no);
    w.p(`${c?.checked_at ? "[x]" : "[ ]"} ${item.no}. ${item.text}`);
    if (c?.checked_at || c?.comment)
      w.small(
        `    ${c?.checked_at ? `checked ${fmt(c.checked_at)}` : ""}${c?.comment ? ` · ${c.comment}` : ""}`,
      );
  }
  w.gap(6);

  w.h2("10. Checkpoints and approval");
  for (const c of s.checkpoints) {
    const done = c.tasks.filter((t) => t.status === "done").length;
    w.p(
      `${c.term === "fall" ? "Fall" : "Spring"} checkpoint (grade ${c.grade}): ${c.status}${c.submitted_at ? ` · submitted ${fmt(c.submitted_at)}` : ""} · ${done} of ${c.tasks.length} tasks done`,
    );
    if (c.advisor_notes) w.small(`  Advisor notes: ${c.advisor_notes}`);
  }
  w.p(`Student: ${signed(s.approval?.student_ack_at)}`);
  w.p(`Parent or guardian: ${signed(s.approval?.guardian_ack_at)}`);
  w.p(`Teacher or counselor: ${signed(s.approval?.advisor_ack_at)}`);
  w.small(
    "Sign-offs are recorded electronically in EXPLR Pathways with a timestamp: the family sign-off through the family code view, the advisor sign-off from the instructor checkpoint review.",
  );

  d.save(`explr-student-success-plan-${p.firstName.toLowerCase()}-${s.schoolYear}.pdf`);
}
