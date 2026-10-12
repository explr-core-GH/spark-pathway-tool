import { createFileRoute, redirect } from "@tanstack/react-router";

/** Partners and organizations share the org portal. */
export const Route = createFileRoute("/partner/")({
  beforeLoad: () => {
    throw redirect({ href: "/org" });
  },
});
