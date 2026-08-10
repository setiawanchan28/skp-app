export interface PetugasDitemui {
  id?: string;
  no?: number;
  nama: string;
  jabatan: string;
}

export interface PenugasanFoto {
  id?: string;
  penugasan_id?: string;
  drive_file_id?: string;
  drive_file_url?: string;
  file_name?: string;
  tanggal_foto?: string;
}

export interface LaporanPenugasan {
  id: string;
  // I. Pelaksana
  nama_pegawai: string;
  nip: string;
  jabatan: string;

  // II. Perjalanan Dinas
  nama_kegiatan: string;
  tanggal_perjadin: string;
  tanggal_selesai_perjadin?: string;
  tempat_tujuan: string;
  nomor_surat: string;
  nomor_spd: string;

  // III. Petugas yang Ditemui
  petugas_ditemui: PetugasDitemui[];

  // IV. Resume
  resume_kegiatan: string;

  // V. Dokumentasi
  fotos?: PenugasanFoto[];

  // Google Drive & Meta
  drive_pdf_url?: string;
  drive_pdf_file_id?: string;
  drive_folder_id?: string;
  created_at?: string;
  updated_at?: string;
}
