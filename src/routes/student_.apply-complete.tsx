import { createFileRoute, redirect } from "@tanstack/react-router";

// Retired: the old second stage (links, screenshot proofs, partner forms).
// Students now finish one general application, then answer each partner's
// questions at /student/apply/$opportunityId.
export const Route = createFileRoute("/student_/apply-complete")({
  beforeLoad: () => {
    throw redirect({ to: "/student/apply" });
  },
});
