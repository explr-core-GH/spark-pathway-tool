import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { PROFICIENT, RATING_LEVELS } from "@/lib/competencies";

/**
 * /instructor/admin/recommendations — draft recommendation letters from the
 * passport. A letter is built per verified experience: the organization, role
 * and verified hours, the OhioMeansJobs Readiness Seal skills the supervisor
 * rated Proficient or above, and the supervisor's own comment when they left
 * one. Output is a single PDF, one letter per page.
 */
export const Route = createFileRoute("/instructor/admin/recommendations")({
  head: () => ({ meta: [{ title: "Recommendation letters — Admin" }] }),
  component: () => (
    <RoleGuard requires="admin">
      <RecommendationsPage />
    </RoleGuard>
  ),
});

const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);

type ExperienceRow = {
  id: string;
  student_id: string;
  title: string;
  organization: string | null;
  role_title: string | null;
  duties: string | null;
  reflection: string | null;
  hours: number | null;
  verified_hours: number | null;
  supervisor_name: string | null;
  start_date: string | null;
  end_date: string | null;
  verified_at: string | null;
};

type RatingRow = {
  id: string;
  experience_id: string;
  competency: string;
  omj_skill: string | null;
  rating_final: number;
  setting: "school" | "work" | "community";
  rater_name: string;
  comment: string | null;
};

/** One verified experience with its supervisor ratings folded in. */
type LetterSource = {
  experience: ExperienceRow;
  ratings: RatingRow[];
  firstName: string;
  supervisorName: string;
  /** Distinct OMJ skills (or competencies) rated Proficient or above. */
  proficientSkills: string[];
  /** The first non-empty supervisor comment. */
  comment: { text: string; by: string } | null;
};

type GeneratedLetter = {
  studentName: string;
  internshipName: string;
  supervisorName: string;
  bodyParagraphs: string[];
};

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function fmtHours(h: number | null): string | null {
  if (h === null || h === undefined || !(h > 0)) return null;
  return Number.isInteger(h) ? String(h) : h.toFixed(1);
}

function fmtDateRange(start: string | null, end: string | null): string | null {
  const f = (d: string) =>
    new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  if (start && end) return `${f(start)} to ${f(end)}`;
  if (start) return `beginning ${f(start)}`;
  if (end) return `ending ${f(end)}`;
  return null;
}

function clean(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

/** Deterministic letter body from the verified experience and its ratings. */
function draftLetter(src: LetterSource): GeneratedLetter {
  const e = src.experience;
  const first = src.firstName;
  const org = clean(e.organization) || "a partner organization";
  const role = clean(e.role_title);
  const hours = fmtHours(e.verified_hours ?? e.hours);
  const dates = fmtDateRange(e.start_date, e.end_date);
  const paragraphs: string[] = [];

  // Paragraph 1: who, where, what role, how long — all verified facts.
  const intro: string[] = [];
  intro.push(
    `I am pleased to recommend ${first} based on their work ${role ? `as ${role} ` : ""}at ${org}${
      clean(e.title) && clean(e.title) !== org ? ` (${clean(e.title)})` : ""
    } through the EXPLR Pathways program${dates ? `, ${dates}` : ""}.`,
  );
  if (hours) {
    intro.push(
      `${src.supervisorName} verified ${hours} hour${hours === "1" ? "" : "s"} of work-based learning for this experience.`,
    );
  } else {
    intro.push(`${src.supervisorName} verified this experience.`);
  }
  if (clean(e.duties)) intro.push(`${first}'s responsibilities included ${clean(e.duties)}`);
  paragraphs.push(intro.join(" ").replace(/([^.!?])$/, "$1."));

  // Paragraph 2: the skills the supervisor rated proficient or above.
  if (src.proficientSkills.length > 0) {
    const level = RATING_LEVELS[PROFICIENT - 1];
    paragraphs.push(
      `On the OhioMeansJobs Readiness Seal scale, ${src.supervisorName} rated ${first} ${level} or above in ${joinList(
        src.proficientSkills,
      )}. These are the professional skills Ohio employers look for, and ${first} demonstrated them in a real work setting.`,
    );
  } else {
    paragraphs.push(
      `${first} completed this experience with the consistent effort and reliability their supervisor expects of a student just beginning their professional path.`,
    );
  }

  // Paragraph 3: the supervisor's own words, and the student's reflection.
  if (src.comment) {
    paragraphs.push(`In ${src.comment.by}'s words: "${src.comment.text}"`);
  }
  if (clean(e.reflection)) {
    paragraphs.push(`Reflecting on the experience, ${first} wrote: "${clean(e.reflection)}"`);
  }

  // Closing.
  paragraphs.push(
    `I recommend ${first} without reservation and would be glad to speak further about their work. Please feel free to contact me with any questions.`,
  );

  return {
    studentName: first,
    internshipName: role ? `${role} at ${org}` : org,
    supervisorName: src.supervisorName,
    bodyParagraphs: paragraphs,
  };
}

function RecommendationsPage() {
  const [sources, setSources] = useState<LetterSource[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [signerName, setSignerName] = useState("Dr. Jordan Seigler");
  const [signerTitle, setSignerTitle] = useState("EXPLR Program Lead · Cleveland State University");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: ex, error } = await sb("experiences")
        .select(
          "id, student_id, title, organization, role_title, duties, reflection, hours, verified_hours, supervisor_name, start_date, end_date, verified_at",
        )
        .eq("status", "verified")
        .order("verified_at", { ascending: false });
      if (error) {
        setErr(error.message);
        setSources([]);
        return;
      }
      const experiences = (ex ?? []) as ExperienceRow[];
      if (experiences.length === 0) {
        setSources([]);
        return;
      }
      const expIds = experiences.map((e) => e.id);
      const sids = [...new Set(experiences.map((e) => e.student_id))];

      const [ratingsRes, studsRes] = await Promise.all([
        sb("experience_ratings")
          .select(
            "id, experience_id, competency, omj_skill, rating_final, setting, rater_name, comment",
          )
          .in("experience_id", expIds)
          .order("rated_at", { ascending: true }),
        supabase.from("students").select("id, first_name").in("id", sids),
      ]);

      const ratingsByExp = new Map<string, RatingRow[]>();
      for (const r of (ratingsRes.data ?? []) as RatingRow[]) {
        const arr = ratingsByExp.get(r.experience_id) ?? [];
        arr.push(r);
        ratingsByExp.set(r.experience_id, arr);
      }
      const firstName: Record<string, string> = {};
      for (const s of (studsRes.data ?? []) as Array<{ id: string; first_name: string | null }>) {
        firstName[s.id] = clean(s.first_name) || "the student";
      }

      const out: LetterSource[] = experiences.map((e) => {
        const ratings = ratingsByExp.get(e.id) ?? [];
        const proficient = [
          ...new Set(
            ratings
              .filter((r) => r.rating_final >= PROFICIENT)
              .map((r) => clean(r.omj_skill) || clean(r.competency))
              .filter(Boolean),
          ),
        ];
        const withComment = ratings.find((r) => clean(r.comment));
        const supervisorName =
          clean(e.supervisor_name) || clean(ratings[0]?.rater_name) || "Their supervisor";
        return {
          experience: e,
          ratings,
          firstName: firstName[e.student_id] ?? "the student",
          supervisorName,
          proficientSkills: proficient,
          comment: withComment
            ? {
                text: clean(withComment.comment),
                by: clean(withComment.rater_name) || supervisorName,
              }
            : null,
        };
      });
      setSources(out);
    })();
  }, []);

  /** Sections keyed by organization; each row inside is one verified experience. */
  const grouped = useMemo(() => {
    const m = new Map<string, LetterSource[]>();
    for (const s of sources ?? []) {
      const key = clean(s.experience.organization) || clean(s.experience.title) || "Other";
      const arr = m.get(key) ?? [];
      arr.push(s);
      m.set(key, arr);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => a.firstName.localeCompare(b.firstName));
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [sources]);

  function toggle(k: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  }

  function toggleAllInGroup(rows: LetterSource[], on: boolean) {
    setSelected((prev) => {
      const n = new Set(prev);
      for (const r of rows) {
        if (on) n.add(r.experience.id);
        else n.delete(r.experience.id);
      }
      return n;
    });
  }

  function buildPdf(letters: GeneratedLetter[]) {
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const marginX = 72;
    const marginY = 72;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const contentW = pageW - marginX * 2;
    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    letters.forEach((letter, idx) => {
      if (idx > 0) doc.addPage();
      let y = marginY;

      // Letterhead
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Cleveland State University", marginX, y);
      y += 16;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("EXPLR Pathways · Work-Based Learning", marginX, y);
      y += 12;
      doc.setDrawColor(180);
      doc.line(marginX, y, pageW - marginX, y);
      y += 24;

      // Date
      doc.setFontSize(11);
      doc.text(today, marginX, y);
      y += 24;

      // Salutation
      doc.text("To whom it may concern,", marginX, y);
      y += 20;

      const writeParagraph = (text: string) => {
        const lines = doc.splitTextToSize(text, contentW) as string[];
        for (const line of lines) {
          if (y > pageH - marginY - 80) {
            doc.addPage();
            y = marginY;
          }
          doc.text(line, marginX, y);
          y += 15;
        }
        y += 10;
      };

      for (const p of letter.bodyParagraphs) writeParagraph(p);

      // Signature block
      if (y > pageH - marginY - 90) {
        doc.addPage();
        y = marginY;
      }
      y += 12;
      doc.text("Sincerely,", marginX, y);
      y += 40;
      doc.setFont("helvetica", "bold");
      doc.text(signerName, marginX, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const titleLines = doc.splitTextToSize(signerTitle, contentW) as string[];
      for (const line of titleLines) {
        doc.text(line, marginX, y);
        y += 12;
      }
      doc.setFontSize(9);
      doc.setTextColor(120);
      y += 6;
      doc.text(
        `Supervisor of record: ${letter.supervisorName} · ${letter.internshipName}`,
        marginX,
        y,
      );
      doc.setTextColor(0);
    });

    return doc;
  }

  function onGenerate() {
    setErr(null);
    setStatus(null);
    const picked = (sources ?? []).filter((s) => selected.has(s.experience.id));
    if (picked.length === 0) {
      setErr("Select at least one verified experience.");
      return;
    }
    setBusy(true);
    try {
      const letters = picked.map(draftLetter);
      const doc = buildPdf(letters);
      const stamp = new Date().toISOString().slice(0, 10);
      doc.save(`explr-recommendations-${stamp}.pdf`);
      setStatus(`Downloaded PDF with ${letters.length} letter${letters.length === 1 ? "" : "s"}.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to generate letters");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  const total = sources?.length ?? 0;

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link to="/instructor/admin" className="text-xs text-ink-500 hover:text-ink-900">
        ← Admin
      </Link>
      <p className="eyebrow mt-4">Passport</p>
      <h1 className="display mt-2">Recommendation letters</h1>
      <p className="lead mt-2 max-w-2xl">
        Select verified experiences to draft recommendation letters. Each letter cites the
        organization, role and verified hours, names the OhioMeansJobs Readiness Seal skills the
        supervisor rated Proficient or above, and quotes the supervisor&apos;s comment when they
        left one. Letters are signed by the EXPLR / CSU program lead. Output is a single
        downloadable PDF, one letter per page.
      </p>

      <div className="mt-8 grid gap-4 rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="signer">
            Signer name
          </label>
          <input
            id="signer"
            className="field mt-1"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="signer-title">
            Signer title
          </label>
          <input
            id="signer-title"
            className="field mt-1"
            value={signerTitle}
            onChange={(e) => setSignerTitle(e.target.value)}
          />
        </div>
      </div>

      {err && <p className="mt-4 text-sm text-red-600">{err}</p>}
      {status && !err && <p className="mt-4 text-sm text-ink-500">{status}</p>}

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-ink-500">
          {selected.size} selected
          {sources
            ? ` · ${total} verified experience${total === 1 ? "" : "s"} across all organizations`
            : ""}
        </p>
        <button
          onClick={onGenerate}
          disabled={busy || selected.size === 0}
          className="btn-ink text-sm disabled:opacity-40"
        >
          {busy ? "Generating…" : "Generate & download PDF"}
        </button>
      </div>

      {sources === null ? (
        <p className="mt-10 text-sm text-ink-500">Loading…</p>
      ) : sources.length === 0 ? (
        <div className="mt-10 rounded-[var(--radius-card)] border border-line bg-paper-raised px-6 py-10 text-center text-sm text-ink-500">
          No verified experiences yet. Letters draw on experiences a supervisor has verified.
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {grouped.map(([org, rows]) => {
            const allSelected = rows.every((r) => selected.has(r.experience.id));
            return (
              <section key={org}>
                <div className="flex items-baseline justify-between border-b border-line pb-2">
                  <h2 className="text-lg font-medium text-ink-900">{org}</h2>
                  <button
                    onClick={() => toggleAllInGroup(rows, !allSelected)}
                    className="text-xs uppercase tracking-wider text-ink-500 hover:text-ink-900"
                  >
                    {allSelected ? "Clear all" : "Select all"}
                  </button>
                </div>
                <ul className="mt-3 divide-y divide-line">
                  {rows.map((r) => {
                    const k = r.experience.id;
                    const on = selected.has(k);
                    const hours = fmtHours(r.experience.verified_hours ?? r.experience.hours);
                    const rated = r.ratings.length;
                    return (
                      <li key={k} className="flex items-start gap-3 py-3">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggle(k)}
                          className="mt-1"
                          id={k}
                        />
                        <label htmlFor={k} className="flex-1 cursor-pointer">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="font-medium text-ink-900">{r.firstName}</span>
                            <span className="text-sm text-ink-700">
                              {clean(r.experience.role_title) || clean(r.experience.title)}
                            </span>
                            <span className="text-xs text-ink-500">
                              {hours ? `${hours} verified hr${hours === "1" ? "" : "s"} · ` : ""}
                              {rated
                                ? `${r.proficientSkills.length} of ${rated} skill${rated === 1 ? "" : "s"} proficient`
                                : "no skill ratings"}{" "}
                              · verified by {r.supervisorName}
                            </span>
                          </div>
                          {r.proficientSkills.length > 0 && (
                            <p className="mt-1 text-xs text-ink-700">
                              {r.proficientSkills.join(" · ")}
                            </p>
                          )}
                          {r.comment && (
                            <p className="mt-1 line-clamp-2 text-xs text-ink-500">
                              &ldquo;{r.comment.text}&rdquo;
                            </p>
                          )}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
