import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEducator } from "@/lib/auth";

export const Route = createFileRoute("/educator/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { educator, loading } = useEducator();
  if (loading) return <main className="mx-auto max-w-6xl px-6 py-24 text-sm text-charcoal-400">Loading…</main>;
  if (!educator || educator.role !== "admin") {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="lead">Admin only.</p>
        <Link to="/educator/dashboard" className="ink-link mt-6 inline-block">Back to dashboard</Link>
      </main>
    );
  }
  return (
    <div>
      <div className="border-b border-charcoal-100 bg-charcoal-50">
        <div className="mx-auto flex max-w-6xl gap-6 px-6 py-3 text-sm">
          <Link to="/educator/admin" className="text-charcoal-500 hover:text-ink">Home</Link>
          <Link to="/educator/admin/curriculum-tags" className="text-charcoal-500 hover:text-ink">Curriculum tags</Link>
          <Link to="/educator/admin/internship-tags" className="text-charcoal-500 hover:text-ink">Internship tags</Link>
          <Link to="/educator/admin/program-riasec" className="text-charcoal-500 hover:text-ink">Program RIASEC</Link>
        </div>
      </div>
      <Outlet />
    </div>
  );
}
