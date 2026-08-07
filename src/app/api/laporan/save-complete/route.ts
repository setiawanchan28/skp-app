import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateFolderHierarchy, uploadFileToDrive, deleteFileFromDrive, syncLaporanToDriveCloud } from '@/lib/drive';
import { generateBpsPdfBuffer } from '@/lib/pdf';
import { generateBpsDocxBuffer } from '@/lib/docx';
import { saveLaporanRecord, fetchLaporanById } from '@/services/laporanService';
import { generatePhotoFilename, generatePdfFilename, sanitizeFilename } from '@/utils/sanitizeFilename';
import { LaporanFoto } from '@/types/laporan';
import { getStoredLaporanList, saveStoredLaporanList } from '@/lib/laporanStore';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const id = formData.get('id') as string | null;
    const nama_pegawai = formData.get('nama_pegawai') as string;
    const nip = formData.get('nip') as string;
    const jabatan = formData.get('jabatan') as string;
    const tanggal = formData.get('tanggal') as string;
    const tanggal_selesai = (formData.get('tanggal_selesai') as string) || undefined;
    const nama_kegiatan = formData.get('nama_kegiatan') as string;
    const deskripsi_kegiatan = formData.get('deskripsi_kegiatan') as string;
    const ringkasan_kegiatan = formData.get('ringkasan_kegiatan') as string;
    const kategori = (formData.get('kategori') as string) || 'Lainnya';
    const photosMetadataRaw = formData.get('photos_metadata') as string | null;

    let photoMetadataParsed: { index: number; tanggal_foto?: string }[] = [];
    if (photosMetadataRaw) {
      try {
        photoMetadataParsed = JSON.parse(photosMetadataRaw);
      } catch (e) {}
    }

    if (!nama_pegawai || !nip || !tanggal || !nama_kegiatan || !ringkasan_kegiatan) {
      return NextResponse.json(
        { error: 'Mohon lengkapi semua bidang wajib!' },
        { status: 400 }
      );
    }

    let existingLaporan = id ? await fetchLaporanById(id) : null;

    // 1. Resolve Drive Hierarchy
    const folderStructure = await getOrCreateFolderHierarchy(tanggal);

    // 2. Extract and Upload Photos to Drive "Dokumentasi" folder
    const photoFiles = formData.getAll('photos') as File[];
    const photosData: LaporanFoto[] = [];
    const photoObjects: { base64: string; tanggal_foto?: string }[] = [];

    if (existingLaporan && existingLaporan.fotos && photoFiles.length === 0) {
      existingLaporan.fotos.forEach((f) => photosData.push(f));
    }

    for (let i = 0; i < photoFiles.length; i++) {
      const file = photoFiles[i];
      if (file && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const photoName = generatePhotoFilename(tanggal, i, file.name);
        
        const base64Str = `data:${file.type};base64,${buffer.toString('base64')}`;
        const meta = photoMetadataParsed.find((m) => m.index === i);
        const tglFoto = meta?.tanggal_foto;

        photoObjects.push({ base64: base64Str, tanggal_foto: tglFoto });

        const driveRes = await uploadFileToDrive(
          buffer,
          photoName,
          file.type || 'image/jpeg',
          folderStructure.dokumentasiFolderId
        );

        photosData.push({
          drive_file_id: driveRes.id,
          drive_file_url: driveRes.webViewLink,
          file_name: photoName,
          tanggal_foto: tglFoto,
        });
      }
    }

    // 3. Generate Official BPS PDF
    const pdfBuffer = await generateBpsPdfBuffer({
      namaPegawai: nama_pegawai,
      nip,
      jabatan,
      tanggal,
      tanggalSelesai: tanggal_selesai,
      namaKegiatan: nama_kegiatan,
      ringkasanKegiatan: ringkasan_kegiatan,
      photos: photoObjects,
    });

    // 4. Generate Official BPS Word Document (.docx)
    const docxBuffer = await generateBpsDocxBuffer({
      namaPegawai: nama_pegawai,
      nip,
      jabatan,
      tanggal,
      tanggalSelesai: tanggal_selesai,
      namaKegiatan: nama_kegiatan,
      ringkasanKegiatan: ringkasan_kegiatan,
      photos: photoObjects,
    });

    if (existingLaporan?.drive_pdf_file_id) {
      await deleteFileFromDrive(existingLaporan.drive_pdf_file_id);
    }

    // 5. Upload PDF & Word Document to Google Drive
    const pdfFileName = generatePdfFilename(tanggal, nama_kegiatan);
    const pdfDriveRes = await uploadFileToDrive(
      pdfBuffer,
      pdfFileName,
      'application/pdf',
      folderStructure.pdfFolderId
    );

    const docxFileName = `${tanggal}_${sanitizeFilename(nama_kegiatan)}.docx`;
    await uploadFileToDrive(
      docxBuffer,
      docxFileName,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      folderStructure.pdfFolderId
    );

    // 6. Save Record in Supabase DB & Server Store
    const savedLaporan = await saveLaporanRecord(
      {
        id: id || undefined,
        nama_pegawai,
        nip,
        jabatan,
        tanggal,
        tanggal_selesai,
        nama_kegiatan,
        deskripsi_kegiatan,
        ringkasan_kegiatan,
        kategori,
        drive_pdf_url: pdfDriveRes.webViewLink,
        drive_pdf_file_id: pdfDriveRes.id,
        drive_folder_id: folderStructure.monthFolderId,
      },
      photosData
    );

    // Also persist to server JSON store
    const serverList = getStoredLaporanList();
    const existingIndex = serverList.findIndex((l) => l.id === savedLaporan.id);
    let updatedServerList;
    if (existingIndex >= 0) {
      updatedServerList = [...serverList];
      updatedServerList[existingIndex] = savedLaporan;
    } else {
      updatedServerList = [savedLaporan, ...serverList];
    }
    saveStoredLaporanList(updatedServerList);

    // 7. Sync directly to Google Drive Cloud Database (Guarantees 100% cross-device availability on HP & PC)
    await syncLaporanToDriveCloud(savedLaporan);

    return NextResponse.json({
      success: true,
      data: savedLaporan,
      message: 'Laporan harian, foto dokumentasi, PDF, dan file Word (.docx) berhasil disimpan ke Google Drive!',
    });
  } catch (error: any) {
    console.error('API Save Complete Laporan Error:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal menyelaraskan laporan ke database dan Google Drive' },
      { status: 500 }
    );
  }
}
