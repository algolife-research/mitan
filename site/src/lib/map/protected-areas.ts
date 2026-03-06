import type maplibregl from 'maplibre-gl';

/** Add a protected area as a WMS raster source+layer to the map */
export function addProtectedAreaWMS(
  map: maplibregl.Map,
  areaId: string,
  wmsLayer: string,
  opacity: number = 0.5,
  wmsBaseUrl?: string,
) {
  const sourceId = `protected-${areaId}`;
  const layerId = `protected-${areaId}-layer`;

  if (map.getSource(sourceId)) return;

  const base = wmsBaseUrl || 'https://data.geopf.fr/wms-v/ows';

  map.addSource(sourceId, {
    type: 'raster',
    tiles: [
      `${base}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap` +
      `&LAYERS=${wmsLayer}&STYLES=&FORMAT=image/png&TRANSPARENT=true` +
      `&WIDTH=256&HEIGHT=256&CRS=EPSG:3857&BBOX={bbox-epsg-3857}`,
    ],
    tileSize: 256,
    attribution: '© IGN',
  });

  map.addLayer({
    id: layerId,
    type: 'raster',
    source: sourceId,
    paint: { 'raster-opacity': opacity },
  });
}

/** Remove a protected area layer from the map */
export function removeProtectedAreaWMS(map: maplibregl.Map, areaId: string) {
  const layerId = `protected-${areaId}-layer`;
  const sourceId = `protected-${areaId}`;

  if (map.getLayer(layerId)) map.removeLayer(layerId);
  if (map.getSource(sourceId)) map.removeSource(sourceId);
}

/** Set opacity for all visible protected area layers */
export function setProtectedAreaOpacity(
  map: maplibregl.Map,
  protectedAreas: Record<string, boolean>,
  opacity: number,
) {
  Object.entries(protectedAreas).forEach(([areaId, isVisible]) => {
    if (!isVisible) return;
    const layerId = `protected-${areaId}-layer`;
    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, 'raster-opacity', opacity);
    }
  });
}
