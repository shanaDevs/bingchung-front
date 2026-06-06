'use client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ShoppingBag, Users, TrendingUp, AlertCircle, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAdminSession, getBranchWalletPath, isBranchAdmin, type AdminSession } from '@/lib/adminAuth';

function adminApi<T>(endpoint: string): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('bc_admin_token') : '';
  return fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json()).then((d) => d.data);
}

export default function AdminDashboard() {
  const [admin, setAdmin] = useState<AdminSession | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('bc_admin');
    if (raw) setAdmin(JSON.parse(raw));
  }, []);

  const branchMode = isBranchAdmin(admin);
  const branchWalletHref = branchMode && admin ? getBranchWalletPath(admin) ?? '/admin/wallets' : '/admin/wallets';

  const { data: stats } = useQuery<any>({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi('/admin/dashboard'),
    refetchInterval: 30000,
  });

  const { data: recentOrders } = useQuery<any>({
    queryKey: ['admin-orders-recent'],
    queryFn: () => adminApi('/orders?limit=10'),
    refetchInterval: 15000,
  });

  const { data: walletOverview } = useQuery<{ totalSystemBalance: number }>({
    queryKey: ['wallet-overview-dash'],
    queryFn: () => adminApi('/admin/wallets/overview'),
    refetchInterval: 60000,
  });

  const cards = [
    { label: branchMode ? "Today's Branch Orders" : "Today's Orders", value: stats?.todayOrders ?? '—', icon: ShoppingBag, color: '#307ef2', href: '/admin/orders' },
    { label: branchMode ? 'Branch Wallet' : 'System Wallet', value: walletOverview?.totalSystemBalance != null ? `LKR ${walletOverview.totalSystemBalance.toLocaleString()}` : '—', icon: Wallet, color: '#a78bfa', href: branchWalletHref },
    { label: branchMode ? "Branch Revenue" : "Today's Revenue", value: stats?.todayRevenue ? `LKR ${stats.todayRevenue.toLocaleString()}` : '—', icon: TrendingUp, color: '#4ade80', href: branchMode ? branchWalletHref : '/admin/reports' },
    ...(branchMode ? [] : [{ label: 'Staff Accounts', value: 'Register & manage', icon: Users, color: '#60a5fa', href: '/admin/users' }]),
    { label: 'Active Orders', value: stats?.activeOrders ?? '—', icon: AlertCircle, color: '#facc15', href: '/admin/orders' },
  ];

  const STATUS_COLORS: Record<string, string> = {
    RECEIVED: 'text-blue-400', PREPARING: 'text-yellow-400',
    READY: 'text-green-400', OUT_FOR_DELIVERY: 'text-orange-400',
    DELIVERED: 'text-green-400', CANCELLED: 'text-red-400',
  };

  const orders = (recentOrders as any)?.data || [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-muted text-sm mt-1">
          {branchMode && admin?.storeName
            ? `${admin.storeName.replace('Bing Chun - ', '')} branch overview`
            : 'Welcome to Bing Chun Admin Panel'}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {cards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Link href={card.href} className="card p-5 flex items-center gap-4 hover:border-brand transition-all group block">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${card.color}20` }}>
                <card.icon size={22} style={{ color: card.color }} />
              </div>
              <div>
                <p className="text-muted text-xs font-medium">{card.label}</p>
                <p className="text-white text-xl font-bold mt-0.5">{card.value}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Live orders table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-navy-border">
          <h3 className="font-semibold text-white">Live Orders</h3>
          <Link href="/admin/orders" className="text-brand text-sm hover:text-brand-light">View All →</Link>
        </div>
        <div className="overflow-x-auto">
          {orders.length === 0 ? (
            <div className="text-center py-12 text-muted">
              <ShoppingBag size={32} className="mx-auto mb-3 opacity-40" />
              <p>No orders yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-border text-left">
                  <th className="px-5 py-3 text-muted text-xs font-medium">Order</th>
                  <th className="px-5 py-3 text-muted text-xs font-medium">Mode</th>
                  <th className="px-5 py-3 text-muted text-xs font-medium">Store</th>
                  <th className="px-5 py-3 text-muted text-xs font-medium">Total</th>
                  <th className="px-5 py-3 text-muted text-xs font-medium">Status</th>
                  <th className="px-5 py-3 text-muted text-xs font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order: any) => (
                  <tr key={order.id} className="border-b border-navy-border hover:bg-navy-light/50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-white font-mono text-xs">{order.orderNumber}</p>
                      <p className="text-muted text-xs">{new Date(order.createdAt).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="px-5 py-3 text-muted text-xs">{order.orderMode === 'DELIVERY' ? '🛵' : '🛍'} {order.orderMode}</td>
                    <td className="px-5 py-3 text-muted text-xs">{order.store?.name}</td>
                    <td className="px-5 py-3 text-brand font-semibold text-xs">LKR {order.total?.toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold ${STATUS_COLORS[order.status] || 'text-muted'}`}>{order.status}</span>
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/admin/orders?id=${order.id}`} className="text-xs text-brand hover:text-brand-light">Manage</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
