import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getStoredPenugasanList } from '@/lib/penugasanStore';
import { LaporanPenugasan } from '@/types/penugasan';

export async function GET() {
  let supabaseData: LaporanPenugasan[] = [];

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin
        .from('laporan_penugasan')
        .select(`
          *,
          petugas_ditemui:penugasan_petugas_ditemui(*),
          fotos:penugasan_foto(*)
        `)
        .order('tanggal_perjadin', { ascending: false });

      if (!error && data) {
        supabaseData = data;
      }
    } catch (err) {}
  }

  const serverData = getStoredPenugasanList();

  const mergedMap = new Map<string, LaporanPenugasan>();
  serverData.forEach((item) => { if (item && item.id) mergedMap.set(item.id, item); });
  supabaseData.forEach((item) => { if (item && item.id) mergedMap.set(item.id, item); });

  const finalResult = Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.tanggal_perjadin || Date.now()).getTime() - new Date(a.tanggal_perjadin || Date.now()).getTime()
  );

  return NextResponse.json({ success: true, data: finalResult });
}
