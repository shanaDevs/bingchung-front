'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Bike, ShoppingBag, Store, Clock, CheckCircle, CheckCircle2, Loader2, Navigation, ChevronLeft, MapPin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCartStore, type OrderMode } from '@/store/cartStore';
import { AddressMapPicker, type AddressSelection } from './AddressMapPicker';
import type { Store as StoreType, DeliveryValidation } from '@/types';
import toast from 'react-hot-toast';
import { confirmDialog } from '@/store/confirmStore';
import { getCurrentPositionWithFallback } from '@/lib/geolocation';
import { MASCOT_IMAGES } from '@/lib/mascotImages';
import { playModeSelectSound, playLocationPinSound, playConfirmClickSound } from '@/lib/uiSounds';

interface OrderModeSelectorProps {
  onComplete?: () => void;
  showContinueButton?: boolean;
  onModeChange?: (mode: OrderMode) => void;
  onStepChange?: (step: 'choose' | 'setup') => void;
}

const PICKUP_TIMES = ['ASAP', '30 mins', '1 hour', '2 hours'] as const;
const TAKEAWAY_MAX_KM = 7;

export function OrderModeSelector({
  onComplete,
  showContinueButton = true,
  onModeChange,
  onStepChange,
}: OrderModeSelectorProps) {
  const { orderMode, setOrderMode, setDeliveryInfo, setTakeawayInfo, deliveryInfo, takeawayInfo, items, clearCart, clearMode } =
    useCartStore();

  const hasSavedSetup = Boolean(
    (orderMode === 'DELIVERY' && deliveryInfo) || (orderMode === 'TAKEAWAY' && takeawayInfo)
  );
  const [step, setStep] = useState<'choose' | 'setup'>(hasSavedSetup ? 'setup' : 'choose');
  const [mode, setMode] = useState<OrderMode>(() => {
    if (orderMode === 'TAKEAWAY' || takeawayInfo) return 'TAKEAWAY';
    if (orderMode === 'DELIVERY' || deliveryInfo) return 'DELIVERY';
    return 'DELIVERY';
  });

  useEffect(() => {
    onStepChange?.(step);
  }, [step, onStepChange]);

  useEffect(() => {
    if (step === 'setup') onModeChange?.(mode);
  }, [mode, step, onModeChange]);

  const [addressSelection, setAddressSelection] = useState<AddressSelection | null>(() => {
    if (deliveryInfo?.address && deliveryInfo.lat != null && deliveryInfo.lng != null) {
      return { address: deliveryInfo.address, lat: deliveryInfo.lat, lng: deliveryInfo.lng };
    }
    return null;
  });
  const [validation, setValidation] = useState<DeliveryValidation | null>(null);
  const [validating, setValidating] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreType | null>(null);
  const [districtFilter, setDistrictFilter] = useState('');
  const [pickupTime, setPickupTime] = useState(takeawayInfo?.pickupTime ?? 'ASAP');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const nearestAutoApplied = useRef(false);
  const userPickedStore = useRef(false);
  const validateSeq = useRef(0);

  const { data: allStores = [], isFetching: storesLoading } = useQuery<StoreType[]>({
    queryKey: ['stores', 'takeaway', pickupCoords?.lat, pickupCoords?.lng],
    queryFn: () => {
      const params = new URLSearchParams();
      if (pickupCoords?.lat != null && pickupCoords?.lng != null) {
        params.set('lat', String(pickupCoords.lat));
        params.set('lng', String(pickupCoords.lng));
      }
      const qs = params.toString();
      return api.get(`/stores${qs ? `?${qs}` : ''}`);
    },
    enabled: mode === 'TAKEAWAY' && step === 'setup',
  });

  const districts = [...new Set(allStores.map((s) => s.district))].sort();
  const stores = districtFilter
    ? allStores
        .filter((s) => s.district === districtFilter)
        .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))
    : [];
  const nearestWithinRange = allStores.find(
    (s) => s.distanceKm != null && s.distanceKm <= TAKEAWAY_MAX_KM
  );

  useEffect(() => {
    if (deliveryInfo?.address && deliveryInfo.lat != null && deliveryInfo.lng != null && !addressSelection) {
      setAddressSelection({
        address: deliveryInfo.address,
        lat: deliveryInfo.lat,
        lng: deliveryInfo.lng,
      });
    }
  }, [deliveryInfo, addressSelection]);

  useEffect(() => {
    if (mode !== 'TAKEAWAY' || !takeawayInfo?.storeId || allStores.length === 0) return;
    const saved = allStores.find((s) => s.id === takeawayInfo.storeId);
    if (saved) {
      setDistrictFilter(saved.district);
      setSelectedStore(saved);
      userPickedStore.current = true;
      nearestAutoApplied.current = true;
    }
    if (takeawayInfo.pickupTime) setPickupTime(takeawayInfo.pickupTime);
  }, [mode, allStores, takeawayInfo]);

  const validateDeliveryAt = useCallback(async (sel: AddressSelection, silent = true) => {
    setValidating(true);
    const seq = ++validateSeq.current;
    try {
      const result = await api.post<DeliveryValidation>('/stores/validate-delivery', {
        lat: sel.lat,
        lng: sel.lng,
        address: sel.address,
      });
      if (seq !== validateSeq.current) return;
      setValidation(result);
      if (!silent && !result.eligible) {
        toast.error(result.message || 'Delivery not available to this address');
      }
    } catch {
      if (seq !== validateSeq.current) return;
      setValidation(null);
      if (!silent) toast.error('Could not check delivery for this location');
    } finally {
      if (seq === validateSeq.current) setValidating(false);
    }
  }, []);

  useEffect(() => {
    if (step !== 'setup' || mode !== 'DELIVERY' || !addressSelection?.lat) return;
    const t = setTimeout(() => {
      void validateDeliveryAt(addressSelection, true);
    }, 650);
    return () => clearTimeout(t);
  }, [addressSelection, step, mode, validateDeliveryAt]);

  const applyNearestOutlet = useCallback((storesList: StoreType[], showToast: boolean) => {
    if (userPickedStore.current || nearestAutoApplied.current) return false;
    const nearest = storesList.find((s) => s.distanceKm != null && s.distanceKm <= TAKEAWAY_MAX_KM);
    if (!nearest) return false;

    nearestAutoApplied.current = true;
    setDistrictFilter(nearest.district);
    setSelectedStore(nearest);
    if (showToast) {
      const label = nearest.name.replace('Bing Chun - ', '');
      toast.success(`Nearest outlet: ${label} (${nearest.distanceKm!.toFixed(1)} km away)`);
    }
    return true;
  }, []);

  const detectPickupLocation = useCallback(async (showToast = true) => {
    setDetectingLocation(true);
    try {
      let coords: { lat: number; lng: number };
      if (addressSelection?.lat != null && addressSelection?.lng != null) {
        coords = { lat: addressSelection.lat, lng: addressSelection.lng };
      } else {
        coords = await getCurrentPositionWithFallback();
      }
      setPickupCoords(coords);

      const params = new URLSearchParams({
        lat: String(coords.lat),
        lng: String(coords.lng),
      });
      const withDist = await api.get<StoreType[]>(`/stores?${params.toString()}`);
      const applied = applyNearestOutlet(withDist, showToast);
      if (!applied && showToast) {
        toast('No outlet within 7 km — please pick a district below.', { icon: '📍' });
      }
    } catch {
      if (showToast) {
        toast.error('Could not detect location. Please select a district manually.');
      }
    } finally {
      setDetectingLocation(false);
    }
  }, [addressSelection, applyNearestOutlet]);

  useEffect(() => {
    if (step !== 'setup' || mode !== 'TAKEAWAY' || pickupCoords || detectingLocation) return;
    if (takeawayInfo?.storeId) return;
    void detectPickupLocation(false);
  }, [step, mode, pickupCoords, detectingLocation, takeawayInfo?.storeId, detectPickupLocation]);

  useEffect(() => {
    if (step !== 'setup' || mode !== 'TAKEAWAY' || !pickupCoords || allStores.length === 0) return;
    applyNearestOutlet(allStores, false);
  }, [step, mode, pickupCoords, allStores, applyNearestOutlet]);

  async function pickMode(next: OrderMode) {
    if (orderMode && orderMode !== next && items.length > 0) {
      const ok = await confirmDialog({
        title: 'Switch order type?',
        message: 'Switching order type will empty your cup. Do you want to continue?',
        confirmLabel: 'Continue',
        cancelLabel: 'Keep my cup',
      });
      if (!ok) return;
      clearCart();
      clearMode();
    }
    playModeSelectSound(next);
    setMode(next);
    setStep('setup');
    requestAnimationFrame(() => {
      document.getElementById('order-setup')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    setValidation(null);
    setSelectedStore(null);
    setDistrictFilter('');
    setPickupCoords(null);
    nearestAutoApplied.current = false;
    userPickedStore.current = false;
  }

  function goBackToChoose() {
    setStep('choose');
    setValidation(null);
  }

  function selectDistrict(district: string) {
    setDistrictFilter(district);
    setSelectedStore(null);
    userPickedStore.current = true;
  }

  function saveDeliveryFromValidation(result: DeliveryValidation, sel: AddressSelection) {
    if (!result.eligible || !result.store || !result.zone) return false;
    setOrderMode('DELIVERY');
    setDeliveryInfo({
      storeId: result.store.id,
      storeName: result.store.name,
      zoneId: result.zone.id,
      fee: result.zone.fee,
      minOrder: result.zone.minOrder,
      estimatedMinutes: result.estimatedMinutes!,
      address: sel.address,
      lat: sel.lat,
      lng: sel.lng,
    });
    return true;
  }

  async function validateAndSaveDelivery() {
    if (!addressSelection?.address) {
      toast.error('Please set your delivery location on the map');
      return;
    }

    if (validation?.eligible && validation.store && validation.zone) {
      playConfirmClickSound();
      if (saveDeliveryFromValidation(validation, addressSelection)) {
        toast.success(`Delivering from ${validation.store.name} · ~${validation.estimatedMinutes} min`);
        onComplete?.();
      }
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
        playConfirmClickSound();
        if (saveDeliveryFromValidation(result, addressSelection)) {
          toast.success(`Delivery available · ETA ${result.estimatedMinutes} min`);
          onComplete?.();
        }
      } else {
        toast.error(result.message || 'Delivery not available to this address');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not validate address');
    } finally {
      setValidating(false);
    }
  }

  function selectTakeawayStore(store: StoreType) {
    userPickedStore.current = true;
    setSelectedStore(store);
    setTakeawayInfo({
      storeId: store.id,
      storeName: store.name,
      pickupTime,
    });
  }

  function confirmTakeaway() {
    if (!selectedStore) {
      toast.error('Please select a store for pickup');
      return;
    }
    playConfirmClickSound();
    setOrderMode('TAKEAWAY');
    setTakeawayInfo({
      storeId: selectedStore.id,
      storeName: selectedStore.name,
      pickupTime,
    });
    toast.success(`Pickup from ${selectedStore.name}`);
    onComplete?.();
  }

  return (
    <div className="order-flow">
      <AnimatePresence mode="wait">
        {step === 'choose' ? (
          <motion.div
            key="choose"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.28 }}
            className="order-flow-step"
          >
            <div className="order-flow-step__header text-center sm:text-left">
              <span className="order-flow-step__badge">Step 1 of 2</span>
              <h3 className="order-flow-step__title">How would you like to order?</h3>
              <p className="order-flow-step__sub">Choose delivery or pickup — like Pizza Hut, quick and easy.</p>
            </div>

            <div className="order-mode-choices order-mode-choices--pizza">
              <button type="button" onClick={() => void pickMode('DELIVERY')} className="order-mode-choice order-mode-choice--pizza">
                <span className="order-mode-choice__mascot" aria-hidden>
                  <Image src={MASCOT_IMAGES.delivery} alt="" width={88} height={88} className="object-contain" />
                </span>
                <span className="order-mode-choice__icon order-mode-choice__icon--small" aria-hidden>
                  <Bike size={18} />
                </span>
                <span className="order-mode-choice__title">Delivery</span>
                <span className="order-mode-choice__sub">Hot &amp; fresh to your door</span>
              </button>

              <button type="button" onClick={() => void pickMode('TAKEAWAY')} className="order-mode-choice order-mode-choice--pizza">
                <span className="order-mode-choice__mascot" aria-hidden>
                  <Image src={MASCOT_IMAGES.takeaway} alt="" width={88} height={88} className="object-contain" />
                </span>
                <span className="order-mode-choice__icon order-mode-choice__icon--small" aria-hidden>
                  <ShoppingBag size={18} />
                </span>
                <span className="order-mode-choice__title">Takeaway</span>
                <span className="order-mode-choice__sub">Pick up from a store</span>
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={`setup-${mode}`}
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 28 }}
            transition={{ duration: 0.28 }}
            className="order-flow-step"
          >
            <button type="button" onClick={goBackToChoose} className="order-flow-back">
              <ChevronLeft size={16} />
              Change order type
            </button>

            <div className="order-flow-step__header">
              <span className="order-flow-step__badge">Step 2 of 2</span>
              <div className="flex items-start gap-3">
                <Image
                  src={mode === 'DELIVERY' ? MASCOT_IMAGES.search : MASCOT_IMAGES.takeaway}
                  alt=""
                  width={56}
                  height={56}
                  className="order-flow-step__mascot object-contain shrink-0 hidden sm:block"
                />
                <div>
                  <h3 className="order-flow-step__title">
                    {mode === 'DELIVERY' ? 'Where should we deliver?' : 'Choose your pickup store'}
                  </h3>
                  <p className="order-flow-step__sub">
                    {mode === 'DELIVERY'
                      ? 'Your location is on the map. Move the pin to update your address and nearest branch.'
                      : `We find the nearest outlet within ${TAKEAWAY_MAX_KM} km, or pick a district.`}
                  </p>
                </div>
              </div>
            </div>

            {mode === 'DELIVERY' ? (
              <div className="space-y-4">
                <AddressMapPicker
                  value={addressSelection}
                  variant="prominent"
                  autoDetectOnMount={!addressSelection}
                  onLocationResolved={playLocationPinSound}
                  onChange={(sel) => {
                    setAddressSelection(sel);
                    setValidation(null);
                  }}
                />

                {(validating || validation) && (
                  <div className="order-branch-card">
                    {validating ? (
                      <div className="flex items-center gap-2 text-sm text-brand">
                        <Loader2 size={16} className="animate-spin shrink-0" />
                        Finding your nearest branch...
                      </div>
                    ) : validation?.eligible ? (
                      <>
                        <div className="order-branch-card__icon">
                          <Store size={20} className="text-brand" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-brand">Nearest branch</p>
                          <p className="font-semibold text-fg truncate">{validation.store?.name}</p>
                          <p className="text-xs text-muted mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
                            <span>Fee LKR {validation.zone?.fee}</span>
                            <span>·</span>
                            <span>~{validation.estimatedMinutes} min</span>
                            {validation.distanceKm != null && (
                              <>
                                <span>·</span>
                                <span>{validation.distanceKm} km away</span>
                              </>
                            )}
                          </p>
                        </div>
                        <CheckCircle2 size={20} className="text-green-500 shrink-0" />
                      </>
                    ) : (
                      <div className="flex items-start gap-2 text-sm text-red-400">
                        <MapPin size={16} className="shrink-0 mt-0.5" />
                        <span>{validation?.message || 'Delivery not available here. Try takeaway or move the pin.'}</span>
                      </div>
                    )}
                  </div>
                )}

                {showContinueButton && (
                  <button
                    type="button"
                    onClick={validateAndSaveDelivery}
                    disabled={validating || !addressSelection || !validation?.eligible}
                    className="btn-primary w-full py-3.5"
                  >
                    {validating ? 'Checking delivery...' : 'Continue to Menu'}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {(detectingLocation || (storesLoading && allStores.length === 0)) && (
                  <div className="flex items-center gap-3 text-sm text-brand p-3 rounded-xl bg-brand-subtle border border-brand/30">
                    <Image src={MASCOT_IMAGES.thinkingLoading} alt="" width={40} height={40} className="object-contain shrink-0" />
                    <span className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin shrink-0" />
                      {detectingLocation ? 'Finding nearest outlet...' : 'Loading outlets...'}
                    </span>
                  </div>
                )}

                {pickupCoords && !detectingLocation && (
                  <div className="flex items-center justify-between gap-2 text-xs text-muted">
                    <span className="flex items-center gap-1.5">
                      <Navigation size={12} className="text-brand" />
                      {nearestWithinRange
                        ? `Nearest: ${nearestWithinRange.name.replace('Bing Chun - ', '')} (${nearestWithinRange.distanceKm!.toFixed(1)} km)`
                        : `No outlet within ${TAKEAWAY_MAX_KM} km — pick a district`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        nearestAutoApplied.current = false;
                        userPickedStore.current = false;
                        setPickupCoords(null);
                        void detectPickupLocation(true);
                      }}
                      className="text-brand hover:text-brand-light shrink-0"
                    >
                      Refresh location
                    </button>
                  </div>
                )}

                <div>
                  <p className="text-xs text-muted font-medium mb-2">District</p>
                  <div className="flex gap-2 flex-wrap max-h-36 overflow-y-auto pr-1">
                    {districts.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => selectDistrict(d)}
                        className={`chip ${districtFilter === d ? 'chip-active' : ''}`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {districtFilter ? (
                  <div>
                    <p className="text-xs text-muted font-medium mb-2">Outlets in {districtFilter}</p>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {stores.length === 0 && !storesLoading && (
                        <p className="text-sm text-muted text-center py-4">No outlets in this district.</p>
                      )}
                      {stores.map((store, index) => (
                        <button
                          key={store.id}
                          type="button"
                          onClick={() => selectTakeawayStore(store)}
                          className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${
                            selectedStore?.id === store.id
                              ? 'border-brand bg-brand-subtle'
                              : 'border-navy-border hover:border-brand'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Store size={15} className="text-brand shrink-0" />
                                <p className="font-medium text-fg truncate">{store.name}</p>
                                {index === 0 &&
                                  store.distanceKm != null &&
                                  store.distanceKm <= TAKEAWAY_MAX_KM && (
                                    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-brand/15 text-brand-dark">
                                      Nearest
                                    </span>
                                  )}
                                {store.distanceKm != null && (
                                  <span className="text-[10px] font-medium text-muted">
                                    {store.distanceKm.toFixed(1)} km
                                  </span>
                                )}
                              </div>
                              <p className="text-muted text-xs mt-0.5 pl-[23px]">
                                {store.addressLine}, {store.city}
                              </p>
                              <p className="text-xs mt-1 flex items-center gap-1 pl-[23px]">
                                <Clock size={10} />
                                <span className="text-muted">
                                  {store.openTime} – {store.closeTime}
                                </span>
                                <span className={`ml-1 ${store.isBusy ? 'text-yellow-400' : 'text-green-400'}`}>
                                  {store.isBusy ? '· Busy' : '· Open'}
                                </span>
                              </p>
                            </div>
                            {selectedStore?.id === store.id && (
                              <CheckCircle size={18} className="text-brand shrink-0" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  !storesLoading &&
                  districts.length > 0 && (
                    <p className="text-sm text-muted text-center py-4 rounded-xl border border-dashed border-navy-border">
                      Pick a district above to see outlets
                    </p>
                  )
                )}

                {selectedStore && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted font-medium">Pickup Time</p>
                    <div className="flex gap-2 flex-wrap">
                      {PICKUP_TIMES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setPickupTime(t)}
                          className={`chip ${pickupTime === t ? 'chip-active' : ''}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {showContinueButton && (
                  <button
                    type="button"
                    onClick={confirmTakeaway}
                    disabled={!selectedStore}
                    className="btn-primary w-full py-3.5"
                  >
                    Continue to Menu
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
