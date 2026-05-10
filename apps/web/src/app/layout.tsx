import type { Metadata } from 'next';
import { AuthProvider } from '@ridendine/auth';
import { CartProvider } from '@/contexts/cart-context';
import { ToastProvider } from '@ridendine/ui';
import { SwRegistration } from '@/components/layout/sw-registration';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';

export const metadata: Metadata = {
  title: 'RideNDine - Home-Cooked Meals Delivered',
  description: 'Discover authentic home-cooked meals from local chefs in your neighbourhood. Support home chefs while enjoying delicious food delivered fresh.',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo-icon.png',
    apple: '/logo-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        <SwRegistration />
        <AuthProvider>
          <CartProvider>
            <ToastProvider>{children}</ToastProvider>
          </CartProvider>
        </AuthProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
