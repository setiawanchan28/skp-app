import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getStoredLaporanList } from '@/lib/laporanStore';
import fs from 'fs';
import path from 'path';

const PEGAWAI_STORE_PATH = path.join(process.cwd(), 'public', 'pegawai_store.json');

function getStoredPegawaiList() {
  if (fs.existsSync(PEGAWAI_STORE_PATH)) {
    try {
      const data = fs.readFileSync(PEGAWAI_STORE_PATH, 'utf-8');
      return JSON.parse(data);
    } catch (e) {}
  }
  return [];
}

export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error: 'NEXT_PUBLIC_SUPABASE_URL atau NEXT_PUBLIC_SUPABASE_ANON_KEY belum dikonfigurasi di Vercel Environment Variables!',
        configured: false,
      },
      { status: 400 }
    );
  }

  const results = {
    pegawaiSynced: 0,
    laporanSynced: 0,
    errors: [] as string[],
  };

  // 1. Push Pegawai List to Supabase DB using Admin client
  try {
    const pegawaiList = getStoredPegawaiList();
    for (const p of pegawaiList) {
      const { error } = await supabaseAdmin.from('pegawai').upsert({
        id: p.id,
        nama: p.nama,
        nip: p.nip,
        jabatan: p.jabatan,
        email: p.email || '',
      });
      if (error) {
        results.errors.push(`Tabel pegawai: ${error.message}`);
      } else {
        results.pegawaiSynced++;
      }
    }
  } catch (err: any) {
    results.errors.push(`Tabel pegawai exception: ${err.message}`);
  }

  // 2. Push Laporan List to Supabase DB using Admin client
  try {
    const laporanList = getStoredLaporanList();
    for (const lap of laporanList) {
      const dbRecord: Record<string, any> = {
        id: lap.id,
        nama_pegawai: lap.nama_pegawai,
        nip: lap.nip,
        jabatan: lap.jabatan,
        tanggal: lap.tanggal,
        nama_kegiatan: lap.nama_kegiatan,
        deskripsi_kegiatan: lap.deskripsi_kegiatan,
        ringkasan_kegiatan: lap.ringkasan_kegiatan,
        kategori: lap.kategori || 'Lainnya',
        drive_pdf_url: lap.drive_pdf_url,
        drive_pdf_file_id: lap.drive_pdf_file_id,
        drive_folder_id: lap.drive_folder_id,
        created_at: lap.created_at || new Date().toISOString(),
        updated_at: lap.updated_at || new Date().toISOString(),
      };

      if (lap.tanggal_selesai) {
        dbRecord.tanggal_selesai = lap.tanggal_selesai;
      }

      const { error } = await supabaseAdmin.from('laporan').upsert(dbRecord);
      if (error) {
        results.errors.push(`Tabel laporan (${lap.nama_kegiatan}): ${error.message}`);
      } else {
        results.laporanSynced++;

        // Sync fotos if present
        if (lap.fotos && lap.fotos.length > 0) {
          await supabaseAdmin.from('laporan_foto').delete().eq('laporan_id', lap.id);
          await supabaseAdmin.from('laporan_foto').insert(
            lap.fotos.map((f) => ({
              laporan_id: lap.id,
              drive_file_id: f.drive_file_id,
              drive_file_url: f.drive_file_url,
              file_name: f.file_name,
              tanggal_foto: f.tanggal_foto,
            }))
          );
        }
      }
    }
  } catch (err: any) {
    results.errors.push(`Tabel laporan exception: ${err.message}`);
  }

  return NextResponse.json({
    success: results.errors.length === 0,
    message: results.errors.length === 0
      ? `Sinkronisasi paksa ke Supabase DB berhasil! (${results.pegawaiSynced} Pegawai, ${results.laporanSynced} Laporan)`
      : `Sinkronisasi ke Supabase DB selesai dengan beberapa catatan (${results.errors.join('; ')})`,
    data: results,
  });
}
