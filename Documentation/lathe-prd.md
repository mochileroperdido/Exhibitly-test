# Lathe — Product Requirements Document

**Product:** Lathe (domain **meetlathe.com**)
**Version:** 2.0 — self-serve dashboard shipped (PR #19 merged 2026-09-13)
**Status:** Live pilot on Vercel/Supabase — kiosk + self-serve dashboard.
**Last updated:** 2026-09-13

> The **v1.0 snapshot** (as-built pilot with content in code) is archived at
> `lathe-prd-v1.0.md`. Companion docs: `lathe-srs.md` (technical),
> `lathe-ui-design.md` (interface), `docs/SETUP.md` (ops).

---

## Changelog vs v1.0

The pilot dashboard did **events + insights only**; everything the kiosk showed
(products, hotspots, videos, brand color, lead form) was hardcoded in
`app/src/data/catalog.ts` and `app/src/components/LeadCapture.tsx`. Every
customer required manual code edits. **v2.0 moves all of that to the
dashboard**, so a customer can stand up a fully branded event without Lathe
touching the codebase.

| Area | v1.0 (pilot) | v2.0 (self-serve) |
|---|---|---|
| Products | Hardcoded in `data/catalog.ts` | Dashboard **Products** module — upload `.glb`, edit details, place hotspots on the model, reuse across events |
| Media | Static files in `public/media/` | Dashboard **Media** module — upload MP4 / JPG / PNG / WebP, assign to products |
| Lead form | Hardcoded (name · email · interest · consent) | Dashboard **Forms** module — up to 5 custom questions (short-text / single-select) on top of system fields; per-event form selection |
| Brand | Fixed Lathe orange | Dashboard **Brand** module — accent hex + logo per org; kiosk injects it at boot |
| Kiosk content | `import { catalog }` at build time | Fetched from `/api/content` at boot (signed URLs for `.glb`, video, image, logo); silent fallback to bundled demo when the tablet is unpaired |
| Dashboard nav | Top-bar tabs (Events · Insights) | Collapsible left **sidebar** (Events · Products · Media · Forms · Brand) — HubSpot / Canva pattern, `Alt+1..5` shortcuts, footer with account + theme + collapse |
| Event editor | Name + dates | Adds product multi-select (cap 5, warn > 3) + form picker |
| Storage | None | Private Supabase Storage bucket `assets` with org-scoped policies; dashboard uploads via signed URLs served by `/api/uploads` |
| Design system | Buttons/tabs used IBM Plex Mono uppercase | Sweep — Inter for all UI chrome; Plex Mono only for numeric KPIs / small-caps labels / data-table headers (per brand guide) |

Applied migrations: `0008_content_forms_brand.sql`, `0009_assets_storage.sql`,
`0010_seed_demo_content.sql` (optional pilot demo).

---

## 1. Elevator pitch

Lathe is a tablet-based interactive display that lets hardware companies
replace static trade-show brochures with an **explorable 3D model** of their
product. Visitors rotate and zoom a photorealistic model, tap hotspots to learn
features, watch short how-to videos, and leave their details. Exhibitors get a
**self-serve dashboard** to upload their own 3D models, build lead forms, set
brand colors, and view engagement analytics and captured leads. Lathe still
offers a 3D-modelling service for customers without their own assets.

## 2. Who it is for

- **Primary buyer:** marketing / trade-show manager at a B2B hardware company
  (industrial equipment, machinery, medical devices). They are the **dashboard
  user**.
- **End user at the booth:** trade-show visitors interacting with the tablet
  unassisted. They are the **kiosk user**.
- **Secondary user:** booth sales reps who use engagement + lead data to
  prioritise follow-up.

Priority segments unchanged from v1.0: industrial/technical manufacturers →
modular/customisable product companies → consumer-hardware startups.

**Out of scope for v2.0:** ERP/CPQ integration; fully autonomous org
self-signup (invitation-based for now); in-app customer 3D self-capture.

## 3. Product surfaces

Two applications from one codebase, served on separate origins:

| Surface | Who | Where | Purpose |
|---|---|---|---|
| **Kiosk** | Booth visitors | `kiosk.meetlathe.com` (per-tablet link) | Explore 3D models, capture leads. Offline-first PWA, no login. |
| **Dashboard** | Exhibitor | `dashboard.meetlathe.com` (login) | Manage products, media, forms, brand, events, tablets; view insights; export leads. |

## 4. Functional requirements

### Built in v2.0 (the self-serve dashboard)

**Products module** (`#/products`)
- Org-scoped library of reusable products.
- **3-step editor** (Model → Details → Hotspots) with a progress-bar stepper:
  - **Model** — dropzone for `.glb` (≤ 40 MB), live `<model-viewer>` preview,
    format/size guidance, a compact "1.7 MB · 28,689 triangles · recommended
    under 25 MB / 30k" caption under the preview.
  - **Details** — label (≤ 32 chars), subtitle (≤ 48), tagline (≤ 80),
    overview (≤ 400), specs table. Character counters clamp typing.
  - **Hotspots** — click on the model preview to place a hotspot; the browser
    calls `positionAndNormalFromPoint()` (same API as the offline
    `scripts/pick-hotspots.mjs` pipeline). Title ≤ 28, description ≤ 220
    chars (measured against `FeatureCard.tsx` in both orientations). Optional.
- Card list shows event-manager-relevant metrics: **Hotspots · Media · Events**
  (rows in `show_products` that reference the product). Technical stats (MB /
  triangles) live only inside the editor.
- **3D-model service upsell**: "Don't have a 3D model yet? We can build one"
  → `mailto:inquiries@meetlathe.com` — visible in the empty state and under
  the model dropzone.

**Media module** (`#/media`)
- Upload MP4 (≤ 50 MB), JPG / PNG / WebP (≤ 5 MB), assign to a product.
- Grid filterable by product; delete removes from all products using the
  asset.

**Forms module** (`#/forms`)
- **System fields** (Name, Email, Consent) are always collected on every kiosk
  — never editable, never rearrangeable.
- Custom forms add up to **5 extra questions** (kinds: `short_text` or
  `single_select`; `email` no longer offered as a new choice because the
  system Email field already collects that — existing DB rows still render).
- Options: label ≤ 40 chars, `required` toggle, 2–6 options at ≤ 24 chars for
  single-select.
- One form per org can be marked as the default (partial unique index).
- **Kiosk preview panel** to the right of the builder renders a light-panel
  approximation of what visitors will see, live-updated as the author edits,
  respecting the org's brand accent.
- Pinned "Default form (built-in)" card at the top of the list so authors
  never wonder if a default exists.

**Brand module** (`#/brand`)
- Upload a logo (SVG / PNG / JPG / WebP, ≤ 5 MB) and pick one **accent hex**.
- Auto-derived: `--accent-hover` (8% darker), `--accent-active` (16% darker),
  `--on-accent` (black or white by luminance).
- **WCAG-AA contrast check** — one-line compact warning if the derived
  on-accent fails the 4.5:1 target.
- Panels visually equal-height regardless of warning state.

**Event editor** (Events → New event)
- Adds a product multi-select (**hard cap 5, soft warning above 3** — kiosk
  switcher UX guidance) and a form picker (defaults to the org's default
  form).
- Writes to `show_products` and `shows.form_id`.

**Dashboard chrome**
- Left **sidebar** (232 px expanded / 60 px collapsed, choice persisted in
  `localStorage`) — Events · Products · Media · Forms · Brand. Section icons
  as inline SVGs, palette icon for Brand, `Alt+1..5` keyboard shortcuts.
- Sidebar wordmark left-aligned to the icon column, 30 px tall; collapsed
  state uses the real Lathe favicon glyph, not a colored square.
- Footer holds user email + Sign out + theme toggle + collapse chevron.
- Mobile (< 720 px) — sidebar becomes an off-canvas drawer with a hamburger
  toggle.

**Kiosk (dynamic content)**
- Fetches `/api/content` at boot with `X-Kiosk-Key`. Payload = catalog +
  brand + form. Falls back silently to the bundled demo catalog when the
  network is down or the tablet is unpaired.
- Brand accent injected as a `<style>` overriding `--accent*` tokens.
- Custom form fields render below the built-in Name/Email; single-select uses
  the same pill-button primitives already in `LeadCapture`.
- On-blur email validation on the built-in email and every email-kind custom
  question, matching the server's `z.string().email()` gate.

**Retained from v1.0** (unchanged): explorable 3D model, hotspot cards,
overview panel, media gallery, viewer dock, attract carousel, offline-queued
leads, per-tablet identity, GDPR consent gate, RLS-scoped analytics, EU data
residency.

### In progress / next

- Per-event **Settings** page (rename, dates, privacy URL, delete, form/product
  edit after creation).
- Password **reset** flow (needs Resend SMTP).
- Team invites — `org_members` supports it in the DB; no UI yet.

### Deferred (post-v2.0)

- **Onboarding checklist** — first-run wizard (brand → product → form → event).
- **QR-to-phone lead capture** — visitor scans and finishes on their phone.
- In-app customer 3D self-capture; CRM integrations; native app stores; rate
  limiting, retention purge job, audit log, Sentry.

## 5. User stories (updated)

**Trade-show / marketing manager (dashboard)**
- Upload my own 3D models with our specs, videos and hotspots without
  emailing anything to Lathe.
- Set our brand color and logo once and have every future event pick them up.
- Build a lead form specific to a show (e.g. "How did you find us?" + "Which
  business unit?"), then pick that form when I create the event.
- Reuse a product across multiple events without duplicating uploads.
- See at a glance which of my products are in use, how rich their content is,
  and where they're deployed.

**Booth visitor (kiosk)** — unchanged from v1.0.

**Sales rep** — unchanged from v1.0.

## 6. User interface (summary)

The kiosk stays visually identical to v1.0 (3D-first, chrome recedes) but now
brands itself from the org's accent hex. The dashboard is rebuilt around a
**left sidebar** (HubSpot / Canva pattern) with five section pages plus the
event detail. One type system (Inter + IBM Plex Mono for figures/labels). Full
detail in `lathe-ui-design.md`.

## 7. Success metrics

- **Self-serve completion**: a new customer sets up brand + one product + one
  event without Lathe support. (Pilot → v2 upgrade path is a founder-time
  reduction.)
- **Kiosk KPIs unchanged**: sessions/show, engagement rate (opened ≥ 1
  feature), avg. session time, lead conversion rate.
- **Reliability**: zero lead loss across booth-wifi dropouts (offline queue).

## 8. Open questions / assumptions to validate

- Adoption of the self-serve modules by exhibitors vs. reliance on the 3D
  modelling service. (Upsell CTA in the products area tracks this.)
- Whether hard cap of 5 products per event is right; watch kiosk memory
  behaviour at 4–5 preloaded `.glb`s.
- Portrait vs. landscape default per pilot mount (unchanged from v1.0).
- Whether the sidebar should stay collapsed by default on second-visit
  desktop or expand — measure via preference persistence.
