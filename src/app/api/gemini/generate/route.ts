import { NextRequest, NextResponse } from 'next/server';
import { generateBpsSummary } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { namaKegiatan, deskripsiKegiatan, namaPegawai, jumlahParagraf } = body;

    if (!namaKegiatan || !deskripsiKegiatan) {
      return NextResponse.json(
        { error: 'Nama kegiatan dan deskripsi kegiatan wajib diisi' },
        { status: 400 }
      );
    }

    const ringkasan = await generateBpsSummary(
      namaKegiatan,
      deskripsiKegiatan,
      namaPegawai,
      jumlahParagraf || 'auto'
    );

    return NextResponse.json({
      success: true,
      ringkasan,
    });
  } catch (error: any) {
    console.error('API Gemini generate error:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal menghasilkan ringkasan dengan AI' },
      { status: 500 }
    );
  }
}
