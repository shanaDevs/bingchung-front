export type PeriodPreset = 'today' | 'week' | 'month';

export type BranchSummary = {
  storeId: string;
  storeName: string;
  city: string;
  district: string;
  balance: number;
  periodCredits: number;
  periodDebits: number;
  periodNet: number;
  transactionCount: number;
};

export type WalletOverview = {
  isSystemView: boolean;
  storeId: string | null;
  totalSystemBalance: number;
  periodCredits: number;
  periodDebits: number;
  periodNet: number;
  transactionCount: number;
  pendingOrderValue: number;
  pendingOrderCount: number;
  periodOrders?: {
    count: number;
    total: number;
    byMode: { mode: string; count: number; total: number }[];
  };
  byType: { type: string; label: string; amount: number; count: number }[];
  byPaymentMethod: { method: string; label: string; amount: number; count: number }[];
  branches: BranchSummary[];
};

export type WalletTransaction = {
  id: string;
  storeId?: string;
  storeName: string;
  orderNumber: string | null;
  typeLabel: string;
  amount: number;
  balanceAfter: number;
  paymentMethodLabel: string | null;
  paymentRef: string | null;
  description: string | null;
  reference: string | null;
  createdAt: string;
};

export type WalletStore = {
  id: string;
  name: string;
  city?: string;
  district?: string;
  addressLine?: string;
  phone?: string;
};

function formatDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getDateRangeForPreset(preset: PeriodPreset): { from: string; to: string } {
  const now = new Date();
  const to = formatDateLocal(now);

  if (preset === 'today') {
    return { from: to, to };
  }

  if (preset === 'week') {
    const start = new Date(now);
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
    return { from: formatDateLocal(start), to };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: formatDateLocal(start), to };
}

export function toApiDateRange(from: string, to: string) {
  return {
    from: from ? `${from}T00:00:00.000Z` : undefined,
    to: to ? `${to}T23:59:59.999Z` : undefined,
  };
}

export function buildWalletQuery(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) qs.set(k, v);
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export function formatWalletMoney(n: number) {
  return `LKR ${n.toLocaleString()}`;
}

export function adminWalletFetch(endpoint: string, options?: RequestInit) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('bc_admin_token') : '';
  return fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options?.headers || {}),
    },
  }).then(async (r) => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.message || data.error || 'Request failed');
    return data.data ?? data;
  });
}

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
};
