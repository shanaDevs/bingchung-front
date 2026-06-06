'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { User, Menu, X, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import BrandLogo from '@/components/ui/BrandLogo';
import ThemeToggle from '@/components/ui/ThemeToggle';
import CupIcon, { cupFillFromCount } from '@/components/cart/CupIcon';
import { useCupPourPulse } from '@/hooks/useCupPourPulse';
import { useClientHydrated } from '@/hooks/useClientHydrated';
import CustomerNotificationBell from '@/components/notifications/CustomerNotificationBell';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useClientHydrated();
  const itemCount = useCartStore((s) => s.itemCount());
  const subtotal = useCartStore((s) => s.subtotal());
  const pourPulse = useCupPourPulse();
  const displayCount = hydrated ? itemCount : 0;
  const fillLevel = cupFillFromCount(displayCount);
  const { isAuthenticated, user, logout } = useAuthStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const links = [
    { href: '/menu', label: 'Menu' },
    { href: '/stores', label: 'Stores' },
    { href: '/promotions', label: 'Promotions' },
  ];

  const isActive = (href: string) => pathname.startsWith(href);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [mobileOpen]);

  if (pathname.startsWith('/admin')) return null;

  return (
    <nav className="sticky-nav glass z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="group shrink-0" onClick={() => setMobileOpen(false)}>
            <BrandLogo size={40} />
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive(l.href)
                    ? 'bg-brand text-white'
                    : 'text-muted hover:text-fg hover:bg-navy-card'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />

            <Link href="/menu" className="hidden sm:flex btn-white px-5 py-2 text-sm">
              Order Now
            </Link>

            {isAuthenticated && <CustomerNotificationBell />}

            <Link
              href="/cart"
              className="relative flex items-center gap-2 btn-outline px-3 py-2 text-sm"
              onClick={() => setMobileOpen(false)}
              aria-label="Your cup"
              {...(hydrated && displayCount > 0
                ? { 'aria-description': `${displayCount} items in cart` }
                : {})}
            >
              <CupIcon
                fillLevel={fillLevel}
                fillFrom={hydrated ? pourPulse?.fillBefore : undefined}
                pouring={hydrated && pourPulse != null}
                size="sm"
                itemCount={hydrated ? displayCount : undefined}
              />
              {hydrated && displayCount > 0 && (
                <span className="hidden sm:block text-brand font-semibold text-xs">
                  LKR {subtotal.toLocaleString()}
                </span>
              )}
            </Link>

            {isAuthenticated ? (
              <div className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 btn-outline px-3 py-2 text-sm"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                >
                  <User size={16} />
                  <span className="max-w-24 truncate">{user?.name?.split(' ')[0]}</span>
                  <ChevronDown size={14} className={`transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-12 card p-2 min-w-44 shadow-card z-[60]"
                      role="menu"
                    >
                      <Link href="/account" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-navy-light transition-colors">
                        <User size={14} /> My Account
                      </Link>
                      <Link href="/account/orders" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-navy-light transition-colors">
                        🧾 My Orders
                      </Link>
                      <div className="my-1 border-t border-navy-border" />
                      <button
                        type="button"
                        onClick={() => { logout(); setUserMenuOpen(false); router.push('/'); }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-brand hover:bg-navy-light transition-colors"
                      >
                        Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link href="/account/login" className="btn-outline px-3 py-2 text-sm hidden sm:flex items-center gap-1">
                <User size={15} /> Login
              </Link>
            )}

            <button
              type="button"
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl border border-navy-border text-fg hover:border-brand hover:bg-brand-subtle transition-colors shrink-0"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              type="button"
              key="mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[55] bg-black/50 md:hidden"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              key="mobile-menu"
              id="mobile-navigation"
              role="navigation"
              aria-label="Mobile"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative z-[56] md:hidden border-t border-navy-border bg-navy-light shadow-lg"
            >
              <div className="px-4 py-4 space-y-1 max-h-[min(70vh,480px)] overflow-y-auto">
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                      isActive(l.href) ? 'bg-brand text-white' : 'text-fg hover:bg-navy-card'
                    }`}
                  >
                    {l.label}
                  </Link>
                ))}

                {isAuthenticated && (
                  <>
                    <Link
                      href="/account"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 px-4 py-3.5 rounded-xl text-sm font-medium text-fg hover:bg-navy-card"
                    >
                      <User size={16} /> My Account
                    </Link>
                    <Link
                      href="/account/orders"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 px-4 py-3.5 rounded-xl text-sm font-medium text-fg hover:bg-navy-card"
                    >
                      🧾 My Orders
                    </Link>
                  </>
                )}

                <div className="px-1 py-2">
                  <p className="text-xs text-muted mb-2 px-1">Appearance</p>
                  <ThemeToggle showLabel className="w-full justify-center" />
                </div>

                <div className="pt-3 space-y-2 border-t border-navy-border mt-2">
                  <Link href="/menu" onClick={() => setMobileOpen(false)} className="btn-primary w-full py-3.5">
                    Order Now
                  </Link>
                  {!isAuthenticated ? (
                    <Link
                      href="/account/login"
                      onClick={() => setMobileOpen(false)}
                      className="btn-outline w-full py-3.5 flex items-center justify-center gap-2"
                    >
                      <User size={15} /> Login
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { logout(); setMobileOpen(false); router.push('/'); }}
                      className="btn-outline w-full py-3.5 text-brand"
                    >
                      Sign Out
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
