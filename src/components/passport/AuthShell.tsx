import type { ReactNode } from "react";
import { PortalHeader, type PortalLink } from "./PortalHeader";
import { SiteFooter } from "@/components/SiteFooter";

type Props = {
  /** Small mono label above the title, e.g. "Students · grades 9-12". */
  eyebrow: string;
  title: string;
  intro?: ReactNode;
  /** Illustration from /public/passport, e.g. "/passport/story-sign-in.webp". */
  illustration?: { src: string; alt?: string };
  /** Role chip in the header. */
  role?: string;
  links?: PortalLink[];
  /** Explore density (bigger type, rounder corners) for grades 4-8 screens. */
  explore?: boolean;
  children: ReactNode;
  /** Content under the form card (switch-role links, help). */
  footer?: ReactNode;
};

/**
 * AuthShell — the frame every sign-in, sign-up, code-entry and password page
 * shares so they all match the home page: passport header, an illustration
 * beside a raised card, and the site footer.
 */
export function AuthShell({
  eyebrow,
  title,
  intro,
  illustration,
  role,
  links = [{ label: "Home", to: "/" }],
  explore,
  children,
  footer,
}: Props) {
  return (
    <div
      className="flex min-h-screen flex-col bg-paper text-ink-900"
      data-density={explore ? "explore" : undefined}
    >
      <PortalHeader role={role} links={links} />
      <main className="mx-auto w-full max-w-[1312px] flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:gap-16">
          <section className="order-2 lg:order-1">
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="display mt-3">{title}</h1>
            {intro && <div className="lead mt-4 max-w-xl">{intro}</div>}
            {illustration && (
              <img
                src={illustration.src}
                alt={illustration.alt ?? ""}
                className="mt-8 hidden w-full max-w-md lg:block"
                loading="lazy"
              />
            )}
          </section>
          <section className="order-1 lg:order-2">
            <div className="rounded-[var(--radius-card)] border border-line bg-paper-raised p-6 shadow-[0_1px_0_rgba(25,32,31,0.04)] sm:p-8">
              {children}
            </div>
            {footer && <div className="mt-6 text-sm text-ink-500">{footer}</div>}
          </section>
        </div>
      </main>
      <SiteFooter className="mt-10" />
    </div>
  );
}
