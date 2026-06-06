'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Gift, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { PromoCode } from '@/types';

export default function PromotionsPage() {
  const { data: promos = [], isLoading } = useQuery<PromoCode[]>({
    queryKey: ['promos'],
    queryFn: () => api.get('/promos'),
  });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="text-center mb-10">
        <p className="section-label">Offers</p>
        <h1 className="text-3xl font-bold text-white mt-2">Promotions &amp; Deals</h1>
        <div className="section-underline" />
        <p className="text-muted mt-4 text-sm">Apply these codes at checkout to save on your order.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="card p-6 h-24 animate-pulse bg-navy-light" />
          ))}
        </div>
      ) : promos.length === 0 ? (
        <div className="card p-8 text-center text-muted">No active promotions right now. Check back soon!</div>
      ) : (
        <div className="space-y-4">
          {promos.map((p) => (
            <div key={p.code} className="card p-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-subtle flex items-center justify-center shrink-0">
                <Gift size={22} className="text-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-brand text-lg tracking-wide">{p.code}</p>
                {p.description && <p className="text-white text-sm mt-1">{p.description}</p>}
                <p className="text-muted text-xs mt-2">
                  Min order LKR {p.minOrderValue?.toLocaleString() ?? '—'}
                  {p.expiresAt && ` · Expires ${new Date(p.expiresAt).toLocaleDateString()}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 text-center">
        <Link href="/menu" className="btn-primary px-8 py-3.5 inline-flex items-center gap-2">
          Order Now <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  );
}
