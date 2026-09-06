-- Lathe — dashboard v2: grants, per-tablet kiosk tokens, and write policies.
-- Run after 0001 + 0002. Idempotent.

-- 1. Grants. "Automatically expose new tables" was off, so the authenticated
--    role never got base privileges on our SQL-created tables. RLS still gates
--    the rows; these grants just let the Data API reach the tables at all.
grant select on events, leads, shows, kiosks to authenticated;
grant insert on shows, kiosks to authenticated;   -- dashboard creates shows/tablets
grant update on kiosks to authenticated;           -- activate / revoke a tablet

-- 2. Per-tablet token. key_hash = sha256(token) keeps the existing API auth
--    unchanged; token (plaintext) lets the dashboard show/copy the link.
alter table kiosks add column if not exists token text;
create unique index if not exists kiosks_token_idx on kiosks(token);

-- 3. Write policies (reads already covered by the *_read policies from 0001).
--    is_org_member is SECURITY DEFINER, so it needs no extra grants.
drop policy if exists shows_insert on shows;
create policy shows_insert on shows for insert to authenticated
  with check (is_org_member(org_id));

drop policy if exists kiosks_insert on kiosks;
create policy kiosks_insert on kiosks for insert to authenticated
  with check (is_org_member(org_id));

drop policy if exists kiosks_update on kiosks;
create policy kiosks_update on kiosks for update to authenticated
  using (is_org_member(org_id)) with check (is_org_member(org_id));
