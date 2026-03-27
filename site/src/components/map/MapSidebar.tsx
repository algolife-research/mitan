'use client';

import Link from 'next/link';
import { PROTECTED_AREAS_CONFIG } from '@/lib/map/ign-layers';
import { fmtNum, fmtInt } from '@/lib/utils';
import { CollapsibleSection } from './CollapsibleSection';
import { YearRangeSlider } from './YearRangeSlider';

const SCORE_COLORS: Record<string, string> = {
  A: '#1a9641', B: '#a6d96a', C: '#fee08b', D: '#f46d43', E: '#d73027',
};

function ScoreBar({ label, value, grade }: { label: string; value?: string; grade: 'A' | 'B' | 'C' | 'D' | 'E' | null }) {
  const grades = ['A', 'B', 'C', 'D', 'E'] as const;
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-600 w-16 flex-shrink-0">{label}</span>
      <div className="flex flex-1 h-3 rounded-full overflow-hidden">
        {grades.map((g) => (
          <div
            key={g}
            className="flex-1 relative"
            style={{ backgroundColor: SCORE_COLORS[g] }}
          >
            {grade === g && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-white rounded-full border-2 border-gray-700 shadow" />
              </div>
            )}
          </div>
        ))}
      </div>
      {value && <span className="text-[10px] text-gray-500 w-14 text-right flex-shrink-0">{value}</span>}
    </div>
  );
}

export interface MapSidebarProps {
  communeName: string;
  communeCode: string;
  // Year range
  yearRange: [number, number] | null;
  onYearRangeChange: (range: [number, number] | null) => void;
  minYear: number;
  maxYear: number;
  // Stats (pre-computed from stats_v2)
  yearStats: Record<number, number> | null;
  totalArea: number;
  communeSurface: number;
  forestSurface: number | null;
  forestScore: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  scoreBoisement: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  scoreCoupes: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  tauxBoisement: number | null;
  pixelAreaHa: number;
  observationYears: number;
  // Overlap (pre-computed)
  overlapStats: Record<string, { overlap: number; protectedAreaHa: number } | -1>;
  // BDForet (pre-computed)
  bdforetStats: Record<string, { ha: number; perturb_ha: number }> | null;
  bdforetCouvertStats: Record<string, { ha: number; perturb_ha: number }> | null;
  // Population
  population: { population: number; densite_hab_km2: number } | null;
  // Forets anciennes
  foretsAnciennes: {
    surface_ha: number;
    taux_foret_ancienne: number;
    perturb_in_ancienne_ha: number;
    perturb_in_ancienne_pct: number;
    par_nature: Record<string, { ha: number; perturb_ha: number }>;
  } | null;
  // Protected area toggles (for overlap section links)
  onProtectedAreaToggle: (areaId: string, visible: boolean) => void;
}

export function MapSidebar(props: MapSidebarProps) {
  const {
    communeName,
    yearRange, onYearRangeChange, minYear, maxYear,
    yearStats, totalArea, communeSurface, forestSurface, forestScore,
    scoreBoisement, scoreCoupes, tauxBoisement, pixelAreaHa,
    observationYears,
    overlapStats,
    bdforetStats,
    bdforetCouvertStats,
    population,
    foretsAnciennes,
    onProtectedAreaToggle,
  } = props;

  return (
    <div className="p-4 space-y-4">
      {/* Commune Name */}
      {communeName && (
        <div className="border-b pb-3">
          <h2 className="text-xl font-bold text-gray-900">{communeName}</h2>
          {population && (
            <p className="text-xs text-gray-500 mt-1">
              {fmtInt(population.population)} habitants · {fmtNum(population.densite_hab_km2, 1)} hab/km²
            </p>
          )}
        </div>
      )}

      {/* === Foret === */}
      <div>

      {/* Forest Score */}
      {communeSurface > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Foret-Score</span>
            <Link
              href="/foret-score"
              className="text-gray-400 hover:text-secondary transition-colors"
              title="En savoir plus sur le Foret-Score"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Link>
          </div>
          {forestScore ? (
            <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
              <div className="flex items-center gap-4">
                <img
                  src={`/Foret-Score-${forestScore}.svg`}
                  alt={`Foret-Score ${forestScore}`}
                  className="w-24 h-24"
                />
                <div className="flex-1 text-xs space-y-1">
                  <div className="text-gray-600">
                    <strong>Surface :</strong> {fmtInt(communeSurface)} ha
                  </div>
                  {forestSurface !== null && (
                    <div className="text-gray-600">
                      <strong>Dont foret :</strong> {fmtInt(forestSurface)} ha ({communeSurface > 0 ? fmtNum((forestSurface / communeSurface) * 100, 0) : 0} %)
                    </div>
                  )}
                  <div className="text-gray-600">
                    <strong>Coupes :</strong> {observationYears > 0 ? fmtNum(totalArea / observationYears, 2) : '\u2014'} ha / an ({communeSurface > 0 && observationYears > 0 ? fmtNum((totalArea / communeSurface / observationYears) * 100, 2) : 0} % / an)
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-gray-200 text-xs space-y-2">
                <ScoreBar label="Boisement" value={tauxBoisement !== null ? `${Math.round(tauxBoisement)}%` : undefined} grade={scoreBoisement} />
                <ScoreBar label="Coupes" value={communeSurface > 0 && observationYears > 0 ? `${fmtNum((totalArea / communeSurface / observationYears) * 100, 2)}%/an` : undefined} grade={scoreCoupes} />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 bg-white border-2 border-gray-200 rounded-lg p-4 animate-pulse">
              <div className="w-24 h-24 bg-gray-200 rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Perturbations */}
      {yearStats && (
        <CollapsibleSection title="Perturbations">
          {/* Total Area */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div className="text-sm text-gray-600">Surface totale perturbee</div>
            <div className="text-2xl font-bold text-red-600">{fmtNum(totalArea)} ha</div>
            <div className="text-xs text-gray-400 mt-1">Periode de suivi : janvier 2018 – septembre 2025 (<Link href="/details" className="underline hover:text-secondary">voir details et sources</Link>)</div>
          </div>

          {/* Year Range Slider */}
          {minYear > 0 && maxYear > 0 && (
            <div className="mb-4">
              <YearRangeSlider
                minYear={minYear}
                maxYear={maxYear}
                value={yearRange || [Math.min(minYear, 2018), Math.max(maxYear, 2025)]}
                onChange={(range) => onYearRangeChange(range)}
                onReset={() => onYearRangeChange(null)}
                yearStats={yearStats}
                pixelAreaHa={pixelAreaHa}
              />
            </div>
          )}

        </CollapsibleSection>
      )}

      {/* Analyses */}
      {yearStats && (
        <CollapsibleSection title="Analyses">
          {/* Protected Areas Overlap */}
          {Object.keys(overlapStats).length > 0 && (() => {
            const visibleEntries = Object.entries(overlapStats).filter(([areaId, stat]) => {
              const config = PROTECTED_AREAS_CONFIG.find(a => a.id === areaId);
              return config && !config.skipOverlap && stat !== -1 && stat.overlap > 0;
            });
            if (visibleEntries.length === 0) return null;
            return (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Perturbations par etat de protection</p>
                <div className="space-y-2">
                  {visibleEntries.map(([areaId, stat]) => {
                    const config = PROTECTED_AREAS_CONFIG.find(a => a.id === areaId)!;
                    if (stat === -1) return null;
                    const pctOfTotal = totalArea > 0 ? (stat.overlap / totalArea) * 100 : 0;
                    return (
                      <div key={areaId} className="bg-amber-50 border border-amber-200 rounded p-2">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-3 h-3 border border-gray-400 rounded-sm" style={{ backgroundColor: config.color }} />
                            <span className="text-xs font-medium text-gray-900">{config.name}</span>
                          </div>
                          <span className="text-xs font-bold text-amber-700">{fmtNum(pctOfTotal)}%</span>
                        </div>
                        <div className="text-xs text-gray-600">
                          {fmtNum(stat.overlap, 2)} ha perturbes sur {fmtNum(totalArea)} ha totaux
                        </div>
                        <div className="mt-1 bg-gray-200 rounded-full h-2">
                          <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${Math.min(pctOfTotal, 100)}%` }} />
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">Zone protegee : {fmtInt(stat.protectedAreaHa)} ha</div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 text-xs text-gray-500 italic">Les zones peuvent se chevaucher. Source : APICARTO / IGN</div>
              </div>
            );
          })()}

          {/* BDForet Overlap — Summary by couvert */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Perturbations par type de foret</p>

            {/* Par couvert (summary) */}
            {bdforetCouvertStats && Object.keys(bdforetCouvertStats).length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] text-gray-500 mb-1.5">Par couverture</p>
                <div className="space-y-1.5">
                  {Object.entries(bdforetCouvertStats)
                    .sort(([, a], [, b]) => b.perturb_ha - a.perturb_ha)
                    .map(([couvert, data]) => {
                      const perturbRate = data.ha > 0 ? (data.perturb_ha / data.ha) * 100 : 0;
                      return (
                        <div key={couvert} className="bg-green-50 border border-green-200 rounded p-2">
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="text-xs font-medium text-gray-900">{couvert}</span>
                            <span className="text-xs font-bold text-green-700 ml-2 whitespace-nowrap">{fmtNum(perturbRate, 1)} %</span>
                          </div>
                          <div className="text-[10px] text-gray-600 mb-1">
                            {fmtNum(data.perturb_ha, 1)} ha perturbes sur {fmtInt(data.ha)} ha totaux
                          </div>
                          <div className="bg-gray-200 rounded-full h-1.5">
                            <div className="bg-green-600 h-1.5 rounded-full" style={{ width: `${Math.min(perturbRate, 100)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Par type (detail) */}
            {bdforetStats && Object.keys(bdforetStats).length > 0 ? (
              <div className="space-y-2">
                <p className="text-[10px] text-gray-500">Detail par type ({fmtNum(totalArea)} ha perturbes)</p>
                {Object.entries(bdforetStats)
                  .sort(([, a], [, b]) => b.perturb_ha - a.perturb_ha)
                  .map(([tfvG11, data]) => {
                    const perturbRate = data.ha > 0 ? (data.perturb_ha / data.ha) * 100 : 0;
                    return (
                      <div key={tfvG11} className="bg-green-50 border border-green-200 rounded p-2">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-xs font-medium text-gray-900">{tfvG11}</span>
                          <span className="text-xs font-bold text-green-700 ml-2 whitespace-nowrap">{fmtNum(perturbRate, 1)} %</span>
                        </div>
                        <div className="text-[10px] text-gray-600 mb-1">{fmtNum(data.perturb_ha, 2)} ha perturbes sur {fmtInt(data.ha)} ha totaux</div>
                        <div className="bg-gray-200 rounded-full h-1.5">
                          <div className="bg-green-600 h-1.5 rounded-full" style={{ width: `${Math.min(perturbRate, 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                <div className="mt-2 text-xs text-gray-500 italic">Source : BDForet V2 / IGN</div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Aucune donnee disponible</p>
            )}

            {/* Forets anciennes */}
            {foretsAnciennes && (() => {
              const ancienne = foretsAnciennes.par_nature['foret ancienne'];
              if (!ancienne || ancienne.ha <= 0) return null;
              const perturbRate = ancienne.ha > 0 ? (ancienne.perturb_ha / ancienne.ha) * 100 : 0;
              return (
                <div className="mt-3">
                  <p className="text-[10px] text-gray-500 mb-1.5">Foret ancienne</p>
                  <div className="bg-emerald-50 border border-emerald-200 rounded p-2">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-xs font-medium text-gray-900">Foret ancienne</span>
                      <span className="text-xs font-bold text-emerald-700 ml-2 whitespace-nowrap">{fmtNum(perturbRate, 1)} %</span>
                    </div>
                    <div className="text-[10px] text-gray-600 mb-1">
                      {fmtNum(ancienne.perturb_ha, 1)} ha perturbes sur {fmtNum(ancienne.ha, 1)} ha totaux
                    </div>
                    {ancienne.perturb_ha > 0 && (
                      <div className="bg-gray-200 rounded-full h-1.5">
                        <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${Math.min(perturbRate, 100)}%` }} />
                      </div>
                    )}
                    <div className="text-[10px] text-gray-400 mt-1">Source : IGN Forets anciennes</div>
                  </div>
                </div>
              );
            })()}
          </div>
        </CollapsibleSection>
      )}

      </div>

      {/* Help */}
      <CollapsibleSection title="Aide" defaultOpen={false}>
        <div className="text-sm text-gray-600 space-y-2">
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Clic droit (appui long sur mobile) :</strong> Obtenez des informations detaillees sur un point</li>
            <li><strong>Changer de commune :</strong> Utilisez la barre de recherche dans la barre de navigation</li>
            <li><strong>Filtrer les coupes :</strong> Utilisez le curseur temporel</li>
            <li><strong>Couches cartographiques :</strong> Utilisez le bouton couches en haut a droite de la carte</li>
          </ul>

          <h4 className="font-semibold text-gray-900 mt-4">A savoir</h4>
          <p className="text-xs">
            Les <strong>perturbations</strong>, en rouge, sont des changements brutaux de la vegetation detectes par satellite.
            Ce sont surtout des <strong>coupes rases et incendies</strong>.
          </p>

          <h4 className="font-semibold text-gray-900 mt-4">Sources</h4>
          <div className="text-xs space-y-1">
            <p><strong>Annotation des forets :</strong> BDForet V2 IGN</p>
            <p><strong>Couches de base :</strong> Geoplateforme IGN</p>
            <p><strong>Donnees satellite :</strong> Copernicus Sentinel-2</p>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}
