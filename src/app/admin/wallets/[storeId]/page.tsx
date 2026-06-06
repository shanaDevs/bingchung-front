'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import BranchWalletPanel from '@/components/admin/BranchWalletPanel';
import {
  getAdminSession,
  getBranchAdminHome,
  isBranchAdmin,
  isSuperAdmin,
  type AdminSession,
} from '@/lib/adminAuth';

export default function BranchWalletPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = getAdminSession();
    setAdmin(session);

    if (session && isBranchAdmin(session) && session.storeId && session.storeId !== storeId) {
      router.replace(`/admin/wallets/${session.storeId}`);
      return;
    }

    setReady(true);
  }, [storeId, router]);

  if (!ready || !storeId || !admin) {
    return (
      <div className="py-16 text-center text-muted text-sm">Loading branch wallet…</div>
    );
  }

  return (
    <BranchWalletPanel
      storeId={storeId}
      superAdmin={isSuperAdmin(admin)}
      showBackLink={isSuperAdmin(admin) || isBranchAdmin(admin)}
      backHref={isBranchAdmin(admin) ? getBranchAdminHome(admin) : '/admin/wallets'}
      backLabel={isBranchAdmin(admin) ? 'Back to orders' : 'All branches'}
    />
  );
}
