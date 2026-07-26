'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { STATS_V2_BASE } from '@/lib/constants';
import { fmtInt, fmtNum } from '@/lib/utils';

interface DeptGeo {
  nom: string;
  d: string;
  bbox: [number, number, number, number];
}
interface GeoFile {
  viewBox: string;
  departements: Record<string, DeptGeo>;
}
interface DeptStats {
  nom: string;
  surface_ha: number;
  foret_ha: number;
  perturb_ha_annuel: number;
  taux_coupe_annuel: number | null;
  taux_boisement: number | null;
  n_communes: number;
}
interface StatsFile {
  periode: string;
  national: DeptStats;
  departements: Record<string, DeptStats>;
}
interface CommuneRow {
  code: string;
  nom: string;
  taux_coupe_annuel: number | null;
  taux_boisement: number | null;
  foret_ha: number;
  score: string | null;
}

/** Seuils (en % de forêt coupée par an) et rampe de couleurs associée */
const BINS = [0.15, 0.3, 0.5, 0.75, 1.0, 1.3];
const COLORS = ['#eef4ec', '#fdeccd', '#fbd39e', '#f7ab72', '#ee7d50', '#dc4b34', '#a81f1f'];

function colorFor(taux: number | null | undefined): string {
  if (taux == null) return '#e5e7eb';
  let i = 0;
  while (i < BINS.length && taux >= BINS[i]) i++;
  return COLORS[i];
}

export function FranceDeptMap() {
  const [geo, setGeo] = useState<GeoFile | null>(null);
  const [stats, setStats] = useState<StatsFile | null>(null);
  const [failed, setFailed] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [communes, setCommunes] = useState<CommuneRow[] | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/departements-paths.json').then((r) => r.json()),
      fetch(`${STATS_V2_BASE}/departements.json`).then((r) => r.json()),
    ])
      .then(([g, s]) => {
        if (cancelled) return;
        setGeo(g);
        setStats(s);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Communes du département sélectionné
  useEffect(() => {
    if (!selected) {
      setCommunes(null);
      return;
    }
    let cancelled = false;
    setCommunes(null);
    fetch(`${STATS_V2_BASE}/dept/${selected}_communes.json`)
      .then((r) => r.json())
      .then((rows) => {
        if (!cancelled) setCommunes(rows);
      })
      .catch(() => {
        if (!cancelled) setCommunes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const viewBox = geo?.viewBox ?? '0 0 1000 963';
  const [vbW, vbH] = useMemo(() => {
    const parts = viewBox.split(' ').map(Number);
    return [parts[2] || 1000, parts[3] || 963];
  }, [viewBox]);

  // Zoom sur le département sélectionné (transformation CSS animée)
  const groupTransform = useMemo(() => {
    if (!selected || !geo) return 'translate(0px, 0px) scale(1)';
    const dept = geo.departements[selected];
    if (!dept) return 'translate(0px, 0px) scale(1)';
    const [bx, by, bw, bh] = dept.bbox;
    const s = Math.min(4.5, 0.82 * Math.min(vbW / bw, vbH / bh));
    const tx = vbW / 2 - s * (bx + bw / 2);
    const ty = vbH / 2 - s * (by + bh / 2);
    return `translate(${Math.round(tx)}px, ${Math.round(ty)}px) scale(${s.toFixed(3)})`;
  }, [selected, geo, vbW, vbH]);

  const handleMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  if (failed) {
    return (
      <p className="text-gray-600">
        La carte de France est momentanément indisponible.{' '}
        <Link href="/carte" className="text-secondary hover:underline">Explorer la carte détaillée</Link>
      </p>
    );
  }

  if (!geo || !stats) {
    return <div className="h-96 bg-gray-100 rounded-lg animate-pulse" aria-hidden="true" />;
  }

  const hoveredStats = hovered ? stats.departements[hovered] : null;
  const selectedStats = selected ? stats.departements[selected] : null;
  const topCommunes = (communes ?? [])
    .filter((c) => c.foret_ha >= 100 && c.taux_coupe_annuel != null)
    .slice(0, 8);

  return (
    <div className="grid md:grid-cols-5 gap-6 items-start">
      {/* Carte */}
      <div ref={containerRef} className="relative md:col-span-3" onMouseMove={handleMove}>
        <svg viewBox={viewBox} className="w-full h-auto select-none" role="img"
          aria-label="Carte de France du taux de coupes rases par département">
          <g style={{ transform: groupTransform, transition: 'transform 600ms ease' }}>
            {Object.entries(geo.departements).map(([code, dept]) => {
              const s = stats.departements[code];
              const isSel = selected === code;
              const isHov = hovered === code;
              return (
                <path
                  key={code}
                  d={dept.d}
                  fill={colorFor(s?.taux_coupe_annuel)}
                  stroke={isSel || isHov ? '#2d4533' : '#ffffff'}
                  strokeWidth={isSel || isHov ? 1.6 : 0.7}
                  opacity={selected && !isSel ? 0.35 : 1}
                  className="cursor-pointer transition-opacity"
                  onMouseEnter={() => setHovered(code)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setSelected(isSel ? null : code)}
                >
                  <title>{`${dept.nom} : ${s?.taux_coupe_annuel != null ? fmtNum(s.taux_coupe_annuel, 2) : '?'} %/an`}</title>
                </path>
              );
            })}
          </g>
        </svg>

        {/* Infobulle */}
        {hovered && hoveredStats && tooltip && !selected && (
          <div
            className="absolute z-10 pointer-events-none bg-white border border-gray-200 rounded-md shadow-lg px-3 py-2 text-xs"
            style={{ left: Math.min(tooltip.x + 12, 9999), top: tooltip.y + 12 }}
          >
            <div className="font-semibold text-gray-900">{hoveredStats.nom}</div>
            <div className="text-gray-700">
              Coupes : <strong>{fmtNum(hoveredStats.taux_coupe_annuel ?? 0, 2)} %</strong> de la forêt par an
            </div>
            <div className="text-gray-500">
              {fmtInt(hoveredStats.foret_ha)} ha de forêt · {hoveredStats.n_communes} communes
            </div>
          </div>
        )}

        {/* Légende */}
        <div className="mt-3 flex items-center gap-1 text-[11px] text-gray-600 flex-wrap">
          <span className="mr-1">Coupes (% forêt/an) :</span>
          {COLORS.map((c, i) => (
            <span key={c} className="flex items-center gap-1">
              <span className="inline-block w-4 h-3 rounded-sm border border-gray-300" style={{ backgroundColor: c }} />
              {i < BINS.length ? <span className="mr-1">&lt; {BINS[i]}</span> : <span>+</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Panneau latéral */}
      <div className="md:col-span-2">
        {!selected && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 space-y-3">
            <p>
              En moyenne nationale, <strong>{fmtNum(stats.national.taux_coupe_annuel ?? 0, 2)} %</strong> de la
              forêt est coupée chaque année ({stats.periode}).
            </p>
            <p>
              Survolez un département pour voir son taux, cliquez pour découvrir ses communes.
            </p>
            <p className="text-xs text-gray-500">
              Détections satellite (S. Mermoz et al., Sentinel-2), rapportées à la surface forestière de
              chaque département. <Link href="/details" className="underline hover:text-secondary">Sources et limites</Link>
            </p>
          </div>
        )}

        {selected && selectedStats && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-gray-900">{selectedStats.nom}</h3>
              <button
                onClick={() => setSelected(null)}
                className="text-xs text-gray-500 hover:text-secondary border border-gray-300 rounded-full px-3 py-1 transition-colors"
              >
                ← Toute la France
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-red-50 border border-red-100 rounded p-2">
                <div className="text-gray-500">Coupes</div>
                <div className="text-base font-bold text-red-700">
                  {fmtNum(selectedStats.taux_coupe_annuel ?? 0, 2)} %/an
                </div>
                <div className="text-gray-500">{fmtInt(selectedStats.perturb_ha_annuel)} ha/an</div>
              </div>
              <div className="bg-green-50 border border-green-100 rounded p-2">
                <div className="text-gray-500">Forêt</div>
                <div className="text-base font-bold text-green-800">
                  {fmtNum(selectedStats.taux_boisement ?? 0, 0)} %
                </div>
                <div className="text-gray-500">{fmtInt(selectedStats.foret_ha)} ha</div>
              </div>
            </div>

            <div>
              <p className="font-medium text-gray-900 mb-1">
                Communes les plus touchées <span className="text-gray-400 font-normal">(forêt &ge; 100 ha)</span>
              </p>
              {communes === null && <div className="h-40 bg-gray-100 rounded animate-pulse" />}
              {communes !== null && topCommunes.length === 0 && (
                <p className="text-gray-500 text-xs">Pas de donnée disponible.</p>
              )}
              <ul className="divide-y divide-gray-100">
                {topCommunes.map((c) => (
                  <li key={c.code}>
                    <Link
                      href={`/carte?commune=${c.code}`}
                      className="flex items-center justify-between gap-2 py-1.5 group"
                    >
                      <span className="text-gray-800 group-hover:text-secondary transition-colors truncate">
                        {c.nom}
                      </span>
                      <span className="text-xs text-red-700 font-semibold whitespace-nowrap">
                        {fmtNum(c.taux_coupe_annuel ?? 0, 1)} %/an
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-500 mt-2">
                Cliquez une commune pour ouvrir la carte détaillée, ou{' '}
                <Link href="/carte" className="underline hover:text-secondary">cherchez la vôtre</Link>.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
