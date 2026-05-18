import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";

export const Route = createFileRoute("/educator/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <RoleGuard requires="admin">
      <div>
        <div className="border-b border-charcoal-100 bg-charcoal-50">
          <div className="mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-2 px-6 py-3 text-sm">
            <Link to="/educator/admin" className="text-charcoal-500 hover:text-ink">Home</Link>
            <Link to="/educator/admin/applications" className="text-charcoal-500 hover:text-ink">Applications</Link>
            <Link to="/educator/admin/placements" className="text-charcoal-500 hover:text-ink">Placements</Link>
            <Link to="/educator/admin/rosters" className="text-charcoal-500 hover:text-ink">Rosters</Link>
            <Link to="/educator/admin/internships" className="text-charcoal-500 hover:text-ink">Internships</Link>
            <Link to="/educator/admin/camps" className="text-charcoal-500 hover:text-ink">Camps</Link>
            <Link to="/educator/admin/programs" className="text-charcoal-500 hover:text-ink">Programs</Link>
            <Link to="/educator/admin/invites" className="text-charcoal-500 hover:text-ink">Invites</Link>
            <Link to="/educator/admin/curriculum-tags" className="text-charcoal-500 hover:text-ink">Curriculum tags</Link>
            <Link to="/educator/admin/internship-tags" className="text-charcoal-500 hover:text-ink">Internship tags</Link>
            <Link to="/educator/admin/program-riasec" className="text-charcoal-500 hover:text-ink">Program RIASEC</Link>
          </div>
        </div>
        <Outlet />
      </div>
    </RoleGuard>
  );
}
