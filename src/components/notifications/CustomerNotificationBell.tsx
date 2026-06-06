'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Check, Package } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { OrderStatus } from '@/types';
import type { CustomerNotificationPayload } from '@/hooks/useCustomerSocket';

interface CustomerNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  orderId?: string | null;
  orderNumber?: string | null;
  status?: OrderStatus | null;
  read: boolean;
  createdAt: string;
}

export default function CustomerNotificationBell() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get<{ notifications: CustomerNotification[]; unreadCount: number }>(
        '/notifications?limit=25',
        true
      );
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch {
      /* optional */
    }
  }, [isAuthenticated]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const onNotify = (e: Event) => {
      const payload = (e as CustomEvent<CustomerNotificationPayload>).detail;
      setNotifications((prev) => [
        {
          id: payload.id,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          orderId: payload.orderId,
          orderNumber: payload.orderNumber,
          status: payload.status,
          read: false,
          createdAt: payload.createdAt,
        },
        ...prev,
      ].slice(0, 30));
      setUnreadCount((c) => c + 1);
    };
    window.addEventListener('bc-customer-notification', onNotify);
    return () => window.removeEventListener('bc-customer-notification', onNotify);
  }, []);

  async function markRead(id: string) {
    await api.patch(`/notifications/${id}/read`, {}, true);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAllRead() {
    await api.post('/notifications/read-all', {}, true);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  function openNotification(n: CustomerNotification) {
    void markRead(n.id);
    setOpen(false);
    if (n.orderNumber) {
      router.push(`/order/${n.orderNumber}`);
    } else {
      router.push('/account/orders');
    }
  }

  if (!isAuthenticated) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-10 h-10 rounded-xl border border-navy-border text-fg hover:border-brand hover:bg-brand-subtle transition-colors"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="customer-notif-badge absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[55]"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />
          <div className="customer-notif-panel absolute right-0 top-12 w-[min(92vw,320px)] card shadow-2xl z-[60] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-navy-border">
              <p className="font-semibold text-fg text-sm">Notifications</p>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="text-xs text-brand hover:underline flex items-center gap-1"
                >
                  <Check size={12} /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-muted text-center py-8 px-4">No notifications yet</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => openNotification(n)}
                    className={`w-full text-left px-4 py-3 border-b border-navy-border last:border-0 hover:bg-brand-subtle transition-colors ${
                      !n.read ? 'bg-brand-subtle/40' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Package size={14} className="text-brand shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-fg">{n.title}</p>
                        <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-muted mt-1">
                          {new Date(n.createdAt).toLocaleString('en-LK', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-brand shrink-0 mt-1.5" />}
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="p-3 border-t border-navy-border">
              <Link
                href="/account/orders"
                onClick={() => setOpen(false)}
                className="text-xs text-brand hover:underline font-medium"
              >
                View all orders →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
