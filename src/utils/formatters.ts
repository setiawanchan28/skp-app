import { BULAN_INDONESIA } from '@/constants/bpsConfig';

/**
 * Format YYYY-MM-DD date to Indonesian long date format (e.g. 15 Agustus 2026)
 */
export function formatDateIndonesian(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const day = date.getDate();
  const monthIndex = date.getMonth();
  const year = date.getFullYear();

  return `${day} ${BULAN_INDONESIA[monthIndex]} ${year}`;
}

/**
 * Get Year and Indonesian Month Name from YYYY-MM-DD
 */
export function getYearAndMonthName(dateString: string): { year: string; monthName: string } {
  const date = new Date(dateString || Date.now());
  const year = String(date.getFullYear());
  const monthIndex = date.getMonth();
  const monthName = BULAN_INDONESIA[monthIndex] || 'Agustus';

  return { year, monthName };
}

/**
 * Format NIP to standard BPS 18 digit format (YYYYMMDD YYYYMM X XXX)
 */
export function formatNIP(nip: string): string {
  const clean = nip.replace(/\D/g, '');
  if (clean.length === 18) {
    return `${clean.slice(0, 8)} ${clean.slice(8, 14)} ${clean.slice(14, 15)} ${clean.slice(15, 18)}`;
  }
  return nip;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number = 60): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
