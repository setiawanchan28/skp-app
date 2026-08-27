import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getStoredPenugasanList, saveStoredPenugasanList } from '@/lib/penugasanStore';
import { deleteFileFromDrive } from '@/lib/drive';

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'ID penugasan wajib diisi' }, { status: 400 });
    }

    const currentServerList = getStoredPenugasanList();
    const targetItem = currentServerList.find((l) => l.id === id);

    if (targetItem?.drive_pdf_file_id) {
      await deleteFileFromDrive(targetItem.drive_pdf_file_id);
    }

    const updatedServerList = currentServerList.filter((l) => l.id !== id);
    saveStoredPenugasanList(updatedServerList);

    if (isSupabaseConfigured()) {
      try {
        await supabaseAdmin.from('activity_documents').delete().eq('activity_id', id);
        await supabaseAdmin.from('activity_people').delete().eq('activity_id', id);
        await supabaseAdmin.from('activities').delete().eq('id', id);
        await supabaseAdmin.from('penugasan_petugas_ditemui').delete().eq('penugasan_id', id);
        await supabaseAdmin.from('penugasan_foto').delete().eq('penugasan_id', id);
        await supabaseAdmin.from('laporan_penugasan').delete().eq('id', id);
      } catch (err) {}
    }

    return NextResponse.json({
      success: true,
      message: 'Laporan Penugasan berhasil dihapus secara permanen!',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menghapus laporan penugasan' }, { status: 500 });
  }
}
