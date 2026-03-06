'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { fmtNum } from '@/lib/utils';

interface YearRangeSliderProps {
  minYear: number;
  maxYear: number;
  value: [number, number];
  onChange: (range: [number, number]) => void;
  onReset: () => void;
  yearStats: Record<number, number>;
  pixelAreaHa: number;
}

export function YearRangeSlider({ minYear, maxYear, value, onChange, onReset, yearStats, pixelAreaHa }: YearRangeSliderProps) {
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const displayMin = Math.min(minYear, 2018);
  const displayMax = Math.max(maxYear, 2025);
  const years = [];
  for (let y = displayMin; y <= displayMax; y++) years.push(y);
  const maxPixels = Math.max(...Object.values(yearStats), 1);
  const isFiltered = value[0] !== displayMin || value[1] !== displayMax;

  const stopPlay = useCallback(() => {
    if (playRef.current) clearInterval(playRef.current);
    playRef.current = null;
    setPlaying(false);
  }, []);

  const startPlay = useCallback(() => {
    stopPlay();
    setPlaying(true);
    onChange([displayMin, displayMin]);
    let current = displayMin;
    playRef.current = setInterval(() => {
      current++;
      if (current > displayMax) {
        stopPlay();
        onReset();
        return;
      }
      onChange([displayMin, current]);
    }, 600);
  }, [displayMin, displayMax, onChange, onReset, stopPlay]);

  useEffect(() => {
    return () => { if (playRef.current) clearInterval(playRef.current); };
  }, []);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-700">Evolution temporelle</p>
          <button
            onClick={playing ? stopPlay : startPlay}
            className="text-gray-500 hover:text-primary transition-colors"
            title={playing ? 'Arreter' : 'Lecture'}
          >
            {playing ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>
        </div>
        {isFiltered && !playing && (
          <button
            onClick={onReset}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Hover tooltip */}
      <div className="h-4 text-center">
        {hoveredYear !== null && (
          <span className="text-xs text-gray-600 font-medium">
            {hoveredYear} : {fmtNum((yearStats[hoveredYear] || 0) * pixelAreaHa)} ha
          </span>
        )}
      </div>

      {/* Interactive histogram */}
      <div
        className="relative flex items-end gap-[2px] px-1 pt-4"
        style={{ height: '96px' }}
        onMouseLeave={() => setHoveredYear(null)}
      >
        {years.map((y) => {
          const count = yearStats[y] || 0;
          const area = count * pixelAreaHa;
          const height = maxPixels > 0 ? (count / maxPixels) * 100 : 0;
          const inRange = y >= value[0] && y <= value[1];
          const isSingleSelected = isFiltered && value[0] === y && value[1] === y;
          return (
            <div
              key={y}
              className="flex-1 rounded-t-sm transition-all cursor-pointer relative group"
              style={{
                height: `${Math.max(height, 3)}%`,
                backgroundColor: isSingleSelected ? '#a00030' : inRange ? '#D70040' : '#e5e7eb',
                opacity: inRange ? 1 : 0.4,
              }}
              onMouseEnter={() => setHoveredYear(y)}
              onClick={() => {
                if (value[0] === y && value[1] === y) {
                  onReset();
                } else {
                  onChange([y, y]);
                }
              }}
            >
              {/* Value label above bar */}
              {inRange && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[8px] text-gray-700 font-medium whitespace-nowrap pointer-events-none">
                  {fmtNum(area)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Year labels under histogram */}
      <div className="flex gap-[2px] px-1">
        {years.map((y) => {
          const inRange = y >= value[0] && y <= value[1];
          return (
            <div key={y} className="flex-1 text-center">
              <span
                className={`text-[9px] leading-none ${inRange ? 'text-gray-600 font-medium' : 'text-gray-400'}`}
                style={{ writingMode: years.length > 12 ? 'vertical-rl' : undefined }}
              >
                {years.length > 12 ? String(y).slice(-2) : y}
              </span>
            </div>
          );
        })}
      </div>

      {/* Dual-handle slider */}
      <Slider.Root
        className="relative flex items-center select-none touch-none w-full h-5"
        value={value}
        onValueChange={(v) => onChange(v as [number, number])}
        min={displayMin}
        max={displayMax}
        step={1}
        minStepsBetweenThumbs={0}
      >
        <Slider.Track className="bg-gray-200 relative grow rounded-full h-1.5">
          <Slider.Range className="absolute rounded-full h-full" style={{ backgroundColor: '#D70040' }} />
        </Slider.Track>
        <Slider.Thumb
          className="block w-4 h-4 bg-white border-2 rounded-full shadow-md focus:outline-none focus:ring-2"
          style={{ borderColor: '#D70040' }}
          aria-label="Année de début"
        />
        <Slider.Thumb
          className="block w-4 h-4 bg-white border-2 rounded-full shadow-md focus:outline-none focus:ring-2"
          style={{ borderColor: '#D70040' }}
          aria-label="Année de fin"
        />
      </Slider.Root>

      {/* Range labels */}
      <div className="flex justify-between text-xs text-gray-500">
        <span className={isFiltered ? 'font-semibold' : ''} style={isFiltered ? { color: '#D70040' } : undefined}>{value[0]}</span>
        <span className={isFiltered ? 'font-semibold' : ''} style={isFiltered ? { color: '#D70040' } : undefined}>{value[1]}</span>
      </div>

      <p className="text-[10px] text-gray-400 italic">Cliquez sur une barre pour filtrer, glissez les curseurs pour un intervalle</p>
    </div>
  );
}
