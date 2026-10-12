import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Safely decodes a URI component without throwing URIError on malformed strings (e.g. "Xylocaine 5%")
 */
export function safeDecode(str?: string | null): string {
  if (!str) return '';
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

/**
 * Safely formats a date string into a localized French pattern.
 * Never throws RangeError: Invalid time value.
 */
export function safeFormatDate(
  dateStr?: string | null,
  pattern: string = 'dd/MM/yyyy',
  fallback: string = '-'
): string {
  if (!dateStr) return fallback;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return fallback;
    return format(d, pattern, { locale: fr });
  } catch {
    return fallback;
  }
}

/**
 * Safely parses any date into a timestamp number. Returns Infinity for sorting if invalid.
 */
export function safeTimestamp(dateStr?: string | null, fallback = 0): number {
  if (!dateStr) return fallback;
  try {
    const t = new Date(dateStr).getTime();
    return isNaN(t) ? fallback : t;
  } catch {
    return fallback;
  }
}
