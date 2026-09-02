import { supabase, supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { LaporanPenugasan } from '@/types/penugasan';
import { getActivityTimestamp } from '@/utils/formatters';

const LOCAL_STORAGE_KEY = 'bps_penugasan_data';

export async function fetchPenugasanList(): Promise<LaporanPenugasan[]> {
  let supabaseData: LaporanPenugasan[] = [];

  // 1. Fetch from Supabase DB via Unified Activities Table
  if (isSupabaseConfigured()) {
    try {
      const client = typeof window === 'undefined' ? supabaseAdmin : supabase;
      const { data, error } = await client
        .from('activities')
        .select(`
          *,
          people:activity_people(*),
          documents:activity_documents(*)
        `)
        .eq('activity_type', 'PERJALANAN_DINAS')
        .is('deleted_at', null)
        .order('start_date', { ascending: false });

      if (!error && data) {
        supabaseData = data.map((item: any) => ({
          id: item.id,
          nama_pegawai: item.nama_pegawai || '',
          nip: item.nip || '',
          jabatan: item.jabatan || '',
          nama_kegiatan: item.name || item.nama_kegiatan || '',
          tanggal_perjadin: item.start_date,
          tanggal_selesai_perjadin: item.end_date,
          tempat_tujuan: item.destination || item.tempat_tujuan || '',
          nomor_surat: item.letter_number || item.nomor_surat || '',
          nomor_spd: item.spd_number || item.nomor_spd || '',
          resume_kegiatan: item.description || item.deskripsi_kegiatan || '',
          drive_pdf_url: item.drive_pdf_url,
          drive_pdf_file_id: item.drive_pdf_file_id,
          drive_folder_id: item.drive_folder_id,
          petugas_ditemui: item.people?.map((p: any) => ({ nama: p.person_name, jabatan: p.position })) || [],
          fotos: item.documents?.map((d: any) => ({
            id: d.id,
            file_name: d.original_filename || d.file_name,
            drive_file_id: d.drive_file_id,
            web_view_url: d.web_view_url,
            tanggal_foto: d.documentation_date,
          })) || [],
          created_at: item.created_at,
          updated_at: item.updated_at,
        }));
      }
    } catch (err) {}
  }

  // 2. Fetch from Server API route
  let serverData: LaporanPenugasan[] = [];
  try {
    const res = await fetch('/api/penugasan/list', { cache: 'no-store' });
    if (res.ok) {
      const result = await res.json();
      if (result.data && Array.isArray(result.data)) {
        serverData = result.data;
      }
    }
  } catch (err) {}

  // 3. Local Storage fallback
  let localData: LaporanPenugasan[] = [];
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (local) {
      try {
        localData = JSON.parse(local);
      } catch (e) {}
    }
  }

  const mergedMap = new Map<string, LaporanPenugasan>();
  if (supabaseData.length > 0 || serverData.length > 0) {
    serverData.forEach((item) => { if (item && item.id) mergedMap.set(item.id, item); });
    supabaseData.forEach((item) => { if (item && item.id) mergedMap.set(item.id, item); });
  } else {
    localData.forEach((item) => { if (item && item.id) mergedMap.set(item.id, item); });
  }

  const finalResult = Array.from(mergedMap.values()).sort((a, b) => {
    const timeA = getActivityTimestamp(a);
    const timeB = getActivityTimestamp(b);
    if (timeA !== timeB) return timeB - timeA;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(finalResult));
  }

  return finalResult;
}

export async function fetchPenugasanById(id: string): Promise<LaporanPenugasan | null> {
  const list = await fetchPenugasanList();
  return list.find((item) => item.id === id) || null;
}

export async function deletePenugasanRecord(id: string): Promise<boolean> {
  if (typeof window !== 'undefined') {
    let list: LaporanPenugasan[] = [];
    const local = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (local) {
      try {
        list = JSON.parse(local);
      } catch (e) {}
    }
    const updated = list.filter((l) => l.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  }

  try {
    await fetch('/api/penugasan/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  } catch (err) {}

  return true;
}
