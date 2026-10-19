import { CalendarDays, Clock, MapPin, Users } from "lucide-react";
import {
  AGE_REASONS,
  CAREER_FIELD_LABEL,
  REQUIREMENT_BY_KEY,
  REQUIREMENT_CATEGORIES,
  SETTINGS_ANSWERS,
  STUDENT_REQ_ANSWERS,
  VALENCE_OPTIONS,
  WHO_PAYS,
} from "@/lib/hs-application/content";
import type {
  ApplicationBuilder,
  BuilderQuestion,
  PartnerAnswers,
} from "@/lib/hs-application/types";
import { Choice, Section, TextArea, TextField, YES_NO } from "./fields";

const fmt = (d: string) =>
  d
    ? new Date(`${d}T12:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

/** D1: the internship profile a student reads. Also used in the builder's phone preview. */
export function ListingProfile({ b, org }: { b: ApplicationBuilder; org: string }) {
  const p = b.profile;
  return (
    <div>
      <p className="eyebrow text-green">{org}</p>
      <h2 className="mt-1 font-display text-2xl font-bold leading-tight">
        {p.title || "Untitled internship"}
      </h2>
      {p.description && <p className="mt-3 text-ink-700">{p.description}</p>}
      <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        {(p.startDate || p.endDate) && (
          <li className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-green-deep" aria-hidden />{" "}
            {fmt(p.startDate)} – {fmt(p.endDate)}
          </li>
        )}
        {p.dailyHours && (
          <li className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-green-deep" aria-hidden /> {p.dailyHours}
          </li>
        )}
        {p.address && (
          <li className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-green-deep" aria-hidden />
            <span>
              {p.address}
              {p.busLine && <span className="block text-ink-700">Nearest bus: {p.busLine}</span>}
            </span>
          </li>
        )}
        {p.seats ? (
          <li className="flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0 text-green-deep" aria-hidden /> {p.seats} intern
            {p.seats === 1 ? "" : "s"}
          </li>
        ) : null}
      </ul>
      {p.weekly.filter(Boolean).length > 0 && (
        <>
          <h3 className="mt-5 font-display text-base font-semibold">What you'll do each week</h3>
          <ul className="mt-2 list-disc pl-5 text-sm text-ink-700">
            {p.weekly.filter(Boolean).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </>
      )}
      {(p.learnEarn || p.credentials.length > 0) && (
        <>
          <h3 className="mt-5 font-display text-base font-semibold">What you'll learn or earn</h3>
          <p className="mt-1 text-sm text-ink-700">
            {[p.learnEarn, ...p.credentials].filter(Boolean).join(" · ")}
          </p>
        </>
      )}
      {p.niceToHave.filter(Boolean).length > 0 && (
        <>
          <h3 className="mt-5 font-display text-base font-semibold">Helpful, not required</h3>
          <ul className="mt-2 list-disc pl-5 text-sm text-ink-700">
            {p.niceToHave.filter(Boolean).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </>
      )}
      {p.careerFields.length > 0 && (
        <p className="mt-4 text-xs text-ink-500">
          Career field: {p.careerFields.map((f) => CAREER_FIELD_LABEL[f] ?? f).join(", ")}
        </p>
      )}
    </div>
  );
}

/** D3 "What to know before you apply" cards, with the student's answer. */
export function RequirementCards(props: {
  b: ApplicationBuilder;
  answers: PartnerAnswers;
  onChange?: (a: PartnerAnswers) => void;
  ageNote?: string | null;
  errors?: Record<string, string>;
}) {
  const { b, answers: a } = props;
  const interactive = !!props.onChange;
  const reasonLabel = AGE_REASONS.find((r) => r.key === b.age.reason)?.label;
  if (b.requirements.length === 0 && !b.age.min && !b.age.max) return null;
  return (
    <Section
      title="What to know before you apply"
      lead="Tell us if each one works for you. Saying you'd need help is OK: EXPLR staff will see what we can do."
    >
      {(b.age.min || b.age.max) && (
        <div className="rounded-[var(--radius-control)] border border-line bg-paper p-4">
          <p className="font-medium">
            Age: {b.age.min ? `${b.age.min} or older` : ""}
            {b.age.min && b.age.max ? " and " : ""}
            {b.age.max ? `${b.age.max} or younger` : ""} on the first day
          </p>
          {reasonLabel && <p className="mt-1 text-sm text-ink-700">Why: {reasonLabel}</p>}
          {props.ageNote && (
            <p className="mt-1 text-sm font-medium text-green-deep">{props.ageNote}</p>
          )}
        </div>
      )}
      {REQUIREMENT_CATEGORIES.map((cat) => {
        const items = b.requirements.filter(
          (r) => REQUIREMENT_BY_KEY.get(r.key)?.category === cat.key,
        );
        if (!items.length) return null;
        return (
          <div key={cat.key}>
            <h3 className="font-display text-base font-semibold">{cat.label}</h3>
            <ul className="mt-2 grid gap-3">
              {items.map((r) => {
                const def = REQUIREMENT_BY_KEY.get(r.key)!;
                const pays = WHO_PAYS.find((w) => w.key === r.whoPays);
                const val = a.requirements[r.key];
                return (
                  <li
                    key={r.key}
                    className="rounded-[var(--radius-control)] border border-line bg-paper p-4"
                  >
                    <p className="font-medium">
                      {def.label}
                      {r.detail ? `: ${r.detail}` : ""}
                    </p>
                    {pays && (
                      <p className="mt-1 text-sm text-ink-700">
                        {r.whoPays === "student"
                          ? "You may need to pay for this. Tell us if you'd need help."
                          : r.whoPays === "partner"
                            ? "The site provides this."
                            : "EXPLR covers this."}
                      </p>
                    )}
                    {interactive && (
                      <div className="mt-3">
                        {cat.ackOnly ? (
                          <label className="flex min-h-[44px] items-center gap-3 text-sm">
                            <input
                              type="checkbox"
                              className="h-5 w-5 accent-green-deep"
                              checked={val === "ack"}
                              onChange={(e) => {
                                const next = { ...a.requirements };
                                if (e.target.checked) next[r.key] = "ack";
                                else delete next[r.key];
                                props.onChange!({ ...a, requirements: next });
                              }}
                            />
                            Got it
                          </label>
                        ) : (
                          <Choice
                            legend={<span className="sr-only">Your answer for {def.label}</span>}
                            required
                            value={val}
                            onChange={(v) =>
                              props.onChange!({
                                ...a,
                                requirements: { ...a.requirements, [r.key]: v },
                              })
                            }
                            options={STUDENT_REQ_ANSWERS.map((o) => ({
                              value: o.key,
                              label: o.label,
                            }))}
                          />
                        )}
                        {val === "question" && (
                          <TextField
                            label="Your question"
                            value={a.questionNotes[r.key] ?? ""}
                            onChange={(v) =>
                              props.onChange!({
                                ...a,
                                questionNotes: { ...a.questionNotes, [r.key]: v },
                              })
                            }
                            className="mt-3"
                            help="EXPLR staff will answer. Partners don't see this."
                          />
                        )}
                        {props.errors?.[`req.${r.key}`] && (
                          <p role="alert" className="mt-1 text-sm text-red-700">
                            {props.errors[`req.${r.key}`]}
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </Section>
  );
}

/** D2: one partner question, rendered for a student. */
export function QuestionInput(props: {
  q: BuilderQuestion;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
  disabled?: boolean;
}) {
  const { q } = props;
  const required = !q.optional;
  switch (q.kind) {
    case "text": {
      const scenario = q.id === "B-04" && q.options[0];
      return (
        <div>
          {scenario && (
            <p className="mb-2 rounded-[var(--radius-control)] bg-paper-sunken p-3 text-sm">
              {q.options[0]}
            </p>
          )}
          <TextArea
            label={q.prompt}
            required={required}
            value={String(props.value ?? "")}
            onChange={props.onChange}
            maxWords={q.maxWords}
            error={props.error}
            rows={4}
          />
        </div>
      );
    }
    case "choice":
      return (
        <Choice
          legend={q.prompt}
          required={required}
          value={props.value as string}
          onChange={props.onChange}
          options={q.options.filter(Boolean).map((o) => ({ value: o, label: o }))}
          error={props.error}
        />
      );
    case "checklist_valence":
    case "settings": {
      const v = (props.value as Record<string, string>) ?? {};
      const scale = q.kind === "settings" ? SETTINGS_ANSWERS : VALENCE_OPTIONS;
      return (
        <fieldset>
          <legend className="label">
            {q.prompt}
            {required && (
              <span aria-hidden="true" className="text-red-700">
                {" "}
                *
              </span>
            )}
          </legend>
          <div className="grid gap-4">
            {q.options.filter(Boolean).map((o) => (
              <Choice
                key={o}
                legend={o}
                value={v[o]}
                onChange={(x) => props.onChange({ ...v, [o]: x })}
                options={scale.map((s) => ({ value: s.key, label: s.label }))}
                required={required}
              />
            ))}
          </div>
          {props.error && (
            <p role="alert" className="mt-1 text-sm text-red-700">
              {props.error}
            </p>
          )}
        </fieldset>
      );
    }
    case "yes_no_text": {
      const v = (props.value as { yes?: boolean; text?: string }) ?? {};
      return (
        <div className="grid gap-3">
          <Choice
            legend={q.prompt}
            required={required}
            value={v.yes}
            onChange={(yes) => props.onChange({ ...v, yes })}
            options={YES_NO}
            error={props.error}
          />
          {v.yes && (
            <TextArea
              label="Tell us a little about it"
              value={v.text ?? ""}
              onChange={(text) => props.onChange({ ...v, text })}
              maxWords={75}
              rows={3}
            />
          )}
        </div>
      );
    }
    case "upload":
    case "media":
      return (
        <TextField
          label={q.prompt}
          value={String(props.value ?? "")}
          onChange={props.onChange}
          help={
            q.kind === "media"
              ? "Paste a link to your video or voice note (Google Drive, YouTube unlisted, etc.). This is optional."
              : "Paste a link to a photo, file or website (Google Drive, portfolio, GitHub). This is optional."
          }
          error={props.error}
        />
      );
  }
}

/** True when a required question has an answer. */
export function isAnswered(q: BuilderQuestion, v: unknown): boolean {
  if (q.optional) return true;
  switch (q.kind) {
    case "text":
    case "choice":
      return typeof v === "string" && v.trim().length > 0;
    case "checklist_valence":
    case "settings": {
      const o = (v as Record<string, string>) ?? {};
      return q.options.filter(Boolean).every((opt) => !!o[opt]);
    }
    case "yes_no_text":
      return typeof (v as { yes?: boolean })?.yes === "boolean";
    default:
      return true;
  }
}
