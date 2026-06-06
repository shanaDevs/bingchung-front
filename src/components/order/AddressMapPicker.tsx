'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { getCurrentPosition, DEFAULT_LOCATION } from '@/lib/geolocation';
import type { AddressAutocomplete } from '@/types';
import toast from 'react-hot-toast';

const DeliveryMap = dynamic(() => import('./DeliveryMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[220px] rounded-xl border border-navy-border bg-navy-light flex items-center justify-center text-muted text-sm">
      Loading map...
    </div>
  ),
});

export interface AddressSelection {
  address: string;
  lat: number;
  lng: number;
}

interface AddressMapPickerProps {
  value: AddressSelection | null;
  onChange: (selection: AddressSelection) => void;
  /** Detect GPS location when the picker first mounts (if no value yet) */
  autoDetectOnMount?: boolean;
  /** Pizza Hut style — map first, taller map */
  variant?: 'default' | 'prominent';
  /** Fired after coordinates resolve to an address (marker drag, GPS, suggestion) */
  onLocationResolved?: () => void;
}

export function AddressMapPicker({
  value,
  onChange,
  autoDetectOnMount = false,
  variant = 'default',
  onLocationResolved,
}: AddressMapPickerProps) {
  const [addressInput, setAddressInput] = useState(value?.address ?? '');
  const [lat, setLat] = useState(value?.lat ?? DEFAULT_LOCATION.lat);
  const [lng, setLng] = useState(value?.lng ?? DEFAULT_LOCATION.lng);
  const [suggestions, setSuggestions] = useState<AddressAutocomplete[]>([]);
  const [locating, setLocating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const autoDetectStarted = useRef(false);

  useEffect(() => {
    if (!value) return;
    setAddressInput(value.address);
    setLat(value.lat);
    setLng(value.lng);
  }, [value?.address, value?.lat, value?.lng]);

  useEffect(() => {
    if (addressInput.length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await api.get<AddressAutocomplete[]>(
          `/stores/address/autocomplete?q=${encodeURIComponent(addressInput)}`
        );
        setSuggestions(res);
      } catch {
        setSuggestions([]);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [addressInput]);

  async function resolveCoords(newLat: number, newLng: number, fallbackAddress?: string) {
    setLat(newLat);
    setLng(newLng);
    setResolving(true);
    try {
      const res = await api.get<{ address: string; lat: number; lng: number }>(
        `/stores/address/reverse?lat=${newLat}&lng=${newLng}`
      );
      const nextAddress = fallbackAddress || res.address;
      setAddressInput(nextAddress);
      onChange({ address: nextAddress, lat: newLat, lng: newLng });
      onLocationResolved?.();
    } catch {
      const nextAddress = fallbackAddress || addressInput || `${newLat.toFixed(4)}, ${newLng.toFixed(4)}`;
      setAddressInput(nextAddress);
      onChange({ address: nextAddress, lat: newLat, lng: newLng });
      onLocationResolved?.();
    } finally {
      setResolving(false);
    }
  }

  async function detectCurrentLocation(showErrors = true) {
    setLocating(true);
    try {
      const coords = await getCurrentPosition();
      await resolveCoords(coords.lat, coords.lng);
    } catch {
      if (showErrors) {
        toast.error('Could not get your location. Allow location access or pick on the map.');
      }
    } finally {
      setLocating(false);
    }
  }

  useEffect(() => {
    if (!autoDetectOnMount || autoDetectStarted.current || value?.address) return;
    autoDetectStarted.current = true;
    void detectCurrentLocation(false);
  }, [autoDetectOnMount, value?.address]);

  function selectSuggestion(s: AddressAutocomplete) {
    setAddressInput(s.description);
    setSuggestions([]);
    setLat(s.lat);
    setLng(s.lng);
    onChange({ address: s.description, lat: s.lat, lng: s.lng });
    void resolveCoords(s.lat, s.lng, s.description);
  }

  function handleMapMove(newLat: number, newLng: number) {
    void resolveCoords(newLat, newLng);
  }

  const busy = locating || resolving;
  const prominent = variant === 'prominent';
  const mapHeight = prominent ? 'h-[min(52vw,280px)] sm:h-[300px]' : 'h-[220px]';

  const mapBlock = (
    <>
      <DeliveryMap lat={lat} lng={lng} onLocationChange={handleMapMove} className={mapHeight} />
      <p className="text-xs text-muted text-center">
        Drag the pin or tap the map to set your delivery location
      </p>
    </>
  );

  const addressBlock = (
    <>
      <div className="input-icon-wrap input-icon-wrap--both">
        <MapPin size={15} className="input-icon input-icon--brand" aria-hidden />
        <input
          className="input-field"
          placeholder="Enter your street or area..."
          value={addressInput}
          onChange={(e) => setAddressInput(e.target.value)}
          onBlur={() => {
            if (addressInput.trim()) onChange({ address: addressInput.trim(), lat, lng });
          }}
          disabled={busy}
        />
        {resolving && (
          <Loader2 size={15} className="input-action text-brand animate-spin" aria-hidden />
        )}
        {suggestions.length > 0 && (
          <div className="address-suggestions absolute top-full left-0 right-0 mt-1 card z-30 overflow-hidden max-h-48 overflow-y-auto shadow-lg">
            <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted border-b border-navy-border">
              Address suggestions
            </p>
            {suggestions.map((s) => (
              <button
                key={s.placeId}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectSuggestion(s)}
                className="w-full text-left px-4 py-3 text-sm hover:bg-brand-subtle transition-colors flex items-center gap-2 border-b border-navy-border last:border-0"
              >
                <MapPin size={13} className="text-brand shrink-0" />
                <span className="text-fg">{s.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => void detectCurrentLocation(true)}
        disabled={busy}
        className="flex items-center gap-2 text-sm text-brand hover:text-brand-light transition-colors disabled:opacity-50"
      >
        {locating ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
        {locating ? 'Finding location...' : 'Use my current location'}
      </button>
    </>
  );

  return (
    <div className="space-y-3">
      {prominent && (
        <p className="text-sm text-muted">
          We&apos;ll deliver from your nearest Bing Chun branch. Move the pin to update your address.
        </p>
      )}

      {!prominent && (
        <p className="text-sm text-muted">
          {autoDetectOnMount
            ? 'We use your current location for delivery. Adjust the pin or address if needed.'
            : 'Enter your address or tap the map to pin your delivery location.'}
        </p>
      )}

      {busy && (
        <div className="flex items-center gap-2 text-sm text-brand p-3 rounded-xl bg-brand-subtle border border-brand/30">
          <Loader2 size={16} className="animate-spin shrink-0" />
          {locating ? 'Detecting your location...' : 'Updating address...'}
        </div>
      )}

      {prominent ? (
        <>
          {mapBlock}
          {addressBlock}
        </>
      ) : (
        <>
          {addressBlock}
          {mapBlock}
        </>
      )}
    </div>
  );
}
