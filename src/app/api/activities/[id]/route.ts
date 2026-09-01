import { NextRequest, NextResponse } from 'next/server';
import { fetchLaporanById, saveLaporanRecord } from '@/services/laporanService';
import { renameDriveResource } from '@/lib/drive';
import { formatDriveFolderName, formatDrivePdfName } from '@/utils/sanitizeFilename';

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

    const isForceChange = Boolean(
      body.is_force_change ||
      body.isForceChange ||
      activity?.isForceChange ||
      activity?.is_force_change
    );

    const existing = await fetchLaporanById(id);

    if (isForceChange && existing) {
      const targetName = activity?.name || existing.name;
      const targetStartDate = activity?.start_date || existing.start_date;

      if (existing.drive_folder_id && (targetName !== existing.name || targetStartDate !== existing.start_date)) {
        try {
          const newFolderName = formatDriveFolderName(targetStartDate, targetName);
          await renameDriveResource(existing.drive_folder_id, newFolderName);
        } catch (e) {}
      }

      if (existing.drive_pdf_file_id && (targetName !== existing.name || targetStartDate !== existing.start_date)) {
        try {
          const newPdfName = formatDrivePdfName(targetStartDate, targetName);
          await renameDriveResource(existing.drive_pdf_file_id, newPdfName);
        } catch (e) {}
      }
    }

    const saved = await saveLaporanRecord({ ...activity, id, isForceChange }, people, photos);
    return NextResponse.json({ success: true, data: saved });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
