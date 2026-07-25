'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { STATS_V2_BASE } from '@/lib/constants';
import { fmtInt, fmtNum, fetchWithTimeout } from '@/lib/utils';

/**
 * Eau — angle utile pour Mitan : le lien entre coupes rases et ressource en eau
 * potable, c'est-à-dire les perturbations situées dans les AIRES D'ALIMENTATION
 * DE CAPTAGE (AAC). La conformité sanitaire de l'eau du robinet, elle, est presque
 * toujours à 100 % : elle n'apprend rien et n'a pas de lien avec la forêt, on ne
 * l'affiche donc pas.
 *
 * Le résumé est PRÉCALCULÉ dans mitan_data (stats_v2/eau/{code}.json), sur le même
 * principe que les recouvrements de zones protégées déjà calculés par le pipeline.
 * Schéma attendu (champs optionnels) :
 *   { "captages": 3, "aac_ha": 1234.5, "perturb_in_aac_ha": 12.3, "perturb_in_aac_pct": 4.5 }
 */

interface Props {
  communeCode: string;
}

interface WaterData {
  captages?: number;
  aac_ha?: number;
  perturb_in_aac_ha?: number;
  perturb_in_aac_pct?: number;
}

const cache = new Map<string, WaterData | 'none'>();

function ChantierPanel() {
  return (
    <div className="space-y-3">
      <div className="bg-sky-50 border border-sky-100 rounded-lg p-3 text-sm text-gray-700">
        <p className="font-medium text-gray-900 mb-1">Coupes rases et eau potable</p>
        <p className="text-[13px] leading-relaxed">
          Les coupes rases en amont d&apos;un captage peuvent troubler l&apos;eau, accentuer les
          crues et l&apos;étiage, et fragiliser la ressource. Mitan prépare un indicateur par
          commune : la part des coupes situées dans les <strong>aires d&apos;alimentation de
          captage</strong> d&apos;eau potable.
        </p>
      </div>
      <p className="text-[11px] text-gray-500 leading-relaxed">
        Ce volet demande un travail de données dédié (aires de captage croisées avec les
        détections). C&apos;est l&apos;un des chantiers du projet.{' '}
        <Link href="/soutenir" className="text-secondary hover:underline">
          Aider à le financer ou partager des données
        </Link>
      </p>
    </div>
  );
}

export function WaterSection({ communeCode }: Props) {
  const [state, setState] = useState<'loading' | 'ready' | 'none'>('loading');
  const [data, setData] = useState<WaterData | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cached = cache.get(communeCode);
    if (cached) {
      if (cached === 'none') setState('none');
      else {
        setData(cached);
        setState('ready');
      }
      return;
    }

    setState('loading');
    (async () => {
      try {
        const res = await fetchWithTimeout(`${STATS_V2_BASE}/eau/${communeCode}.json`, 8000);
        if (res.ok) {
          const d = (await res.json()) as WaterData;
          const meaningful =
            d && (d.perturb_in_aac_ha != null || d.aac_ha != null || d.captages != null);
          if (meaningful) {
            cache.set(communeCode, d);
            if (!cancelled) {
              setData(d);
              setState('ready');
            }
            return;
          }
        }
        cache.set(communeCode, 'none');
        if (!cancelled) setState('none');
      } catch {
        cache.set(communeCode, 'none');
        if (!cancelled) setState('none');
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
      </div>
    );
  }

  if (state === 'none' || !data) return <ChantierPanel />;

  const hasAac = data.aac_ha != null && data.aac_ha > 0;

  return (
    <div className="space-y-3">
      {data.captages != null && (
        <div className="bg-sky-50 border border-sky-100 rounded-lg p-3">
          <div className="text-sm text-gray-600">Captages d&apos;eau potable</div>
          <div className="text-2xl font-bold text-sky-700">{fmtInt(data.captages)}</div>
          {hasAac && (
            <div className="text-[11px] text-gray-500">
              aire d&apos;alimentation : {fmtInt(data.aac_ha!)} ha
            </div>
          )}
        </div>
      )}

      {data.perturb_in_aac_ha != null && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-3">
          <div className="text-sm text-gray-600">Coupes en aire de captage</div>
          <div className="text-2xl font-bold text-red-700">
            {fmtNum(data.perturb_in_aac_ha, 1)} ha
          </div>
          {data.perturb_in_aac_pct != null && (
            <div className="text-[11px] text-gray-500">
              soit {fmtNum(data.perturb_in_aac_pct, 1)} % des coupes de la commune
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-gray-400 leading-relaxed">
        Perturbations forestières croisées avec les aires d&apos;alimentation de captage d&apos;eau
        potable. Indicateur du lien entre coupes rases et ressource en eau.{' '}
        <Link href="/details" className="underline hover:text-secondary">
          Sources
        </Link>
      </p>
    </div>
  );
}
