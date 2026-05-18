import { createFileRoute } from "@tanstack/react-router";
// Import the SPA shell at build time — works in both dev and bundled prod
// (Cloudflare Workers), avoiding a self-fetch over the network.
import shellHtml from "../../public/lab/index.html?raw";

// SPA history-fallback for the STEM Lab. Static assets under /lab/
// (index.html, /lab/assets/*, /lab/favicon.svg) are served directly by the
// platform's static asset layer before this route ever runs. This catch-all
// only fires for deep-links like /lab/t/circuits or /lab/topic/physics,
// where we return the SPA shell so its internal React Router takes over.
export const Route = createFileRoute("/lab/$")({
  server: {
    handlers: {
      GET: async () =>
        new Response(shellHtml, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
    },
  },
});
