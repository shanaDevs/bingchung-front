'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, Clock, Navigation, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Store } from '@/types';

export default function StoresPage() {
  const [districtFilter, setDistrictFilter] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Store | null>(null);

  const { data: stores = [], isLoading } = useQuery<Store[]>({
    queryKey: ['stores', districtFilter, userLocation],
    queryFn: () => {
      const params = new URLSearchParams();
      if (districtFilter) params.append('district', districtFilter);
      if (userLocation) { params.append('lat', String(userLocation.lat)); params.append('lng', String(userLocation.lng)); }
      return api.get(`/stores?${params}`);
    },
  });

  function getLocation() {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }

  const districts = [...new Set(stores.map((s) => s.district))].sort();
  const filtered = stores.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-navy-light border-b border-navy-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Store Locator 📍</h1>
              <p className="text-muted mt-1">32+ locations island-wide across Sri Lanka</p>
            </div>
            <div className="flex gap-2">
              <div className="input-icon-wrap sm:w-60">
                <Search size={15} className="input-icon" aria-hidden />
                <input className="input-field text-sm" placeholder="Search stores..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <button onClick={getLocation} className="btn-outline px-3 py-2.5 text-sm flex items-center gap-1.5 whitespace-nowrap">
                <Navigation size={14} /> Near Me
              </button>
            </div>
          </div>

          {/* District filters */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
            <button onClick={() => setDistrictFilter('')}
              className={`px-4 py-1.5 rounded-xl border text-sm font-medium whitespace-nowrap transition-all shrink-0 ${!districtFilter ? 'bg-brand text-white border-brand' : 'border-navy-border text-muted hover:border-brand hover:text-white'}`}>
              All Districts
            </button>
            {districts.map((d) => (
              <button key={d} onClick={() => setDistrictFilter(d)}
                className={`px-4 py-1.5 rounded-xl border text-sm font-medium whitespace-nowrap transition-all shrink-0 ${districtFilter === d ? 'bg-brand text-white border-brand' : 'border-navy-border text-muted hover:border-brand hover:text-white'}`}>
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Store list */}
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="card p-5 animate-pulse">
                  <div className="h-4 rounded mb-2" style={{ background: '#12162a', width: '50%' }} />
                  <div className="h-3 rounded" style={{ background: '#12162a', width: '70%' }} />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">🏪</p>
                <p className="text-muted">No stores found</p>
              </div>
            ) : (
              filtered.map((store, i) => (
                <motion.div key={store.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  onClick={() => setSelected(store)}
                  className={`card p-4 cursor-pointer transition-all hover:border-brand ${
                    selected?.id === store.id ? 'border-brand bg-brand-subtle' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-white text-sm">{store.name}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${store.isBusy ? 'text-yellow-400 bg-yellow-400/10' : store.isActive ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                          {store.isBusy ? 'Busy' : store.isActive ? 'Open' : 'Closed'}
                        </span>
                      </div>
                      <p className="text-muted text-xs flex items-center gap-1">
                        <MapPin size={11} className="text-brand" />
                        {store.addressLine}, {store.city}
                      </p>
                      <p className="text-muted text-xs flex items-center gap-1 mt-1">
                        <Clock size={11} className="text-brand" />
                        {store.openTime} – {store.closeTime}
                      </p>
                      {store.distanceKm !== undefined && (
                        <p className="text-brand text-xs font-medium mt-1">📍 {store.distanceKm.toFixed(1)} km away</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 items-end shrink-0">
                      {store.phone && (
                        <a href={`tel:${store.phone}`} onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-xs text-muted hover:text-brand transition-colors">
                          <Phone size={11} /> Call
                        </a>
                      )}
                      <a href={`https://maps.google.com?q=${store.lat},${store.lng}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-xs text-brand hover:text-brand-light transition-colors">
                        <Navigation size={11} /> Directions
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Map placeholder / selected store info */}
          <div className="lg:sticky lg:top-20 h-fit">
            {selected ? (
              <motion.div key={selected.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
                <h3 className="font-bold text-white text-lg mb-1">{selected.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${selected.isBusy ? 'text-yellow-400 bg-yellow-400/10' : selected.isActive ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                  {selected.isBusy ? '● Busy' : selected.isActive ? '● Open' : '● Closed'}
                </span>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-start gap-2.5">
                    <MapPin size={16} className="text-brand mt-0.5 shrink-0" />
                    <span className="text-muted">{selected.addressLine}, {selected.city}, {selected.district}</span>
                  </div>
                  {selected.phone && (
                    <div className="flex items-center gap-2.5">
                      <Phone size={16} className="text-brand shrink-0" />
                      <a href={`tel:${selected.phone}`} className="text-muted hover:text-brand">{selected.phone}</a>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5">
                    <Clock size={16} className="text-brand shrink-0" />
                    <span className="text-muted">{selected.openTime} – {selected.closeTime} daily</span>
                  </div>
                </div>

                {/* Map embed */}
                <div className="mt-4 rounded-xl overflow-hidden" style={{ height: 220, background: '#12162a' }}>
                  <iframe
                    title={selected.name}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    src={`https://maps.google.com/maps?q=${selected.lat},${selected.lng}&z=15&output=embed`}
                    allowFullScreen
                  />
                </div>

                <a href={`https://maps.google.com?q=${selected.lat},${selected.lng}`} target="_blank" rel="noopener noreferrer"
                  className="btn-primary w-full py-3 mt-4 text-sm">
                  <Navigation size={15} /> Get Directions
                </a>
              </motion.div>
            ) : (
              <div className="card flex items-center justify-center text-center p-12" style={{ height: 300 }}>
                <div>
                  <MapPin size={40} className="mx-auto text-muted mb-3" />
                  <p className="text-muted">Select a store to see details and location</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
