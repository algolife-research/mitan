import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import { getAltitude, getBdforetAtPoint } from '@/lib/map/ign-layers';
import { lngLatToPixel } from '@/lib/map/georaster-renderer';
import { isValidPixel, decodePixelValue, bfsConnectedPixels, getPixelDimensions } from '@/lib/map/perturbation-analysis';
import { escapeHtml, isValidCommuneCode, fmtNum } from '@/lib/utils';
import type { GeoRaster } from '@/types';

function communeButtonHtml(lat: number, lng: number): string {
  return `<button data-commune-nav data-lat="${lat}" data-lng="${lng}" style="margin-top:6px;padding:4px 10px;font-size:12px;cursor:pointer;background:#44644c;color:white;border:none;border-radius:4px;">Voir la page de cette commune</button>`;
}

function attachCommuneNavListener(popup: maplibregl.Popup) {
  const el = popup.getElement();
  if (!el) return;
  const btn = el.querySelector('[data-commune-nav]') as HTMLButtonElement | null;
  if (!btn) return;
  btn.addEventListener('click', async () => {
    btn.textContent = 'Chargement...';
    btn.disabled = true;
    try {
      const lat = btn.dataset.lat;
      const lng = btn.dataset.lng;
      const res = await fetch(`https://geo.api.gouv.fr/communes?lat=${lat}&lon=${lng}&fields=code&limit=1`);
      const data = await res.json();
      const code = data?.[0]?.code;
      if (code && isValidCommuneCode(code)) {
        window.location.href = `/carte?commune=${code}`;
      } else {
        btn.textContent = 'Commune introuvable';
      }
    } catch {
      btn.textContent = 'Erreur';
      btn.disabled = false;
    }
  });
}

export function useMapClick(
  mapRef: React.MutableRefObject<maplibregl.Map | null>,
  georasterRef: React.MutableRefObject<GeoRaster | null>,
  mapReady: boolean,
) {
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const mapInstance = mapRef.current;

    let activePopup: maplibregl.Popup | null = null;

    const showPopup = async (lngLat: maplibregl.LngLat) => {
      if (activePopup) {
        activePopup.remove();
        activePopup = null;
      }
      const { lat, lng } = lngLat;
      const georaster = georasterRef.current;

      // Fetch altitude and BDForet in parallel
      const [altitude, bdforet] = await Promise.all([
        getAltitude(lat, lng),
        getBdforetAtPoint(lat, lng),
      ]);

      const coordsHtml = `<small class="text-gray-500">Lat: ${lat.toFixed(5)}, Lon: ${lng.toFixed(5)}</small>`;
      const altHtml = altitude !== null ? `<strong>Altitude :</strong> ${escapeHtml(String(altitude))} m<br/>` : '';
      const bdforetHtml = bdforet
        ? `<strong>BDForêt :</strong> ${escapeHtml(bdforet.tfvG11)}<br/><span class="text-gray-500">${escapeHtml(bdforet.tfv)}</span><br/>`
        : '';
      const navBtn = communeButtonHtml(lat, lng);

      const createPopup = (html: string) => {
        const popup = new maplibregl.Popup({ closeButton: true })
          .setLngLat(lngLat)
          .setHTML(html)
          .addTo(mapInstance);
        activePopup = popup;
        popup.on('close', () => { if (activePopup === popup) activePopup = null; });
        attachCommuneNavListener(popup);
      };

      const genericHtml = `<div class="text-sm">${altHtml}${bdforetHtml}<hr class="my-2"/>${coordsHtml}${navBtn}</div>`;

      if (!georaster) {
        createPopup(genericHtml);
        return;
      }

      try {
        const pixel = lngLatToPixel(georaster, lng, lat);

        if (!pixel) {
          createPopup(genericHtml);
          return;
        }

        const crValue = georaster.values[0][pixel.row][pixel.col];

        if (isValidPixel(crValue)) {
          const { dateStr } = decodePixelValue(crValue);
          const connectedPixels = bfsConnectedPixels(georaster, pixel.col, pixel.row);
          const { pixelAreaM2 } = getPixelDimensions(georaster);
          const surfaceHa = (connectedPixels * pixelAreaM2) / 10000;

          createPopup(`
            <div class="text-sm">
              <strong>Coupe rase</strong><br/><br/>
              <strong>Date :</strong> ${escapeHtml(dateStr)}<br/>
              <strong>Surface :</strong> ${fmtNum(surfaceHa, 2)} ha<br/>
              ${altHtml}${bdforetHtml}
              <hr class="my-2"/>${coordsHtml}
              ${navBtn}
            </div>
          `);
        } else {
          createPopup(genericHtml);
        }
      } catch {
        // Click handler error — silently ignore
      }
    };

    // Desktop: right-click (contextmenu)
    const handleContextMenu = (e: maplibregl.MapMouseEvent) => {
      e.preventDefault();
      showPopup(e.lngLat);
    };

    // Mobile: long-press (touchstart/touchend)
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    let longPressLngLat: maplibregl.LngLat | null = null;
    const LONG_PRESS_MS = 500;

    const handleTouchStart = (e: maplibregl.MapTouchEvent) => {
      if (e.originalEvent.touches.length !== 1) return;
      longPressLngLat = e.lngLat;
      longPressTimer = setTimeout(() => {
        if (longPressLngLat) {
          e.originalEvent.preventDefault();
          showPopup(longPressLngLat);
        }
        longPressTimer = null;
      }, LONG_PRESS_MS);
    };

    const handleTouchMove = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    const handleTouchEnd = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    mapInstance.on('contextmenu', handleContextMenu);
    mapInstance.on('touchstart', handleTouchStart);
    mapInstance.on('touchmove', handleTouchMove);
    mapInstance.on('touchend', handleTouchEnd);

    return () => {
      mapInstance.off('contextmenu', handleContextMenu);
      mapInstance.off('touchstart', handleTouchStart);
      mapInstance.off('touchmove', handleTouchMove);
      mapInstance.off('touchend', handleTouchEnd);
      if (longPressTimer) clearTimeout(longPressTimer);
    };
  }, [mapReady]);
}
