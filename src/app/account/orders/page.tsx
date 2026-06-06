'use client';
import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Package, ChevronRight, RotateCcw, ChevronLeft, Receipt } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { api } from '@/lib/api';
import type { Order } from '@/types';
import toast from 'react-hot-toast';
import { getStatusLabel, STATUS_COLORS } from '@/lib/orderStatus';

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const celebrated = useRef(false);
  const { isAuthenticated, user } = useAuthStore();
  const { addItem, setOrderMode } = useCartStore();

  useEffect(() => {
    if (!isAuthenticated) router.replace('/account/login');
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (celebrated.current || searchParams.get('celebrate') !== '1') return;
    celebrated.current = true;
    const orderNum = searchParams.get('order');
    toast.success(
      orderNum ? `Order #${orderNum} placed! 🎉` : 'Order placed successfully! 🎉',
      { duration: 4000 }
    );
    router.replace('/account/orders', { scroll: false });
  }, [searchParams, router]);

  const { data: orders = [], isLoading, isError, refetch } = useQuery<Order[]>({
    queryKey: ['my-orders', user?.id],
    queryFn: async () => {
      const result = await api.get<Order[]>('/orders/my?limit=50', true);
      return Array.isArray(result) ? result : [];
    },
    enabled: isAuthenticated,
  });

  async function reorder(order: Order) {
    setOrderMode(order.orderMode);
    let added = 0;
    for (const item of order.items) {
      try {
        const productRes = await api.get<{ isAvailable: boolean } & Record<string, unknown>>(
          `/menu/products/${item.productId}`
        );
        if (productRes.isAvailable) {
          addItem({
            product: productRes as never,
            size: item.size as never,
            sugarLevel: item.sugarLevel as never,
            iceLevel: item.iceLevel as never,
            toppings: [],
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          });
          added++;
        }
      } catch {
        /* skip unavailable */
      }
    }
    if (added > 0) {
      toast.success(`${added} item${added > 1 ? 's' : ''} added to your cup! 🧋`);
      router.push('/cart');
    } else {
      toast.error('No items available for reorder');
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/account" className="btn-outline p-2 shrink-0">
          <ChevronLeft size={18} />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-fg">My Orders</h1>
          <p className="text-muted text-sm mt-0.5 truncate">
            {user?.phone ? `Orders for ${user.phone}` : 'Order history & tracking'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 rounded mb-3 bg-navy-light" style={{ width: '40%' }} />
              <div className="h-3 rounded bg-navy-light" style={{ width: '60%' }} />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-12 card p-6">
          <p className="text-muted text-sm mb-4">Could not load your orders.</p>
          <button type="button" onClick={() => refetch()} className="btn-primary px-6 py-2.5 text-sm">
            Try again
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <Package size={48} className="mx-auto text-muted mb-4" />
          <h3 className="text-lg font-semibold text-fg mb-2">No orders yet</h3>
          <p className="text-muted text-sm mb-6 max-w-xs mx-auto">
            Place an order while signed in with your mobile number and it will show here.
          </p>
          <Link href="/menu" className="btn-primary px-6 py-3 inline-flex">
            Order Now
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card p-4"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p className="font-semibold text-fg text-sm">#{order.orderNumber}</p>
                  <p className="text-muted text-xs mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString('en-LK', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <span className={`text-xs font-semibold shrink-0 ${STATUS_COLORS[order.status] || 'text-muted'}`}>
                  {getStatusLabel(order.status, order.orderMode)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted mb-3">
                <span>{order.orderMode === 'DELIVERY' ? '🛵 Delivery' : '🛍 Takeaway'}</span>
                <span>·</span>
                <span className="truncate max-w-[10rem] sm:max-w-none">{order.store?.name || 'Bing Chun'}</span>
                <span>·</span>
                <span className="text-brand font-semibold">LKR {order.total.toLocaleString()}</span>
              </div>

              {order.items?.length > 0 && (
                <p className="text-xs text-muted line-clamp-2">
                  {order.items.map((item) => `${item.productName} ×${item.quantity}`).join(', ')}
                </p>
              )}

              <div className="flex flex-col xs:flex-row gap-2 mt-3 pt-3 border-t border-navy-border sm:flex-row sm:flex-wrap">
                <Link
                  href={`/order/${order.orderNumber}`}
                  className="btn-outline py-2.5 px-3 text-xs flex items-center gap-1 flex-1 justify-center min-w-[7rem]"
                >
                  <ChevronRight size={13} /> Track
                </Link>
                <Link
                  href={`/order/${order.orderNumber}/receipt`}
                  className="btn-outline py-2.5 px-3 text-xs flex items-center gap-1 flex-1 justify-center min-w-[7rem]"
                >
                  <Receipt size={13} /> Receipt
                </Link>
                <button
                  type="button"
                  onClick={() => reorder(order)}
                  className="btn-primary py-2.5 px-3 text-xs flex items-center gap-1 flex-1 justify-center min-w-[7rem]"
                >
                  <RotateCcw size={13} /> Reorder
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
