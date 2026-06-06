/** Session flag set after checkout; consumed on track/order page */
export const ORDER_CELEBRATION_STORAGE_KEY = 'bc-order-celebration';

export function markOrderForCelebration(orderNumber: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(ORDER_CELEBRATION_STORAGE_KEY, orderNumber);
  } catch {
    /* ignore */
  }
}

export function consumeOrderCelebrationFlag(orderNumber: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = sessionStorage.getItem(ORDER_CELEBRATION_STORAGE_KEY);
    if (stored === orderNumber) {
      sessionStorage.removeItem(ORDER_CELEBRATION_STORAGE_KEY);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}
