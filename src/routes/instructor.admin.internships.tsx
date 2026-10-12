import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/instructor/admin/internships")({
  component: () => <Outlet />,
});
