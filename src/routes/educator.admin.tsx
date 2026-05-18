import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";

export const Route = createFileRoute("/educator/admin")({
  component: AdminLayout,
});

type NavItem = { to: string; label: string };
type NavGroup = { label: string; items: NavItem[] };

// Grouped admin nav. Add new routes inside an existing group, or create a
// new group if the route doesn't belong to one of these four.
const NAV_GROUPS: NavGroup[] = [
  {
    label: "Students",
    items: [
      { to: "/educator/admin/applications", label: "Applications" },
      { to: "/educator/admin/placements", label: "Placements" },
      { to: "/educator/admin/rosters", label: "Rosters" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { to: "/educator/admin/camps", label: "Camps" },
      { to: "/educator/admin/internships", label: "Internships" },
      { to: "/educator/admin/programs", label: "Programs" },
    ],
  },
  {
    label: "People",
    items: [
      { to: "/educator/admin/invites", label: "Invites" },
      { to: "/educator/admin/assign", label: "Assign educators" },
    ],
  },
  {
    label: "Tools",
    items: [
      { to: "/educator/admin/curriculum-tags", label: "Curriculum tags" },
      { to: "/educator/admin/internship-tags", label: "Internship tags" },
      { to: "/educator/admin/program-riasec", label: "Program-RIASEC" },
    ],
  },
];

const linkBase = "block text-sm leading-tight text-charcoal-500 hover:text-ink";
const linkActive = "block text-sm leading-tight text-ink font-semibold";

function AdminLayout() {
  return (
    <RoleGuard requires="admin">
      <div className="flex flex-col md:flex-row">
        <aside className="border-b border-charcoal-100 bg-charcoal-50 md:w-56 md:shrink-0 md:border-b-0 md:border-r">
          <nav
            aria-label="Admin"
            className="px-6 py-6 md:sticky md:top-0 md:max-h-screen md:overflow-y-auto"
          >
            <Link
              to="/educator/admin"
              activeOptions={{ exact: true }}
              className={linkBase}
              activeProps={{ className: linkActive }}
            >
              Home
            </Link>
            <div className="mt-6 space-y-6">
              {NAV_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">
                    {group.label}
                  </p>
                  <ul className="space-y-1.5">
                    {group.items.map((item) => (
                      <li key={item.to}>
                        <Link
                          to={item.to}
                          className={linkBase}
                          activeProps={{ className: linkActive }}
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </nav>
        </aside>
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </RoleGuard>
  );
}
