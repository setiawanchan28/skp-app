export type ActivityType = 'PERJALANAN_DINAS' | 'NON_PERJALANAN_DINAS';
export type ActivityStatus = 'DRAFT' | 'READY' | 'GENERATED' | 'TRASHED';
export type DocumentationKind = 'PHOTO' | 'DOCUMENT' | 'OTHER';

export interface ActivityPerson {
  id?: string;
  activity_id?: string;
  person_name: string;
  position: string;
  sort_order?: number;
}

export interface ActivityDocument {
  id?: string;
  activity_id?: string;
  documentation_date?: string; // YYYY-MM-DD
  original_filename?: string;
  mime_type?: string;
  file_size_bytes?: number;
  kind?: DocumentationKind;
  drive_file_id: string;
  drive_name?: string;
  web_view_url?: string;
  previewUrl?: string;
  sort_order?: number;
  file?: File;
  file_name?: string;
  drive_file_url?: string;
  tanggal_foto?: string;
}

export interface Activity {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  name: string;
  normalized_name?: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  startTime?: string;
  endTime?: string;
  jam_mulai?: string;
  jam_selesai?: string;
  jamMulai?: string;
  jamSelesai?: string;
  destination?: string;
  letter_number?: string;
  spd_number?: string;
  description?: string;
  status: ActivityStatus;
  previous_status?: ActivityStatus;
  generated_at?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;

  // Virtual / Form relations
  people?: ActivityPerson[];
  documents?: ActivityDocument[];

  // Profile snapshot / metadata for report rendering
  nama_pegawai?: string;
  nip?: string;
  jabatan?: string;

  // Drive & PDF metadata references
  drive_pdf_url?: string;
  drive_pdf_file_id?: string;
  drive_folder_id?: string;

  // Backward compatibility optional props
  tanggal?: string;
  tanggal_selesai?: string;
  nama_kegiatan?: string;
  deskripsi_kegiatan?: string;
  ringkasan_kegiatan?: string;
  kategori?: string;
  jenis_laporan?: string;
  tempat_tujuan?: string;
  nomor_surat?: string;
  nomor_spd?: string;
  fotos?: ActivityDocument[];
  petugas_ditemui?: { nama: string; jabatan: string }[];
}

// Backward Compatibility Aliases for existing UI components during transition
export type LaporanFoto = ActivityDocument;
export type Laporan = Activity;
