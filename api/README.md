# Lathe ingestion/content API — reference (NOT YET DEPLOYED)

These are the serverless functions the kiosk will write to and the dashboard's
content will load from. **They are intentionally not wired up yet.**

Why they live here at the repo root and not under `app/`:

- The Vercel project's **Root Directory is `app/`**, so Vercel only builds the
  front-end. Nothing in this `api/` folder is compiled or deployed by that
  project — it can't accidentally break the preview, and it has no build deps.
- When the backend PR lands, these move into the deployed surface (either the
  `app/api/` directory of the same Vercel project, or a separate `api.` project),
  gain their dependencies (`@supabase/supabase-js`, `zod`), and read server-only
  env (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) — never `VITE_`-prefixed.

Contract summary:

- `POST /api/events` — kiosk batches anonymous events. Auth: `X-Kiosk-Key`
  header (scoped, ingest-only). Validates + rate-limits, writes via service role.
- `POST /api/leads` — kiosk submits one lead (PII + consent). Same auth. Rejects
  if `consent_given` is not true.
- `GET  /api/shows/:id/content` — kiosk fetches its show's products/hotspots/media
  (public, read-only, cacheable) to render + PWA-cache offline.

The files below are TypeScript sketches showing shape and validation, not a
finished, dependency-resolved build.
