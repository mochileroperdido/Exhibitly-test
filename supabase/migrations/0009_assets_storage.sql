-- Lathe — private storage bucket for org-uploaded assets (3D models, media,
-- brand logos). Path convention: {org_id}/{kind}/{filename}, where kind ∈
-- (models, media, brand). Access is gated by org membership on both read
-- and write. Kiosk delivery uses short-lived signed URLs served by the
-- content API — no anon read policy is exposed.
--
-- Idempotent. Apply after 0008.

insert into storage.buckets (id, name, public)
values ('assets', 'assets', false)
on conflict (id) do nothing;

-- Path helper: the first segment of the object name is the owning org.
create or replace function public._assets_org_of(name text)
returns uuid language sql immutable as $$
  select case
    when name is null then null::uuid
    else nullif(split_part(name, '/', 1), '')::uuid
  end;
$$;

drop policy if exists assets_read on storage.objects;
create policy assets_read on storage.objects for select to authenticated
  using (bucket_id = 'assets' and is_org_member(_assets_org_of(name)));

drop policy if exists assets_insert on storage.objects;
create policy assets_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'assets' and is_org_member(_assets_org_of(name)));

drop policy if exists assets_update on storage.objects;
create policy assets_update on storage.objects for update to authenticated
  using (bucket_id = 'assets' and is_org_member(_assets_org_of(name)))
  with check (bucket_id = 'assets' and is_org_member(_assets_org_of(name)));

drop policy if exists assets_delete on storage.objects;
create policy assets_delete on storage.objects for delete to authenticated
  using (bucket_id = 'assets' and is_org_member(_assets_org_of(name)));
