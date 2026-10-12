import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEducator } from "@/lib/auth";
import { SiteFooter } from "@/components/SiteFooter";
import { PortalHeader, type PortalLink } from "@/components/passport/PortalHeader";

export const Route = createFileRoute("/instructor")({
  component: InstructorLayout,
});

function InstructorLayout() {
  // isAdmin derives from public.admins (the admins-only table), not from
  // educators.role. An admin can have no educator row at all and still
  // see the admin chrome.
  const { user, educator, isAdmin } = useEducator();
  const approved = !!educator && educator.approved && !!educator.program_type;

  const links: PortalLink[] = [];
  if (approved) {
    links.push(
      { label: "Dashboard", to: "/instructor/dashboard" },
      { label: "Students", to: "/instructor/students", secondary: true },
      { label: "Checkpoints", to: "/instructor/checkpoints", secondary: true },
    );
  }
  if (isAdmin) links.push({ label: "Admin", to: "/instructor/admin" });

  return (
    <div className="min-h-screen bg-paper text-ink-900">
      <PortalHeader
        role={isAdmin ? "Admin" : "Instructor"}
        links={links}
        signedIn={!!user}
        signInTo="/instructor/sign-in"
        subbar={
          isAdmin ? (
            <div className="border-t border-line bg-paper-sunken">
              <div className="mx-auto flex max-w-[1312px] items-center gap-4 px-4 py-2 text-xs sm:px-6 lg:px-8">
                <span className="eyebrow" style={{ margin: 0 }}>
                  View as
                </span>
                <Link to="/instructor/admin" className="text-ink-500 hover:text-ink-900">
                  Admin
                </Link>
                <span className="text-line-strong">·</span>
                <Link to="/instructor/dashboard" className="text-ink-500 hover:text-ink-900">
                  Instructor
                </Link>
                <span className="text-line-strong">·</span>
                <Link to="/student" className="text-ink-500 hover:text-ink-900">
                  Student
                </Link>
              </div>
            </div>
          ) : undefined
        }
      />
      <Outlet />
      <SiteFooter />
    </div>
  );
}
