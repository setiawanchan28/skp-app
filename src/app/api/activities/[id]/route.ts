import { NextRequest, NextResponse } from 'next/server';
import { fetchLaporanById, saveLaporanRecord } from '@/services/laporanService';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const activity = await fetchLaporanById(id);
    if (!activity) {
      return NextResponse.json({ success: false, error: 'Kegiatan tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: activity });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { activity, people, photos } = body;

    const saved = await saveLaporanRecord({ ...activity, id }, people, photos);
    return NextResponse.json({ success: true, data: saved });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
