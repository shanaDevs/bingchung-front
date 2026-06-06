'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Phone } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';
import toast from 'react-hot-toast';
import type { User } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error('Enter your mobile number');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ token: string; user: User }>('/auth/phone/login', {
        phone: phone.trim(),
      });
      login(res.token, res.user);
      toast.success('Welcome back! 🧋');
      router.push('/account');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 sm:p-8 w-full max-w-sm"
      >
        <div className="text-center mb-6 sm:mb-8">
          <div className="text-4xl mb-3">🧋</div>
          <h1 className="text-xl sm:text-2xl font-bold text-fg">Welcome Back</h1>
          <p className="text-muted text-sm mt-1">Enter your mobile number to sign in</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="input-icon-wrap">
            <Phone size={15} className="input-icon" aria-hidden />
            <input
              className="input-field w-full"
              placeholder="07X XXX XXXX"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3.5"
          >
            {loading ? 'Signing in...' : 'Login'}
          </motion.button>
        </form>

        <div className="mt-4">
          <SocialLoginButtons onSuccess={() => router.push('/account')} />
        </div>

        <p className="text-center text-sm text-muted mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/account/register" className="text-brand hover:text-brand-light font-medium">
            Register
          </Link>
        </p>
        <p className="text-center text-sm text-muted mt-3">
          Staff?{' '}
          <Link href="/admin/login" className="text-brand hover:text-brand-light font-medium">
            Staff login
          </Link>
        </p>

        <div className="mt-4 p-3 rounded-xl text-xs text-center bg-brand-subtle text-muted">
          Try any valid mobile e.g. <strong>0771234567</strong> — no OTP needed for now.
        </div>
      </motion.div>
    </div>
  );
}
