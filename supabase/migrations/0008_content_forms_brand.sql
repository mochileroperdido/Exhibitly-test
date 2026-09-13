-- Lathe — self-serve dashboard: products/media/hotspots go live, add show→product
-- join, form builder tables, per-org brand, and per-show form selection.
-- Idempotent. Apply after 0007.
--
-- The content tables were created empty in 0001 and never used, so we can
-- reshape them freely here without a data migration.

-- ── Products become org-scoped (were show-scoped, unused). ─────────────────
alter table products drop column if exists show_id;
alter table products add column if not exists model_bytes bigint;
alter table products add column if not exists triangle_count int;
alter table products add column if not exists updated_at timestamptz not null default now();

-- The kiosk needs a stable slug per product (used as events.product_key so
-- analytics survive a rename). Auto-populate from the id on insert.
alter table products add column if not exists slug text;
create unique index if not exists products_org_slug_idx on products (org_id, slug);

-- ── show_products: many products per show, capped at the app layer (5). ────
create table if not exists show_products (
  show_id     uuid not null references shows(id) on delete cascade,
  product_id  uuid not null references products(id) on delete cascade,
  sort_order  int not null default 0,
  primary key (show_id, product_id)
);
create index if not exists show_products_show_idx on show_products (show_id, sort_order);
alter table show_products enable row level security;

-- ── Forms ──────────────────────────────────────────────────────────────────
create table if not exists forms (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  name        text not null,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- At most one default form per org.
create unique index if not exists forms_one_default_per_org
  on forms (org_id) where is_default;
alter table forms enable row level security;

create table if not exists form_fields (
  id          uuid primary key default gen_random_uuid(),
  form_id     uuid not null references forms(id) on delete cascade,
  sort_order  int not null default 0,
  kind        text not null check (kind in ('short_text','email','single_select')),
  label       text not null,
  required    boolean not null default false,
  options     jsonb not null default '[]'::jsonb   -- string[] for single_select
);
create index if not exists form_fields_form_idx on form_fields (form_id, sort_order);
alter table form_fields enable row level security;

-- ── shows.form_id: which form this event's kiosks should render. ───────────
alter table shows add column if not exists form_id uuid references forms(id) on delete set null;

-- ── orgs: per-tenant brand accent + logo. ──────────────────────────────────
alter table orgs add column if not exists brand_accent_hex text;   -- e.g. '#ef5f1c'
alter table orgs add column if not exists brand_logo_url   text;   -- storage path or URL

-- ── leads.answers: dynamic-form responses (schema is form_fields at submit). ─
alter table leads add column if not exists answers jsonb not null default '{}'::jsonb;

-- ── Grants (Data API base privileges; RLS still gates rows). ───────────────
grant select, insert, update, delete on products      to authenticated;
grant select, insert, update, delete on media         to authenticated;
grant select, insert, update, delete on hotspots      to authenticated;
grant select, insert, update, delete on show_products to authenticated;
grant select, insert, update, delete on forms         to authenticated;
grant select, insert, update, delete on form_fields   to authenticated;
grant update on orgs to authenticated;      -- brand fields (RLS restricts to member's own org)
grant update on shows to authenticated;     -- shows.form_id + edits

-- ── RLS policies ───────────────────────────────────────────────────────────
-- Products: full CRUD scoped to org membership. Read already exists (0001).
drop policy if exists products_insert on products;
create policy products_insert on products for insert to authenticated
  with check (is_org_member(org_id));
drop policy if exists products_update on products;
create policy products_update on products for update to authenticated
  using (is_org_member(org_id)) with check (is_org_member(org_id));
drop policy if exists products_delete on products;
create policy products_delete on products for delete to authenticated
  using (is_org_member(org_id));

-- Media / hotspots: authorize via the parent product's org.
drop policy if exists media_write on media;
create policy media_write on media for all to authenticated
  using (exists (select 1 from products p where p.id = media.product_id and is_org_member(p.org_id)))
  with check (exists (select 1 from products p where p.id = media.product_id and is_org_member(p.org_id)));

drop policy if exists hotspots_write on hotspots;
create policy hotspots_write on hotspots for all to authenticated
  using (exists (select 1 from products p where p.id = hotspots.product_id and is_org_member(p.org_id)))
  with check (exists (select 1 from products p where p.id = hotspots.product_id and is_org_member(p.org_id)));

-- show_products: authorize via the show's org.
drop policy if exists show_products_read on show_products;
create policy show_products_read on show_products for select
  using (exists (select 1 from shows s where s.id = show_products.show_id and is_org_member(s.org_id)));
drop policy if exists show_products_write on show_products;
create policy show_products_write on show_products for all to authenticated
  using (exists (select 1 from shows s where s.id = show_products.show_id and is_org_member(s.org_id)))
  with check (
    exists (select 1 from shows s where s.id = show_products.show_id and is_org_member(s.org_id))
    and exists (select 1 from products p where p.id = show_products.product_id and is_org_member(p.org_id))
  );

-- Forms + fields: org-scoped.
drop policy if exists forms_read on forms;
create policy forms_read on forms for select using (is_org_member(org_id));
drop policy if exists forms_write on forms;
create policy forms_write on forms for all to authenticated
  using (is_org_member(org_id)) with check (is_org_member(org_id));

drop policy if exists form_fields_read on form_fields;
create policy form_fields_read on form_fields for select
  using (exists (select 1 from forms f where f.id = form_fields.form_id and is_org_member(f.org_id)));
drop policy if exists form_fields_write on form_fields;
create policy form_fields_write on form_fields for all to authenticated
  using (exists (select 1 from forms f where f.id = form_fields.form_id and is_org_member(f.org_id)))
  with check (exists (select 1 from forms f where f.id = form_fields.form_id and is_org_member(f.org_id)));

-- Orgs: allow members to update brand columns (RLS + column grant already
-- restrict which rows and which columns can be touched).
drop policy if exists org_update on orgs;
create policy org_update on orgs for update to authenticated
  using (is_org_member(id)) with check (is_org_member(id));

-- Shows: allow members to update form_id etc.
drop policy if exists shows_update on shows;
create policy shows_update on shows for update to authenticated
  using (is_org_member(org_id)) with check (is_org_member(org_id));
