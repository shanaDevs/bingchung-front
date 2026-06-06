'use client';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, RefreshCw, AlertCircle, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api';
import type { Product, Category } from '@/types';
import ProductDrawer from '@/components/menu/ProductDrawer';
import ProductCard from '@/components/menu/ProductCard';
import CategoryChip from '@/components/menu/CategoryChip';
import FloatingCart from '@/components/cart/FloatingCart';
import { openOrderModal } from '@/components/order/SiteOrderPrompt';
import { useCartStore } from '@/store/cartStore';
import { confirmDialog } from '@/store/confirmStore';
import { switchOrderToBranch } from '@/lib/switchBranch';
import type { FulfillmentStore } from '@/lib/switchBranch';

const CATEGORY_EMOJI: Record<string, string> = {
  all: '✨',
  'bubble-tea': '🧋',
  'milk-tea': '🍵',
  'fruit-tea': '🍋',
  milkshake: '🥤',
  sundae: '🍨',
  'ice-cream': '🍦',
};

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function MenuPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [fulfillmentForProduct, setFulfillmentForProduct] = useState<FulfillmentStore | null>(null);
  const categoryBarRef = useRef<HTMLDivElement>(null);
  const orderMode = useCartStore((s) => s.orderMode);
  const activeStoreId = useCartStore((s) => s.getActiveStoreId());
  const activeStoreName = useCartStore((s) => s.getActiveStoreName());
  const deliveryInfo = useCartStore((s) => s.deliveryInfo);

  const hasSearch = debouncedSearch.length > 0;

  const {
    data: categories = [],
    isError: categoriesError,
    refetch: refetchCategories,
  } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/menu/categories'),
  });

  const {
    data: products = [],
    isLoading,
    isFetching,
    isError: productsError,
    error: productsQueryError,
    refetch: refetchProducts,
  } = useQuery<Product[]>({
    queryKey: ['products', selectedCategory, debouncedSearch, activeStoreId, hasSearch],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (activeStoreId) {
        params.append('storeId', activeStoreId);
      }
      const qs = params.toString();
      return api.get(`/menu/products${qs ? `?${qs}` : ''}`);
    },
  });

  const nearbyCount = useMemo(
    () =>
      products.filter(
        (p) => p.storeAvailability && !p.storeAvailability.atSelectedStore && p.storeAvailability.fulfillmentStore,
      ).length,
    [products],
  );

  const closeDrawer = useCallback(() => {
    setSelectedProduct(null);
    setFulfillmentForProduct(null);
  }, []);

  const handleProductSelect = useCallback(
    async (product: Product) => {
      if (!orderMode) {
        openOrderModal();
        return;
      }

      const availability = product.storeAvailability;
      const fulfillment = availability?.fulfillmentStore;

      if (availability && !availability.atSelectedStore && fulfillment) {
        const branchLabel = fulfillment.name.replace('Bing Chun - ', '');
        const primaryBranch = activeStoreName?.replace('Bing Chun - ', '') ?? 'your branch';

        const ok = await confirmDialog({
          title: 'Out of stock at your branch',
          message: `"${product.name}" is not available at ${primaryBranch}. It is available at ${branchLabel} (${fulfillment.distanceKm} km away). Add this item from ${branchLabel}? Your other items stay at ${primaryBranch}.`,
          confirmLabel: `Add from ${branchLabel}`,
          cancelLabel: 'Cancel',
        });

        if (!ok) return;

        if (orderMode === 'DELIVERY') {
          const result = await switchOrderToBranch({
            orderMode,
            fulfillmentStore: fulfillment,
            deliveryInfo: deliveryInfo
              ? {
                  address: deliveryInfo.address,
                  lat: deliveryInfo.lat,
                  lng: deliveryInfo.lng,
                  estimatedMinutes: deliveryInfo.estimatedMinutes,
                }
              : null,
          });

          if (!result.ok) {
            toast.error(result.error ?? 'This branch cannot deliver to your address.');
            return;
          }
        }

        setFulfillmentForProduct(fulfillment);
        setSelectedProduct(product);
        return;
      }

      if (!product.isAvailable) return;

      setFulfillmentForProduct(null);
      setSelectedProduct(product);
    },
    [orderMode, activeStoreName, deliveryInfo],
  );

  const allCategories = useMemo(
    () => [{ id: 'all', name: 'All', slug: 'all', icon: '✨', sortOrder: -1 }, ...categories],
    [categories],
  );

  const apiDown = productsError || categoriesError;
  const errorMessage =
    productsQueryError instanceof ApiError
      ? productsQueryError.message
      : 'Could not load menu. Please check your connection and try again.';

  return (
    <div className="min-h-screen bg-navy">

      {/* Hero */}
      <div className="gradient-hero border-b border-navy-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 text-center">
          <p className="section-label">Bing Chun Menu</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mt-2">Explore Our Products</h1>
          <div className="section-underline" />
          <p className="text-muted mt-4 max-w-xl mx-auto text-sm sm:text-base">
            Signature bubble teas, fruit teas, milkshakes, sundaes &amp; ice cream — order for delivery or takeaway.
          </p>
          {orderMode && activeStoreName && (
            <p className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="menu-hero-chip menu-hero-chip--mode px-3 py-1 rounded-full text-xs font-semibold bg-brand/25 border border-brand/40">
                {orderMode === 'DELIVERY' ? '🛵 Delivery' : '🛍 Takeaway'}
              </span>
              <span className="menu-hero-chip menu-hero-chip--store px-3 py-1 rounded-full text-xs font-medium bg-navy-card border border-navy-border flex items-center gap-1">
                <MapPin size={12} className="text-brand shrink-0" aria-hidden />
                {activeStoreName.replace('Bing Chun - ', '')}
              </span>
              <button
                type="button"
                onClick={openOrderModal}
                className="menu-hero-link text-xs underline underline-offset-2 transition-colors"
              >
                Change order mode
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Sticky filters */}
      <div className="sticky top-16 z-30 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
          {/* Search */}
          <div className="max-w-xl mx-auto w-full">
            <label htmlFor="menu-search" className="sr-only">
              Search menu
            </label>
            <div className={`input-icon-wrap${search.length > 0 ? ' input-icon-wrap--end' : ''}`}>
              <Search size={18} className="input-icon" aria-hidden />
              <input
                id="menu-search"
                type="search"
                placeholder="Search drinks, desserts, tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-bar"
                autoComplete="off"
              />
              {search.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="input-action h-8 w-8 rounded-full text-muted hover:bg-navy-card hover:text-white transition-colors"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Categories */}
          <div
            ref={categoryBarRef}
            className="category-bar flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1"
            role="tablist"
            aria-label="Menu categories"
          >
            {allCategories.map((cat, i) => {
              const active = selectedCategory === cat.slug;
              const emoji = cat.icon || CATEGORY_EMOJI[cat.slug] || '🧋';
              return (
                <CategoryChip
                  key={cat.slug}
                  name={cat.name}
                  emoji={emoji}
                  active={active}
                  index={i}
                  onSelect={() => setSelectedCategory(cat.slug)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {apiDown && (
          <div
            className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 sm:p-5"
            role="alert"
          >
            <AlertCircle className="text-red-400 shrink-0" size={24} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white">Menu unavailable</p>
              <p className="text-sm text-muted mt-1">{errorMessage}</p>
              <p className="text-xs text-muted mt-2">
                Start the API: <code className="text-brand-light">npm run dev:backend</code> (port 4000)
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                refetchProducts();
                refetchCategories();
              }}
              className="btn-outline px-4 py-2 text-sm shrink-0"
            >
              <RefreshCw size={16} />
              Retry
            </button>
          </div>
        )}

        {!apiDown && !isLoading && nearbyCount > 0 && (
          <p className="text-sm text-amber-400/90 mb-4 text-center px-2">
            {nearbyCount} item{nearbyCount !== 1 ? 's' : ''} out at your branch but available nearby within 7 km
            {activeStoreName ? ` of ${activeStoreName.replace('Bing Chun - ', '')}` : ''}
          </p>
        )}

        {!apiDown && !isLoading && orderMode && !activeStoreId && (
          <p className="text-sm text-amber-400/90 mb-4 text-center">
            Select your branch in order settings to see branch stock.
            <button type="button" onClick={openOrderModal} className="text-brand ml-1 underline">
              Set up order
            </button>
          </p>
        )}

        {!apiDown && !isLoading && (
          <p className="text-sm text-muted mb-6 text-center">
            {isFetching && debouncedSearch ? 'Searching…' : (
              <>
                Showing <span className="text-fg font-medium">{products.length}</span>
                {products.length === 1 ? ' item' : ' items'}
                {selectedCategory !== 'all' && (
                  <> in <span className="text-brand">{allCategories.find((c) => c.slug === selectedCategory)?.name}</span></>
                )}
                {debouncedSearch && (
                  <> for &ldquo;<span className="text-fg">{debouncedSearch}</span>&rdquo;</>
                )}
              </>
            )}
          </p>
        )}

        {isLoading ? (
          <div className="product-card-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="h-36 rounded-xl mb-4 bg-navy-light" />
                <div className="h-4 rounded mb-2 bg-navy-light w-3/5" />
                <div className="h-3 rounded bg-navy-light w-4/5" />
              </div>
            ))}
          </div>
        ) : !apiDown && products.length === 0 ? (
          <div className="text-center py-16 sm:py-20">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-xl font-semibold text-fg mb-2">No items found</p>
            <p className="text-muted text-sm">Try another category or search term</p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedCategory('all');
              }}
              className="btn-primary px-6 py-2.5 mt-6 text-sm"
            >
              Clear filters
            </button>
          </div>
        ) : !apiDown ? (
          <div className="product-card-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            <AnimatePresence mode="popLayout">
              {products.map((product, i) => {
                const fulfillment = product.storeAvailability?.fulfillmentStore;
                const isNearbyOnly =
                  product.storeAvailability &&
                  !product.storeAvailability.atSelectedStore &&
                  Boolean(fulfillment);
                const atSelectedBranch = product.storeAvailability?.atSelectedStore ?? true;
                const inStock = atSelectedBranch && product.isAvailable;

                return (
                  <ProductCard
                    key={isNearbyOnly && fulfillment ? `${product.id}-${fulfillment.id}` : product.id}
                    index={i}
                    name={product.name}
                    basePrice={product.basePrice}
                    description={product.description}
                    imageUrl={product.imageUrl}
                    tag={isNearbyOnly ? undefined : product.tag}
                    categoryName={product.category?.name}
                    emoji={CATEGORY_EMOJI[product.category?.slug ?? ''] ?? '🧋'}
                    isAvailable={inStock}
                    nearbyBranch={
                      isNearbyOnly && fulfillment
                        ? { name: fulfillment.name, distanceKm: fulfillment.distanceKm }
                        : undefined
                    }
                    onSelect={() => handleProductSelect(product)}
                    onAdd={() => handleProductSelect(product)}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        ) : null}
      </div>

      <AnimatePresence>
        {selectedProduct && (
          <ProductDrawer
            product={selectedProduct}
            fulfillmentStore={fulfillmentForProduct}
            onClose={closeDrawer}
          />
        )}
      </AnimatePresence>

      <FloatingCart />
    </div>
  );
}

