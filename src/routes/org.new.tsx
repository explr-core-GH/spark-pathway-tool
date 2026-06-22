import { createFileRoute } from "@tanstack/react-router";
import { OrgGuard } from "@/components/OrgGuard";
import { OpportunityWizard } from "@/components/OpportunityWizard";

export const Route = createFileRoute("/org/new")({
  validateSearch: (s: Record<string, unknown>): { id?: string } => ({
    id: typeof s.id === "string" ? s.id : undefined,
  }),
  head: () => ({ meta: [{ title: "New opportunity — EXPLR" }] }),
  component: NewOpportunity,
});

function NewOpportunity() {
  const { id } = Route.useSearch();
  return (
    <OrgGuard>
      {(org) => (
        <OpportunityWizard orgId={org.id} logo={org.logo_url} opportunityId={id} />
      )}
    </OrgGuard>
  );
}
