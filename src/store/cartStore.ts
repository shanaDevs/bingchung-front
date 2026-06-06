import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, Topping } from '@/types';
import { triggerCartCelebration } from '@/lib/cartCelebration';

export type SugarLevel = 'ZERO' | 'TWENTY_FIVE' | 'FIFTY' | 'SEVENTY_FIVE' | 'HUNDRED';
export type IceLevel = 'NO_ICE' | 'LESS_ICE' | 'REGULAR';
export type ProductSize = 'REGULAR' | 'LARGE';
export type OrderMode = 'DELIVERY' | 'TAKEAWAY';

export interface LocalCartItem {
  id: string;
  product: Product;
  size: ProductSize;
  sugarLevel: SugarLevel;
  iceLevel: IceLevel;
  toppings: Topping[];
  quantity: number;
  unitPrice: number;
  /** When set, this item is fulfilled from a nearby branch — primary branch stays unchanged */
  fulfillmentStore?: { id: string; name: string; distanceKm?: number };
}

interface DeliveryInfo {
  storeId: string;
  storeName: string;
  zoneId: string;
  fee: number;
  minOrder: number;
  estimatedMinutes: number;
  address: string;
  lat?: number;
  lng?: number;
}

interface TakeawayInfo {
  storeId: string;
  storeName: string;
  pickupTime: string;
}

interface CartState {
  items: LocalCartItem[];
  orderMode: OrderMode | null;
  deliveryInfo: DeliveryInfo | null;
  takeawayInfo: TakeawayInfo | null;

  setOrderMode: (mode: OrderMode) => void;
  setDeliveryInfo: (info: DeliveryInfo) => void;
  setTakeawayInfo: (info: TakeawayInfo) => void;
  addItem: (item: Omit<LocalCartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clearCart: () => void;
  clearMode: () => void;
  /** Empty cup and reset delivery/takeaway after order completes */
  completeOrder: () => void;

  subtotal: () => number;
  itemCount: () => number;
  getActiveStoreId: () => string | null;
  getActiveStoreName: () => string | null;
}

function calcUnitPrice(product: Product, size: ProductSize, toppings: Topping[]): number {
  let price = product.basePrice;
  if (size === 'LARGE') price += 100;
  price += toppings.reduce((s, t) => s + t.extraPrice, 0);
  return price;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      orderMode: null,
      deliveryInfo: null,
      takeawayInfo: null,

      setOrderMode: (mode) => set({ orderMode: mode }),
      setDeliveryInfo: (info) => set({ deliveryInfo: info }),
      setTakeawayInfo: (info) => set({ takeawayInfo: info }),

      addItem: (item) => {
        const countBefore = get().itemCount();
        const branchKey = item.fulfillmentStore?.id ?? 'primary';
        const id = `${item.product.id}-${item.size}-${item.sugarLevel}-${item.iceLevel}-${item.toppings.map((t) => t.id).join(',')}-${branchKey}`;
        set((state) => {
          const existing = state.items.find((i) => i.id === id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === id ? { ...i, quantity: i.quantity + item.quantity } : i
              ),
            };
          }
          return { items: [...state.items, { ...item, id }] };
        });
        const countAfter = get().itemCount();
        triggerCartCelebration(item.product.name, countBefore, countAfter);
      },

      removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

      updateQuantity: (id, qty) => {
        const countBefore = get().itemCount();
        if (qty <= 0) {
          set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
        } else {
          set((state) => ({
            items: state.items.map((i) => (i.id === id ? { ...i, quantity: qty } : i)),
          }));
        }
        const countAfter = get().itemCount();
        if (qty > 0 && countAfter > countBefore) {
          const item = get().items.find((i) => i.id === id);
          triggerCartCelebration(item?.product.name, countBefore, countAfter);
        }
      },

      clearCart: () => set({ items: [] }),
      clearMode: () => set({ orderMode: null, deliveryInfo: null, takeawayInfo: null }),
      completeOrder: () =>
        set({ items: [], orderMode: null, deliveryInfo: null, takeawayInfo: null }),

      subtotal: () => get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      getActiveStoreId: () => {
        const { deliveryInfo, takeawayInfo } = get();
        return deliveryInfo?.storeId ?? takeawayInfo?.storeId ?? null;
      },

      getActiveStoreName: () => {
        const { deliveryInfo, takeawayInfo } = get();
        return deliveryInfo?.storeName ?? takeawayInfo?.storeName ?? null;
      },
    }),
    { name: 'bc-cart' }
  )
);
