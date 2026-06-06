'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { adminRoleLabel, setAdminSession, getPostLoginPath, type AdminSession } from '@/lib/adminAuth';
import toast from 'react-hot-toast';

const DEMO_ACCOUNTS = [
  {
    type: 'Super Admin',
    email: 'admin@bingchunsrilanka.lk',
    password: 'Admin@123',
    description: 'Full access — menu, stores, users, reports',
  },
  {
    type: 'Branch Admin',
    email: 'branch@bingchunsrilanka.lk',
    password: 'Branch@123',
    description: 'Nugegoda branch — orders & dashboard only',
  },
] as const;

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post<{ token: string; admin: AdminSession }>('/auth/admin/login', { email, password });
      setAdminSession(res.admin, res.token);
      const label = adminRoleLabel(res.admin.role);
      toast.success(`Welcome, ${label}! 🧋`);
      router.replace(getPostLoginPath(res.admin));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(account: (typeof DEMO_ACCOUNTS)[number]) {
    setEmail(account.email);
    setPassword(account.password);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-navy)' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🔐</div>
          <h1 className="text-2xl font-bold text-fg">Staff Login</h1>
          <p className="text-muted text-sm mt-1">Super Admin &amp; Branch Admin</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            className="input-field"
            type="email"
            placeholder="Staff email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="input-field"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3.5"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </motion.button>
        </form>

        <div className="mt-6 space-y-3">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider text-center">Demo accounts</p>
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => fillDemo(account)}
              className="w-full text-left p-3 rounded-xl border border-navy-border hover:border-brand/50 hover:bg-brand-subtle transition-all"
            >
              <p className="text-sm font-semibold text-fg">{account.type}</p>
              <p className="text-xs text-muted mt-0.5">{account.description}</p>
              <p className="text-xs text-brand mt-1.5 font-mono">{account.email} · {account.password}</p>
            </button>
          ))}
        </div>

        <p className="text-center text-sm text-muted mt-6">
          Customer?{' '}
          <Link href="/account/login" className="text-brand hover:text-brand-light font-medium">
            Sign in here
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
