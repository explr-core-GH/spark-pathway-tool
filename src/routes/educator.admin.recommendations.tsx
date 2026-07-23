import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";
import { INTERNSHIPS } from "@/lib/internships-catalog";
import { isOppSlug, oppIdFromSlug } from "@/lib/opportunities";
import {
  generateRecommendationLetters,
  type GeneratedLetter,
  type LetterInput,
} from "@/lib/recommendations.functions";

export const Route = createFileRoute("/educator/admin/recommendations")({
  head: () => ({ meta: [{ title: "Recommendation letters — Admin" }] }),
  component: () => (
    <RoleGuard requires="admin">
      <RecommendationsPage />
    </RoleGuard>
  ),
});

type EvalRow = {
  internship_ref: string;
  student_id: string;
  evaluator_id: string;
  rubric: Record<string, number> | null;
  recommend: boolean | null;
  notes: string | null;
};

const sb = (t: string): any =>
  (supabase.from as unknown as (n: string) => any)(t);

const CATALOG_NAME: Record<string, string> = Object.fromEntries(
  INTERNSHIPS.map((i) => [i.slug, i.name]),
);

function keyFor(e: { internship_ref: string; student_id: string; evaluator_id: string }) {
  return `${e.internship_ref}::${e.student_id}::${e.evaluator_id}`;
}

function RecommendationsPage() {
  const [evals, setEvals] = useState<EvalRow[] | null>(null);
  const [studentName, setStudentName] = useState<Record<string, string>>({});
  const [educatorName, setEducatorName] = useState<Record<string, string>>({});
  const [oppName, setOppName] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [signerName, setSignerName] = useState("Dr. Jordan Seigler");
  const [signerTitle, setSignerTitle] = useState(
    "EXPLR Program Lead · Cleveland State University",
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const generate = useServerFn(generateRecommendationLetters);

  useEffect(() => {
    (async () => {
      const { data: ev, error } = await sb("internship_evaluations").select(
        "internship_ref, student_id, evaluator_id, rubric, recommend, notes",
      );
      if (error) {
        setErr(error.message);
        setEvals([]);
        return;
      }
      const rows = (ev ?? []) as EvalRow[];
      setEvals(rows);

      const sids = [...new Set(rows.map((r) => r.student_id))];
      const eids = [...new Set(rows.map((r) => r.evaluator_id))];
      const oppIds = [
        ...new Set(
          rows
            .map((r) => r.internship_ref)
            .filter(isOppSlug)
            .map(oppIdFromSlug),
        ),
      ];

      const [studs, edus, opps] = await Promise.all([
        sids.length
          ? supabase.from("students").select("id, first_name, last_name").in("id", sids)
          : Promise.resolve({ data: [] as any[] }),
        eids.length
          ? supabase.from("educators").select("id, full_name").in("id", eids)
          : Promise.resolve({ data: [] as any[] }),
        oppIds.length
          ? sb("opportunities").select("id, name").in("id", oppIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const sn: Record<string, string> = {};
      for (const s of (studs.data ?? []) as Array<{
        id: string;
        first_name: string | null;
        last_name: string | null;
      }>) {
        sn[s.id] = [s.first_name, s.last_name].filter(Boolean).join(" ") || "Student";
      }
      setStudentName(sn);

      const en: Record<string, string> = {};
      for (const e of (edus.data ?? []) as Array<{ id: string; full_name: string | null }>) {
        en[e.id] = e.full_name ?? "Supervisor";
      }
      setEducatorName(en);

      const on: Record<string, string> = {};
      for (const o of (opps.data ?? []) as Array<{ id: string; name: string | null }>) {
        on[o.id] = o.name ?? "Internship";
      }
      setOppName(on);
    })();
  }, []);

  const nameFor = (ref: string) =>
    isOppSlug(ref)
      ? oppName[oppIdFromSlug(ref)] ?? "Internship"
      : CATALOG_NAME[ref] ?? ref;

  const grouped = useMemo(() => {
    const m = new Map<string, EvalRow[]>();
    for (const e of evals ?? []) {
      const arr = m.get(e.internship_ref) ?? [];
      arr.push(e);
      m.set(e.internship_ref, arr);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) =>
        (studentName[a.student_id] ?? "").localeCompare(studentName[b.student_id] ?? ""),
      );
    }
    return [...m.entries()].sort((a, b) => nameFor(a[0]).localeCompare(nameFor(b[0])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evals, studentName, oppName]);

  function toggle(k: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  }

  function toggleAllInGroup(rows: EvalRow[], on: boolean) {
    setSelected((prev) => {
      const n = new Set(prev);
      for (const r of rows) {
        const k = keyFor(r);
        if (on) n.add(k);
        else n.delete(k);
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
      doc.text("EXPLR High School Internship Program", marginX, y);
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

      if (letter.error) {
        doc.setTextColor(180, 0, 0);
        writeParagraph(
          `Letter could not be generated for ${letter.studentName} (${letter.internshipName}): ${letter.error}`,
        );
        doc.setTextColor(0);
      } else {
        writeParagraph(
          `I am pleased to recommend ${letter.studentName} based on their work in the ${letter.internshipName} internship at Cleveland State University this summer.`,
        );
        for (const p of letter.bodyParagraphs) writeParagraph(p);
      }

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
        `Supervisor of record: ${letter.evaluatorName}`,
        marginX,
        y,
      );
      doc.setTextColor(0);
    });

    return doc;
  }

  async function onGenerate() {
    setErr(null);
    setStatus(null);
    const items: LetterInput[] = [];
    for (const e of evals ?? []) {
      const k = keyFor(e);
      if (selected.has(k)) {
        items.push({
          internshipRef: e.internship_ref,
          studentId: e.student_id,
          evaluatorId: e.evaluator_id,
        });
      }
    }
    if (items.length === 0) {
      setErr("Select at least one intern.");
      return;
    }
    setBusy(true);
    setStatus(`Drafting ${items.length} letter${items.length === 1 ? "" : "s"}…`);
    try {
      const { letters } = await generate({ data: { items } });
      const doc = buildPdf(letters);
      const stamp = new Date().toISOString().slice(0, 10);
      doc.save(`explr-recommendations-${stamp}.pdf`);
      const failed = letters.filter((l) => l.error).length;
      setStatus(
        failed > 0
          ? `Downloaded PDF. ${failed} letter${failed === 1 ? "" : "s"} failed — see the PDF for details.`
          : `Downloaded PDF with ${letters.length} letter${letters.length === 1 ? "" : "s"}.`,
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to generate letters");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link to="/educator/admin" className="text-xs text-charcoal-500 hover:text-ink">
        ← Admin
      </Link>
      <p className="eyebrow mt-4">Interns</p>
      <h1 className="display mt-2">Recommendation letters</h1>
      <p className="lead mt-2 max-w-2xl">
        Select rated interns to draft personalized recommendation letters. Letters
        pull from each supervisor&apos;s 1–5 ratings and notes, and are signed by
        the EXPLR / CSU program lead. Output is a single downloadable PDF, one
        letter per page.
      </p>

      <div className="mt-8 grid gap-4 border border-charcoal-100 bg-charcoal-50 p-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="signer">Signer name</label>
          <input
            id="signer"
            className="field mt-1"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="signer-title">Signer title</label>
          <input
            id="signer-title"
            className="field mt-1"
            value={signerTitle}
            onChange={(e) => setSignerTitle(e.target.value)}
          />
        </div>
      </div>

      {err && <p className="mt-4 text-sm text-red-600">{err}</p>}
      {status && !err && <p className="mt-4 text-sm text-charcoal-500">{status}</p>}

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-charcoal-500">
          {selected.size} selected
          {evals ? ` · ${evals.length} rated intern${evals.length === 1 ? "" : "s"} across all internships` : ""}
        </p>
        <button
          onClick={onGenerate}
          disabled={busy || selected.size === 0}
          className="btn-ink text-sm disabled:opacity-40"
        >
          {busy ? "Generating…" : "Generate & download PDF"}
        </button>
      </div>

      {evals === null ? (
        <p className="mt-10 text-sm text-charcoal-400">Loading…</p>
      ) : evals.length === 0 ? (
        <div className="mt-10 border border-charcoal-100 bg-charcoal-50 px-6 py-10 text-center text-sm text-charcoal-500">
          No supervisor ratings recorded yet.
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {grouped.map(([ref, rows]) => {
            const allSelected = rows.every((r) => selected.has(keyFor(r)));
            return (
              <section key={ref}>
                <div className="flex items-baseline justify-between border-b border-charcoal-100 pb-2">
                  <h2 className="text-lg font-medium">{nameFor(ref)}</h2>
                  <button
                    onClick={() => toggleAllInGroup(rows, !allSelected)}
                    className="text-xs uppercase tracking-wider text-charcoal-500 hover:text-ink"
                  >
                    {allSelected ? "Clear all" : "Select all"}
                  </button>
                </div>
                <ul className="mt-3 divide-y divide-charcoal-100">
                  {rows.map((r) => {
                    const k = keyFor(r);
                    const on = selected.has(k);
                    const rubric = r.rubric ?? {};
                    const avgVals = Object.values(rubric);
                    const avg =
                      avgVals.length > 0
                        ? (avgVals.reduce((a, b) => a + b, 0) / avgVals.length).toFixed(1)
                        : "—";
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
                            <span className="font-medium">
                              {studentName[r.student_id] ?? "Student"}
                            </span>
                            <span className="text-xs text-charcoal-400">
                              avg {avg}/5 · rated by {educatorName[r.evaluator_id] ?? "Supervisor"}
                            </span>
                            {r.recommend === true && (
                              <span className="rounded-sm bg-ink px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white">
                                Recommended
                              </span>
                            )}
                            {r.recommend === false && (
                              <span className="rounded-sm border border-charcoal-200 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-charcoal-500">
                                No recommendation
                              </span>
                            )}
                          </div>
                          {r.notes && (
                            <p className="mt-1 line-clamp-2 text-xs text-charcoal-500">
                              &ldquo;{r.notes}&rdquo;
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
