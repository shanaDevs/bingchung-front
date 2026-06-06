import { CheckCircle, Package, Bike, Star } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { OrderStatus } from '@/types';

export const ORDER_STATUSES: OrderStatus[] = [
  'RECEIVED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  RECEIVED: 'Order Received',
  PREPARING: 'Preparing',
  READY: 'Ready',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export const STATUS_COLORS: Record<OrderStatus, string> = {
  RECEIVED: 'text-blue-400',
  PREPARING: 'text-yellow-400',
  READY: 'text-green-400',
  OUT_FOR_DELIVERY: 'text-orange-400',
  DELIVERED: 'text-green-400',
  CANCELLED: 'text-red-400',
};

export interface TrackingStep {
  status: OrderStatus;
  label: string;
  icon: LucideIcon;
  desc: string;
}

/** Full delivery flow — all 5 progress statuses before delivered */
export const DELIVERY_STEPS: TrackingStep[] = [
  { status: 'RECEIVED', label: 'Order Received', icon: CheckCircle, desc: 'We got your order!' },
  { status: 'PREPARING', label: 'Preparing', icon: Package, desc: 'Crafting your drinks with love' },
  { status: 'READY', label: 'Order Ready', icon: CheckCircle, desc: 'Packed and ready to go' },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Bike, desc: 'On the way to you' },
  { status: 'DELIVERED', label: 'Delivered', icon: Star, desc: 'Enjoy your order!' },
];

/** Takeaway flow — ends at ready for pickup */
export const TAKEAWAY_STEPS: TrackingStep[] = [
  { status: 'RECEIVED', label: 'Order Received', icon: CheckCircle, desc: 'We got your order!' },
  { status: 'PREPARING', label: 'Preparing', icon: Package, desc: 'Crafting your drinks with love' },
  { status: 'READY', label: 'Ready for Pickup', icon: Star, desc: 'Come collect your order!' },
];

const GLOBAL_STATUS_ORDER: OrderStatus[] = [
  'RECEIVED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

export function getTrackingSteps(isDelivery: boolean): TrackingStep[] {
  return isDelivery ? DELIVERY_STEPS : TAKEAWAY_STEPS;
}

export function getTrackingStepIndex(steps: TrackingStep[], status: OrderStatus): number {
  if (status === 'CANCELLED') return -1;

  const direct = steps.findIndex((s) => s.status === status);
  if (direct >= 0) return direct;

  const globalIdx = GLOBAL_STATUS_ORDER.indexOf(status);
  if (globalIdx < 0) return 0;

  for (let i = steps.length - 1; i >= 0; i--) {
    const stepIdx = GLOBAL_STATUS_ORDER.indexOf(steps[i].status);
    if (stepIdx >= 0 && stepIdx <= globalIdx) return i;
  }

  return 0;
}

export function isTrackingComplete(status: OrderStatus, isDelivery: boolean): boolean {
  if (status === 'CANCELLED') return false;
  return isDelivery ? status === 'DELIVERED' : status === 'READY' || status === 'DELIVERED';
}

/** True when status just reached the final happy state for this order mode */
export function isNewCompletionStatus(
  newStatus: OrderStatus,
  prevStatus: OrderStatus,
  isDelivery: boolean
): boolean {
  if (newStatus === prevStatus || newStatus === 'CANCELLED') return false;
  return isDelivery ? newStatus === 'DELIVERED' : newStatus === 'READY';
}

export function getStatusLabel(status: OrderStatus, orderMode?: 'DELIVERY' | 'TAKEAWAY'): string {
  if (status === 'READY' && orderMode === 'TAKEAWAY') return 'Ready for Pickup';
  if (status === 'READY' && orderMode === 'DELIVERY') return 'Order Ready';
  return STATUS_LABELS[status];
}
