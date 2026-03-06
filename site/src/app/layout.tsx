import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { NavBar } from '@/components/NavBar';
import { CookieConsent } from '@/components/CookieConsent';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mitan - Notre milieu',
  description: 'Mitan est une plateforme dédiée à l\'exploration et au suivi du patrimoine forestier des communes françaises.',
  keywords: ['forêt', 'déforestation', 'télédétection', 'Sentinel-2', 'France'],
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <GoogleAnalytics />
        <NavBar />
        <div className="pt-14">
          <Providers>{children}</Providers>
        </div>
        <CookieConsent />
      </body>
    </html>
  );
}
