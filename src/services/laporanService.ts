import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Laporan, LaporanFoto } from '@/types/laporan';

const LOCAL_STORAGE_LAPORAN = 'bps_laporan_data';

export async function fetchLaporanList(): Promise<Laporan[]> {
  let supabaseData: Laporan[] | null = null;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('laporan')
        .select(`
          *,
          fotos:laporan_foto(*)
        `)
        .order('tanggal', { ascending: false });

      if (!error && data) {
        supabaseData = data;
      }
    } catch (err) {
      console.warn('Supabase fetch laporan error, fallback to local:', err);
    }
  }

  // Local storage
  let localData: Laporan[] = [];
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(LOCAL_STORAGE_LAPORAN);
    if (local) {
      try {
        localData = JSON.parse(local);
      } catch (e) {}
    }
  }

  // Merge Supabase and Local Storage items to ensure newly saved reports ALWAYS appear immediately
  if (supabaseData && supabaseData.length > 0) {
    const mergedMap = new Map<string, Laporan>();
    supabaseData.forEach((item) => mergedMap.set(item.id, item));
    localData.forEach((item) => {
      if (!mergedMap.has(item.id)) {
        mergedMap.set(item.id, item);
      }
    });
    const result = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
    );
    return result;
  }

  return localData;
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
    tanggal_selesai: laporanData.tanggal_selesai,
    nama_kegiatan: laporanData.nama_kegiatan || '',
    deskripsi_kegiatan: laporanData.deskripsi_kegiatan || '',
    ringkasan_kegiatan: laporanData.ringkasan_kegiatan || '',
    kategori: laporanData.kategori || 'Lainnya',
    status: laporanData.status || 'terkirim',
    drive_pdf_url: laporanData.drive_pdf_url,
    drive_pdf_file_id: laporanData.drive_pdf_file_id,
    drive_folder_id: laporanData.drive_folder_id,
    fotos: fotosData.map((f) => ({ ...f, laporan_id: newId })),
    created_at: laporanData.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 1. Always update local storage first so user sees the report immediately
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

  // 2. Sync to Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const dbRecord = {
        id: record.id,
        nama_pegawai: record.nama_pegawai,
        nip: record.nip,
        jabatan: record.jabatan,
        tanggal: record.tanggal,
        tanggal_selesai: record.tanggal_selesai,
        nama_kegiatan: record.nama_kegiatan,
        deskripsi_kegiatan: record.deskripsi_kegiatan,
        ringkasan_kegiatan: record.ringkasan_kegiatan,
        kategori: record.kategori,
        drive_pdf_url: record.drive_pdf_url,
        drive_pdf_file_id: record.drive_pdf_file_id,
        drive_folder_id: record.drive_folder_id,
        created_at: record.created_at,
        updated_at: record.updated_at,
      };

      const { data, error } = await supabase.from('laporan').upsert(dbRecord).select().single();
      if (!error && data) {
        if (fotosData.length > 0) {
          await supabase.from('laporan_foto').delete().eq('laporan_id', newId);
          await supabase.from('laporan_foto').insert(
            fotosData.map((f) => ({
              laporan_id: newId,
              drive_file_id: f.drive_file_id,
              drive_file_url: f.drive_file_url,
              file_name: f.file_name,
              tanggal_foto: f.tanggal_foto,
            }))
          );
        }
      } else if (error) {
        console.warn('Supabase save record notice (falling back to local storage):', error.message);
      }
    } catch (err) {
      console.warn('Supabase save laporan error:', err);
    }
  }

  return record;
}

export async function deleteLaporanRecord(id: string): Promise<boolean> {
  if (typeof window !== 'undefined') {
    const list = await fetchLaporanList();
    const updated = list.filter((l) => l.id !== id);
    localStorage.setItem(LOCAL_STORAGE_LAPORAN, JSON.stringify(updated));
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('laporan').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase delete laporan error:', err);
    }
  }

  return true;
}
