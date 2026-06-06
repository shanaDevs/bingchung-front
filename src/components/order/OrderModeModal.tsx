'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { OrderModeSelector } from './OrderModeSelector';
import AnimatedMascot from '@/components/mascot/AnimatedMascot';
import type { MascotPose } from '@/components/mascot/mascotAnimations';
import type { OrderMode } from '@/store/cartStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

function modeToPose(mode: OrderMode): MascotPose {
  return mode === 'DELIVERY' ? 'delivery' : 'takeaway';
}

export default function OrderModeModal({ isOpen, onClose }: Props) {
  const router = useRouter();
  const [brandHovered, setBrandHovered] = useState(false);
  const [orderMode, setOrderMode] = useState<OrderMode>('DELIVERY');

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const handleComplete = useCallback(() => {
    onClose();
    router.push('/menu');
  }, [onClose, router]);

  const mascotPose: MascotPose = brandHovered ? 'cup-offer' : modeToPose(orderMode);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="order-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="order-mode-modal-backdrop fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6"
          onClick={onClose}
        >
          <motion.div
            key="order-modal-panel"
            initial={{ opacity: 0, scale: 0.94, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 28 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="order-mode-modal relative w-full max-w-2xl lg:max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="order-mode-modal__card card shadow-2xl flex flex-col lg:flex-row overflow-hidden">
              <div className="order-mode-modal__accent absolute top-0 left-0 right-0 z-10" aria-hidden />

              <button
                type="button"
                onClick={onClose}
                className="order-mode-modal__close absolute top-4 right-4 z-30 w-9 h-9 rounded-xl flex items-center justify-center border transition-all"
                aria-label="Close"
              >
                <X size={16} />
              </button>

              {/* Brand + mascot — left column only, never overlaps map */}
              <div
                className="order-mode-modal__brand hidden lg:flex lg:w-[200px] xl:w-[220px] shrink-0 flex-col items-center p-5 pt-8 relative"
                onMouseEnter={() => setBrandHovered(true)}
                onMouseLeave={() => setBrandHovered(false)}
                onTouchStart={() => setBrandHovered(true)}
              >
                <div className="order-mode-modal__brand-glow" aria-hidden />

                <div className="relative z-[1] w-full flex flex-col items-center">
                  <AnimatedMascot
                    pose={mascotPose}
                    visible
                    size="md"
                    showCup={false}
                    showBubble={brandHovered}
                    className="order-mode-modal__brand-mascot"
                  />

                  <p className="text-xs font-semibold uppercase tracking-widest text-brand-light mt-3 text-center">
                    Order your way
                  </p>
                  <p className="text-[11px] text-muted mt-2 leading-relaxed text-center px-1">
                    {brandHovered
                      ? 'Stitch is ready with your cup!'
                      : 'Hover here to say hi to Stitch'}
                  </p>
                  <Sparkles size={14} className="text-accent mt-3 opacity-80" />
                </div>
              </div>

              {/* Form + map — scrollable, full width on mobile */}
              <div className="order-mode-modal__body flex-1 min-w-0 overflow-y-auto overflow-x-hidden max-h-[min(92vh,820px)]">
                <div className="p-5 sm:p-7 lg:p-8 pt-12 sm:pt-14 lg:pt-8">
                  <OrderModeSelector
                    onComplete={handleComplete}
                    onModeChange={setOrderMode}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
