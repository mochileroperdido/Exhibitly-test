-- Lathe — core schema + Row Level Security (pilot).
--
-- Apply in the Supabase SQL Editor (or `supabase db push`), then run
-- 0002_seed_pilot.sql. See docs/SETUP.md.
--
-- Design for the pilot:
--   * Every table is org-scoped and protected by RLS.
--   * The dashboard (authenticated user) reads its org's rows via Auth + RLS.
--   * The kiosk NEVER connects to the DB. It writes leads/events only through the
--     serverless API, which uses the service_role key. No policy grants
--     anon/authenticated INSERT on events/leads — those come only from the
--     service role, which bypasses RLS.
--   * Content (products/models/hotspots) still lives in the app for now, so
--     events/leads carry product_key / client_session_id as TEXT rather than FKs.
--     The products/media/hotspots tables below are created for the future content
--     move and are unused this release.

create extension if not exists "pgcrypto";

-- ── Tenancy ────────────────────────────────────────────────────────────────
create table if not exists orgs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- Maps a Supabase auth user to an org (their dashboard tenant).
create table if not exists org_members (
  org_id   uuid not null references orgs(id) on delete cascade,
  user_id  uuid not null references auth.users(id) on delete cascade,
  role     text not null default 'member' check (role in ('owner', 'member')),
  primary key (org_id, user_id)
);

create table if not exists shows (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  name        text not null,
  starts_on   date,
  ends_on     date,
  privacy_url text,
  created_at  timestamptz not null default now()
);

-- A physical kiosk/tablet. Its ingest key is a scoped, hashed credential — the
-- API looks up the kiosk by sha256(X-Kiosk-Key).
create table if not exists kiosks (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references orgs(id) on delete cascade,
  show_id       uuid not null references shows(id) on delete cascade,
  label         text not null,
  key_hash      text not null unique,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ── Anonymous analytics (write-only from the kiosk via the API) ────────────
create table if not exists events (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references orgs(id) on delete cascade,
  show_id           uuid not null references shows(id) on delete cascade,
  kiosk_id          uuid references kiosks(id) on delete set null,
  client_session_id text not null,
  product_key       text,
  type              text not null,   -- session_start|product_view|hotspot_open|video_play|session_end
  payload           jsonb not null default '{}'::jsonb,
  ts                timestamptz not null default now()
);

-- ── Leads (PII + consent) ──────────────────────────────────────────────────
create table if not exists leads (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references orgs(id) on delete cascade,
  show_id           uuid not null references shows(id) on delete cascade,
  kiosk_id          uuid references kiosks(id) on delete set null,
  client_session_id text,
  product_key       text,
  name              text not null,
  email             text not null,
  interest          text,
  explored          jsonb not null default '[]'::jsonb,
  consent_given     boolean not null,
  consent_text      text not null,
  consent_version   text not null,
  captured_at       timestamptz not null default now()
);

create index if not exists events_org_ts_idx on events (org_id, ts);
create index if not exists leads_org_captured_idx on leads (org_id, captured_at);
create index if not exists leads_email_idx on leads (lower(email));  -- delete/export-by-email (GDPR)

-- ── Future content tables (created now, unused this release) ───────────────
create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  show_id     uuid references shows(id) on delete set null,
  label       text not null,
  subtitle    text,
  tagline     text,
  overview    text,
  specs       jsonb not null default '[]'::jsonb,
  model_url   text not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create table if not exists media (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  type        text not null default 'video' check (type in ('video', 'image')),
  src         text not null,
  title       text not null,
  sort_order  int not null default 0
);
create table if not exists hotspots (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references products(id) on delete cascade,
  slug         text not null,
  title        text not null,
  description  text not null,
  position     text not null,
  normal       text not null,
  sort_order   int not null default 0
);

-- ── Row Level Security ─────────────────────────────────────────────────────
-- Enable on every table; dashboard (authenticated) reads its own org only.
-- Writes to events/leads are service-role only (no policy = denied for
-- anon/authenticated; service_role bypasses RLS).

alter table orgs        enable row level security;
alter table org_members enable row level security;
alter table shows       enable row level security;
alter table kiosks      enable row level security;
alter table events      enable row level security;
alter table leads       enable row level security;
alter table products    enable row level security;
alter table media       enable row level security;
alter table hotspots    enable row level security;

-- Helper: is the current auth user a member of :org?
create or replace function is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from org_members m
    where m.org_id = target_org and m.user_id = auth.uid()
  );
$$;

drop policy if exists org_read on orgs;
create policy org_read on orgs for select using (is_org_member(id));

drop policy if exists member_read on org_members;
create policy member_read on org_members for select using (user_id = auth.uid());

drop policy if exists shows_read on shows;
create policy shows_read on shows for select using (is_org_member(org_id));

drop policy if exists kiosks_read on kiosks;
create policy kiosks_read on kiosks for select using (is_org_member(org_id));

drop policy if exists events_read on events;
create policy events_read on events for select using (is_org_member(org_id));

drop policy if exists leads_read on leads;
create policy leads_read on leads for select using (is_org_member(org_id));

drop policy if exists products_read on products;
create policy products_read on products for select using (is_org_member(org_id));

drop policy if exists media_read on media;
create policy media_read on media for select using (
  exists (select 1 from products p where p.id = media.product_id and is_org_member(p.org_id))
);

drop policy if exists hotspots_read on hotspots;
create policy hotspots_read on hotspots for select using (
  exists (select 1 from products p where p.id = hotspots.product_id and is_org_member(p.org_id))
);

-- Retention (GDPR): run on a schedule (pg_cron / edge function) to purge leads
-- N days after their show ends. Example:
--   delete from leads l using shows s
--   where l.show_id = s.id and s.ends_on < current_date - interval '90 days';
