export interface LaporanFoto {
  id?: string;
  laporan_id?: string;
  drive_file_id: string;
  drive_file_url: string;
  file_name: string;
  previewUrl?: string;
  tanggal_foto?: string;
}

export interface Laporan {
  id: string;
  user_id?: string;
  pegawai_id?: string;
  nama_pegawai: string;
  nip: string;
  jabatan: string;
  tanggal: string; // YYYY-MM-DD or start date
  tanggal_selesai?: string; // optional end date for date ranges YYYY-MM-DD
  nama_kegiatan: string;
  deskripsi_kegiatan: string;
  ringkasan_kegiatan: string;
  kategori?: string;
  jenis_laporan?: 'harian' | 'penugasan';
  tempat_tujuan?: string;
  nomor_surat?: string;
  nomor_spd?: string;
  petugas_ditemui?: { nama: string; jabatan: string }[];
  status?: 'draft' | 'terkirim'; // 'draft' for incremental work, 'terkirim' for completed
  drive_pdf_url?: string;
  drive_pdf_file_id?: string;
  drive_folder_id?: string;
  fotos?: LaporanFoto[];
  created_at?: string;
  updated_at?: string;
}

export type LaporanFormValues = {
  pegawai_id: string;
  nama_pegawai: string;
  nip: string;
  jabatan: string;
  tanggal: string;
  tanggal_selesai?: string;
  nama_kegiatan: string;
  deskripsi_kegiatan: string;
  ringkasan_kegiatan: string;
  kategori: string;
  status?: 'draft' | 'terkirim';
  fotos: {
    file?: File;
    name: string;
    previewUrl: string;
    existingId?: string;
    existingUrl?: string;
    tanggal_foto?: string;
  }[];
};
