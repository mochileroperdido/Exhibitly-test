# Lathe — documentation index

## Current — living docs (v2.0, self-serve dashboard)

These reflect the product as it stands after PR #19 was merged to `main`
on **2026-09-13**. Markdown is the source of truth; update these when
behavior changes.

| Doc | What it covers |
|---|---|
| **`lathe-prd.md`** | Product Requirements Document — audience, functional scope, roadmap |
| **`lathe-srs.md`** | Software Requirements Specification — architecture, schema, APIs |
| **`lathe-ui-design.md`** | UI Design Document — sidebar layout, design tokens, per-tenant brand |

Each opens with a **Changelog vs v1.0** section highlighting exactly what
the self-serve dashboard added (new tables, new API endpoints, sidebar
nav, brand injection, etc.).

See also under `../docs/`:
- `SETUP.md` — founder/ops setup + go-live checklist. Includes the run-order
  for migrations `0008` / `0009` / `0010` under **"Self-serve dashboard —
  Products, Media, Forms, Brand"**.
- `production-migration.md` — the production/migration plan.

## Archived — v1.0 snapshots (as-built pilot)

The frozen state of each doc **immediately before** the self-serve
dashboard shipped. Kept for history so anyone can trace what changed when.
Do not edit these — every future update lands in the v2.0 living docs
above.

| Doc | What it froze |
|---|---|
| `lathe-prd-v1.0.md` | Pilot PRD — events + insights + kiosk with content in code |
| `lathe-srs-v1.0.md` | Pilot SRS — migrations 0001–0007, `insights/` folder, static `data/catalog.ts` |
| `lathe-ui-design-v1.0.md` | Pilot UI — top-bar dashboard nav, fixed Lathe orange brand |

## Superseded — original Exhibly drafts (pre-build)

Kept for history only; product was renamed and rescoped before build. Do
not use as reference for current behavior.

- `exhibly-prd.md.docx` / `.txt`
- `exhibly-srs.md.docx` / `.txt`
- `exhibly-ui-design-document.md.docx` / `.txt`

## Version timeline

```
2025-…  Exhibly drafts       (superseded, pre-build)
2026-09-06  Lathe v1.0         (pilot as-built — events + insights, content in code)
                              ⇓ PR #19: self-serve dashboard
2026-09-13  Lathe v2.0         (Products · Media · Forms · Brand modules, sidebar nav,
                                per-tenant brand, dynamic kiosk content)
2026-…      Lathe v2.1 (planned) — Onboarding checklist + QR-to-phone lead capture
```
