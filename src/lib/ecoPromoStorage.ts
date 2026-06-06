const STORAGE_KEY = 'bingchun_eco_promo_last_shown';

/** Do not show the eco promo again until this long after it was last shown */
export const ECO_PROMO_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function readLastShownAt(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const ts = Number(raw);
    return Number.isFinite(ts) ? ts : null;
  } catch {
    return null;
  }
}

/** True when the promo has never been shown, or the 24h cooldown has elapsed */
export function shouldShowEcoPromo(): boolean {
  const lastShown = readLastShownAt();
  if (lastShown === null) return true;
  return Date.now() - lastShown >= ECO_PROMO_COOLDOWN_MS;
}

/** Call when the promo is actually displayed (once per cooldown window) */
export function markEcoPromoShown(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    /* private browsing / quota */
  }
}
