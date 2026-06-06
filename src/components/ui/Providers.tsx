'use client';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { queryClient } from '@/lib/queryClient';
import SiteOrderPrompt from '@/components/order/SiteOrderPrompt';
import EcoPromoModal from '@/components/promo/EcoPromoModal';
import ThemeProvider from '@/components/ui/ThemeProvider';
import CartCelebration from '@/components/cart/CartCelebration';
import CupPourOverlay from '@/components/cart/CupPourOverlay';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import CustomerSocketProvider from '@/components/notifications/CustomerSocketProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <CustomerSocketProvider>
        <EcoPromoModal />
        <SiteOrderPrompt />
        <CupPourOverlay />
        <CartCelebration />
        <ConfirmDialog />
        {children}
        </CustomerSocketProvider>
      </ThemeProvider>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--color-navy-card)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-navy-border)',
            borderRadius: '10px',
            fontFamily: 'Poppins, sans-serif',
          },
          success: { iconTheme: { primary: '#307ef2', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  );
}
