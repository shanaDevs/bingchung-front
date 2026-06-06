/** Public site origin for order links & QR codes */
export function getSiteOrigin(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

/** Guest-friendly order tracking URL — no login required */
export function getOrderTrackUrl(orderNumber: string): string {
  return `${getSiteOrigin()}/order/${encodeURIComponent(orderNumber)}`;
}
