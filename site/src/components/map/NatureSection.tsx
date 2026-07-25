'use client';

import { useEffect, useState } from 'react';
import { fmtInt } from '@/lib/utils';

/**
 * Biodiversité — données AGRÉGÉES uniquement, dans le respect de la loi et des droits :
 * - source GBIF (API publique), créditée ; on n'affiche que des comptages (faits, non protégés) ;
 * - AUCUNE coordonnée précise, AUCUNE localisation d'observation, AUCUN pointage d'espèce sensible ;
 * - AUCUNE donnée personnelle (le nom des observateurs n'est jamais requêté ni affiché) ;
 * - lecture seule et en direct : on ne stocke ni ne redistribue de base de données.
 * Le détail (espèces, licences, précautions sur les espèces protégées) reste sur GBIF/INPN.
 */

interface Props {
  communeCode: string;
}

interface Bucket {
  key: string;
  label: string;
  emoji: string;
  count: number;
}

const KINGDOM_LABEL: Record<string, { label: string; emoji: string }> = {
  '1': { label: 'Animaux', emoji: '\u{1F98C}' },
  '6': { label: 'Plantes', emoji: '\u{1F33F}' },
  '5': { label: 'Champignons', emoji: '\u{1F344}' },
};

const cache = new Map<string, { total: number; buckets: Bucket[]; wkt: string } | 'error'>();

function ringArea(ring: number[][]): number {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return a / 2;
}

function decimate(ring: number[][], max = 280): number[][] {
  if (ring.length <= max) return ring;
  const step = Math.ceil(ring.length / max);
  const out: number[][] = [];
  for (let i = 0; i < ring.length; i += step) out.push(ring[i]);
  return out;
}

/** Construit un WKT POLYGON valide (fermé, sens anti-horaire) pour l'API GBIF. */
function contourToWkt(geometry: any): string | null {
  if (!geometry) return null;
  const polys: number[][][][] =
    geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
  let best: number[][] | null = null;
  let bestSize = -1;
  for (const poly of polys) {
    const ring = poly[0];
    if (!ring || ring.length < 4) continue;
    const size = Math.abs(ringArea(ring));
    if (size > bestSize) {
      bestSize = size;
      best = ring;
    }
  }
  if (!best) return null;
  let ring = decimate(best.map((p) => [p[0], p[1]]));
  // refermer
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push([first[0], first[1]]);
  // GBIF exige un anneau extérieur anti-horaire (aire signée positive)
  if (ringArea(ring) < 0) ring = ring.reverse();
  return 'POLYGON((' + ring.map((p) => `${p[0]} ${p[1]}`).join(',') + '))';
}

export function NatureSection({ communeCode }: Props) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [data, setData] = useState<{ total: number; buckets: Bucket[]; wkt: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cached = cache.get(communeCode);
    if (cached) {
      if (cached === 'error') setState('error');
      else {
        setData(cached);
        setState('ready');
      }
      return;
    }

    setState('loading');
    (async () => {
      try {
        const cRes = await fetch(
          `https://geo.api.gouv.fr/communes/${communeCode}?fields=contour&format=geojson`
        );
        if (!cRes.ok) throw new Error('contour');
        const feature = await cRes.json();
        const wkt = contourToWkt(feature.geometry);
        if (!wkt) throw new Error('wkt');

        const url =
          'https://api.gbif.org/v1/occurrence/search?limit=0' +
          '&hasCoordinate=true&hasGeospatialIssue=false' +
          '&facet=kingdomKey&facetLimit=12' +
          `&geometry=${encodeURIComponent(wkt)}`;
        const gRes = await fetch(url);
        if (!gRes.ok) throw new Error('gbif');
        const g = await gRes.json();

        const facet = (g.facets || []).find(
          (f: any) => (f.field || '').toUpperCase() === 'KINGDOM_KEY'
        );
        const counts: { name: string; count: number }[] = facet?.counts || [];
        let autres = 0;
        const named: Bucket[] = [];
        for (const c of counts) {
          const meta = KINGDOM_LABEL[c.name];
          if (meta) named.push({ key: c.name, ...meta, count: c.count });
          else autres += c.count;
        }
        named.sort((a, b) => b.count - a.count);
        if (autres > 0) named.push({ key: 'other', label: 'Autres', emoji: '\u{1F52C}', count: autres });

        const result = { total: g.count || 0, buckets: named, wkt };
        cache.set(communeCode, result);
        if (!cancelled) {
          setData(result);
          setState('ready');
        }
      } catch {
        cache.set(communeCode, 'error');
        if (!cancelled) setState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [communeCode]);

  if (state === 'loading') {
    return (
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
      </div>
    );
  }

  if (state === 'error' || !data) {
    return (
      <p className="text-xs text-gray-500">
        Données de biodiversité momentanément indisponibles.{' '}
        <a
          href={`https://www.gbif.org/occurrence/search?q=&country=FR`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-secondary"
        >
          Explorer sur GBIF
        </a>
      </p>
    );
  }

  const max = Math.max(1, ...data.buckets.map((b) => b.count));
  const gbifLink = `https://www.gbif.org/occurrence/search?geometry=${encodeURIComponent(data.wkt)}`;

  return (
    <div className="space-y-3">
      <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
        <div className="text-sm text-gray-600">Observations partagées (GBIF)</div>
        <div className="text-2xl font-bold text-emerald-700">{fmtInt(data.total)}</div>
        <div className="text-[11px] text-gray-500">dans le secteur de la commune</div>
      </div>

      {data.buckets.length > 0 && (
        <div className="space-y-1.5">
          {data.buckets.map((b) => (
            <div key={b.key}>
              <div className="flex justify-between items-baseline text-xs mb-0.5">
                <span className="text-gray-800">
                  {b.emoji} {b.label}
                </span>
                <span className="text-gray-500">{fmtInt(b.count)}</span>
              </div>
              <div className="bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full"
                  style={{ width: `${Math.round((b.count / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <a
        href={gbifLink}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-xs text-secondary hover:underline"
      >
        Voir le détail des espèces sur GBIF →
      </a>

      <p className="text-[10px] text-gray-400 leading-relaxed">
        Comptages agrégés issus de GBIF.org (observations partagées par de nombreux organismes).
        Les localisations précises et les espèces sensibles ne sont pas affichées ici ; consultez
        GBIF ou l&apos;INPN pour le détail et les licences propres à chaque jeu de données.
      </p>
    </div>
  );
}
