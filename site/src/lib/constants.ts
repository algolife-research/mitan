// Shared constants for Mitan V2

import type { CommuneStatsV2 } from '@/types';
import { isValidCommuneCode } from '@/lib/utils';

/** Base URL for pre-computed stats_v2 JSON files */
const STATS_V2_BASE = 'https://raw.githubusercontent.com/algolife-research/mitan_data/main/stats_v2';

/** Fetch pre-computed commune stats from GitHub stats_v2 */
export async function fetchCommuneStats(communeCode: string): Promise<CommuneStatsV2> {
  if (!isValidCommuneCode(communeCode)) throw new Error('Invalid commune code');
  const response = await fetch(`${STATS_V2_BASE}/${communeCode}_stats.json`);
  if (!response.ok) throw new Error(`Stats not found for ${communeCode}`);
  return response.json();
}

/** Mapping from stats_v2 zone keys to PROTECTED_AREAS_CONFIG IDs */
export const ZONE_TO_AREA_ID: Record<string, string> = {
  znieff1: 'znieff1',
  znieff2: 'znieff2',
  natura_sic: 'natura-habitat',
  natura_zps: 'natura-oiseaux',
  reserves_naturelles: 'rn',
};

/** Lambert-93 projection string (EPSG:2154) */
export const LAMBERT93 = '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +units=m +no_defs';

/** WGS84 projection string (EPSG:4326) */
export const WGS84 = '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs';

/** GeoRaster nodata sentinel (UInt32 max) */
export const NODATA_VALUE = 4294967295;

/** Perturbation display color (#D70040) */
export const PERTURBATION_COLOR = { r: 215, g: 0, b: 64 };
