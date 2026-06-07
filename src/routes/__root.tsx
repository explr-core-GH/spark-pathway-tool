import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminViewBar } from "@/components/AdminViewBar";
import { AccessibilityProvider } from "@/components/AccessibilityProvider";
import { AccessibilityToolbar } from "@/components/AccessibilityToolbar";
import { AssignmentNudge } from "@/components/AssignmentNudge";
import { usePresenceHeartbeat } from "@/lib/use-presence";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="mx-auto max-w-xl px-6 py-32 text-center">
      <p className="eyebrow">404</p>
      <h1 className="display mt-3">Not here.</h1>
      <p className="lead mt-4">That page doesn't exist or has moved.</p>
      <Link to="/" className="ink-link mt-8 inline-block">Back to home</Link>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-xl px-6 py-32 text-center">
      <p className="eyebrow text-destructive">Error</p>
      <h1 className="display mt-3">Something broke.</h1>
      <p className="lead mt-4">{error.message}</p>
      <button
        className="btn-ink mt-8"
        onClick={() => { router.invalidate(); reset(); }}
      >
        Try again
      </button>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "EXPLR — Find what you like." },
      { name: "description", content: "Career-interest assessment for Cleveland K-12 students. Grounded in RIASEC." },
      { property: "og:title", content: "EXPLR — Find what you like." },
      { name: "twitter:title", content: "EXPLR — Find what you like." },
      { property: "og:description", content: "Career-interest assessment for Cleveland K-12 students. Grounded in RIASEC." },
      { name: "twitter:description", content: "Career-interest assessment for Cleveland K-12 students. Grounded in RIASEC." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a1b7375e-d0ec-47ef-9337-7623b3c2139c/id-preview-38f9e1df--65b336d8-01b0-48e4-84e2-927530bc766b.lovable.app-1779081122441.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a1b7375e-d0ec-47ef-9337-7623b3c2139c/id-preview-38f9e1df--65b336d8-01b0-48e4-84e2-927530bc766b.lovable.app-1779081122441.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {/* Skip link (WCAG 2.4.1 Bypass Blocks) — first focusable element,
            jumps past the header/nav to the page's main content. The CSS
            for .skip-link keeps it offscreen until focused. */}
        <a href="#main" className="skip-link">Skip to content</a>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  // Heartbeat the signed-in user's location for the admin Live Monitor.
  usePresenceHeartbeat();

  useEffect(() => {
    // Only invalidate route loaders when the *identity* actually changes —
    // SIGNED_IN / SIGNED_OUT / USER_UPDATED. Invalidating on TOKEN_REFRESHED
    // or INITIAL_SESSION fires refetches every ~hour and on tab focus, which
    // shows up to the user as "the page kicks me out for a second."
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        router.invalidate();
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <AccessibilityProvider>
        <AdminViewBar />
        {/* Skip-link target — every page's content lives under here. */}
        <div id="main">
          <Outlet />
        </div>
        <AssignmentNudge />
        <AccessibilityToolbar />
      </AccessibilityProvider>
    </QueryClientProvider>
  );
}
