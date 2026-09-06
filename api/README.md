# Reference: future content API (NOT YET DEPLOYED)

The live **ingestion** functions now ship in the app and deploy with it:
`app/api/leads.ts` and `app/api/events.ts` (Edge runtime, EU region), on the
kiosk's own origin as `/api/leads` and `/api/events`.

What remains here is `content.ts` — a sketch of the **content-loading** endpoint
(`GET /api/shows/:id/content`) for the *later* PR that moves products, model URLs,
and hotspots out of `app/src/data/catalog.ts` into the database. It is kept at the
repo root (outside `app/`) so Vercel's `app` root directory does not build it
until that work lands. See `docs/production-migration.md`.
