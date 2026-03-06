import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number, decimals: number = 2): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatPercent(num: number, decimals: number = 1): string {
  return `${formatNumber(num, decimals)} %`;
}

export function formatHectares(ha: number): string {
  return `${formatNumber(ha, 2)} ha`;
}

export function formatDate(date: string | Date, format: 'short' | 'long' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (format === 'long') {
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  }
  return new Intl.DateTimeFormat('fr-FR').format(d);
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/** Escape HTML special characters to prevent XSS */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Validate a French commune code (5 alphanumeric chars, e.g. "19001", "2A004") */
export const VALID_COMMUNE_CODE = /^[0-9]{2}[0-9AB][0-9]{2}$/;

export function isValidCommuneCode(code: string): boolean {
  return VALID_COMMUNE_CODE.test(code);
}

/** Format a number the French way: comma for decimals, dot for thousands */
export function fmtNum(n: number, decimals: number = 1): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Format an integer the French way (with dot thousands separator) */
export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('fr-FR');
}

export function calculateBounds(geometry: GeoJSON.MultiPolygon | GeoJSON.Polygon): [[number, number], [number, number]] {
  const coords = geometry.type === 'MultiPolygon' 
    ? geometry.coordinates.flat(2)
    : geometry.coordinates.flat(1);
  
  const lngs = coords.map((c: number[]) => c[0]);
  const lats = coords.map((c: number[]) => c[1]);
  
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}
