# Lathe — Software Requirements Specification

**Version:** 1.0 — as-built pilot · **Last updated:** 2026-09-06
**Supersedes:** `exhibly-srs.md.docx`

Companion docs: `lathe-prd.md` (product), `lathe-ui-design.md` (interface),
`docs/production-migration.md` (migration plan), `docs/SETUP.md` (ops setup).

---

## 1. System overview

Lathe is a single React/TypeScript codebase that renders two surfaces, chosen at
runtime by hostname:

- **Kiosk** — offline-first PWA for booth tablets. No login; writes leads +
  anonymous analytics to a server API using a scoped, per-tablet key.
- **Dashboard** — authenticated web app for exhibitors to manage events/tablets and
  view insights.

```
Booth tablet (Kiosk PWA)                    Exhibitor (Dashboard)
  │  POST /api/leads  (X-Kiosk-Key)           │  supabase-js (user JWT)
  │  POST /api/events (batched, offline-queued)│  RLS-scoped reads
  ▼                                            ▼
Vercel Edge Functions (fra1, service_role) ── Supabase (Postgres + Auth + RLS, EU)
```

## 2. Technology stack

| Layer | Choice |
|---|---|
| Front-end | React 19, TypeScript, Vite, Tailwind v4, Zustand (persist), `@google/model-viewer` 4, `vite-plugin-pwa`, `qrcode` |
| Dashboard fonts | Inter (UI) + IBM Plex Mono (figures) |
| API | Vercel Edge Functions (`app/api/*.ts`), `fra1` (EU) region |
| Data / Auth | Supabase — Postgres (Frankfurt, `eu-central-1`), Auth (email+password), Row-Level Security |
| Validation | `zod` (server) |
| Hosting / DNS | Vercel (front-end + functions) · Cloudflare (DNS, TLS via Vercel) |
| Lint / build | oxlint · `tsc -b && vite build` |

## 3. Components (representative files)

**Kiosk** (`app/src/`)
- `components/Stage.tsx` — orchestrator (attract carousel, viewer, chrome).
- `components/AttractOverlay.tsx`, `HotspotLayer.tsx`, `FeatureCard.tsx`,
  `OverviewCard.tsx`, `MediaGallery.tsx`, `ProductSwitcher.tsx`, `ViewerDock.tsx`,
  `LeadCapture.tsx`.
- `store/kioskStore.ts` — Zustand state (mode, active product/hotspot, lead form +
  **consent gate**, offline lead persistence).
- `data/catalog.ts` — product content (**currently in code**; DB migration pending).
- `lib/kioskKey.ts` — resolves the tablet token (`?k=` → localStorage →
  `VITE_KIOSK_KEY`).
- `lib/leadClient.ts` — offline-queued `POST /api/leads`.
- `analytics/` — `index.ts` (facade), `sink.ts` (`LocalSink`), `apiSink.ts`
  (`ApiSink` → `POST /api/events`), `aggregate.ts`, `seed.ts`, `types.ts`.

**Dashboard** (`app/src/insights/`)
- `InsightsApp.tsx` — routing shell (auth gate; `#/e/<id>` → detail, else events).
- `EventsHome.tsx`, `EventDetail.tsx` (Insights + Tablets tabs), `TabletsTab.tsx`,
  `TopBar.tsx`, `Login.tsx`, `CommandDashboard.tsx`, `ReportView.tsx`, `charts.tsx`.
- `shows.ts` — events/tablets CRUD + token generation + kiosk-link building.
- `dataSource.ts` — RLS-scoped reads (events → `AnalyticsEvent`; leads).
- `leadsExport.ts`, `useInsights.ts`.
- `lib/supabase.ts` — browser client (anon key; dashboard only).

**API** (`app/api/`, Edge runtime, EU)
- `leads.ts` — `POST /api/leads`; validates (zod), authenticates kiosk by
  `sha256(X-Kiosk-Key)`, inserts via service_role. Rejects unless
  `consentGiven === true`.
- `events.ts` — `POST /api/events`; batched anonymous events, same auth.

**Database** (`supabase/migrations/`)
- `0001_init.sql` (schema + RLS), `0002_seed_pilot.sql` (org/show/kiosk),
  `0003_dashboard.sql` (grants, `kiosks.token`, write policies),
  `0004_grants_org.sql` (org_members/orgs read grant).

## 4. Data model (Postgres + RLS)

```
orgs ──< org_members (→ auth.users)        tenancy / dashboard access
orgs ──< shows ──< kiosks                  an event and its tablets
shows/kiosks ──< events   (anonymous analytics)
shows/kiosks ──< leads    (PII + consent)
(products, media, hotspots — created for future content-in-DB, unused today)
```

Key columns:
- **kiosks**: `label`, `token` (plaintext link token), `key_hash` = `sha256(token)`,
  `active`.
- **events**: `type` (session_start | product_view | hotspot_open | video_play |
  session_end), `client_session_id`, `product_key`, `payload` jsonb, `ts`. **No
  PII.**
- **leads**: `name`, `email`, `interest`, `explored` jsonb, `consent_given`,
  `consent_text`, `consent_version`, `captured_at`, `client_session_id`,
  `product_key`.

**RLS:** enabled on every table. `SELECT` policies gated by
`is_org_member(org_id)` (SECURITY DEFINER). No `INSERT` policy on `events`/`leads`
for anon/authenticated — writes come only from the service_role (server), which
bypasses RLS. Dashboard `INSERT`/`UPDATE` on `shows`/`kiosks` is allowed for org
members (`with check (is_org_member(org_id))`).

## 5. Interfaces / APIs

- `POST /api/leads` — headers `Content-Type: application/json`, `X-Kiosk-Key`.
  Body: `{name, email, interest?, explored[], sessionId?, productKey?, consentGiven:
  true, consentText, consentVersion}`. → `201`. Errors: `401` (bad key), `422`
  (invalid / consent missing), `500`.
- `POST /api/events` — same auth. Body: `{events: AnalyticsEvent[]}` (≤200). → `202`.
- **Dashboard reads**: `supabase-js` with the signed-in user's JWT; RLS scopes rows
  to the user's org. Events adapted to `AnalyticsEvent`; leads reconstructed into
  in-memory `lead_capture` events for the existing aggregation.

## 6. Security

- **Origin isolation**: kiosk and dashboard on separate subdomains. Kiosk carries no
  session; it holds only a scoped, ingest-only key (write-only, per tablet,
  revocable via `active=false`).
- **No DB keys in the browser**: the service_role (secret) key lives only in Vercel
  server env; the browser uses the publishable/anon key, protected by RLS.
- **Kiosk auth**: server matches `sha256(X-Kiosk-Key)` against `kiosks.key_hash`.
- **Consent gate**: leads rejected server-side unless `consentGiven === true`.
- **Security headers** (`app/vercel.json`): CSP, HSTS, X-Frame-Options,
  Referrer-Policy, Permissions-Policy.
- **Dashboard auth**: Supabase email+password, invite-only (public sign-up off).

## 7. Privacy / GDPR

- Roles: **Lathe = processor**, **exhibitor = controller** (DPA per client;
  sub-processors: Supabase, Vercel, Cloudflare).
- **Consent at capture**: unticked opt-in + privacy link; store text/version/
  timestamp with each lead.
- **Data minimisation**: name/email/interest only; analytics anonymous (random
  session id, no fingerprint) → no marketing cookies, no cookie banner.
- **EU residency**: data at rest in Frankfurt; Edge functions pinned to `fra1`.
- **Data-subject rights**: `leads_email_idx` (lowercased email) supports
  export/delete-by-email; retention auto-purge documented (job pending).

## 8. Non-functional requirements

- **Offline-first**: PWA precache of the app shell; leads + events buffered in
  `localStorage` and flushed on interval / reconnect / `pagehide`. No data loss on
  flaky venue wifi.
- **Performance**: models optimised (WebP textures, no geometry compression for
  offline decode); dashboard code-split (Supabase client out of the kiosk bundle).
- **Data residency**: EU (see §7).
- **Compatibility**: modern mobile/desktop browsers; large tap targets, no
  hover-only interactions.

## 9. Deployment & configuration

- **Vercel** builds `app/` (Root Directory = `app`); `app/api/*` deploy as Edge
  functions. Production auto-deploys from `main`.
- **Cloudflare** DNS: `kiosk.` and `dashboard.` CNAME → Vercel (DNS-only / grey
  cloud); Vercel issues TLS.
- **Env** (`app/.env.example`): client `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `VITE_KIOSK_KEY` (fallback tablet), optional `VITE_KIOSK_BASE_URL`,
  `VITE_PRIVACY_URL`; server-only `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. With
  none set, the app runs as a fully local demo.

## 10. Verification

- Build + lint: `npm run build` (tsc + vite) and `oxlint` clean; API typechecks
  standalone.
- Consent gate (headless): submit blocked without consent, succeeds with it, lead
  persists consent fields.
- Live end-to-end: create event → open tablet link → capture consented lead → row
  in `leads`, count on dashboard; offline→reconnect flush loses nothing; RLS blocks
  cross-org reads; CSV export works.

## 11. Known limitations / technical debt

- Product **content is in code** (`data/catalog.ts`), not the DB (tables exist,
  unused). Content-in-DB + hotspot editor is the next major workstream.
- No password reset yet (needs transactional email / Resend SMTP).
- Rate-limiting, retention purge job, audit log, and monitoring are documented but
  not yet implemented.
- Org onboarding is manual (single seeded org for the pilot).
