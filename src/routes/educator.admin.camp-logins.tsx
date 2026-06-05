import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  generateCampLogins,
  generateWalkInCampLogin,
  updateCampLoginName,
} from "@/lib/camp-logins.functions";
import {
  familyReportPageHtml,
  familyReportDocument,
} from "@/lib/family-report";

export const Route = createFileRoute("/educator/admin/camp-logins")({
  head: () => ({ meta: [{ title: "Camp logins — Admin" }] }),
  component: CampLoginsAdmin,
});

const sb = (table: string) =>
  (supabase.from as (n: string) => ReturnType<typeof supabase.from>)(table);

type CampSession = { id: string; title: string; date: string | null };
type Login = {
  id: string;
  explr_camp_id: string;
  student_id: string | null;
  child_name: string;
  username: string;
  password_plain: string;
};

function CampLoginsAdmin() {
  const [sessions, setSessions] = useState<CampSession[]>([]);
  const [regCounts, setRegCounts] = useState<Record<string, number>>({});
  const [logins, setLogins] = useState<Login[]>([]);
  // student_id → Holland code, for students who've completed the assessment.
  const [holland, setHolland] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // Walk-in form state (one camp open at a time). Null = no form open.
  const [walkIn, setWalkIn] = useState<{
    campId: string;
    name: string;
    age: string;
  } | null>(null);

  // Inline name-edit state for a credentials-table row. Null = nothing being edited.
  const [editing, setEditing] = useState<{
    id: string;
    name: string;
    age: string;
  } | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: ss }, { data: regs }, { data: lg }] = await Promise.all([
      sb("explr_camps")
        .select("id, title, date")
        .order("date", { ascending: true }),
      sb("explr_registrations").select("camp_id"),
      sb("camp_student_logins").select(
        "id, explr_camp_id, student_id, child_name, username, password_plain",
      ),
    ]);
    setSessions((ss ?? []) as CampSession[]);
    const counts: Record<string, number> = {};
    for (const r of (regs ?? []) as Array<{ camp_id: string }>) {
      counts[r.camp_id] = (counts[r.camp_id] ?? 0) + 1;
    }
    setRegCounts(counts);
    const loginRows = (lg ?? []) as Login[];
    setLogins(loginRows);

    // Holland codes for the generated students who've finished the
    // assessment — drives the family-report availability.
    const studentIds = loginRows
      .map((l) => l.student_id)
      .filter((x): x is string => !!x);
    if (studentIds.length > 0) {
      const { data: sess } = await supabase
        .from("assessment_sessions")
        .select("student_id, holland_code, completed_at")
        .in("student_id", studentIds)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false });
      const hmap: Record<string, string> = {};
      for (const s of (sess ?? []) as Array<{
        student_id: string;
        holland_code: string | null;
      }>) {
        if (hmap[s.student_id]) continue; // keep most recent
        if (s.holland_code) hmap[s.student_id] = s.holland_code;
      }
      setHolland(hmap);
    } else {
      setHolland({});
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const loginCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of logins) m[l.explr_camp_id] = (m[l.explr_camp_id] ?? 0) + 1;
    return m;
  }, [logins]);

  async function generate(campId: string) {
    setBusy(campId);
    setStatus(null);
    try {
      const res = await generateCampLogins({ data: { explrCampId: campId } });
      setStatus(
        `Generated ${res.created} new login${res.created === 1 ? "" : "s"}` +
          ` · ${res.skipped} already existed` +
          (res.failed > 0 ? ` · ${res.failed} failed` : "") +
          (res.errors.length > 0 ? ` — ${res.errors[0]}` : ""),
      );
      await load();
      setExpanded(campId);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setBusy(null);
    }
  }

  /**
   * Per-student cards — 8 per US Letter page, 2 columns × 4 rows, with
   * dashed cut borders. Each card shows the site URL the kid types into
   * their browser, their short username (without the @camp.explr.local
   * domain — the sign-in form appends it), and their password.
   */
  function printCards(campId: string, title: string) {
    const rows = logins.filter((l) => l.explr_camp_id === campId);
    if (rows.length === 0) return;
    const signInUrl = `${window.location.origin}/sign-in`;
    const cards = rows
      .map((r) => {
        const first = escapeHtml(r.child_name.trim().split(/\s+/)[0] || "friend");
        const localUser = escapeHtml(r.username.split("@")[0] || r.username);
        const pw = escapeHtml(r.password_plain);
        return `
          <div class="card">
            <div class="brand">EXPLR <span>Pathways</span></div>
            <div class="hi">Hi, ${first}!</div>
            <div class="step">1. Go to <code class="url">${escapeHtml(signInUrl)}</code></div>
            <div class="step">2. Sign in with:</div>
            <table class="creds">
              <tr><td>Username</td><td><code>${localUser}</code></td></tr>
              <tr><td>Password</td><td><code>${pw}</code></td></tr>
            </table>
            <div class="foot">Keep this card. Camp: ${escapeHtml(title)}</div>
          </div>`;
      })
      .join("");

    const html = `<!doctype html><html><head><meta charset="utf-8">
      <title>${escapeHtml(title)} — student cards</title>
      <style>
        @page { size: letter; margin: 0.4in; }
        body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #1A1D1F; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.25in; }
        .card {
          border: 2px dashed #B8BCC1;
          padding: 16px 18px;
          break-inside: avoid;
          page-break-inside: avoid;
          min-height: 2.15in;
          display: flex; flex-direction: column;
        }
        .brand { font-size: 12px; font-weight: 600; }
        .brand span { color: #15A36B; }
        .hi { font-size: 18px; font-weight: 700; margin-top: 6px; }
        .step { font-size: 12px; color: #2c3033; margin-top: 6px; line-height: 1.4; }
        .creds { border-collapse: collapse; width: 100%; margin-top: 4px; }
        .creds td { padding: 4px 0; font-size: 13px; vertical-align: middle; }
        .creds td:first-child { color: #6E767F; width: 78px; }
        code { font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 14px; font-weight: 600; background: #FFF8C5;
          padding: 2px 6px; border-radius: 2px; }
        code.url { font-size: 11px; background: #EDEEF0; font-weight: 500; }
        .foot { margin-top: auto; padding-top: 8px; font-size: 10px; color: #9aa1a8; }
      </style></head><body>
      <div class="grid">${cards}</div>
      </body></html>`;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
    }
  }

  function printSheet(campId: string, title: string) {
    const rows = logins.filter((l) => l.explr_camp_id === campId);
    const html = `<!doctype html><html><head><title>${title} — logins</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:24px;color:#1A1D1F}
        h1{font-size:18px;margin:0 0 4px}
        p{color:#6E767F;font-size:12px;margin:0 0 16px}
        table{border-collapse:collapse;width:100%;font-size:13px}
        th,td{text-align:left;padding:6px 10px;border-bottom:1px solid #E6E8EA}
        th{text-transform:uppercase;font-size:10px;letter-spacing:.08em;color:#6E767F}
        code{font-family:ui-monospace,monospace}
      </style></head><body>
      <h1>${title}</h1>
      <p>Student logins — hand each row to the right camper. Keep this sheet secure.</p>
      <table><thead><tr><th>Student</th><th>Username</th><th>Password</th></tr></thead><tbody>
      ${rows
        .map(
          (r) =>
            `<tr><td>${escapeHtml(r.child_name)}</td><td><code>${escapeHtml(
              r.username,
            )}</code></td><td><code>${escapeHtml(r.password_plain)}</code></td></tr>`,
        )
        .join("")}
      </tbody></table></body></html>`;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
    }
  }

  // Count of camp students who've completed the assessment (eligible for a
  // family report).
  function reportableCount(campId: string): number {
    return logins.filter(
      (l) =>
        l.explr_camp_id === campId && l.student_id && holland[l.student_id],
    ).length;
  }

  /**
   * Print the family 1-pager for one camp's students who have results,
   * or — when `onlyLogin` is given — just that one student. Each page
   * carries the login + the RIASEC profile + a how-it-works explainer.
   */
  function printFamilyReports(
    campId: string,
    title: string,
    onlyLogin?: Login,
  ) {
    const pool = onlyLogin
      ? [onlyLogin]
      : logins.filter((l) => l.explr_camp_id === campId);
    // Send families to the sign-in screen directly, and show the short
    // username (no @camp.explr.local domain) — that's what they type.
    const signInUrl = `${window.location.origin}/sign-in`;
    const pages = pool
      .filter((l) => l.student_id && holland[l.student_id])
      .map((l) =>
        familyReportPageHtml({
          childName: l.child_name,
          campTitle: title,
          username: l.username.split("@")[0] || l.username,
          password: l.password_plain,
          signInUrl,
          hollandCode: holland[l.student_id as string],
        }),
      );
    if (pages.length === 0) {
      setStatus(
        "No family reports to print yet — students need to finish the assessment first.",
      );
      return;
    }
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(familyReportDocument(pages));
      w.document.close();
      w.focus();
      w.print();
    }
  }

  async function submitWalkIn() {
    if (!walkIn || busy) return;
    setBusy(`walkin-${walkIn.campId}`);
    setStatus(null);
    try {
      const age = walkIn.age.trim() ? Number(walkIn.age) : null;
      const res = await generateWalkInCampLogin({
        data: {
          explrCampId: walkIn.campId,
          childName: walkIn.name.trim() || undefined,
          childAge: age,
        },
      });
      setStatus(
        `Added ${res.childName}. Username ${res.username} · Password ${res.password}`,
      );
      setWalkIn(null);
      await load();
      setExpanded(walkIn.campId);
    } catch (e) {
      setStatus(
        e instanceof Error ? e.message : "Walk-in generation failed.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function saveEdit() {
    if (!editing || busy) return;
    if (!editing.name.trim()) {
      setStatus("Name can't be empty.");
      return;
    }
    setBusy(`edit-${editing.id}`);
    setStatus(null);
    try {
      const age = editing.age.trim() ? Number(editing.age) : null;
      await updateCampLoginName({
        data: { loginId: editing.id, childName: editing.name.trim(), childAge: age },
      });
      setStatus("Name updated.");
      setEditing(null);
      await load();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <p className="eyebrow">Admin</p>
      <h1 className="display mt-2">Camp logins</h1>
      <p className="lead mt-3 max-w-2xl">
        Camp students have no email, so EXPLR generates an account per
        ExplrMore registration — a username and a simple password you print
        and hand out. Generating accounts also links each student to the camp,
        so assessments you assign to the camp&apos;s educator reach them. Once
        a student finishes their assessment, print a family 1-pager with their
        login and RIASEC profile to send home.
      </p>

      {status && (
        <p className="mt-4 border border-charcoal-200 bg-charcoal-50 px-4 py-2 text-sm text-charcoal-700">
          {status}
        </p>
      )}

      <section className="mt-8">
        {loading ? (
          <p className="text-sm text-charcoal-400">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-charcoal-400">
            No camp sessions synced yet. Run an ExplrMore sync first.
          </p>
        ) : (
          <ul className="divide-y divide-charcoal-100 border-y border-charcoal-100">
            {sessions.map((s) => {
              const regN = regCounts[s.id] ?? 0;
              const logN = loginCounts[s.id] ?? 0;
              const pending = regN - logN;
              return (
                <li key={s.id} className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.title}</p>
                      <p className="truncate text-xs text-charcoal-500">
                        {s.date
                          ? new Date(s.date).toLocaleDateString()
                          : "Date TBD"}{" "}
                        · {regN} registered · {logN} login
                        {logN === 1 ? "" : "s"} generated
                        {pending > 0 ? ` · ${pending} pending` : ""}
                      </p>
                    </div>
                    {logN > 0 && (
                      <button
                        onClick={() => printCards(s.id, s.title)}
                        className="text-xs text-charcoal-500 hover:text-ink underline"
                      >
                        Print cards
                      </button>
                    )}
                    {logN > 0 && (
                      <button
                        onClick={() => printSheet(s.id, s.title)}
                        className="text-xs text-charcoal-500 hover:text-ink underline"
                      >
                        Roster sheet
                      </button>
                    )}
                    {reportableCount(s.id) > 0 && (
                      <button
                        onClick={() => printFamilyReports(s.id, s.title)}
                        className="text-xs text-explr-600 hover:underline"
                      >
                        Family reports ({reportableCount(s.id)})
                      </button>
                    )}
                    {logN > 0 && (
                      <button
                        onClick={() =>
                          setExpanded(expanded === s.id ? null : s.id)
                        }
                        className="text-xs text-charcoal-500 hover:text-ink underline"
                      >
                        {expanded === s.id ? "Hide" : "View"}
                      </button>
                    )}
                    <button
                      onClick={() =>
                        setWalkIn(
                          walkIn?.campId === s.id
                            ? null
                            : { campId: s.id, name: "", age: "" },
                        )
                      }
                      className="text-xs text-charcoal-500 hover:text-ink underline"
                    >
                      + Walk-in
                    </button>
                    <button
                      onClick={() => generate(s.id)}
                      disabled={busy === s.id || regN === 0}
                      className="btn-ink text-xs disabled:opacity-40"
                    >
                      {busy === s.id
                        ? "Generating…"
                        : pending > 0
                          ? `Generate ${pending}`
                          : "Re-check"}
                    </button>
                  </div>

                  {/* Walk-in mini-form: add a single drop-in camper not on
                      the ExplrMore roster. Name optional — defaults to
                      "Walk-in" and can be renamed in the table below. */}
                  {walkIn?.campId === s.id && (
                    <div className="mt-3 border border-charcoal-100 bg-charcoal-50 p-3">
                      <p className="eyebrow" style={{ margin: 0 }}>
                        Add walk-in camper
                      </p>
                      <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_120px_auto_auto]">
                        <input
                          autoFocus
                          className="field"
                          placeholder="Name (optional)"
                          value={walkIn.name}
                          onChange={(e) =>
                            setWalkIn({ ...walkIn, name: e.target.value })
                          }
                        />
                        <input
                          className="field"
                          type="number"
                          min={4}
                          max={18}
                          placeholder="Age"
                          value={walkIn.age}
                          onChange={(e) =>
                            setWalkIn({ ...walkIn, age: e.target.value })
                          }
                        />
                        <button
                          onClick={submitWalkIn}
                          disabled={busy === `walkin-${s.id}`}
                          className="btn-ink text-xs disabled:opacity-40"
                        >
                          {busy === `walkin-${s.id}` ? "Adding…" : "Add login"}
                        </button>
                        <button
                          onClick={() => setWalkIn(null)}
                          className="btn-ghost text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                      <p className="mt-2 text-[11px] text-charcoal-500">
                        Leave the name blank to add a quick &ldquo;Walk-in&rdquo; row;
                        you can rename it once you know the camper&apos;s name.
                      </p>
                    </div>
                  )}

                  {expanded === s.id && (
                    <div className="mt-3 overflow-x-auto border border-charcoal-100">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-charcoal-100 bg-charcoal-50 text-left text-xs uppercase tracking-wider text-charcoal-400">
                            <th className="px-3 py-2 font-normal">Student</th>
                            <th className="px-3 py-2 font-normal">Username</th>
                            <th className="px-3 py-2 font-normal">Password</th>
                            <th className="px-3 py-2 font-normal">Family report</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-charcoal-100">
                          {logins
                            .filter((l) => l.explr_camp_id === s.id)
                            .map((l) => {
                              const hasResult =
                                !!l.student_id && !!holland[l.student_id];
                              const isEditing = editing?.id === l.id;
                              return (
                                <tr key={l.id}>
                                  <td className="px-3 py-2">
                                    {isEditing ? (
                                      <div className="flex items-center gap-2">
                                        <input
                                          autoFocus
                                          className="field py-1 text-xs"
                                          value={editing!.name}
                                          onChange={(e) =>
                                            setEditing({
                                              ...editing!,
                                              name: e.target.value,
                                            })
                                          }
                                        />
                                        <input
                                          className="field py-1 text-xs w-16"
                                          type="number"
                                          min={4}
                                          max={18}
                                          placeholder="Age"
                                          value={editing!.age}
                                          onChange={(e) =>
                                            setEditing({
                                              ...editing!,
                                              age: e.target.value,
                                            })
                                          }
                                        />
                                        <button
                                          onClick={saveEdit}
                                          disabled={busy === `edit-${l.id}`}
                                          className="text-xs font-medium text-explr-600 hover:underline disabled:opacity-40"
                                        >
                                          {busy === `edit-${l.id}` ? "…" : "Save"}
                                        </button>
                                        <button
                                          onClick={() => setEditing(null)}
                                          className="text-xs text-charcoal-500 hover:underline"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <span>{l.child_name}</span>
                                        <button
                                          onClick={() =>
                                            setEditing({
                                              id: l.id,
                                              name: l.child_name,
                                              age: "",
                                            })
                                          }
                                          className="text-[11px] text-charcoal-400 hover:text-ink underline"
                                        >
                                          edit
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 font-mono text-xs">
                                    {l.username}
                                  </td>
                                  <td className="px-3 py-2 font-mono text-xs">
                                    {l.password_plain}
                                  </td>
                                  <td className="px-3 py-2 text-xs">
                                    {hasResult ? (
                                      <button
                                        onClick={() =>
                                          printFamilyReports(s.id, s.title, l)
                                        }
                                        className="text-explr-600 hover:underline"
                                      >
                                        Print 1-pager
                                      </button>
                                    ) : (
                                      <span className="text-charcoal-400">
                                        Awaiting assessment
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="mt-8 text-xs text-charcoal-400">
        Passwords are stored so you can re-print this sheet. Treat the sheet
        like a class roster — keep it secure and recycle it after camp.
      </p>
    </main>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
