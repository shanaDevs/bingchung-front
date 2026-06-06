'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { markEcoPromoShown, shouldShowEcoPromo } from '@/lib/ecoPromoStorage';

/** How long the promo stays visible before auto-dismiss */
export const ECO_PROMO_DISPLAY_MS = 7000;

/** Homepage: wait for loading screen (~1800ms) + short buffer */
const HOME_OPEN_DELAY_MS = 2200;

/** Other pages: brief delay after first paint */
const DEFAULT_OPEN_DELAY_MS = 500;

const PROMO_SRC = '/promos/eco-paper-packaging.png?v=2';
const PROMO_WIDTH = 724;
const PROMO_HEIGHT = 1024;

function isSkippedRoute(pathname: string) {
  return (
    pathname.startsWith('/admin') ||
    pathname === '/account/login' ||
    pathname === '/account/register' ||
    pathname.startsWith('/mock-payment')
  );
}

/** When the eco promo finishes (for coordinating other modals on homepage) */
export function getEcoPromoEndDelayMs(pathname: string): number {
  if (isSkippedRoute(pathname)) return 0;
  if (typeof window !== 'undefined' && !shouldShowEcoPromo()) return 0;
  const openDelay = pathname === '/' ? HOME_OPEN_DELAY_MS : DEFAULT_OPEN_DELAY_MS;
  return openDelay + ECO_PROMO_DISPLAY_MS;
}

export default function EcoPromoModal() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const hasOpenedRef = useRef(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (isSkippedRoute(pathname)) {
      setOpen(false);
      return;
    }

    if (!shouldShowEcoPromo() || hasOpenedRef.current) return;

    const openDelay = pathname === '/' ? HOME_OPEN_DELAY_MS : DEFAULT_OPEN_DELAY_MS;
    const showTimer = setTimeout(() => {
      if (!shouldShowEcoPromo() || hasOpenedRef.current) return;
      hasOpenedRef.current = true;
      markEcoPromoShown();
      setOpen(true);
    }, openDelay);
    return () => clearTimeout(showTimer);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const hideTimer = setTimeout(close, ECO_PROMO_DISPLAY_MS);
    return () => clearTimeout(hideTimer);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (isSkippedRoute(pathname)) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="eco-promo"
          role="dialog"
          aria-modal="true"
          aria-label="Eco packaging upgrade announcement"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="eco-promo-fullscreen fixed inset-0 z-[10050] flex items-center justify-center bg-black/85"
        >
          <button
            type="button"
            className="absolute inset-0 w-full h-full cursor-default"
            aria-label="Close announcement"
            onClick={close}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.01 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="eco-promo-frame relative z-10 max-h-[100dvh] max-w-[100vw] w-full h-full flex items-center justify-center pointer-events-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="eco-promo-image-wrap relative pointer-events-auto max-h-[100dvh] max-w-[100vw]">
              <div className="eco-promo-image-shell">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={PROMO_SRC}
                  alt="Bing Chun ECO packaging upgrade — all-new eco paper packaging"
                  width={PROMO_WIDTH}
                  height={PROMO_HEIGHT}
                  className="eco-promo-image block object-contain"
                  decoding="async"
                />
                <button
                  type="button"
                  onClick={close}
                  className="eco-promo-close absolute z-20 flex items-center justify-center rounded-full bg-white/92 text-slate-800 shadow-md hover:bg-white hover:scale-105 active:scale-95 transition-transform"
                  aria-label="Close"
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
