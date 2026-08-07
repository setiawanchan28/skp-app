import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Laporan, LaporanFoto } from '@/types/laporan';

const LOCAL_STORAGE_LAPORAN = 'bps_laporan_data';

export async function fetchLaporanList(): Promise<Laporan[]> {
  let supabaseData: Laporan[] = [];

  // 1. Fetch from Supabase DB (Primary Online Source for HP & PC sync)
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
      } else if (error) {
        console.error('Supabase fetch laporan error:', error.message);
      }
    } catch (err) {
      console.warn('Supabase fetch laporan exception:', err);
    }
  }

  // 2. Fetch from Server API store if available
  let serverData: Laporan[] = [];
  try {
    const res = await fetch('/api/laporan/list', { cache: 'no-store' });
    if (res.ok) {
      const result = await res.json();
      if (result.data && Array.isArray(result.data)) {
        serverData = result.data;
      }
    }
  } catch (err) {}

  // 3. Local storage fallback
  let localData: Laporan[] = [];
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(LOCAL_STORAGE_LAPORAN);
    if (local) {
      try {
        localData = JSON.parse(local);
      } catch (e) {}
    }
  }

  const isDemoUrl = (url?: string, fileId?: string) =>
    fileId === 'demo_pdf_1' ||
    fileId === 'demo_pdf_2' ||
    fileId === 'lap_sample_1' ||
    (url && (url.includes('demo_pdf_1') || url.includes('demo_pdf_2')));

  serverData = serverData.filter((l) => !isDemoUrl(l.drive_pdf_url, l.drive_pdf_file_id) && l.id !== 'lap_sample_1');
  localData = localData.filter((l) => !isDemoUrl(l.drive_pdf_url, l.drive_pdf_file_id) && l.id !== 'lap_sample_1');
  supabaseData = supabaseData.filter((l) => !isDemoUrl(l.drive_pdf_url, l.drive_pdf_file_id) && l.id !== 'lap_sample_1');

  // Merge all sources prioritizing Supabase DB -> Server -> Local
  const mergedMap = new Map<string, Laporan>();

  localData.forEach((item) => { if (item && item.id) mergedMap.set(item.id, item); });
  serverData.forEach((item) => { if (item && item.id) mergedMap.set(item.id, item); });
  supabaseData.forEach((item) => { if (item && item.id) mergedMap.set(item.id, item); });

  const finalResult = Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.tanggal || Date.now()).getTime() - new Date(a.tanggal || Date.now()).getTime()
  );

  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_LAPORAN, JSON.stringify(finalResult));
  }

  return finalResult;
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

  // 1. Save to local storage
  if (typeof window !== 'undefined') {
    let currentList: Laporan[] = [];
    const local = localStorage.getItem(LOCAL_STORAGE_LAPORAN);
    if (local) {
      try {
        currentList = JSON.parse(local);
      } catch (e) {}
    }
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

  // 2. Sync to Supabase Online DB
  if (isSupabaseConfigured()) {
    try {
      const baseDbRecord: Record<string, any> = {
        id: record.id,
        nama_pegawai: record.nama_pegawai,
        nip: record.nip,
        jabatan: record.jabatan,
        tanggal: record.tanggal,
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

      if (record.tanggal_selesai) {
        baseDbRecord.tanggal_selesai = record.tanggal_selesai;
      }

      const { error } = await supabase.from('laporan').upsert(baseDbRecord);

      if (error) {
        console.error('Supabase upsert laporan error:', error.message);
        // Fallback retry without optional extra columns if schema mismatch
        delete baseDbRecord.tanggal_selesai;
        delete baseDbRecord.kategori;
        await supabase.from('laporan').upsert(baseDbRecord);
      }

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
    } catch (err: any) {
      console.error('Supabase save laporan exception:', err);
    }
  }

  return record;
}

export async function deleteLaporanRecord(id: string): Promise<boolean> {
  if (typeof window !== 'undefined') {
    let list: Laporan[] = [];
    const local = localStorage.getItem(LOCAL_STORAGE_LAPORAN);
    if (local) {
      try {
        list = JSON.parse(local);
      } catch (e) {}
    }
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
