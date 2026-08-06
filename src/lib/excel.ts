import * as XLSX from 'xlsx';
import { Pegawai, PegawaiInput } from '@/types/pegawai';
import { Laporan } from '@/types/laporan';
import { formatDateIndonesian } from '@/utils/formatters';

/**
 * Export Pegawai data to Excel (.xlsx)
 */
export function exportPegawaiToExcel(pegawaiList: Pegawai[]): void {
  const data = pegawaiList.map((p, idx) => ({
    No: idx + 1,
    Nama: p.nama,
    NIP: p.nip,
    Jabatan: p.jabatan,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Pegawai');

  XLSX.writeFile(workbook, `Master_Pegawai_BPS_${Date.now()}.xlsx`);
}

/**
 * Import Pegawai data from uploaded Excel file
 */
export async function importPegawaiFromExcel(file: File): Promise<PegawaiInput[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        const result: PegawaiInput[] = json
          .map((row) => ({
            nama: String(row.Nama || row.nama || '').trim(),
            nip: String(row.NIP || row.nip || '').trim(),
            jabatan: String(row.Jabatan || row.jabatan || '').trim(),
          }))
          .filter((p) => p.nama && p.nip);

        resolve(result);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
}

/**
 * Export Laporan list to Excel (.xlsx)
 */
export function exportLaporanToExcel(laporanList: Laporan[]): void {
  const data = laporanList.map((l, idx) => ({
    No: idx + 1,
    Tanggal: formatDateIndonesian(l.tanggal),
    'Nama Pegawai': l.nama_pegawai,
    NIP: l.nip,
    Jabatan: l.jabatan,
    Kategori: l.kategori || 'Lainnya',
    'Nama Kegiatan': l.nama_kegiatan,
    'Ringkasan Kegiatan': l.ringkasan_kegiatan,
    'Link PDF Drive': l.drive_pdf_url || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Riwayat Laporan Harian');

  XLSX.writeFile(workbook, `Laporan_Harian_Kerja_BPS_${Date.now()}.xlsx`);
}
