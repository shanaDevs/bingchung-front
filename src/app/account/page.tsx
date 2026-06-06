'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, MapPin, Package, Star, Bell, Trash2, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { confirmDialog } from '@/store/confirmStore';

export default function AccountPage() {
  const router = useRouter();
  const { isAuthenticated, user, logout, updateUser } = useAuthStore();
  const qc = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) router.replace('/account/login');
  }, [isAuthenticated]);

  const { data: profile } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<any>('/auth/me', true),
    enabled: isAuthenticated,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete('/auth/me', true),
    onSuccess: () => { logout(); router.push('/'); toast.success('Account deleted'); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!isAuthenticated || !user) return null;

  const u = profile || user;

  const menuItems = [
    { href: '/account/orders', icon: Package, label: 'My Orders', desc: 'View and reorder past orders' },
    { href: '/account/addresses', icon: MapPin, label: 'Saved Addresses', desc: 'Manage delivery addresses' },
    { href: '/account/loyalty', icon: Star, label: 'Loyalty Points', desc: `${u.loyaltyPoints || 0} points available` },
    { href: '/account/notifications', icon: Bell, label: 'Notifications', desc: 'Manage notification preferences' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Profile header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold gradient-brand text-white">
            {u.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{u.name}</h2>
            <p className="text-muted text-sm">{u.phone}</p>
            {u.email && <p className="text-muted text-xs">{u.email}</p>}
          </div>
        </div>

        {/* Loyalty points */}
        <div className="mt-5 p-4 rounded-xl flex items-center justify-between bg-brand-subtle border border-brand/30">
          <div>
            <p className="text-xs text-muted font-medium">Loyalty Points</p>
            <p className="text-2xl font-bold text-brand">{u.loyaltyPoints || 0}</p>
          </div>
          <Star size={28} className="text-brand opacity-60" />
        </div>
      </motion.div>

      {/* Menu */}
      <div className="space-y-3 mb-6">
        {menuItems.map((item, i) => (
          <motion.div key={item.href} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
            <Link href={item.href} className="card p-4 flex items-center gap-4 hover:border-brand transition-all group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand-subtle">
                <item.icon size={18} className="text-brand" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white group-hover:text-brand transition-colors">{item.label}</p>
                <p className="text-muted text-xs">{item.desc}</p>
              </div>
              <span className="text-muted text-lg">›</span>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Danger zone */}
      <div className="space-y-3">
        <button onClick={() => { logout(); router.push('/'); }} className="card p-4 w-full flex items-center gap-3 hover:border-red-500/30 transition-all">
          <LogOut size={17} className="text-muted" />
          <span className="text-muted text-sm">Sign Out</span>
        </button>
        <button
          onClick={async () => {
            const ok = await confirmDialog({
              title: 'Delete account?',
              message: 'Are you sure you want to delete your account? This cannot be undone.',
              confirmLabel: 'Delete account',
              cancelLabel: 'Keep account',
              variant: 'danger',
            });
            if (ok) deleteMutation.mutate();
          }}
          className="card p-4 w-full flex items-center gap-3 hover:border-red-500/30 hover:bg-red-500/5 transition-all"
        >
          <Trash2 size={17} className="text-red-400" />
          <span className="text-red-400 text-sm">Delete Account</span>
        </button>
      </div>
    </div>
  );
}
