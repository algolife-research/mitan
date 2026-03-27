// @ts-ignore
import parseGeoraster from 'georaster';
import proj4 from 'proj4';
import type { GeoRaster } from '@/types';
import { LAMBERT93, WGS84, PERTURBATION_COLOR, SURVEY_START_YEAR, SURVEY_END_YEAR } from '@/lib/constants';
import { isValidPixel } from './perturbation-analysis';

export interface CanvasResult {
  dataUrl: string;
  coordinates: [[number, number], [number, number], [number, number], [number, number]];
}

/** Load and parse a GeoRaster TIFF from URL */
export async function loadGeoRaster(url: string): Promise<GeoRaster> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load GeoRaster: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  return parseGeoraster(arrayBuffer);
}

/** Project georaster bounding box corners from Lambert-93 to WGS84 */
function getWgs84Corners(georaster: GeoRaster): [[number, number], [number, number], [number, number], [number, number]] {
  const { xmin, xmax, ymin, ymax } = georaster;

  const topLeft = proj4(LAMBERT93, WGS84, [xmin, ymax]) as [number, number];
  const topRight = proj4(LAMBERT93, WGS84, [xmax, ymax]) as [number, number];
  const bottomRight = proj4(LAMBERT93, WGS84, [xmax, ymin]) as [number, number];
  const bottomLeft = proj4(LAMBERT93, WGS84, [xmin, ymin]) as [number, number];

  return [topLeft, topRight, bottomRight, bottomLeft];
}

/** Render georaster pixels to a canvas, optionally filtered by year range */
export function renderToCanvas(
  georaster: GeoRaster,
  yearRange: [number, number] | null,
): CanvasResult {
  const { width, height } = georaster;
  const coordinates = getWgs84Corners(georaster);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(width, height);

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const val = georaster.values[0][row][col];
      const idx = (row * width + col) * 4;

      if (!isValidPixel(val)) {
        imageData.data[idx + 3] = 0;
        continue;
      }

      const pixelYear = 2000 + Math.floor(val / 1000);

      if (yearRange !== null) {
        if (pixelYear < yearRange[0] || pixelYear > yearRange[1]) {
          imageData.data[idx + 3] = 0;
          continue;
        }
      }

      // Color gradient: early (2018) = light orange, recent (2025) = deep red
      const t = Math.max(0, Math.min(1, (pixelYear - SURVEY_START_YEAR) / (SURVEY_END_YEAR - SURVEY_START_YEAR)));
      // Early: #F4A460 (sandy orange) → Recent: #D70040 (deep red)
      imageData.data[idx]     = Math.round(244 + t * (PERTURBATION_COLOR.r - 244)); // 244 → 215
      imageData.data[idx + 1] = Math.round(164 - t * 164);                          // 164 → 0
      imageData.data[idx + 2] = Math.round(96  + t * (PERTURBATION_COLOR.b - 96));  //  96 → 64
      imageData.data[idx + 3] = Math.round(180 + t * 75);                           // 180 → 255
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return { dataUrl: canvas.toDataURL('image/png'), coordinates };
}

/** Convert WGS84 click coordinates to georaster pixel coordinates */
export function lngLatToPixel(
  georaster: GeoRaster,
  lng: number,
  lat: number,
): { col: number; row: number } | null {
  const { xmin, xmax, ymin, ymax, width, height } = georaster;
  const [x, y] = proj4(WGS84, LAMBERT93, [lng, lat]);

  const col = Math.floor((x - xmin) / (xmax - xmin) * width);
  const row = Math.floor((ymax - y) / (ymax - ymin) * height);

  if (col < 0 || col >= width || row < 0 || row >= height) return null;
  return { col, row };
}
