import { NextRequest, NextResponse } from 'next/server';
import { trashLaporanRecord, restoreLaporanRecord, permanentDeleteLaporanRecord } from '@/services/laporanService';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const userToken = req.headers.get('x-google-token') || body.user_drive_token || body.provider_token || undefined;
    const action = body.action || 'trash'; // 'trash' | 'restore' | 'permanent'

    if (action === 'restore') {
      const ok = await restoreLaporanRecord(id);
      return NextResponse.json({ success: ok });
    } else if (action === 'permanent') {
      const ok = await permanentDeleteLaporanRecord(id, userToken);
      return NextResponse.json({ success: ok });
    } else {
      const ok = await trashLaporanRecord(id);
      return NextResponse.json({ success: ok });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
