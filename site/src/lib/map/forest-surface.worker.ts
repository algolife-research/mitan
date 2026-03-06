/// <reference lib="webworker" />

import turfIntersect from '@turf/intersect';
import turfArea from '@turf/area';

type PolyFeature = GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;

export interface WorkerInput {
  communeGeom: GeoJSON.Geometry;
  features: GeoJSON.Feature[];
}

export interface WorkerOutput {
  totalHa: number;
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { communeGeom, features } = e.data;

  if (features.length === 0) {
    self.postMessage({ totalHa: 0 } satisfies WorkerOutput);
    return;
  }

  const communeFeature = { type: 'Feature', properties: {}, geometry: communeGeom } as PolyFeature;
  let totalM2 = 0;

  for (const f of features) {
    try {
      const forestFeature = { type: 'Feature', properties: {}, geometry: f.geometry } as PolyFeature;
      const intersection = turfIntersect(
        { type: 'FeatureCollection', features: [communeFeature, forestFeature] }
      );
      if (intersection) {
        totalM2 += turfArea(intersection);
      }
    } catch {
      // Skip invalid geometries
    }
  }

  self.postMessage({ totalHa: totalM2 / 10000 } satisfies WorkerOutput);
};
