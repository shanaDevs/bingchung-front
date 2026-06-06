'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Power } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

function adminFetch(endpoint: string, options?: RequestInit) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('bc_admin_token') : '';
  return fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options?.headers || {}) },
  }).then((r) => r.json()).then((d) => d.data ?? d);
}

const EMPTY: any = { code: '', description: '', discountType: 'PERCENTAGE', discountValue: '', minOrderValue: '0', maxUses: '', expiresAt: '', isActive: true };

export default function AdminPromosPage() {
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();

  const { data: promos = [] } = useQuery<any[]>({
    queryKey: ['admin-promos'],
    queryFn: () => adminFetch('/promos/admin/all'),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => adminFetch('/promos/admin', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-promos'] }); setForm(EMPTY); setShowForm(false); toast.success('Promo created'); },
    onError: (e: any) => toast.error(e.message || 'Failed'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminFetch(`/promos/admin/${id}`, { method: 'PUT', body: JSON.stringify({ isActive }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-promos'] }),
  });

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({ ...form, discountValue: parseInt(form.discountValue), minOrderValue: parseInt(form.minOrderValue), maxUses: form.maxUses ? parseInt(form.maxUses) : undefined, expiresAt: form.expiresAt || undefined });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Promotions</h1>
          <p className="text-muted text-sm">{promos.length} promo codes</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2.5 text-sm"><Plus size={15} /> Create Promo</button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 mb-6">
            <h3 className="font-semibold text-white mb-4">New Promo Code</h3>
            <form onSubmit={submitForm} className="grid sm:grid-cols-2 gap-4">
              <input className="input-field uppercase" placeholder="PROMO CODE" value={form.code} onChange={(e) => setForm((f: any) => ({ ...f, code: e.target.value.toUpperCase() }))} required />
              <input className="input-field" placeholder="Description" value={form.description} onChange={(e) => setForm((f: any) => ({ ...f, description: e.target.value }))} />
              <select className="input-field" value={form.discountType} onChange={(e) => setForm((f: any) => ({ ...f, discountType: e.target.value }))}>
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed (LKR)</option>
              </select>
              <input className="input-field" type="number" placeholder={form.discountType === 'PERCENTAGE' ? 'Discount %' : 'Discount LKR'} value={form.discountValue} onChange={(e) => setForm((f: any) => ({ ...f, discountValue: e.target.value }))} required />
              <input className="input-field" type="number" placeholder="Min order (LKR)" value={form.minOrderValue} onChange={(e) => setForm((f: any) => ({ ...f, minOrderValue: e.target.value }))} />
              <input className="input-field" type="number" placeholder="Max uses (leave blank = unlimited)" value={form.maxUses} onChange={(e) => setForm((f: any) => ({ ...f, maxUses: e.target.value }))} />
              <input className="input-field" type="datetime-local" placeholder="Expiry date" value={form.expiresAt} onChange={(e) => setForm((f: any) => ({ ...f, expiresAt: e.target.value }))} />
              <div className="flex gap-3">
                <button type="submit" disabled={createMutation.isPending} className="btn-primary px-6 py-2.5 text-sm">
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-outline px-6 py-2.5 text-sm">Cancel</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-border">
                {['Code', 'Type', 'Value', 'Min Order', 'Uses', 'Expiry', 'Active', 'Action'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-muted text-xs font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {promos.map((p: any) => (
                <tr key={p.id} className="border-b border-navy-border hover:bg-navy-light/30">
                  <td className="px-4 py-3 font-mono text-brand font-bold text-xs">{p.code}</td>
                  <td className="px-4 py-3 text-muted text-xs">{p.discountType}</td>
                  <td className="px-4 py-3 text-white text-xs">{p.discountType === 'PERCENTAGE' ? `${p.discountValue}%` : `LKR ${p.discountValue}`}</td>
                  <td className="px-4 py-3 text-muted text-xs">LKR {p.minOrderValue}</td>
                  <td className="px-4 py-3 text-muted text-xs">{p.usedCount}{p.maxUses ? `/${p.maxUses}` : ''}</td>
                  <td className="px-4 py-3 text-muted text-xs">{p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : 'Never'}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-medium ${p.isActive ? 'text-green-400' : 'text-red-400'}`}>{p.isActive ? 'Yes' : 'No'}</span></td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleMutation.mutate({ id: p.id, isActive: !p.isActive })}
                      className={`p-1.5 rounded-lg border text-xs ${p.isActive ? 'border-red-500/30 text-red-400' : 'border-green-500/30 text-green-400'}`}>
                      <Power size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
