'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { IGN_LAYERS, IGN_WMTS_BASE, PROTECTED_AREAS_CONFIG } from '@/lib/map/ign-layers';
import { loadGeoRaster, renderToCanvas } from '@/lib/map/georaster-renderer';
import { addProtectedAreaWMS, removeProtectedAreaWMS, setProtectedAreaOpacity } from '@/lib/map/protected-areas';
import { calculateBounds, isValidCommuneCode, fmtNum, fmtInt } from '@/lib/utils';
import { fetchCommuneStats, ZONE_TO_AREA_ID } from '@/lib/constants';
import { useMapClick } from '@/hooks/useMapClick';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MapSidebar } from './MapSidebar';
import { FloatingLayerControl } from './FloatingLayerControl';
import { ShareButton } from './ShareButton';
import type { GeoRaster, CommuneStatsV2 } from '@/types';

export function CommuneMap() {
  const searchParams = useSearchParams();
  const communeCode = searchParams.get('commune') || '19136';
  const isMobile = useIsMobile();
  const isMobileRef = useRef(isMobile);
  isMobileRef.current = isMobile;

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const georasterRef = useRef<GeoRaster | null>(null);
  const communeGeojsonRef = useRef<GeoJSON.Geometry | null>(null);
  const rafRef = useRef<number | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [baseLayer, setBaseLayer] = useState<'ortho' | 'plan'>('ortho');
  const [overlays, setOverlays] = useState<Record<string, boolean>>({ hydro: true, cadastre: false, bdforet: false, perturbations: true, labels: true });
  const [protectedAreas, setProtectedAreas] = useState<Record<string, boolean>>({});
  const [sidebarVisible, setSidebarVisible] = useState(!isMobile);
  const [mobileSheet, setMobileSheet] = useState<'closed' | 'peek' | 'full'>('peek');
  const [communeName, setCommuneName] = useState('');
  const [yearRange, setYearRange] = useState<[number, number] | null>(null);
  const [communeStats, setCommuneStats] = useState<CommuneStatsV2 | null>(null);

  // Custom hooks
  useMapClick(map, georasterRef, mapReady);

  // Derived values from pre-computed stats
  const yearStats = useMemo(() => {
    if (!communeStats) return null;
    const result: Record<number, number> = {};
    for (const [year, pixels] of Object.entries(communeStats.perturbations.par_annee)) {
      result[Number(year)] = pixels;
    }
    return result;
  }, [communeStats]);

  const pixelAreaHa = communeStats?.perturbations.pixel_area_ha ?? 0;
  const totalArea = communeStats?.perturbations.total_ha ?? 0;
  const communeSurface = communeStats?.surface_ha ?? 0;
  const forestSurface = communeStats?.foret.surface_ha ?? null;
  const forestScore = communeStats?.foret.score ?? null;
  const scoreBoisement = communeStats?.foret.score_boisement ?? null;
  const scoreCoupes = communeStats?.foret.score_coupes ?? null;
  const tauxBoisement = communeStats?.foret.taux_boisement ?? null;
  const observationYears = communeStats?.perturbations.observation_years ?? 0;

  const minYear = communeStats?.perturbations.annee_min ?? 0;
  const maxYear = communeStats?.perturbations.annee_max ?? 0;

  // Map stats_v2 protected area overlaps to the format expected by MapSidebar
  const overlapStats = useMemo(() => {
    if (!communeStats) return {};
    const result: Record<string, { overlap: number; protectedAreaHa: number } | -1> = {};
    for (const [zoneKey, data] of Object.entries(communeStats.overlaps_zones_protegees)) {
      const areaId = ZONE_TO_AREA_ID[zoneKey];
      if (!areaId) continue;
      if (!data.zone_in_commune) {
        result[areaId] = { overlap: 0, protectedAreaHa: 0 };
      } else {
        result[areaId] = { overlap: data.overlap_ha, protectedAreaHa: data.zone_ha };
      }
    }
    // Mark areas without pre-computed data as unavailable
    for (const config of PROTECTED_AREAS_CONFIG) {
      if (!(config.id in result)) {
        result[config.id] = -1;
      }
    }
    return result;
  }, [communeStats]);

  // Map BDForet par_couvert data (summary view)
  const bdforetCouvertStats = useMemo(() => {
    if (!communeStats) return null;
    const parCouvert = communeStats.overlap_bdforet.par_couvert;
    if (!parCouvert || Object.keys(parCouvert).length === 0) return null;
    const result: Record<string, { ha: number; perturb_ha: number }> = {};
    for (const [type, data] of Object.entries(parCouvert)) {
      if (data.ha > 0) result[type] = data;
    }
    return Object.keys(result).length > 0 ? result : null;
  }, [communeStats]);

  // Map BDForet overlap data
  const bdforetStats = useMemo(() => {
    if (!communeStats) return null;
    const parType = communeStats.overlap_bdforet.par_type;
    if (!parType || Object.keys(parType).length === 0) return null;
    const result: Record<string, { ha: number; perturb_ha: number }> = {};
    for (const [type, data] of Object.entries(parType)) {
      if (data.perturb_ha > 0) {
        result[type] = { ha: data.ha, perturb_ha: data.perturb_ha };
      }
    }
    return Object.keys(result).length > 0 ? result : null;
  }, [communeStats]);

  // rAF-throttled perturbation image update
  const updatePerturbationImage = useCallback((georaster: GeoRaster, range: [number, number] | null) => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (!map.current || !georaster) return;
      const { dataUrl, coordinates } = renderToCanvas(georaster, range);
      const source = map.current.getSource('perturbations') as maplibregl.ImageSource;
      if (source) {
        source.updateImage({ url: dataUrl, coordinates });
      }
    });
  }, []);

  useEffect(() => {
    if (georasterRef.current && mapReady) {
      updatePerturbationImage(georasterRef.current, yearRange);
    }
  }, [yearRange, mapReady]);

  // Cleanup rAF on unmount
  useEffect(() => {
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, []);

  // ==================== MAP INITIALIZATION ====================
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'ign-ortho': { type: 'raster', tiles: [IGN_LAYERS.ortho.url], tileSize: 256, attribution: IGN_LAYERS.ortho.attribution },
          'ign-plan': { type: 'raster', tiles: [IGN_LAYERS.plan.url], tileSize: 256, attribution: IGN_LAYERS.plan.attribution },
          'ign-hydro': { type: 'raster', tiles: [IGN_LAYERS.hydro.url], tileSize: 256 },
          'ign-cadastre': { type: 'raster', tiles: [IGN_LAYERS.cadastre.url], tileSize: 256 },
          'ign-bdforet': {
            type: 'raster',
            tiles: [
              `${IGN_LAYERS.bdforet.url}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap` +
              `&LAYERS=${IGN_LAYERS.bdforet.wmsParams.layers}&FORMAT=image/png&TRANSPARENT=true` +
              `&WIDTH=256&HEIGHT=256&CRS=EPSG:3857&BBOX={bbox-epsg-3857}`,
            ],
            tileSize: 256,
          },
          'ign-labels': {
            type: 'raster',
            tiles: [
              `${IGN_WMTS_BASE}?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALNAMES.NAMES&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png`,
            ],
            tileSize: 256,
            minzoom: 6,
            maxzoom: 18,
          },
        },
        layers: [
          { id: 'ign-ortho-layer', type: 'raster', source: 'ign-ortho', layout: { visibility: 'visible' } },
          { id: 'ign-plan-layer', type: 'raster', source: 'ign-plan', layout: { visibility: 'none' } },
          { id: 'ign-hydro-layer', type: 'raster', source: 'ign-hydro', layout: { visibility: 'visible' }, paint: { 'raster-opacity': 0.7 } },
          { id: 'ign-cadastre-layer', type: 'raster', source: 'ign-cadastre', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.7 } },
          { id: 'ign-bdforet-layer', type: 'raster', source: 'ign-bdforet', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.7 } },
          { id: 'ign-labels-layer', type: 'raster', source: 'ign-labels', layout: { visibility: 'visible' }, paint: { 'raster-opacity': 1 } },
        ],
      },
      center: [2.3522, 46.2276],
      zoom: 5,
      maxZoom: 18,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.current.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    map.current.addControl(new maplibregl.FullscreenControl(), 'top-right');

    map.current.on('load', () => setMapReady(true));

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // ==================== LOAD COMMUNE + PERTURBATIONS ====================
  useEffect(() => {
    if (!map.current || !communeCode || !mapReady) return;

    const waitForIdle = (): Promise<void> =>
      new Promise((resolve) => map.current!.once('idle', () => resolve()));

    const loadCommune = async () => {
      setLoading(true);
      try {
        // Fetch commune geometry and pre-computed stats in parallel
        const [geoResponse, stats] = await Promise.all([
          fetch(`https://geo.api.gouv.fr/communes?code=${communeCode}&geometry=contour&format=geojson&fields=nom,surface`),
          fetchCommuneStats(communeCode).catch(() => null),
        ]);

        const data = await geoResponse.json();
        if (!data?.features?.length) return;

        const commune = data.features[0];
        setCommuneName(stats?.nom || commune.properties?.nom || '');
        communeGeojsonRef.current = commune.geometry;
        setCommuneStats(stats);
        setYearRange(null);

        // Commune boundary
        const sourceId = 'commune-boundary';
        const geojsonData = { type: 'Feature' as const, geometry: commune.geometry, properties: {} };

        if (map.current!.getSource(sourceId)) {
          (map.current!.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojsonData as any);
        } else {
          map.current!.addSource(sourceId, { type: 'geojson', data: geojsonData as any });
          map.current!.addLayer({
            id: 'commune-boundary-glow', type: 'line', source: sourceId,
            paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.3, 'line-blur': 4 },
          });
          map.current!.addLayer({
            id: 'commune-boundary-line', type: 'line', source: sourceId,
            paint: { 'line-color': '#ffffff', 'line-width': 2.5, 'line-opacity': 0.9 },
          });
        }

        // Fit bounds and wait for all tiles to load
        const bounds = calculateBounds(commune.geometry);
        map.current!.fitBounds(bounds as maplibregl.LngLatBoundsLike, { padding: 50, maxZoom: 14, duration: 1000 });

        await waitForIdle();
        setLoading(false);

        // Load perturbation raster (still needed for map display + click interactions)
        if (overlays.perturbations) {
          await loadPerturbations(communeCode);
        }
      } catch (error) {
        console.error('Error loading commune:', error);
        setLoading(false);
      }
    };

    const loadPerturbations = async (code: string) => {
      if (!isValidCommuneCode(code)) return;
      try {
        if (map.current!.getLayer('perturbations-layer')) map.current!.removeLayer('perturbations-layer');
        if (map.current!.getSource('perturbations')) map.current!.removeSource('perturbations');

        const crUrl = `https://raw.githubusercontent.com/algolife-research/mitan_data/refs/heads/main/CR/${code}_cr.tif`;
        const georaster = await loadGeoRaster(crUrl);
        georasterRef.current = georaster;

        const { dataUrl, coordinates } = renderToCanvas(georaster, null);
        map.current!.addSource('perturbations', { type: 'image', url: dataUrl, coordinates });

        const beforeLayer = map.current!.getLayer('commune-boundary-glow') ? 'commune-boundary-glow' : undefined;
        map.current!.addLayer({
          id: 'perturbations-layer', type: 'raster', source: 'perturbations',
          paint: { 'raster-opacity': 1 },
        }, beforeLayer);
      } catch (error) {
        console.error('Error loading perturbations:', error);
        georasterRef.current = null;
      }
    };

    loadCommune();
  }, [communeCode, mapReady]);

  // ==================== LAYER VISIBILITY ====================

  useEffect(() => {
    if (!map.current || !mapReady) return;
    map.current.setLayoutProperty('ign-ortho-layer', 'visibility', baseLayer === 'ortho' ? 'visible' : 'none');
    map.current.setLayoutProperty('ign-plan-layer', 'visibility', baseLayer === 'plan' ? 'visible' : 'none');
  }, [baseLayer, mapReady]);

  useEffect(() => {
    if (!map.current || !mapReady) return;
    map.current.setLayoutProperty('ign-hydro-layer', 'visibility', overlays.hydro ? 'visible' : 'none');
    map.current.setLayoutProperty('ign-cadastre-layer', 'visibility', overlays.cadastre ? 'visible' : 'none');
    map.current.setLayoutProperty('ign-bdforet-layer', 'visibility', overlays.bdforet ? 'visible' : 'none');
    map.current.setLayoutProperty('ign-labels-layer', 'visibility', overlays.labels ? 'visible' : 'none');
    if (map.current.getLayer('perturbations-layer')) {
      map.current.setLayoutProperty('perturbations-layer', 'visibility', overlays.perturbations ? 'visible' : 'none');
    }
  }, [overlays, mapReady]);

  useEffect(() => {
    if (!map.current || !mapReady) return;
    Object.entries(protectedAreas).forEach(([areaId, isVisible]) => {
      const config = PROTECTED_AREAS_CONFIG.find(a => a.id === areaId);
      if (!config) return;
      if (isVisible) {
        addProtectedAreaWMS(map.current!, areaId, config.layer, 0.5, config.wmsBaseUrl);
      } else {
        removeProtectedAreaWMS(map.current!, areaId);
      }
    });
  }, [protectedAreas, mapReady]);

  // ==================== RENDER ====================

  const sidebarContent = (
    <MapSidebar
      communeName={communeName}
      communeCode={communeCode}
      yearRange={yearRange}
      onYearRangeChange={setYearRange}
      minYear={minYear}
      maxYear={maxYear}
      yearStats={yearStats}
      totalArea={totalArea}
      communeSurface={communeSurface}
      forestSurface={forestSurface}
      forestScore={forestScore}
      scoreBoisement={scoreBoisement}
      scoreCoupes={scoreCoupes}
      tauxBoisement={tauxBoisement}
      pixelAreaHa={pixelAreaHa}
      observationYears={observationYears}
      overlapStats={overlapStats}
      bdforetStats={bdforetStats}
      bdforetCouvertStats={bdforetCouvertStats}
      population={communeStats?.population ?? null}
      foretsAnciennes={communeStats?.forets_anciennes ?? null}
      onProtectedAreaToggle={(areaId, visible) => setProtectedAreas(prev => ({ ...prev, [areaId]: visible }))}
    />
  );

  const shareButton = (
    <ShareButton
      communeName={communeName}
      communeCode={communeCode}
    />
  );

  const loadingOverlay = loading && (
    <div className="absolute inset-0 z-20 bg-white/60 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-gray-300 border-t-red-500 rounded-full animate-spin" />
        <span className="text-sm text-gray-600 font-medium">Chargement...</span>
      </div>
    </div>
  );

  return (
    <div className={`relative w-full h-full ${isMobile ? '' : 'flex'}`}>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className={`${sidebarVisible ? 'w-80' : 'w-0'} transition-all duration-300 bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0`}>
          {sidebarVisible && sidebarContent}
        </div>
      )}

      {/* Desktop: Toggle Sidebar Button */}
      {!isMobile && (
        <div
          className="absolute top-2 z-10 transition-all duration-300"
          style={{ left: sidebarVisible ? '21rem' : '0.5rem' }}
        >
          <button
            onClick={() => setSidebarVisible(!sidebarVisible)}
            className="bg-white px-3 py-2 rounded shadow-md hover:bg-gray-100 transition-colors text-sm font-medium"
          >
            {sidebarVisible ? '\u25C0' : '\u25B6'}
          </button>
        </div>
      )}

      {/* Map Container */}
      <div ref={mapContainer} className="flex-1 w-full h-full relative">
        {loadingOverlay}

        {/* Floating controls (top-left of map, offset to avoid sidebar toggle) */}
        <div className="absolute top-2 left-12 z-10 flex items-center gap-2">
          <FloatingLayerControl
            baseLayer={baseLayer}
            onBaseLayerChange={setBaseLayer}
            overlays={overlays}
            onOverlayChange={setOverlays}
            protectedAreas={protectedAreas}
            onProtectedAreaToggle={(areaId, visible) => setProtectedAreas(prev => ({ ...prev, [areaId]: visible }))}
            onProtectedAreaOpacityChange={(opacity) => {
              if (map.current) setProtectedAreaOpacity(map.current, protectedAreas, opacity);
            }}
          />
          {shareButton}
        </div>

        {/* Map hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <span className="bg-black/50 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
            {isMobile ? 'Appui long pour explorer un point' : 'Clic droit pour explorer un point'}
          </span>
        </div>
      </div>

      {/* Mobile: Bottom sheet with peek/full states */}
      {isMobile && (
        <>
          {mobileSheet === 'full' && (
            <div
              className="fixed inset-0 z-30 bg-black/30"
              onClick={() => setMobileSheet('peek')}
            />
          )}

          <div className="fixed left-0 right-0 bottom-0 z-40">
            {/* Drag handle */}
            <button
              onClick={() => setMobileSheet(prev => prev === 'closed' ? 'peek' : prev === 'peek' ? 'full' : 'closed')}
              className="w-full flex flex-col items-center py-2 bg-white rounded-t-2xl shadow-[0_-2px_10px_rgba(0,0,0,0.1)]"
            >
              <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
              {mobileSheet === 'closed' && (
                <span className="text-xs text-gray-500 mt-1">{communeName || 'Menu'}</span>
              )}
            </button>

            {/* Peek: commune name + score card + hint */}
            {mobileSheet === 'peek' && (
              <div className="bg-white px-4 pb-3">
                {communeName && (
                  <div className="border-b pb-2 mb-3">
                    <h2 className="text-lg font-bold text-gray-900">{communeName}</h2>
                  </div>
                )}
                {communeSurface > 0 && forestScore && (
                  <div className="flex items-center gap-3 bg-white border-2 border-gray-300 rounded-lg p-3">
                    <img
                      src={`/Foret-Score-${forestScore}.svg`}
                      alt={`Foret-Score ${forestScore}`}
                      className="w-16 h-16"
                    />
                    <div className="flex-1 text-xs space-y-0.5">
                      <div className="text-gray-600">
                        <strong>Surface :</strong> {fmtInt(communeSurface)} ha
                      </div>
                      {forestSurface !== null && (
                        <div className="text-gray-600">
                          <strong>Foret :</strong> {fmtInt(forestSurface)} ha ({fmtNum((forestSurface / communeSurface) * 100, 0)} %)
                        </div>
                      )}
                      <div className="text-gray-600">
                        <strong>Perturbations :</strong> {fmtNum(totalArea)} ha
                      </div>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setMobileSheet('full')}
                  className="w-full mt-3 py-2 text-xs text-gray-500 flex items-center justify-center gap-1"
                >
                  <span>Voir les details</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}

            {/* Full: scrollable analysis content */}
            {mobileSheet === 'full' && (
              <div className="bg-white overflow-y-auto max-h-[60vh]">
                {sidebarContent}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
