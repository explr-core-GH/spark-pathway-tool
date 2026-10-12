import { SiteFooter } from "@/components/SiteFooter";
import { PortalHeader } from "@/components/passport/PortalHeader";

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
    <div className="min-h-screen bg-paper text-ink-900">
      <PortalHeader links={[{ label: "Home", to: "/" }]} />
      <main className="mx-auto max-w-2xl px-6 py-24">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display mt-4">{title}</h1>
        {effective && <p className="mt-4 text-sm text-ink-500">Effective: {effective}</p>}
        <div className="prose mt-12 space-y-6 text-ink-700">{children}</div>
      </main>
      <SiteFooter className="mt-0" />
    </div>
  );
}

export function H2({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="font-display text-xl font-bold pt-6 text-ink-900">
      {children}
    </h2>
  );
}

export function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-6">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}
