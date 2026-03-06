'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const CommuneMapNoSSR = dynamic(() => import('@/components/map/CommuneMap').then(mod => ({ default: mod.CommuneMap })), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-gray-500">Chargement de la carte...</div>
    </div>
  ),
});

export default function CartePage() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden">
      <Suspense>
        <CommuneMapNoSSR />
      </Suspense>
    </div>
  );
}
