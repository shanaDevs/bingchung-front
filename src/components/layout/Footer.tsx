'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import BrandLogo from '@/components/ui/BrandLogo';

export default function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;

  return (
    <footer className="bg-navy-light border-t border-navy-border mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <BrandLogo size={48} className="mb-4" />
            <p className="text-muted text-sm leading-relaxed">
              Premium Bubble Tea & Ice Cream. Fresh ingredients, crafted with love at 32+ locations island-wide.
            </p>
            <div className="flex gap-3 mt-5">
              <a
                href="https://www.instagram.com/bingchunsrilanka"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full flex items-center justify-center bg-navy-card border border-navy-border hover:border-brand hover:text-brand transition-all"
              >
                <span className="text-xs font-bold">IG</span>
              </a>
              <a
                href="https://www.facebook.com/bingchunsrilanka"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full flex items-center justify-center bg-navy-card border border-navy-border hover:border-brand hover:text-brand transition-all"
              >
                <span className="text-xs font-bold">FB</span>
              </a>
              <a
                href="https://www.tiktok.com/@bingchunsrilanka"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full flex items-center justify-center bg-navy-card border border-navy-border hover:border-brand hover:text-brand transition-all text-xs font-bold"
              >
                TT
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-fg mb-4">Quick Links</h3>
            <ul className="space-y-2.5">
              {[
                { href: '/menu', label: 'Menu' },
                { href: '/stores', label: 'Store Locator' },
                { href: '/promotions', label: 'Promotions' },
                { href: '/account/orders', label: 'Track Order' },
                { href: '/account', label: 'My Account' },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-muted text-sm hover:text-brand transition-colors flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-brand" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="font-semibold text-fg mb-4">Information</h3>
            <ul className="space-y-2.5">
              {[
                { href: '/about', label: 'About Us' },
                { href: '/contact', label: 'Contact' },
                { href: '/privacy', label: 'Privacy Policy' },
                { href: '/terms', label: 'Terms of Service' },
                { href: '/refunds', label: 'Refund Policy' },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-muted text-sm hover:text-brand transition-colors flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-brand" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-fg mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-sm text-muted">
                <MapPin size={15} className="text-brand mt-0.5 shrink-0" />
                <span>32+ Branches island-wide across Sri Lanka</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-muted">
                <Phone size={15} className="text-brand shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <a href="tel:+94765466686" className="hover:text-brand transition-colors block">076 546 6686 (Inquiries)</a>
                  <a href="tel:+94715118888" className="hover:text-brand transition-colors block">071 511 8888 (Franchise)</a>
                </div>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-muted">
                <Mail size={15} className="text-brand shrink-0" />
                <a href="mailto:info@bingchunsrilanka.lk" className="hover:text-brand transition-colors">info@bingchunsrilanka.lk</a>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-muted">
                <Clock size={15} className="text-brand mt-0.5 shrink-0" />
                <span>Daily: 9:00 AM – 11:00 PM</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-navy-border flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted">
          <p>© {new Date().getFullYear()} Bing Chun Sri Lanka (Pvt) Ltd. All rights reserved.</p>
          <p>Powered with 🧋 in Sri Lanka</p>
        </div>
      </div>
    </footer>
  );
}
