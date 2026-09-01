import { NextRequest, NextResponse } from 'next/server';
import { fetchLaporanList, saveLaporanRecord, checkActivityNameCollision } from '@/services/laporanService';
import { syncDraftPhotosToDrive } from '@/lib/drive';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeTrashed = searchParams.get('trashed') === 'true';
    const list = await fetchLaporanList(includeTrashed);
    return NextResponse.json({ success: true, data: list });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { activity, people, photos } = body;

    if (!activity || !activity.name) {
      return NextResponse.json({ success: false, error: 'Nama kegiatan wajib diisi!' }, { status: 400 });
    }

    const userId = activity.user_id || '00000000-0000-0000-0000-000000000000';
    const isCollision = await checkActivityNameCollision(userId, activity.name);
    if (isCollision) {
      return NextResponse.json(
        { success: false, error: 'Kegiatan dengan nama tersebut sudah ada. Silakan gunakan nama kegiatan yang berbeda.' },
        { status: 400 }
      );
    }

    const userToken = req.headers.get('x-google-token') || body.user_drive_token || body.provider_token || undefined;
    const syncedPhotos = await syncDraftPhotosToDrive(activity, photos || [], userToken);

    const saved = await saveLaporanRecord(activity, people, syncedPhotos);
    return NextResponse.json({ success: true, data: saved });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
