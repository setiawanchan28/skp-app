import { BULAN_INDONESIA } from '@/constants/bpsConfig';

/**
 * Format date string or date range (start & end) to Indonesian format
 * E.g. "15 Agustus 2026" or "1 - 3 Agustus 2026" or "28 Juli - 2 Agustus 2026"
 */
export function formatDateIndonesian(dateString: string, endDateString?: string): string {
  if (!dateString) return '';

  const startDate = new Date(dateString);
  if (isNaN(startDate.getTime())) return dateString;

  const startDay = startDate.getDate();
  const startMonth = startDate.getMonth();
  const startYear = startDate.getFullYear();

  if (!endDateString || dateString === endDateString) {
    return `${startDay} ${BULAN_INDONESIA[startMonth]} ${startYear}`;
  }

  const endDate = new Date(endDateString);
  if (isNaN(endDate.getTime())) {
    return `${startDay} ${BULAN_INDONESIA[startMonth]} ${startYear}`;
  }

  const endDay = endDate.getDate();
  const endMonth = endDate.getMonth();
  const endYear = endDate.getFullYear();

  // Same month and year: e.g. "1 - 3 Agustus 2026"
  if (startMonth === endMonth && startYear === endYear) {
    return `${startDay} - ${endDay} ${BULAN_INDONESIA[endMonth]} ${endYear}`;
  }

  // Same year, different month: e.g. "28 Juli - 2 Agustus 2026"
  if (startYear === endYear) {
    return `${startDay} ${BULAN_INDONESIA[startMonth]} - ${endDay} ${BULAN_INDONESIA[endMonth]} ${endYear}`;
  }

  // Different year: e.g. "30 Desember 2025 - 2 Januari 2026"
  return `${startDay} ${BULAN_INDONESIA[startMonth]} ${startYear} - ${endDay} ${BULAN_INDONESIA[endMonth]} ${endYear}`;
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

/**
 * Extract timestamp (in milliseconds) from activity object using date and time fields.
 * Includes time (jam_mulai / start_time) so sorting by newest/oldest respects time of day.
 */
export function getActivityTimestamp(act: any): number {
  if (!act) return 0;

  const rawDate = act.start_date || act.tanggal || act.tanggal_perjadin || act.created_at || '';
  if (!rawDate) return 0;

  const rawTime = act.start_time || act.jam_mulai || act.startTime || act.jamMulai || '';

  let year = 0, month = 0, day = 0;

  if (typeof rawDate === 'string') {
    const match = rawDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      year = parseInt(match[1], 10);
      month = parseInt(match[2], 10) - 1; // Date month is 0-indexed
      day = parseInt(match[3], 10);
    }
  }

  if (!year) {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      year = d.getFullYear();
      month = d.getMonth();
      day = d.getDate();
    }
  }

  if (year) {
    let hours = 0;
    let minutes = 0;
    let seconds = 0;

    if (rawTime && typeof rawTime === 'string') {
      const timeMatch = rawTime.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      if (timeMatch) {
        hours = parseInt(timeMatch[1], 10);
        minutes = parseInt(timeMatch[2], 10);
        seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
      }
    } else if (typeof rawDate === 'string' && rawDate.includes('T')) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        hours = d.getHours();
        minutes = d.getMinutes();
        seconds = d.getSeconds();
      }
    }

    return new Date(year, month, day, hours, minutes, seconds).getTime();
  }

  const fallback = new Date(rawDate).getTime();
  return isNaN(fallback) ? 0 : fallback;
}

