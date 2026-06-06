'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { RefreshCw, Download, MapPin, ExternalLink, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminTakeawayScanner from '@/components/admin/AdminTakeawayScanner';
import AdminTakeawayQueuePanel from '@/components/admin/AdminTakeawayQueuePanel';
import { getPaymentStatusLabel } from '@/lib/receipt';

async function adminFetch(endpoint: string, options?: RequestInit) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('bc_admin_token') : '';
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options?.headers || {}) },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Request failed');
  return json;
}

const STATUSES = ['RECEIVED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
const STATUS_COLORS: Record<string, string> = {
  RECEIVED: 'text-blue-400', PREPARING: 'text-yellow-400', READY: 'text-green-400',
  OUT_FOR_DELIVERY: 'text-orange-400', DELIVERED: 'text-green-400', CANCELLED: 'text-red-400',
};

export default function AdminOrdersPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-orders', statusFilter, page],
    queryFn: () => adminFetch(`/orders?${statusFilter ? `status=${statusFilter}&` : ''}page=${page}&limit=20`),
    refetchInterval: 15000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminFetch(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-orders'] }); toast.success('Status updated'); },
    onError: (e: any) => toast.error(e.message || 'Failed'),
  });

  const orders = (data as any)?.data || [];
  const meta = (data as any)?.meta || {};

  function deliveryLocation(order: {
    orderMode: string;
    deliveryAddressLine?: string | null;
    deliveryLat?: number | null;
    deliveryLng?: number | null;
    address?: { addressLine: string; lat?: number | null; lng?: number | null } | null;
  }) {
    const line = order.deliveryAddressLine || order.address?.addressLine;
    const lat = order.deliveryLat ?? order.address?.lat;
    const lng = order.deliveryLng ?? order.address?.lng;
    return { line, lat, lng };
  }

  function exportCsv() {
    const headers = 'Order Number,Mode,Store,Delivery Location,Total,Status,Date\n';
    const rows = orders.map((o: any) => {
      const loc = deliveryLocation(o);
      return `${o.orderNumber},${o.orderMode},${o.store?.name},"${loc.line || ''}",${o.total},${o.status},${new Date(o.createdAt).toLocaleDateString()}`;
    }).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'orders.csv'; a.click();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Orders</h1>
          <p className="text-muted text-sm mt-0.5">{meta.total || 0} total orders</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-outline p-2.5"><RefreshCw size={15} /></button>
          <button onClick={exportCsv} className="btn-outline px-3 py-2.5 text-sm flex items-center gap-1.5">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      <AdminTakeawayScanner
        adminFetch={adminFetch}
        onComplete={() => qc.invalidateQueries({ queryKey: ['admin-orders'] })}
      />

      <AdminTakeawayQueuePanel adminFetch={adminFetch} />

      {/* Status filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button onClick={() => setStatusFilter('')}
          className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${!statusFilter ? 'bg-brand text-white border-brand' : 'border-navy-border text-muted'}`}>
          All
        </button>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${statusFilter === s ? 'bg-brand text-white border-brand' : 'border-navy-border text-muted'}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted">Loading orders...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-border">
                  {['Order #', 'Mode', 'Store', 'Delivery / Location', 'Items', 'Total', 'Payment', 'Status', 'Time', 'Receipt', 'Update Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-muted text-xs font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order: any) => (
                  <tr key={order.id} className="border-b border-navy-border hover:bg-navy-light/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-white text-xs">{order.orderNumber}</td>
                    <td className="px-4 py-3 text-muted text-xs">{order.orderMode === 'DELIVERY' ? '🛵' : '🛍'}</td>
                    <td className="px-4 py-3 text-muted text-xs">{order.store?.name}</td>
                    <td className="px-4 py-3 text-xs max-w-[220px]">
                      {order.orderMode === 'DELIVERY' ? (() => {
                        const loc = deliveryLocation(order);
                        if (!loc.line) return <span className="text-muted">—</span>;
                        return (
                          <div className="space-y-1">
                            <p className="text-white line-clamp-2 flex items-start gap-1">
                              <MapPin size={12} className="text-brand shrink-0 mt-0.5" />
                              {loc.line}
                            </p>
                            {loc.lat != null && loc.lng != null && (
                              <a
                                href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-brand hover:underline"
                              >
                                Open map <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        );
                      })() : (
                        <span className="text-muted">Pickup · {order.pickupTime || 'ASAP'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">{order.items?.length || 0}</td>
                    <td className="px-4 py-3 text-brand font-semibold text-xs">LKR {order.total?.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${order.paymentStatus === 'PAID' ? 'text-green-400' : 'text-yellow-400'}`}>
                        {getPaymentStatusLabel(order)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold ${STATUS_COLORS[order.status] || 'text-muted'}`}>{order.status}</span>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">
                      {new Date(order.createdAt).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`/order/${order.orderNumber}/receipt`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
                      >
                        <Receipt size={12} /> View
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        defaultValue={order.status}
                        onChange={(e) => updateStatus.mutate({ id: order.id, status: e.target.value })}
                        className="text-xs bg-navy-light border border-navy-border rounded-lg px-2 py-1.5 text-white outline-none focus:border-brand"
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta.pages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-navy-border">
            <p className="text-xs text-muted">Page {page} of {meta.pages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-outline px-3 py-1.5 text-xs">Prev</button>
              <button onClick={() => setPage((p) => Math.min(meta.pages, p + 1))} disabled={page === meta.pages} className="btn-outline px-3 py-1.5 text-xs">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
