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
      // 'Curriculum' is the renamed camps admin — supports add / edit and
      // hosts the program-type tag pills inline (no separate tags page).
      { to: "/educator/admin/camps", label: "Curriculum" },
      { to: "/educator/admin/internships", label: "Internships" },
      { to: "/educator/admin/programs", label: "Programs" },
    ],
  },
  {
    // Single Invites page handles both educators and admins via a role
    // toggle. Assigning educators to a camp / internship / program is done
    // inline on those pages now, so there's no separate Assign entry.
    label: "People",
    items: [
      { to: "/educator/admin/invites", label: "Invites" },
    ],
  },
  {
    label: "Tools",
    items: [
      // Assessments now hosts the assign flow, STEM surveys, and demo links
      // as tabs — no separate STEM Surveys entry.
      { to: "/educator/admin/assessments", label: "Assessments" },
      { to: "/educator/admin/demographics", label: "Demographics" },
      { to: "/educator/admin/program-riasec", label: "Program-RIASEC" },
      { to: "/educator/admin/import-explr", label: "Import from ExplrMore" },
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
