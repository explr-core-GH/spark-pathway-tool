import { useState } from "react";
import { SchoolSearch } from "./SchoolSearch";
import { SchoolDemographics } from "./SchoolDemographics";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  educatorId: string;
  initialIrn: string | null;
  initialName: string | null;
};

export function EducatorSchoolEditor({ educatorId, initialIrn, initialName }: Props) {
  const [school, setSchool] = useState<{ irn: string; name: string } | null>(
    initialIrn && initialName ? { irn: initialIrn, name: initialName } : null,
  );
  const [status, setStatus] = useState<string | null>(null);

  async function persist(next: { irn: string; name: string } | null) {
    setSchool(next);
    const { error } = await supabase
      .from("educators")
      .update({ school_irn: next?.irn ?? null, school_name: next?.name ?? null })
      .eq("id", educatorId);
    setStatus(error ? `Error: ${error.message}` : "Saved.");
  }

  return (
    <div className="space-y-3">
      <SchoolSearch value={school} onChange={persist} />
      {status && <p className="text-xs text-charcoal-400">{status}</p>}
      {school && <SchoolDemographics irn={school.irn} />}
    </div>
  );
}
