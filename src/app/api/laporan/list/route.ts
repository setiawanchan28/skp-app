import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';
import { Laporan } from '@/types/laporan';

const STORE_PATH = path.join(process.cwd(), 'public', 'laporan_store.json');

export function getStoredLaporanList(): Laporan[] {
  if (fs.existsSync(STORE_PATH)) {
    try {
      const data = fs.readFileSync(STORE_PATH, 'utf-8');
      return JSON.parse(data);
    } catch (e) {}
  }
  return [];
}

export function saveStoredLaporanList(list: Laporan[]) {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Failed to write laporan_store.json:', e);
  }
}

export async function GET() {
  let supabaseData: Laporan[] = [];

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
      console.warn('Supabase list fetch notice:', err);
    }
  }

  const serverData = getStoredLaporanList();

  const isDemoUrl = (url?: string, fileId?: string) =>
    fileId === 'demo_pdf_1' ||
    fileId === 'demo_pdf_2' ||
    fileId === 'lap_sample_1' ||
    (url && (url.includes('demo_pdf_1') || url.includes('demo_pdf_2')));

  const cleanServerData = serverData.filter((l) => !isDemoUrl(l.drive_pdf_url, l.drive_pdf_file_id) && l.id !== 'lap_sample_1');
  const cleanSupabaseData = supabaseData.filter((l) => !isDemoUrl(l.drive_pdf_url, l.drive_pdf_file_id) && l.id !== 'lap_sample_1');

  const mergedMap = new Map<string, Laporan>();
  cleanServerData.forEach((item) => { if (item && item.id) mergedMap.set(item.id, item); });
  cleanSupabaseData.forEach((item) => { if (item && item.id) mergedMap.set(item.id, item); });

  const finalResult = Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.tanggal || Date.now()).getTime() - new Date(a.tanggal || Date.now()).getTime()
  );

  return NextResponse.json({ success: true, data: finalResult });
}
