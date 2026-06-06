'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanQrCode, Search, Banknote, CheckCircle, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { parseOrderNumberFromScan } from '@/lib/parseOrderScan';
import { getPaymentStatusLabel } from '@/lib/receipt';

type AdminOrder = {
  id: string;
  orderNumber: string;
  orderMode: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  total: number;
  guestName?: string | null;
  guestPhone?: string | null;
  store?: { name: string };
  items?: { productName: string; quantity: number; totalPrice: number }[];
};

type Props = {
  adminFetch: (endpoint: string, options?: RequestInit) => Promise<{ data?: AdminOrder; message?: string; success?: boolean }>;
  onComplete?: () => void;
};

export default function AdminTakeawayScanner({ adminFetch, onComplete }: Props) {
  const [scanning, setScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const scannerRef = useRef<{ clear: () => Promise<void> } | null>(null);
  const lastScanRef = useRef('');

  const loadOrder = useCallback(
    async (raw: string) => {
      const orderNumber = parseOrderNumberFromScan(raw);
      if (!orderNumber) {
        toast.error('Could not read order number from scan');
        return;
      }
      if (lastScanRef.current === orderNumber && order?.orderNumber === orderNumber) return;
      lastScanRef.current = orderNumber;

      setLoading(true);
      try {
        const res = await adminFetch(`/orders/${encodeURIComponent(orderNumber)}`);
        const data = res.data;
        if (!data) throw new Error(res.message || 'Order not found');

        if (data.orderMode !== 'TAKEAWAY') {
          toast.error('This order is delivery — use status update instead');
          setOrder(data);
          return;
        }

        setOrder(data);
        toast.success(`Order #${data.orderNumber} loaded`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to load order';
        toast.error(msg);
        setOrder(null);
      } finally {
        setLoading(false);
      }
    },
    [adminFetch, order?.orderNumber]
  );

  useEffect(() => {
    if (!scanning) return;

    let cancelled = false;

    void import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
      if (cancelled) return;

      const scanner = new Html5QrcodeScanner(
        'admin-qr-reader',
        { fps: 8, qrbox: { width: 220, height: 220 }, aspectRatio: 1 },
        false
      );
      scannerRef.current = scanner;

      scanner.render(
        (decoded) => {
          void loadOrder(decoded);
        },
        () => {}
      );
    });

    return () => {
      cancelled = true;
      void scannerRef.current?.clear().catch(() => {});
      scannerRef.current = null;
    };
  }, [scanning, loadOrder]);

  function clearOrder() {
    setOrder(null);
    lastScanRef.current = '';
    setManualInput('');
  }

  async function collectPayment() {
    if (!order) return;
    setActionLoading(true);
    try {
      const res = await adminFetch(`/orders/${order.id}/collect-payment`, { method: 'POST', body: '{}' });
      if (!res.data) throw new Error(res.message || 'Failed');
      setOrder({ ...order, paymentStatus: 'PAID' });
      toast.success('Payment marked as collected');
      onComplete?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function completePickup(collectPayment: boolean) {
    if (!order) return;
    setActionLoading(true);
    try {
      const res = await adminFetch(`/orders/${order.id}/complete-takeaway`, {
        method: 'POST',
        body: JSON.stringify({ collectPayment }),
      });
      if (!res.data) throw new Error(res.message || 'Failed');
      toast.success(collectPayment ? 'Order completed & paid!' : 'Order completed!');
      clearOrder();
      onComplete?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not complete order');
    } finally {
      setActionLoading(false);
    }
  }

  const isPaid = order?.paymentStatus === 'PAID';
  const isCompleted = order?.status === 'DELIVERED' || order?.status === 'CANCELLED';

  return (
    <div className="admin-takeaway-scanner card p-4 sm:p-5 mb-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ScanQrCode size={20} className="text-brand" />
            Takeaway counter
          </h2>
          <p className="text-muted text-xs mt-1">
            Scan customer QR or enter order # to collect payment & complete pickup
          </p>
        </div>
        <button
          type="button"
          onClick={() => setScanning((v) => !v)}
          className={`btn-outline text-xs px-3 py-2 shrink-0 ${scanning ? 'border-brand text-brand' : ''}`}
        >
          {scanning ? 'Stop camera' : 'Open scanner'}
        </button>
      </div>

      {scanning && (
        <div className="admin-takeaway-scanner__camera mb-4 rounded-xl overflow-hidden border border-navy-border bg-black/40">
          <div id="admin-qr-reader" className="admin-takeaway-scanner__reader" />
        </div>
      )}

      <form
        className="flex gap-2 mb-4"
        onSubmit={(e) => {
          e.preventDefault();
          void loadOrder(manualInput);
        }}
      >
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Order # e.g. BC250605-1234"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-navy-light border border-navy-border text-white text-sm outline-none focus:border-brand"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary px-4 py-2.5 text-sm shrink-0">
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Find'}
        </button>
      </form>

      <AnimatePresence mode="wait">
        {order && (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="admin-takeaway-scanner__order rounded-xl border border-navy-border bg-navy-light/50 p-4"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <p className="font-mono font-bold text-white text-sm">#{order.orderNumber}</p>
                <p className="text-muted text-xs mt-0.5">
                  {order.store?.name || 'Store'}
                  {order.guestName ? ` · ${order.guestName}` : ''}
                  {order.guestPhone ? ` · ${order.guestPhone}` : ''}
                </p>
              </div>
              <button type="button" onClick={clearOrder} className="text-muted hover:text-white p-1" aria-label="Clear">
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 text-xs mb-3">
              <span className="px-2 py-1 rounded-lg bg-navy-card text-white font-semibold">{order.status}</span>
              <span className={`px-2 py-1 rounded-lg font-semibold ${isPaid ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                {getPaymentStatusLabel(order as never)}
              </span>
              <span className="px-2 py-1 rounded-lg bg-brand/20 text-brand font-bold">
                LKR {order.total?.toLocaleString()}
              </span>
            </div>

            {order.items && order.items.length > 0 && (
              <ul className="text-xs text-muted space-y-1 mb-4 border-t border-navy-border pt-3">
                {order.items.map((item, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="text-white">{item.productName} ×{item.quantity}</span>
                    <span>LKR {item.totalPrice?.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}

            {order.orderMode !== 'TAKEAWAY' ? (
              <p className="text-xs text-yellow-400">Delivery order — complete via status dropdown below.</p>
            ) : isCompleted ? (
              <p className="text-xs text-green-400 flex items-center gap-1">
                <CheckCircle size={14} /> This order is already completed.
              </p>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                {!isPaid && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => void collectPayment()}
                    className="btn-outline flex-1 py-2.5 text-xs flex items-center justify-center gap-1.5"
                  >
                    <Banknote size={14} />
                    Collect LKR {order.total?.toLocaleString()}
                  </button>
                )}
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => void completePickup(!isPaid)}
                  className="btn-primary flex-1 py-2.5 text-xs flex items-center justify-center gap-1.5"
                >
                  {actionLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle size={14} />
                  )}
                  {isPaid ? 'Complete pickup' : 'Pay & complete'}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
