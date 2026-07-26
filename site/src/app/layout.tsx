import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { NavBar } from '@/components/NavBar';
import { Footer } from '@/components/Footer';
import { CookieConsent } from '@/components/CookieConsent';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://aumitan.com'),
  title: 'Mitan : coupes rases et patrimoine naturel de votre commune',
  description:
    'Carte des coupes rases et perturbations forestières détectées par satellite, commune par commune, partout en France. Explorez le patrimoine naturel de votre territoire : forêts, forêts anciennes, zones protégées, Forêt-Score.',
  keywords: [
    'coupes rases',
    'coupe rase',
    'forêt',
    'patrimoine naturel',
    'commune',
    'déforestation',
    'télédétection',
    'Sentinel-2',
    'Forêt-Score',
    'forêts anciennes',
    'zones protégées',
    'France',
  ],
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://aumitan.com',
    siteName: 'Mitan',
    title: 'Mitan : coupes rases et patrimoine naturel de votre commune',
    description:
      'Carte des coupes rases et perturbations forestières, commune par commune. Un observatoire gratuit et indépendant du patrimoine naturel.',
    images: [{ url: '/LogoMitanRect-Slogan.png', alt: 'Mitan, notre milieu' }],
  },
  twitter: {
    card: 'summary',
    title: 'Mitan : coupes rases et patrimoine naturel de votre commune',
    description:
      'Carte des coupes rases et perturbations forestières, commune par commune. Gratuit et indépendant.',
    images: ['/LogoMitanRect-Slogan.png'],
  },
  icons: {
    icon: '/favicon.png',
  },
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Mitan',
  alternateName: 'aumitan.com',
  url: 'https://aumitan.com',
  inLanguage: 'fr',
  description:
    'Observatoire du patrimoine naturel des communes françaises : coupes rases, forêts et zones protégées, à partir de données satellite.',
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
        <Footer />
        <CookieConsent />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </body>
    </html>
  );
}
