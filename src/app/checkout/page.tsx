'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft, Clock, CheckCircle, Store, MapPin, Phone, User } from 'lucide-react';
import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { AddressMapPicker, type AddressSelection } from '@/components/order/AddressMapPicker';
import type { DeliveryValidation, Address, User } from '@/types';
import toast from 'react-hot-toast';
import { getApiOrigin } from '@/lib/apiBase';
import { markOrderForCelebration } from '@/lib/orderCelebration';

const PICKUP_TIMES = ['ASAP', '30 mins', '1 hour', '2 hours'] as const;

export default function CheckoutPage() {
  const router = useRouter();
  const {
    items,
    orderMode,
    subtotal,
    deliveryInfo,
    takeawayInfo,
    setDeliveryInfo,
    setTakeawayInfo,
    completeOrder,
  } = useCartStore();
  const { isAuthenticated, user, login } = useAuthStore();
  const sub = subtotal();
  const isTakeaway = orderMode === 'TAKEAWAY';

  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [placing, setPlacing] = useState(false);
  const completingOrderRef = useRef(false);
  const [pickupTime, setPickupTime] = useState(takeawayInfo?.pickupTime ?? 'ASAP');

  const [addressSelection, setAddressSelection] = useState<AddressSelection | null>(
    deliveryInfo?.address && deliveryInfo.lat && deliveryInfo.lng
      ? { address: deliveryInfo.address, lat: deliveryInfo.lat, lng: deliveryInfo.lng }
      : null
  );
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<DeliveryValidation | null>(null);

  const { data: savedAddresses = [] } = useQuery<Address[]>({
    queryKey: ['addresses'],
    queryFn: () => api.get('/addresses', true),
    enabled: isAuthenticated && orderMode === 'DELIVERY',
  });

  const { data: paymentConfig } = useQuery({
    queryKey: ['payment-methods', orderMode],
    queryFn: () =>
      api.get<{
        methods: { id: string; label: string; icon?: string }[];
        payhereSandbox: boolean;
        payhereConfigured: boolean;
      }>(`/settings/payment-methods?orderMode=${orderMode}`),
    enabled: !!orderMode && !isTakeaway,
  });

  const paymentMethods = paymentConfig?.methods ?? [];
  const deliveryFee = orderMode === 'DELIVERY' && validation?.eligible ? (validation.zone?.fee || 0) : 0;
  const total = sub + deliveryFee;

  useEffect(() => {
    if (completingOrderRef.current) return;
    if (items.length === 0) router.replace('/menu');
    if (!orderMode) router.replace('/menu');
  }, [items.length, orderMode, router]);

  useEffect(() => {
    if (!isTakeaway && takeawayInfo) return;
    if (isTakeaway) setPaymentMethod('CASH_AT_COUNTER');
  }, [isTakeaway, takeawayInfo]);

  useEffect(() => {
    if (!isTakeaway && paymentMethods.length && !paymentMethods.some((m) => m.id === paymentMethod)) {
      setPaymentMethod(paymentMethods[0]?.id ?? '');
    }
  }, [paymentMethods, paymentMethod, isTakeaway]);

  useEffect(() => {
    if (user) {
      setGuestName(user.name);
      setGuestPhone(user.phone);
      if (user.email) setGuestEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    if (orderMode !== 'DELIVERY' || !deliveryInfo?.storeId || validation) return;
    setValidation({
      eligible: true,
      store: { id: deliveryInfo.storeId, name: deliveryInfo.storeName, address: '' },
      zone: {
        id: deliveryInfo.zoneId,
        name: '',
        fee: deliveryInfo.fee,
        minOrder: deliveryInfo.minOrder,
      },
      estimatedMinutes: deliveryInfo.estimatedMinutes,
    });
  }, [orderMode, deliveryInfo, validation]);

  useEffect(() => {
    if (takeawayInfo?.pickupTime) setPickupTime(takeawayInfo.pickupTime);
  }, [takeawayInfo?.pickupTime]);

  async function validateDelivery() {
    if (!addressSelection?.address) {
      toast.error('Please select your delivery address on the map');
      return;
    }
    setValidating(true);
    try {
      const result = await api.post<DeliveryValidation>('/stores/validate-delivery', {
        lat: addressSelection.lat,
        lng: addressSelection.lng,
        address: addressSelection.address,
      });
      setValidation(result);
      if (result.eligible) {
        setDeliveryInfo({
          storeId: result.store!.id,
          storeName: result.store!.name,
          zoneId: result.zone!.id,
          fee: result.zone!.fee,
          minOrder: result.zone!.minOrder,
          estimatedMinutes: result.estimatedMinutes!,
          address: addressSelection.address,
          lat: addressSelection.lat,
          lng: addressSelection.lng,
        });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not validate address');
    } finally {
      setValidating(false);
    }
  }

  async function placeOrder() {
    if (!isTakeaway && !paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }
    if (!isAuthenticated && (!guestName || !guestPhone)) {
      toast.error('Please fill in your contact details');
      return;
    }

    const storeId = orderMode === 'DELIVERY' ? deliveryInfo?.storeId : takeawayInfo?.storeId;

    if (!storeId) {
      toast.error(
        orderMode === 'DELIVERY'
          ? 'Please validate your delivery address'
          : 'Please select a pickup store from the menu first'
      );
      return;
    }

    if (orderMode === 'DELIVERY' && !validation?.eligible) {
      toast.error('Please check delivery availability for your address');
      return;
    }

    setPlacing(true);
    try {
      let useAuth = isAuthenticated;

      if (!useAuth) {
        const phone = guestPhone.trim().replace(/\s/g, '');
        const authRes = await api.post<{ token: string; user: User }>('/auth/phone/login', {
          phone,
          name: guestName.trim(),
          email: guestEmail.trim() || undefined,
        });
        login(authRes.token, authRes.user);
        useAuth = true;
        toast.success('Account created — you’re signed in! 🧋', { duration: 2500 });
      }

      const body: Record<string, unknown> = {
        orderMode,
        storeId,
        deliveryZoneId: deliveryInfo?.zoneId,
        paymentMethod: isTakeaway ? 'CASH_AT_COUNTER' : paymentMethod,
        pickupTime: isTakeaway ? pickupTime : undefined,
        items: items.map((item) => ({
          productId: item.product.id,
          size: item.size,
          sugarLevel: item.sugarLevel,
          iceLevel: item.iceLevel,
          toppingIds: item.toppings.map((t) => t.id),
          quantity: item.quantity,
        })),
      };

      if (orderMode === 'DELIVERY' && addressSelection) {
        body.deliveryAddress = {
          addressLine: addressSelection.address,
          city: 'Colombo',
          district: 'Colombo',
          lat: addressSelection.lat,
          lng: addressSelection.lng,
        };
      }

      const res = await api.post<{
        order: { orderNumber: string };
        paymentUrl?: string;
      }>('/orders', body, useAuth);

      const orderNumber = res.order.orderNumber;
      completingOrderRef.current = true;
      markOrderForCelebration(orderNumber);

      if (!isTakeaway && paymentMethod === 'PAYHERE') {
        completeOrder();
        toast.success('Opening PayHere…', { icon: '💳' });
        window.location.href = `${getApiOrigin()}/api/payments/payhere/${encodeURIComponent(orderNumber)}`;
        return;
      }

      if (res.paymentUrl) {
        completeOrder();
        window.location.href = res.paymentUrl;
        return;
      }

      completeOrder();
      router.push(`/account/orders?celebrate=1&order=${encodeURIComponent(orderNumber)}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  }

  const canPlaceOrder =
    (orderMode === 'DELIVERY' && validation?.eligible) ||
    (isTakeaway && Boolean(takeawayInfo?.storeId));

  const canPay =
    isTakeaway || Boolean(paymentMethod);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full">
      {paymentConfig && !paymentConfig.payhereConfigured && paymentMethods.some((m) => m.id === 'PAYHERE') && (
        <div className="mb-4 p-3 rounded-xl alert-error text-sm">
          PayHere is not configured yet. Use cash on delivery for now.
        </div>
      )}

      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <Link href="/cart" className="btn-outline p-2 shrink-0">
          <ChevronLeft size={18} />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-fg">Checkout</h1>
          <p className="text-muted text-sm truncate">
            {orderMode === 'DELIVERY' ? '🛵 Delivery' : '🛍 Takeaway'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-8">
        <div className="lg:col-span-2 space-y-4 sm:space-y-5">
          {/* Location / branch */}
          <div className="card p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="step-badge step-badge-active">1</div>
              <h3 className="font-semibold text-fg">
                {orderMode === 'DELIVERY' ? 'Delivery Address' : 'Pickup Store'}
              </h3>
            </div>

            {orderMode === 'DELIVERY' ? (
              <div className="space-y-4">
                {savedAddresses.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted font-medium">Saved Addresses</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {savedAddresses.map((addr) => (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => {
                            setAddressSelection({
                              address: `${addr.addressLine}, ${addr.city}`,
                              lat: addr.lat ?? 6.9271,
                              lng: addr.lng ?? 79.8612,
                            });
                            setValidation(null);
                          }}
                          className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${
                            addressSelection?.address === `${addr.addressLine}, ${addr.city}`
                              ? 'border-brand bg-brand-subtle'
                              : 'border-navy-border hover:border-brand'
                          }`}
                        >
                          <span className="text-xs font-medium text-brand">{addr.label}</span>
                          <p className="text-fg text-sm mt-0.5">{addr.addressLine}, {addr.city}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <AddressMapPicker
                  value={addressSelection}
                  variant="prominent"
                  onChange={(sel) => {
                    setAddressSelection(sel);
                    setValidation(null);
                  }}
                />

                <button
                  type="button"
                  onClick={validateDelivery}
                  disabled={validating || !addressSelection}
                  className="btn-primary px-5 py-2.5 text-sm w-full sm:w-auto"
                >
                  {validating ? 'Checking...' : validation?.eligible ? 'Update Delivery Check' : 'Check Delivery'}
                </button>

                {validation && (
                  <div className={`p-3 rounded-xl text-sm ${validation.eligible ? 'alert-success' : 'alert-error'}`}>
                    {validation.eligible
                      ? `Delivery available · ETA ${validation.estimatedMinutes} min · Fee LKR ${validation.zone?.fee}`
                      : validation.message}
                  </div>
                )}
              </div>
            ) : takeawayInfo ? (
              <div className="space-y-4">
                <div className="order-branch-card">
                  <div className="order-branch-card__icon">
                    <Store size={20} className="text-brand" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-brand">Your branch</p>
                    <p className="font-semibold text-fg">{takeawayInfo.storeName}</p>
                    <p className="text-xs text-muted mt-0.5">Selected when you started your order</p>
                  </div>
                  <CheckCircle size={20} className="text-green-500 shrink-0" />
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted font-medium">Pickup Time</p>
                  <div className="flex gap-2 flex-wrap">
                    {PICKUP_TIMES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setPickupTime(t);
                          setTakeawayInfo({ ...takeawayInfo, pickupTime: t });
                        }}
                        className={`chip ${pickupTime === t ? 'chip-active' : ''}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-muted flex items-center gap-1.5">
                  <MapPin size={12} className="text-brand shrink-0" />
                  Pay at the counter when you collect — no online payment needed.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">
                No pickup store selected.{' '}
                <Link href="/menu" className="text-brand hover:underline">
                  Go back to menu
                </Link>{' '}
                and choose takeaway first.
              </p>
            )}
          </div>

          {/* Contact */}
          <div className="card p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="step-badge step-badge-active">{isTakeaway ? '2' : '2'}</div>
              <h3 className="font-semibold text-fg">Contact Details</h3>
            </div>

            {isAuthenticated && user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl border border-navy-border bg-navy-light/50">
                  <User size={18} className="text-brand shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-fg">{user.name}</p>
                    <p className="text-sm text-muted flex items-center gap-1.5 mt-0.5">
                      <Phone size={12} />
                      {user.phone}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted">
                  Signed in — your orders appear in{' '}
                  <Link href="/account/orders" className="text-brand hover:underline">
                    order history
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  className="input-field w-full"
                  placeholder="Full Name *"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                />
                <input
                  className="input-field w-full"
                  placeholder="Mobile Number *"
                  type="tel"
                  inputMode="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                />
                <input
                  className="input-field w-full"
                  placeholder="Email (optional)"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                />
                <p className="text-xs text-muted">
                  Your mobile number creates a Bing Chun account automatically when you place the order.
                  No OTP needed.
                </p>
              </div>
            )}
          </div>

          {/* Payment — delivery only */}
          {!isTakeaway && (
            <div className="card p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="step-badge step-badge-active">3</div>
                <h3 className="font-semibold text-fg">Payment Method</h3>
              </div>

              <div className="space-y-2">
                {paymentMethods.length === 0 ? (
                  <p className="text-sm text-muted">No payment methods available.</p>
                ) : (
                  paymentMethods.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-sm font-medium transition-all ${
                        paymentMethod === m.id
                          ? 'border-brand bg-brand-subtle text-fg'
                          : 'border-navy-border text-muted hover:border-brand'
                      }`}
                    >
                      <span className="text-xl">{m.icon || '💳'}</span>
                      <span className="text-left flex-1">{m.label}</span>
                      {paymentMethod === m.id && <CheckCircle size={16} className="text-brand shrink-0" />}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-4 sm:p-5">
            <h3 className="font-semibold text-fg mb-4">Order Summary</h3>
            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm gap-2">
                  <span className="text-muted line-clamp-2 flex-1">
                    {item.product.name} × {item.quantity}
                  </span>
                  <span className="text-fg shrink-0">
                    LKR {(item.unitPrice * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-navy-border pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Subtotal</span>
                <span className="text-fg">LKR {sub.toLocaleString()}</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Delivery</span>
                  <span className="text-fg">LKR {deliveryFee.toLocaleString()}</span>
                </div>
              )}
              {isTakeaway && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Payment</span>
                  <span className="text-fg">Cash at counter</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-2 border-t border-navy-border">
                <span className="text-fg">Total</span>
                <span className="text-brand text-lg">LKR {total.toLocaleString()}</span>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={placeOrder}
              disabled={placing || !canPlaceOrder || !canPay}
              className="btn-primary w-full py-3.5 sm:py-4 mt-5 text-sm sm:text-base"
            >
              {placing ? 'Placing Order...' : isTakeaway ? 'Place Pickup Order' : 'Place Order'}
            </motion.button>
          </div>

          <p className="text-xs text-center text-muted px-2">🔒 Secured checkout</p>
        </div>
      </div>
    </div>
  );
}
