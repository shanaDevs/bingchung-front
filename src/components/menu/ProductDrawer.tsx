'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import type { Product } from '@/types';
import TagBadge from '@/components/ui/TagBadge';
import toast from 'react-hot-toast';

interface Props {
  product: Product;
  fulfillmentStore?: { id: string; name: string; distanceKm?: number } | null;
  onClose: () => void;
}

export default function ProductDrawer({ product, fulfillmentStore, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setQuantity(1);
  }, [product.id]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const unitPrice = product.basePrice;
  const lineTotal = unitPrice * quantity;

  function addToCart() {
    addItem({
      product,
      size: 'REGULAR',
      sugarLevel: 'HUNDRED',
      iceLevel: 'REGULAR',
      toppings: [],
      quantity,
      unitPrice,
      fulfillmentStore: fulfillmentStore
        ? {
            id: fulfillmentStore.id,
            name: fulfillmentStore.name,
            distanceKm: fulfillmentStore.distanceKm,
          }
        : undefined,
    });
    const branchNote = fulfillmentStore
      ? ` from ${fulfillmentStore.name.replace('Bing Chun - ', '')}`
      : '';
    toast.success(`${product.name} added to your cup${branchNote}! 🧋`);
    onClose();
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      <>
        <motion.button
          type="button"
          aria-label="Close add order"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9990] cursor-default"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}
        />

        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-order-title"
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 24 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="fixed inset-0 z-[9991] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none"
        >
          <div
            className="product-customize-modal card w-full sm:max-w-md flex flex-col pointer-events-auto shadow-2xl rounded-t-2xl sm:rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-navy-border shrink-0">
              <h2 id="add-order-title" className="text-lg font-bold text-fg">
                Add to Order
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-navy-light transition-colors"
                aria-label="Close"
              >
                <X size={18} className="text-muted" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              <div className="flex gap-4 items-start">
                <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center shrink-0 bg-brand-subtle">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl">🧋</span>
                  )}
                </div>
                <div>
                  {product.tag && <TagBadge tag={product.tag} />}
                  <h3 className="text-fg font-bold mt-1">{product.name}</h3>
                  <p className="text-muted text-xs mt-1">{product.description}</p>
                  <p className="text-brand font-semibold text-sm mt-2">
                    LKR {unitPrice.toLocaleString()} each
                  </p>
                  {fulfillmentStore && (
                    <p className="text-amber-400 text-xs mt-2 font-medium">
                      📍 Fulfilled from {fulfillmentStore.name.replace('Bing Chun - ', '')}
                      {fulfillmentStore.distanceKm != null ? ` · ${fulfillmentStore.distanceKm} km` : ''}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-fg mb-3">Quantity</p>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 rounded-full border border-navy-border flex items-center justify-center hover:border-brand transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="text-xl font-bold text-fg w-8 text-center">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                    className="w-10 h-10 rounded-full border border-navy-border flex items-center justify-center hover:border-brand transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-navy-border shrink-0">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted text-sm">Total</span>
                <span className="text-brand font-bold text-xl">LKR {lineTotal.toLocaleString()}</span>
              </div>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={addToCart}
                className="btn-primary w-full py-4 text-base"
              >
                Add to Cart · LKR {lineTotal.toLocaleString()}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </>
    </AnimatePresence>,
    document.body,
  );
}
