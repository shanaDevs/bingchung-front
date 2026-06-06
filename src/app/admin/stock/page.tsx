'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Package, RefreshCw, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAdminSession, isSuperAdmin, type AdminSession } from '@/lib/adminAuth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function adminFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('bc_admin_token') : '';
  return fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  }).then(async (r) => {
    const json = await r.json();
    if (!r.ok) throw new Error(json.message || 'Request failed');
    return json.data as T;
  });
}

interface StockItem {
  productId: string;
  name: string;
  basePrice: number;
  tag?: string;
  category: { name: string; slug: string };
  isAvailable: boolean;
}

interface StockResponse {
  store: { id: string; name: string; city: string };
  items: StockItem[];
}

export default function AdminStockPage() {
  const qc = useQueryClient();
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [search, setSearch] = useState('');
  const [storeId, setStoreId] = useState<string>('');

  useEffect(() => {
    setAdmin(getAdminSession());
  }, []);

  useEffect(() => {
    if (admin && !isSuperAdmin(admin) && admin.storeId) {
      setStoreId(admin.storeId);
    }
  }, [admin]);

  const { data: stores = [] } = useQuery({
    queryKey: ['admin-stores-list'],
    queryFn: () => adminFetch<{ id: string; name: string }[]>('/stores'),
    enabled: Boolean(admin && isSuperAdmin(admin)),
  });

  useEffect(() => {
    if (isSuperAdmin(admin) && stores.length > 0 && !storeId) {
      setStoreId(stores[0].id);
    }
  }, [admin, stores, storeId]);

  const effectiveStoreId = isSuperAdmin(admin) ? storeId : admin?.storeId ?? '';

  const { data, isLoading, refetch, isFetching, error } = useQuery({
    queryKey: ['admin-stock', effectiveStoreId, search],
    queryFn: () => {
      const params = new URLSearchParams({ storeId: effectiveStoreId });
      if (search.trim()) params.set('search', search.trim());
      return adminFetch<StockResponse>(`/admin/stock?${params.toString()}`);
    },
    enabled: Boolean(admin && effectiveStoreId),
  });

  const toggleAvailability = useMutation({
    mutationFn: ({ productId, isAvailable }: { productId: string; isAvailable: boolean }) =>
      adminFetch(`/admin/stock/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable, storeId: effectiveStoreId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-stock'] });
      toast.success('Branch availability updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const syncAll = useMutation({
    mutationFn: () => adminFetch('/admin/stock/sync', { method: 'POST' }),
    onSuccess: (res: { rowsCreated?: number }) => {
      qc.invalidateQueries({ queryKey: ['admin-stock'] });
      toast.success(`Inventory synced (${res?.rowsCreated ?? 0} new rows)`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = data?.items ?? [];
  const onCount = items.filter((i) => i.isAvailable).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-fg flex items-center gap-2">
            <Package size={24} className="text-brand" />
            Branch Menu
          </h1>
          <p className="text-muted text-sm mt-1">
            {data?.store.name.replace('Bing Chun - ', '') ?? admin?.storeName?.replace('Bing Chun - ', '') ?? 'Your branch'}
            {' · '}
            {onCount} on · {items.length - onCount} off
          </p>
          <p className="text-muted text-xs mt-1">
            Off = out of stock at this branch. Customers may still order from a nearby branch.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => refetch()} className="btn-outline p-2.5" aria-label="Refresh">
            <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
          </button>
          {isSuperAdmin(admin) && (
            <button
              type="button"
              onClick={() => syncAll.mutate()}
              disabled={syncAll.isPending}
              className="btn-outline px-4 py-2 text-sm"
            >
              Sync all branches
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {isSuperAdmin(admin) && stores.length > 0 && (
          <select
            className="input-field max-w-xs"
            value={effectiveStoreId}
            onChange={(e) => setStoreId(e.target.value)}
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name.replace('Bing Chun - ', '')}
              </option>
            ))}
          </select>
        )}
        <div className="input-icon-wrap flex-1 max-w-md">
          <Search size={16} className="input-icon" aria-hidden />
          <input
            className="input-field"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-sm mb-4">{(error as Error).message}</p>
      )}

      {!admin || (!effectiveStoreId && !isLoading) ? (
        <p className="text-muted">Select a branch or sign in again to manage availability.</p>
      ) : isLoading ? (
        <p className="text-muted">Loading products…</p>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-muted mb-4">No products found for this branch.</p>
          {isSuperAdmin(admin) && (
            <button type="button" onClick={() => syncAll.mutate()} className="btn-primary px-4 py-2 text-sm">
              Sync inventory
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-border text-left text-muted">
                  <th className="p-3 font-medium">Product</th>
                  <th className="p-3 font-medium">Category</th>
                  <th className="p-3 font-medium">Show to customers</th>
                  <th className="p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const saving =
                    toggleAvailability.isPending &&
                    toggleAvailability.variables?.productId === item.productId;
                  return (
                    <tr key={item.productId} className="border-b border-navy-border/60 hover:bg-navy-light/50">
                      <td className="p-3">
                        <p className="font-medium text-fg">{item.name}</p>
                        {item.tag && <p className="text-xs text-brand">{item.tag}</p>}
                      </td>
                      <td className="p-3 text-muted">{item.category.name}</td>
                      <td className="p-3">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            toggleAvailability.mutate({
                              productId: item.productId,
                              isAvailable: !item.isAvailable,
                            })
                          }
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                            item.isAvailable
                              ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
                              : 'bg-navy-light text-muted hover:bg-navy-border'
                          }`}
                        >
                          {item.isAvailable ? <Eye size={14} /> : <EyeOff size={14} />}
                          {item.isAvailable ? 'On' : 'Off'}
                        </button>
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            item.isAvailable
                              ? 'bg-green-500/15 text-green-400'
                              : 'bg-red-500/15 text-red-400'
                          }`}
                        >
                          {item.isAvailable ? 'In stock' : 'Out of stock'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
