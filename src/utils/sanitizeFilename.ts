/**
 * Clean invalid file name characters and replace with underscore (_)
 */
export function sanitizeFilename(filename: string): string {
  // Replace characters not allowed in file systems with underscore
  return filename
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
}

/**
 * Generate photo filename: YYYYMMDD_HHMMSS_001.jpg
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

/**
 * Generate PDF filename: YYYY-MM-DD_Nama_Kegiatan.pdf
 */
export function generatePdfFilename(dateStr: string, namaKegiatan: string): string {
  const sanitizedNama = sanitizeFilename(namaKegiatan);
  return `${dateStr}_${sanitizedNama}.pdf`;
}
