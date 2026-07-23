import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { RoleGuard } from "@/components/RoleGuard";

export const Route = createFileRoute("/educator/admin")({
  component: AdminLayout,
});

type Item = {
  label: string;
  to: string;
  params?: Record<string, string>;
  /** Resolved path used for active/auto-open detection. */
  match: string;
};
type Section = {
  key: string;
  label: string;
  /** Entity sections link their header to the card grid; utility sections don't. */
  header?: Item;
  items: Item[];
};

// Entity-first admin nav. Camps / Internships / Classes each open onto a card
// grid of rostered groups (the header link); the sub-items are the management
// pages that act on that entity. People + Library hold cross-cutting tools.
const SECTIONS: Section[] = [
  {
    key: "camps",
    label: "Camps",
    header: {
      label: "All camps",
      to: "/educator/admin/groups/$kind",
      params: { kind: "camps" },
      match: "/educator/admin/groups/camps",
    },
    items: [
      { label: "Curriculum", to: "/educator/admin/camps", match: "/educator/admin/camps" },
      { label: "Camp logins", to: "/educator/admin/camp-logins", match: "/educator/admin/camp-logins" },
      { label: "Completion", to: "/educator/admin/completion", match: "/educator/admin/completion" },
    ],
  },
  {
    key: "internships",
    label: "Internships",
    header: {
      label: "All internships",
      to: "/educator/admin/groups/$kind",
      params: { kind: "internships" },
      match: "/educator/admin/groups/internships",
    },
    items: [
      { label: "Offerings", to: "/educator/admin/internships", match: "/educator/admin/internships" },
      { label: "Rosters & logins", to: "/educator/admin/internship-logins", match: "/educator/admin/internship-logins" },
      { label: "Apply requests", to: "/educator/admin/apply-requests", match: "/educator/admin/apply-requests" },
      { label: "Applications", to: "/educator/admin/applications", match: "/educator/admin/applications" },
      { label: "Placements", to: "/educator/admin/placements", match: "/educator/admin/placements" },
      { label: "Recommendation letters", to: "/educator/admin/recommendations", match: "/educator/admin/recommendations" },
    ],
  },
  {
    key: "classes",
    label: "Classes",
    header: {
      label: "All classes",
      to: "/educator/admin/groups/$kind",
      params: { kind: "classes" },
      match: "/educator/admin/groups/classes",
    },
    items: [],
  },
  {
    key: "partners",
    label: "Partners",
    items: [
      { label: "Opportunity review", to: "/educator/admin/opportunities", match: "/educator/admin/opportunities" },
      { label: "Wizard fields", to: "/educator/admin/opportunity-fields", match: "/educator/admin/opportunity-fields" },
    ],
  },
  {
    key: "people",
    label: "People",
    items: [
      { label: "Invites & approvals", to: "/educator/admin/invites", match: "/educator/admin/invites" },
      { label: "Instructor accounts", to: "/educator/admin/passwords", match: "/educator/admin/passwords" },
    ],
  },
  {
    key: "library",
    label: "Library",
    items: [
      { label: "Assessments & surveys", to: "/educator/admin/assessments", match: "/educator/admin/assessments" },
      { label: "Results & downloads", to: "/educator/admin/results", match: "/educator/admin/results" },
      { label: "Demographics", to: "/educator/admin/demographics", match: "/educator/admin/demographics" },
      { label: "Program-RIASEC", to: "/educator/admin/program-riasec", match: "/educator/admin/program-riasec" },
      { label: "Programs", to: "/educator/admin/programs", match: "/educator/admin/programs" },
      { label: "Import from ExplrMore", to: "/educator/admin/import-explr", match: "/educator/admin/import-explr" },
    ],
  },
];

const linkBase = "block text-sm leading-tight text-charcoal-500 hover:text-ink";
const linkActive = "block text-sm leading-tight text-ink font-semibold";

function sectionMatches(section: Section, pathname: string): boolean {
  const all = [...(section.header ? [section.header] : []), ...section.items];
  return all.some((i) => pathname === i.match || pathname.startsWith(i.match + "/"));
}

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const activeKey = useMemo(
    () => SECTIONS.find((s) => sectionMatches(s, pathname))?.key ?? null,
    [pathname],
  );

  const [open, setOpen] = useState<Set<string>>(() =>
    activeKey ? new Set([activeKey]) : new Set(["camps"]),
  );

  // Keep the active section expanded as the route changes, without collapsing
  // anything the admin opened manually.
  useEffect(() => {
    if (activeKey) setOpen((prev) => new Set(prev).add(activeKey));
  }, [activeKey]);

  function toggle(key: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <RoleGuard requires="admin">
      <div className="flex flex-col md:flex-row">
        <aside className="print:hidden border-b border-charcoal-100 bg-charcoal-50 md:w-56 md:shrink-0 md:border-b-0 md:border-r">
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
              Overview
            </Link>

            <div className="mt-6 space-y-4">
              {SECTIONS.map((section) => {
                const isOpen = open.has(section.key);
                return (
                  <div key={section.key}>
                    <button
                      type="button"
                      onClick={() => toggle(section.key)}
                      aria-expanded={isOpen}
                      aria-label={`${isOpen ? "Collapse" : "Expand"} ${section.label}`}
                      className={`flex w-full items-center justify-between gap-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wider hover:text-ink ${
                        activeKey === section.key ? "text-ink" : "text-charcoal-500"
                      }`}
                    >
                      <span>{section.label}</span>
                      <span className="text-xs text-charcoal-400" aria-hidden="true">
                        {isOpen ? "▾" : "▸"}
                      </span>
                    </button>

                    {isOpen && (
                      <ul className="mt-2 space-y-1.5 border-l border-charcoal-200 pl-3">
                        {section.header && (
                          <li>
                            <Link
                              to={section.header.to}
                              params={section.header.params}
                              className={linkBase}
                              activeProps={{ className: linkActive }}
                              activeOptions={{ exact: true }}
                            >
                              {section.header.label}
                            </Link>
                          </li>
                        )}
                        {section.items.map((item) => (
                          <li key={item.match}>
                            <Link
                              to={item.to}
                              params={item.params}
                              className={linkBase}
                              activeProps={{ className: linkActive }}
                            >
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
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
