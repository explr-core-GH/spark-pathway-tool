import { createFileRoute, redirect } from "@tanstack/react-router";

/** Old /educator links (bookmarks, emailed invites) land on the instructor routes. */
export const Route = createFileRoute("/educator/")({
  beforeLoad: () => {
    throw redirect({ href: "/instructor" });
  },
});
