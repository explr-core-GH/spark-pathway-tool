import { Link } from "@tanstack/react-router";
import { ChevronRight, type LucideIcon } from "lucide-react";

export type DoorPill = { label: string; to: string; search?: Record<string, string> };

type DoorCardProps = {
  /** Short audience label shown above the title, e.g. "Students". */
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  to: string;
  icon: LucideIcon;
  /** Illustration under /public, a transparent WebP from the passport set. */
  image: string;
  /** Optional sub-choices (the student door branches to 4-8 and 9-12). */
  pills?: DoorPill[];
};

/** Home page audience card ("door" is the team's internal name; it never appears in copy). */
export function DoorCard({
  eyebrow,
  title,
  body,
  cta,
  to,
  icon: Icon,
  image,
  pills,
}: DoorCardProps) {
  return (
    <article className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-paper-raised p-6 shadow-card">
      <img
        src={image}
        alt=""
        width={252}
        height={150}
        loading="lazy"
        className="h-[150px] w-full object-contain"
      />
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-[14px] border border-mint-soft bg-mint-tint text-green-deep">
          <Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
        </span>
        <span className="font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-green">
          {eyebrow}
        </span>
      </div>
      <h3 className="font-display text-[28px] font-bold leading-tight tracking-tight text-ink-900">
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-ink-700">{body}</p>
      {pills && pills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pills.map((p) => (
            <Link
              key={p.label}
              to={p.to}
              search={p.search}
              className="inline-flex min-h-[44px] items-center rounded-[var(--radius-control)] border-[1.5px] border-line-strong bg-paper px-3.5 py-2.5 text-[15px] font-medium text-ink-900 hover:border-ink-900"
            >
              {p.label}
            </Link>
          ))}
        </div>
      )}
      <Link
        to={to}
        className="mt-auto inline-flex min-h-[44px] items-center gap-1.5 text-[15px] font-semibold text-green-deep hover:underline"
      >
        {cta}
        <ChevronRight className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden />
      </Link>
    </article>
  );
}
