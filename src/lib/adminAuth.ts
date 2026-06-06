'use client';

export interface AdminSession {
  id: string;
  name: string;
  email: string;
  role: 'SYSTEM_ADMIN' | 'STORE_MANAGER' | 'REPORT_VIEWER';
  storeId?: string | null;
  storeName?: string | null;
  storeCity?: string | null;
}

const SUPER_ADMIN_ROUTES = [
  '/admin/menu',
  '/admin/stores',
  '/admin/promos',
  '/admin/users',
  '/admin/reports',
  '/admin/settings',
];

export function setAdminSession(session: AdminSession, token: string) {
  localStorage.setItem('bc_admin_token', token);
  localStorage.setItem('bc_admin', JSON.stringify(session));
}

export function clearAdminSession() {
  localStorage.removeItem('bc_admin');
  localStorage.removeItem('bc_admin_token');
}

export function getAdminSession(): AdminSession | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('bc_admin');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AdminSession | null;
    if (!parsed?.id || !parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readAdminSession(): AdminSession | null {
  const session = getAdminSession();
  if (!session) {
    const raw = localStorage.getItem('bc_admin');
    if (raw) clearAdminSession();
  }
  return session;
}

export function isSuperAdmin(admin: AdminSession | null): boolean {
  return admin?.role === 'SYSTEM_ADMIN';
}

export function isBranchAdmin(admin: AdminSession | null): boolean {
  return admin?.role === 'STORE_MANAGER';
}

export function adminRoleLabel(role?: string): string {
  if (role === 'SYSTEM_ADMIN') return 'Super Admin';
  if (role === 'STORE_MANAGER') return 'Branch Admin';
  if (role === 'REPORT_VIEWER') return 'Report Viewer';
  return role ?? 'Admin';
}

export function isSuperAdminRoute(pathname: string): boolean {
  return SUPER_ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function canBranchAdminAccess(pathname: string): boolean {
  if (pathname === '/admin/login') return true;
  if (pathname === '/admin') return true;
  if (pathname === '/admin/orders' || pathname.startsWith('/admin/orders/')) return true;
  if (pathname === '/admin/stock' || pathname.startsWith('/admin/stock/')) return true;
  if (pathname === '/admin/wallets' || pathname.startsWith('/admin/wallets/')) return true;
  return false;
}

export function getBranchAdminHome(admin: AdminSession): string {
  return '/admin/orders';
}

export function getBranchWalletPath(admin: AdminSession): string | null {
  if (!admin.storeId) return null;
  return `/admin/wallets/${admin.storeId}`;
}

export function getPostLoginPath(admin: AdminSession): string {
  if (isBranchAdmin(admin)) return getBranchAdminHome(admin);
  return '/admin';
}
