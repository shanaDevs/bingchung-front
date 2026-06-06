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

const EMPTY = { name: '', addressLine: '', city: '', district: '', lat: '', lng: '', phone: '', openTime: '09:00', closeTime: '23:00' };

export default function AdminStoresPage() {
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();

  const { data: stores = [] } = useQuery<any[]>({ queryKey: ['admin-stores'], queryFn: () => adminFetch('/stores') });

  const createMutation = useMutation({
    mutationFn: (data: any) => adminFetch('/stores', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-stores'] }); setForm(EMPTY); setShowForm(false); toast.success('Store created'); },
    onError: (e: any) => toast.error(e.message || 'Failed'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: any) => adminFetch(`/stores/${id}`, { method: 'PUT', body: JSON.stringify({ isActive }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-stores'] }),
  });

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({ ...form, lat: parseFloat(form.lat), lng: parseFloat(form.lng) });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Store Management</h1>
          <p className="text-muted text-sm">{stores.length} stores</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2.5 text-sm"><Plus size={15} /> Add Store</button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 mb-6">
            <h3 className="font-semibold text-white mb-4">New Store</h3>
            <form onSubmit={submitForm} className="grid sm:grid-cols-2 gap-4">
              <input className="input-field sm:col-span-2" placeholder="Store name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              <input className="input-field sm:col-span-2" placeholder="Address line" value={form.addressLine} onChange={(e) => setForm((f) => ({ ...f, addressLine: e.target.value }))} required />
              <input className="input-field" placeholder="City" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} required />
              <input className="input-field" placeholder="District" value={form.district} onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))} required />
              <input className="input-field" type="number" step="any" placeholder="Latitude" value={form.lat} onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))} required />
              <input className="input-field" type="number" step="any" placeholder="Longitude" value={form.lng} onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))} required />
              <input className="input-field" placeholder="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              <div className="flex gap-2">
                <input className="input-field flex-1" type="time" value={form.openTime} onChange={(e) => setForm((f) => ({ ...f, openTime: e.target.value }))} />
                <input className="input-field flex-1" type="time" value={form.closeTime} onChange={(e) => setForm((f) => ({ ...f, closeTime: e.target.value }))} />
              </div>
              <div className="sm:col-span-2 flex gap-3">
                <button type="submit" disabled={createMutation.isPending} className="btn-primary px-6 py-2.5 text-sm">
                  {createMutation.isPending ? 'Creating...' : 'Create Store'}
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
                {['Name', 'Address', 'District', 'Hours', 'Status', 'Busy', 'Action'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-muted text-xs font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stores.map((s: any) => (
                <tr key={s.id} className="border-b border-navy-border hover:bg-navy-light/30">
                  <td className="px-4 py-3 text-white font-medium text-sm">{s.name}</td>
                  <td className="px-4 py-3 text-muted text-xs max-w-44 truncate">{s.addressLine}, {s.city}</td>
                  <td className="px-4 py-3 text-muted text-xs">{s.district}</td>
                  <td className="px-4 py-3 text-muted text-xs">{s.openTime}–{s.closeTime}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-medium ${s.isActive ? 'text-green-400' : 'text-red-400'}`}>{s.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-3"><span className={`text-xs font-medium ${s.isBusy ? 'text-yellow-400' : 'text-muted'}`}>{s.isBusy ? 'Busy' : 'Normal'}</span></td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleMutation.mutate({ id: s.id, isActive: !s.isActive })}
                      className={`p-1.5 rounded-lg border text-xs ${s.isActive ? 'border-red-500/30 text-red-400' : 'border-green-500/30 text-green-400'}`}>
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
