'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, TrendingUp, Package, ShoppingBag } from 'lucide-react';

function adminFetch(endpoint: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('bc_admin_token') : '';
  return fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json()).then((d) => d.data ?? d);
}

export default function AdminReportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: salesData, refetch } = useQuery<any>({
    queryKey: ['sales-report', from, to],
    queryFn: () => adminFetch(`/admin/reports/sales${from ? `?from=${from}T00:00:00.000Z` : ''}${to ? `&to=${to}T23:59:59.000Z` : ''}`),
  });

  const { data: topProducts = [] } = useQuery<any[]>({
    queryKey: ['top-products'],
    queryFn: () => adminFetch('/admin/reports/top-products'),
  });

  const orders = salesData?.orders || [];
  const totalRevenue = salesData?.totalRevenue || 0;
  const byMode = salesData?.byMode || {};

  function exportSales() {
    const rows = orders.map((o: any) => `${o.orderNumber},${o.orderMode},${o.store?.name},${o.total},${new Date(o.createdAt).toLocaleDateString()}`).join('\n');
    const blob = new Blob([`Order,Mode,Store,Total,Date\n${rows}`], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sales-report.csv'; a.click();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports & Analytics</h1>
          <p className="text-muted text-sm">Sales data and insights</p>
        </div>
        <button onClick={exportSales} className="btn-outline px-4 py-2.5 text-sm flex items-center gap-1.5">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Date filter */}
      <div className="card p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <p className="text-xs text-muted mb-1">From</p>
          <input type="date" className="input-field text-sm py-2" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <p className="text-xs text-muted mb-1">To</p>
          <input type="date" className="input-field text-sm py-2" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button onClick={() => refetch()} className="btn-primary px-5 py-2.5 text-sm">Apply</button>
      </div>

      {/* Summary stats */}
      <div className="grid sm:grid-cols-3 gap-5 mb-8">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-brand-subtle)' }}>
            <TrendingUp size={22} className="text-brand" />
          </div>
          <div>
            <p className="text-muted text-xs">Total Revenue</p>
            <p className="text-white text-xl font-bold">LKR {totalRevenue.toLocaleString()}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(96,165,250,0.15)' }}>
            <ShoppingBag size={22} className="text-blue-400" />
          </div>
          <div>
            <p className="text-muted text-xs">Total Orders</p>
            <p className="text-white text-xl font-bold">{salesData?.count || 0}</p>
          </div>
        </div>
        <div className="card p-5">
          <p className="text-muted text-xs mb-2">By Mode</p>
          {Object.entries(byMode).map(([mode, rev]: any) => (
            <div key={mode} className="flex justify-between text-sm">
              <span className="text-muted">{mode === 'DELIVERY' ? '🛵' : '🛍'} {mode}</span>
              <span className="text-white font-medium">LKR {rev.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top products */}
      <div className="card overflow-hidden mb-6">
        <div className="p-5 border-b border-navy-border flex items-center gap-2">
          <Package size={18} className="text-brand" />
          <h3 className="font-semibold text-white">Top Selling Products</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-border">
              <th className="px-5 py-3 text-left text-muted text-xs">#</th>
              <th className="px-5 py-3 text-left text-muted text-xs">Product</th>
              <th className="px-5 py-3 text-left text-muted text-xs">Quantity Sold</th>
              <th className="px-5 py-3 text-left text-muted text-xs">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {(topProducts as any[]).map((p: any, i) => (
              <tr key={i} className="border-b border-navy-border hover:bg-navy-light/30">
                <td className="px-5 py-3 text-muted text-xs font-bold">{i + 1}</td>
                <td className="px-5 py-3 text-white text-sm">{p.productName}</td>
                <td className="px-5 py-3 text-brand font-semibold text-sm">{p._sum?.quantity || 0}</td>
                <td className="px-5 py-3 text-muted text-xs">LKR {(p._sum?.totalPrice || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Orders list */}
      {orders.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-navy-border">
            <h3 className="font-semibold text-white">Orders in Period</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-border">
                  {['Order #', 'Mode', 'Store', 'Total', 'Date'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-muted text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o: any) => (
                  <tr key={o.id} className="border-b border-navy-border hover:bg-navy-light/30">
                    <td className="px-4 py-3 font-mono text-xs text-white">{o.orderNumber}</td>
                    <td className="px-4 py-3 text-muted text-xs">{o.orderMode}</td>
                    <td className="px-4 py-3 text-muted text-xs">{o.store?.name}</td>
                    <td className="px-4 py-3 text-brand font-semibold text-xs">LKR {o.total.toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted text-xs">{new Date(o.createdAt).toLocaleDateString('en-LK')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
