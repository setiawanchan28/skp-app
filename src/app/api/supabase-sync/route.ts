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
  return [
    {
      id: 'peg-main',
      nama: 'Dede Setiawan, S.Tr.Stat.',
      nip: '199502282024211021',
      jabatan: 'Pranata Komputer Ahli Pertama',
      email: 'ddsetiawan28@gmail.com',
    },
  ];
}

export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error: 'Variabel lingkungan NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di Vercel/Server belum dikonfigurasi!',
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
        id: p.id || 'peg-main',
        nama: p.nama,
        nip: p.nip,
        jabatan: p.jabatan,
        email: p.email || 'ddsetiawan28@gmail.com',
      });
      if (error) {
        results.errors.push(`Pegawai upsert error (${p.nama}): ${error.message}`);
      } else {
        results.pegawaiSynced++;
      }
    }
  } catch (err: any) {
    results.errors.push(`Pegawai sync exception: ${err.message}`);
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
        results.errors.push(`Laporan upsert error (${lap.nama_kegiatan}): ${error.message}`);
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
    results.errors.push(`Laporan sync exception: ${err.message}`);
  }

  return NextResponse.json({
    success: true,
    message: 'Sinkronisasi paksa ke Supabase DB selesai!',
    data: results,
  });
}
