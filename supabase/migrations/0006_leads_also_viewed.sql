-- Multi-product lead reconstruction: a visitor who touched more than one
-- product now records the primary product on `product_key` (as before) and
-- every other product they engaged with as an array of labels in
-- `also_viewed`. Empty for single-product sessions, so existing rows and
-- single-product deployments are unaffected.

alter table leads add column if not exists also_viewed jsonb not null default '[]'::jsonb;
