import type { Order, PaymentMethod } from '@/types';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CARD: 'Card',
  PAYHERE: 'PayHere Online',
  CASH_ON_DELIVERY: 'Cash on Delivery',
  CASH_AT_COUNTER: 'Cash at Counter',
  LOYALTY_POINTS: 'Loyalty Points',
};

export function formatReceiptDate(iso: string): string {
  return new Date(iso).toLocaleString('en-LK', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatMoney(amount: number): string {
  return `LKR ${amount.toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

const SUGAR_LABELS: Record<string, string> = {
  ZERO: '0% Sugar',
  TWENTY_FIVE: '25% Sugar',
  FIFTY: '50% Sugar',
  SEVENTY_FIVE: '75% Sugar',
  HUNDRED: '100% Sugar',
};

const ICE_LABELS: Record<string, string> = {
  NO_ICE: 'No Ice',
  LESS_ICE: 'Less Ice',
  REGULAR: 'Regular Ice',
};

function formatSize(size: string): string {
  return size.charAt(0) + size.slice(1).toLowerCase().replace(/_/g, ' ');
}

export function itemOptionLine(item: Order['items'][0]): string {
  const parts = [
    formatSize(item.size),
    SUGAR_LABELS[item.sugarLevel] ?? item.sugarLevel,
    ICE_LABELS[item.iceLevel] ?? item.iceLevel,
  ].filter(Boolean);
  return parts.join(' · ');
}

export function customerLabel(order: Order): string | null {
  if (order.guestName) return order.guestName;
  return null;
}

export function customerPhone(order: Order): string | null {
  return order.guestPhone ?? null;
}

const ONLINE_METHODS = ['PAYHERE', 'CARD'] as const;

export function isOrderPaid(order: Pick<Order, 'paymentStatus' | 'paymentMethod'>): boolean {
  return order.paymentStatus === 'PAID';
}

export function getPaymentStatusLabel(
  order: Pick<Order, 'paymentStatus' | 'paymentMethod'>
): string {
  if (isOrderPaid(order)) return '✓ Paid';
  if (order.paymentStatus === 'FAILED') return 'Payment failed';
  if (ONLINE_METHODS.includes(order.paymentMethod as (typeof ONLINE_METHODS)[number])) {
    return 'Pending payment';
  }
  if (order.paymentMethod === 'CASH_ON_DELIVERY') return 'Pay on delivery';
  if (order.paymentMethod === 'CASH_AT_COUNTER') return 'Pay at counter';
  if (order.paymentMethod === 'LOYALTY_POINTS') return '✓ Paid (points)';
  return order.paymentStatus;
}
