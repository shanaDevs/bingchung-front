'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Save, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { isSuperAdmin, type AdminSession } from '@/lib/adminAuth';

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

type MethodKey = 'PAYHERE' | 'CASH_ON_DELIVERY' | 'CASH_AT_COUNTER';

interface MethodConfig {
  enabled: boolean;
  label: string;
  icon?: string;
  modes: ('DELIVERY' | 'TAKEAWAY')[];
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [methods, setMethods] = useState<Record<MethodKey, MethodConfig> | null>(null);
  const [merchantId, setMerchantId] = useState('');
  const [merchantSecret, setMerchantSecret] = useState('');
  const [payhereMode, setPayhereMode] = useState<'sandbox' | 'live'>('sandbox');

  useEffect(() => {
    const stored = localStorage.getItem('bc_admin');
    if (stored) {
      const a = JSON.parse(stored) as AdminSession;
      setAdmin(a);
      if (!isSuperAdmin(a)) router.replace('/admin/orders');
    }
  }, [router]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-payment-settings'],
    queryFn: () => adminFetch('/settings/payment'),
    enabled: isSuperAdmin(admin),
  });

  useEffect(() => {
    const payload = data?.data;
    if (!payload) return;
    setMethods(payload.methods);
    setMerchantId(payload.payhere?.merchantId || '');
    setPayhereMode(payload.payhere?.mode === 'live' ? 'live' : 'sandbox');
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      adminFetch('/settings/payment', {
        method: 'PUT',
        body: JSON.stringify({
          paymentMethods: methods,
          payhereMerchantId: merchantId || undefined,
          ...(merchantSecret ? { payhereMerchantSecret: merchantSecret } : {}),
          payhereMode,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-payment-settings'] });
      setMerchantSecret('');
      toast.success('Settings saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isSuperAdmin(admin)) return null;

  const methodKeys: MethodKey[] = ['PAYHERE', 'CASH_ON_DELIVERY', 'CASH_AT_COUNTER'];

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-xl bg-brand-subtle">
          <Settings size={22} className="text-brand" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">System Settings</h1>
          <p className="text-muted text-sm">Payment methods and PayHere gateway</p>
        </div>
      </div>

      {isLoading || !methods ? (
        <div className="card p-8 text-center text-muted">Loading settings...</div>
      ) : (
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <CreditCard size={18} className="text-brand" />
              Payment methods
            </h2>
            <p className="text-xs text-muted mb-4">
              Enable or disable options shown at checkout. Disabled methods cannot be selected by customers.
            </p>
            <div className="space-y-4">
              {methodKeys.map((key) => {
                const m = methods[key];
                if (!m) return null;
                return (
                  <div key={key} className="p-4 rounded-xl border border-navy-border space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{m.label}</p>
                        <p className="text-xs text-muted font-mono">{key}</p>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-xs text-muted">{m.enabled ? 'On' : 'Off'}</span>
                        <input
                          type="checkbox"
                          checked={m.enabled}
                          onChange={(e) =>
                            setMethods((prev) =>
                              prev ? { ...prev, [key]: { ...prev[key], enabled: e.target.checked } } : prev
                            )
                          }
                          className="w-5 h-5 accent-brand"
                        />
                      </label>
                    </div>
                    <input
                      className="input-field text-sm"
                      value={m.label}
                      onChange={(e) =>
                        setMethods((prev) =>
                          prev ? { ...prev, [key]: { ...prev[key], label: e.target.value } } : prev
                        )
                      }
                      placeholder="Display label"
                    />
                    <div className="flex gap-2 flex-wrap">
                      {(['DELIVERY', 'TAKEAWAY'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            const modes = m.modes.includes(mode)
                              ? m.modes.filter((x) => x !== mode)
                              : [...m.modes, mode];
                            setMethods((prev) =>
                              prev ? { ...prev, [key]: { ...prev[key], modes } } : prev
                            );
                          }}
                          className={`chip text-xs ${m.modes.includes(mode) ? 'chip-active' : ''}`}
                        >
                          {mode === 'DELIVERY' ? '🛵 Delivery' : '🛍 Takeaway'}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-white mb-2">PayHere gateway</h2>
            <p className="text-xs text-muted mb-4">
              Use your{' '}
              <a href="https://sandbox.payhere.lk" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                PayHere Sandbox
              </a>{' '}
              merchant ID and secret. Leave secret blank to keep the current value. Without credentials, checkout uses a mock payment page for testing.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Environment</label>
                <select
                  className="input-field"
                  value={payhereMode}
                  onChange={(e) => setPayhereMode(e.target.value as 'sandbox' | 'live')}
                >
                  <option value="sandbox">Sandbox (testing)</option>
                  <option value="live">Live (production)</option>
                </select>
              </div>
              <input
                className="input-field"
                placeholder="Merchant ID"
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
              />
              <input
                className="input-field"
                type="password"
                placeholder={
                  data?.data?.payhere?.merchantSecretSet
                    ? 'Merchant secret (leave blank to keep current)'
                    : 'Merchant secret'
                }
                value={merchantSecret}
                onChange={(e) => setMerchantSecret(e.target.value)}
              />
              {data?.data?.payhere?.configured && (
                <p className="text-xs text-green-400">✓ PayHere credentials configured</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="btn-primary px-6 py-3 flex items-center gap-2"
          >
            <Save size={16} />
            {save.isPending ? 'Saving...' : 'Save settings'}
          </button>
        </div>
      )}
    </div>
  );
}
