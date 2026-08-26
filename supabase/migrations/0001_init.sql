-- Lathe — reference schema (NOT YET APPLIED)
--
-- This is the target data model for the PII/analytics backend. It is committed
-- for review only; it is applied to Supabase in the backend PR, after the
-- project is provisioned in the EU region (see docs/SETUP.md). The app/ Vercel
-- project does not touch this file.
--
-- Principles:
--   * Every table is scoped by org_id and protected by Row Level Security.
--   * Dashboard users read their org's rows via Supabase Auth + RLS.
--   * The kiosk NEVER connects to the DB directly. It writes leads/events only
--     through the serverless API, which uses the service_role key server-side.
--     No RLS policy grants the anon/authenticated roles INSERT on sessions,
--     events, or leads — those come exclusively from the service role, which
--     bypasses RLS.

create extension if not exists "pgcrypto";

-- ── Tenancy ────────────────────────────────────────────────────────────────
create table orgs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- Maps a Supabase auth user to an org (their dashboard tenant).
create table org_members (
  org_id   uuid not null references orgs(id) on delete cascade,
  user_id  uuid not null references auth.users(id) on delete cascade,
  role     text not null default 'member' check (role in ('owner', 'member')),
  primary key (org_id, user_id)
);

create table shows (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  name        text not null,
  starts_on   date,
  ends_on     date,
  privacy_url text,
  created_at  timestamptz not null default now()
);

-- A physical kiosk/tablet. Its ingest key is a scoped, hashed credential — the
-- API looks up the kiosk by the hash of the X-Kiosk-Key header.
create table kiosks (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references orgs(id) on delete cascade,
  show_id       uuid not null references shows(id) on delete cascade,
  label         text not null,
  key_hash      text not null unique,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ── Content (moved out of data/catalog.ts) ─────────────────────────────────
create table products (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  show_id     uuid references shows(id) on delete set null,
  label       text not null,
  subtitle    text,
  tagline     text,
  overview    text,
  specs       jsonb not null default '[]'::jsonb,   -- [{label,value}]
  model_url   text not null,                        -- Supabase Storage URL
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create table media (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  type        text not null default 'video' check (type in ('video', 'image')),
  src         text not null,
  title       text not null,
  sort_order  int not null default 0
);

create table hotspots (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references products(id) on delete cascade,
  slug         text not null,               -- stable id, e.g. 'chuck'
  title        text not null,
  description  text not null,
  position     text not null,               -- "x y z" (model-viewer)
  normal       text not null,               -- "x y z"
  sort_order   int not null default 0
);

-- ── Anonymous analytics (write-only from the kiosk via the API) ────────────
create table sessions (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  show_id     uuid not null references shows(id) on delete cascade,
  kiosk_id    uuid references kiosks(id) on delete set null,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  duration_ms int
);

create table events (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  session_id  uuid references sessions(id) on delete cascade,
  product_id  uuid references products(id) on delete set null,
  type        text not null,               -- session_start|product_view|hotspot_open|video_play|session_end
  payload     jsonb not null default '{}'::jsonb,
  ts          timestamptz not null default now()
);

-- ── Leads (PII + consent) ──────────────────────────────────────────────────
create table leads (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references orgs(id) on delete cascade,
  show_id          uuid not null references shows(id) on delete cascade,
  session_id       uuid references sessions(id) on delete set null,
  name             text not null,
  email            text not null,
  interest         text,
  explored         jsonb not null default '[]'::jsonb,
  consent_given    boolean not null,
  consent_text     text not null,
  consent_version  text not null,
  captured_at      timestamptz not null default now()
);

create index on events (org_id, ts);
create index on leads  (org_id, captured_at);
create index on leads  (lower(email));   -- delete/export-by-email (GDPR)

-- ── Row Level Security ─────────────────────────────────────────────────────
-- Enable on every table; dashboard (authenticated) reads its own org only.
-- Writes to sessions/events/leads are service-role only (no policy = denied for
-- anon/authenticated; service_role bypasses RLS).

alter table orgs        enable row level security;
alter table org_members enable row level security;
alter table shows       enable row level security;
alter table kiosks      enable row level security;
alter table products    enable row level security;
alter table media       enable row level security;
alter table hotspots    enable row level security;
alter table sessions    enable row level security;
alter table events      enable row level security;
alter table leads       enable row level security;

-- Helper: is the current auth user a member of :org?
create or replace function is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from org_members m
    where m.org_id = target_org and m.user_id = auth.uid()
  );
$$;

create policy org_read   on orgs        for select using (is_org_member(id));
create policy member_read on org_members for select using (user_id = auth.uid());
create policy shows_read  on shows       for select using (is_org_member(org_id));
create policy kiosks_read on kiosks      for select using (is_org_member(org_id));
create policy products_read on products  for select using (is_org_member(org_id));
create policy media_read  on media       for select using (
  exists (select 1 from products p where p.id = media.product_id and is_org_member(p.org_id))
);
create policy hotspots_read on hotspots  for select using (
  exists (select 1 from products p where p.id = hotspots.product_id and is_org_member(p.org_id))
);
create policy sessions_read on sessions  for select using (is_org_member(org_id));
create policy events_read on events      for select using (is_org_member(org_id));
create policy leads_read  on leads       for select using (is_org_member(org_id));

-- Retention: run on a schedule (pg_cron / edge function) to purge leads N days
-- after their show ends. Example (parameterise N per org policy):
--   delete from leads l using shows s
--   where l.show_id = s.id and s.ends_on < current_date - interval '90 days';
