import proj4 from 'proj4';
import type { GeoRaster } from '@/types';
import { LAMBERT93, WGS84, NODATA_VALUE } from '@/lib/constants';

/** Get pixel dimensions and area for a georaster */
export function getPixelDimensions(georaster: GeoRaster) {
  const pixelW = (georaster.xmax - georaster.xmin) / georaster.width;
  const pixelH = (georaster.ymax - georaster.ymin) / georaster.height;
  const pixelAreaM2 = pixelW * pixelH;
  const pixelAreaHa = pixelAreaM2 / 10000;
  return { pixelW, pixelH, pixelAreaM2, pixelAreaHa };
}

/** Check if a pixel value is valid (not nodata — covers both 0 and UInt32 max sentinels) */
export function isValidPixel(value: number | null | undefined): value is number {
  return value != null && value !== 0 && value !== NODATA_VALUE && !isNaN(value);
}

/** BFS to find connected perturbation pixels around a click point */
export function bfsConnectedPixels(
  georaster: GeoRaster,
  startCol: number,
  startRow: number,
  maxDayDiff: number = 365,
): number {
  const { width, height } = georaster;
  const startVal = georaster.values[0][startRow][startCol];
  if (!isValidPixel(startVal)) return 0;

  const visited = new Set<string>();
  let count = 0;
  const queue: [number, number][] = [[startCol, startRow]];
  visited.add(`${startCol},${startRow}`);

  while (queue.length > 0) {
    const [px, py] = queue.shift()!;
    count++;

    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = px + dx;
      const ny = py + dy;
      const key = `${nx},${ny}`;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height || visited.has(key)) continue;
      const nVal = georaster.values[0][ny][nx];
      if (!isValidPixel(nVal)) continue;
      const daysA = Math.floor(startVal / 1000) * 365 + (startVal % 1000);
      const daysB = Math.floor(nVal / 1000) * 365 + (nVal % 1000);
      if (Math.abs(daysA - daysB) > maxDayDiff) continue;
      visited.add(key);
      queue.push([nx, ny]);
    }
  }

  return count;
}

/** Decode a pixel value into year and date */
export function decodePixelValue(value: number): { year: number; dayOfYear: number; dateStr: string } {
  const year = 2000 + Math.floor(value / 1000);
  const dayOfYear = value % 1000;
  const date = new Date(year, 0);
  date.setDate(dayOfYear);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return { year, dayOfYear, dateStr: `${day}/${month}/${year}` };
}

/** Convert pixel coordinates to WGS84 */
export function pixelToWgs84(georaster: GeoRaster, col: number, row: number): [number, number] {
  const { pixelW, pixelH } = getPixelDimensions(georaster);
  const px = georaster.xmin + (col + 0.5) * pixelW;
  const py = georaster.ymax - (row + 0.5) * pixelH;
  return proj4(LAMBERT93, WGS84, [px, py]) as [number, number];
}
