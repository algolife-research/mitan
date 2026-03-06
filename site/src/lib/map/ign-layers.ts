import type { ProtectedAreaConfig } from '@/types';

// IGN Layers configuration

export const IGN_WMTS_BASE = 'https://data.geopf.fr/wmts';

export const IGN_LAYERS = {
  // Base layers
  ortho: {
    id: 'ign-ortho',
    name: 'Orthophotos',
    url: `${IGN_WMTS_BASE}?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg`,
    attribution: '© IGN-F / Geoportail',
  },
  plan: {
    id: 'ign-plan',
    name: 'Plan IGN',
    url: `${IGN_WMTS_BASE}?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png`,
    attribution: '© IGN-F / Geoportail',
  },
  // Overlay layers
  bdforet: {
    id: 'ign-bdforet',
    name: 'BDForêt V2',
    type: 'wms' as const,
    url: 'https://data.geopf.fr/wms-v/ows',
    wmsParams: {
      layers: 'LANDCOVER.FORESTINVENTORY.V2',
      format: 'image/png',
      transparent: true,
      version: '1.3.0',
    },
    attribution: '© IGN BDForêt V2',
  },
  hydro: {
    id: 'ign-hydro',
    name: 'Hydrographie',
    url: `${IGN_WMTS_BASE}?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=HYDROGRAPHY.HYDROGRAPHY&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png`,
    attribution: '© IGN Hydrographie',
  },
  cadastre: {
    id: 'ign-cadastre',
    name: 'Cadastre',
    url: `${IGN_WMTS_BASE}?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png`,
    attribution: '© IGN Cadastre',
  },
} as const;

// WFS Géoplateforme protected areas configuration
export const PROTECTED_AREAS_CONFIG: readonly ProtectedAreaConfig[] = [
  {
    id: 'natura-habitat',
    name: 'Natura 2000 - Habitat',
    layer: 'PROTECTEDAREAS.SIC',
    apicartoEndpoint: 'natura-habitat',
    color: '#AAFF00',
    category: 'Zones protégées',
  },
  {
    id: 'natura-oiseaux',
    name: 'Natura 2000 - Oiseaux',
    layer: 'PROTECTEDAREAS.ZPS',
    apicartoEndpoint: 'natura-oiseaux',
    color: '#7DF9FF',
    category: 'Zones protégées',
  },
  {
    id: 'znieff1',
    name: 'ZNIEFF Type 1',
    layer: 'PROTECTEDAREAS.ZNIEFF1',
    apicartoEndpoint: 'znieff1',
    color: '#E4D00A',
    category: 'Zones protégées',
  },
  {
    id: 'znieff2',
    name: 'ZNIEFF Type 2',
    layer: 'PROTECTEDAREAS.ZNIEFF2',
    apicartoEndpoint: 'znieff2',
    color: '#DFFF00',
    category: 'Zones protégées',
  },
  {
    id: 'rn',
    name: 'Réserves Naturelles',
    layer: 'PROTECTEDAREAS.RN',
    apicartoEndpoint: 'rnn',
    color: '#57e140',
    category: 'Zones protégées',
  },
  {
    id: 'pn',
    name: 'Parcs Nationaux',
    layer: 'PROTECTEDAREAS.PN',
    apicartoEndpoint: 'pn',
    color: '#8A00C4',
    category: 'Zones protégées',
    skipOverlap: true,
  },
  {
    id: 'pnr',
    name: 'Parcs Naturels Régionaux',
    layer: 'PROTECTEDAREAS.PNR',
    apicartoEndpoint: 'pnr',
    color: '#A0D568',
    category: 'Zones protégées',
    skipOverlap: true,
  },
  {
    id: 'rb',
    name: 'Réserves Biologiques',
    layer: 'PROTECTEDAREAS.RB',
    apicartoEndpoint: null, // Not available in APICARTO
    color: '#D2691E',
    category: 'Zones protégées',
  },
  {
    id: 'forets-anciennes',
    name: 'Forêts Anciennes',
    layer: 'IGNF_FORETS-ANCIENNES',
    apicartoEndpoint: null, // Not available in APICARTO
    color: '#228B22',
    category: 'Zones protégées',
    wmsBaseUrl: 'https://data.geopf.fr/wms-r/wms',
  },
];

// Altitude API (Géoplateforme requires resource parameter)
export async function getAltitude(lat: number, lng: number): Promise<number | null> {
  try {
    const response = await fetch(
      `https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json?lon=${lng}&lat=${lat}&resource=ign_rge_alti_wld`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.elevations?.[0]?.z ?? null;
  } catch (error) {
    console.error('Error fetching altitude:', error);
    return null;
  }
}

// BDForêt WFS point query — returns forest type info at a given coordinate
export async function getBdforetAtPoint(lat: number, lng: number): Promise<{ tfv: string; tfvG11: string; essence: string } | null> {
  try {
    const response = await fetch(
      `https://data.geopf.fr/wfs/ows?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature` +
      `&typeNames=LANDCOVER.FORESTINVENTORY.V2:formation_vegetale` +
      `&outputFormat=application/json&count=1` +
      `&propertyName=tfv,tfv_g11,essence` +
      `&CQL_FILTER=Intersects(geom,POINT(${lng} ${lat}))`
    );
    if (!response.ok) return null;
    const data = await response.json();
    const feature = data.features?.[0];
    if (!feature) return null;
    const p = feature.properties;
    return { tfv: p.tfv || '', tfvG11: p.tfv_g11 || '', essence: p.essence || '' };
  } catch (error) {
    console.error('Error fetching BDForêt:', error);
    return null;
  }
}

// Cadastre WFS point query — returns parcel reference at a given coordinate
export async function getCadastreParcel(lat: number, lng: number): Promise<{ commune: string; section: string; numero: string } | null> {
  try {
    const delta = 0.00005;
    const response = await fetch(
      `https://data.geopf.fr/wfs/ows?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature` +
      `&typeNames=CADASTRALPARCELS.PARCELLAIRE_EXPRESS:parcelle` +
      `&outputFormat=application/json&count=1` +
      `&CQL_FILTER=BBOX(geom,${lng - delta},${lat - delta},${lng + delta},${lat + delta},'EPSG:4326')`
    );
    if (!response.ok) return null;
    const data = await response.json();
    const f = data.features?.[0];
    if (!f) return null;
    const p = f.properties;
    return { commune: p.commune || '', section: p.section || '', numero: p.numero || '' };
  } catch {
    return null;
  }
}
