import { Link } from "@tanstack/react-router";
import { ChevronRight, type LucideIcon } from "lucide-react";

type RailCardProps = {
  title: string;
  hint: string;
  meta: string;
  icon: LucideIcon;
  to: string;
  search?: Record<string, string>;
  /** Explore density: a big square tile with an illustration instead of an icon row. */
  big?: boolean;
  image?: string;
};

/** Side-rail card on the resume center. Each one is a door into one resume element. */
export function RailCard({ title, hint, meta, icon: Icon, to, search, big, image }: RailCardProps) {
  if (big) {
    return (
      <Link
        to={to}
        search={search}
        className="flex flex-col gap-3 rounded-[var(--radius-card)] border-2 border-line bg-paper-raised p-5 shadow-card hover:border-emerald focus-visible:border-emerald"
      >
        {image && (
          <img
            src={image}
            alt=""
            width={260}
            height={150}
            className="h-[150px] w-full object-contain"
            loading="lazy"
          />
        )}
        <span className="font-display text-[26px] font-bold leading-tight">{title}</span>
        <span className="text-ink-700">{hint}</span>
        <span className="font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-green">
          {meta}
        </span>
      </Link>
    );
  }
  return (
    <Link
      to={to}
      search={search}
      className="flex items-center gap-3.5 rounded-[var(--radius-card)] border border-line bg-paper-raised p-4 shadow-card hover:border-emerald focus-visible:border-emerald"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border border-mint-soft bg-mint-tint text-green-deep">
        <Icon className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-display text-lg font-semibold leading-tight">{title}</span>
        <span className="text-sm leading-snug text-ink-700">{hint}</span>
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-green">
          {meta}
        </span>
      </span>
      <ChevronRight
        className="h-[18px] w-[18px] shrink-0 text-ink-500"
        strokeWidth={2.2}
        aria-hidden
      />
    </Link>
  );
}
