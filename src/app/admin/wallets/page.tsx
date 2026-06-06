'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Wallet,
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  Building2,
  Clock,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  adminWalletFetch,
  buildWalletQuery,
  formatWalletMoney,
  getDateRangeForPreset,
  PERIOD_LABELS,
  toApiDateRange,
  type PeriodPreset,
  type WalletOverview,
} from '@/lib/walletReport';
import { getAdminSession, getBranchWalletPath, isBranchAdmin, isSuperAdmin } from '@/lib/adminAuth';

export default function AdminWalletsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [adminUser] = useState(getAdminSession);
  const [period, setPeriod] = useState<PeriodPreset>('today');
  const [from, setFrom] = useState(() => getDateRangeForPreset('today').from);
  const [to, setTo] = useState(() => getDateRangeForPreset('today').to);

  useEffect(() => {
    const session = getAdminSession();
    if (session && isBranchAdmin(session)) {
      const walletPath = getBranchWalletPath(session);
      if (walletPath) {
        router.replace(walletPath);
        return;
      }
      router.replace('/admin/orders');
    }
  }, [router]);

  const superAdmin = isSuperAdmin(adminUser);
  const { from: dateFrom, to: dateTo } = toApiDateRange(from, to);

  function applyPeriod(p: PeriodPreset) {
    setPeriod(p);
    const range = getDateRangeForPreset(p);
    setFrom(range.from);
    setTo(range.to);
  }

  const { data: overview, isLoading, refetch } = useQuery<WalletOverview>({
    queryKey: ['wallet-overview', from, to],
    queryFn: () =>
      adminWalletFetch(`/admin/wallets/overview${buildWalletQuery({ from: dateFrom, to: dateTo })}`),
    enabled: superAdmin,
  });

  const branches = overview?.branches ?? [];

  async function syncFromOrders() {
    try {
      const result = await adminWalletFetch('/admin/wallets/sync-from-orders', {
        method: 'POST',
        body: '{}',
      });
      toast.success(result.message || 'Wallet synced from orders');
      queryClient.invalidateQueries({ queryKey: ['wallet-overview'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed');
    }
  }

  function exportCsv() {
    const rows = branches.map((b) =>
      [
        b.storeName.replace('Bing Chun - ', ''),
        b.district,
        b.balance,
        b.periodCredits,
        b.periodDebits,
        b.transactionCount,
      ].join(','),
    );
    const header = 'Branch,District,Balance,Period Credits,Period Debits,Transactions';
    const blob = new Blob([`${header}\n${rows.join('\n')}`], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bingchun-branches-wallet-${from}-${to}.csv`;
    a.click();
    toast.success('CSV exported');
  }

  function exportPdf() {
    const win = window.open('', '_blank');
    if (!win) {
      toast.error('Allow pop-ups to export PDF');
      return;
    }
    const rows = branches
      .map(
        (b) => `<tr>
          <td>${b.storeName.replace('Bing Chun - ', '')}</td>
          <td>${b.district}</td>
          <td>${formatWalletMoney(b.balance)}</td>
          <td>${formatWalletMoney(b.periodCredits)}</td>
          <td>${formatWalletMoney(b.periodDebits)}</td>
          <td>${b.transactionCount}</td>
        </tr>`,
      )
      .join('');
    win.document.write(`<!DOCTYPE html><html><head><title>Branch Wallets</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border-bottom: 1px solid #eee; padding: 8px; text-align: left; }
      </style></head><body>
      <h1>Branch Wallet Summary — ${PERIOD_LABELS[period]}</h1>
      <p>${from} to ${to}</p>
      <table><thead><tr><th>Branch</th><th>District</th><th>Balance</th><th>Credits</th><th>Debits</th><th>Tx</th></tr></thead><tbody>${rows}</tbody></table>
      <script>window.onload=()=>window.print()</script></body></html>`);
    win.document.close();
  }

  if (!superAdmin) {
    return <div className="py-16 text-center text-muted text-sm">Redirecting to your branch wallet…</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet size={24} className="text-brand" />
            System Wallet
          </h1>
          <p className="text-muted text-sm mt-1">
            Click a branch to view detailed wallet, reporting, and exports
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={syncFromOrders} className="btn-outline px-3 py-2 text-sm flex items-center gap-1.5">
            <RefreshCw size={14} /> Sync from Orders
          </button>
          <button type="button" onClick={() => refetch()} className="btn-outline px-3 py-2 text-sm flex items-center gap-1.5">
            <RefreshCw size={14} /> Refresh
          </button>
          <button type="button" onClick={exportCsv} className="btn-outline px-3 py-2 text-sm flex items-center gap-1.5">
            <Download size={14} /> Export CSV
          </button>
          <button type="button" onClick={exportPdf} className="btn-primary px-3 py-2 text-sm flex items-center gap-1.5">
            <FileText size={14} /> Export PDF
          </button>
        </div>
      </div>

      <div className="card p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="min-w-[160px]">
          <p className="text-xs text-muted mb-1">Period</p>
          <select
            className="input-field text-sm py-2 w-full"
            value={period}
            onChange={(e) => applyPeriod(e.target.value as PeriodPreset)}
          >
            {(Object.keys(PERIOD_LABELS) as PeriodPreset[]).map((p) => (
              <option key={p} value={p}>
                {PERIOD_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="text-xs text-muted mb-1">From</p>
          <input type="date" className="input-field text-sm py-2" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <p className="text-xs text-muted mb-1">To</p>
          <input type="date" className="input-field text-sm py-2" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-brand-subtle">
            <Wallet size={22} className="text-brand" />
          </div>
          <div>
            <p className="text-muted text-xs">Total Balance</p>
            <p className="text-white text-xl font-bold">{formatWalletMoney(overview?.totalSystemBalance ?? 0)}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-500/15">
            <TrendingUp size={22} className="text-green-400" />
          </div>
          <div>
            <p className="text-muted text-xs">Period Credits</p>
            <p className="text-white text-xl font-bold">{formatWalletMoney(overview?.periodCredits ?? 0)}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-red-500/15">
            <TrendingDown size={22} className="text-red-400" />
          </div>
          <div>
            <p className="text-muted text-xs">Period Debits</p>
            <p className="text-white text-xl font-bold">{formatWalletMoney(overview?.periodDebits ?? 0)}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-500/15">
            <Clock size={22} className="text-amber-400" />
          </div>
          <div>
            <p className="text-muted text-xs">Pending Orders</p>
            <p className="text-white text-xl font-bold">{formatWalletMoney(overview?.pendingOrderValue ?? 0)}</p>
            <p className="text-muted text-xs">{overview?.pendingOrderCount ?? 0} unpaid</p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-navy-border flex items-center gap-2">
          <Building2 size={18} className="text-brand" />
          <h3 className="font-semibold text-white">All Branches</h3>
          <span className="text-muted text-xs ml-auto">{PERIOD_LABELS[period]} · {branches.length} branches</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-border">
                {['Branch', 'District', 'Balance', 'Credits', 'Debits', 'Transactions', ''].map((h) => (
                  <th key={h || 'action'} className="px-4 py-3 text-left text-muted text-xs">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted">
                    Loading…
                  </td>
                </tr>
              ) : (
                branches.map((b) => (
                  <tr key={b.storeId} className="border-b border-navy-border hover:bg-navy-light/30 group">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/wallets/${b.storeId}`}
                        className="text-brand font-semibold hover:text-brand-light inline-flex items-center gap-1 transition-colors"
                      >
                        {b.storeName.replace('Bing Chun - ', '')}
                        <ChevronRight size={14} className="opacity-60 group-hover:opacity-100" />
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">{b.district}</td>
                    <td className="px-4 py-3 text-white font-bold">{formatWalletMoney(b.balance)}</td>
                    <td className="px-4 py-3 text-green-400">{formatWalletMoney(b.periodCredits)}</td>
                    <td className="px-4 py-3 text-red-400">{formatWalletMoney(b.periodDebits)}</td>
                    <td className="px-4 py-3 text-muted">{b.transactionCount}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/wallets/${b.storeId}`}
                        className="btn-outline px-3 py-1.5 text-xs inline-flex items-center gap-1"
                      >
                        View details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
