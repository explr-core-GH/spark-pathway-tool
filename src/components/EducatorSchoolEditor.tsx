import { useState } from "react";
import { SchoolSearch, type SchoolPick } from "./SchoolSearch";
import { SchoolDemographics } from "./SchoolDemographics";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  educatorId: string;
  initialIrn: string | null;
  initialName: string | null;
};

export function EducatorSchoolEditor({ educatorId, initialIrn, initialName }: Props) {
  const [school, setSchool] = useState<SchoolPick | null>(
    initialIrn && initialName ? { irn: initialIrn, name: initialName } : null,
  );
  const [status, setStatus] = useState<string | null>(null);

  async function persist(next: SchoolPick) {
    const cleared = !next.irn;
    const value = cleared ? null : next;
    setSchool(value);
    const { error } = await supabase
      .from("educators")
      .update({
        school_irn: value?.irn ?? null,
        school_name: value?.name ?? null,
      })
      .eq("id", educatorId);
    setStatus(error ? `Error: ${error.message}` : "Saved.");
  }

  return (
    <div className="space-y-3">
      <SchoolSearch initial={school} onSelect={persist} />
      {status && <p className="text-xs text-charcoal-400">{status}</p>}
      {school?.irn && <SchoolDemographics irn={school.irn} />}
    </div>
  );
}
