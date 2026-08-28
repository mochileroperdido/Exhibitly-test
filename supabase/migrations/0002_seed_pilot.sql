-- Lathe — pilot seed: one org, one show, one kiosk. Run after 0001_init.sql.
--
-- The kiosk's key_hash below is sha256 of the plaintext kiosk key that goes into
-- Vercel as VITE_KIOSK_KEY (handed over separately — the plaintext is never
-- stored here or in git). Rotate by generating a new key + hash and updating both.
--
-- Idempotent: safe to run more than once.

insert into orgs (id, name)
values ('11111111-1111-1111-1111-111111111111', 'Lathe Pilot')
on conflict (id) do nothing;

insert into shows (id, org_id, name, privacy_url)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Lathe Pilot Show',
  'https://meetlathe.com/privacy'
)
on conflict (id) do nothing;

insert into kiosks (id, org_id, show_id, label, key_hash, active)
values (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Booth tablet 1',
  '2aec34659837e0760bbaec4137f5e97f9471690f12ee7230102068afad0eb482',
  true
)
on conflict (id) do nothing;

-- After your first magic-link login to the dashboard, grant yourself access by
-- linking your auth user to the pilot org (replace the email):
--
--   insert into org_members (org_id, user_id, role)
--   select '11111111-1111-1111-1111-111111111111', id, 'owner'
--   from auth.users where email = 'you@example.com'
--   on conflict do nothing;
