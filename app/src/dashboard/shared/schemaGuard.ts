// Postgres/PostgREST error codes that mean "the customer hasn't run
// migrations 0008/0009 yet". We surface these as empty-state instead of
// a spinner-forever or a red error, and log a single console line per
// module so a developer can see it in devtools without a visible banner.
//
// Codes:
//   42P01 — undefined_table  (e.g. `forms` doesn't exist yet → PostgREST 404)
//   42703 — undefined_column (e.g. `orgs.brand_accent_hex` → PostgREST 400)
//   PGRST … — some PostgREST shape errors also come back with a `code`
//             starting with `PGRST` when a table/view is missing.
//
// Storage errors (403) on a bucket that hasn't been created / policies
// missing are shape-tolerant so we match on message content there.

const LOGGED = new Set<string>();

interface PgLike {
  code?: string;
  message?: string;
  status?: number;
  statusCode?: number | string;
}

export function isMissingSchema(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as PgLike;
  const code = String(e.code ?? '');
  if (code === '42P01' || code === '42703') return true;
  if (code.startsWith('PGRST') && /table|column|schema/i.test(e.message ?? '')) return true;
  const status = Number(e.status ?? e.statusCode ?? 0);
  // Storage bucket missing / no policy match.
  if (status === 400 && /column|does not exist/i.test(e.message ?? '')) return true;
  if (status === 404 && /table|not found/i.test(e.message ?? '')) return true;
  return false;
}

/** Wraps a loader so a missing-schema error resolves to `fallback` and logs
 *  exactly once per `moduleKey` per page load. Any other error re-throws. */
export async function loadWithSchemaGuard<T>(
  moduleKey: string,
  loader: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await loader();
  } catch (err) {
    if (isMissingSchema(err)) {
      if (!LOGGED.has(moduleKey)) {
        LOGGED.add(moduleKey);
        // eslint-disable-next-line no-console
        console.warn(
          `[dashboard] ${moduleKey}: migration 0008/0009 not applied — see docs/SETUP.md ("Self-serve dashboard — Products, Media, Forms, Brand")`,
        );
      }
      return fallback;
    }
    throw err;
  }
}
