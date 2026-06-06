'use client';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';
import CupIcon, { cupFillFromCount } from '@/components/cart/CupIcon';
import { useClientHydrated } from '@/hooks/useClientHydrated';
import { useCupPourPulse } from '@/hooks/useCupPourPulse';

export default function FloatingCart() {
  const hydrated = useClientHydrated();
  const itemCount = useCartStore((s) => s.itemCount());
  const subtotal = useCartStore((s) => s.subtotal());
  const pourPulse = useCupPourPulse();
  const displayCount = hydrated ? itemCount : 0;
  const fillLevel = cupFillFromCount(displayCount);

  return (
    <AnimatePresence>
      {hydrated && displayCount > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-4"
        >
          <Link href="/cart">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-between px-5 py-3.5 rounded-full cursor-pointer bg-brand shadow-glow"
            >
              <div className="flex items-center gap-3">
                <CupIcon
                  fillLevel={fillLevel}
                  fillFrom={pourPulse?.fillBefore}
                  pouring={pourPulse != null}
                  size="md"
                  itemCount={displayCount}
                  inverted
                />
                <span className="font-semibold text-sm text-white">View Your Cup</span>
              </div>
              <span className="font-bold text-white">LKR {subtotal.toLocaleString()}</span>
            </motion.div>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
