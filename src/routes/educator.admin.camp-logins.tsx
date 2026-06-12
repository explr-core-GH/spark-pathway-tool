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
import { CampAssignmentsPanel } from "@/components/CampAssignmentsPanel";
import { RosterDataPanel } from "@/components/RosterDataPanel";
import { RosterLiveMonitor } from "@/components/RosterLiveMonitor";

export const Route = createFileRoute("/educator/admin/camp-logins")({
  head: () => ({ meta: [{ title: "Camp logins — Admin" }] }),
  component: CampLoginsAdmin,
});

type CampSession = { id: string; title: string; date: string | null };
type Login = {
  id: string;
  explr_camp_id: string;
  student_id: string | null;
  child_name: string;
  username: string;
  password_plain: string;
  classroom: string | null;
};

type SortBy = "name" | "classroom" | "finished" | "unfinished";
type CompareResult = { campId: string; matched: number; missing: string[]; extra: string[] };

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
  // Camp id whose "Results & timing" panel is open (lazy — the panel only
  // mounts, and only fires its queries, when an admin opens it).
  const [dataOpen, setDataOpen] = useState<string | null>(null);
  // Camp id whose "Live monitor" is open (lazy + polls only while open).
  const [monitorOpen, setMonitorOpen] = useState<string | null>(null);

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

  // Roster organizing: sort order, in-flight classroom edits, and the result
  // of a "compare against a list" upload.
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [classDraft, setClassDraft] = useState<Record<string, string>>({});
  const [compare, setCompare] = useState<CompareResult | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: ss }, { data: regs }, { data: lg }] = await Promise.all([
      supabase
        .from("explr_camps")
        .select("id, title, date")
        .order("date", { ascending: true }),
      supabase.from("explr_registrations").select("camp_id"),
      // select("*") so the new classroom column degrades gracefully before the
      // migration is applied.
      supabase.from("camp_student_logins").select("*"),
    ]);
    setSessions((ss ?? []) as CampSession[]);
    const counts: Record<string, number> = {};
    for (const r of (regs ?? []) as Array<{ camp_id: string }>) {
      counts[r.camp_id] = (counts[r.camp_id] ?? 0) + 1;
    }
    setRegCounts(counts);
    const loginRows = (lg ?? []) as unknown as Login[];
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
    const rows = sortLogins(logins.filter((l) => l.explr_camp_id === campId));
    if (rows.length === 0) return;
    const signInUrl = `${window.location.origin}/sign-in`;
    const cards = rows
      .map((r) => {
        const first = escapeHtml(r.child_name.trim().split(/\s+/)[0] || "friend");
        const fullName = escapeHtml(r.child_name.trim() || "Student");
        const classroom = r.classroom ? escapeHtml(r.classroom) : "";
        const localUser = escapeHtml(r.username.split("@")[0] || r.username);
        const pw = escapeHtml(r.password_plain);
        return `
          <div class="card">
            <div class="brand">EXPLR <span>Pathways</span></div>
            <div class="hi">Hi, ${first}!</div>
            <div class="fullname">${fullName}${classroom ? ` <span class="room">· ${classroom}</span>` : ""}</div>
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
        .hi { font-size: 14px; font-weight: 600; margin-top: 6px; color: #2c3033; }
        .fullname { font-size: 17px; color: #1A1D1F; font-weight: 700; margin-top: 2px; line-height: 1.15; }
        .fullname .room { font-size: 12px; font-weight: 500; color: #6E767F; }
        .step { font-size: 12px; color: #2c3033; margin-top: 6px; line-height: 1.4; }
        .creds { border-collapse: collapse; width: 100%; margin-top: 4px; }
        .creds td { padding: 4px 0; font-size: 13px; vertical-align: middle; }
        .creds td:first-child { color: #6E767F; width: 78px; }
        code { font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 14px; font-weight: 600; background: #FFF8C5;
          padding: 2px 6px; border-radius: 2px; }
        code.url { font-size: 11px; background: #EDEEF0; font-weight: 500; white-space: nowrap; }
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
    const rows = sortLogins(logins.filter((l) => l.explr_camp_id === campId));
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
      <table><thead><tr><th>Classroom</th><th>Student</th><th>Username</th><th>Password</th></tr></thead><tbody>
      ${rows
        .map(
          (r) =>
            `<tr><td>${escapeHtml(r.classroom ?? "")}</td><td>${escapeHtml(r.child_name)}</td><td><code>${escapeHtml(
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

  // Camp title lookup for the report header.
  function campTitle(campId: string): string {
    return sessions.find((s) => s.id === campId)?.title ?? "Camp";
  }

  /** Build family-report pages for a set of logins (only those with a
   *  completed assessment / Holland code). Generates one "scan to log in" QR
   *  for the sign-in page and reuses it across every report. */
  async function reportPagesFor(pool: Login[]): Promise<string[]> {
    const signInUrl = `${window.location.origin}/sign-in`;
    let loginQrDataUrl: string | undefined;
    try {
      const QRCode = (await import("qrcode")).default;
      loginQrDataUrl = await QRCode.toDataURL(signInUrl, {
        width: 220,
        margin: 1,
        color: { dark: "#1A1D1F", light: "#ffffff" },
      });
    } catch {
      /* QR is optional — the report still prints without it. */
    }
    return pool
      .filter((l) => l.student_id && holland[l.student_id])
      .map((l) =>
        familyReportPageHtml({
          childName: l.child_name,
          campTitle: campTitle(l.explr_camp_id),
          username: l.username.split("@")[0] || l.username,
          password: l.password_plain,
          signInUrl,
          hollandCode: holland[l.student_id as string],
          loginQrDataUrl,
        }),
      );
  }

  // Fill a print window (opened synchronously in the click, so the popup
  // blocker doesn't fire after the async QR generation).
  function finishPrint(w: Window | null, pages: string[]) {
    if (!w) return;
    if (pages.length === 0) {
      w.close();
      setStatus(
        "No family reports to print yet — students need to finish the assessment first.",
      );
      return;
    }
    w.document.write(familyReportDocument(pages));
    w.document.close();
    w.focus();
    w.print();
  }

  /**
   * Print the family 1-pager for one camp's students who have results,
   * or — when `onlyLogin` is given — just that one student.
   */
  async function printFamilyReports(campId: string, _title: string, onlyLogin?: Login) {
    const w = window.open("", "_blank");
    const pool = onlyLogin
      ? [onlyLogin]
      : logins.filter((l) => l.explr_camp_id === campId);
    finishPrint(w, await reportPagesFor(pool));
  }

  /** Print every student's family report across all camps, in one job. */
  async function printAllFamilyReports() {
    const w = window.open("", "_blank");
    finishPrint(w, await reportPagesFor(logins));
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

  // ── Roster organizing helpers ──────────────────────────────────────────
  const isDone = (l: Login) => !!(l.student_id && holland[l.student_id]);

  function sortLogins(rows: Login[]): Login[] {
    const byName = (a: Login, b: Login) => a.child_name.localeCompare(b.child_name);
    const copy = [...rows];
    switch (sortBy) {
      case "classroom":
        return copy.sort(
          (a, b) => (a.classroom ?? "~").localeCompare(b.classroom ?? "~") || byName(a, b),
        );
      case "finished":
        return copy.sort((a, b) => Number(isDone(b)) - Number(isDone(a)) || byName(a, b));
      case "unfinished":
        return copy.sort((a, b) => Number(isDone(a)) - Number(isDone(b)) || byName(a, b));
      default:
        return copy.sort(byName);
    }
  }

  async function saveClassroom(l: Login, raw: string) {
    const value = raw.trim();
    if ((l.classroom ?? "") === value) return;
    setLogins((prev) => prev.map((x) => (x.id === l.id ? { ...x, classroom: value || null } : x)));
    const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);
    const { error } = await sb("camp_student_logins").update({ classroom: value || null }).eq("id", l.id);
    if (error) setStatus(`Couldn't save classroom: ${error.message}`);
  }

  /** Export this camp's roster (incl. classroom, login, status, RIASEC) to .xlsx. */
  async function exportXlsx(campId: string, title: string) {
    const rows = sortLogins(logins.filter((l) => l.explr_camp_id === campId));
    if (rows.length === 0) return;
    const XLSX = await import("xlsx");
    const data = rows.map((l) => ({
      Classroom: l.classroom ?? "",
      Name: l.child_name,
      Username: l.username.split("@")[0] || l.username,
      Password: l.password_plain,
      Assessment: isDone(l) ? "Finished" : "Not finished",
      "Holland code": (l.student_id && holland[l.student_id]) || "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Roster");
    XLSX.writeFile(wb, `${safeFileName(title)}-roster.xlsx`);
  }

  /** Compare an uploaded CSV/Excel name list against this camp's roster. */
  async function onCompareFile(campId: string, file: File) {
    setStatus(null);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false });
      const uploaded: string[] = [];
      for (const row of grid) {
        const cell = (row ?? []).map((c) => String(c ?? "").trim()).find(Boolean);
        if (cell) uploaded.push(cell);
      }
      // Drop an obvious header row ("name", "student", …).
      if (uploaded.length && /name|student/i.test(uploaded[0])) uploaded.shift();

      const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
      const rosterNames = logins.filter((l) => l.explr_camp_id === campId).map((l) => l.child_name);
      const rosterSet = new Set(rosterNames.map(norm));
      const uploadedSet = new Set(uploaded.map(norm));
      const missing = uploaded.filter((n) => !rosterSet.has(norm(n)));
      const extra = rosterNames.filter((n) => !uploadedSet.has(norm(n)));
      setCompare({ campId, matched: uploaded.length - missing.length, missing, extra });
    } catch (e) {
      setStatus(e instanceof Error ? `Couldn't read file: ${e.message}` : "Couldn't read file.");
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

      <p className="mt-3">
        <a
          href="/educator/login-display"
          target="_blank"
          rel="noreferrer"
          className="text-sm text-explr-600 hover:underline"
        >
          Open the &ldquo;How to log in&rdquo; display page for students &rarr;
        </a>
      </p>

      {status && (
        <p className="mt-4 border border-charcoal-200 bg-charcoal-50 px-4 py-2 text-sm text-charcoal-700">
          {status}
        </p>
      )}

      {/* Bulk action across every camp. */}
      {!loading && logins.length > 0 && (
        <div className="mt-6">
          <button onClick={printAllFamilyReports} className="btn-ink text-xs">
            Print all family reports
          </button>
          <span className="ml-3 text-xs text-charcoal-400">
            One job, every student across all camps who has finished their
            assessment.
          </span>
        </div>
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
                  <div>
                    {/* What's assigned to this camp + how far along the
                        roster is. Camera-targeted assignments live here
                        alongside ones cascaded via the camp's educators. */}
                    <div className="mt-3 border border-charcoal-100 bg-charcoal-50 p-4">
                      <p className="eyebrow" style={{ margin: 0 }}>
                        Assignments
                      </p>
                      <div className="mt-2">
                        <CampAssignmentsPanel
                          campId={s.id}
                          studentIds={logins
                            .filter((l) => l.explr_camp_id === s.id)
                            .map((l) => l.student_id)
                            .filter((x): x is string => !!x)}
                        />
                      </div>
                    </div>

                    {/* Live monitor — lazy + polls only while open. */}
                    <div className="mt-3 border border-charcoal-100 bg-charcoal-50 p-4">
                      <div className="flex items-center justify-between">
                        <p className="eyebrow" style={{ margin: 0 }}>
                          Live monitor
                        </p>
                        <button
                          onClick={() =>
                            setMonitorOpen(monitorOpen === s.id ? null : s.id)
                          }
                          className="text-xs text-charcoal-500 hover:text-ink underline"
                        >
                          {monitorOpen === s.id ? "Hide" : "Show"}
                        </button>
                      </div>
                      {monitorOpen === s.id && (
                        <div className="mt-3">
                          <RosterLiveMonitor
                            studentIds={logins
                              .filter((l) => l.explr_camp_id === s.id)
                              .map((l) => l.student_id)
                              .filter((x): x is string => !!x)}
                            names={Object.fromEntries(
                              logins
                                .filter(
                                  (l) => l.explr_camp_id === s.id && l.student_id,
                                )
                                .map((l) => [l.student_id as string, l.child_name]),
                            )}
                          />
                        </div>
                      )}
                    </div>

                    {/* Results & timing — lazy: the panel (and its queries)
                        only mount when an admin opens this. */}
                    <div className="mt-3 border border-charcoal-100 bg-charcoal-50 p-4">
                      <div className="flex items-center justify-between">
                        <p className="eyebrow" style={{ margin: 0 }}>
                          Results &amp; timing
                        </p>
                        <button
                          onClick={() =>
                            setDataOpen(dataOpen === s.id ? null : s.id)
                          }
                          className="text-xs text-charcoal-500 hover:text-ink underline"
                        >
                          {dataOpen === s.id ? "Hide" : "Show"}
                        </button>
                      </div>
                      {dataOpen === s.id && (
                        <div className="mt-3">
                          <RosterDataPanel
                            studentIds={logins
                              .filter((l) => l.explr_camp_id === s.id)
                              .map((l) => l.student_id)
                              .filter((x): x is string => !!x)}
                            names={Object.fromEntries(
                              logins
                                .filter(
                                  (l) =>
                                    l.explr_camp_id === s.id && l.student_id,
                                )
                                .map((l) => [l.student_id as string, l.child_name]),
                            )}
                          />
                        </div>
                      )}
                    </div>

                    {/* Roster toolbar — sort, export to Excel, compare a list. */}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <label className="text-xs text-charcoal-500">
                        Sort:{" "}
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as SortBy)}
                          className="border border-charcoal-200 px-2 py-1 text-xs"
                        >
                          <option value="name">Name A–Z</option>
                          <option value="classroom">Classroom</option>
                          <option value="finished">Finished first</option>
                          <option value="unfinished">Not finished first</option>
                        </select>
                      </label>
                      <button
                        onClick={() => exportXlsx(s.id, s.title)}
                        className="text-xs text-charcoal-500 underline hover:text-ink"
                      >
                        Export Excel
                      </button>
                      <label className="cursor-pointer text-xs text-charcoal-500 underline hover:text-ink">
                        Compare against a list…
                        <input
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          className="sr-only"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) onCompareFile(s.id, f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>

                    {compare?.campId === s.id && (
                      <div className="mt-3 border border-charcoal-200 bg-charcoal-50 p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">Compared against your list</p>
                          <button
                            onClick={() => setCompare(null)}
                            className="text-charcoal-400 hover:text-ink"
                          >
                            Dismiss
                          </button>
                        </div>
                        <p className="mt-1 text-charcoal-600">
                          {compare.matched} matched · {compare.missing.length} on your list but not in
                          EXPLR · {compare.extra.length} in EXPLR but not on your list
                        </p>
                        {compare.missing.length > 0 && (
                          <p className="mt-2">
                            <span className="font-medium">Missing from EXPLR:</span>{" "}
                            {compare.missing.join(", ")}
                          </p>
                        )}
                        {compare.extra.length > 0 && (
                          <p className="mt-1">
                            <span className="font-medium">Extra in EXPLR (not on your list):</span>{" "}
                            {compare.extra.join(", ")}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-3 overflow-x-auto border border-charcoal-100">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-charcoal-100 bg-charcoal-50 text-left text-xs uppercase tracking-wider text-charcoal-400">
                            <th className="px-3 py-2 font-normal">Student</th>
                            <th className="px-3 py-2 font-normal">Classroom</th>
                            <th className="px-3 py-2 font-normal">Status</th>
                            <th className="px-3 py-2 font-normal">Username</th>
                            <th className="px-3 py-2 font-normal">Password</th>
                            <th className="px-3 py-2 font-normal">Family report</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-charcoal-100">
                          {sortLogins(logins.filter((l) => l.explr_camp_id === s.id)).map((l) => {
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
                                  <td className="px-3 py-2">
                                    <input
                                      className="field w-28 py-1 text-xs"
                                      placeholder="—"
                                      aria-label={`Classroom for ${l.child_name}`}
                                      value={classDraft[l.id] ?? l.classroom ?? ""}
                                      onChange={(e) =>
                                        setClassDraft({ ...classDraft, [l.id]: e.target.value })
                                      }
                                      onBlur={(e) => saveClassroom(l, e.target.value)}
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-xs">
                                    {hasResult ? (
                                      <span style={{ color: "var(--color-explr-600)" }}>Finished</span>
                                    ) : (
                                      <span className="text-charcoal-400">Not yet</span>
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

function safeFileName(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "camp";
}
