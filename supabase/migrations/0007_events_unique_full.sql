-- Fix: PostgREST/Supabase upsert with `onConflict: 'kiosk_id,client_id'`
-- (see api/events.ts) requires a NON-partial unique constraint on those
-- columns. Migration 0005 created a partial index gated on
-- `client_id IS NOT NULL`, which Postgres will not consider for a bare
-- `ON CONFLICT (kiosk_id, client_id)` clause — so every /api/events call
-- returned 500 { detail: "there is no unique or exclusion constraint
-- matching the ON CONFLICT specification" } once 0005 landed.
--
-- Recreate the index without the WHERE clause. Postgres treats NULL as
-- distinct in unique indexes by default, so the pre-0005 rows (client_id
-- IS NULL) still coexist; new rows always have client_id and get proper
-- uniqueness enforcement, which the code's ignoreDuplicates upsert
-- depends on for retry-safety.

drop index if exists events_kiosk_client_id_uniq;

create unique index if not exists events_kiosk_client_id_uniq
  on events (kiosk_id, client_id);
