'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Clock, MapPin, Home, Receipt } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Order, OrderStatus } from '@/types';
import toast from 'react-hot-toast';
import { useOrderTrackSocket } from '@/hooks/useCustomerSocket';
import OrderQrCard from '@/components/order/OrderQrCard';
import OrderConfirmedCelebration from '@/components/order/OrderConfirmedCelebration';
import OrderDeliveredCelebration from '@/components/order/OrderDeliveredCelebration';
import OrderTrackingProgress from '@/components/order/OrderTrackingProgress';
import TakeawayPickupQueue from '@/components/order/TakeawayPickupQueue';
import { consumeOrderCelebrationFlag } from '@/lib/orderCelebration';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import {
  getTrackingStepIndex,
  getTrackingSteps,
  isNewCompletionStatus,
  isTrackingComplete,
  STATUS_LABELS,
} from '@/lib/orderStatus';

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [liveStatus, setLiveStatus] = useState<OrderStatus | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showDeliveredCelebration, setShowDeliveredCelebration] = useState(false);
  const [liveQueue, setLiveQueue] = useState<{
    queuePosition?: number;
    scheduledPickupAt?: string;
  } | null>(null);
  const completeOrder = useCartStore((s) => s.completeOrder);
  const orderModeRef = useRef<'DELIVERY' | 'TAKEAWAY' | undefined>(undefined);
  const orderStatusRef = useRef<OrderStatus | null>(null);
  const completionCelebratedRef = useRef(false);
  const closeCelebration = useCallback(() => setShowCelebration(false), []);
  const closeDeliveredCelebration = useCallback(() => setShowDeliveredCelebration(false), []);

  const onLiveStatus = useCallback(
    (data: { status: OrderStatus; orderNumber?: string; note?: string }) => {
      setLiveStatus((prev) => {
        if (prev === data.status) return prev;

        const isDelivery = orderModeRef.current === 'DELIVERY';
        const previousStatus = (prev ?? orderStatusRef.current ?? 'RECEIVED') as OrderStatus;
        const isCompletion = isNewCompletionStatus(data.status, previousStatus, isDelivery);

        if (orderModeRef.current && isCompletion && !completionCelebratedRef.current) {
          completionCelebratedRef.current = true;
          setShowDeliveredCelebration(true);
        } else if (!isAuthenticated) {
          toast(STATUS_LABELS[data.status] || 'Order updated', { duration: 4000 });
        }

        return data.status;
      });
    },
    [isAuthenticated]
  );

  const onPickupSoon = useCallback((data: { title?: string; message?: string }) => {
    toast(data.message || data.title || 'Pickup in 5 minutes!', { icon: '⏰', duration: 6000 });
  }, []);

  const onQueueUpdate = useCallback(
    (data: { queuePosition?: number; scheduledPickupAt?: string }) => {
      setLiveQueue(data);
    },
    []
  );

  useOrderTrackSocket(id, onLiveStatus, onQueueUpdate, onPickupSoon);

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ['order', id],
    queryFn: () => api.get(`/orders/${id}`),
    refetchInterval: (query) =>
      query.state.data?.orderMode === 'TAKEAWAY' ? 15000 : 30000,
  });

  useEffect(() => {
    if (!order) return;
    orderModeRef.current = order.orderMode;
    orderStatusRef.current = order.status;
  }, [order]);

  useEffect(() => {
    if (!id || !order) return;

    const onComplete = (e: Event) => {
      const detail = (e as CustomEvent<{ orderNumber?: string; orderId?: string; status: OrderStatus }>).detail;
      const matches =
        detail.orderNumber === id ||
        detail.orderNumber === order.orderNumber ||
        detail.orderId === order.id;
      if (!matches) return;

      const isDelivery = order.orderMode === 'DELIVERY';
      const previous = liveStatus ?? order.status;
      if (
        !completionCelebratedRef.current &&
        isNewCompletionStatus(detail.status, previous, isDelivery)
      ) {
        completionCelebratedRef.current = true;
        setShowDeliveredCelebration(true);
        setLiveStatus(detail.status);
      }
    };

    window.addEventListener('bc-order-complete', onComplete);
    return () => window.removeEventListener('bc-order-complete', onComplete);
  }, [id, order, liveStatus]);

  useEffect(() => {
    if (!order || order.status === 'CANCELLED') return;

    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('celebrate') === '1';
    const fromCheckout = consumeOrderCelebrationFlag(order.orderNumber);

    if (fromQuery || fromCheckout) {
      completeOrder();
      setShowCelebration(true);

      const isOnline =
        order.paymentMethod === 'PAYHERE' || order.paymentMethod === 'CARD';
      if (fromQuery && isOnline && order.paymentStatus !== 'PAID') {
        void api
          .post(`/orders/${order.orderNumber}/confirm-payment`, {})
          .then(() => {
            void queryClient.invalidateQueries({ queryKey: ['order', id] });
            void queryClient.invalidateQueries({ queryKey: ['order', id, 'receipt'] });
          })
          .catch(() => {});
      }

      if (fromQuery) {
        router.replace(window.location.pathname, { scroll: false });
      }
    }
  }, [order, router, completeOrder, id, queryClient]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🧋</div>
          <p className="text-muted">Loading your order...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center">
        <div>
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-white mb-2">Order not found</h2>
          <Link href="/" className="btn-primary px-6 py-3 mt-4 inline-flex">Go Home</Link>
        </div>
      </div>
    );
  }

  const currentStatus = liveStatus || order.status;
  const isDelivery = order.orderMode === 'DELIVERY';
  const steps = getTrackingSteps(isDelivery);
  const currentStep = getTrackingStepIndex(steps, currentStatus);
  const isCancelled = currentStatus === 'CANCELLED';
  const isComplete = isTrackingComplete(currentStatus, isDelivery);

  return (
    <>
      <OrderConfirmedCelebration
        open={showCelebration && !isCancelled && !showDeliveredCelebration}
        orderNumber={order.orderNumber}
        onClose={closeCelebration}
      />
      <OrderDeliveredCelebration
        open={showDeliveredCelebration && !isCancelled}
        orderNumber={order.orderNumber}
        isDelivery={isDelivery}
        onClose={closeDeliveredCelebration}
      />
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Success header */}
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center mb-8">
        {!showCelebration && !showDeliveredCelebration && (
        <motion.div
          animate={isComplete ? { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] } : { scale: [1, 1.1, 1] }}
          transition={{ duration: 0.5, repeat: isComplete ? 3 : 2 }}
          className="text-7xl mb-4"
        >
          {isCancelled ? '❌' : isComplete ? (isDelivery ? '🏆' : '🎊') : '🎉'}
        </motion.div>
        )}
        {(showCelebration || showDeliveredCelebration) && !isCancelled && <div className="h-4 mb-2" aria-hidden />}
        <h1 className="text-2xl font-bold text-white mb-1">
          {isCancelled
            ? 'Order Cancelled'
            : isComplete
              ? isDelivery
                ? 'Delivered!'
                : 'Ready for Pickup!'
              : 'Order Confirmed!'}
        </h1>
        <p className="text-muted text-sm">Order #{order.orderNumber}</p>
        <div className="flex items-center justify-center gap-4 mt-3 text-sm">
          <span className="flex items-center gap-1 text-muted">
            <Clock size={13} /> ETA {order.estimatedMinutes} min
          </span>
          <span className="text-brand font-bold">LKR {order.total.toLocaleString()}</span>
        </div>
      </motion.div>

      {!isCancelled && !isDelivery && (
        <TakeawayPickupQueue
          queuePosition={liveQueue?.queuePosition ?? order.queuePosition}
          scheduledPickupAt={liveQueue?.scheduledPickupAt ?? order.scheduledPickupAt}
          estimatedMinutes={order.estimatedMinutes}
          status={currentStatus}
        />
      )}

      {/* Status tracker */}
      {!isCancelled && (
        <div className="card p-6 mb-5">
          <h3 className="font-semibold text-white mb-4">
            {isDelivery ? '🛵 Track Your Order' : '🛍 Track Your Pickup'}
          </h3>

          <OrderTrackingProgress
            steps={steps}
            currentStep={currentStep}
            currentStatus={currentStatus}
            isDelivery={isDelivery}
          />

          <div className="relative mt-8 pt-2 border-t border-navy-border">
            {/* Progress line */}
            <div className="absolute left-5 top-5 bottom-5 w-0.5" style={{ background: 'var(--color-navy-border)' }} />
            <div
              className="absolute left-5 top-5 w-0.5 transition-all duration-1000"
              style={{
                background: '#307ef2',
                height: `${Math.max(0, (currentStep / (steps.length - 1)) * 100)}%`,
              }}
            />

            <div className="space-y-6">
              {steps.map((step, i) => {
                const isDone = isComplete || i < currentStep;
                const isCurrent = !isComplete && i === currentStep;
                return (
                  <motion.div
                    key={step.status}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-4 relative pl-12"
                  >
                    <div className={`absolute left-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                      isDone ? 'bg-brand' : 'bg-navy-card border border-navy-border'
                    }`}>
                      <step.icon size={16} className={isDone ? 'text-white' : 'text-muted'} />
                    </div>
                    <div className="flex-1 pb-2">
                      <p className={`font-medium text-sm ${isDone ? 'text-white' : 'text-muted'}`}>{step.label}</p>
                      <p className={`text-xs mt-0.5 ${isCurrent ? 'text-brand' : 'text-muted'}`}>{isCurrent ? step.desc : ''}</p>
                    </div>
                    {isCurrent && (
                      <div className="absolute -left-1 top-0 w-12 h-12 rounded-full animate-ping opacity-20 bg-brand" />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* QR code for takeaway */}
      {!isDelivery && !isCancelled && (
        <OrderQrCard orderNumber={order.orderNumber} />
      )}

      {/* Store info */}
      <div className="card p-5 mb-5">
        <div className="flex items-start gap-3">
          <MapPin size={18} className="text-brand mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-white">{order.store.name}</p>
            <p className="text-muted text-sm">{order.store.addressLine}</p>
          </div>
        </div>
        {order.address && (
          <div className="flex items-start gap-3 mt-3 pt-3 border-t border-navy-border">
            <Home size={18} className="text-brand mt-0.5 shrink-0" />
            <div>
              <p className="text-muted text-xs">Delivery to</p>
              <p className="text-white text-sm">{order.address.addressLine}</p>
            </div>
          </div>
        )}
      </div>

      {/* Order items */}
      <div className="card p-5 mb-6">
        <h3 className="font-semibold text-white mb-3">Order Items</h3>
        <div className="space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-muted flex-1">{item.productName} × {item.quantity}</span>
              <span className="text-white">LKR {item.totalPrice.toLocaleString()}</span>
            </div>
          ))}
          <div className="border-t border-navy-border pt-2 mt-2 space-y-1.5">
            {order.deliveryFee > 0 && <div className="flex justify-between text-sm"><span className="text-muted">Delivery fee</span><span>LKR {order.deliveryFee.toLocaleString()}</span></div>}
            {order.discount > 0 && <div className="flex justify-between text-sm text-green-400"><span>Discount</span><span>−LKR {order.discount.toLocaleString()}</span></div>}
            <div className="flex justify-between font-bold"><span>Total</span><span className="text-brand">LKR {order.total.toLocaleString()}</span></div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <Link
          href={`/order/${order.orderNumber}/receipt`}
          className="btn-primary w-full py-3 text-sm justify-center flex items-center gap-2"
        >
          <Receipt size={16} /> View Receipt
        </Link>
        <div className="flex gap-3">
          <Link href="/" className="btn-outline flex-1 py-3 text-sm justify-center">
            <Home size={16} /> Home
          </Link>
          <Link href="/account/orders" className="btn-outline flex-1 py-3 text-sm justify-center">
            My Orders
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}
