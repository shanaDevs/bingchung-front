'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Trash2, ArrowRight, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import type { LocalCartItem } from '@/store/cartStore';
import EmptyCartState from '@/components/cart/EmptyCartState';
import CupIcon, { cupFillFromCount } from '@/components/cart/CupIcon';
import { useCupPourPulse } from '@/hooks/useCupPourPulse';

const SUGAR_LABELS: Record<string, string> = {
  ZERO: '0% Sugar', TWENTY_FIVE: '25% Sugar', FIFTY: '50% Sugar', SEVENTY_FIVE: '75% Sugar', HUNDRED: '100% Sugar',
};
const ICE_LABELS: Record<string, string> = {
  NO_ICE: 'No Ice', LESS_ICE: 'Less Ice', REGULAR: 'Regular Ice',
};

function CartItemRow({ item }: { item: LocalCartItem }) {
  const { updateQuantity, removeItem } = useCartStore();
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      className="card p-4 flex gap-4"
    >
      {/* Image */}
      <div className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl shrink-0 bg-brand-subtle">
        🧋
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-fg text-sm line-clamp-1">{item.product.name}</h3>
        <p className="text-muted text-xs mt-0.5">
          {item.size} · {SUGAR_LABELS[item.sugarLevel]} · {ICE_LABELS[item.iceLevel]}
          {item.toppings.length > 0 && ` · ${item.toppings.map((t) => t.name).join(', ')}`}
        </p>
        {item.fulfillmentStore && (
          <p className="text-amber-400 text-xs mt-1">
            📍 From {item.fulfillmentStore.name.replace('Bing Chun - ', '')}
          </p>
        )}
        <div className="flex items-center justify-between mt-3">
          {/* Qty controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
              className="w-7 h-7 rounded-full border border-navy-border flex items-center justify-center hover:border-brand transition-colors"
            >
              <Minus size={12} />
            </button>
            <span className="text-fg font-semibold text-sm w-6 text-center">{item.quantity}</span>
            <button
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
              className="w-7 h-7 rounded-full border border-navy-border flex items-center justify-center hover:border-brand transition-colors"
              disabled={item.quantity >= 10}
            >
              <Plus size={12} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-brand font-bold text-sm">LKR {(item.unitPrice * item.quantity).toLocaleString()}</span>
            <button
              onClick={() => removeItem(item.id)}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors text-muted"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function CartPage() {
  const { items, subtotal, orderMode, deliveryInfo, takeawayInfo, clearCart } = useCartStore();
  const router = useRouter();
  const sub = subtotal();
  const deliveryFee = orderMode === 'DELIVERY' && deliveryInfo ? deliveryInfo.fee : 0;
  const total = sub + deliveryFee;
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const fillLevel = cupFillFromCount(totalQty);
  const pourPulse = useCupPourPulse();
  const hasNearbyItems = items.some((i) => i.fulfillmentStore);

  if (items.length === 0) {
    return <EmptyCartState />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/menu" className="btn-outline p-2">
          <ChevronLeft size={18} />
        </Link>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <CupIcon
            fillLevel={fillLevel}
            fillFrom={pourPulse?.fillBefore}
            pouring={pourPulse != null}
            size="lg"
            itemCount={totalQty}
          />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-fg">Your Cup</h1>
            <p className="text-muted text-sm">
              {totalQty} drink{totalQty !== 1 ? 's' : ''} · {Math.round(fillLevel * 100)}% full
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {hasNearbyItems && (
            <p className="text-xs text-amber-400/90 px-1">
              Items marked with 📍 are fulfilled from a nearby branch. Your main order branch stays the same.
            </p>
          )}
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <CartItemRow key={item.id} item={item} />
            ))}
          </AnimatePresence>

          <div className="flex justify-between items-center pt-2">
            <button onClick={() => clearCart()} className="text-sm text-muted hover:text-red-400 transition-colors flex items-center gap-1">
              <Trash2 size={13} /> Empty cup
            </button>
            <Link href="/menu" className="text-sm text-brand hover:text-brand-light transition-colors flex items-center gap-1">
              + Add more items
            </Link>
          </div>
        </div>

        {/* Order summary */}
        <div className="space-y-4">
          {/* Order mode info */}
          {orderMode && (
            <div className="card p-4">
              <p className="text-xs text-muted font-semibold uppercase tracking-wider mb-2">Order Type</p>
              <div className="flex items-center gap-2">
                <span className="text-lg">{orderMode === 'DELIVERY' ? '🛵' : '🛍'}</span>
                <div>
                  <p className="text-fg text-sm font-medium">{orderMode === 'DELIVERY' ? 'Delivery' : 'Takeaway'}</p>
                  {orderMode === 'DELIVERY' && deliveryInfo && (
                    <p className="text-muted text-xs">{deliveryInfo.address}</p>
                  )}
                  {orderMode === 'TAKEAWAY' && takeawayInfo && (
                    <p className="text-muted text-xs">{takeawayInfo.storeName}</p>
                  )}
                </div>
              </div>
              {(!deliveryInfo && !takeawayInfo) && (
                <p className="text-xs text-brand mt-2">⚠️ Setup delivery/pickup details at checkout</p>
              )}
            </div>
          )}

          {/* Price breakdown */}
          <div className="card p-5">
              <h3 className="font-semibold text-fg mb-4">Order Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                <span className="text-fg">LKR {sub.toLocaleString()}</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Delivery fee</span>
                  <span className="text-fg">LKR {deliveryFee.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-navy-border pt-3 flex justify-between font-bold">
                <span className="text-fg">Total</span>
                <span className="text-brand text-lg">LKR {total.toLocaleString()}</span>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/checkout')}
              className="btn-primary w-full py-4 mt-5 text-base"
            >
              Proceed to Checkout <ArrowRight size={18} />
            </motion.button>
          </div>

          {/* Promo code teaser */}
          <p className="text-xs text-center text-muted">
            🎟️ Have a promo code? Apply it at checkout
          </p>
        </div>
      </div>
    </div>
  );
}
