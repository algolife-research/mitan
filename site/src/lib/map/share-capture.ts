import maplibregl from 'maplibre-gl';

export interface ShareData {
  communeName: string;
  communeSurface: number;
  forestSurface: number | null;
  forestScore: 'A' | 'B' | 'C' | 'D' | 'E';
  totalArea: number;
  observationYears: number;
}

const SCORE_DESCRIPTIONS: Record<string, string> = {
  A: 'Forêt bien gérée et résiliente',
  B: "Bonne gestion, axes d'amélioration",
  C: 'Vigilance nécessaire',
  D: 'Pression excessive sur la forêt',
  E: 'Forêt surexploitée',
};

function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('fr-FR');
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Capture the MapLibre canvas, crop to square, overlay the Forêt-Score card
 * (matching the sidebar layout), and return a PNG Blob.
 */
export async function captureMapImage(
  map: maplibregl.Map,
  data: ShareData,
): Promise<Blob> {
  // Pre-load the SVG badge before capturing (so it's ready when we draw)
  const badgeImg = await loadImage(`/Foret-Score-${data.forestScore}.svg`);

  // Force a synchronous render so the canvas is up-to-date
  map.triggerRepaint();
  await new Promise(r => requestAnimationFrame(r));

  const mapCanvas = map.getCanvas();
  const size = Math.min(mapCanvas.width, mapCanvas.height);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Draw map centered/cropped to square
  const sx = (mapCanvas.width - size) / 2;
  const sy = (mapCanvas.height - size) / 2;
  ctx.drawImage(mapCanvas, sx, sy, size, size, 0, 0, size, size);

  // Draw overlay card matching sidebar layout
  drawOverlayCard(ctx, size, data, badgeImg);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      'image/png',
    );
  });
}

function drawOverlayCard(
  ctx: CanvasRenderingContext2D,
  canvasSize: number,
  data: ShareData,
  badgeImg: HTMLImageElement,
) {
  // Scale relative to an 800px reference canvas
  const s = canvasSize / 800;

  // Card dimensions
  const badgeSize = 96 * s;   // w-24 = 96px
  const pad = 16 * s;         // p-4 = 16px
  const gap = 16 * s;         // gap-4 = 16px
  const textW = 200 * s;
  const cardW = pad + badgeSize + gap + textW + pad;
  const cardH = pad + badgeSize + pad + 20 * s; // badge height + description line
  const margin = 16 * s;
  const radius = 8 * s;

  const x = margin;
  const y = canvasSize - cardH - margin;

  // Card background with border (matches: bg-white border-2 border-gray-300 rounded-lg)
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(x, y, cardW, cardH, radius);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = '#d1d5db'; // border-gray-300
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.roundRect(x, y, cardW, cardH, radius);
  ctx.stroke();

  // Draw SVG badge (left side)
  const badgeX = x + pad;
  const badgeY = y + pad;
  ctx.drawImage(badgeImg, badgeX, badgeY, badgeSize, badgeSize);

  // Stats text (right side) — matches sidebar text-xs space-y-1
  const textX = badgeX + badgeSize + gap;
  let textY = badgeY + 4 * s;
  const fontSize = 12 * s;
  const lineH = 17 * s;

  ctx.fillStyle = '#4b5563'; // text-gray-600
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Commune name (bold, larger)
  ctx.font = `bold ${14 * s}px sans-serif`;
  ctx.fillStyle = '#1f2937';
  ctx.fillText(data.communeName, textX, textY);
  textY += lineH + 4 * s;

  // Surface
  ctx.font = `${fontSize}px sans-serif`;
  ctx.fillStyle = '#4b5563';
  ctx.fillText(`Surface : ${formatNumber(data.communeSurface)} ha`, textX, textY);
  textY += lineH;

  // Dont forêt
  if (data.forestSurface !== null) {
    const pct = data.communeSurface > 0 ? ((data.forestSurface / data.communeSurface) * 100).toFixed(0) : '0';
    ctx.fillText(`Dont forêt : ${formatNumber(data.forestSurface)} ha (${pct} %)`, textX, textY);
    textY += lineH;
  }

  // Coupes
  const coupesAn = data.observationYears > 0 ? data.totalArea / data.observationYears : 0;
  const coupesPct = data.communeSurface > 0 && data.observationYears > 0 ? ((data.totalArea / data.communeSurface / data.observationYears) * 100).toFixed(2) : '0';
  ctx.fillText(`Coupes : ${coupesAn.toFixed(2)} ha/an (${coupesPct} %/an)`, textX, textY);

  // Description text (italic, below badge)
  const descY = badgeY + badgeSize + 6 * s;
  ctx.font = `italic ${11 * s}px sans-serif`;
  ctx.fillStyle = '#4b5563';
  ctx.fillText(SCORE_DESCRIPTIONS[data.forestScore] || '', badgeX, descY);

  // Branding bottom-right
  ctx.fillStyle = '#9ca3af';
  ctx.font = `${10 * s}px sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText('aumitan.fr', x + cardW - pad, y + cardH - 6 * s);

  ctx.textAlign = 'left'; // reset
}
