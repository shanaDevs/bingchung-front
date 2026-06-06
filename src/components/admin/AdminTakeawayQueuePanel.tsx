'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronUp, ChevronDown, Clock, ListOrdered, Loader2, Store } from 'lucide-react';
import toast from 'react-hot-toast';

type QueueOrder = {
  id: string;
  orderNumber: string;
  status: string;
  storeId?: string;
  queuePosition: number | null;
  scheduledPickupAt: string | null;
  total: number;
  guestName?: string | null;
  store?: { id: string; name: string };
  items?: { productName: string; quantity: number }[];
};

const STATUSES = ['RECEIVED', 'PREPARING', 'READY'];

type Props = {
  adminFetch: (endpoint: string, options?: RequestInit) => Promise<{ data?: QueueOrder[] }>;
};

function formatPickup(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });
}

function resolveStoreId(order: QueueOrder): string {
  return order.storeId || order.store?.id || 'unknown';
}

function resolveStoreName(order: QueueOrder): string {
  return order.store?.name?.replace('Bing Chun - ', '') || 'Branch';
}

function groupByStore(queue: QueueOrder[]) {
  const groups = new Map<string, { storeName: string; orders: QueueOrder[] }>();
  for (const order of queue) {
    const storeId = resolveStoreId(order);
    if (!groups.has(storeId)) {
      groups.set(storeId, { storeName: resolveStoreName(order), orders: [] });
    }
    groups.get(storeId)!.orders.push(order);
  }
  return [...groups.entries()];
}

export default function AdminTakeawayQueuePanel({ adminFetch }: Props) {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: queue = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-takeaway-queue'],
    queryFn: async () => {
      const res = await adminFetch('/orders/takeaway-queue');
      return (res.data || []) as QueueOrder[];
    },
    refetchInterval: 12000,
  });

  const reorder = useMutation({
    mutationFn: ({ storeId, orderIds }: { storeId: string; orderIds: string[] }) =>
      adminFetch('/orders/takeaway-queue/reorder', {
        method: 'PUT',
        body: JSON.stringify({ storeId, orderIds }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-takeaway-queue'] });
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Queue updated');
    },
    onError: (e: Error) => toast.error(e.message || 'Reorder failed'),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminFetch(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-takeaway-queue'] });
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Status updated');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed'),
  });

  function moveOrder(storeId: string, storeOrders: QueueOrder[], index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= storeOrders.length) return;
    const ids = storeOrders.map((o) => o.id);
    [ids[index], ids[next]] = [ids[next], ids[index]];
    reorder.mutate({ storeId, orderIds: ids });
  }

  const storeGroups = groupByStore(queue);

  return (
    <div className="admin-takeaway-queue card p-4 sm:p-5 mb-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ListOrdered size={20} className="text-brand" />
            Takeaway pickup queue
          </h2>
          <p className="text-muted text-xs mt-1">
            15 min per order · reorder within each branch · update prep status
          </p>
        </div>
        <button type="button" onClick={() => refetch()} className="btn-outline text-xs px-3 py-2">
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-muted text-sm flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin" /> Loading queue…
        </div>
      ) : queue.length === 0 ? (
        <p className="text-muted text-sm text-center py-6">No active takeaway orders in queue</p>
      ) : (
        <div className="space-y-5">
          {storeGroups.map(([storeId, { storeName, orders }]) => (
            <div key={storeId}>
              {storeGroups.length > 1 && (
                <p className="text-xs font-semibold text-brand mb-2 flex items-center gap-1.5">
                  <Store size={13} />
                  {storeName}
                  <span className="text-muted font-normal">({orders.length} in queue)</span>
                </p>
              )}
              <div className="space-y-2">
                {orders.map((order, index) => (
                  <div
                    key={order.id}
                    className="admin-takeaway-queue__row flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-navy-border bg-navy-light/40"
                  >
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="admin-takeaway-queue__num w-9 h-9 rounded-full bg-brand text-white font-bold text-sm flex items-center justify-center">
                        {order.queuePosition ?? index + 1}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          disabled={index === 0 || reorder.isPending}
                          onClick={() => moveOrder(storeId, orders, index, -1)}
                          className="p-0.5 text-muted hover:text-white disabled:opacity-30"
                          aria-label="Move up"
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          type="button"
                          disabled={index === orders.length - 1 || reorder.isPending}
                          onClick={() => moveOrder(storeId, orders, index, 1)}
                          className="p-0.5 text-muted hover:text-white disabled:opacity-30"
                          aria-label="Move down"
                        >
                          <ChevronDown size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-white text-sm font-semibold">#{order.orderNumber}</p>
                      <p className="text-muted text-xs truncate">
                        {order.guestName || 'Guest'} · LKR {order.total?.toLocaleString()}
                        {order.items?.length
                          ? ` · ${order.items.map((i) => `${i.productName}×${i.quantity}`).join(', ')}`
                          : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-brand shrink-0">
                      <Clock size={13} />
                      <span className="font-semibold">{formatPickup(order.scheduledPickupAt)}</span>
                    </div>

                    <select
                      value={order.status}
                      disabled={busyId === order.id || updateStatus.isPending}
                      onChange={(e) => {
                        setBusyId(order.id);
                        updateStatus.mutate(
                          { id: order.id, status: e.target.value },
                          { onSettled: () => setBusyId(null) }
                        );
                      }}
                      className="text-xs bg-navy-card border border-navy-border rounded-lg px-2 py-2 text-white outline-none focus:border-brand shrink-0"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
