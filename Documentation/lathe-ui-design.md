# Lathe — UI Design Document

**Version:** 2.0 — self-serve dashboard shipped (PR #19 merged 2026-09-13)
**Last updated:** 2026-09-13

> The **v1.0 snapshot** (as-built pilot, top-bar dashboard) is archived at
> `lathe-ui-design-v1.0.md`. Companion docs: `lathe-prd.md`, `lathe-srs.md`.

---

## Changelog vs v1.0

| Area | v1.0 (pilot) | v2.0 (self-serve) |
|---|---|---|
| Dashboard navigation | Top-bar with two-level (Events → Event detail) | **Left sidebar** (Canva / HubSpot pattern), collapsible, 5 sections + event detail |
| Wordmark placement | Centered in top bar | Left-aligned in sidebar at 30 px; collapses to the real favicon glyph, not a colored square |
| Section pages | Events (only) | Events · **Products · Media · Forms · Brand** |
| Design tokens | Ad-hoc | Shared `--control-h: 40px`, `.ins-select` primitive with custom chevron, global `:focus-visible` |
| Typography | Buttons/tabs/nav used IBM Plex Mono uppercase (against brand guide) | Swept to Inter for all UI chrome; Plex Mono only on numeric KPIs, data-table headers, `.ins-label` micro-caps |
| Empty states | Per-page bespoke | Shared `EmptyState` primitive (icon + heading + body + one CTA; upsell link only on Products) |
| Product editor | 3 tabs (Model · Details · Hotspots) | **3-step stepper** with derived state, Continue button, past-step-jumpable |
| Brand tokens | Fixed Lathe orange | Kiosk overrides `--accent`, `--accent-hover`, `--accent-active`, `--on-accent` at boot from `orgs.brand_*` |
| Motion | No reduced-motion guard | `@media (prefers-reduced-motion: reduce)` disables sidebar collapse transition |
| Keyboard | — | `Alt+1..5` jumps between sidebar sections |

---

## 1. Design principles (unchanged from v1.0)

- **The product is the hero (kiosk).** Chrome recedes so the 3D model
  dominates; controls are quiet, docked, and touch-first.
- **Clarity over decoration (dashboard).** A calm, professional B2B tool —
  navigation, actions and filters are visually distinct.
- **One system, two moods.** Kiosk = branded, immersive. Dashboard =
  neutral, dense, light/dark.
- **Touch-first & accessible.** Large tap targets, no hover-only
  interactions, visible focus rings, WCAG AA contrast.

## 2. Two surfaces

| | Kiosk | Dashboard |
|---|---|---|
| Audience | Booth visitors | Exhibitor |
| Mode | Full-screen, immersive, no login | Windowed app, authenticated |
| Nav | Implicit (attract → explore → lead) | Left **sidebar** — Events · Products · Media · Forms · Brand · event detail |
| Fonts | Saira Condensed (display) + **Inter** (body) + IBM Plex Mono (data) | **Inter** (UI) + IBM Plex Mono (figures / labels) |
| Brand | Client's accent hex injected at boot | Client's accent hex applied to buttons, chips, active nav rule |

## 3. Typography

Brand guide unchanged; enforcement tightened in v2.0.

- **Saira Condensed** — display / wordmark / kiosk headlines. Kiosk only.
- **Inter** — **all body & UI text** on both surfaces (weights 400/500/600/700).
- **IBM Plex Mono** — numeric KPIs, data-table headers, `.ins-label`
  small-caps micro-labels, tabular figures **only**.

v2.0 sweep: `.ins-btn`, `.ins-seg button`, `.ins-tab`, `.ins-pill`,
`.ins-badge`, `.ins-input`, `.ins-select`, and the retired top nav all
switched to Inter with letter-spacing 0 (not 0.06–0.18em) and normal case
(not uppercase). The "AI slop" treatment the brand guide warns against is
gone from the dashboard chrome. `grep 'IBM Plex Mono' insights.css` should
land around 18 hits, all on numeric/data/label selectors.

## 4. Color system (dashboard tokens)

Themeable via `data-theme` on `.ins`; light + dark. Semantic tokens
(not raw hex in components):

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#0e1117` | `#eef0f4` | app background |
| `--panel` / `--panel-2` | `#161b24` / `#1b212c` | `#ffffff` / `#f7f8fb` | cards, fields |
| `--edge` / `--edge-2` | white 7% / 12% | `#e6e8ee` / `#d7dae2` | borders |
| `--ink` / `--ink-2` / `--muted` | `#f3f6fb` / `#aab3c2` / `#717c8e` | — | text tiers |
| `--accent` (default) | `#ff7a33` | `#ef5f1c` | primary action + one KPI highlight |
| `--accent-hover` / `--accent-active` | derived (8% / 16% darker) | | button hover / active |
| `--on-accent` | auto (black or white by luminance) | | text on accent |
| `--blue` / `--aqua` / `--good` | data series / positive | | charts, deltas |

**v2.0 — per-tenant brand override.** When an org has set
`orgs.brand_accent_hex`, `kioskBoot.applyBrand()` injects a `<style
id="lathe-brand-overrides">` block that redefines `--accent`,
`--accent-hover`, `--accent-active`, `--on-accent`, and `--accent-text` on
both `:root` and `[data-theme]`. Neutrals stay Lathe's — only the accent is
customer-branded.

## 5. Kiosk information architecture & screens

Flow unchanged from v1.0: **Attract (catalog) → Explore → Lead capture**.

- **Attract screen** — swipeable product catalog.
- **Explore** — full-screen `<model-viewer>`, hotspot dots → feature cards,
  overview panel, media gallery (now supports `image`), viewer dock,
  product switcher, "Leave your details" pill.
- **Lead capture** — short single-screen form. In v2.0 the form renders
  dynamically:
  - System fields (Name, Email, Consent) always present.
  - Custom questions from `getRuntimeForm()`, if the org has picked a form
    for the event or set a default. Single-select uses the same pill-button
    primitives already in `LeadCapture`.
  - Email validation on-blur with an inline hint if the format doesn't
    parse, matching the server's `z.string().email()` gate.
- Idle timeout unchanged.

## 6. Dashboard information architecture

**Two-column shell** replaces v1.0's top bar. `.ins-shell` is a
`grid-template-columns: auto 1fr` with the sidebar in the first column and
the routed page in `<main class="ins-main"><div class="ins-wrap">`.

### 6.1 Sidebar (`app/src/dashboard/Sidebar.tsx`)

- **Widths**: 232 px expanded / 60 px collapsed. Choice persisted in
  `localStorage['lathe-sidebar-collapsed']`.
- **Brand mark**: Lathe wordmark (`lathe-wordmark-{ink,light}.svg`) at
  30 px, **left-aligned to the icon column** (same 12 px inset as the nav
  icons). Collapsed state shows the real Lathe favicon glyph
  (`lathe-favicon-l.svg`); dark theme adds `filter: invert(1)`.
- **Sections**: Events · Products · Media · Forms · Brand. Inline SVG icons
  (no font dependency). The Brand icon is a palette (not a circle) so it
  doesn't read as a "no entry" sign.
- **Active state**: light `var(--panel-2)` background + a 2 px
  `var(--accent)` left rule; label goes 600 weight.
- **Footer**: user email avatar-initial + email · Sign out · theme toggle ·
  collapse chevron. All icon-buttons at 44 × 44 hit area (P2-critical touch
  target).
- **Keyboard**: `Alt+1..5` jumps between sections (ignored while typing in
  an input).
- **Mobile** (< 720 px): sidebar becomes an off-canvas drawer with a
  hamburger toggle floating at top-left; scrim closes it; picking a section
  closes it.

### 6.2 Events (from v1.0, extended)

- Events home — cards per event (name, dates, leads/sessions, Open).
- **New event modal** — extended with product multi-select (cap 5, warn > 3)
  and form picker.
- Event detail — breadcrumb, Open kiosk ↗, tab bar with Insights and
  Tablets (unchanged from v1.0).

### 6.3 Products

- **List**: cards showing **Hotspots · Media · Events** counts (v2.0
  event-manager-relevant metrics; the old MB / triangle stats moved into
  the editor).
- **Empty state**: EmptyState primitive with "Upload your first 3D model"
  CTA + "Don't have a 3D model yet? We can build one →" upsell to
  `mailto:inquiries@meetlathe.com`.
- **Editor** (`#/products/:id` or `#/products/new`): **3-step stepper**
  Model → Details → Hotspots. 32 px circles, 2 px connecting rules that
  darken as steps complete, active circle filled with accent, completed
  shows a checkmark. Continue button at bottom-right per step (disabled
  until requirement met). Step 3 gets a "Save without hotspots" secondary.
  Past steps clickable in edit mode.
  - Model step surfaces a small mono caption under the preview:
    `X MB · Y triangles · recommended under 25 MB / 30k triangles`.

### 6.4 Media

Grid + upload. Format guidance surfaced via
`describeRules('media')`. Filter by product.

### 6.5 Forms

- List with a **pinned Default form (built-in)** card at the top showing
  the four collected system fields (Name · Email · Area of interest ·
  Consent). One top-right "New form" CTA — the duplicate empty-state
  button removed.
- **Editor** — form name, "Use as default" toggle, up-to-5 custom
  questions. Types: `short_text`, `single_select` (Email removed as a new
  option; existing rows still render as "Email (legacy)" so users can spot
  and swap them).
- **Right-column kiosk preview** — approximate render of what visitors
  will see (light panel, pill options), live-updated as the author edits,
  respects the runtime brand accent.

### 6.6 Brand

- Two side-by-side panels: **Accent color** and **Logo**.
- Hex color picker (`<input type="color">` swatch aligned on the shared
  `--control-h` token) + text input. Both fill row height.
- Panels visually equal-height regardless of contrast warning — root-cause
  fix in v1.9 was to scope the `.ins-panel + .ins-panel { margin-top: 14px }`
  rule out of `.ins-brand-grid` (grid `gap` already handles both dimensions).
- Contrast warning is one compact line with a ⚠ glyph if the auto-picked
  on-accent falls below WCAG AA 4.5:1.
- Preview: pill button styled with the current tokens so the customer sees
  live how their kiosk will read.
- Logo uploader: SVG / PNG / JPG / WebP ≤ 5 MB.

## 7. Component & interaction standards

- **Buttons** — Inter 500/600 at 13 px, `.ins-btn` (default) / `.primary` /
  `.ghost`. No monospace, no uppercase.
- **Select** — shared `.ins-select` primitive: `appearance: none`,
  custom SVG chevron at 12 px inset, `padding-right: 34 px` so the value
  never touches the arrow.
- **Inputs** — `.ins-input` at `--control-h: 40 px` for text; textareas
  auto-size. Focus outline: `2 px solid var(--accent)`, `outline-offset:
  2 px`, applied globally via `:focus-visible` inside `.ins`.
- **Chips / pills** — Inter, no uppercase. `.ins-picker-chip` for
  multi-select; `.ins-badge` for tags; `.ins-pill` for status.
- **Panels** — `.ins-panel` is a flex column so children can `flex: 1`
  when needed (used by Brand's dropzone).
- **Empty states** — the shared `EmptyState` primitive: icon (40 px muted)
  · heading (22 px, weight 700) · body (14 px, muted) · one primary CTA ·
  optional upsell link. Upsell is used only on Products (revenue driver);
  everywhere else, one CTA per screen.
- **Stepper** — 32 px circles; active fills accent; done shows check;
  connecting rules darken; disabled steps use `var(--muted)`.
- **Modals** — shared scrim + panel (New event, QR popup).
- **Charts** (`charts.tsx`) — unchanged from v1.0: accessible categorical
  colors, legends/labels, tabular figures.
- **Motion** — 120–300 ms transitions on hover/focus/tab; sidebar collapse
  animates `width` (short enough not to jank); killed entirely under
  `prefers-reduced-motion`.

## 8. Accessibility

- Every interactive control has a visible focus outline via the global
  `:focus-visible` rule.
- Sidebar icon-buttons meet the 44 × 44 minimum touch target.
- Every decorative SVG in Sidebar / BrandPage / ProductEditor is
  `aria-hidden="true"`.
- Section nav has `aria-current="page"` on the active link.
- `prefers-reduced-motion: reduce` disables the sidebar collapse
  transition.
- Contrast warning on Brand page catches customer choices that would fail
  WCAG AA before they save.

## 9. Responsive behavior

- Kiosk: full-screen tablet-first (portrait/landscape). Unchanged.
- Dashboard:
  - **≥ 720 px** — sidebar column visible; main column auto-scrolls.
  - **< 720 px** — sidebar collapses to an off-canvas drawer. Hamburger
    toggle floats at top-left of the main content area.
- Forms editor collapses its right-column kiosk preview under the builder
  below 900 px.
- Product editor's Hotspots step collapses its picker sidebar under the
  viewer below 900 px.
- Media grid uses `auto-fill minmax(220px, 1fr)`.

## 10. Open UI questions

- Portrait vs. landscape default per pilot mount (unchanged from v1.0).
- Whether the sidebar should stay collapsed by default on second-visit
  desktop (measure via preference persistence).
- Onboarding checklist placement in Phase 2 — a dismissible top-of-page
  card on Events home vs. its own `#/onboarding` route.
- QR-to-phone lead capture visual language on the kiosk (Phase 2).
