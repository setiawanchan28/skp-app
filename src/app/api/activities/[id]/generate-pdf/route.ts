import { NextRequest, NextResponse } from 'next/server';
import { fetchLaporanById, saveLaporanRecord } from '@/services/laporanService';
import { generateBpsPdfBuffer } from '@/lib/pdf';
import { getOrCreateActivityDriveFolder, uploadFileToDrive, downloadDriveFileBuffer } from '@/lib/drive';
import { formatDrivePdfName, formatDrivePhotoName } from '@/utils/sanitizeFilename';
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
    const rawPhotos =
      body.activityData?.documents ||
      body.activityData?.fotos ||
      activity.documents ||
      (activity as any).fotos ||
      [];

    const mappedPhotos = rawPhotos
      .map((doc: any) => {
        const srcUrl =
          typeof doc === 'string'
            ? doc
            : doc.base64 ||
              doc.previewUrl ||
              doc.web_view_url ||
              doc.preview_url ||
              doc.existingUrl ||
              doc.url ||
              (doc.drive_file_id ? `https://drive.google.com/thumbnail?id=${doc.drive_file_id}&sz=w1000` : '');
        return {
          id: typeof doc === 'object' ? doc.id : undefined,
          original_filename: typeof doc === 'object' ? doc.original_filename || doc.file_name || doc.name : 'Foto.jpg',
          name: typeof doc === 'object' ? doc.name || doc.file_name || doc.original_filename : 'Foto.jpg',
          drive_file_id: typeof doc === 'object' ? doc.drive_file_id || '' : '',
          base64: srcUrl,
          previewUrl: srcUrl,
          tanggal_foto: typeof doc === 'object' ? doc.tanggal_foto || doc.documentation_date || activity.start_date : activity.start_date,
        };
      })
      .filter((p: any) => Boolean(p.base64));

    const pdfData = {
      namaKegiatan: activity.name,
      tanggal: activity.start_date,
      tanggalSelesai: activity.end_date,
      startTime: activity.start_time || (activity as any).startTime || (activity as any).jam_mulai || '08:00',
      endTime: activity.end_time || (activity as any).endTime || (activity as any).jam_selesai || '16:00',
      start_time: activity.start_time || (activity as any).startTime || (activity as any).jam_mulai || '08:00',
      end_time: activity.end_time || (activity as any).endTime || (activity as any).jam_selesai || '16:00',
      jamMulai: activity.start_time || (activity as any).startTime || (activity as any).jam_mulai || '08:00',
      jamSelesai: activity.end_time || (activity as any).endTime || (activity as any).jam_selesai || '16:00',
      jam_mulai: activity.start_time || (activity as any).startTime || (activity as any).jam_mulai || '08:00',
      jam_selesai: activity.end_time || (activity as any).endTime || (activity as any).jam_selesai || '16:00',
      deskripsiKegiatan: activity.description || '',
      ringkasanKegiatan: activity.description || '',
      jenisLaporan: (activity.activity_type === 'PERJALANAN_DINAS' ? 'penugasan' : 'harian') as 'harian' | 'penugasan',
      tempatTujuan: activity.destination,
      nomorSurat: activity.letter_number,
      nomorSpd: activity.spd_number,
      petugasDitemui: activity.people?.map((p) => ({ nama: p.person_name, jabatan: p.position })),
      namaPegawai: body.namaPegawai || body.nama_pegawai || body.activityData?.namaPegawai || body.activityData?.nama_pegawai || activity.nama_pegawai || (activity as any)?.nama_pegawai || 'Dede Setiawan, A.Md.',
      nip: body.nip || body.activityData?.nip || activity.nip || (activity as any)?.nip || '199502282024211021',
      jabatan: body.jabatan || body.activityData?.jabatan || body.activityData?.position || activity.jabatan || (activity as any)?.jabatan || 'Pranata Komputer Terampil',
      photos: mappedPhotos,
      fotos: mappedPhotos,
    };

    const pdfBuffer = await generateBpsPdfBuffer(pdfData);

    const userGoogleToken =
      req.headers.get('x-google-token') ||
      body.user_drive_token ||
      body.google_token ||
      body.activityData?.provider_token;

    // 3. Create or get activity folder on Google Drive (with time range suffix to isolate identical daily activities)
    const startTimeVal = activity.start_time || (activity as any).startTime || (activity as any).jam_mulai;
    const endTimeVal = activity.end_time || (activity as any).endTime || (activity as any).jam_selesai;

    const driveFolder = await getOrCreateActivityDriveFolder(
      activity.start_date,
      activity.name,
      userGoogleToken,
      startTimeVal,
      endTimeVal
    );
    const pdfFileName = formatDrivePdfName(
      activity.start_date,
      activity.name,
      startTimeVal,
      endTimeVal
    );

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
    const updatedDocuments = [...mappedPhotos];

    for (let pIdx = 0; pIdx < mappedPhotos.length; pIdx++) {
      const photoItem = mappedPhotos[pIdx];
      const photoSrc = photoItem.base64 || photoItem.previewUrl;
      const rawDriveId = photoItem.drive_file_id;
      const isRealDriveId = rawDriveId && !rawDriveId.startsWith('foto_') && !rawDriveId.startsWith('mock_') && rawDriveId.length < 45 && !rawDriveId.includes('-');

      if (photoSrc || isRealDriveId) {
        try {
          let photoBuffer: Buffer | null = null;
          let photoMime = 'image/jpeg';

          if (photoSrc && photoSrc.startsWith('data:image/')) {
            const matches = photoSrc.match(/^data:(image\/\w+);base64,(.+)$/);
            if (matches) {
              photoMime = matches[1];
              photoBuffer = Buffer.from(matches[2], 'base64');
            }
          } else if (isRealDriveId) {
            const downloaded = await downloadDriveFileBuffer(rawDriveId, userGoogleToken);
            if (downloaded) {
              photoBuffer = downloaded.buffer;
              photoMime = downloaded.mimeType;
            }
          } else if (photoSrc && (photoSrc.startsWith('http://') || photoSrc.startsWith('https://'))) {
            const resPhoto = await fetch(photoSrc);
            const contentType = resPhoto.headers.get('content-type') || '';
            if (resPhoto.ok && !contentType.includes('text/html')) {
              const arrayBuf = await resPhoto.arrayBuffer();
              const tempBuf = Buffer.from(arrayBuf);
              const headerStr = tempBuf.toString('utf-8', 0, 100);
              if (!headerStr.toLowerCase().includes('<!doctype') && !headerStr.toLowerCase().includes('<html')) {
                photoBuffer = tempBuf;
                if (contentType) photoMime = contentType;
              }
            }
          }

          if (photoBuffer) {
            const ext = photoMime.includes('png') ? 'png' : 'jpg';
            const photoDate = photoItem.tanggal_foto || activity.start_date;
            const photoFileName = formatDrivePhotoName(
              photoDate,
              activity.name,
              pIdx,
              ext,
              startTimeVal,
              endTimeVal
            );

            // Only reuse drive_file_id if it looks like a real Google Drive ID (not local string/UUID)
            const rawDriveId = photoItem.drive_file_id;
            const isRealDriveId = rawDriveId && !rawDriveId.startsWith('foto_') && !rawDriveId.startsWith('mock_') && rawDriveId.length < 45 && !rawDriveId.includes('-');
            const existingPhotoId = isRealDriveId ? rawDriveId : undefined;

            const uploadedDrivePhoto = await uploadFileToDrive(
              photoBuffer,
              photoFileName,
              photoMime,
              targetFolderId,
              existingPhotoId,
              userGoogleToken
            );

            if (uploadedDrivePhoto && uploadedDrivePhoto.id) {
              const driveThumbUrl = `https://drive.google.com/thumbnail?id=${uploadedDrivePhoto.id}&sz=w1000`;
              updatedDocuments[pIdx] = {
                ...updatedDocuments[pIdx],
                drive_file_id: uploadedDrivePhoto.id,
                drive_name: uploadedDrivePhoto.name || photoFileName,
                web_view_url: uploadedDrivePhoto.webViewLink,
                previewUrl: driveThumbUrl,
                existingUrl: driveThumbUrl,
                base64: photoSrc.startsWith('data:image/') ? photoSrc : driveThumbUrl,
              };
            }
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
        documents: updatedDocuments,
        fotos: updatedDocuments,
      },
      activity.people || (activity as any).petugas_ditemui,
      updatedDocuments
    );

    // 6. Update generation status & write audit log
    if (isSupabaseConfigured()) {
      try {
        await supabaseAdmin
          .from('activity_generations')
          .upsert(
            {
              activity_id: id,
              idempotency_key: idempotencyKey,
              status: 'SUCCESS',
              pdf_drive_file_id: driveResult.id,
              completed_at: nowIso,
            },
            { onConflict: 'activity_id,idempotency_key' }
          );

        await supabaseAdmin.from('activity_documents').insert({
          activity_id: id,
          documentation_date: nowIso,
          original_filename: `${activity.name || 'Laporan'}.pdf`,
          mime_type: 'application/pdf',
          file_size_bytes: 0,
          kind: 'PDF',
          drive_file_id: driveResult.id,
          drive_name: `${activity.name || 'Laporan'}.pdf`,
          sort_order: 0,
        });

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
      } catch (e) {
        console.warn('Supabase PDF generation audit record warning:', e);
      }
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
