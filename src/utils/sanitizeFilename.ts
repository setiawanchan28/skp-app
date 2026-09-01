/**
 * Clean invalid file name characters and replace with underscore or safe characters
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/[\r\n\t]/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Normalize activity name for case-insensitive collision check (DATABASE.md Section 6.3)
 */
export function normalizeActivityName(name: string): string {
  return name
    .trim()
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Generate YYYYMMDD date prefix from YYYY-MM-DD
 */
export function getYYYYMMDDPrefix(dateString: string): string {
  if (!dateString) return '00000000';
  const cleanDate = dateString.split('T')[0];
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    const yyyy = parts[0].padStart(4, '20');
    const mm = parts[1].padStart(2, '0');
    const dd = parts[2].padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
  }
  return '00000000';
}

export function getYYMMDDPrefix(dateString: string): string {
  return getYYYYMMDDPrefix(dateString);
}

/**
 * Format time range for file naming: e.g. " (08.00-16.00)"
 */
export function formatTimeRangeForFilename(startTime?: string, endTime?: string): string {
  if (!startTime) return '';
  const cleanStart = startTime.replace(':', '.');
  const cleanEnd = endTime ? endTime.replace(':', '.') : '';
  return cleanEnd ? ` (${cleanStart}-${cleanEnd})` : ` (${cleanStart})`;
}

/**
 * Generate Drive folder name: YYYYMMDD - Nama Kegiatan (08.00-16.00)
 */
export function formatDriveFolderName(
  startDate: string,
  activityName: string,
  startTime?: string,
  endTime?: string
): string {
  const prefix = getYYYYMMDDPrefix(startDate);
  const safeName = sanitizeFilename(activityName);
  const timeSuffix = formatTimeRangeForFilename(startTime, endTime);
  return `${prefix} - ${safeName}${timeSuffix}`;
}

/**
 * Generate Drive PDF filename: YYYYMMDD_Nama Kegiatan (10.00-11.00).pdf
 */
export function formatDrivePdfName(
  startDate: string,
  activityName: string,
  startTime?: string,
  endTime?: string
): string {
  const prefix = getYYYYMMDDPrefix(startDate);
  const safeName = sanitizeFilename(activityName);
  const timeSuffix = formatTimeRangeForFilename(startTime, endTime);
  return `${prefix}_${safeName}${timeSuffix}.pdf`;
}

/**
 * Generate Drive photo filename: YYYYMMDD_Nama Kegiatan (10.00-11.00)-1.jpg
 */
export function formatDrivePhotoName(
  startDate: string,
  activityName: string,
  index: number,
  ext: string = 'jpg',
  startTime?: string,
  endTime?: string
): string {
  const prefix = getYYYYMMDDPrefix(startDate);
  const safeName = sanitizeFilename(activityName);
  const timeSuffix = formatTimeRangeForFilename(startTime, endTime);
  const cleanExt = ext.replace(/^\./, '') || 'jpg';
  return `${prefix}_${safeName}${timeSuffix}-${index + 1}.${cleanExt}`;
}

/**
 * Generate Drive documentation filename
 */
export function formatDriveDocName(
  docDate: string,
  activityName: string,
  originalFilename: string,
  startTime?: string,
  endTime?: string
): string {
  const ext = originalFilename ? originalFilename.split('.').pop() || 'jpg' : 'jpg';
  return formatDrivePhotoName(docDate, activityName, 0, ext, startTime, endTime);
}

/**
 * Legacy Helper: Generate photo filename
 */
export function generatePhotoFilename(dateStr: string, index: number, originalName?: string): string {
  const date = new Date(dateStr);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  
  const idxStr = String(index + 1).padStart(3, '0');
  
  let ext = 'jpg';
  if (originalName) {
    const parts = originalName.split('.');
    if (parts.length > 1) {
      ext = parts.pop()?.toLowerCase() || 'jpg';
    }
  }

  return `${yyyy}${mm}${dd}_${hh}${min}${ss}_${idxStr}.${ext}`;
}

export function generatePdfFilename(dateStr: string, namaKegiatan: string): string {
  return formatDrivePdfName(dateStr, namaKegiatan);
}
