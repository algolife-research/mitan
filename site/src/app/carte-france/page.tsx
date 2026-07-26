import type { Metadata } from 'next';
import { FranceDeptMap } from '@/components/FranceDeptMap';

export const metadata: Metadata = {
  title: 'Carte de France des coupes rases par département | Mitan',
  description:
    'Taux de coupe annuel moyen (2018-2025) des forêts par département, en % de la surface forestière. Survolez pour le détail, cliquez un département pour explorer ses communes.',
  alternates: { canonical: '/carte-france' },
};

export default function CarteFrancePage() {
  return (
    <div className="min-h-screen bg-white py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">La France des coupes rases</h1>
        <p className="text-sm text-gray-600 mb-8">
          Taux de coupe annuel moyen 2018-2025, en % de la surface forestière de chaque département.
          Survolez un département pour son détail, cliquez pour explorer ses communes.
        </p>
        <FranceDeptMap />
      </div>
    </div>
  );
}
