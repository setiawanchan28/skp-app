import { NextRequest, NextResponse } from 'next/server';
import { fetchLaporanById, saveLaporanRecord, checkActivityNameCollision } from '@/services/laporanService';
import { renameDriveResource } from '@/lib/drive';
import { formatDriveFolderName, formatDrivePdfName } from '@/utils/sanitizeFilename';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { new_name, new_start_date, new_end_date, new_start_time, new_end_time, new_spd_number } = body;

    const existing = await fetchLaporanById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Kegiatan tidak ditemukan' }, { status: 404 });
    }

    const targetName = new_name || existing.name;
    const targetStartDate = new_start_date || existing.start_date;
    const userId = existing.user_id || '00000000-0000-0000-0000-000000000000';

    // 1. Collision check if name changes
    if (new_name && new_name !== existing.name) {
      const isCollision = await checkActivityNameCollision(userId, new_name, id);
      if (isCollision) {
        return NextResponse.json(
          { success: false, error: 'Kegiatan dengan nama tersebut sudah ada. Silakan gunakan nama kegiatan yang berbeda.' },
          { status: 400 }
        );
      }
    }

    // 2. Rename Google Drive resources if generated
    if (existing.drive_folder_id) {
      const newFolderName = formatDriveFolderName(targetStartDate, targetName);
      await renameDriveResource(existing.drive_folder_id, newFolderName);
    }

    if (existing.drive_pdf_file_id) {
      const newPdfName = formatDrivePdfName(targetStartDate, targetName);
      await renameDriveResource(existing.drive_pdf_file_id, newPdfName);
    }

    // 3. Force update database record
    const updated = await saveLaporanRecord(
      {
        ...existing,
        id,
        name: targetName,
        start_date: targetStartDate,
        end_date: new_end_date || existing.end_date,
        start_time: new_start_time || existing.start_time,
        end_time: new_end_time || existing.end_time,
        spd_number: new_spd_number || existing.spd_number,
      },
      existing.people,
      existing.documents
    );

    // 4. Record audit log
    if (isSupabaseConfigured()) {
      try {
        await supabaseAdmin.from('activity_audit_log').insert({
          user_id: userId,
          activity_id: id,
          action: 'FORCE_CHANGE',
          metadata: {
            old_name: existing.name,
            new_name: targetName,
            old_start_date: existing.start_date,
            new_start_date: targetStartDate,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (e) {}
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
