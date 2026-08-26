# Lathe — External setup checklist (founder actions)

These are the accounts and settings **you** create outside the codebase so the
PII/analytics backend can be wired up in the next PR. Nothing here blocks the
current Vercel preview — the app runs fully as a local demo with none of it. Do
them in roughly this order; each is free at pilot scale.

Legend: 🟢 do now to unblock the backend · 🟡 before the live show · ⚪ nice to have.

---

## 1. Domain — meetlathe.com 🟢

1. Register **meetlathe.com** at Cloudflare Registrar (at-cost), Namecheap, or
   Porkbun. (Google Domains no longer exists — it was sold to Squarespace.)
2. Register **meetlathe.app** defensively (`.app` is HSTS-preloaded → always
   HTTPS; good for the kiosk origin and brand protection). `.io`/`.co` optional.
3. Put DNS on **Cloudflare** (free plan) even if registered elsewhere — you'll
   use it for subdomains, email routing, and proxy/WAF.
4. Plan these subdomains (create the records when each service is ready):
   - `meetlathe.com` / `www` → marketing
   - `app.meetlathe.com` → **dashboard (auth)** — separate origin
   - `kiosk.meetlathe.com` → **kiosk PWA** (no login) — separate origin
   - `api.meetlathe.com` → ingestion/content API (EU)

> Why two origins: a shared booth tablet must never be able to reach dashboard
> login/session. Kiosk and dashboard live on different hostnames, cookies are
> host-only on `app.`, and the kiosk writes only via a scoped API key.

## 2. Supabase (database + auth + storage), EU region 🟢

1. Create a Supabase account → **New project**.
2. **Region: EU (Frankfurt `eu-central-1`)** — required for GDPR data residency.
   You cannot change region later, so get this right.
3. Set a strong DB password; save it in your password manager.
4. From **Project Settings → API**, copy and store securely:
   - `Project URL` (e.g. `https://xxxx.supabase.co`)
   - `anon` public key (browser-safe, used by the dashboard)
   - `service_role` secret key — **server-only, never in the browser bundle or
     git**. This goes only in server env vars.
5. Leave the schema empty for now — the reference migration
   (`supabase/migrations/0001_init.sql`) is applied in the backend PR.
6. **Storage:** a `models` bucket for `.glb` files gets created in that PR too;
   no action needed yet.

## 3. Vercel configuration 🟢

The current app is a static Vite SPA in `app/`.

1. In the Vercel project → **Settings → General → Root Directory = `app`**.
   (Keeps Vercel building only the front-end; the reference `api/` and
   `supabase/` folders at the repo root are intentionally **not** built yet.)
2. **Build & Output**: Framework preset **Vite**, build `npm run build`, output
   `dist` (auto-detected).
3. **Settings → Environment Variables** — for the preview you can leave the
   `VITE_*` vars unset (app stays in local demo mode). When the backend is live,
   set (see `app/.env.example`):
   - `VITE_API_URL = https://api.meetlathe.com`
   - `VITE_KIOSK_KEY = <scoped ingest-only kiosk key>`
   - `VITE_PRIVACY_URL = <exhibitor per-show privacy URL>`
   - Server-only (for the API functions, added in the backend PR — **not**
     `VITE_`-prefixed): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
4. **Region:** set serverless function region to an EU region (e.g. `fra1`) when
   the API functions are added, to keep processing in the EU.
5. **Deploy protection:** keep preview deployments behind Vercel's default
   protection until the security headers are verified.

> Commercial note: Vercel **Hobby is non-commercial**. Fine for the pilot/preview;
> move to **Pro ($20/mo)** once you're charging a customer. Cloudflare Pages is a
> free, commercial-OK alternative if you prefer.

## 4. Transactional email — Resend 🟡

1. Create a **Resend** account (free tier).
2. Add and **verify `meetlathe.com`** (SPF/DKIM DNS records via Cloudflare).
3. Create an API key → store as server env `RESEND_API_KEY` (used by the API to
   email lead confirmations / exec reports later).

## 5. Mailbox email (@meetlathe.com) 🟡

Pick one:

- **Cloudflare Email Routing** (free) — forward `hello@meetlathe.com` to your
  inbox. Simplest for a pilot.
- **Zoho Mail** (free/cheap) — real mailboxes if you want to send from the address.
- Google Workspace (~$6/user/mo) — defer until there's revenue.

## 6. Monitoring — Sentry ⚪

Create a **Sentry** account (free), one project for the front-end and (later) one
for the API. Store the DSN as env vars in the backend PR.

## 7. Legal / GDPR groundwork 🟡

You are the **processor**; each exhibitor is the **controller** of their leads.

- Draft a short **privacy notice** hosted at `meetlathe.com/privacy` (the lead
  form's consent link points here; override per-show with `VITE_PRIVACY_URL`).
- Prepare a **Data Processing Agreement (DPA)** template to sign with each
  exhibitor, listing sub-processors (Supabase, Vercel/Cloudflare, Resend).
- Decide a **retention period** (e.g. delete leads N days after the show).

---

## What happens after you've done the 🟢 items

Ping me with:

1. **Supabase**: Project URL + `anon` key (the `service_role` key stays with you /
   goes straight into Vercel server env — don't paste it in chat).
2. Confirmation the **Vercel Root Directory = `app`** and the domain/subdomains
   exist.

Then the backend PR wires it up: apply `0001_init.sql`, deploy the `api/`
functions (EU), flip `VITE_API_URL`/`VITE_KIOSK_KEY` on, add dashboard auth, and
seed the first product's hotspots via the existing script.
