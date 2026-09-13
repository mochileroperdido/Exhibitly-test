# Lathe — Software Requirements Specification

**Version:** 2.0 — self-serve dashboard shipped (PR #19 merged 2026-09-13)
**Last updated:** 2026-09-13

> The **v1.0 snapshot** (as-built pilot) is archived at `lathe-srs-v1.0.md`.
> Companion docs: `lathe-prd.md`, `lathe-ui-design.md`, `docs/SETUP.md`.

---

## Changelog vs v1.0

| Layer | v1.0 (pilot) | v2.0 (self-serve) |
|---|---|---|
| Migrations applied | `0001`–`0007` | + **`0008_content_forms_brand.sql`**, **`0009_assets_storage.sql`**, **`0010_seed_demo_content.sql`** (optional) |
| Content location | `app/src/data/catalog.ts` (build-time constant) | `products` / `hotspots` / `media` rows populated via dashboard; `show_products` join attaches products to events |
| Forms | Hardcoded in `LeadCapture.tsx` | `forms` + `form_fields` tables; `shows.form_id`; `leads.answers` jsonb for dynamic responses |
| Brand | Hardcoded orange in `brand/lathe-colors.css` | `orgs.brand_accent_hex` + `orgs.brand_logo_url`; kiosk injects overrides at boot |
| Storage | None | Private Supabase Storage bucket **`assets`** with org-scoped RLS policies; path convention `{org_id}/{models\|media\|brand}/…` |
| API surface | `/api/events`, `/api/leads`, `/api/whoami` | + **`/api/content`** (kiosk content bundle, `X-Kiosk-Key`), **`/api/uploads`** (dashboard signed upload, user JWT), extended `/api/leads` (dynamic `answers` validation) |
| Dashboard code | `app/src/insights/` (flat) | `app/src/dashboard/` with subfolders `shell / events / products / media / forms / brand / shared` |
| Type additions | — | `MediaItem.type` accepts `'image'`; `FormDefinition` types; `ProductStats` type |

CSP tweak: `img-src` and `media-src` extended to include `https:` so the
kiosk can render Storage-hosted signed URLs.

---

## 1. System overview

Lathe is a single React 19 / TypeScript / Vite codebase that renders two
surfaces, chosen at runtime by hostname. New in v2.0: kiosk fetches its
content bundle at boot rather than importing it statically.

```
Booth tablet (Kiosk PWA)                          Exhibitor (Dashboard)
  │  GET  /api/content  (X-Kiosk-Key)  — new       │  supabase-js (user JWT)
  │  POST /api/events   (batched, offline-queued)  │  RLS-scoped reads
  │  POST /api/leads    (+ answers, new)           │  POST /api/uploads (JWT) — new
  ▼                                                ▼
Vercel Edge Functions (fra1, service_role) ── Supabase (Postgres + Auth + RLS + Storage, EU)
```

## 2. Technology stack (unchanged from v1.0 unless noted)

| Layer | Choice |
|---|---|
| Front-end | React 19, TypeScript, Vite, Tailwind v4, Zustand (persist), `@google/model-viewer` 4, `vite-plugin-pwa`, `qrcode`, `@supabase/supabase-js` |
| Dashboard fonts | Inter (UI) + IBM Plex Mono (figures / small-caps labels only) |
| API | Vercel Edge Functions (`app/api/*.ts`), region `fra1` |
| Data / Auth / Storage | Supabase — Postgres (Frankfurt), Auth (magic link), Row-Level Security, **Storage** (new in v2.0) |
| Validation | `zod` (server) |
| Hosting / DNS | Vercel + Cloudflare |
| Lint / build | `oxlint` · `tsc -b && vite build` |

## 3. Components — representative files

**Kiosk** (`app/src/`) — additions in bold:
- `components/Stage.tsx`, `AttractOverlay.tsx`, `HotspotLayer.tsx`,
  `FeatureCard.tsx`, `OverviewCard.tsx`, `MediaGallery.tsx` (now handles
  `image` type), `ProductSwitcher.tsx`, `ViewerDock.tsx`, `LeadCapture.tsx`
  (renders dynamic form fields + on-blur email validation).
- **`kioskBoot.ts`** — new. `bootKiosk()` fetches `/api/content`, replaces the
  compiled `catalog` array in place (so every existing `import { catalog }`
  consumer picks up the new data), injects brand CSS overrides, exports
  `getRuntimeForm()` / `getRuntimeLogoUrl()`.
- `store/kioskStore.ts` — `leadAnswers: Record<fieldId, string>` state;
  `submitLead` enforces required custom fields + email format.
- `data/catalog.ts` — kept as offline fallback for local dev.
- `lib/kioskKey.ts`, `lib/leadClient.ts` (adds `answers` field to `LeadPayload`).

**Dashboard** (`app/src/dashboard/`) — replaces the `insights/` folder:
- `shell/` — `DashboardApp.tsx` (renamed from `InsightsApp.tsx`, router),
  `Sidebar.tsx` (new — collapsible with `Alt+1..5` shortcuts), `TopBar.tsx`
  (retained only for the offline demo view), `Login.tsx`.
- `events/` — `EventsHome.tsx` (extended with product + form pickers),
  `EventDetail.tsx`, `TabletsTab.tsx`, `CommandDashboard.tsx`,
  `ReportView.tsx`, `charts.tsx`, `useInsights.ts`, `dataSource.ts`,
  `shows.ts`, `leadsExport.ts`, `tip.ts`.
- **`products/`** — `ProductsPage.tsx` (list with event-manager metrics),
  `ProductEditor.tsx` (3-step stepper Model → Details → Hotspots),
  `HotspotPicker.tsx` (in-browser `positionAndNormalFromPoint()`).
- **`media/`** — `MediaPage.tsx` (upload + grid + assign).
- **`forms/`** — `FormsPage.tsx` (list + pinned default), `FormEditor.tsx`
  (builder + live kiosk preview panel).
- **`brand/`** — `BrandPage.tsx` (accent hex + logo + WCAG check).
- **`shared/`** — `EmptyState.tsx`, `CharInput.tsx`, `SectionEmpty.tsx`,
  `orgContext.ts` (`myOrgId()` cached hook), `upload.ts`
  (`uploadAsset(kind, file)` client wrapper for `/api/uploads`),
  `schemaGuard.ts` (`loadWithSchemaGuard()` — degrades to empty state and
  logs once when migrations 0008/0009 are not applied), `content.ts` (CRUD
  helpers for every new resource: products / hotspots / media / forms /
  brand / show_products, plus `listProductStats()`).

**API** (`app/api/`, Edge runtime, EU):
- `leads.ts` — extended: accepts `answers` map, validates each answer
  against the show's `form_id` field spec; drops unknown fields, invalid
  single-select values, and malformed emails.
- `events.ts` — unchanged.
- `whoami.ts` — unchanged.
- **`content.ts`** — new. `GET /api/content` with `X-Kiosk-Key`. Joins
  kiosk → show → `show_products` → products (+ hotspots + media) and returns
  a `CatalogEntry[]`-shaped payload plus brand + form. Storage-backed
  `model_url` / `media.src` / `brand_logo_url` values are signed here with a
  1 h TTL; `/`-prefixed static paths (e.g. `/models/drill-new.glb`) pass
  through untouched so bundled demo assets keep working.
- **`uploads.ts`** — new. `POST /api/uploads` with `Authorization: Bearer
  <access_token>`. Verifies the user, resolves the caller's `org_id`,
  enforces kind ∈ (`models`, `media`, `brand`) with per-kind MIME + size
  caps mirrored client-side by `shared/upload.ts`. Returns a signed upload
  URL scoped to `{org_id}/{kind}/{timestamp}_{safe_name}`.
- `_kiosk.ts` — shared helpers unchanged.

**Database** (`supabase/migrations/`):
- `0001`–`0007` (from v1.0).
- **`0008_content_forms_brand.sql`** — products goes org-scoped
  (drops `show_id`), gains `slug`, `model_bytes`, `triangle_count`,
  `updated_at`. New `show_products` join. New `forms` + `form_fields`.
  `shows.form_id`. `orgs.brand_accent_hex` + `brand_logo_url`.
  `leads.answers jsonb`. Grants + RLS mirror the existing
  `is_org_member()` pattern.
- **`0009_assets_storage.sql`** — creates the private `assets` Storage
  bucket and org-scoped SELECT/INSERT/UPDATE/DELETE policies keyed off the
  first path segment (`_assets_org_of(name)` helper).
- **`0010_seed_demo_content.sql`** (optional) — populates the pilot org
  (`11111111-…`) with the two demo products, their hotspots + videos, plus
  `show_products` attachments. Idempotent guard: only runs if the pilot
  org has zero products.

## 4. Data model

```
orgs ──< org_members (→ auth.users)                tenancy / dashboard access
     ──  {brand_accent_hex, brand_logo_url}         v2.0 columns

shows ──< kiosks                                    unchanged
      ──  form_id → forms.id  (nullable)            v2.0 column

show_products (show_id, product_id, sort_order)     v2.0 join

products (org_id, slug, label, subtitle, tagline,   v2.0: org-scoped
          overview, specs jsonb, model_url,
          model_bytes, triangle_count, updated_at)
  ──< hotspots (position, normal, slug, sort_order)
  ──< media    (type video|image, src, title, sort_order)

forms (org_id, name, is_default)                    v2.0 tables
  ──< form_fields (kind, label, required, options[])

events    (unchanged from v1.0)                     analytics, no PII
leads     + answers jsonb                            v2.0 column
```

`kiosks` / `events` / `leads` core columns unchanged from v1.0.

**RLS pattern** unchanged: `is_org_member(org_id)` gates dashboard reads +
writes; `events`/`leads` inserts still come exclusively from service_role via
the API. Media / hotspots read policies chain through the parent product.
`show_products` policies check the parent show and product both belong to the
caller's org.

## 5. Interfaces / APIs

Additions in bold; existing endpoints kept.

- `POST /api/leads` — extended body: `{…v1.0 fields, answers?:
  Record<fieldId, string>}`. Server validates every answer whose
  `form_fields.kind === 'email'` with `z.string().email()`, drops the answer
  if it fails; drops single-select answers outside the allowed options;
  drops unknown field ids. Consent gate unchanged.
- `POST /api/events` — unchanged.
- **`GET /api/content`** — headers `X-Kiosk-Key`. Returns
  `{ok: true, catalog: CatalogEntry[], brand: {accentHex, logoUrl}, form:
  {id, name, fields[]} | null}`. `Cache-Control: no-store`.
- **`POST /api/uploads`** — headers `Content-Type: application/json`,
  `Authorization: Bearer <access_token>`. Body: `{kind, filename, mime,
  bytes}`. Returns `{ok: true, path, uploadUrl, token}`. Rejects with 422 on
  bad extension / MIME / size; 401 on missing/invalid JWT; 403 if the user
  has no org.
- **Dashboard reads/writes** on new tables go through `supabase-js` under the
  user's JWT; RLS scopes rows to the user's org (`shared/content.ts` for the
  CRUD; `shared/orgContext.ts` for `myOrgId()`).
- **Dashboard uploads** go through `shared/upload.ts` → `POST /api/uploads`
  → PUT to the returned signed URL. Client-side format/size checks match the
  server's so the user gets immediate feedback.

## 6. Security

Unchanged from v1.0 unless noted.

- **Origin isolation**: kiosk on `kiosk.` (no login), dashboard on
  `dashboard.` / `app.` (magic-link).
- **No DB keys in the browser**: service_role stays in Vercel server env.
- **Kiosk auth**: `sha256(X-Kiosk-Key)` matched against `kiosks.key_hash`
  (unchanged), now used by `/api/content` as well.
- **Dashboard upload auth**: caller's Supabase JWT; server verifies via
  `db.auth.getUser(token)` before signing a Storage URL, and the signed URL
  itself is scoped to the caller's `org_id` path prefix so it can only
  target the caller's own Storage subtree.
- **Storage RLS**: `_assets_org_of(name)` extracts the first path segment
  and checks `is_org_member`; every RLS policy on `storage.objects` for the
  `assets` bucket goes through it.
- **Consent gate** unchanged; email format is a new soft gate but consent
  remains the hard one.
- **CSP** (in `app/vercel.json`): `img-src` and `media-src` widened from
  `'self' data: blob:` to `'self' data: blob: https:` so signed URLs on
  Storage render. `connect-src` was already permissive.

## 7. Privacy / GDPR

Unchanged from v1.0. New `leads.answers` jsonb is customer-defined content
subject to the same consent-at-capture rules; `leads_email_idx` still supports
GDPR export/delete-by-email. No new PII surfaces.

## 8. Non-functional requirements

- **Offline-first** unchanged.
- **Boot latency**: kiosk now waits on one `/api/content` request before
  showing `<Stage />`. Timeout / network failure falls back silently to the
  bundled demo catalog (`data/catalog.ts` still shipped) so a flaky venue
  Wi-Fi never leaves a blank screen.
- **Performance**: uploads capped (`.glb` ≤ 40 MB, video ≤ 50 MB, image
  ≤ 5 MB). Dashboard lazy-loaded from the kiosk bundle.
- **Data residency**: EU.
- **Compatibility**: modern mobile/desktop browsers.

## 9. Deployment & configuration

- **Vercel** — unchanged root and region.
- **Env** — same set as v1.0. Dashboard uploads use the caller's JWT, no new
  server env.
- **Supabase Storage** — bucket `assets` created by migration `0009`.
  Automatic bucket creation is safe (`insert into storage.buckets … on
  conflict do nothing`).

## 10. Verification

1. **Migrations**: apply `0008` + `0009` (+ optional `0010`) in the SQL
   Editor; `supabase db reset` also clean.
2. **Products**: log in, upload a demo `.glb`, place hotspots, save; row in
   `products`, related rows in `hotspots`, list card shows correct counts.
3. **Media**: upload one MP4 and one JPG, assign to a product; both appear
   in the grid with signed preview URLs.
4. **Forms**: build a 3-question form (short-text + single-select), mark it
   default; kiosk-preview reflects the current draft; save.
5. **Brand**: set an accent hex; contrast warning renders correctly at
   `#ef5f1c`; both panels visually equal-height.
6. **Event editor**: creating a new event lets you pick 1–5 products and a
   form; 6th product is disabled; warning shown at 4+.
7. **Kiosk end-to-end**: open a paired tablet URL — `/api/content` responds
   with the org's catalog + brand + form; brand color replaces orange in
   every affordance; custom form fields render; submitting a lead lands in
   `leads.answers`.
8. **Fallback**: unset the kiosk key (or block the API) — the tablet still
   boots to the bundled demo catalog, silently.

## 11. Known limitations / technical debt

- Per-event **Settings** page not yet built — you can pick products / form
  only at creation time; editing them post-creation requires SQL.
- Team invites: no UI (`org_members` is manual insert).
- Password reset still needs Resend SMTP.
- Onboarding checklist + QR-to-phone lead capture are queued as Phase 2.
- Retention purge job, rate limiting, audit log, Sentry — documented, not
  implemented.
