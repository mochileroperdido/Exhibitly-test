# Lathe — Production Migration Plan

Backend, auth, DB, GDPR, content, hosting, and domain plan for taking the
kiosk + insights demo to a live pilot that captures leads (PII) safely.

## Context & constraints

The kiosk + insights demo is merged to `main` and deployed. Next: turn it into a
real product that captures **PII (leads)** + **anonymous analytics** safely for a
pilot at an upcoming event, under a **rebrand to "Lathe" / meetlathe.com**
(Exhibitly is taken / trademark risk). Founder constraints: **low ops effort**,
**avoid ~$30–40/mo before a paying customer**, **GDPR compliant**, **hard to
breach**. Pricing below is approximate — verify current tiers.

### Already shipped — DO NOT rebuild

Attract swipe-carousel, viewer dock/overview/media, **two products + switcher**,
the **Insights dashboard + generated report**, and the **analytics adapter**
(`src/analytics/sink.ts` `AnalyticsSink` + `kioskStore.submitLead`). This plan
only adds the backend/DB/auth/GDPR/content layers **on top of** those seams.

## Recommended stack (cost-first; spend scales with revenue)

| Layer | Choice | Pilot cost |
|---|---|---|
| Front-end host | Stay on **Vercel** (Hobby now → Pro $20/mo only once charging; Hobby is non-commercial) — or Cloudflare Pages (free, commercial-OK) | $0 |
| API | **Vercel serverless/Edge functions**, EU region | $0 |
| DB + Auth + RLS + Storage | **Supabase, EU (Frankfurt)**, free tier | $0 → $25 at scale |
| Transactional email | **Resend** free | $0 |
| Mailbox email | **Cloudflare Email Routing** (free forward) or **Zoho** → Google Workspace later | $0–1 |
| Domain | **meetlathe.com** at Cloudflare/Namecheap/Porkbun (+ defensive `.app`) | ~$10–25/yr |
| Monitoring | **Sentry** free | $0 |

**Pilot ≈ domain cost + ~$0/mo.** Full pro tier (~$45–50/mo) deferred to first
paying customer. (Note: Google Domains no longer exists — sold to Squarespace.)

## Domain / origin structure (security-critical)

One primary domain, **subdomains as the structure**, kiosk and dashboard on
**separate origins** so a shared kiosk tablet can never reach dashboard auth:

- `meetlathe.com` / `www` → marketing · `app.meetlathe.com` → **dashboard (auth)**
- `kiosk.meetlathe.com` (or host on `meetlathe.app`) → **kiosk PWA (no login, write-only)**
- `api.meetlathe.com` → API (EU) · email `@meetlathe.com`
- Host-only cookies on `app.` (never a domain-wide `.meetlathe.com` cookie); the
  kiosk carries no session — it writes via a scoped API key only.
- Buy `.app` (HSTS-preloaded, brand protection) + optionally `.io/.co` defensively.

## Target architecture (three logical apps, one repo)

1. **Kiosk (write-only):** POSTs leads + batched events to the API; no DB keys in
   the browser; reuse the offline queue in `sink.ts` (flush on interval /
   `pagehide` / reconnect). Also **fetches its show's content** (products, model
   URLs, hotspots) from the API and PWA-caches it for offline.
2. **Ingestion/content API (serverless, EU):** `POST /api/leads`,
   `POST /api/events`, `GET /api/shows/:id/content` — server-side validation
   (zod), rate-limit per kiosk/IP, **server-only** Supabase key.
3. **Dashboard (auth-guarded):** Supabase Auth (magic link); reads scoped by RLS;
   **remove the open `#/insights` route + temp kiosk Insights button** in prod.

Adapter swap: add `SupabaseSink`/`ApiSink` implementing the existing
`AnalyticsSink`; code above the sink is unchanged. `submitLead` → `POST /api/leads`.
(The dormant `ApiSink` + env-flagged sink selection landed with this PR.)

## Content model — move products/models/hotspots OUT of code

Today `data/catalog.ts` hardcodes products, model URLs, hotspot positions, and
copy. Production:

- **`.glb` files → object storage** (Supabase Storage), DB stores the URL. Kiosk
  fetches + caches (models already excluded from the giant precache).
- **Products / specs / media / hotspots (position, normal, title, description) →
  DB rows**, scoped by org, assigned to shows/kiosks.
- **Hotspot authoring:** evolve `scripts/pick-hotspots.mjs` into a small
  **internal hotspot editor** page in the dashboard — load the model, click the
  mesh to drop a point (`positionAndNormalFromPoint`), type copy, save to DB.
- **First live test (pragmatic):** DB-driven content, but **place hotspots with
  the existing script and seed rows manually** (one-time per product); build the
  self-serve editor immediately after so clients/staff can do it without a deploy.

## Data model (Postgres + RLS)

`orgs` · `shows` · `kiosks` · `products` (+ `media`, `hotspots`) · `sessions`
(anon) · `events` (anon) · `leads` (PII + consent). **RLS on every table** scoped
by `org_id`; kiosk ingestion via API service key, not direct writes. `leads`
carries `consent_given`, `consent_text`, `consent_version`, `captured_at`. A
reference schema lives in `supabase/migrations/0001_init.sql`.

## GDPR / privacy

- **Roles:** Lathe = **processor**; exhibitor = **controller** → **DPA per
  client** + sub-processor list (Supabase, Vercel/CF, Resend).
- **Consent at capture:** un-ticked opt-in + privacy link/QR on the lead form;
  store text/version/timestamp. (Shipped in this PR: consent checkbox gating
  `submitLead`, storing `consentText`/`consentVersion`.)
- **Minimization:** name/email/interest only; analytics truly anonymous (random
  session id, no fingerprint). No marketing cookies → no cookie banner.
- **EU residency**; **data-subject rights** (export + delete-by-email);
  **retention** auto-purge N days post-show; Art.30 records; 72h breach process;
  light DPIA.

## Security hardening (demo "one layer" → production layers)

Server-only service key + least-privilege kiosk key (ingest-only); server
validation + payload caps + **rate limiting** (+ optional Turnstile); **security
headers** (CSP/HSTS/X-Frame-Options — shipped in `app/vercel.json`); fix demo
`npm audit` highs + Dependabot + CI; Sentry + dashboard access audit log;
Supabase backups. **Repo restructure:** `kiosk` / `dashboard` / `api` / `db
(migrations+RLS)`, env-based config, typed API.

## Phased rollout

1. Provision (Supabase EU, envs, domain + subdomains).
2. Schema + RLS + migrations + content tables.
3. Content API + storage upload + seed first product(s) via script.
4. Ingestion API + `SupabaseSink`/`ApiSink` + lead consent.
5. Dashboard auth + hotspot editor.
6. Security headers + rate limit + audit + monitoring.
7. GDPR docs (privacy notice, DPA, retention job).
8. Staging → security checklist → production cutover on meetlathe.com.

## Verification

Staging: offline→online flush writes to DB; RLS blocks cross-org reads; dashboard
requires login; content loads from API + caches offline; delete-by-email works;
retention purges; security-header scan passes; `npm audit` clean; PWA/Lighthouse
green.

## What this PR delivers (non-breaking foundation)

- This plan (`docs/production-migration.md`) + the founder setup checklist
  (`docs/SETUP.md`).
- GDPR consent on the lead form (checkbox + privacy link, gated submit, stored
  consent text/version).
- Env-flagged analytics sink: dormant `ApiSink`; default stays the local demo
  sink, so the Vercel preview behaves exactly like the merged demo.
- `app/vercel.json` security headers; `app/.env.example`.
- Reference-only backend (not built by the `app/` Vercel project):
  `supabase/migrations/0001_init.sql` and `api/*.ts`. These are wired in a later
  PR **after** Supabase is provisioned.

Building the live backend is a **separate go-ahead** once the external setup in
`docs/SETUP.md` is done; the rebrand rename (Exhibly → Lathe strings) can be a
quick follow-up PR.
