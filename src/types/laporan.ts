export interface LaporanFoto {
  id?: string;
  laporan_id?: string;
  drive_file_id: string;
  drive_file_url: string;
  file_name: string;
  previewUrl?: string; // transient preview on UI
}

export interface Laporan {
  id: string;
  user_id?: string;
  pegawai_id?: string;
  nama_pegawai: string;
  nip: string;
  jabatan: string;
  tanggal: string; // YYYY-MM-DD
  nama_kegiatan: string;
  deskripsi_kegiatan: string;
  ringkasan_kegiatan: string;
  kategori?: string;
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
  nama_kegiatan: string;
  deskripsi_kegiatan: string;
  ringkasan_kegiatan: string;
  kategori: string;
  fotos: {
    file?: File;
    name: string;
    previewUrl: string;
    existingId?: string;
    existingUrl?: string;
  }[];
};
