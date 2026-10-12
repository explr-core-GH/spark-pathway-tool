import { createFileRoute, redirect } from "@tanstack/react-router";

/** Any /partner/... path maps onto the matching /org/... route. */
export const Route = createFileRoute("/partner/$")({
  beforeLoad: ({ params }) => {
    throw redirect({ href: "/org/" + (params._splat ?? "") });
  },
});
