import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";

export const Route = createFileRoute("/instructor/admin")({
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

// Entity-first admin nav. Camps / Classes open onto a card grid of rostered
// groups (the header link); Internships holds the partner-internship pipeline;
// People + Library hold cross-cutting tools.
const SECTIONS: Section[] = [
  {
    key: "camps",
    label: "Camps",
    header: {
      label: "All camps",
      to: "/instructor/admin/groups/$kind",
      params: { kind: "camps" },
      match: "/instructor/admin/groups/camps",
    },
    items: [
      {
        label: "Camp logins",
        to: "/instructor/admin/camp-logins",
        match: "/instructor/admin/camp-logins",
      },
      {
        label: "Completion",
        to: "/instructor/admin/completion",
        match: "/instructor/admin/completion",
      },
    ],
  },
  {
    key: "internships",
    label: "Internships",
    items: [
      {
        label: "Applications",
        to: "/instructor/admin/applications",
        match: "/instructor/admin/applications",
      },
      {
        label: "Placements",
        to: "/instructor/admin/placements",
        match: "/instructor/admin/placements",
      },
      {
        label: "Matching tool",
        to: "/instructor/admin/matching",
        match: "/instructor/admin/matching",
      },
      {
        label: "Recommendation letters",
        to: "/instructor/admin/recommendations",
        match: "/instructor/admin/recommendations",
      },
    ],
  },
  {
    key: "classes",
    label: "Classes",
    header: {
      label: "All classes",
      to: "/instructor/admin/groups/$kind",
      params: { kind: "classes" },
      match: "/instructor/admin/groups/classes",
    },
    items: [],
  },
  {
    key: "partners",
    label: "Partners",
    items: [
      {
        label: "Opportunity review",
        to: "/instructor/admin/opportunities",
        match: "/instructor/admin/opportunities",
      },
      {
        label: "Wizard fields",
        to: "/instructor/admin/opportunity-fields",
        match: "/instructor/admin/opportunity-fields",
      },
    ],
  },
  {
    key: "people",
    label: "People",
    items: [
      {
        label: "Invites & approvals",
        to: "/instructor/admin/invites",
        match: "/instructor/admin/invites",
      },
      {
        label: "Instructor accounts",
        to: "/instructor/admin/passwords",
        match: "/instructor/admin/passwords",
      },
    ],
  },
  {
    key: "library",
    label: "Library",
    items: [
      {
        label: "Assessments & surveys",
        to: "/instructor/admin/assessments",
        match: "/instructor/admin/assessments",
      },
      {
        label: "Results & downloads",
        to: "/instructor/admin/results",
        match: "/instructor/admin/results",
      },
      {
        label: "Demographics",
        to: "/instructor/admin/demographics",
        match: "/instructor/admin/demographics",
      },
      {
        label: "Program-RIASEC",
        to: "/instructor/admin/program-riasec",
        match: "/instructor/admin/program-riasec",
      },
      { label: "Programs", to: "/instructor/admin/programs", match: "/instructor/admin/programs" },
      {
        label: "Import from ExplrMore",
        to: "/instructor/admin/import-explr",
        match: "/instructor/admin/import-explr",
      },
      {
        label: "Archive export",
        to: "/instructor/admin/archive",
        match: "/instructor/admin/archive",
      },
    ],
  },
];

const linkBase =
  "flex min-h-[44px] items-center rounded-[var(--radius-control)] px-3 text-[15px] leading-tight text-ink-700 hover:bg-paper hover:text-ink-900 md:min-h-[40px] md:text-sm";
const linkActive =
  "flex min-h-[44px] items-center rounded-[var(--radius-control)] bg-mint-tint px-3 text-[15px] font-semibold leading-tight text-green-deep md:min-h-[40px] md:text-sm";

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
        <aside className="print:hidden border-b border-line bg-paper-sunken md:w-64 md:shrink-0 md:border-b-0 md:border-r">
          <nav
            aria-label="Admin"
            className="px-3 py-4 sm:px-4 md:sticky md:top-0 md:max-h-screen md:overflow-y-auto md:py-6"
          >
            <p className="eyebrow px-3 pb-2">Admin</p>
            <Link
              to="/instructor/admin"
              activeOptions={{ exact: true }}
              className={linkBase}
              activeProps={{ className: linkActive }}
            >
              Overview
            </Link>

            <div className="mt-4 space-y-2">
              {SECTIONS.map((section) => {
                const isOpen = open.has(section.key);
                return (
                  <div key={section.key}>
                    <button
                      type="button"
                      onClick={() => toggle(section.key)}
                      aria-expanded={isOpen}
                      aria-label={`${isOpen ? "Collapse" : "Expand"} ${section.label}`}
                      className={`flex min-h-[44px] w-full items-center justify-between gap-2 rounded-[var(--radius-control)] px-3 text-left font-display text-[15px] font-bold tracking-tight hover:text-ink-900 md:min-h-[40px] ${
                        activeKey === section.key ? "text-ink-900" : "text-ink-700"
                      }`}
                    >
                      <span>{section.label}</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-ink-500 transition-transform ${isOpen ? "" : "-rotate-90"}`}
                        strokeWidth={2.2}
                        aria-hidden
                      />
                    </button>

                    {isOpen && (
                      <ul className="mt-1 space-y-0.5 pl-2">
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
