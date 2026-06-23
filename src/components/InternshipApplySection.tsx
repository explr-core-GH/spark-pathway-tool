import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AppLink, OpportunityForm, FormCompletion } from "@/lib/opportunities";

const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);

export type Proof = { url: string; label: string; screenshot_url: string | null };

/**
 * InternshipApplySection — stage 2, one approved org internship. Shows the
 * worksite requirements, the links the student must complete WITH a required
 * screenshot upload as proof, and the forms to download / upload / sign.
 * Reports its link proofs up so the page can require them before submit.
 */
export function InternshipApplySection({
  selectionId,
  opportunityId,
  studentId,
  name,
  onProofs,
}: {
  selectionId: string;
  opportunityId: string;
  studentId: string;
  name: string;
  onProofs: (selectionId: string, proofs: Proof[]) => void;
}) {
  const [requirements, setRequirements] = useState<string[]>([]);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [forms, setForms] = useState<OpportunityForm[]>([]);
  const [completions, setCompletions] = useState<Record<string, FormCompletion>>({});

  const report = useCallback(
    (p: Proof[]) => {
      setProofs(p);
      onProofs(selectionId, p);
    },
    [selectionId, onProofs],
  );

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
    (async () => {
      const { data: o } = await sb("opportunities")
        .select("requirements, application_links")
        .eq("id", opportunityId)
        .maybeSingle();
      const lks = ((o?.application_links as AppLink[]) ?? []).filter((l) => l.url);
      setRequirements((o?.requirements as string[]) ?? []);
      report(lks.map((l) => ({ url: l.url, label: l.label, screenshot_url: null })));

      const { data: f } = await sb("opportunity_forms")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .order("sort_order");
      const formRows = (f as OpportunityForm[]) ?? [];
      setForms(formRows);
      loadCompletions(formRows.map((x) => x.id));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunityId]);

  async function uploadProof(i: number, file: File) {
    const path = `proofs/${studentId}/${selectionId}-${i}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from("form-uploads")
      .upload(path, file, { contentType: file.type || undefined });
    if (error) {
      alert(error.message);
      return;
    }
    const url = supabase.storage.from("form-uploads").getPublicUrl(path).data.publicUrl;
    report(proofs.map((p, j) => (j === i ? { ...p, screenshot_url: url } : p)));
  }

  async function uploadCompleted(form: OpportunityForm, file: File) {
    const path = `completions/${studentId}/${form.id}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from("form-uploads")
      .upload(path, file, { contentType: file.type || undefined });
    if (error) {
      alert(error.message);
      return;
    }
    const url = supabase.storage.from("form-uploads").getPublicUrl(path).data.publicUrl;
    const { error: e2 } = await sb("form_completions").upsert(
      { form_id: form.id, student_id: studentId, completed_file_url: url },
      { onConflict: "form_id,student_id" },
    );
    if (e2) {
      alert(e2.message);
      return;
    }
    loadCompletions(forms.map((x) => x.id));
  }

  async function sign(form: OpportunityForm, signName: string) {
    if (!signName.trim()) return;
    const { error } = await sb("form_completions").upsert(
      { form_id: form.id, student_id: studentId, signed_name: signName.trim(), signed_at: new Date().toISOString() },
      { onConflict: "form_id,student_id" },
    );
    if (error) {
      alert(error.message);
      return;
    }
    loadCompletions(forms.map((x) => x.id));
  }

  return (
    <div className="border border-charcoal-100 p-5">
      <p className="font-medium">{name}</p>

      {requirements.length > 0 && (
        <div className="mt-3">
          <p className="text-xs uppercase tracking-wider text-charcoal-400">Requirements</p>
          <ul className="mt-1.5 space-y-1 text-sm">
            {requirements.map((r) => (
              <li key={r} className="flex items-start gap-2">
                <span className="text-charcoal-400">•</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {proofs.length > 0 && (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-wider text-charcoal-400">
            Complete these links, then upload a screenshot as proof
          </p>
          <ul className="mt-2 space-y-3">
            {proofs.map((p, i) => (
              <li key={i} className="border border-charcoal-100 p-3">
                <a href={p.url} target="_blank" rel="noreferrer" className="text-sm text-explr-600 hover:underline">
                  {p.label || p.url} ↗
                </a>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label className="cursor-pointer border border-dashed border-charcoal-300 bg-white px-3 py-1 text-xs hover:border-charcoal-500">
                    {p.screenshot_url ? "Replace screenshot" : "Upload screenshot *"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadProof(i, f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {p.screenshot_url ? (
                    <span className="text-xs text-emerald-700">✓ uploaded</span>
                  ) : (
                    <span className="text-xs text-amber-700">required</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {forms.length > 0 && (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-wider text-charcoal-400">Forms</p>
          <ul className="mt-2 space-y-3">
            {forms.map((f) => (
              <FormRow
                key={f.id}
                form={f}
                completion={completions[f.id]}
                onUpload={(file) => uploadCompleted(f, file)}
                onSign={(n) => sign(f, n)}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
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
            <span className="text-xs text-emerald-700">✓ Signed by {completion.signed_name}</span>
          ) : (
            <>
              <input
                className="field w-48 py-1 text-xs"
                placeholder="Type your full name to sign"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button type="button" onClick={() => onSign(name)} disabled={!name.trim()} className="btn-ink text-xs disabled:opacity-40">
                Sign
              </button>
            </>
          )}
        </div>
      )}
      {completion?.completed_file_url && <p className="mt-1 text-xs text-emerald-700">✓ Uploaded</p>}
    </li>
  );
}
