import { NextRequest, NextResponse } from 'next/server';
import { fetchLaporanById, saveLaporanRecord } from '@/services/laporanService';
import { generateBpsPdfBuffer } from '@/lib/pdf';
import { getOrCreateActivityDriveFolder, uploadFileToDrive } from '@/lib/drive';
import { formatDrivePdfName } from '@/utils/sanitizeFilename';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const idempotencyKey = body.idempotency_key || `gen_${id}_${Date.now()}`;

    let activity = await fetchLaporanById(id);

    if (!activity && body.activityData) {
      activity = body.activityData;
    }

    if (body.activityData) {
      try {
        const saved = await saveLaporanRecord(
          body.activityData,
          body.activityData.people || body.activityData.petugas_ditemui,
          body.activityData.documents || body.activityData.fotos
        );
        if (saved) activity = saved;
      } catch (e) {}
    }

    if (!activity) {
      return NextResponse.json({ success: false, error: 'Kegiatan tidak ditemukan di database maupun cache browser!' }, { status: 404 });
    }

    // Check required fields before generation (PRD/SRS)
    if (!activity.name || !activity.start_date || !activity.end_date || !activity.start_time || !activity.end_time) {
      return NextResponse.json(
        { success: false, error: 'Data kegiatan belum lengkap (Nama, Tanggal, Jam Wajib Diisi)!' },
        { status: 400 }
      );
    }

    if (activity.activity_type === 'PERJALANAN_DINAS') {
      if (!activity.destination || !activity.letter_number || !activity.spd_number) {
        return NextResponse.json(
          { success: false, error: 'Keterangan Perjalanan Dinas (Tujuan, No Surat, No SPD) wajib diisi!' },
          { status: 400 }
        );
      }
    }

    // 1. Log processing generation for idempotency
    if (isSupabaseConfigured()) {
      try {
        await supabaseAdmin.from('activity_generations').insert({
          activity_id: id,
          idempotency_key: idempotencyKey,
          status: 'PROCESSING',
        });
      } catch (e) {}
    }

    // 2. Render PDF Buffer
    const rawPhotos = activity.documents || (activity as any).fotos || [];
    const mappedPhotos = rawPhotos
      .map((doc: any) => {
        const srcUrl = typeof doc === 'string' ? doc : doc.base64 || doc.previewUrl || doc.web_view_url || doc.preview_url || doc.existingUrl || doc.url || '';
        return {
          base64: srcUrl,
          tanggal_foto: typeof doc === 'object' ? doc.tanggal_foto || doc.documentation_date || activity.start_date : activity.start_date,
        };
      })
      .filter((p: any) => Boolean(p.base64));

    const pdfData = {
      namaKegiatan: activity.name,
      tanggal: activity.start_date,
      tanggalSelesai: activity.end_date,
      jamMulai: activity.start_time,
      jamSelesai: activity.end_time,
      deskripsiKegiatan: activity.description || '',
      ringkasanKegiatan: activity.description || '',
      jenisLaporan: (activity.activity_type === 'PERJALANAN_DINAS' ? 'penugasan' : 'harian') as 'harian' | 'penugasan',
      tempatTujuan: activity.destination,
      nomorSurat: activity.letter_number,
      nomorSpd: activity.spd_number,
      petugasDitemui: activity.people?.map((p) => ({ nama: p.person_name, jabatan: p.position })),
      namaPegawai: activity.nama_pegawai || 'Dede Setiawan, S.Tr.Stat.',
      nip: activity.nip || '199502282024211021',
      jabatan: activity.jabatan || 'Pranata Komputer Ahli Pertama',
      photos: mappedPhotos,
      fotos: mappedPhotos,
    };

    const pdfBuffer = await generateBpsPdfBuffer(pdfData);

    const userGoogleToken =
      req.headers.get('x-google-token') ||
      body.user_drive_token ||
      body.google_token ||
      body.activityData?.provider_token;

    // 3. Create or get activity folder on Google Drive
    const driveFolder = await getOrCreateActivityDriveFolder(activity.start_date, activity.name, userGoogleToken);
    const pdfFileName = formatDrivePdfName(activity.start_date, activity.name);

    // 4. Upload / Update PDF to Google Drive idempotently
    const driveResult = await uploadFileToDrive(
      pdfBuffer,
      pdfFileName,
      'application/pdf',
      driveFolder.activityFolderId,
      activity.drive_pdf_file_id,
      userGoogleToken
    );

    // 4b. Upload separate documentation photo files to "Dokumentasi Foto" subfolder in Google Drive
    const targetFolderId = driveFolder.dokumentasiFolderId || driveFolder.activityFolderId;
    for (let pIdx = 0; pIdx < mappedPhotos.length; pIdx++) {
      const photoItem = mappedPhotos[pIdx];
      if (photoItem.base64 && photoItem.base64.startsWith('data:image/')) {
        try {
          const matches = photoItem.base64.match(/^data:(image\/\w+);base64,(.+)$/);
          if (matches) {
            const photoMime = matches[1];
            const ext = photoMime.includes('png') ? 'png' : 'jpg';
            const photoBuffer = Buffer.from(matches[2], 'base64');
            const photoDate = photoItem.tanggal_foto || activity.start_date;
            const photoFileName = `${formatDrivePdfName(photoDate, `${activity.name} - Foto ${pIdx + 1}`)}.${ext}`;
            await uploadFileToDrive(
              photoBuffer,
              photoFileName,
              photoMime,
              targetFolderId,
              undefined,
              userGoogleToken
            );
          }
        } catch (photoErr) {
          console.warn(`Failed to upload separate photo ${pIdx + 1} to Drive:`, photoErr);
        }
      }
    }

    // 5. Update Activity status to GENERATED and lock identity fields
    const nowIso = new Date().toISOString();
    const updatedActivity = await saveLaporanRecord(
      {
        ...activity,
        id,
        status: 'GENERATED',
        generated_at: activity.generated_at || nowIso,
        drive_pdf_url: driveResult.webViewLink,
        drive_pdf_file_id: driveResult.id,
        drive_folder_id: driveFolder.activityFolderId,
      },
      activity.people || (activity as any).petugas_ditemui,
      activity.documents || (activity as any).fotos
    );

    // 6. Update generation status & write audit log
    if (isSupabaseConfigured()) {
      try {
        await supabaseAdmin
          .from('activity_generations')
          .update({
            status: 'SUCCESS',
            pdf_drive_file_id: driveResult.id,
            completed_at: nowIso,
          })
          .eq('activity_id', id)
          .eq('idempotency_key', idempotencyKey);

        await supabaseAdmin.from('activity_audit_log').insert({
          user_id: activity.user_id,
          activity_id: id,
          action: 'PDF_GENERATED',
          metadata: {
            pdf_file_id: driveResult.id,
            pdf_url: driveResult.webViewLink,
            timestamp: nowIso,
          },
        });
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      data: {
        activity: updatedActivity,
        pdf_url: driveResult.webViewLink,
        pdf_file_id: driveResult.id,
      },
    });
  } catch (err: any) {
    console.error('API Generate PDF Exception:', err);
    return NextResponse.json({ success: false, error: err.message || 'Gagal menghasilkan PDF' }, { status: 500 });
  }
}
