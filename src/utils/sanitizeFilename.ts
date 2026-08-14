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
 * Generate YYMMDD date prefix from YYYY-MM-DD
 */
export function getYYMMDDPrefix(dateString: string): string {
  if (!dateString) return '000000';
  const cleanDate = dateString.split('T')[0];
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    const yy = parts[0].slice(-2);
    const mm = parts[1].padStart(2, '0');
    const dd = parts[2].padStart(2, '0');
    return `${yy}${mm}${dd}`;
  }
  return '000000';
}

/**
 * Generate Drive folder name: YYMMDD - Nama Kegiatan
 */
export function formatDriveFolderName(startDate: string, activityName: string): string {
  const prefix = getYYMMDDPrefix(startDate);
  const safeName = sanitizeFilename(activityName);
  return `${prefix} - ${safeName}`;
}

/**
 * Generate Drive PDF filename: YYMMDD - Nama Kegiatan.pdf
 */
export function formatDrivePdfName(startDate: string, activityName: string): string {
  const prefix = getYYMMDDPrefix(startDate);
  const safeName = sanitizeFilename(activityName);
  return `${prefix} - ${safeName}.pdf`;
}

/**
 * Generate Drive documentation filename: YYMMDD - Nama Kegiatan - OriginalFilename
 */
export function formatDriveDocName(docDate: string, activityName: string, originalFilename: string): string {
  const prefix = getYYMMDDPrefix(docDate);
  const safeName = sanitizeFilename(activityName);
  const safeOriginal = sanitizeFilename(originalFilename);
  return `${prefix} - ${safeName} - ${safeOriginal}`;
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
