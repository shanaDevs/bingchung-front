'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Power, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { adminRoleLabel } from '@/lib/adminAuth';

type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: 'SYSTEM_ADMIN' | 'STORE_MANAGER' | 'REPORT_VIEWER';
  storeId: string | null;
  storeName: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

type StoreOption = {
  id: string;
  name: string;
  city: string;
};

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  role: 'STORE_MANAGER' as StaffMember['role'],
  storeId: '',
};

async function adminFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('bc_admin_token') : '';
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Request failed');
  return json.data as T;
}

export default function AdminStaffPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: staff = [], isLoading } = useQuery<StaffMember[]>({
    queryKey: ['admin-staff'],
    queryFn: () => adminFetch('/admin/staff'),
  });

  const { data: stores = [] } = useQuery<StoreOption[]>({
    queryKey: ['admin-stores'],
    queryFn: () => adminFetch('/stores'),
  });

  const createStaff = useMutation({
    mutationFn: (payload: typeof EMPTY_FORM) =>
      adminFetch('/admin/staff', {
        method: 'POST',
        body: JSON.stringify({
          name: payload.name,
          email: payload.email,
          password: payload.password,
          role: payload.role,
          storeId: payload.role === 'STORE_MANAGER' ? payload.storeId : undefined,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-staff'] });
      setForm(EMPTY_FORM);
      setShowForm(false);
      toast.success('Branch manager registered');
    },
    onError: (e: Error) => toast.error(e.message || 'Registration failed'),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminFetch(`/admin/staff/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-staff'] });
      toast.success('Staff account updated');
    },
    onError: (e: Error) => toast.error(e.message || 'Update failed'),
  });

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (form.role === 'STORE_MANAGER' && !form.storeId) {
      toast.error('Select a branch for the manager');
      return;
    }
    createStaff.mutate(form);
  }

  const branchManagers = staff.filter((s) => s.role === 'STORE_MANAGER');
  const otherStaff = staff.filter((s) => s.role !== 'STORE_MANAGER');

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserPlus size={24} className="text-brand" />
            Staff Management
          </h1>
          <p className="text-muted text-sm mt-1">
            Register branch managers and manage admin access
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="btn-primary px-4 py-2.5 text-sm flex items-center gap-1.5"
        >
          <Plus size={15} /> Register Branch Manager
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card p-6 mb-6"
          >
            <h3 className="font-semibold text-white mb-4">New Branch Manager</h3>
            <form onSubmit={submitForm} className="grid sm:grid-cols-2 gap-4">
              <input
                className="input-field"
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
              <input
                className="input-field"
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
              <input
                className="input-field"
                type="password"
                placeholder="Temporary password (min 8 chars)"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                minLength={8}
                required
              />
              <select
                className="input-field"
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    role: e.target.value as StaffMember['role'],
                    storeId: e.target.value === 'STORE_MANAGER' ? f.storeId : '',
                  }))
                }
              >
                <option value="STORE_MANAGER">Branch Manager</option>
                <option value="SYSTEM_ADMIN">Super Admin</option>
                <option value="REPORT_VIEWER">Report Viewer</option>
              </select>
              {form.role === 'STORE_MANAGER' && (
                <select
                  className="input-field sm:col-span-2"
                  value={form.storeId}
                  onChange={(e) => setForm((f) => ({ ...f, storeId: e.target.value }))}
                  required
                >
                  <option value="">Select branch</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name.replace('Bing Chun - ', '')} · {store.city}
                    </option>
                  ))}
                </select>
              )}
              <div className="sm:col-span-2 flex gap-3">
                <button
                  type="submit"
                  disabled={createStaff.isPending}
                  className="btn-primary px-6 py-2.5 text-sm"
                >
                  {createStaff.isPending ? 'Registering…' : 'Register'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setForm(EMPTY_FORM);
                  }}
                  className="btn-outline px-6 py-2.5 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <StaffTable
        title="Branch Managers"
        subtitle={`${branchManagers.length} registered`}
        rows={branchManagers}
        isLoading={isLoading}
        onToggle={(id, isActive) => toggleActive.mutate({ id, isActive })}
        togglePending={toggleActive.isPending}
      />

      {otherStaff.length > 0 && (
        <div className="mt-6">
          <StaffTable
            title="Other Admin Accounts"
            subtitle={`${otherStaff.length} account${otherStaff.length === 1 ? '' : 's'}`}
            rows={otherStaff}
            isLoading={isLoading}
            onToggle={(id, isActive) => toggleActive.mutate({ id, isActive })}
            togglePending={toggleActive.isPending}
          />
        </div>
      )}
    </div>
  );
}

function StaffTable({
  title,
  subtitle,
  rows,
  isLoading,
  onToggle,
  togglePending,
}: {
  title: string;
  subtitle: string;
  rows: StaffMember[];
  isLoading: boolean;
  onToggle: (id: string, isActive: boolean) => void;
  togglePending: boolean;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-navy-border">
        <h3 className="font-semibold text-white">{title}</h3>
        <p className="text-muted text-xs mt-0.5">{subtitle}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-border">
              {['Name', 'Email', 'Role', 'Branch', 'Last login', 'Status', 'Action'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-muted text-xs font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  Loading staff…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  No accounts yet
                </td>
              </tr>
            ) : (
              rows.map((member) => (
                <tr key={member.id} className="border-b border-navy-border hover:bg-navy-light/30">
                  <td className="px-4 py-3 text-white font-medium">{member.name}</td>
                  <td className="px-4 py-3 text-muted text-xs">{member.email}</td>
                  <td className="px-4 py-3 text-muted text-xs">{adminRoleLabel(member.role)}</td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {member.storeName?.replace('Bing Chun - ', '') || '—'}
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {member.lastLoginAt
                      ? new Date(member.lastLoginAt).toLocaleString('en-LK', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium ${member.isActive ? 'text-green-400' : 'text-red-400'}`}
                    >
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={togglePending}
                      onClick={() => onToggle(member.id, !member.isActive)}
                      className={`p-1.5 rounded-lg border text-xs ${
                        member.isActive
                          ? 'border-red-500/30 text-red-400'
                          : 'border-green-500/30 text-green-400'
                      }`}
                      title={member.isActive ? 'Deactivate' : 'Activate'}
                    >
                      <Power size={12} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
