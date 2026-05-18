import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEducator } from "@/lib/auth";

export const Route = createFileRoute("/educator")({
  component: EducatorLayout,
});

function EducatorLayout() {
  // isAdmin now derives from public.admins (the admins-only table), not
  // from educators.role. An admin can have no educator row at all and
  // still show the admin chrome.
  const { user, educator, isAdmin } = useEducator();
  const approved = !!educator && educator.approved && !!educator.program_type;
  return (
    <div className="min-h-screen">
      <header className="border-b border-charcoal-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="text-xl font-medium">EXPLR <span style={{ color: "var(--explr)" }}>Pathways</span> <span className="text-base text-charcoal-400">/ {isAdmin ? "Admin" : "Educators"}</span></Link>
          <nav className="flex items-center gap-6 text-sm">
            {approved && (
              <>
                <Link to="/educator/dashboard" className="text-charcoal-500 hover:text-ink">Dashboard</Link>
                <Link to="/educator/students" className="text-charcoal-500 hover:text-ink">Students</Link>
                <Link to="/educator/curriculum" className="text-charcoal-500 hover:text-ink">Curriculum</Link>
                <Link to="/educator/internships" className="text-charcoal-500 hover:text-ink">Internships</Link>
              </>
            )}
            {isAdmin && (
              <Link to="/educator/admin" className="text-charcoal-500 hover:text-ink">Admin</Link>
            )}
            {user ? (
              <Link to="/sign-out" className="text-charcoal-500 hover:text-ink">Sign out</Link>
            ) : (
              <Link to="/educator/sign-in" className="btn-mint">Sign in</Link>
            )}
          </nav>
        </div>
        {isAdmin && (
          <div className="border-t border-charcoal-100 bg-charcoal-50">
            <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-2 text-xs">
              <span className="eyebrow" style={{ margin: 0 }}>View as</span>
              <Link to="/educator/admin" className="text-charcoal-500 hover:text-ink">Admin</Link>
              <span className="text-charcoal-200">·</span>
              <Link to="/educator/dashboard" className="text-charcoal-500 hover:text-ink">Educator</Link>
              <span className="text-charcoal-200">·</span>
              <Link to="/assessment" className="text-charcoal-500 hover:text-ink">Student</Link>
            </div>
          </div>
        )}
      </header>
      <Outlet />
    </div>
  );
}
