'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard, Package, ShoppingBag, Store, Tag, Users, BarChart2, LogOut, Menu, X, Boxes, Settings, Wallet } from 'lucide-react';
import AdminNotificationBell from '@/components/admin/AdminNotificationBell';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { adminRoleLabel, clearAdminSession, getBranchWalletPath, isBranchAdmin, isSuperAdmin, readAdminSession, canBranchAdminAccess, getBranchAdminHome, type AdminSession } from '@/lib/adminAuth';

const ALL_NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, superOnly: false },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag, superOnly: false },
  { href: '/admin/stock', label: 'Branch Stock', icon: Boxes, superOnly: false },
  { href: '/admin/wallets', label: 'Wallet', icon: Wallet, superOnly: false },
  { href: '/admin/menu', label: 'Menu', icon: Package, superOnly: true },
  { href: '/admin/stores', label: 'Stores', icon: Store, superOnly: true },
  { href: '/admin/promos', label: 'Promotions', icon: Tag, superOnly: true },
  { href: '/admin/users', label: 'Staff', icon: Users, superOnly: true },
  { href: '/admin/reports', label: 'Reports', icon: BarChart2, superOnly: true },
  { href: '/admin/settings', label: 'Settings', icon: Settings, superOnly: true },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<AdminSession | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const session = readAdminSession();

    if (!session) {
      setAdminUser(null);
      if (pathname !== '/admin/login') router.replace('/admin/login');
      setAuthReady(true);
      return;
    }

    setAdminUser(session);

    if (isBranchAdmin(session)) {
      if (pathname === '/admin/wallets') {
        const walletPath = getBranchWalletPath(session);
        if (walletPath) {
          router.replace(walletPath);
          setAuthReady(true);
          return;
        }
      }

      if (!canBranchAdminAccess(pathname)) {
        router.replace(getBranchAdminHome(session));
        setAuthReady(true);
        return;
      }
    }

    setAuthReady(true);
  }, [pathname, router]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [sidebarOpen]);

  if (pathname === '/admin/login') return <>{children}</>;

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted text-sm" style={{ background: 'var(--color-navy)' }}>
        Loading admin panel…
      </div>
    );
  }

  if (isBranchAdmin(adminUser) && !canBranchAdminAccess(pathname)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted text-sm" style={{ background: 'var(--color-navy)' }}>
        Redirecting…
      </div>
    );
  }

  const navItems = ALL_NAV.filter((item) => !item.superOnly || isSuperAdmin(adminUser));

  function logout() {
    clearAdminSession();
    router.push('/admin/login');
  }

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-navy-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🧋</span>
          <div>
            <p className="font-bold text-white text-sm">Bing Chun</p>
            <p className="text-muted text-xs">
              {isBranchAdmin(adminUser) ? 'Branch Panel' : 'Admin Panel'}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="lg:hidden p-2 rounded-lg text-muted hover:text-white hover:bg-navy-card"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const href =
            item.href === '/admin/wallets' && isBranchAdmin(adminUser)
              ? getBranchWalletPath(adminUser!) ?? item.href
              : item.href;
          const isActive =
            pathname === href ||
            (href !== '/admin' && pathname.startsWith(`${href}/`)) ||
            (item.href === '/admin/wallets' && pathname.startsWith('/admin/wallets/'));
          return (
            <Link key={item.href} href={href} onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? 'bg-brand text-white' : 'text-muted hover:text-white hover:bg-navy-light'
              }`}>
              <item.icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-navy-border space-y-3">
        <div>
          <p className="text-xs text-muted mb-2 px-1">Appearance</p>
          <ThemeToggle showLabel className="w-full justify-center" />
        </div>
        {adminUser && (
          <div className="mb-3 px-4">
            <p className="text-white text-xs font-medium">{adminUser.name}</p>
            <p className="text-muted text-xs">{adminRoleLabel(adminUser.role)}</p>
            {adminUser.storeName && (
              <p className="text-brand text-xs mt-0.5 truncate">{adminUser.storeName.replace('Bing Chun - ', '')}</p>
            )}
          </div>
        )}
        <button onClick={logout} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-muted hover:text-red-400 hover:bg-red-400/10 w-full transition-all">
          <LogOut size={15} /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-navy)' }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-navy-light border-r border-navy-border fixed top-0 bottom-0 left-0 z-40">
        <Sidebar />
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-[100]">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 w-full h-full cursor-default"
            aria-label="Close menu"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 max-w-[85vw] bg-navy-light border-r border-navy-border z-10 shadow-2xl">
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-56 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 px-4 h-14 bg-navy-light border-b border-navy-border sticky top-0 z-30">
          <AdminNotificationBell adminUser={adminUser} />
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex items-center justify-center w-10 h-10 rounded-xl border border-navy-border text-white hover:border-brand hover:bg-brand-subtle transition-colors"
            aria-label="Open navigation menu"
            aria-expanded={sidebarOpen}
          >
            <Menu size={22} />
          </button>
          <span className="font-bold text-white text-sm">
            {isBranchAdmin(adminUser) ? 'Branch Panel' : 'Admin Panel'}
          </span>
        </div>
        <div className="hidden lg:flex items-center justify-end gap-2 px-6 py-3 border-b border-navy-border bg-navy-light/50 sticky top-0 z-20">
          <AdminNotificationBell adminUser={adminUser} />
        </div>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
