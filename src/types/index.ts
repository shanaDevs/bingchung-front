export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  sortOrder: number;
  _count?: { products: number };
}

export interface Topping {
  id: string;
  name: string;
  extraPrice: number;
  isAvailable: boolean;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description?: string;
  basePrice: number;
  imageUrl?: string;
  tag?: string;
  isAvailable: boolean;
  category: { id: string; name: string; slug: string };
  toppings: { topping: Topping }[];
  storeAvailability?: ProductStoreAvailability;
}

export interface ProductStoreAvailability {
  atSelectedStore: boolean;
  branchStock?: {
    quantity: number;
    inStock: boolean;
  };
  fulfillmentStore?: {
    id: string;
    name: string;
    addressLine: string;
    city: string;
    distanceKm: number;
    stock?: number;
  };
}

export interface CartItem {
  id: string;
  productId: string;
  product: { id: string; name: string; imageUrl?: string; basePrice: number };
  size: 'REGULAR' | 'LARGE';
  sugarLevel: 'ZERO' | 'TWENTY_FIVE' | 'FIFTY' | 'SEVENTY_FIVE' | 'HUNDRED';
  iceLevel: 'NO_ICE' | 'LESS_ICE' | 'REGULAR';
  quantity: number;
  unitPrice: number;
  toppings: { topping: Topping }[];
}

export interface Cart {
  id: string;
  orderMode: 'DELIVERY' | 'TAKEAWAY';
  storeId?: string;
  items: CartItem[];
  subtotal: number;
}

export interface Store {
  id: string;
  name: string;
  addressLine: string;
  city: string;
  district: string;
  lat: number;
  lng: number;
  phone?: string;
  openTime: string;
  closeTime: string;
  isActive: boolean;
  isBusy: boolean;
  distanceKm?: number;
  deliveryZones?: DeliveryZone[];
}

export interface ReverseGeocodeResult {
  address: string;
  lat: number;
  lng: number;
}

export interface DeliveryZone {
  id: string;
  storeId: string;
  name: string;
  radiusKm: number;
  fee: number;
  minOrder: number;
}

export interface DeliveryValidation {
  eligible: boolean;
  message?: string;
  store?: { id: string; name: string; address: string };
  zone?: { id: string; name: string; fee: number; minOrder: number };
  distanceKm?: number;
  estimatedMinutes?: number;
}

export type OrderStatus = 'RECEIVED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
export type OrderMode = 'DELIVERY' | 'TAKEAWAY';
export type PaymentMethod = 'CARD' | 'PAYHERE' | 'CASH_ON_DELIVERY' | 'CASH_AT_COUNTER' | 'LOYALTY_POINTS';

export interface OrderStatusEvent {
  id: string;
  status: OrderStatus;
  note?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  orderMode: OrderMode;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: string;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  loyaltyDiscount: number;
  total: number;
  promoCode?: string;
  qrCode?: string;
  pickupTime?: string;
  queuePosition?: number | null;
  scheduledPickupAt?: string | null;
  estimatedMinutes: number;
  store: { id: string; name: string; addressLine: string; lat: number; lng: number };
  address?: { addressLine: string; city: string };
  items: OrderItem[];
  statusEvents: OrderStatusEvent[];
  guestName?: string | null;
  guestPhone?: string | null;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  size: string;
  sugarLevel: string;
  iceLevel: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  toppings: { toppingName: string; extraPrice: number }[];
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  loyaltyPoints: number;
  notifyEmail: boolean;
  notifySms: boolean;
  notifyPush: boolean;
}

export interface Address {
  id: string;
  label: string;
  addressLine: string;
  city: string;
  district: string;
  lat?: number;
  lng?: number;
  isDefault: boolean;
}

export interface PromoCode {
  code: string;
  description?: string;
  discountType: string;
  discountValue: number;
  minOrderValue: number;
  expiresAt?: string;
}

export interface AddressAutocomplete {
  placeId: string;
  description: string;
  lat: number;
  lng: number;
}
