import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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

  const loadCompletions = useCallback(async (formIds: string[]) => {
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
  }, [studentId]);

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
    const url = supabase.storage.from("form-uploads").getPublicUrl(path).data.publicUrl;
    const { error } = await sb("form_completions").upsert(
      { form_id: form.id, student_id: studentId, completed_file_url: url },
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
    <section className="border-t border-charcoal-100 pt-10">
      <p className="eyebrow">Worksite requirements &amp; forms</p>
      <p className="mt-3 text-sm text-charcoal-500">
        For the partner internships you selected. Review the requirements, complete the
        links, and download / sign the forms.
      </p>

      <div className="mt-6 space-y-8">
        {opps.map((o) => {
          const oForms = forms.filter((f) => oppIds.includes((f as { opportunity_id: string }).opportunity_id) && isFormFor(f, o.id));
          return (
            <div key={o.id} className="border border-charcoal-100 p-5">
              <p className="font-medium">{o.name || "Internship"}</p>

              {(o.requirements ?? []).length > 0 && (
                <div className="mt-3">
                  <p className="text-xs uppercase tracking-wider text-charcoal-400">Requirements</p>
                  <ul className="mt-1.5 space-y-1 text-sm">
                    {(o.requirements ?? []).map((r) => (
                      <li key={r} className="flex items-start gap-2">
                        <span className="text-charcoal-400">•</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(o.application_links ?? []).length > 0 && (
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wider text-charcoal-400">Links to complete</p>
                  <ul className="mt-1.5 space-y-1 text-sm">
                    {(o.application_links ?? []).map((l, i) => (
                      <li key={i}>
                        <a href={l.url} target="_blank" rel="noreferrer" className="text-explr-600 hover:underline">
                          {l.label || l.url} ↗
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {oForms.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wider text-charcoal-400">Forms</p>
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
    <li className="border border-charcoal-100 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex-1 text-sm font-medium">{form.name}</span>
        {form.file_url && (
          <a href={form.file_url} target="_blank" rel="noreferrer" className="text-xs text-explr-600 hover:underline">
            Download
          </a>
        )}
        <label className="cursor-pointer border border-dashed border-charcoal-300 bg-white px-3 py-1 text-xs hover:border-charcoal-500">
          {completion?.completed_file_url ? "Replace upload" : "Upload completed"}
          <input
            type="file"
            className="hidden"
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
            <span className="text-xs text-emerald-700">
              ✓ Signed by {completion.signed_name}
            </span>
          ) : (
            <>
              <input
                className="field w-48 py-1 text-xs"
                placeholder="Type your full name to sign"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button
                type="button"
                onClick={() => onSign(name)}
                disabled={!name.trim()}
                className="btn-ink text-xs disabled:opacity-40"
              >
                Sign
              </button>
            </>
          )}
        </div>
      )}

      {completion?.completed_file_url && (
        <p className="mt-1 text-xs text-emerald-700">✓ Uploaded</p>
      )}
    </li>
  );
}
