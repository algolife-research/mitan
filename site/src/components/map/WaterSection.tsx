'use client';

import { useEffect, useState } from 'react';
import { STATS_V2_BASE } from '@/lib/constants';
import { fmtInt, fetchWithTimeout } from '@/lib/utils';

/**
 * Eau potable — résumé du contrôle sanitaire, dans le respect de la loi et des droits :
 * - source Hub'Eau (API publique du SANDRE / ministère), créditée ;
 * - requête filtrée par CODE COMMUNE et bornée (size réduite) : jamais abusive,
 *   même pour une grande ville (on ne rapatrie qu'un petit échantillon récent) ;
 * - lecture seule, aucune donnée personnelle.
 * Lit d'abord un résumé précalculé dans mitan_data si présent, sinon appel en direct.
 */

interface Props {
  communeCode: string;
}

type Result = {
  samples: number;
  conform: number | null; // % de prélèvements conformes, ou null si non calculable
  lastDate: string | null;
};

const cache = new Map<string, Result | 'error'>();

const HUBEAU =
  'https://hubeau.eaufrance.fr/api/v1/qualite_eau_potable/resultats_dis';

function summarize(rows: any[]): Result {
  // Un prélèvement = un date_prelevement ; on déduplique pour ne pas compter les
  // lignes par paramètre plusieurs fois.
  const byPrelevement = new Map<string, string>();
  for (const r of rows) {
    const key = `${r.date_prelevement || ''}|${r.code_installation_amont || r.nom_uge || ''}`;
    const concl = (r.conclusion_conformite_prelevement || '').toString().toLowerCase();
    // On garde la conclusion « la moins bonne » vue pour ce prélèvement
    const prev = byPrelevement.get(key);
    if (prev === undefined || (prev.includes('conforme') && !prev.includes('non') && concl.includes('non'))) {
      byPrelevement.set(key, concl);
    }
  }
  const concls = [...byPrelevement.values()].filter(Boolean);
  const samples = concls.length;
  let conform: number | null = null;
  if (samples > 0) {
    const ok = concls.filter((c) => c.includes('conforme') && !c.includes('non conforme')).length;
    conform = Math.round((ok / samples) * 100);
  }
  const dates = rows.map((r) => r.date_prelevement).filter(Boolean).sort();
  return { samples, conform, lastDate: dates.length ? dates[dates.length - 1] : null };
}

export function WaterSection({ communeCode }: Props) {
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
      // 1) Résumé précalculé éventuel dans mitan_data
      try {
        const sRes = await fetchWithTimeout(`${STATS_V2_BASE}/eau/${communeCode}.json`, 8000);
        if (sRes.ok) {
          const s = await sRes.json();
          const result: Result = {
            samples: s.samples || 0,
            conform: s.conform ?? null,
            lastDate: s.lastDate ?? null,
          };
          cache.set(communeCode, result);
          if (!cancelled) {
            setData(result);
            setState('ready');
          }
          return;
        }
      } catch {
        /* pas de fichier précalculé : appel en direct ci-dessous */
      }

      // 2) Appel Hub'Eau en direct — filtré par commune, échantillon récent borné
      try {
        const url =
          `${HUBEAU}?code_commune=${encodeURIComponent(communeCode)}` +
          '&size=50&sort=desc' +
          '&fields=date_prelevement,conclusion_conformite_prelevement,code_installation_amont,nom_uge';
        const res = await fetchWithTimeout(url);
        if (!res.ok) throw new Error(`hubeau ${res.status}`);
        const j = await res.json();
        const result = summarize(j.data || []);
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
      </div>
    );
  }

  const hubeauLink = `https://hubeau.eaufrance.fr/page/api-qualite-eau-potable`;

  if (state === 'error' || !data || data.samples === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-gray-600">
          Pas de contrôle sanitaire récent trouvé pour cette commune.
        </p>
        <p className="text-[11px] text-gray-500">
          L&apos;impact des coupes rases sur la ressource en eau est l&apos;un des chantiers à venir
          du projet.{' '}
          <a href="/soutenir" className="text-secondary hover:underline">
            Aider à le financer
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-sky-50 border border-sky-100 rounded-lg p-3">
        <div className="text-sm text-gray-600">Eau potable — contrôle sanitaire</div>
        {data.conform !== null ? (
          <>
            <div className="text-2xl font-bold text-sky-700">{data.conform} %</div>
            <div className="text-[11px] text-gray-500">
              des {fmtInt(data.samples)} derniers prélèvements conformes
              {data.lastDate ? ` · dernier le ${data.lastDate}` : ''}
            </div>
          </>
        ) : (
          <div className="text-[11px] text-gray-500">
            {fmtInt(data.samples)} prélèvements récents recensés
            {data.lastDate ? ` · dernier le ${data.lastDate}` : ''}
          </div>
        )}
      </div>

      <p className="text-[11px] text-gray-500 leading-relaxed">
        Source : contrôle sanitaire de l&apos;eau distribuée (Hub&apos;Eau / ministère de la Santé).
        Résumé indicatif à l&apos;échelle de la commune.{' '}
        <a href={hubeauLink} target="_blank" rel="noopener noreferrer" className="underline hover:text-secondary">
          En savoir plus
        </a>
      </p>

      <p className="text-[10px] text-gray-400 leading-relaxed">
        Le lien entre coupes rases et qualité de l&apos;eau (captages, turbidité, étiage) est un axe
        de développement du projet.{' '}
        <a href="/soutenir" className="text-secondary hover:underline">
          Soutenir ce chantier
        </a>
      </p>
    </div>
  );
}
