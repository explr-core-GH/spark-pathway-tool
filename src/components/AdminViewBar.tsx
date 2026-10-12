import { Link, useLocation } from "@tanstack/react-router";
import { ArrowLeft, Eye } from "lucide-react";
import { useEducator } from "@/lib/auth";

export function AdminViewBar() {
  const { educator, loading } = useEducator();
  const location = useLocation();

  if (loading || !educator || educator.role !== "admin") return null;
  // Already inside the instructor/admin surface — the instructor header has its own bar.
  if (location.pathname.startsWith("/instructor")) return null;

  return (
    <div className="border-b border-line bg-paper-sunken">
      <div className="mx-auto flex max-w-[1312px] items-center justify-between gap-4 px-4 py-1.5 text-xs sm:px-6 lg:px-8">
        <span className="eyebrow inline-flex items-center gap-2" style={{ margin: 0 }}>
          <Eye className="h-3.5 w-3.5 text-green" strokeWidth={2.2} aria-hidden />
          Viewing as student
        </span>
        <Link
          to="/instructor/admin"
          className="inline-flex min-h-[44px] items-center gap-1.5 font-medium text-ink-700 hover:text-green-deep"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.2} aria-hidden />
          Back to admin
        </Link>
      </div>
    </div>
  );
}
