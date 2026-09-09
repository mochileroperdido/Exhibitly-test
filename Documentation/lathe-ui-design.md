# Lathe — UI Design Document

**Version:** 1.0 — as-built · **Last updated:** 2026-09-06
**Supersedes:** `exhibly-ui-design-document.md.docx`

Companion docs: `lathe-prd.md`, `lathe-srs.md`.

---

## 1. Design principles

- **The product is the hero (kiosk).** Chrome recedes so the 3D model dominates;
  controls are quiet, docked, and touch-first.
- **Clarity over decoration (dashboard).** A calm, professional B2B analytics tool —
  navigation, actions, and filters are visually distinct so nothing is ambiguous.
- **One system, two moods.** Kiosk = branded, immersive, light stage. Dashboard =
  neutral, dense, light/dark.
- **Touch-first & accessible.** Large tap targets, no hover-only interactions,
  legible type, AA contrast, visible focus.

## 2. Two surfaces

| | Kiosk | Dashboard |
|---|---|---|
| Audience | Booth visitors | Exhibitor / Lathe team |
| Mode | Full-screen, immersive, no login | Windowed app, authenticated |
| Nav | Implicit (attract → explore → lead) | Vercel-style: Events → Event detail (tabs) |
| Fonts | Saira Condensed (display) + **Inter** (body) + IBM Plex Mono (data) | **Inter** (UI) + IBM Plex Mono (figures) |

## 3. Typography

The brand runs on **three typefaces** total (a display + body + mono trio):

- **Saira Condensed** — display / wordmark / kiosk headlines (the industrial "tool"
  character). Kiosk only.
- **Inter** — all **body & UI** text on **both** surfaces (weights 400/500/600/700).
- **IBM Plex Mono** — numeric KPIs, data, small labels, tabular figures only.

So the **dashboard** uses two faces (Inter + Plex Mono) — the earlier consolidation
that removed the "AI slop" feel — and the **kiosk** adds Saira Condensed for
display, sharing Inter for body. (The kiosk previously used IBM Plex Sans for body;
it now uses Inter so the whole product is one coherent 3-font system, not four.)
Base 16px, line-height ~1.5, `font-variant-numeric: tabular-nums` for figures,
tight tracking on large numbers/headings.

## 4. Color system (dashboard tokens)

Themeable via `data-theme` on `.ins`; light + dark. Semantic tokens (not raw hex in
components):

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#0e1117` | `#eef0f4` | app background |
| `--panel` / `--panel-2` | `#161b24` / `#1b212c` | `#ffffff` / `#f7f8fb` | cards, fields |
| `--edge` / `--edge-2` | white 7% / 12% | `#e6e8ee` / `#d7dae2` | borders |
| `--ink` / `--ink-2` / `--muted` | `#f3f6fb` / `#aab3c2` / `#717c8e` | — | text tiers |
| `--accent` | `#ff7a33` | `#ef5f1c` | primary action + one KPI highlight |
| `--blue` / `--aqua` / `--good` | data series / positive | | charts, deltas |

Accent (orange) is used sparingly — primary buttons and a single highlight — with
neutral grays carrying structure. The kiosk applies the client's brand color as the
accent.

## 5. Kiosk information architecture & screens

**Flow:** Attract (catalog) → Explore → Lead capture.

- **Attract screen** — a swipeable **product catalog**: hero model auto-rotating,
  product name/subtitle, big mid-height edge chevrons, dots, "Tap to explore",
  auto-advance while idle. Text sits on a legibility scrim so it never overlaps the
  model.
- **Explore** — full-screen `<model-viewer>`; quiet product wordmark top-center;
  **hotspot dots** on the model → **feature cards** (progressive disclosure);
  **overview** panel (auto-shown once); **media gallery** (tap-to-play, muted);
  **viewer dock** (zoom, reset, auto-rotate); **product switcher**; **"Leave your
  details"** pill.
- **Lead capture** — short single-screen form (name, email, interest chips) at a
  natural end point, **not** forced before exploration; **GDPR consent checkbox** +
  privacy link is required to submit.
- Idle timeout returns to Attract and resets the session.

## 6. Dashboard information architecture (Vercel-style)

Two levels + a persistent top bar:

- **Global top bar** — Lathe wordmark (→ Events), theme toggle, account/sign-out.
  Holds **no** filters or feature actions.
- **Events home** ("projects" screen) — an **Events** heading, a prominent **New
  event** button, and a **card per event** (name, dates, leads/sessions, Open).
- **Event detail** — breadcrumb `Events / <name>`, an **Open kiosk ↗** action, and a
  **tab bar**:
  - **Insights tab** — a labelled **Filters** row on the left (Tablet · Product ·
    Date), **actions** on the right (Generate report); KPI/hero panel, traffic,
    features-by-attention, interest of leads, videos, per-product, and a **Captured
    leads** panel (count + **Export CSV**; contact details stay off-screen).
  - **Tablets tab** — one row per tablet: link · Copy · Open ↗ · **QR** (popup with
    the tablet name + downloadable PNG); **Add tablet**; **Revoke**.

This separates **navigation** (tabs) / **actions** (right-grouped buttons) /
**filters** (left group) — the core usability fix over the earlier flat toolbar.

## 7. Component & interaction standards

- **Button hierarchy:** `primary` (solid accent, one per context), default
  (outlined), `ghost` (borderless). No more identical pills for everything.
- **Filters** are dropdowns/segmented controls, styled to read as filters, not
  actions.
- **Modals/drawers** use a shared scrim + panel; the QR popup and New-event form
  follow it.
- **Charts** (`charts.tsx`): accessible categorical colors, legends/labels, tabular
  figures; never color-only meaning.
- **Motion:** 120–300ms transitions; theme/tab/hover changes are eased, not instant;
  no decorative-only animation.

## 8. Accessibility

- Large tap targets (kiosk, possibly gloved hands); no hover-only affordances.
- AA contrast via the token tiers; visible focus rings (`focus-ring`).
- `aria-label`/`aria-selected`/`role` on nav, tabs, filters, and icon buttons.
- Theme-aware: light + dark both meet contrast; respects the viewer's scheme.

## 9. Responsive behavior

- Kiosk: full-screen tablet-first (portrait/landscape), model centered and large.
- Dashboard: fluid grid; cards `auto-fill minmax(260px, 1fr)`; wide content
  (tables, charts) scrolls within its own container; the account email hides on
  narrow widths; tablet rows and filters wrap gracefully.
- Backgrounds are a single uniform ground (overscroll suppressed) — no seams.

## 10. Open UI questions

- Portrait vs. landscape default per pilot mount.
- Whether a per-event **Settings** tab and a self-serve **hotspot editor** should
  share the Tablets-tab pattern or become their own section as the dashboard grows.
