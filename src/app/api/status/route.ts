import { NextResponse } from 'next/server';
import { supabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const isConfigured = isSupabaseConfigured();

  let pegawaiCount = 0;
  let laporanCount = 0;
  let dbConnected = false;
  let errorMessage: string | null = null;

  if (isConfigured) {
    try {
      const client = serviceKey && !serviceKey.includes('dummy') ? supabaseAdmin : supabase;

      // 1. Fetch actual rows for Pegawai
      const { data: pData, error: pErr } = await client
        .from('pegawai')
        .select('id, nama, nip');

      // 2. Fetch actual rows for Laporan
      const { data: lData, error: lErr } = await client
        .from('laporan')
        .select('id, nama_kegiatan');

      if (!pErr && pData) {
        pegawaiCount = pData.length;
        dbConnected = true;
      } else if (pErr) {
        errorMessage = `Tabel pegawai: ${pErr.message}`;
      }

      if (!lErr && lData) {
        laporanCount = lData.length;
        dbConnected = true;
      } else if (lErr) {
        errorMessage = errorMessage ? `${errorMessage}; Tabel laporan: ${lErr.message}` : `Tabel laporan: ${lErr.message}`;
      }
    } catch (err: any) {
      errorMessage = err.message || 'Eksepsi saat membaca Supabase DB';
    }
  } else {
    errorMessage = 'NEXT_PUBLIC_SUPABASE_URL atau NEXT_PUBLIC_SUPABASE_ANON_KEY belum dikonfigurasi!';
  }

  return NextResponse.json({
    success: true,
    connected: dbConnected,
    isConfigured,
    supabaseUrl: url.replace(/\/+$/, ''),
    pegawaiCountInDb: pegawaiCount,
    laporanCountInDb: laporanCount,
    hasServiceKey: Boolean(serviceKey && !serviceKey.includes('dummy')),
    hasAnonKey: Boolean(anonKey && !anonKey.includes('dummy')),
    errorMessage,
  });
}
