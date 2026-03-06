// Core TypeScript types for Mitan V2

export interface LandCoverClass {
  id: number;
  name: 'water' | 'trees' | 'grass' | 'flooded_vegetation' | 'crops' | 'shrub_and_scrub' | 'built' | 'bare' | 'snow_and_ice';
  label: string;
  color: string;
  description: string;
}

export interface TransitionType {
  id: number;
  name: 'clear_cut' | 'fire' | 'urbanization' | 'reforestation' | 'degradation';
  label: string;
  color: string;
  icon: string;
  severity: 1 | 2 | 3 | 4 | 5;
  description: string;
}

export interface Commune {
  id: number;
  code: string;
  name: string;
  department: string;
  region: string;
  geometry: GeoJSON.MultiPolygon;
  areaHa: number;
  population: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface LandCoverSnapshot {
  id: number;
  communeId: number;
  year: number;
  classId: number;
  areaHa: number;
  percentage: number;
  meanProbability: number;
  createdAt: string;
}

export interface Transition {
  id: number;
  communeId: number;
  transitionTypeId: number;
  geometry: GeoJSON.MultiPolygon;
  fromYear: number;
  toYear: number;
  fromClassId: number | null;
  toClassId: number | null;
  areaHa: number;
  confidence: number;
  detectionDate: string;
  metadata: Record<string, any> | null;
  createdAt: string;
  // Joined data
  transitionType?: TransitionType;
  fromClass?: LandCoverClass;
  toClass?: LandCoverClass;
}

export interface FireDetection {
  id: number;
  transitionId: number | null;
  latitude: number;
  longitude: number;
  acquisitionDate: string;
  confidence: string;
  brightTi4: number;
  brightTi5: number;
  frp: number;
  satellite: string;
  instrument: string;
  createdAt: string;
}

export interface CommuneForestStats {
  communeId: number;
  code: string;
  name: string;
  totalAreaHa: number;
  year: number;
  forestAreaHa: number;
  forestPercentage: number;
  transitionCount: number;
  clearCutHa: number;
  fireHa: number;
  reforestationHa: number;
}

export interface BDForetParcel {
  id: number;
  communeId: number;
  geometry: GeoJSON.MultiPolygon;
  formationType: string;
  speciesComposition: string;
  ageClass: string;
  densityClass: string;
  areaHa: number;
  sourceYear: number;
  metadata: Record<string, any> | null;
}

export interface ProtectedArea {
  id: number;
  areaType: 'natura_habitat' | 'natura_oiseaux' | 'znieff1' | 'znieff2' | 'rnc' | 'rnn' | 'pn' | 'pnr';
  code: string;
  name: string;
  geometry: GeoJSON.MultiPolygon;
  areaHa: number;
  designationYear: number | null;
  metadata: Record<string, any> | null;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: {
    message: string;
    code?: string;
    details?: any;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// Map types
export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
}

export interface LayerVisibility {
  bdforet: boolean;
  hydro: boolean;
  cadastre: boolean;
  perturbations: boolean;
  [key: string]: boolean;
}

export interface ProtectedAreaConfig {
  readonly id: string;
  readonly name: string;
  readonly layer: string;
  readonly apicartoEndpoint: string | null;
  readonly color: string;
  readonly category: string;
  readonly skipOverlap?: boolean;
  /** Override the default WMS base URL (e.g. wms-r instead of wms-v) */
  readonly wmsBaseUrl?: string;
}

/** GeoRaster object returned by the georaster library */
export interface GeoRaster {
  values: number[][][];
  width: number;
  height: number;
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
  pixelWidth: number;
  pixelHeight: number;
  projection: number;
  numberOfRasters: number;
  noDataValue: number | null;
}

export type ForestScore = 'A' | 'B' | 'C' | 'D' | 'E';

/** Pre-computed commune stats from stats_v2 JSON files on GitHub */
export interface CommuneStatsV2 {
  code: string;
  nom: string;
  departement: string;
  region: string;
  epci: string;
  surface_ha: number;
  foret: {
    surface_ha: number;
    taux_boisement: number;
    score: ForestScore;
    score_boisement: ForestScore;
    score_coupes: ForestScore;
  };
  perturbations: {
    total_ha: number;
    total_pixels: number;
    pixel_area_ha: number;
    perturb_ha_annuel: number;
    taux_coupe_annuel: number;
    observation_years: number;
    par_annee: Record<string, number>;
    annee_min: number;
    annee_max: number;
  };
  raster: {
    xmin: number;
    xmax: number;
    ymin: number;
    ymax: number;
    width: number;
    height: number;
    pixel_w: number;
    pixel_h: number;
  };
  overlaps_zones_protegees: Record<string, {
    overlap_pixels: number;
    overlap_ha: number;
    zone_pixels: number;
    zone_ha: number;
    zone_in_commune: boolean;
  }>;
  overlap_foret: {
    perturb_in_forest_pixels: number;
    perturb_in_forest_ha: number;
    perturb_outside_forest_pixels: number;
    perturb_outside_forest_ha: number;
  };
  overlap_bdforet: {
    bdforet_total_ha: number;
    bdforet_par_type: Record<string, {
      pixels: number;
      ha: number;
      perturb_pixels: number;
      perturb_ha: number;
    }>;
    perturb_in_bdforet_pixels: number;
    perturb_in_bdforet_ha: number;
  };
}

export type SearchSuggestion =
  | { type: 'commune'; code: string; nom: string; codesPostaux?: string[] }
  | { type: 'address'; label: string; city: string; citycode: string; coordinates: [number, number] };

// Chart data types
export interface TimeSeriesDataPoint {
  year: number;
  value: number;
  label?: string;
}

export interface TransitionSummary {
  type: string;
  label: string;
  totalHa: number;
  count: number;
  color: string;
  icon: string;
}
