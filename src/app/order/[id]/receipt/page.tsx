'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, Loader2, Printer, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import type { Order } from '@/types';
import OrderReceipt from '@/components/order/OrderReceipt';
import { downloadReceiptPng } from '@/lib/downloadReceipt';

export default function OrderReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const [downloading, setDownloading] = useState(false);

  const { data: order, isLoading, isError } = useQuery<Order>({
    queryKey: ['order', id, 'receipt'],
    queryFn: () => api.get(`/orders/${id}`),
  });

  function handlePrint() {
    window.print();
  }

  async function handleDownload() {
    if (!order || downloading) return;
    const el = document.getElementById('order-receipt');
    if (!el) {
      toast.error('Receipt not ready');
      return;
    }
    setDownloading(true);
    try {
      await downloadReceiptPng(el, order.orderNumber);
      toast.success('Receipt downloaded');
    } catch {
      toast.error('Could not download receipt');
    } finally {
      setDownloading(false);
    }
  }

  async function handleShare() {
    if (!order) return;
    const url = window.location.href;
    const text = `Bing Chun receipt — Order #${order.orderNumber} — ${order.total.toLocaleString()} LKR`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Bing Chun Receipt', text, url });
        return;
      } catch {
        /* user cancelled */
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success('Receipt link copied!');
    } catch {
      toast.error('Could not copy link');
    }
  }

  if (isLoading) {
    return (
      <div className="receipt-page">
        <div className="receipt-page__loading">
          <div className="text-4xl mb-3 animate-bounce">🧾</div>
          <p className="text-muted text-sm">Loading receipt…</p>
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="receipt-page">
        <div className="receipt-page__loading text-center">
          <p className="text-fg font-semibold mb-2">Receipt not found</p>
          <Link href="/account/orders" className="btn-primary px-5 py-2.5 text-sm inline-flex">
            My Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="receipt-page">
      <div className="receipt-toolbar no-print">
        <Link href={`/order/${order.orderNumber}`} className="btn-outline p-2.5 shrink-0">
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-fg truncate">Receipt</h1>
          <p className="text-muted text-xs truncate">#{order.orderNumber}</p>
        </div>
        <button type="button" onClick={handleShare} className="btn-outline p-2.5 shrink-0" aria-label="Share receipt">
          <Share2 size={18} />
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="btn-outline px-3 py-2.5 text-sm flex items-center gap-1.5 shrink-0 disabled:opacity-60"
        >
          {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {/* <span className="hidden sm:inline">Download</span> */}
        </button>
        <button type="button" onClick={handlePrint} className="btn-primary px-4 py-2.5 text-sm flex items-center gap-2 shrink-0">
          <Printer size={16} /> Print
        </button>
      </div>

      <div className="receipt-page__canvas">
        <OrderReceipt order={order} />
      </div>
    </div>
  );
}
