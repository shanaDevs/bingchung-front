'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import OrderModeModal from './OrderModeModal';
export const OPEN_ORDER_MODAL_EVENT = 'bc-open-order-modal';

function isSkippedRoute(pathname: string) {
  return (
    pathname.startsWith('/admin') ||
    pathname === '/account/login' ||
    pathname === '/account/register' ||
    pathname.startsWith('/mock-payment')
  );
}

export default function SiteOrderPrompt() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openHandler = () => setOpen(true);
    window.addEventListener(OPEN_ORDER_MODAL_EVENT, openHandler);
    return () => window.removeEventListener(OPEN_ORDER_MODAL_EVENT, openHandler);
  }, []);

  // Modal opens only when user taps "Order Now" / menu prompts — not on page load
  if (isSkippedRoute(pathname)) return null;

  return (
    <OrderModeModal
      isOpen={open}
      onClose={() => setOpen(false)}
    />
  );
}

export function openOrderModal() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(OPEN_ORDER_MODAL_EVENT));
  }
}
