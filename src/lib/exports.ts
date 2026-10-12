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
