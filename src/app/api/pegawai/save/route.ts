import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';
import { Pegawai } from '@/types/pegawai';

const STORE_PATH = path.join(process.cwd(), 'public', 'pegawai_store.json');

function getStoredPegawai(): Pegawai[] {
  if (fs.existsSync(STORE_PATH)) {
    try {
      const data = fs.readFileSync(STORE_PATH, 'utf-8');
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
      created_at: new Date().toISOString(),
    },
  ];
}

function saveStoredPegawai(list: Pegawai[]) {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Failed to write pegawai_store.json:', e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, nama, nip, jabatan, email } = body;

    if (!nama || !nip) {
      return NextResponse.json({ error: 'Nama dan NIP wajib diisi!' }, { status: 400 });
    }

    const currentList = getStoredPegawai();
    const targetId = id || 'peg-main';

    const newRecord: Pegawai = {
      id: targetId,
      nama: nama.trim(),
      nip: nip.trim(),
      jabatan: jabatan ? jabatan.trim() : 'Pranata Komputer Ahli Pertama',
      email: email ? email.trim() : 'ddsetiawan28@gmail.com',
      updated_at: new Date().toISOString(),
    };

    const existingIndex = currentList.findIndex(
      (p) => p.id === targetId || p.nip === newRecord.nip || (p.email && p.email === newRecord.email)
    );

    let updatedList: Pegawai[];
    if (existingIndex >= 0) {
      updatedList = [...currentList];
      updatedList[existingIndex] = { ...updatedList[existingIndex], ...newRecord };
    } else {
      updatedList = [newRecord, ...currentList];
    }

    saveStoredPegawai(updatedList);

    // Sync to Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('pegawai').upsert({
          id: newRecord.id,
          nama: newRecord.nama,
          nip: newRecord.nip,
          jabatan: newRecord.jabatan,
          email: newRecord.email,
        });
      } catch (err) {
        console.warn('Supabase pegawai upsert notice:', err);
      }
    }

    return NextResponse.json({
      success: true,
      data: newRecord,
      message: 'Profil pegawai berhasil diperbarui secara online!',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menyimpan profil pegawai' }, { status: 500 });
  }
}

export async function GET() {
  const list = getStoredPegawai();
  return NextResponse.json({ success: true, data: list });
}
