import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
  }).format(amount);
}

const TZ = 'America/Santo_Domingo';

/** Parsea una fecha del API asegurando que se interprete como UTC si no tiene indicador de zona. */
function parseUTC(date: string | Date | null | undefined): Date | null {
  if (!date) return null;
  if (date instanceof Date) return date;
  // Si no termina en Z ni contiene + (offset), asumir UTC
  const str = !date.endsWith('Z') && !date.includes('+') ? date + 'Z' : date;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDate(date: string | Date | null | undefined): string {
  const d = parseUTC(date);
  if (!d) return '—';
  return new Intl.DateTimeFormat('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TZ,
  }).format(d);
}

export function formatDateTime(date: string | Date | null | undefined): string {
  const d = parseUTC(date);
  if (!d) return '—';
  return new Intl.DateTimeFormat('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  }).format(d);
}

export function formatTime(date: string | Date | null | undefined): string {
  const d = parseUTC(date);
  if (!d) return '—';
  return new Intl.DateTimeFormat('es-DO', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  }).format(d);
}
