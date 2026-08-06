import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Laporan, LaporanFoto } from '@/types/laporan';

const LOCAL_STORAGE_LAPORAN = 'bps_laporan_data';

const DEFAULT_LAPORAN: Laporan[] = [
  {
    id: 'lap-1',
    nama_pegawai: 'Dede Supriatna, S.Si., M.Stat.',
    nip: '198805122010121002',
    jabatan: 'Statistisi Ahli Muda',
    tanggal: '2026-08-05',
    nama_kegiatan: 'Pelatihan Petugas Sakernas Agustus 2026',
    deskripsi_kegiatan: '- Membuka sesi pelatihan petugas Sakernas\n- Menjelaskan konsep dan definisi ketenagakerjaan\n- Memandu simulasi pengisian kuesioner digital FASIH',
    ringkasan_kegiatan: 'Melaksanakan kegiatan pelatihan petugas Survei Angkatan Kerja Nasional (Sakernas) periode Agustus 2026 untuk menyelaraskan pemahaman konsep ketenagakerjaan serta menguji konsistensi entri kuesioner digital.',
    kategori: 'Pelatihan',
    drive_pdf_url: 'https://drive.google.com/file/d/demo_pdf_1/view',
    drive_pdf_file_id: 'demo_pdf_1',
    fotos: [
      {
        id: 'fot-1',
        drive_file_id: 'demo_img_1',
        drive_file_url: 'https://drive.google.com/file/d/demo_img_1/view',
        file_name: '20260805_090000_001.jpg',
      },
      {
        id: 'fot-2',
        drive_file_id: 'demo_img_2',
        drive_file_url: 'https://drive.google.com/file/d/demo_img_2/view',
        file_name: '20260805_090000_002.jpg',
      },
    ],
    created_at: new Date(2026, 7, 5).toISOString(),
  },
  {
    id: 'lap-2',
    nama_pegawai: 'Ahmad Fauzi, S.ST.',
    nip: '199203152014021001',
    jabatan: 'Statistisi Ahli Pertama',
    tanggal: '2026-08-04',
    nama_kegiatan: 'Rapat Koordinasi Evaluasi Pendataan Susenas',
    deskripsi_kegiatan: '- Pembahasan capaian response rate survei\n- Evaluasi kendala penolakan responden di lapangan\n- Penyusunan strategi re-visit responden',
    ringkasan_kegiatan: 'Mengikuti rapat koordinasi evaluasi pendataan Susenas guna membahas progres pencapaian target sampel dan merumuskan langkah penanganan kendala penolakan responden.',
    kategori: 'Rapat',
    drive_pdf_url: 'https://drive.google.com/file/d/demo_pdf_2/view',
    drive_pdf_file_id: 'demo_pdf_2',
    fotos: [
      {
        id: 'fot-3',
        drive_file_id: 'demo_img_3',
        drive_file_url: 'https://drive.google.com/file/d/demo_img_3/view',
        file_name: '20260804_140000_001.jpg',
      },
    ],
    created_at: new Date(2026, 7, 4).toISOString(),
  },
];

export async function fetchLaporanList(): Promise<Laporan[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('laporan')
        .select(`
          *,
          fotos:laporan_foto(*)
        `)
        .order('tanggal', { ascending: false });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn('Supabase fetch laporan error, fallback to local:', err);
    }
  }

  // Local storage fallback
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(LOCAL_STORAGE_LAPORAN);
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {}
    }
    localStorage.setItem(LOCAL_STORAGE_LAPORAN, JSON.stringify(DEFAULT_LAPORAN));
  }
  return DEFAULT_LAPORAN;
}

export async function fetchLaporanById(id: string): Promise<Laporan | null> {
  const list = await fetchLaporanList();
  return list.find((l) => l.id === id) || null;
}

export async function saveLaporanRecord(laporanData: Partial<Laporan>, fotosData: LaporanFoto[]): Promise<Laporan> {
  const newId = laporanData.id || (typeof crypto !== 'undefined' ? crypto.randomUUID() : `lap_${Date.now()}`);

  const record: Laporan = {
    id: newId,
    nama_pegawai: laporanData.nama_pegawai || '',
    nip: laporanData.nip || '',
    jabatan: laporanData.jabatan || '',
    tanggal: laporanData.tanggal || new Date().toISOString().split('T')[0],
    nama_kegiatan: laporanData.nama_kegiatan || '',
    deskripsi_kegiatan: laporanData.deskripsi_kegiatan || '',
    ringkasan_kegiatan: laporanData.ringkasan_kegiatan || '',
    kategori: laporanData.kategori || 'Lainnya',
    drive_pdf_url: laporanData.drive_pdf_url,
    drive_pdf_file_id: laporanData.drive_pdf_file_id,
    drive_folder_id: laporanData.drive_folder_id,
    fotos: fotosData.map((f) => ({ ...f, laporan_id: newId })),
    created_at: laporanData.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('laporan').upsert(record).select().single();
      if (!error && data) {
        if (fotosData.length > 0) {
          await supabase.from('laporan_foto').delete().eq('laporan_id', newId);
          await supabase.from('laporan_foto').insert(
            fotosData.map((f) => ({
              laporan_id: newId,
              drive_file_id: f.drive_file_id,
              drive_file_url: f.drive_file_url,
              file_name: f.file_name,
            }))
          );
        }
        return record;
      }
    } catch (err) {
      console.warn('Supabase save laporan error:', err);
    }
  }

  // Update local storage
  if (typeof window !== 'undefined') {
    const currentList = await fetchLaporanList();
    const existingIndex = currentList.findIndex((l) => l.id === newId);
    let updatedList: Laporan[];
    if (existingIndex >= 0) {
      updatedList = [...currentList];
      updatedList[existingIndex] = record;
    } else {
      updatedList = [record, ...currentList];
    }
    localStorage.setItem(LOCAL_STORAGE_LAPORAN, JSON.stringify(updatedList));
  }

  return record;
}

export async function deleteLaporanRecord(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('laporan').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase delete laporan error:', err);
    }
  }

  if (typeof window !== 'undefined') {
    const list = await fetchLaporanList();
    const updated = list.filter((l) => l.id !== id);
    localStorage.setItem(LOCAL_STORAGE_LAPORAN, JSON.stringify(updated));
  }

  return true;
}
