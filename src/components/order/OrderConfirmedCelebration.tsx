'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MASCOT_IMAGES } from '@/lib/mascotImages';
import { playOrderConfirmedSound } from '@/lib/uiSounds';

const VISIBLE_MS = 5200;
const CONFETTI_COUNT = 36;
const CONFETTI_COLORS = ['#307ef2', '#60a5fa', '#f472b6', '#fbbf24', '#34d399', '#a78bfa', '#fb7185', '#fde047'];

type Props = {
  open: boolean;
  orderNumber: string;
  onClose: () => void;
};

export default function OrderConfirmedCelebration({ open, orderNumber, onClose }: Props) {
  const reduceMotion = useReducedMotion();
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playedSound = useRef(false);
  const [mounted, setMounted] = useState(false);

  const confetti = useMemo(
    () =>
      Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
        id: i,
        left: `${(i * 17 + 7) % 100}%`,
        delay: `${(i % 8) * 0.08}s`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + (i % 5) * 2,
        rotate: (i * 47) % 360,
      })),
    []
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !mounted) return;

    if (!playedSound.current && !reduceMotion) {
      playedSound.current = true;
      playOrderConfirmedSound();
    }

    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(onClose, VISIBLE_MS);

    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [open, mounted, onClose, reduceMotion]);

  useEffect(() => {
    if (!open) playedSound.current = false;
  }, [open]);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="order-confirmed"
          className="order-confirmed-celebration"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-confirmed-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.35 }}
          onClick={onClose}
        >
          <div className="order-confirmed-celebration__burst" aria-hidden />
          <div className="order-confirmed-celebration__ring order-confirmed-celebration__ring--1" aria-hidden />
          <div className="order-confirmed-celebration__ring order-confirmed-celebration__ring--2" aria-hidden />

          {confetti.map((c) => (
            <span
              key={c.id}
              className="order-confirmed-celebration__confetti"
              style={{
                left: c.left,
                animationDelay: c.delay,
                backgroundColor: c.color,
                width: c.size,
                height: c.size * 1.4,
                transform: `rotate(${c.rotate}deg)`,
              }}
              aria-hidden
            />
          ))}

          <motion.div
            className="order-confirmed-celebration__panel"
            initial={{ scale: reduceMotion ? 1 : 0.5, y: reduceMotion ? 0 : 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.05 }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.p
              className="order-confirmed-celebration__eyebrow"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              🎉 Yay!
            </motion.p>

            <h2 id="order-confirmed-title" className="order-confirmed-celebration__title">
              Order Confirmed!
            </h2>
            <p className="order-confirmed-celebration__order">#{orderNumber}</p>

            <motion.div
              className="order-confirmed-celebration__mascot-wrap"
              animate={
                reduceMotion
                  ? {}
                  : {
                      rotate: [0, -8, 8, -6, 6, -3, 3, 0],
                      y: [0, -18, 0, -14, 0, -8, 0],
                      scale: [1, 1.08, 1, 1.05, 1],
                    }
              }
              transition={{ duration: 2.2, ease: 'easeInOut', repeat: Infinity, repeatType: 'mirror' }}
            >
              <span className="order-confirmed-celebration__spark order-confirmed-celebration__spark--1" aria-hidden />
              <span className="order-confirmed-celebration__spark order-confirmed-celebration__spark--2" aria-hidden />
              <span className="order-confirmed-celebration__spark order-confirmed-celebration__spark--3" aria-hidden />
              <span className="order-confirmed-celebration__spark order-confirmed-celebration__spark--4" aria-hidden />
              <Image
                src={MASCOT_IMAGES.orderConfirmed}
                alt="Bing Chun mascot celebrating your order"
                width={280}
                height={280}
                className="order-confirmed-celebration__mascot"
                priority
              />
            </motion.div>

            <p className="order-confirmed-celebration__sub">
              We&apos;re preparing your order — track progress below
            </p>

            <button type="button" className="order-confirmed-celebration__btn" onClick={onClose}>
              View tracking
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
