import type { Metadata } from 'next';
import { HomeClient } from './HomeClient';

export const metadata: Metadata = {
  title: 'Mitan : l’observatoire des coupes rases, commune par commune',
  description:
    'Observatoire des coupes rases et des perturbations forestières détectées par satellite, commune par commune, partout en France. Explorez le patrimoine naturel de votre territoire : forêts, forêts anciennes, zones protégées, Forêt-Score.',
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return <HomeClient />;
}
