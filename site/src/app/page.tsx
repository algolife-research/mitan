'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
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
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-8">
            <Image 
              src="/LogoMitanRect-Slogan.png" 
              alt="Logo Mitan avec Slogan" 
              width={400} 
              height={120} 
              className="mx-auto mb-8"
              priority
            />
          </div>

          {/* Search Bar */}
          <div className="mb-12 relative max-w-2xl mx-auto">
            <input
              type="text"
              placeholder="Chercher une commune, ex: Fontainebleau"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((commune: any) => (
                  <div
                    key={commune.code}
                    onClick={() => selectCommune(commune.code)}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    {commune.codesPostaux?.[0]} - {commune.nom}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="text-lg text-gray-700 mb-12 space-y-4">
            <p>
              <strong>Mitan</strong> est une plateforme cartographique conçue comme un{' '}
              <strong>observatoire du patrimoine naturel</strong>, surtout forestier, des communes françaises.
            </p>
            <p>
              Mitan se veut <strong>outil de suivi</strong> de notre milieu et des perturbations l'affectant, 
              et <strong>espace d'échange</strong> pour citoyens et gestionnaires, favorisant des décisions 
              éclairées pour l'avenir de nos <strong>territoires</strong>.
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Quelques exemples...</h2>
            <div className="space-y-4">
              <div className="text-center">
                <Link
                  href="/carte?commune=19136"
                  className="inline-block bg-secondary hover:bg-secondary-hover text-white px-8 py-3 rounded-md font-medium transition-colors"
                >
                  Limousin - Plateau de Millevaches (Meymac)
                </Link>
              </div>
              <div className="text-center">
                <Link
                  href="/carte?commune=38442"
                  className="inline-block bg-[#6f9685] hover:bg-[#5d8473] text-white px-8 py-3 rounded-md font-medium transition-colors"
                >
                  Alpes - Chartreuse (Saint-Pierre-de-Chartreuse)
                </Link>
              </div>
              <div className="text-center">
                <Link
                  href="/carte?commune=33529"
                  className="inline-block bg-secondary hover:bg-secondary-hover text-white px-8 py-3 rounded-md font-medium transition-colors"
                >
                  Landes (La Teste-de-Buch)
                </Link>
              </div>
              <div className="text-center">
                <Link
                  href="/carte?commune=35211"
                  className="inline-block bg-[#6f9685] hover:bg-[#5d8473] text-white px-8 py-3 rounded-md font-medium transition-colors"
                >
                  Bretagne - Brocéliande (Paimpont)
                </Link>
              </div>
              <div className="text-center">
                <Link
                  href="/carte?commune=77186"
                  className="inline-block bg-secondary hover:bg-secondary-hover text-white px-8 py-3 rounded-md font-medium transition-colors"
                >
                  Ile-de-France - Forêt de Fontainebleau (Fontainebleau)
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
