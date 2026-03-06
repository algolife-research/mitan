'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CommunesPage() {
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const router = useRouter();

  const handleSearch = async (query: string) => {
    setSearch(query);
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      const isPostalCode = !isNaN(Number(query));
      const response = await fetch(
        `https://geo.api.gouv.fr/communes?fields=nom,code,codesPostaux&boost=population&limit=10&${isPostalCode ? `codePostal=${query}` : `nom=${query}`}`
      );
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error('Error fetching communes:', error);
      setSuggestions([]);
    }
  };

  const selectCommune = (code: string) => {
    router.push(`/carte?commune=${code}`);
  };

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Chercher une Commune</h1>
        
        <div className="mb-8 relative">
          <input
            type="text"
            placeholder="Rechercher une commune..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto">
              {suggestions.map((commune: any) => (
                <div
                  key={commune.code}
                  onClick={() => selectCommune(commune.code)}
                  className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-gray-900">{commune.nom}</div>
                  <div className="text-sm text-gray-500">
                    {commune.codesPostaux?.join(', ')} • Code INSEE: {commune.code}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-gray-600">
          <p>Entrez le nom d'une commune pour explorer ses données forestières.</p>
          <p className="mt-4">
            <strong>Exemples :</strong>
          </p>
          <ul className="list-disc list-inside mt-2 space-y-2">
            <li><Link href="/carte?commune=19136" className="text-secondary hover:underline">Meymac (19136)</Link></li>
            <li><Link href="/carte?commune=38442" className="text-secondary hover:underline">Saint-Pierre-de-Chartreuse (38442)</Link></li>
            <li><Link href="/carte?commune=33529" className="text-secondary hover:underline">La Teste-de-Buch (33529)</Link></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
