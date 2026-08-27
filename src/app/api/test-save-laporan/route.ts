import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { saveLaporanRecord } from '@/services/laporanService';

export async function GET(req: NextRequest) {
  const isConfigured = isSupabaseConfigured();
  let usersList: any[] = [];
  let userError: any = null;

  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    usersList = data?.users || [];
    userError = error;
  } catch (e: any) {
    userError = e.message;
  }

  const activeUserId = usersList.length > 0 ? usersList[0].id : '00000000-0000-0000-0000-000000000000';

  let saveResult: any = null;
  let saveError: any = null;

  const runTest = req.nextUrl.searchParams.get('run') === 'true';

  if (runTest) {
    try {
      const testActivity = {
        user_id: activeUserId,
        activity_type: 'NON_PERJALANAN_DINAS' as const,
        name: 'Tes Laporan Baru ' + new Date().toLocaleTimeString(),
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        start_time: '08:00',
        end_time: '16:00',
        description: 'Deskripsi tes pembuatan laporan',
        nama_pegawai: 'Pegawai BPS',
        nip: '199502282024211021',
        jabatan: 'Pranata Komputer'
      };

      saveResult = await saveLaporanRecord(testActivity);
    } catch (e: any) {
      saveError = { message: e.message, stack: e.stack };
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    isSupabaseConfigured: isConfigured,
    usersCount: usersList.length,
    activeUserId,
    saveResult,
    saveError,
  });
}
