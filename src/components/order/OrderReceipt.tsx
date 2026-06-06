'use client';

import Image from 'next/image';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import type { Order } from '@/types';
import { getStatusLabel } from '@/lib/orderStatus';
import {
  customerLabel,
  customerPhone,
  formatMoney,
  formatReceiptDate,
  itemOptionLine,
  PAYMENT_METHOD_LABELS,
  getPaymentStatusLabel,
} from '@/lib/receipt';
import { getOrderTrackUrl } from '@/lib/orderLinks';

type Props = {
  order: Order;
  className?: string;
};

export default function OrderReceipt({ order, className = '' }: Props) {
  const isDelivery = order.orderMode === 'DELIVERY';
  const name = customerLabel(order);
  const phone = customerPhone(order);

  return (
    <article className={`order-receipt ${className}`} id="order-receipt">
      <header className="order-receipt__header">
        <div className="order-receipt__brand">
          <Image
            src="/brand/logo.avif"
            alt="Bing Chun"
            width={40}
            height={40}
            className="order-receipt__logo"
          />
          <div>
            <p className="order-receipt__brand-name">Bing Chun</p>
            <p className="order-receipt__brand-tag">Bubble Tea · Sri Lanka</p>
          </div>
        </div>
        <div className="order-receipt__qr-wrap" title="Scan to view order">
          <QRCode value={getOrderTrackUrl(order.orderNumber)} size={56} level="M" />
          <p className="order-receipt__qr-hint">Scan to track</p>
        </div>
      </header>

      <div className="order-receipt__summary">
        <div>
          <p className="order-receipt__label">Receipt</p>
          <p className="order-receipt__number">#{order.orderNumber}</p>
          <p className="order-receipt__date">{formatReceiptDate(order.createdAt)}</p>
        </div>
        <div className="order-receipt__meta-inline">
          <span>{isDelivery ? '🛵 Delivery' : '🛍 Takeaway'}</span>
          <span>{getStatusLabel(order.status, order.orderMode)}</span>
          <span>{PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}</span>
          <span>{getPaymentStatusLabel(order)}</span>
        </div>
      </div>

      <div className="order-receipt__details">
        <p>
          <strong>Store:</strong> {order.store.name} — {order.store.addressLine}
        </p>
        {name && (
          <p>
            <strong>Customer:</strong> {name}
            {phone ? ` · ${phone}` : ''}
          </p>
        )}
        {!name && phone && (
          <p>
            <strong>Phone:</strong> {phone}
          </p>
        )}
        {isDelivery && order.address && (
          <p>
            <strong>Deliver to:</strong> {order.address.addressLine}
            {order.address.city ? `, ${order.address.city}` : ''}
          </p>
        )}
        {!isDelivery && order.pickupTime && (
          <p>
            <strong>Pickup:</strong> {order.pickupTime}
          </p>
        )}
      </div>

      <table className="order-receipt__table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td>
                <span className="order-receipt__item-name">{item.productName}</span>
                <span className="order-receipt__item-meta">{itemOptionLine(item)}</span>
                {item.toppings?.length > 0 && (
                  <span className="order-receipt__item-meta">
                    + {item.toppings.map((t) => t.toppingName).join(', ')}
                  </span>
                )}
              </td>
              <td>{item.quantity}</td>
              <td>{formatMoney(item.totalPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="order-receipt__totals">
        <div className="order-receipt__total-row">
          <span>Subtotal</span>
          <span>{formatMoney(order.subtotal)}</span>
        </div>
        {order.deliveryFee > 0 && (
          <div className="order-receipt__total-row">
            <span>Delivery</span>
            <span>{formatMoney(order.deliveryFee)}</span>
          </div>
        )}
        {order.discount > 0 && (
          <div className="order-receipt__total-row order-receipt__total-row--discount">
            <span>Promo{order.promoCode ? ` (${order.promoCode})` : ''}</span>
            <span>−{formatMoney(order.discount)}</span>
          </div>
        )}
        {order.loyaltyDiscount > 0 && (
          <div className="order-receipt__total-row order-receipt__total-row--discount">
            <span>Loyalty</span>
            <span>−{formatMoney(order.loyaltyDiscount)}</span>
          </div>
        )}
        <div className="order-receipt__total-row order-receipt__total-row--grand">
          <span>Total</span>
          <span>{formatMoney(order.total)}</span>
        </div>
      </div>

      <footer className="order-receipt__footer">
        <p>Thank you for choosing Bing Chun! 🧋 · bingchun.lk</p>
      </footer>
    </article>
  );
}
