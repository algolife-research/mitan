import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { NavBar } from '@/components/NavBar';
import { Footer } from '@/components/Footer';
import { CookieConsent } from '@/components/CookieConsent';
import { SupportPopup } from '@/components/SupportPopup';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://aumitan.com'),
  title: 'Mitan : l’observatoire des coupes rases, commune par commune',
  description:
    'Observatoire des coupes rases et des perturbations forestières détectées par satellite, commune par commune, partout en France. Explorez le patrimoine naturel de votre territoire : forêts, forêts anciennes, zones protégées, Forêt-Score.',
  keywords: [
    'observatoire des coupes rases',
    'observatoire coupes rases',
    'coupes rases',
    'coupe rase',
    'observatoire des forêts',
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
    title: 'Mitan : l’observatoire des coupes rases, commune par commune',
    description:
      'L’observatoire des coupes rases, commune par commune : un projet gratuit et indépendant de suivi du patrimoine naturel par satellite.',
    images: [{ url: '/LogoMitanRect-Slogan.png', alt: 'Mitan, notre milieu' }],
  },
  twitter: {
    card: 'summary',
    title: 'Mitan : l’observatoire des coupes rases, commune par commune',
    description:
      'L’observatoire des coupes rases, commune par commune. Gratuit et indépendant.',
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
    'Observatoire des coupes rases et du patrimoine naturel des communes françaises : forêts, perturbations et zones protégées, à partir de données satellite.',
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
        <SupportPopup />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </body>
    </html>
  );
}
