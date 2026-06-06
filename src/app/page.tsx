'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Zap, Gift } from 'lucide-react';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { OrderModeSelector } from '@/components/order/OrderModeSelector';
import ProductCard from '@/components/menu/ProductCard';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Product, PromoCode } from '@/types';

const STATS = [
  { icon: '⭐', value: '4.9', label: 'Rating' },
  { icon: '🕐', value: '25 min', label: 'Avg Delivery' },
  { icon: '🧋', value: '30+', label: 'Menu Items' },
  { icon: '📍', value: '32+', label: 'Locations' },
];

const FEATURED = [
  { name: 'Brown Sugar Boba Milk Tea', price: 480, tag: 'Popular', desc: 'Our best-seller with rich caramel boba', emoji: '🧋' },
  { name: 'Mango Pomelo Sago', price: 580, tag: 'Signature', desc: 'Hong Kong-style premium dessert', emoji: '🍨' },
  { name: 'Strawberry Milkshake', price: 550, tag: 'Popular', desc: 'Thick creamy milkshake with real fruit', emoji: '🥤' },
];

const PRODUCT_EMOJIS = ['🧋', '🍨', '🥤', '🍵', '🍋', '🍦', '🧁', '🍓'];

function scrollToOrderSetup() {
  document.getElementById('order-setup')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orderStep, setOrderStep] = useState<'choose' | 'setup'>('choose');

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  const { data: popularProducts } = useQuery<Product[]>({
    queryKey: ['products', 'popular'],
    queryFn: () => api.get('/menu/products?tag=Popular'),
    enabled: !loading,
  });

  const { data: promos } = useQuery<PromoCode[]>({
    queryKey: ['promos'],
    queryFn: () => api.get('/promos'),
    enabled: !loading,
  });

  return (
    <>
      <LoadingScreen isVisible={loading} />

      <AnimatePresence>
        {!loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>

            {/* ── Hero Section ── */}
            <section className="relative overflow-hidden min-h-[calc(100vh-64px)] flex items-center gradient-hero">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full opacity-40"
                  style={{ background: 'radial-gradient(circle, #5c9af5 0%, transparent 70%)', filter: 'blur(60px)' }} />
              </div>

              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
                {/* Order type first — Delivery / Takeaway at the top */}
                <motion.div
                  id="order-setup"
                  className="home-order-setup scroll-mt-24 mb-10 sm:mb-12"
                  initial={{ y: -12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.05, duration: 0.45 }}
                >
                  <div
                    className={`home-order-setup__card rounded-2xl p-4 sm:p-5 transition-all duration-300 ${
                      orderStep === 'setup' ? 'home-order-setup__card--expanded' : ''
                    }`}
                  >
                    <OrderModeSelector
                      onComplete={() => router.push('/menu')}
                      onStepChange={setOrderStep}
                    />
                  </div>
                </motion.div>

                <div className="grid lg:grid-cols-2 gap-12 items-center">

                  {/* Left: Text */}
                  <motion.div
                    initial={{ x: -40, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.6 }}
                  >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-6 text-white/90"
                      style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      Since 2012 — Now in Sri Lanka
                    </div>

                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-white mb-2">
                      Freshly Brewed
                    </h1>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                      Bubble Tea &amp; Ice Cream
                    </h2>
                    <p className="text-xl font-bold text-accent mb-6">
                      Starting from Rs. 200
                    </p>

                    <p className="text-base text-white/75 leading-relaxed mb-8 max-w-lg">
                      Experience the authentic taste of Bing Chun — premium bubble tea, creamy soft-serve, and refreshing fruit teas crafted with love.
                    </p>

                    <div className="flex flex-wrap gap-3">
                      <Link href="/menu" className="btn-white px-8 py-3.5 text-sm">
                        Explore Menu <ChevronRight size={16} />
                      </Link>
                      <motion.a
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        href="#order-setup"
                        className="hero-btn-outline btn-outline px-8 py-3.5 text-sm border-white/40 hover:border-white inline-flex items-center"
                      >
                        Order Now
                      </motion.a>
                    </div>

                    {/* Stats strip */}
                    <div className="grid grid-cols-4 gap-4 mt-12 pt-8 border-t border-white/15">
                      {STATS.map((s) => (
                        <div key={s.label} className="text-center">
                          <p className="text-xl font-bold text-white">{s.value}</p>
                          <p className="text-xs text-white/80 mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Right: Mascot */}
                  <motion.div
                    initial={{ x: 40, opacity: 0 }}
                    animate={{ x: 0, opacity: 1, y: [0, -16, 0] }}
                    transition={{
                      x: { delay: 0.2, duration: 0.6 },
                      opacity: { delay: 0.2, duration: 0.6 },
                      y: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.8 },
                    }}
                    className="relative flex justify-center lg:justify-end"
                  >
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-72 h-72 sm:w-96 sm:h-96 rounded-full opacity-50"
                        style={{ background: 'radial-gradient(circle, rgba(92,154,245,0.45) 0%, transparent 70%)' }} />
                    </div>
                    <Image
                      src="/brand/mascot-hero.avif"
                      alt="Bing Chun Mascot"
                      width={480}
                      height={480}
                      className="relative z-10 object-contain drop-shadow-2xl max-w-[300px] sm:max-w-[400px] lg:max-w-[480px] w-full h-auto"
                      priority
                    />
                  </motion.div>
                </div>
              </div>
            </section>

            {/* ── Promotions Banner ── */}
            {promos && promos.length > 0 && (
              <section className="section-band py-4 overflow-hidden">
                <div className="flex gap-8 animate-marquee items-center">
                  {[...promos, ...promos].map((p, i) => (
                    <div key={i} className="flex items-center gap-3 shrink-0 px-4">
                      <Gift size={16} className="text-brand" />
                      <span className="text-sm font-medium text-fg">{p.code}</span>
                      <span className="text-xs text-muted">— {p.description}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Popular Dishes ── */}
            <section className="home-section max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
              <div className="relative text-center mb-10">
                <p className="section-label">Trending Now</p>
                <h2 className="text-3xl font-bold text-fg mt-2">Most Popular</h2>
                <div className="section-underline" />
                <p className="text-muted mt-4">Our customers&apos; favourites, loved for their incredible taste</p>
                <Link href="/menu" className="btn-primary px-4 py-2 text-sm hidden sm:inline-flex items-center gap-1 absolute right-0 top-1/2 -translate-y-1/2">
                  View All <ChevronRight size={15} />
                </Link>
              </div>

              <div className="product-card-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                {(popularProducts || FEATURED.map((f, i) => ({
                  id: String(i), name: f.name, basePrice: f.price, tag: f.tag,
                  description: f.desc, isAvailable: true, category: { id: '', name: '', slug: '' }, toppings: [],
                  categoryId: '', slug: '', imageUrl: undefined,
                }))).slice(0, 8).map((p, i) => {
                  const fallback = FEATURED[i % FEATURED.length];
                  return (
                    <ProductCard
                      key={p.id}
                      index={i}
                      name={p.name}
                      basePrice={p.basePrice}
                      description={p.description ?? fallback?.desc}
                      imageUrl={p.imageUrl}
                      tag={p.tag}
                      emoji={fallback?.emoji ?? PRODUCT_EMOJIS[i % 8]}
                      onSelect={scrollToOrderSetup}
                    />
                  );
                })}
              </div>

              <div className="text-center mt-8 sm:hidden">
                <Link href="/menu" className="btn-outline px-6 py-3 inline-flex items-center gap-2">
                  View Full Menu <ChevronRight size={15} />
                </Link>
              </div>
            </section>

            {/* ── Why Choose Us ── */}
            <section className="section-surface py-16 sm:py-20">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-fg">Why Bing Chun?</h2>
                  <p className="text-muted mt-2">The experience that keeps you coming back</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {[
                    { icon: '🌿', title: 'Fresh Ingredients', desc: 'Only the finest, freshest ingredients in every cup' },
                    { icon: '⚡', title: 'Fast Delivery', desc: 'Hot & fresh in 25–35 minutes to your doorstep' },
                    { icon: '🎨', title: 'Customisable', desc: 'Choose your size, sugar, ice level & toppings' },
                    { icon: '🏆', title: 'Loyalty Rewards', desc: 'Earn points on every order, redeem for discounts' },
                  ].map((f, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -6, transition: { type: 'spring', stiffness: 400, damping: 22 } }}
                      viewport={{ once: true, margin: '-40px' }}
                      transition={{ delay: i * 0.08, duration: 0.45 }}
                      className="feature-card card p-5 sm:p-6 text-center"
                    >
                      <div className="feature-card__icon text-4xl mb-4">{f.icon}</div>
                      <h3 className="font-semibold text-fg mb-2">{f.title}</h3>
                      <p className="text-muted text-sm leading-relaxed">{f.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Download / CTA banner ── */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
              <div className="cta-card card p-8 sm:p-10 text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-20 pointer-events-none animate-pulse"
                  style={{ background: 'radial-gradient(circle at 50% 50%, #307ef2 0%, transparent 70%)' }} />
                <h2 className="text-2xl sm:text-3xl font-bold text-fg mb-3 relative z-10">
                  Ready to Order? 🧋
                </h2>
                <p className="text-muted mb-8 relative z-10 max-w-md mx-auto">
                  Choose delivery to your door or pick up from your nearest Bing Chun store. Order in seconds!
                </p>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={scrollToOrderSetup}
                  className="btn-primary px-10 py-4 text-lg relative z-10"
                >
                  Start Your Order <Zap size={18} />
                </motion.button>
              </div>
            </section>

          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
          width: max-content;
        }
      `}</style>
    </>
  );
}
