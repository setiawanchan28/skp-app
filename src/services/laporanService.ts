import { supabase, supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { Laporan } from '@/types/laporan';
import { fetchPenugasanList, deletePenugasanRecord } from './penugasanService';

const LOCAL_STORAGE_LAPORAN = 'bps_laporan_data';

export async function fetchLaporanList(): Promise<Laporan[]> {
  let supabaseData: Laporan[] = [];

  // 1. Fetch from Supabase DB (Primary Online Source for HP & PC sync)
  if (isSupabaseConfigured()) {
    try {
      const client = typeof window === 'undefined' ? supabaseAdmin : supabase;
      const { data, error } = await client
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

  // Mark all harian reports as jenis_laporan: 'harian'
  const mergedMap = new Map<string, Laporan>();
  localData.forEach((item) => {
    if (item && item.id) mergedMap.set(item.id, { ...item, jenis_laporan: item.jenis_laporan || 'harian' });
  });
  serverData.forEach((item) => {
    if (item && item.id) mergedMap.set(item.id, { ...item, jenis_laporan: item.jenis_laporan || 'harian' });
  });
  supabaseData.forEach((item) => {
    if (item && item.id) mergedMap.set(item.id, { ...item, jenis_laporan: item.jenis_laporan || 'harian' });
  });

  // 4. Fetch and map Laporan Penugasan records
  try {
    const penugasanList = await fetchPenugasanList();
    penugasanList.forEach((p) => {
      if (p && p.id) {
        const mappedPenugasan: Laporan = {
          id: p.id,
          nama_pegawai: p.nama_pegawai,
          nip: p.nip,
          jabatan: p.jabatan,
          tanggal: p.tanggal_perjadin,
          tanggal_selesai: p.tanggal_selesai_perjadin,
          nama_kegiatan: p.nama_kegiatan,
          deskripsi_kegiatan: `Tempat Tujuan: ${p.tempat_tujuan} | Nomor ST: ${p.nomor_surat} | Nomor SPD: ${p.nomor_spd}`,
          ringkasan_kegiatan: p.resume_kegiatan,
          kategori: 'Perjalanan Dinas',
          jenis_laporan: 'penugasan',
          drive_pdf_url: p.drive_pdf_url,
          drive_pdf_file_id: p.drive_pdf_file_id,
          drive_folder_id: p.drive_folder_id,
          fotos: p.fotos?.map((f: any) => ({
            id: f.id,
            drive_file_id: f.drive_file_id || '',
            drive_file_url: f.drive_file_url || '',
            file_name: f.file_name || 'Foto Penugasan.jpg',
            tanggal_foto: f.tanggal_foto,
          })),
          created_at: p.created_at,
          updated_at: p.updated_at,
        };
        mergedMap.set(p.id, mappedPenugasan);
      }
    });
  } catch (err) {}

  const finalResult = Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.tanggal || Date.now()).getTime() - new Date(a.tanggal || Date.now()).getTime()
  );

  return finalResult;
}

export async function fetchLaporanById(id: string): Promise<Laporan | null> {
  const list = await fetchLaporanList();
  return list.find((item) => item.id === id) || null;
}

export async function deleteLaporanRecord(id: string, jenis_laporan?: 'harian' | 'penugasan'): Promise<boolean> {
  if (jenis_laporan === 'penugasan') {
    return await deletePenugasanRecord(id);
  }

  // Delete local
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

  // Call Server API delete
  try {
    await fetch('/api/laporan/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  } catch (err) {}

  return true;
}

export async function saveLaporanRecord(laporan: Partial<Laporan>, photosData?: any[]): Promise<Laporan> {
  const res = await fetch('/api/laporan/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...laporan, fotos: photosData || laporan.fotos }),
  });

  const result = await res.json();
  if (!res.ok) {
    throw new Error(result.error || 'Gagal menyimpan laporan');
  }

  return result.data;
}
