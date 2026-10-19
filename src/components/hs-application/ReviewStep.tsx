import {
  CAREER_FIELD_LABEL,
  POST_HS_PLANS,
  REACTIONS,
  TRANSPORT_OPTIONS,
} from "@/lib/hs-application/content";
import type { AssessmentSnapshot } from "@/lib/hs-application/data";
import type { GeneralApplication } from "@/lib/hs-application/types";
import { GENERAL_STEPS } from "@/lib/hs-application/validate";
import type { MatchCard } from "./GeneralSteps";

const lbl = (opts: ReadonlyArray<{ key: string; label: string }>, keys: string[]) =>
  keys.map((k) => opts.find((o) => o.key === k)?.label ?? k).join(", ");
const yn = (v: boolean | null) => (v === null ? "—" : v ? "Yes" : "No");

export function ReviewStep(props: {
  app: GeneralApplication;
  cards: MatchCard[];
  assessment: AssessmentSnapshot | null;
  onEdit: (step: number) => void;
}) {
  const { core: c, extras: x, choices: ch } = props.app;
  const stepIdx = (key: string) => GENERAL_STEPS.findIndex((s) => s.key === key);
  const nameOf = (ref: string) => props.cards.find((m) => m.ref === ref)?.name ?? "Internship";
  const blocks: Array<{ key: string; rows: Array<[string, string]> }> = [
    {
      key: "about",
      rows: [
        [
          "Name",
          `${c.legalFirst} ${c.legalLast}${c.preferredName ? ` (goes by ${c.preferredName})` : ""}`,
        ],
        ["Email", c.email],
        ["Cell", `${c.phone} · OK to text: ${yn(c.okToText)}`],
        ["Date of birth", c.dob],
        ["School", `${c.school} · grade ${c.gradeFall} this fall`],
        ["ZIP", c.zip],
        ["YOU application email", c.youEmail],
      ],
    },
    {
      key: "logistics",
      rows: [
        ["All program weeks", c.allWeeks === false ? `No: ${c.datesCant}` : yn(c.allWeeks)],
        ["Getting there", lbl(TRANSPORT_OPTIONS, c.transport)],
        ["Needs a bus pass", yn(c.needsBusPass)],
        ["Work permit", c.workPermit || "—"],
      ],
    },
    {
      key: "story",
      rows: [
        ["Made, fixed or figured out", c.madeFixed],
        ["Hope to get", c.hopeToGet],
      ],
    },
    {
      key: "plans",
      rows: [
        ["Jobs you've thought about", c.jobsThought || "—"],
        ["After high school", lbl(POST_HS_PLANS, c.postHs)],
        ["College courses", c.collegeCourses ? c.collegeCoursesWhich : yn(c.collegeCourses)],
        ["Career-tech program", c.careerTech ? c.careerTechWhich : yn(c.careerTech)],
        ["Credentials", [...c.credentials, c.credentialsOther].filter(Boolean).join(", ") || "—"],
      ],
    },
    {
      key: "support",
      rows: [
        [
          "Parent or guardian",
          [c.guardianName, c.guardianPhone, c.guardianEmail].filter(Boolean).join(" · ") || "—",
        ],
        ["Emergency contact", `${c.emergencyName} · ${c.emergencyPhone}`],
        ["Signed", [c.consentStudentName, c.consentGuardianName].filter(Boolean).join(" and ")],
      ],
    },
    {
      key: "survey",
      rows: [
        ["Holland code", props.assessment?.holland_code ?? "Not taken yet"],
        ["Career fields", x.fields.map((f) => CAREER_FIELD_LABEL[f] ?? f).join(", ")],
      ],
    },
    {
      key: "matches",
      rows: [
        [
          "Reactions",
          ch.shown
            .map(
              (r) =>
                `${nameOf(r)}: ${REACTIONS.find((x) => x.key === ch.reactions[r])?.label ?? "—"}`,
            )
            .join("; ") || "—",
        ],
        ["Your ranking", ch.ranked.map((r, i) => `#${i + 1} ${nameOf(r)}`).join(", ") || "—"],
        ["Place me where I'll fit best", ch.placeAnywhere ? "Yes" : "No"],
        ["Want to try", ch.tryText || "—"],
      ],
    },
  ];
  return (
    <div className="grid gap-4">
      <p className="text-sm text-ink-700">
        Check your answers. After you submit, your general application is locked, and you can apply
        to specific internships with just their questions.
      </p>
      {blocks.map((b) => (
        <section
          key={b.key}
          className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">
              {GENERAL_STEPS[stepIdx(b.key)].label}
            </h2>
            <button
              type="button"
              className="min-h-[44px] text-sm font-medium text-green-deep underline"
              onClick={() => props.onEdit(stepIdx(b.key))}
            >
              Edit<span className="sr-only"> {GENERAL_STEPS[stepIdx(b.key)].label}</span>
            </button>
          </div>
          <dl className="mt-3 grid gap-2 text-sm">
            {b.rows.map(([k, v]) => (
              <div key={k} className="grid gap-1 sm:grid-cols-[200px_1fr]">
                <dt className="text-ink-700">{k}</dt>
                <dd className="whitespace-pre-wrap break-words">{v || "—"}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
