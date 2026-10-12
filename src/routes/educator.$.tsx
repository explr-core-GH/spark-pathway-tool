import { createFileRoute, redirect } from "@tanstack/react-router";

/** Any old /educator/... path maps onto the matching /instructor/... route. */
export const Route = createFileRoute("/educator/$")({
  beforeLoad: ({ params }) => {
    throw redirect({ href: "/instructor/" + (params._splat ?? "") });
  },
});
