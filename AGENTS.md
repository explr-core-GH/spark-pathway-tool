# Architecture rules

- Keep privileged internship-demo helpers in a `*.server.ts` module and dynamically import them inside server-function handlers, so browser bundles cannot reach server dependencies.- Shared server-only security helpers (hash peppers, public email origin, IP rate limiting) live in `src/lib/server/*.server.ts`; reuse them instead of re-implementing, because hash inputs must stay byte-identical and links must never trust browser-supplied origins.
- Files in private buckets (student-photos, form-uploads, curriculum) are stored as object paths and opened only through the `signedFileUrl` server function, which checks access first.
- All outbound email goes through `sendEmail` in `src/lib/server/email.server.ts`, which posts to the connector gateway and sends from the domain verified there; never call the provider API directly or default to an unverified sender domain, because the project's connection key is a gateway key only.
- The family view for a student is built only by `buildFamilyView` in `src/lib/server/family-view.server.ts`, used by both the family-code session and guardian accounts, so the two paths never show different data.
