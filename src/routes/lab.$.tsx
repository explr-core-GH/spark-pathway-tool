import { createFileRoute } from "@tanstack/react-router";

// SPA history-fallback for the STEM Lab. Static assets under /lab/ (index.html,
// /lab/assets/*, /lab/favicon.svg) are served directly by the platform's static
// asset layer before this route ever runs. This catch-all only fires for
// deep-links like /lab/t/circuits or /lab/topic/physics, where we return the
// SPA shell so its internal React Router can take over.
export const Route = createFileRoute("/lab/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const shellUrl = new URL("/lab/index.html", url.origin);
        const res = await fetch(shellUrl.toString());
        if (!res.ok) {
          return new Response("STEM Lab not available", { status: 502 });
        }
        const html = await res.text();
        return new Response(html, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      },
    },
  },
});
