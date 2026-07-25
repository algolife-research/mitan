'use client';

import { useEffect, useState } from 'react';
import { STATS_V2_BASE } from '@/lib/constants';
import { fmtInt } from '@/lib/utils';

/**
 * Biodiversité — données AGRÉGÉES uniquement, dans le respect de la loi et des droits :
 * - source GBIF (API publique), créditée ; on n'affiche que des comptages (faits, non protégés) ;
 * - AUCUNE coordonnée précise, AUCUNE localisation d'observation, AUCUN pointage d'espèce sensible ;
 * - AUCUNE donnée personnelle (le nom des observateurs n'est jamais requêté ni affiché) ;
 * - lecture seule et en direct : on ne stocke ni ne redistribue de base de données.
 *
 * Robustesse : on tente une requête sur le contour communal simplifié ; si GBIF rejette la
 * géométrie (contours complexes, communes multi-polygones), on retombe sur l'emprise
 * rectangulaire (toujours valide) — la section fonctionne ainsi quelle que soit la commune.
 */

interface Props {
  communeCode: string;
}

interface Group {
  key: string;
  label: string;
  emoji: string;
  count: number;
}

// Groupes reconnaissables : règnes (Plantae/Fungi) + classes animales usuelles.
const KINGDOM_GROUPS: { key: string; label: string; emoji: string }[] = [
  { key: '6', label: 'Plantes', emoji: '\u{1F33F}' },
  { key: '5', label: 'Champignons', emoji: '\u{1F344}' },
];
// classKey de la dorsale taxonomique GBIF (valeurs stables et vérifiées).
const CLASS_GROUPS: { key: string; label: string; emoji: string }[] = [
  { key: '212', label: 'Oiseaux', emoji: '\u{1F426}' },
  { key: '216', label: 'Insectes', emoji: '\u{1F98B}' },
  { key: '359', label: 'Mammifères', emoji: '\u{1F98C}' },
  { key: '131', label: 'Amphibiens', emoji: '\u{1F438}' },
];

type Result = { total: number; groups: Group[]; wkt: string };
const cache = new Map<string, Result | 'error'>();

function ringArea(ring: number[][]): number {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return a / 2;
}

function decimate(ring: number[][], max = 200): number[][] {
  if (ring.length <= max) return ring;
  const step = Math.ceil(ring.length / max);
  const out: number[][] = [];
  for (let i = 0; i < ring.length; i += step) out.push(ring[i]);
  return out;
}

/** Plus grand anneau extérieur du contour (le corps principal de la commune). */
function largestRing(geometry: any): number[][] | null {
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
  return best;
}

/** WKT du contour (fermé, anti-horaire) — précis mais parfois refusé par GBIF. */
function contourWkt(ring: number[][]): string {
  let r = decimate(ring.map((p) => [p[0], p[1]]));
  const f = r[0];
  const l = r[r.length - 1];
  if (f[0] !== l[0] || f[1] !== l[1]) r.push([f[0], f[1]]);
  if (ringArea(r) < 0) r = r.reverse();
  return 'POLYGON((' + r.map((p) => `${p[0]} ${p[1]}`).join(',') + '))';
}

/** Emprise rectangulaire du corps principal (toujours valide, anti-horaire) — repli robuste. */
function bboxWkt(ring: number[][]): string {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return `POLYGON((${minX} ${minY},${maxX} ${minY},${maxX} ${maxY},${minX} ${maxY},${minX} ${minY}))`;
}

/** Construit les groupes affichés à partir des comptages par règne et par classe. */
function buildGroups(byKingdom: Record<string, number>, byClass: Record<string, number>): Group[] {
  const groups: Group[] = [];
  for (const g of KINGDOM_GROUPS) {
    const count = byKingdom[g.key] || 0;
    if (count > 0) groups.push({ ...g, count });
  }
  for (const g of CLASS_GROUPS) {
    const count = byClass[g.key] || 0;
    if (count > 0) groups.push({ ...g, count });
  }
  groups.sort((a, b) => b.count - a.count);
  return groups;
}

async function queryGbif(wkt: string) {
  const url =
    'https://api.gbif.org/v1/occurrence/search?limit=0' +
    '&hasCoordinate=true&hasGeospatialIssue=false' +
    '&facet=kingdomKey&facet=classKey&facetLimit=60' +
    `&geometry=${encodeURIComponent(wkt)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`gbif ${res.status}`);
  const g = await res.json();
  const facetMap = (name: string): Record<string, number> => {
    const f = (g.facets || []).find((x: any) => (x.field || '').toUpperCase() === name);
    const m: Record<string, number> = {};
    for (const c of f?.counts || []) m[c.name] = c.count;
    return m;
  };
  return { total: g.count || 0, byKingdom: facetMap('KINGDOM_KEY'), byClass: facetMap('CLASS_KEY') };
}

export function NatureSection({ communeCode }: Props) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [data, setData] = useState<Result | null>(null);

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
      // 1) Résumé précalculé dans mitan_data (fiable, sans appel externe) — prioritaire.
      try {
        const sRes = await fetch(`${STATS_V2_BASE}/nature/${communeCode}.json`);
        if (sRes.ok) {
          const s = await sRes.json();
          const result: Result = {
            total: s.total || 0,
            groups: buildGroups(s.kingdom || {}, s.class || {}),
            wkt: '',
          };
          cache.set(communeCode, result);
          if (!cancelled) {
            setData(result);
            setState('ready');
          }
          return;
        }
      } catch {
        /* pas de fichier précalculé : on tente l'appel en direct ci-dessous */
      }

      // 2) Repli : appel GBIF en direct (contour, puis emprise rectangulaire).
      try {
        const cRes = await fetch(
          `https://geo.api.gouv.fr/communes/${communeCode}?fields=contour&format=geojson`
        );
        if (!cRes.ok) throw new Error('contour');
        const feature = await cRes.json();
        const ring = largestRing(feature.geometry);
        if (!ring) throw new Error('no-geometry');

        const precise = contourWkt(ring);
        const fallback = bboxWkt(ring);
        let out: Awaited<ReturnType<typeof queryGbif>> | null = null;
        let usedWkt = precise;

        try {
          out = await queryGbif(precise);
        } catch {
          out = null;
        }
        if (!out) {
          out = await queryGbif(fallback); // repli emprise rectangulaire (toujours valide)
          usedWkt = fallback;
        }

        const result: Result = {
          total: out.total,
          groups: buildGroups(out.byKingdom, out.byClass),
          wkt: usedWkt,
        };
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
        Le résumé biodiversité de cette commune est en cours de constitution.{' '}
        <a
          href="https://www.gbif.org/occurrence/search?country=FR"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-secondary"
        >
          Explorer sur GBIF
        </a>
      </p>
    );
  }

  const gbifLink = `https://www.gbif.org/occurrence/search?geometry=${encodeURIComponent(data.wkt)}`;

  if (data.total === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-gray-600">
          Peu ou pas d&apos;observations partagées dans ce secteur pour l&apos;instant.
        </p>
        <a href={gbifLink} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-secondary hover:underline">
          Contribuer / explorer sur GBIF →
        </a>
      </div>
    );
  }

  const max = Math.max(1, ...data.groups.map((g) => g.count));

  return (
    <div className="space-y-3">
      <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
        <div className="text-sm text-gray-600">Observations partagées (GBIF)</div>
        <div className="text-2xl font-bold text-emerald-700">{fmtInt(data.total)}</div>
        <div className="text-[11px] text-gray-500">dans le secteur de la commune</div>
      </div>

      {data.groups.length > 0 && (
        <div className="space-y-1.5">
          {data.groups.map((g) => (
            <div key={g.key}>
              <div className="flex justify-between items-baseline text-xs mb-0.5">
                <span className="text-gray-800">
                  {g.emoji} {g.label}
                </span>
                <span className="text-gray-500">{fmtInt(g.count)}</span>
              </div>
              <div className="bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full"
                  style={{ width: `${Math.round((g.count / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <a href={gbifLink} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-secondary hover:underline">
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
