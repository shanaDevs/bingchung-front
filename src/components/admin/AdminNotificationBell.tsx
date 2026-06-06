'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Check } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import type { AdminSession } from '@/lib/adminAuth';

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  orderId?: string | null;
  read: boolean;
  createdAt: string;
}

function adminFetch(endpoint: string, options?: RequestInit) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('bc_admin_token') : '';
  return fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  }).then(async (r) => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.message || 'Request failed');
    return data;
  });
}

export default function AdminNotificationBell({ adminUser }: { adminUser: AdminSession | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    if (!adminUser) return;
    try {
      const res = await adminFetch('/admin/notifications?limit=20');
      setNotifications(res.data?.notifications || []);
      setUnreadCount(res.data?.unreadCount || 0);
    } catch {
      /* ignore */
    }
  }, [adminUser]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!adminUser) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
    let socket: Socket | null = null;

    try {
      socket = io(socketUrl, { transports: ['websocket', 'polling'] });
      socket.emit('joinAdmin', {
        adminId: adminUser.id,
        storeId: adminUser.storeId || undefined,
      });

      socket.on('adminNotification', (payload: AdminNotification) => {
        setNotifications((prev) => [payload, ...prev].slice(0, 30));
        setUnreadCount((c) => c + 1);
        toast.success(payload.title, { duration: 5000 });
      });

      socket.on('storeNewOrder', () => {
        load();
      });
    } catch {
      /* socket optional */
    }

    return () => {
      socket?.disconnect();
    };
  }, [adminUser, load]);

  async function markRead(id: string) {
    await adminFetch(`/admin/notifications/${id}/read`, { method: 'PATCH' });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAllRead() {
    await adminFetch('/admin/notifications/read-all', { method: 'POST' });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  function openOrder(n: AdminNotification) {
    if (!n.read) markRead(n.id);
    setOpen(false);
    if (n.orderId) {
      router.push('/admin/orders');
    }
  }

  if (!adminUser) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2.5 rounded-xl border border-navy-border text-muted hover:text-white hover:border-brand transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-brand text-white text-[10px] font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-[min(100vw-2rem,320px)] card p-0 overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-navy-border">
              <p className="text-sm font-semibold text-white">Notifications</p>
              {unreadCount > 0 && (
                <button type="button" onClick={markAllRead} className="text-xs text-brand hover:underline flex items-center gap-1">
                  <Check size={12} /> Mark all read
                </button>
              )}
            </div>
            <ul className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <li className="px-4 py-6 text-center text-muted text-sm">No notifications yet</li>
              ) : (
                notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => openOrder(n)}
                      className={`w-full text-left px-4 py-3 border-b border-navy-border hover:bg-navy-light/50 transition-colors ${
                        !n.read ? 'bg-brand-subtle/30' : ''
                      }`}
                    >
                      <p className="text-sm font-medium text-white">{n.title}</p>
                      <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted mt-1">
                        {new Date(n.createdAt).toLocaleString('en-LK', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="px-4 py-2 border-t border-navy-border">
              <Link href="/admin/orders" onClick={() => setOpen(false)} className="text-xs text-brand hover:underline">
                View all orders →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
