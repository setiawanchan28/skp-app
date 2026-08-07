import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getStoredLaporanList } from '@/lib/laporanStore';
import { fetchLaporanFromDriveCloud } from '@/lib/drive';
import { Laporan } from '@/types/laporan';

export async function GET() {
  let supabaseData: Laporan[] = [];

  // Query Supabase DB directly using supabaseAdmin on server
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin
        .from('laporan')
        .select(`
          *,
          fotos:laporan_foto(*)
        `)
        .order('tanggal', { ascending: false });

      if (!error && data) {
        supabaseData = data;
      } else if (error) {
        console.error('Supabase fetch laporan error in /api/laporan/list:', error.message);
      }
    } catch (err) {
      console.warn('Supabase list fetch notice:', err);
    }
  }

  let driveCloudData: Laporan[] = [];
  try {
    driveCloudData = await fetchLaporanFromDriveCloud();
  } catch (e) {}

  const serverData = getStoredLaporanList();

  const isDemoUrl = (url?: string, fileId?: string) =>
    fileId === 'demo_pdf_1' ||
    fileId === 'demo_pdf_2' ||
    fileId === 'lap_sample_1' ||
    (url && (url.includes('demo_pdf_1') || url.includes('demo_pdf_2')));

  const cleanDriveData = driveCloudData.filter((l) => !isDemoUrl(l.drive_pdf_url, l.drive_pdf_file_id) && l.id !== 'lap_sample_1');
  const cleanServerData = serverData.filter((l) => !isDemoUrl(l.drive_pdf_url, l.drive_pdf_file_id) && l.id !== 'lap_sample_1');
  const cleanSupabaseData = supabaseData.filter((l) => !isDemoUrl(l.drive_pdf_url, l.drive_pdf_file_id) && l.id !== 'lap_sample_1');

  const mergedMap = new Map<string, Laporan>();
  cleanServerData.forEach((item) => { if (item && item.id) mergedMap.set(item.id, item); });
  cleanDriveData.forEach((item) => { if (item && item.id) mergedMap.set(item.id, item); });
  cleanSupabaseData.forEach((item) => { if (item && item.id) mergedMap.set(item.id, item); });

  const finalResult = Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.tanggal || Date.now()).getTime() - new Date(a.tanggal || Date.now()).getTime()
  );

  return NextResponse.json({ success: true, data: finalResult });
}
