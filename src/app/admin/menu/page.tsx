'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Power } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

function adminFetch(endpoint: string, options?: RequestInit) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('bc_admin_token') : '';
  return fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options?.headers || {}) },
  }).then((r) => r.json()).then((d) => d.data ?? d);
}

interface ProductForm { name: string; categoryId: string; basePrice: string; description: string; tag: string; isAvailable: boolean; }

const EMPTY_FORM: ProductForm = { name: '', categoryId: '', basePrice: '', description: '', tag: '', isAvailable: true };
const TAGS = ['', 'Classic', 'Popular', 'New', 'Best Seller', 'Signature', 'Rs.200 Only'];

export default function AdminMenuPage() {
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['admin-products'],
    queryFn: () => adminFetch('/menu/products'),
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['admin-categories'],
    queryFn: () => adminFetch('/menu/categories'),
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editingId
      ? adminFetch(`/menu/products/${editingId}`, { method: 'PUT', body: JSON.stringify(data) })
      : adminFetch('/menu/products', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-products'] }); setForm(EMPTY_FORM); setEditingId(null); setShowForm(false); toast.success(editingId ? 'Product updated' : 'Product created'); },
    onError: (e: any) => toast.error(e.message || 'Failed'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) =>
      adminFetch(`/menu/products/${id}`, { method: 'PUT', body: JSON.stringify({ isAvailable: available }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-products'] }),
  });

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    saveMutation.mutate({ ...form, basePrice: parseInt(form.basePrice) });
  }

  function startEdit(p: any) {
    setForm({ name: p.name, categoryId: p.categoryId, basePrice: String(p.basePrice), description: p.description || '', tag: p.tag || '', isAvailable: p.isAvailable });
    setEditingId(p.id);
    setShowForm(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Menu Management</h1>
          <p className="text-muted text-sm">{products.length} products</p>
        </div>
        <button onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); }} className="btn-primary px-4 py-2.5 text-sm">
          <Plus size={15} /> Add Product
        </button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 mb-6">
            <h3 className="font-semibold text-white mb-4">{editingId ? 'Edit' : 'New'} Product</h3>
            <form onSubmit={submitForm} className="grid sm:grid-cols-2 gap-4">
              <input className="input-field" placeholder="Product name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              <select className="input-field" value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} required>
                <option value="">Select category</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input className="input-field" type="number" placeholder="Base price (LKR)" value={form.basePrice} onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))} required />
              <select className="input-field" value={form.tag} onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))}>
                {TAGS.map((t) => <option key={t} value={t}>{t || 'No tag'}</option>)}
              </select>
              <input className="input-field sm:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              <div className="sm:col-span-2 flex gap-3">
                <button type="submit" disabled={saveMutation.isPending} className="btn-primary px-6 py-2.5 text-sm">
                  {saveMutation.isPending ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-outline px-6 py-2.5 text-sm">Cancel</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Products table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-border">
                {['Name', 'Category', 'Price', 'Tag', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-muted text-xs font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p: any) => (
                <tr key={p.id} className="border-b border-navy-border hover:bg-navy-light/30">
                  <td className="px-4 py-3 text-white font-medium text-sm">{p.name}</td>
                  <td className="px-4 py-3 text-muted text-xs">{p.category?.name}</td>
                  <td className="px-4 py-3 text-brand font-semibold text-xs">LKR {p.basePrice}</td>
                  <td className="px-4 py-3 text-muted text-xs">{p.tag || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${p.isAvailable ? 'text-green-400' : 'text-red-400'}`}>
                      {p.isAvailable ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(p)} className="btn-outline p-1.5 text-xs"><Edit2 size={12} /></button>
                      <button onClick={() => toggleMutation.mutate({ id: p.id, available: !p.isAvailable })}
                        className={`p-1.5 rounded-lg border text-xs ${p.isAvailable ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-green-500/30 text-green-400 hover:bg-green-500/10'}`}>
                        <Power size={12} />
                      </button>
                    </div>
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
