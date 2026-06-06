import { playCartAddSound } from '@/lib/uiSounds';
import { cupFillFromCount } from '@/lib/cupFill';

export const CART_CELEBRATION_EVENT = 'bc-cart-celebration';
export const CUP_POUR_EVENT = 'bc-cup-pour';

export interface CartCelebrationDetail {
  productName?: string;
  itemCountBefore?: number;
  itemCountAfter?: number;
  fillBefore?: number;
  fillAfter?: number;
}

export interface CupPourDetail {
  productName?: string;
  fillBefore: number;
  fillAfter: number;
  itemCountBefore: number;
  itemCountAfter: number;
}

export function triggerCartCelebration(
  productName?: string,
  itemCountBefore?: number,
  itemCountAfter?: number,
): void {
  if (typeof window === 'undefined') return;

  playCartAddSound();

  const fillBefore = cupFillFromCount(itemCountBefore ?? 0);
  const fillAfter = cupFillFromCount(itemCountAfter ?? itemCountBefore ?? 0);

  const detail: CartCelebrationDetail = {
    productName,
    itemCountBefore,
    itemCountAfter,
    fillBefore,
    fillAfter,
  };

  window.dispatchEvent(
    new CustomEvent<CupPourDetail>(CUP_POUR_EVENT, {
      detail: {
        productName,
        fillBefore,
        fillAfter,
        itemCountBefore: itemCountBefore ?? 0,
        itemCountAfter: itemCountAfter ?? itemCountBefore ?? 0,
      },
    }),
  );

  window.dispatchEvent(
    new CustomEvent<CartCelebrationDetail>(CART_CELEBRATION_EVENT, { detail }),
  );
}
