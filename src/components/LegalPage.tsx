import { Link } from "@tanstack/react-router";
import { SiteFooter } from "@/components/SiteFooter";

/** Shared layout for Privacy / Terms / Student Data pages. */
export function LegalPage({
  eyebrow,
  title,
  effective,
  children,
}: {
  eyebrow: string;
  title: string;
  effective?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-charcoal-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="text-base font-medium">EXPLR <span style={{ color: "var(--explr)" }}>Pathways</span></Link>
          <Link to="/" className="text-sm text-charcoal-500 hover:text-ink">← Home</Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-24">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display mt-4">{title}</h1>
        {effective && <p className="mt-4 text-sm text-charcoal-500">Effective: {effective}</p>}
        <div className="prose mt-12 space-y-6 text-charcoal-600">{children}</div>
      </main>
      <SiteFooter className="mt-0" />
    </div>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-medium pt-6 text-ink">{children}</h2>;
}

export function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-6">
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  );
}
