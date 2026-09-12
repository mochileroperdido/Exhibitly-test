-- Make event ingestion idempotent so a lost 2xx response (network reset after
-- the server has already inserted the batch) cannot double-count a session.
--
-- The client mints a stable per-event id in analytics/index.ts (`e<ts>-<seq>`)
-- which is now stored as `events.client_id`. Combined with the tablet
-- (`kiosk_id`), it's a natural unique key: retries carry the same ids, so an
-- upsert with `ignoreDuplicates` is a no-op on a re-post.
--
-- Existing rows have no client_id (NULL) and are left alone. The unique index
-- is partial so old NULL rows don't collide.

alter table events add column if not exists client_id text;

create unique index if not exists events_kiosk_client_id_uniq
  on events (kiosk_id, client_id)
  where client_id is not null;
