// Resolves the kiosk's identity token at runtime, so a single build can serve
// many tablets. A tablet is set up by opening its unique link
// (kiosk.meetlathe.com/?k=<token>): the token is captured, persisted, and the
// query param is stripped from the URL so it isn't left lying around. On later
// loads the stored token is reused. With no token (and none stored), it falls
// back to the build-time VITE_KIOSK_KEY (the seeded pilot kiosk) — backward
// compatible with the single-tablet setup.
const STORE_KEY = 'lathe-kiosk-key';

function readParamToken(): string | null {
  try {
    const url = new URL(window.location.href);
    const k = url.searchParams.get('k');
    if (!k) return null;
    // Strip ?k from the visible URL without reloading.
    url.searchParams.delete('k');
    window.history.replaceState({}, '', url.toString());
    return k;
  } catch {
    return null;
  }
}

let resolved: string | undefined;
let cameFromLink = false;

export function getKioskKey(): string | undefined {
  if (resolved !== undefined) return resolved || undefined;

  let token: string | null = null;
  try {
    token = readParamToken();
    if (token) {
      localStorage.setItem(STORE_KEY, token);
      cameFromLink = true;
    } else {
      token = localStorage.getItem(STORE_KEY);
    }
  } catch {
    /* storage/URL unavailable — fall through to env */
  }

  resolved = token || (import.meta.env.VITE_KIOSK_KEY as string | undefined) || '';
  return resolved || undefined;
}

/** True when this page load captured a token from `?k=` (a fresh tablet setup). */
export function boundFromLink(): boolean {
  return cameFromLink;
}

/** Wipe the stored tablet identity — used by "Unbind tablet" recovery in the UI. */
export function clearKioskKey(): void {
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
  resolved = undefined;
  cameFromLink = false;
}
