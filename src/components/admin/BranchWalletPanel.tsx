'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Wallet,
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  Clock,
  RefreshCw,
  ArrowLeft,
  MapPin,
  Phone,
  ShoppingBag,
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
  type WalletTransaction,
  type WalletStore,
} from '@/lib/walletReport';

type Props = {
  storeId: string;
  superAdmin: boolean;
  showBackLink?: boolean;
  backHref?: string;
  backLabel?: string;
};

export default function BranchWalletPanel({
  storeId,
  superAdmin,
  showBackLink = true,
  backHref = '/admin/wallets',
  backLabel = 'All branches',
}: Props) {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<PeriodPreset>('today');
  const [from, setFrom] = useState(() => getDateRangeForPreset('today').from);
  const [to, setTo] = useState(() => getDateRangeForPreset('today').to);
  const [txType, setTxType] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutRef, setPayoutRef] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNote, setAdjustNote] = useState('');

  const { from: dateFrom, to: dateTo } = toApiDateRange(from, to);

  function applyPeriod(p: PeriodPreset) {
    setPeriod(p);
    const range = getDateRangeForPreset(p);
    setFrom(range.from);
    setTo(range.to);
  }

  const { data: store } = useQuery<WalletStore & { wallet?: { balance: number; updatedAt: string } }>({
    queryKey: ['wallet-store', storeId],
    queryFn: () => adminWalletFetch(`/admin/wallets/stores/${storeId}`),
  });

  const { data: overview, refetch } = useQuery<WalletOverview>({
    queryKey: ['wallet-overview', storeId, from, to],
    queryFn: () =>
      adminWalletFetch(
        `/admin/wallets/overview${buildWalletQuery({ from: dateFrom, to: dateTo, storeId })}`,
      ),
  });

  const { data: txData } = useQuery<{ transactions: WalletTransaction[]; total: number }>({
    queryKey: ['wallet-transactions', storeId, from, to, txType],
    queryFn: () =>
      adminWalletFetch(
        `/admin/wallets/transactions${buildWalletQuery({
          from: dateFrom,
          to: dateTo,
          storeId,
          type: txType || undefined,
        })}&limit=200`,
      ),
  });

  const transactions = txData?.transactions ?? [];
  const branchName = store?.name?.replace('Bing Chun - ', '') ?? 'Branch';

  function exportCsv() {
    const rows = transactions.map((tx) =>
      [
        new Date(tx.createdAt).toLocaleString('en-LK'),
        tx.typeLabel,
        tx.orderNumber || '',
        tx.paymentMethodLabel || '',
        tx.amount,
        tx.balanceAfter,
        (tx.description || tx.reference || '').replace(/,/g, ' '),
      ].join(','),
    );
    const header = 'Date,Type,Order,Payment Method,Amount,Balance After,Notes';
    const blob = new Blob([`${header}\n${rows.join('\n')}`], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bingchun-wallet-${branchName}-${from}-${to}.csv`;
    a.click();
    toast.success('CSV exported');
  }

  function exportPdf() {
    const win = window.open('', '_blank');
    if (!win) {
      toast.error('Allow pop-ups to export PDF');
      return;
    }

    const txRows = transactions
      .map(
        (tx) => `<tr>
          <td>${new Date(tx.createdAt).toLocaleString('en-LK')}</td>
          <td>${tx.typeLabel}</td>
          <td>${tx.orderNumber || '—'}</td>
          <td>${tx.paymentMethodLabel || '—'}</td>
          <td style="color:${tx.amount >= 0 ? '#16a34a' : '#dc2626'}">${formatWalletMoney(tx.amount)}</td>
          <td>${formatWalletMoney(tx.balanceAfter)}</td>
        </tr>`,
      )
      .join('');

    win.document.write(`<!DOCTYPE html><html><head><title>${branchName} Wallet</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #111; font-size: 12px; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        .meta { color: #666; margin-bottom: 20px; }
        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
        .stat { border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
        .stat label { display: block; font-size: 10px; color: #666; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border-bottom: 1px solid #eee; padding: 8px 6px; text-align: left; }
        th { font-size: 10px; text-transform: uppercase; color: #666; }
      </style></head><body>
      <h1>${branchName} — Branch Wallet</h1>
      <p class="meta">${PERIOD_LABELS[period]} · ${from} to ${to} · Generated ${new Date().toLocaleString('en-LK')}</p>
      <div class="stats">
        <div class="stat"><label>Balance</label><strong>${formatWalletMoney(overview?.totalSystemBalance ?? 0)}</strong></div>
        <div class="stat"><label>Credits</label><strong>${formatWalletMoney(overview?.periodCredits ?? 0)}</strong></div>
        <div class="stat"><label>Debits</label><strong>${formatWalletMoney(overview?.periodDebits ?? 0)}</strong></div>
        <div class="stat"><label>Paid Orders</label><strong>${overview?.periodOrders?.count ?? 0}</strong></div>
      </div>
      <table><thead><tr><th>Date</th><th>Type</th><th>Order</th><th>Method</th><th>Amount</th><th>Balance</th></tr></thead><tbody>${txRows}</tbody></table>
      <script>window.onload = () => { window.print(); };</script>
      </body></html>`);
    win.document.close();
  }

  async function syncFromOrders() {
    try {
      const result = await adminWalletFetch('/admin/wallets/sync-from-orders', {
        method: 'POST',
        body: JSON.stringify({ storeId }),
      });
      toast.success(result.message || 'Wallet synced from orders');
      queryClient.invalidateQueries({ queryKey: ['wallet-overview'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-store'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed');
    }
  }

  async function submitPayout(e: FormEvent) {
    e.preventDefault();
    if (!payoutAmount || !payoutRef) return;
    try {
      await adminWalletFetch(`/admin/wallets/${storeId}/payout`, {
        method: 'POST',
        body: JSON.stringify({ amount: Number(payoutAmount), reference: payoutRef }),
      });
      toast.success('Payout recorded');
      setPayoutAmount('');
      setPayoutRef('');
      queryClient.invalidateQueries({ queryKey: ['wallet-overview'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payout failed');
    }
  }

  async function submitAdjustment(e: FormEvent) {
    e.preventDefault();
    if (!adjustAmount || !adjustNote) return;
    try {
      await adminWalletFetch(`/admin/wallets/${storeId}/adjustment`, {
        method: 'POST',
        body: JSON.stringify({ amount: Number(adjustAmount), note: adjustNote }),
      });
      toast.success('Adjustment recorded');
      setAdjustAmount('');
      setAdjustNote('');
      queryClient.invalidateQueries({ queryKey: ['wallet-overview'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Adjustment failed');
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          {showBackLink && (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-brand mb-3 transition-colors"
            >
              <ArrowLeft size={16} /> {backLabel}
            </Link>
          )}
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet size={24} className="text-brand" />
            {branchName}
          </h1>
          {store && (
            <div className="text-muted text-sm mt-2 space-y-1">
              <p className="flex items-center gap-1.5">
                <MapPin size={14} /> {store.addressLine}, {store.city}, {store.district}
              </p>
              {store.phone && (
                <p className="flex items-center gap-1.5">
                  <Phone size={14} /> {store.phone}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={syncFromOrders} className="btn-outline px-3 py-2 text-sm flex items-center gap-1.5">
            <RefreshCw size={14} /> Sync from Orders
          </button>
          <button type="button" onClick={() => refetch()} className="btn-outline px-3 py-2 text-sm flex items-center gap-1.5">
            <RefreshCw size={14} /> Refresh
          </button>
          <button type="button" onClick={exportCsv} className="btn-outline px-3 py-2 text-sm flex items-center gap-1.5">
            <Download size={14} /> CSV
          </button>
          <button type="button" onClick={exportPdf} className="btn-primary px-3 py-2 text-sm flex items-center gap-1.5">
            <FileText size={14} /> PDF
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
          <input
            type="date"
            className="input-field text-sm py-2"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <p className="text-xs text-muted mb-1">To</p>
          <input
            type="date"
            className="input-field text-sm py-2"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div className="min-w-[140px]">
          <p className="text-xs text-muted mb-1">Type</p>
          <select className="input-field text-sm py-2 w-full" value={txType} onChange={(e) => setTxType(e.target.value)}>
            <option value="">All types</option>
            <option value="ORDER_PAYMENT">Order Payment</option>
            <option value="REFUND">Refund</option>
            <option value="PAYOUT">Payout</option>
            <option value="ADJUSTMENT">Adjustment</option>
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-brand-subtle">
            <Wallet size={22} className="text-brand" />
          </div>
          <div>
            <p className="text-muted text-xs">Current Balance</p>
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

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="card p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <ShoppingBag size={16} className="text-brand" /> Paid Orders ({PERIOD_LABELS[period]})
          </h3>
          <p className="text-2xl font-bold text-white mb-2">{overview?.periodOrders?.count ?? 0} orders</p>
          <p className="text-brand font-semibold">{formatWalletMoney(overview?.periodOrders?.total ?? 0)}</p>
          <div className="mt-4 space-y-2">
            {(overview?.periodOrders?.byMode ?? []).map((row) => (
              <div key={row.mode} className="flex justify-between text-sm">
                <span className="text-muted">{row.mode === 'DELIVERY' ? '🛵 Delivery' : '🛍 Takeaway'}</span>
                <span className="text-white">
                  {formatWalletMoney(row.total)} <span className="text-muted text-xs">({row.count})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-white mb-4">By Payment Method</h3>
          <div className="space-y-2">
            {(overview?.byPaymentMethod ?? []).length === 0 && (
              <p className="text-muted text-sm">No payments in this period</p>
            )}
            {(overview?.byPaymentMethod ?? []).map((row) => (
              <div key={row.method} className="flex justify-between text-sm">
                <span className="text-muted">{row.label}</span>
                <span className="text-white font-medium">
                  {formatWalletMoney(row.amount)} <span className="text-muted text-xs">({row.count})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-white mb-4">By Transaction Type</h3>
          <div className="space-y-2">
            {(overview?.byType ?? []).map((row) => (
              <div key={row.type} className="flex justify-between text-sm">
                <span className="text-muted">{row.label}</span>
                <span className={`font-medium ${row.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatWalletMoney(row.amount)} <span className="text-muted text-xs">({row.count})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {superAdmin && (
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <form onSubmit={submitPayout} className="card p-5 space-y-3">
            <h3 className="font-semibold text-white">Record Payout</h3>
            <input
              type="number"
              min="1"
              className="input-field text-sm py-2 w-full"
              placeholder="Amount (LKR)"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              required
            />
            <input
              type="text"
              className="input-field text-sm py-2 w-full"
              placeholder="Bank reference / receipt no."
              value={payoutRef}
              onChange={(e) => setPayoutRef(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary w-full py-2.5 text-sm">
              Record Payout
            </button>
          </form>
          <form onSubmit={submitAdjustment} className="card p-5 space-y-3">
            <h3 className="font-semibold text-white">Manual Adjustment</h3>
            <input
              type="number"
              className="input-field text-sm py-2 w-full"
              placeholder="Amount (+ credit / − debit)"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              required
            />
            <input
              type="text"
              className="input-field text-sm py-2 w-full"
              placeholder="Reason / notes"
              value={adjustNote}
              onChange={(e) => setAdjustNote(e.target.value)}
              required
            />
            <button type="submit" className="btn-outline w-full py-2.5 text-sm">
              Record Adjustment
            </button>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-navy-border">
          <h3 className="font-semibold text-white">Transaction Ledger</h3>
          <p className="text-muted text-xs mt-1">{txData?.total ?? 0} transactions in selected period</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-border">
                {['Date', 'Type', 'Order', 'Method', 'Amount', 'Balance', 'Notes'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-muted text-xs">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    No transactions in this period
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-navy-border hover:bg-navy-light/30">
                    <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleString('en-LK')}
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">{tx.typeLabel}</td>
                    <td className="px-4 py-3 font-mono text-xs text-brand">{tx.orderNumber || '—'}</td>
                    <td className="px-4 py-3 text-muted text-xs">{tx.paymentMethodLabel || '—'}</td>
                    <td
                      className={`px-4 py-3 font-semibold text-xs ${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}
                    >
                      {tx.amount >= 0 ? '+' : ''}
                      {formatWalletMoney(tx.amount)}
                    </td>
                    <td className="px-4 py-3 text-white text-xs">{formatWalletMoney(tx.balanceAfter)}</td>
                    <td className="px-4 py-3 text-muted text-xs max-w-[200px] truncate">
                      {tx.description || tx.reference || '—'}
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
