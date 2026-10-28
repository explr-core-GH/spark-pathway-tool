import { useCallback, useEffect, useState } from "react";
import { Building2, Check, ExternalLink, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signedFileUrl } from "@/lib/storage.functions";
import { storagePath } from "@/lib/storage-paths";
import type { AppLink, OpportunityForm, FormCompletion } from "@/lib/opportunities";

const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);

/**
 * OrgInternshipExtras — for the org internships a student has selected in the
 * apply flow, shows the worksite requirements, the links they must complete,
 * and the forms to download / upload completed / sign. Completion is saved to
 * form_completions; uploaded copies go to the form-uploads bucket.
 */

type OppLite = {
  id: string;
  name: string | null;
  requirements: string[] | null;
  application_links: AppLink[] | null;
};

export function OrgInternshipExtras({
  oppIds,
  studentId,
}: {
  oppIds: string[];
  studentId: string;
}) {
  const [opps, setOpps] = useState<OppLite[]>([]);
  const [forms, setForms] = useState<OpportunityForm[]>([]);
  const [completions, setCompletions] = useState<Record<string, FormCompletion>>({});
  const key = oppIds.slice().sort().join(",");

  const loadCompletions = useCallback(
    async (formIds: string[]) => {
      if (formIds.length === 0) {
        setCompletions({});
        return;
      }
      const { data } = await sb("form_completions")
        .select("*")
        .eq("student_id", studentId)
        .in("form_id", formIds);
      const m: Record<string, FormCompletion> = {};
      for (const c of (data as FormCompletion[]) ?? []) m[c.form_id] = c;
      setCompletions(m);
    },
    [studentId],
  );

  useEffect(() => {
    if (oppIds.length === 0) {
      setOpps([]);
      setForms([]);
      setCompletions({});
      return;
    }
    (async () => {
      const [{ data: o }, { data: f }] = await Promise.all([
        sb("opportunities").select("id, name, requirements, application_links").in("id", oppIds),
        sb("opportunity_forms").select("*").in("opportunity_id", oppIds).order("sort_order"),
      ]);
      const formRows = (f as OpportunityForm[]) ?? [];
      setOpps((o as OppLite[]) ?? []);
      setForms(formRows);
      await loadCompletions(formRows.map((x) => x.id));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  async function uploadCompleted(form: OpportunityForm, file: File) {
    const path = `completions/${studentId}/${form.id}-${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage
      .from("form-uploads")
      .upload(path, file, { contentType: file.type || undefined });
    if (upErr) {
      alert(upErr.message);
      return;
    }
    // Private bucket: store the object path; it's opened through a signed URL.
    const { error } = await sb("form_completions").upsert(
      { form_id: form.id, student_id: studentId, completed_file_url: path },
      { onConflict: "form_id,student_id" },
    );
    if (error) {
      alert(error.message);
      return;
    }
    loadCompletions(forms.map((x) => x.id));
  }

  async function sign(form: OpportunityForm, name: string) {
    if (!name.trim()) return;
    const { error } = await sb("form_completions").upsert(
      {
        form_id: form.id,
        student_id: studentId,
        signed_name: name.trim(),
        signed_at: new Date().toISOString(),
      },
      { onConflict: "form_id,student_id" },
    );
    if (error) {
      alert(error.message);
      return;
    }
    loadCompletions(forms.map((x) => x.id));
  }

  if (oppIds.length === 0) return null;

  return (
    <section className="border-t border-line pt-10">
      <p className="eyebrow">Worksite requirements &amp; forms</p>
      <p className="mt-3 text-sm text-ink-700">
        For the partner internships you selected. Review the requirements, complete the links, and
        download / sign the forms.
      </p>

      <div className="mt-6 space-y-8">
        {opps.map((o) => {
          const oForms = forms.filter(
            (f) =>
              oppIds.includes((f as { opportunity_id: string }).opportunity_id) &&
              isFormFor(f, o.id),
          );
          return (
            <div
              key={o.id}
              className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 shadow-card"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border border-mint-soft bg-mint-tint text-green-deep">
                  <Building2 className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
                </span>
                <p className="font-display text-xl font-semibold">{o.name || "Internship"}</p>
              </div>

              {(o.requirements ?? []).length > 0 && (
                <div className="mt-3">
                  <p className="eyebrow">Requirements</p>
                  <ul className="mt-1.5 space-y-1 text-sm">
                    {(o.requirements ?? []).map((r) => (
                      <li key={r} className="flex items-start gap-2">
                        <Check className="mt-1 h-4 w-4 shrink-0 text-green" aria-hidden />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(o.application_links ?? []).length > 0 && (
                <div className="mt-4">
                  <p className="eyebrow">Links to complete</p>
                  <ul className="mt-1.5 space-y-1 text-sm">
                    {(o.application_links ?? []).map((l, i) => (
                      <li key={i}>
                        <a
                          href={l.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-[44px] items-center gap-1.5 font-medium text-green-deep hover:underline"
                        >
                          {l.label || l.url}
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {oForms.length > 0 && (
                <div className="mt-4">
                  <p className="eyebrow">Forms</p>
                  <ul className="mt-2 space-y-3">
                    {oForms.map((f) => (
                      <FormRow
                        key={f.id}
                        form={f}
                        completion={completions[f.id]}
                        onUpload={(file) => uploadCompleted(f, file)}
                        onSign={(name) => sign(f, name)}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Open a completed form from the private bucket through a short-lived signed link. */
async function openFormUpload(value: string | null) {
  const path = storagePath("form-uploads", value);
  if (!path) return;
  const win = window.open("", "_blank");
  try {
    const { url } = await signedFileUrl({ data: { bucket: "form-uploads", path } });
    if (win) win.location.href = url;
    else window.location.href = url;
  } catch (e) {
    win?.close();
    alert(e instanceof Error ? e.message : String(e));
  }
}

function isFormFor(f: OpportunityForm, oppId: string): boolean {
  return (f as unknown as { opportunity_id: string }).opportunity_id === oppId;
}

function FormRow({
  form,
  completion,
  onUpload,
  onSign,
}: {
  form: OpportunityForm;
  completion: FormCompletion | undefined;
  onUpload: (file: File) => void;
  onSign: (name: string) => void;
}) {
  const [name, setName] = useState("");
  return (
    <li className="rounded-[var(--radius-control)] border border-line bg-paper p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="min-w-0 flex-1 text-sm font-medium">{form.name}</span>
        {form.file_url && (
          <a
            href={form.file_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[44px] items-center text-sm font-medium text-green-deep hover:underline"
          >
            Download<span className="sr-only"> {form.name} (opens in a new tab)</span>
          </a>
        )}
        <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-dashed border-line-strong bg-paper-raised px-3 text-sm hover:border-ink-900 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2">
          <Upload className="h-4 w-4 text-ink-500" aria-hidden />
          {completion?.completed_file_url ? "Replace upload" : "Upload completed"}
          <input
            type="file"
            aria-label={`${completion?.completed_file_url ? "Replace" : "Upload"} completed ${form.name}`}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {form.requires_signature && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {completion?.signed_name ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-mint-tint px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-green-deep">
              <Check className="h-3 w-3" aria-hidden /> Signed by {completion.signed_name}
            </span>
          ) : (
            <>
              <input
                className="field w-56"
                placeholder="Type your full name to sign"
                aria-label={`Type your full name to sign ${form.name}`}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button
                type="button"
                onClick={() => onSign(name)}
                disabled={!name.trim()}
                className="btn-ink disabled:opacity-40"
              >
                Sign
              </button>
            </>
          )}
        </div>
      )}

      {completion?.completed_file_url && (
        <p
          role="status"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-green-deep"
        >
          <Check className="h-3.5 w-3.5" aria-hidden /> Uploaded
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => openFormUpload(completion.completed_file_url)}
          >
            View
          </button>
        </p>
      )}
    </li>
  );
}
