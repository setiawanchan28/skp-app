import { NextRequest, NextResponse } from 'next/server';
import { generatePenugasanPdfBuffer } from '@/lib/pdfPenugasan';
import { generatePenugasanDocxBuffer } from '@/lib/docxPenugasan';
import { uploadFileToDrive, extractRawDriveFolderId } from '@/lib/drive';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { saveLaporanRecord } from '@/services/laporanService';
import { getStoredPenugasanList, saveStoredPenugasanList } from '@/lib/penugasanStore';
import { LaporanPenugasan, PetugasDitemui } from '@/types/penugasan';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const id = (formData.get('id') as string) || (typeof crypto !== 'undefined' ? crypto.randomUUID() : `penugasan_${Date.now()}`);
    const namaPegawai = (formData.get('namaPegawai') as string) || '';
    const nip = (formData.get('nip') as string) || '';
    const jabatan = (formData.get('jabatan') as string) || '';

    const namaKegiatan = (formData.get('namaKegiatan') as string) || '';
    const tanggalPerjadin = (formData.get('tanggalPerjadin') as string) || new Date().toISOString().split('T')[0];
    const tanggalSelesaiPerjadin = (formData.get('tanggalSelesaiPerjadin') as string) || undefined;
    const tempatTujuan = (formData.get('tempatTujuan') as string) || '';
    const nomorSurat = (formData.get('nomorSurat') as string) || '';
    const nomorSpd = (formData.get('nomorSpd') as string) || '';

    const petugasJson = (formData.get('petugasDitemui') as string) || '[]';
    let petugasDitemui: PetugasDitemui[] = [];
    try {
      petugasDitemui = JSON.parse(petugasJson);
    } catch (e) {}

    const resumeKegiatan = (formData.get('resumeKegiatan') as string) || '';

    // Process Photos
    const photosToEmbed: { buffer: Buffer; fileName: string; tanggalFoto?: string }[] = [];
    const photoRecords: any[] = [];

    let photoIndex = 0;
    while (formData.has(`photo_${photoIndex}`) || formData.has(`existing_drive_id_${photoIndex}`)) {
      const file = formData.get(`photo_${photoIndex}`) as File | null;
      const existingId = formData.get(`existing_drive_id_${photoIndex}`) as string | null;
      const photoDate = (formData.get(`photoDate_${photoIndex}`) as string) || tanggalPerjadin;

      if (file && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fileName = `Foto_Penugasan_${id}_${photoIndex + 1}.jpg`;

        photosToEmbed.push({ buffer, fileName, tanggalFoto: photoDate });
        photoRecords.push({
          laporan_id: id,
          file_name: fileName,
          tanggal_foto: photoDate,
        });
      } else if (existingId) {
        photoRecords.push({
          laporan_id: id,
          drive_file_id: existingId,
          tanggal_foto: photoDate,
        });
      }
      photoIndex++;
    }

    const penugasanRecord: LaporanPenugasan = {
      id,
      nama_pegawai: namaPegawai,
      nip,
      jabatan,
      nama_kegiatan: namaKegiatan,
      tanggal_perjadin: tanggalPerjadin,
      tanggal_selesai_perjadin: tanggalSelesaiPerjadin,
      tempat_tujuan: tempatTujuan,
      nomor_surat: nomorSurat,
      nomor_spd: nomorSpd,
      petugas_ditemui: petugasDitemui,
      resume_kegiatan: resumeKegiatan,
      fotos: photoRecords,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Generate PDF & Word Buffers
    const pdfBuffer = await generatePenugasanPdfBuffer(penugasanRecord, photosToEmbed);
    const docxBuffer = await generatePenugasanDocxBuffer(penugasanRecord, photosToEmbed);

    // Upload PDF to Google Drive
    const targetFolderId = extractRawDriveFolderId(process.env.GOOGLE_DRIVE_FOLDER_ID) || 'root';
    const pdfFileName = `Laporan_Penugasan_${namaPegawai.replace(/\s+/g, '_')}_${tanggalPerjadin}.pdf`;
    const docxFileName = `Laporan_Penugasan_${namaPegawai.replace(/\s+/g, '_')}_${tanggalPerjadin}.docx`;

    const drivePdf = await uploadFileToDrive(pdfBuffer, pdfFileName, 'application/pdf', targetFolderId);
    await uploadFileToDrive(docxBuffer, docxFileName, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', targetFolderId);

    if (drivePdf && drivePdf.id) {
      penugasanRecord.drive_pdf_url = drivePdf.webViewLink;
      penugasanRecord.drive_pdf_file_id = drivePdf.id;
      penugasanRecord.drive_folder_id = targetFolderId;
    }

    // Save to Server JSON Store
    const currentList = getStoredPenugasanList();
    const existingIndex = currentList.findIndex((l) => l.id === id);
    let updatedList: LaporanPenugasan[];
    if (existingIndex >= 0) {
      updatedList = [...currentList];
      updatedList[existingIndex] = penugasanRecord;
    } else {
      updatedList = [penugasanRecord, ...currentList];
    }
    saveStoredPenugasanList(updatedList);

    // Sync to Supabase DB via Unified Activities Model (activities, activity_people, activity_documents)
    try {
      const activityData = {
        id: penugasanRecord.id,
        activity_type: 'PERJALANAN_DINAS' as const,
        name: penugasanRecord.nama_kegiatan,
        start_date: penugasanRecord.tanggal_perjadin,
        end_date: penugasanRecord.tanggal_selesai_perjadin || penugasanRecord.tanggal_perjadin,
        destination: penugasanRecord.tempat_tujuan,
        letter_number: penugasanRecord.nomor_surat,
        spd_number: penugasanRecord.nomor_spd,
        description: penugasanRecord.resume_kegiatan,
        nama_pegawai: penugasanRecord.nama_pegawai,
        nip: penugasanRecord.nip,
        jabatan: penugasanRecord.jabatan,
        status: penugasanRecord.drive_pdf_url ? ('GENERATED' as const) : ('DRAFT' as const),
        drive_pdf_url: penugasanRecord.drive_pdf_url,
        drive_pdf_file_id: penugasanRecord.drive_pdf_file_id,
        drive_folder_id: penugasanRecord.drive_folder_id,
      };

      const peopleData = petugasDitemui.map((p) => ({
        person_name: p.nama,
        position: p.jabatan,
      }));

      const photosData = photoRecords.map((p) => ({
        id: p.id,
        documentation_date: p.tanggal_foto || penugasanRecord.tanggal_perjadin,
        original_filename: p.file_name || 'foto.jpg',
        drive_file_id: p.drive_file_id || '',
      }));

      await saveLaporanRecord(activityData, peopleData, photosData);
    } catch (err) {
      console.warn('Supabase activities sync notice for penugasan:', err);
    }

    return NextResponse.json({
      success: true,
      message: 'Laporan Penugasan BPS berhasil disimpan!',
      data: penugasanRecord,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menyimpan laporan penugasan' }, { status: 500 });
  }
}
