'use client';

import { useRef } from 'react';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { getOrderTrackUrl } from '@/lib/orderLinks';
import { downloadQrCodePng } from '@/lib/downloadQrCode';

type Props = {
  orderNumber: string;
};

export default function OrderQrCard({ orderNumber }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);

  function handleDownload() {
    const svg = wrapRef.current?.querySelector('svg');
    if (!svg) {
      toast.error('QR code not ready');
      return;
    }
    try {
      downloadQrCodePng(svg, `bingchun-order-${orderNumber}-qr.png`);
      toast.success('QR code downloaded');
    } catch {
      toast.error('Could not download QR code');
    }
  }

  return (
    <div className="card p-6 mb-5 text-center">
      <h3 className="font-semibold text-white mb-4">Show at Counter</h3>
      <div
        ref={wrapRef}
        className="inline-block p-4 rounded-xl"
        style={{ background: '#fff' }}
      >
        <QRCode value={getOrderTrackUrl(orderNumber)} size={160} level="M" />
      </div>
      <p className="text-muted text-sm mt-3">Scan to open order details — no login needed</p>
      <p className="text-muted text-xs mt-1">Or show at counter when collecting</p>
      <p className="text-white font-mono text-lg font-bold mt-2">{orderNumber}</p>
      <button
        type="button"
        onClick={handleDownload}
        className="btn-outline mt-4 px-5 py-2.5 text-sm inline-flex items-center gap-2 mx-auto"
      >
        <Download size={16} />
        Download QR code
      </button>
    </div>
  );
}
