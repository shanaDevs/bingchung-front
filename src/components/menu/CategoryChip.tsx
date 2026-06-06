'use client';

import { motion } from 'framer-motion';

interface CategoryChipProps {
  name: string;
  emoji: string;
  active: boolean;
  onSelect: () => void;
  index?: number;
}

const spring = { type: 'spring' as const, stiffness: 480, damping: 32 };

export default function CategoryChip({
  name,
  emoji,
  active,
  onSelect,
  index = 0,
}: CategoryChipProps) {
  return (
    <motion.button
      type="button"
      role="tab"
      aria-selected={active}
      layout
      initial={{ opacity: 0, y: 10, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: Math.min(index * 0.04, 0.28), ...spring }}
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.96 }}
      onClick={onSelect}
      className={`category-chip relative flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap shrink-0 ${
        active ? 'category-chip--active text-white' : 'category-chip--idle text-muted'
      }`}
    >
      {active && (
        <motion.span
          layoutId="category-chip-active"
          className="category-chip__glow absolute inset-0 rounded-full"
          transition={spring}
          aria-hidden
        />
      )}

      <motion.span
        className="relative z-[1] text-base leading-none"
        aria-hidden
        animate={active ? { scale: [1, 1.25, 1], rotate: [0, -8, 8, 0] } : { scale: 1, rotate: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {emoji}
      </motion.span>
      <span className="relative z-[1]">{name}</span>
    </motion.button>
  );
}
