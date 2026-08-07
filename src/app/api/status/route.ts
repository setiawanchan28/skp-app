import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

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
      const { count: pCount, error: pErr } = await supabaseAdmin
        .from('pegawai')
        .select('*', { count: 'exact', head: true });

      const { count: lCount, error: lErr } = await supabaseAdmin
        .from('laporan')
        .select('*', { count: 'exact', head: true });

      if (!pErr && !lErr) {
        dbConnected = true;
        pegawaiCount = pCount || 0;
        laporanCount = lCount || 0;
      } else {
        errorMessage = pErr?.message || lErr?.message || 'Gagal membaca tabel Supabase';
      }
    } catch (err: any) {
      errorMessage = err.message || 'Eksepsi saat menghubungkan ke Supabase';
    }
  } else {
    errorMessage = 'Variabel lingkungan NEXT_PUBLIC_SUPABASE_URL atau NEXT_PUBLIC_SUPABASE_ANON_KEY di Vercel belum diisi!';
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
