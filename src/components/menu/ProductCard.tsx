'use client';

import type { MouseEvent } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { Plus, Sparkles } from 'lucide-react';
import TagBadge from '@/components/ui/TagBadge';

export interface ProductCardProps {
  id?: string;
  name: string;
  basePrice: number;
  description?: string;
  imageUrl?: string;
  tag?: string;
  categoryName?: string;
  emoji?: string;
  isAvailable?: boolean;
  index?: number;
  nearbyBranch?: { name: string; distanceKm: number };
  stockQuantity?: number;
  onSelect: () => void;
  /** Opens customise modal — defaults to onSelect when omitted */
  onAdd?: () => void;
}

const spring = { type: 'spring' as const, stiffness: 420, damping: 28 };

export default function ProductCard({
  name,
  basePrice,
  description,
  imageUrl,
  tag,
  categoryName,
  emoji = '🧋',
  isAvailable = true,
  index = 0,
  nearbyBranch,
  onSelect,
  onAdd,
}: ProductCardProps) {
  const reduceMotion = useReducedMotion();
  const canClick = isAvailable || Boolean(nearbyBranch);
  const nearbyOnly = Boolean(nearbyBranch) && !isAvailable;
  const openCustomize = onAdd ?? onSelect;

  function handleAddClick(e: MouseEvent) {
    e.stopPropagation();
    if (canClick) openCustomize();
  }

  return (
    <div className="product-card-shell group/shell h-full">
      <motion.article
        layout
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94, y: -8 }}
        transition={{
          delay: Math.min(index * 0.05, 0.35),
          duration: 0.5,
          ease: [0.22, 1, 0.36, 1],
        }}
        whileHover={
          canClick && !reduceMotion
            ? { y: -10, scale: 1.02, transition: spring }
            : undefined
        }
        whileTap={canClick ? { scale: 0.98, transition: { duration: 0.12 } } : undefined}
        className={`product-card card group flex flex-col h-full ${
          canClick ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'
        }`}
        onClick={() => canClick && onSelect()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && canClick) {
            e.preventDefault();
            onSelect();
          }
        }}
        role="button"
        tabIndex={canClick ? 0 : -1}
        aria-label={`${name}, LKR ${basePrice}`}
      >
      <span className="product-card__ring" aria-hidden />

      {canClick && (
        <div className="product-card__hover-mascot" aria-hidden>
          <Image
            src="/brand/mascot-hover.png"
            alt=""
            width={88}
            height={88}
            className="product-card__hover-mascot-img"
            priority={false}
          />
        </div>
      )}

      <div className="product-card__media relative z-[1]">
        <div className="product-card__img-stage">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={name}
              className="product-card__img"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <motion.span
              className="product-card__emoji"
              animate={
                reduceMotion
                  ? undefined
                  : {
                      y: [0, -6, 0],
                      rotate: [0, -4, 4, 0],
                    }
              }
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              {emoji}
            </motion.span>
          )}
        </div>

        {nearbyBranch && (
          <span className="product-card__nearby-branch product-card__media-badge text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/35 line-clamp-1 max-w-[70%]">
            📍 {nearbyBranch.name.replace('Bing Chun - ', '')} · {nearbyBranch.distanceKm} km
          </span>
        )}
        {tag && !nearbyBranch && (
          <span className="product-card__media-badge product-card__media-badge--tag">
            <TagBadge tag={tag} animated />
          </span>
        )}
        {categoryName && (
          <motion.span
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(index * 0.05 + 0.1, 0.4), duration: 0.35 }}
            className="product-card__category product-card__media-badge product-card__media-badge--category"
          >
            {categoryName}
          </motion.span>
        )}
        {!reduceMotion && (
          <>
            <span className="product-card__bubble product-card__bubble--1" aria-hidden />
            <span className="product-card__bubble product-card__bubble--2" aria-hidden />
          </>
        )}

        <div className="product-card__overlay" aria-hidden />

        {canClick && (
          <motion.div
            className="product-card__action"
            initial={false}
            whileHover={reduceMotion ? undefined : { scale: 1.05 }}
          >
            <button
              type="button"
              className="product-card__action-btn"
              onClick={handleAddClick}
              aria-label={nearbyOnly ? `Order ${name} from nearby branch` : `Customise and add ${name}`}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span className="hidden sm:inline">{nearbyOnly ? 'Nearby' : 'Add'}</span>
              <Sparkles size={12} className="opacity-80 hidden sm:block" />
            </button>
          </motion.div>
        )}

        {nearbyOnly && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45 rounded-[inherit] z-10">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/25 text-amber-100 border border-amber-400/40 text-center leading-snug">
              Out here · Available nearby
            </span>
          </div>
        )}

        {!canClick && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-[inherit] z-10">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-red-500/25 text-red-200 border border-red-400/40">
              Unavailable
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col pt-3 sm:pt-4 relative z-[1]">
        <h3 className="font-semibold text-fg leading-snug line-clamp-2 text-sm sm:text-[15px] transition-colors duration-300 group-hover:text-brand">
          {name}
        </h3>
        {description && (
          <p className="text-muted text-xs mt-1.5 line-clamp-2 leading-relaxed">{description}</p>
        )}
        <div className="mt-auto pt-3">
          <motion.div
            className="product-card__price"
            whileHover={reduceMotion ? undefined : { scale: 1.03 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            LKR {basePrice.toLocaleString()}
          </motion.div>
        </div>
      </div>
    </motion.article>
    </div>
  );
}
