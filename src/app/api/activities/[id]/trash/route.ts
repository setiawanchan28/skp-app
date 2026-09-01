import { NextRequest, NextResponse } from 'next/server';
import { trashLaporanRecord, restoreLaporanRecord, permanentDeleteLaporanRecord, fetchLaporanById } from '@/services/laporanService';
import { deleteFileFromDrive } from '@/lib/drive';

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
      try {
        const existing = await fetchLaporanById(id);
        if (existing) {
          if (existing.drive_pdf_file_id) {
            await deleteFileFromDrive(existing.drive_pdf_file_id, userToken);
          }
          const docs = existing.documents || (existing as any).fotos || [];
          for (const d of docs) {
            if (d.drive_file_id) {
              await deleteFileFromDrive(d.drive_file_id, userToken);
            }
          }
        }
      } catch (e) {
        console.warn('Failed to delete Drive files on permanent delete:', e);
      }

      const ok = await permanentDeleteLaporanRecord(id);
      return NextResponse.json({ success: ok });
    } else {
      const ok = await trashLaporanRecord(id);
      return NextResponse.json({ success: ok });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
