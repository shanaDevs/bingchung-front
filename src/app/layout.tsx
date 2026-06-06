import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import Providers from '@/components/ui/Providers';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: { default: 'Bing Chun Sri Lanka | Premium Bubble Tea & Ice Cream', template: '%s | Bing Chun Sri Lanka' },
  description: 'Order premium bubble tea, milkshakes, and ice cream online. Delivery and takeaway from 32+ locations across Sri Lanka.',
  keywords: ['bubble tea', 'milk tea', 'ice cream', 'Sri Lanka', 'delivery', 'Colombo'],
  openGraph: {
    type: 'website',
    locale: 'en_LK',
    url: 'https://bingchunsrilanka.lk',
    siteName: 'Bing Chun Sri Lanka',
  },
  manifest: '/manifest.json',
  icons: { apple: '/icons/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#080b18',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable} data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <Providers>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
