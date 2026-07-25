import type { Metadata } from 'next';
import { CarteClient } from './CarteClient';

export const metadata: Metadata = {
  title: 'Carte des coupes rases et des forêts de votre commune | Mitan',
  description:
    'Visualisez sur une carte les coupes rases et perturbations forestières de votre commune depuis 2018, détectées par satellite : forêts, forêts anciennes, zones protégées, Forêt-Score.',
  alternates: { canonical: '/carte' },
};

export default function CartePage() {
  return <CarteClient />;
}
