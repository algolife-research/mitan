'use client';

import { useState, useRef, useEffect } from 'react';
import { PROTECTED_AREAS_CONFIG } from '@/lib/map/ign-layers';

interface FloatingLayerControlProps {
  baseLayer: 'ortho' | 'plan';
  onBaseLayerChange: (layer: 'ortho' | 'plan') => void;
  overlays: Record<string, boolean>;
  onOverlayChange: (overlays: Record<string, boolean>) => void;
  protectedAreas: Record<string, boolean>;
  onProtectedAreaToggle: (areaId: string, visible: boolean) => void;
  onProtectedAreaOpacityChange: (opacity: number) => void;
}

export function FloatingLayerControl(props: FloatingLayerControlProps) {
  const {
    baseLayer, onBaseLayerChange, overlays, onOverlayChange,
    protectedAreas, onProtectedAreaToggle, onProtectedAreaOpacityChange,
  } = props;

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="bg-white p-2 rounded shadow-md hover:bg-gray-100 transition-colors"
        title="Couches cartographiques"
      >
        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-h-[70vh] overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Couches Cartographiques</h3>

          {/* Base Layers */}
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-700 mb-2">Fond de carte</p>
            <div className="space-y-1.5">
              <label className="flex items-center cursor-pointer">
                <input type="radio" checked={baseLayer === 'ortho'} onChange={() => onBaseLayerChange('ortho')} className="mr-2" />
                <span className="text-sm">Orthophotos</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input type="radio" checked={baseLayer === 'plan'} onChange={() => onBaseLayerChange('plan')} className="mr-2" />
                <span className="text-sm">Plan IGN</span>
              </label>
            </div>
          </div>

          {/* Overlays */}
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-700 mb-2">Couches supplementaires</p>
            <div className="space-y-1.5">
              <label className="flex items-center cursor-pointer">
                <input type="checkbox" checked={overlays.perturbations} onChange={(e) => onOverlayChange({ ...overlays, perturbations: e.target.checked })} className="mr-2" />
                <span className="inline-block w-3 h-3 mr-2 border border-gray-400" style={{ backgroundColor: '#D70040' }} />
                <span className="text-sm">Perturbations</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input type="checkbox" checked={overlays.hydro} onChange={(e) => onOverlayChange({ ...overlays, hydro: e.target.checked })} className="mr-2" />
                <span className="text-sm">Hydrographie</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input type="checkbox" checked={overlays.cadastre} onChange={(e) => onOverlayChange({ ...overlays, cadastre: e.target.checked })} className="mr-2" />
                <span className="text-sm">Cadastre</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input type="checkbox" checked={overlays.bdforet} onChange={(e) => onOverlayChange({ ...overlays, bdforet: e.target.checked })} className="mr-2" />
                <span className="text-sm">BDForet V2</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input type="checkbox" checked={overlays.labels} onChange={(e) => onOverlayChange({ ...overlays, labels: e.target.checked })} className="mr-2" />
                <span className="text-sm">Noms de lieux</span>
              </label>
            </div>
          </div>

          {/* Protected Areas */}
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Espaces proteges</p>
            <div className="space-y-1.5">
              {PROTECTED_AREAS_CONFIG.map((area) => (
                <label key={area.id} className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={protectedAreas[area.id] || false}
                    onChange={(e) => onProtectedAreaToggle(area.id, e.target.checked)}
                    className="mr-2"
                  />
                  <span className="inline-block w-3 h-3 mr-2 border border-gray-400" style={{ backgroundColor: area.color }} />
                  <span className="text-xs flex-1">{area.name}</span>
                </label>
              ))}
            </div>

            {Object.values(protectedAreas).some(v => v) && (
              <div className="mt-3 p-2 bg-gray-50 rounded border border-gray-200">
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Transparence zones protegees
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  defaultValue="50"
                  onChange={(e) => onProtectedAreaOpacityChange(parseInt(e.target.value) / 100)}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Transparent</span>
                  <span>Opaque</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
