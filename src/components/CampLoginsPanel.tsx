import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  generateCampLogins,
  generateWalkInCampLogin,
  updateCampLoginName,
} from "@/lib/camp-logins.functions";
import { familyReportPageHtml, familyReportDocument } from "@/lib/family-report";

/**
 * CampLoginsPanel — student logins for ONE camp, inside its workspace.
 *
 * A scoped version of the standalone /educator/admin/camp-logins page:
 * generate accounts, add a walk-in, edit names + classrooms, print cards /
 * roster sheets / family 1-pagers, and export the roster to Excel. Niche
 * extras (compare-a-list, live monitor, print-all-camps) stay on the full page.
 */

const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);

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

export function CampLoginsPanel({ campId, title }: { campId: string; title: string }) {
  const [logins, setLogins] = useState<Login[]>([]);
  const [regCount, setRegCount] = useState(0);
  const [holland, setHolland] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [walkIn, setWalkIn] = useState<{ name: string; age: string } | null>(null);
  const [editing, setEditing] = useState<{ id: string; name: string; age: string } | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [classDraft, setClassDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: regs }, { data: lg }] = await Promise.all([
      supabase.from("explr_registrations").select("camp_id").eq("camp_id", campId),
      supabase.from("camp_student_logins").select("*").eq("explr_camp_id", campId),
    ]);
    setRegCount((regs ?? []).length);
    const rows = (lg ?? []) as unknown as Login[];
    setLogins(rows);

    const studentIds = rows.map((l) => l.student_id).filter((x): x is string => !!x);
    if (studentIds.length > 0) {
      const { data: sess } = await supabase
        .from("assessment_sessions")
        .select("student_id, holland_code, completed_at")
        .in("student_id", studentIds)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false });
      const hmap: Record<string, string> = {};
      for (const s of (sess ?? []) as Array<{ student_id: string; holland_code: string | null }>) {
        if (hmap[s.student_id]) continue;
        if (s.holland_code) hmap[s.student_id] = s.holland_code;
      }
      setHolland(hmap);
    } else {
      setHolland({});
    }
    setLoading(false);
  }, [campId]);

  useEffect(() => {
    load();
  }, [load]);

  const isDone = useCallback(
    (l: Login) => !!(l.student_id && holland[l.student_id]),
    [holland],
  );

  const sortLogins = useCallback(
    (rows: Login[]): Login[] => {
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
    },
    [sortBy, isDone],
  );

  const pending = regCount - logins.length;
  const reportable = useMemo(
    () => logins.filter((l) => l.student_id && holland[l.student_id]).length,
    [logins, holland],
  );

  async function generate() {
    setBusy("gen");
    setStatus(null);
    try {
      const res = await generateCampLogins({ data: { explrCampId: campId } });
      setStatus(
        `Generated ${res.created} new login${res.created === 1 ? "" : "s"} · ${res.skipped} already existed` +
          (res.failed > 0 ? ` · ${res.failed} failed` : ""),
      );
      await load();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setBusy(null);
    }
  }

  async function submitWalkIn() {
    if (!walkIn || busy) return;
    setBusy("walkin");
    setStatus(null);
    try {
      const age = walkIn.age.trim() ? Number(walkIn.age) : null;
      const res = await generateWalkInCampLogin({
        data: { explrCampId: campId, childName: walkIn.name.trim() || undefined, childAge: age },
      });
      setStatus(`Added ${res.childName}. Username ${res.username} · Password ${res.password}`);
      setWalkIn(null);
      await load();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Walk-in generation failed.");
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

  async function saveClassroom(l: Login, raw: string) {
    const value = raw.trim();
    if ((l.classroom ?? "") === value) return;
    setLogins((prev) => prev.map((x) => (x.id === l.id ? { ...x, classroom: value || null } : x)));
    const { error } = await sb("camp_student_logins")
      .update({ classroom: value || null })
      .eq("id", l.id);
    if (error) setStatus(`Couldn't save classroom: ${error.message}`);
  }

  function printCards() {
    const rows = sortLogins(logins);
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
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)} — student cards</title>
      <style>
        @page { size: letter; margin: 0.4in; }
        body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #1A1D1F; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.25in; }
        .card { border: 2px dashed #B8BCC1; padding: 16px 18px; break-inside: avoid; page-break-inside: avoid; min-height: 2.15in; display: flex; flex-direction: column; }
        .brand { font-size: 12px; font-weight: 600; } .brand span { color: #15A36B; }
        .hi { font-size: 14px; font-weight: 600; margin-top: 6px; color: #2c3033; }
        .fullname { font-size: 17px; color: #1A1D1F; font-weight: 700; margin-top: 2px; line-height: 1.15; }
        .fullname .room { font-size: 12px; font-weight: 500; color: #6E767F; }
        .step { font-size: 12px; color: #2c3033; margin-top: 6px; line-height: 1.4; }
        .creds { border-collapse: collapse; width: 100%; margin-top: 4px; }
        .creds td { padding: 4px 0; font-size: 13px; vertical-align: middle; }
        .creds td:first-child { color: #6E767F; width: 78px; }
        code { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 14px; font-weight: 600; background: #FFF8C5; padding: 2px 6px; border-radius: 2px; }
        code.url { font-size: 11px; background: #EDEEF0; font-weight: 500; white-space: nowrap; }
        .foot { margin-top: auto; padding-top: 8px; font-size: 10px; color: #9aa1a8; }
      </style></head><body><div class="grid">${cards}</div></body></html>`;
    openPrint(html);
  }

  function printSheet() {
    const rows = sortLogins(logins);
    const html = `<!doctype html><html><head><title>${escapeHtml(title)} — logins</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:24px;color:#1A1D1F}
        h1{font-size:18px;margin:0 0 4px} p{color:#6E767F;font-size:12px;margin:0 0 16px}
        table{border-collapse:collapse;width:100%;font-size:13px}
        th,td{text-align:left;padding:6px 10px;border-bottom:1px solid #E6E8EA}
        th{text-transform:uppercase;font-size:10px;letter-spacing:.08em;color:#6E767F}
        code{font-family:ui-monospace,monospace}
      </style></head><body>
      <h1>${escapeHtml(title)}</h1>
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
    openPrint(html);
  }

  async function printFamilyReports(onlyLogin?: Login) {
    const w = window.open("", "_blank");
    const pool = onlyLogin ? [onlyLogin] : logins;
    const signInUrl = `${window.location.origin}/sign-in`;
    let loginQrSvg: string | undefined;
    try {
      const QRCode = (await import("qrcode")).default;
      loginQrSvg = await QRCode.toString(signInUrl, {
        type: "svg",
        margin: 1,
        color: { dark: "#1A1D1F", light: "#ffffff" },
      });
    } catch {
      /* QR optional */
    }
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
          loginQrSvg,
        }),
      );
    if (!w) return;
    if (pages.length === 0) {
      w.close();
      setStatus("No family reports yet — students need to finish the assessment first.");
      return;
    }
    w.document.write(familyReportDocument(pages));
    w.document.close();
    w.focus();
    w.print();
  }

  async function exportXlsx() {
    const rows = sortLogins(logins);
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

  if (loading) return <p className="text-sm text-charcoal-400">Loading logins…</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-charcoal-600">
          {regCount} registered · {logins.length} login{logins.length === 1 ? "" : "s"}
          {pending > 0 ? ` · ${pending} pending` : ""}
        </span>
        <button
          onClick={generate}
          disabled={busy === "gen" || regCount === 0}
          className="btn-ink text-xs disabled:opacity-40"
        >
          {busy === "gen" ? "Generating…" : pending > 0 ? `Generate ${pending}` : "Re-check"}
        </button>
        <button
          onClick={() => setWalkIn(walkIn ? null : { name: "", age: "" })}
          className="text-xs text-charcoal-500 underline hover:text-ink"
        >
          + Walk-in
        </button>
        {logins.length > 0 && (
          <>
            <button onClick={printCards} className="text-xs text-charcoal-500 underline hover:text-ink">
              Print cards
            </button>
            <button onClick={printSheet} className="text-xs text-charcoal-500 underline hover:text-ink">
              Roster sheet
            </button>
            <button onClick={exportXlsx} className="text-xs text-charcoal-500 underline hover:text-ink">
              Export Excel
            </button>
          </>
        )}
        {reportable > 0 && (
          <button
            onClick={() => printFamilyReports()}
            className="text-xs text-explr-600 hover:underline"
          >
            Family reports ({reportable})
          </button>
        )}
      </div>

      {status && (
        <p className="mt-3 border border-charcoal-200 bg-charcoal-50 px-3 py-2 text-sm text-charcoal-700">
          {status}
        </p>
      )}

      {walkIn && (
        <div className="mt-3 border border-charcoal-100 bg-charcoal-50 p-3">
          <p className="eyebrow" style={{ margin: 0 }}>Add walk-in camper</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_120px_auto_auto]">
            <input
              autoFocus
              className="field"
              placeholder="Name (optional)"
              value={walkIn.name}
              onChange={(e) => setWalkIn({ ...walkIn, name: e.target.value })}
            />
            <input
              className="field"
              type="number"
              min={4}
              max={18}
              placeholder="Age"
              value={walkIn.age}
              onChange={(e) => setWalkIn({ ...walkIn, age: e.target.value })}
            />
            <button
              onClick={submitWalkIn}
              disabled={busy === "walkin"}
              className="btn-ink text-xs disabled:opacity-40"
            >
              {busy === "walkin" ? "Adding…" : "Add login"}
            </button>
            <button onClick={() => setWalkIn(null)} className="btn-ghost text-xs">
              Cancel
            </button>
          </div>
        </div>
      )}

      {logins.length > 0 && (
        <>
          <div className="mt-4">
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
          </div>

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
                {sortLogins(logins).map((l) => {
                  const hasResult = !!l.student_id && !!holland[l.student_id];
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
                              onChange={(e) => setEditing({ ...editing!, name: e.target.value })}
                            />
                            <input
                              className="field w-16 py-1 text-xs"
                              type="number"
                              min={4}
                              max={18}
                              placeholder="Age"
                              value={editing!.age}
                              onChange={(e) => setEditing({ ...editing!, age: e.target.value })}
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
                              onClick={() => setEditing({ id: l.id, name: l.child_name, age: "" })}
                              className="text-[11px] text-charcoal-400 underline hover:text-ink"
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
                          onChange={(e) => setClassDraft({ ...classDraft, [l.id]: e.target.value })}
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
                      <td className="px-3 py-2 font-mono text-xs">{l.username}</td>
                      <td className="px-3 py-2 font-mono text-xs">{l.password_plain}</td>
                      <td className="px-3 py-2 text-xs">
                        {hasResult ? (
                          <button
                            onClick={() => printFamilyReports(l)}
                            className="text-explr-600 hover:underline"
                          >
                            Print 1-pager
                          </button>
                        ) : (
                          <span className="text-charcoal-400">Awaiting assessment</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {logins.length === 0 && (
        <p className="mt-4 text-sm text-charcoal-400">
          No logins generated yet. Generating accounts links each student to this camp.
        </p>
      )}
    </div>
  );
}

function openPrint(html: string) {
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }
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
