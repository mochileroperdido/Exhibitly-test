-- Lathe — grant the authenticated role read access to the tenancy tables the
-- dashboard needs to resolve the user's org (shows.myOrgId reads org_members).
-- 0003 missed these because "auto-expose new tables" is off. RLS still gates
-- rows (member_read / org_read). Idempotent.
grant select on org_members, orgs to authenticated;
