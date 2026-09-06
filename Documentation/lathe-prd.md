# Lathe — Product Requirements Document

**Product:** Lathe (formerly "Exhibly"; renamed for trademark clearance — domain **meetlathe.com**)
**Version:** 1.0 — reflects the as-built pilot
**Status:** Live pilot (kiosk + dashboard deployed on Vercel/Supabase)
**Last updated:** 2026-09-06

> This document supersedes `exhibly-prd.md.docx`. It describes what has actually
> been built, plus what is deferred. See `lathe-srs.md` for the technical spec and
> `lathe-ui-design.md` for the interface system.

---

## 1. Elevator pitch

Lathe is a tablet-based interactive display that lets hardware companies replace
static trade-show brochures and looping videos with an **explorable 3D model** of
their product. A visitor walks up to a booth tablet, rotates and zooms a
photorealistic model, taps hotspots to learn key features, watches short how-to
videos, and — if interested — leaves their details. Booth staff and the exhibitor
get a **dashboard of engagement analytics and captured leads**, turning idle
browsing into higher-quality sales conversations. Lathe produces the 3D models
(photogrammetry from client-supplied or on-site photos), so clients need no CAD or
3D assets.

## 2. Who it is for

- **Primary buyer:** marketing / trade-show manager at a B2B hardware company
  (industrial equipment, machinery, medical devices) responsible for booth
  engagement and lead quality. They are the **dashboard user** (the data controller
  for their leads).
- **End user at the booth:** trade-show visitors interacting with the tablet
  unassisted or semi-assisted. They are the **kiosk user**.
- **Secondary user:** booth sales reps, who use the captured engagement + lead data
  to prioritise follow-up.

Priority segments: industrial/technical manufacturers (can't bring product to a
show) → modular/customisable product companies → consumer-hardware startups with
limited booth staff.

**Out of scope for the pilot:** ERP/CPQ integration; fully self-serve, no-touch
client onboarding; in-app customer 3D self-capture.

## 3. Product surfaces

Lathe is two applications from one codebase, served on separate origins:

| Surface | Who | Where | Purpose |
|---|---|---|---|
| **Kiosk** | Booth visitors | `kiosk.meetlathe.com` (per-tablet link) | Explore the 3D model, capture leads. Offline-first PWA, no login. |
| **Dashboard** | Exhibitor / Lathe team | `dashboard.meetlathe.com` (login) | Manage events + tablets, view insights, export leads. |

## 4. Functional requirements

### Built (in the live pilot)

**Kiosk**
- Explorable 3D model with rotate / zoom / pan (`<model-viewer>`), tuned hero
  camera framing, double-tap-to-recenter.
- **Attract screen** as a swipeable **product catalog** — browse products (edge
  arrows, dots, auto-advance while idle) before entering, ambient auto-rotation.
- Tappable **hotspots** on the model → progressive-disclosure **feature cards**
  (title + description).
- **Product overview** panel (tagline, description, spec table), auto-shown once
  per session.
- **Media gallery** — tap-to-play short videos, **muted by default** (booth is
  noisy).
- **Viewer control dock** — zoom in/out, reset view, toggle auto-rotate.
- **Multiple products** with a switcher (pilot ships two: a cordless drill and a
  rolling tool chest).
- **Lead capture** (name, email, area of interest) with a **GDPR consent
  checkbox** + privacy link; consent text/version/timestamp stored with each lead.
- **Offline resilience** — PWA precaches the app shell; leads + analytics are
  queued locally and flushed on reconnect / page-hide (booth-wifi safe).
- **Per-tablet identity** — a tablet is set up by opening its unique link
  (`…/?k=<token>`); everything it captures is attributed to that event + tablet.

**Dashboard**
- **Email + password authentication** (Supabase), invite-only.
- **Events** ("shows") management — create an event, and manage one or more
  **tablets** per event, each with a **unique link + QR** (copy / open / download
  QR / revoke).
- **Insights** per event (consolidated across tablets, filterable by tablet /
  product / day): engagement rate, sessions, avg. time, conversion, **attention**
  (avg. dwell + taps per feature), **traffic** by hour/day, interest split of
  leads, per-product breakdown, video plays/completion.
- **Leads** — real count on the dashboard; **CSV export** for the exhibitor (data
  portability).
- **Generate report** — an emailable/printable executive summary.
- **Light/dark** theme.

**Platform**
- **Anonymous analytics** separated from **PII leads** (two stores; events carry no
  personal data).
- **Row-Level Security** (org-scoped) on every table; kiosk writes only through a
  server API using a scoped, ingest-only key — no database keys in the browser.
- EU data residency (Supabase Frankfurt; Edge API pinned to `fra1`).

### In progress / next

- Per-event **Settings** (rename, dates, privacy URL, delete).
- **Content in the database** — move products, model URLs, and hotspots out of code
  (`data/catalog.ts`) into DB rows managed per event, with an in-dashboard
  **hotspot editor**.
- **Self-serve org onboarding** + team invites.
- Password **reset** flow (needs transactional email / Resend SMTP).

### Deferred (post-pilot)

- In-app customer 3D self-capture (Lathe runs photogrammetry for now).
- Cross-section / exploded / animated model states.
- CRM integrations; native app-store distribution.
- Rate-limiting service, retention auto-purge job, audit log, monitoring (Sentry).

## 5. User stories

**Booth visitor (kiosk)**
- Rotate/zoom a 3D model to inspect the product as if it were in front of me.
- Tap parts of the product to learn what they do without waiting for a rep.
- Browse between products to find the one relevant to me.
- Watch a short how-to video.
- Leave my details (with clear consent) so a rep can follow up.

**Trade-show / marketing manager (dashboard)**
- Have Lathe build the 3D models from photos so I don't need CAD files.
- Create an event and get a tablet link/QR to set up each booth device in seconds.
- See which features drew the most attention and when the booth was busiest.
- See and export the leads we captured, with what each visitor explored.
- Trust that visitor data is captured lawfully (consent) and stays in the EU.

**Sales rep**
- See what a visitor already explored so I can pick up the conversation with
  context instead of from zero.

## 6. User interface (summary)

The 3D model is the visual focus on the kiosk; chrome recedes. The dashboard is a
clean, Vercel-style two-level app (Events → Event detail with Insights/Tablets
tabs). One type system (Inter + IBM Plex Mono for figures). Full detail in
`lathe-ui-design.md`.

## 7. Success metrics (pilot)

- Kiosk: sessions per show, engagement rate (opened ≥1 feature), avg. session time,
  lead conversion rate.
- Dashboard: exhibitor can self-serve create an event + tablet link, view insights,
  and export leads without support.
- Reliability: zero lead loss across booth-wifi dropouts (offline queue).

## 8. Open questions / assumptions to validate

- Willingness to pay (pilots are free/low-cost).
- Photogrammetry model quality from client/on-site photos vs. controlled shoots.
- Portrait vs. landscape tablet orientation and mount type per pilot.
- Whether exhibitors want self-serve content management (drives the content-in-DB +
  hotspot-editor priority).
