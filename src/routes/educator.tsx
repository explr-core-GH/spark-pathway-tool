import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEducator } from "@/lib/auth";

export const Route = createFileRoute("/educator")({
  component: EducatorLayout,
});

function EducatorLayout() {
  const { educator } = useEducator();
  return (
    <div className="min-h-screen">
      <header className="border-b border-charcoal-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/educator" className="text-base font-medium">EXPLR <span className="text-charcoal-400">/ Educators</span></Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link to="/educator/dashboard" className="text-charcoal-500 hover:text-ink">Dashboard</Link>
            <Link to="/educator/curriculum" className="text-charcoal-500 hover:text-ink">Curriculum</Link>
            <Link to="/educator/internships" className="text-charcoal-500 hover:text-ink">Internships</Link>
            {educator?.role === "admin" && (
              <Link to="/educator/admin" className="text-charcoal-500 hover:text-ink">Admin</Link>
            )}
            {educator ? (
              <Link to="/sign-out" className="text-charcoal-500 hover:text-ink">Sign out</Link>
            ) : (
              <Link to="/educator/sign-in" className="btn-mint">Sign in</Link>
            )}
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
