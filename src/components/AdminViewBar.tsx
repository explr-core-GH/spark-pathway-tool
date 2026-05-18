import { Link, useLocation } from "@tanstack/react-router";
import { useEducator } from "@/lib/auth";

export function AdminViewBar() {
  const { educator, loading } = useEducator();
  const location = useLocation();

  if (loading || !educator || educator.role !== "admin") return null;
  // Already inside the educator/admin surface — the educator header has its own bar.
  if (location.pathname.startsWith("/educator")) return null;

  return (
    <div className="border-b border-charcoal-100 bg-charcoal-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-2 text-xs">
        <span className="eyebrow" style={{ margin: 0 }}>
          Viewing as student
        </span>
        <Link to="/educator/admin" className="ink-link">
          ← Back to admin
        </Link>
      </div>
    </div>
  );
}
