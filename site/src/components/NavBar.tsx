'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import type { SearchSuggestion } from '@/types';
import { isValidCommuneCode } from '@/lib/utils';

const MAIN_LINKS = [
  { href: '/', label: 'Accueil' },
];

const MORE_LINKS = [
  { href: '/details', label: 'Details sur les donnees' },
  { href: '/mentions', label: 'Mentions legales' },
];

const ALL_LINKS = [...MAIN_LINKS, ...MORE_LINKS];

export function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    setSearch(query);
    if (!query.trim()) { setSuggestions([]); return; }

    try {
      const isPostalCode = !isNaN(Number(query));
      const [addressRes, communeRes] = await Promise.all([
        fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=3`),
        fetch(`https://geo.api.gouv.fr/communes?fields=nom,code,codesPostaux&boost=population&limit=5&${isPostalCode ? `codePostal=${query}` : `nom=${query}`}`),
      ]);
      const [addressData, communeData] = await Promise.all([addressRes.json(), communeRes.json()]);

      setSuggestions([
        ...communeData.map((c: any) => ({
          type: 'commune' as const,
          code: c.code,
          nom: c.nom,
          codesPostaux: c.codesPostaux,
        })),
        ...addressData.features.map((f: any) => ({
          type: 'address' as const,
          label: f.properties.label,
          city: f.properties.city,
          citycode: f.properties.citycode,
          coordinates: f.geometry.coordinates as [number, number],
        })),
      ]);
    } catch { setSuggestions([]); }
  }, []);

  const selectSuggestion = useCallback((item: SearchSuggestion) => {
    if (item.type === 'commune') {
      if (!isValidCommuneCode(item.code)) return;
      router.push(`/carte?commune=${item.code}`);
    } else if (item.type === 'address') {
      const code = item.citycode;
      if (code && isValidCommuneCode(code)) {
        router.push(`/carte?commune=${code}`);
      }
    }
    setSuggestions([]);
    setSearch('');
  }, [router]);

  // Hide search on homepage (it has its own)
  const showSearch = pathname !== '/';

  return (
    <nav className="bg-primary text-mitan-light fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center justify-between h-14 px-4">
        <Link href="/" className="flex items-center flex-shrink-0">
          <Image src="/LogoMitanRect.png" alt="Mitan" width={140} height={45} className="h-[45px]" style={{ width: 'auto' }} priority />
        </Link>

        {/* Search bar - center */}
        {showSearch && (
          <div ref={searchRef} className="hidden md:block flex-1 max-w-md mx-6 relative">
            <input
              type="text"
              placeholder="Chercher une commune, ex: Fontainebleau"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-3 py-1.5 rounded text-sm text-gray-900 bg-white/90 border border-white/20 focus:outline-none focus:ring-2 focus:ring-secondary placeholder:text-gray-400"
            />
            {suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-64 overflow-y-auto">
                {suggestions.map((item, idx) => (
                  <div
                    key={item.type === 'commune' ? `c-${item.code}` : `a-${idx}`}
                    onMouseDown={() => selectSuggestion(item)}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-900 flex items-center gap-2"
                  >
                    <span className="text-xs text-gray-500">
                      {item.type === 'commune' ? '\u{1F3DB}\u{FE0F}' : '\u{1F4CD}'}
                    </span>
                    <span>
                      {item.type === 'commune'
                        ? `${item.codesPostaux?.[0]} - ${item.nom}`
                        : item.label
                      }
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-6 text-sm flex-shrink-0">
          {MAIN_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="hover:text-secondary transition-colors">{label}</Link>
          ))}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="hover:text-secondary transition-colors flex items-center gap-1"
            >
              Plus
              <svg className={`w-3 h-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-primary-dark rounded-md shadow-lg border border-white/10 py-1 z-50">
                {MORE_LINKS.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setDropdownOpen(false)}
                    className="block px-4 py-2 text-sm hover:text-secondary hover:bg-white/5 transition-colors"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mobile: search + hamburger */}
        <div className="md:hidden flex items-center gap-2">
          {showSearch && (
            <div ref={searchRef} className="relative">
              <input
                type="text"
                placeholder="ex: Fontainebleau"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-36 px-2 py-1 rounded text-sm text-gray-900 bg-white/90 border border-white/20 focus:outline-none focus:w-48 transition-all placeholder:text-gray-400"
              />
              {suggestions.length > 0 && (
                <div className="absolute right-0 z-50 w-64 mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-64 overflow-y-auto">
                  {suggestions.map((item, idx) => (
                    <div
                      key={item.type === 'commune' ? `c-${item.code}` : `a-${idx}`}
                      onMouseDown={() => selectSuggestion(item)}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-900 flex items-center gap-2"
                    >
                      <span className="text-xs text-gray-500">
                        {item.type === 'commune' ? '\u{1F3DB}\u{FE0F}' : '\u{1F4CD}'}
                      </span>
                      <span>
                        {item.type === 'commune'
                          ? `${item.codesPostaux?.[0]} - ${item.nom}`
                          : item.label
                        }
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            className="text-mitan-light"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-primary border-t border-white/20 px-4 pb-3">
          {ALL_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm hover:text-secondary transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
