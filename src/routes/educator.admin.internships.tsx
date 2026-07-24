import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/educator/admin/internships")({
  component: () => <Outlet />,
});
