import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { formatDateIndonesian } from '@/utils/formatters';
import { BPS_CONFIG, BULAN_INDONESIA } from '@/constants/bpsConfig';

export interface PdfReportPhoto {
  base64: string;
  tanggal_foto?: string;
}

export interface PdfReportData {
  namaPegawai: string;
  nip: string;
  jabatan: string;
  tanggal: string;
  tanggalSelesai?: string;
  namaKegiatan: string;
  ringkasanKegiatan: string;
  deskripsiKegiatan?: string;
  jenisLaporan?: 'harian' | 'penugasan';
  activity_type?: 'PERJALANAN_DINAS' | 'NON_PERJALANAN_DINAS';
  tempatTujuan?: string;
  destination?: string;
  nomorSurat?: string;
  letter_number?: string;
  nomorSpd?: string;
  spd_number?: string;
  petugasDitemui?: { nama?: string; person_name?: string; jabatan?: string; position?: string }[];
  people?: { person_name: string; position: string }[];
  photos?: PdfReportPhoto[];
  photosBase64?: string[];
  fotos?: any[];
  documents?: any[];
}

/**
 * Clean WinAnsi unsupported characters like Carriage Return (\r or 0x000d)
 */
function sanitizeWinAnsiText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[^\x00-\x7F\xA0-\xFF]/g, '');
}

/**
 * Draw justified text line (rata kanan-kiri rapi 100%)
 */
function drawJustifiedLine(
  page: any,
  lineText: string,
  x: number,
  y: number,
  maxWidth: number,
  font: any,
  fontSize: number,
  color: any,
  isLastLineOfParagraph: boolean
) {
  const words = lineText.trim().split(/\s+/);
  if (words.length <= 1 || isLastLineOfParagraph) {
    page.drawText(lineText, { x, y, size: fontSize, font, color });
    return;
  }

  const totalWordsWidth = words.reduce((acc, word) => acc + font.widthOfTextAtSize(word, fontSize), 0);
  const totalSpaceNeeded = maxWidth - totalWordsWidth;
  const wordSpacing = totalSpaceNeeded / (words.length - 1);

  if (wordSpacing > 20 || wordSpacing < 0) {
    page.drawText(lineText, { x, y, size: fontSize, font, color });
    return;
  }

  let currentX = x;
  words.forEach((word) => {
    page.drawText(word, { x: currentX, y, size: fontSize, font, color });
    currentX += font.widthOfTextAtSize(word, fontSize) + wordSpacing;
  });
}

/**
 * Helper to generate date list between start and end date
 */
function generateDateList(startDateStr: string, endDateStr?: string): { dateStr: string; label: string }[] {
  if (!endDateStr || startDateStr === endDateStr) {
    return [{ dateStr: startDateStr, label: formatDateIndonesian(startDateStr) }];
  }

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return [{ dateStr: startDateStr, label: formatDateIndonesian(startDateStr) }];
  }

  const list: { dateStr: string; label: string }[] = [];
  const curr = new Date(start);
  while (curr <= end) {
    const yyyy = curr.getFullYear();
    const mm = String(curr.getMonth() + 1).padStart(2, '0');
    const dd = String(curr.getDate()).padStart(2, '0');
    const iso = `${yyyy}-${mm}-${dd}`;
    const label = `${curr.getDate()} ${BULAN_INDONESIA[curr.getMonth()]} ${yyyy}`;
    list.push({ dateStr: iso, label });
    curr.setDate(curr.getDate() + 1);
  }
  return list;
}

/**
 * Extract all photos from data payload
 */
function extractPhotosList(data: PdfReportData): PdfReportPhoto[] {
  let allPhotos: PdfReportPhoto[] = [];
  const rawPhotosInput = data.photos || data.fotos || data.documents || [];
  if (Array.isArray(rawPhotosInput) && rawPhotosInput.length > 0) {
    allPhotos = rawPhotosInput
      .map((item: any) => {
        if (typeof item === 'string') return { base64: item };
        const b64 = item.base64 || item.previewUrl || item.web_view_url || item.preview_url || item.existingUrl || item.url || '';
        return {
          base64: b64,
          tanggal_foto: item.tanggal_foto || item.documentation_date || data.tanggal,
        };
      })
      .filter((p) => Boolean(p.base64));
  } else if (data.photosBase64 && data.photosBase64.length > 0) {
    allPhotos = data.photosBase64.map((b) => ({ base64: b, tanggal_foto: data.tanggal }));
  }
  return allPhotos;
}

/**
 * Generate official BPS PDF Buffer for BOTH Non-PD & Perjalanan Dinas formats
 */
export async function generateBpsPdfBuffer(data: PdfReportData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - 35;

  const black = rgb(0, 0, 0);
  const peachBg = rgb(0.97, 0.78, 0.56); // #F8C48C exact BPS header color
  const lightGrayBg = rgb(0.95, 0.95, 0.95);

  const isPenugasan =
    data.jenisLaporan === 'penugasan' ||
    data.activity_type === 'PERJALANAN_DINAS' ||
    Boolean(data.nomorSpd || data.spd_number || data.nomorSurat || data.letter_number);

  // 1. LOGO & HEADER TITLE
  const logoPathWebp = path.join(process.cwd(), 'public', 'logo_bps.webp');
  let hasEmbeddedCustomLogo = false;

  if (fs.existsSync(logoPathWebp)) {
    try {
      const pngBuffer = await sharp(logoPathWebp).png().toBuffer();
      const embeddedLogo = await pdfDoc.embedPng(pngBuffer);
      const logoWidth = 70;
      const logoHeight = 45;
      page.drawImage(embeddedLogo, {
        x: (pageWidth - logoWidth) / 2,
        y: y - 45,
        width: logoWidth,
        height: logoHeight,
      });
      hasEmbeddedCustomLogo = true;
    } catch (e) {
      console.warn('Failed to embed custom logo_bps.webp:', e);
    }
  }

  if (!hasEmbeddedCustomLogo) {
    const logoX = pageWidth / 2;
    const logoY = y - 20;
    page.drawRectangle({ x: logoX - 25, y: logoY + 12, width: 22, height: 18, color: rgb(0, 0.63, 0.91) });
    page.drawRectangle({ x: logoX, y: logoY + 3, width: 22, height: 18, color: rgb(0.95, 0.44, 0.14) });
    page.drawRectangle({ x: logoX - 25, y: logoY - 6, width: 22, height: 18, color: rgb(0.55, 0.78, 0.25) });

    y -= 55;
    const logoSubtext = BPS_CONFIG.instansi;
    const logoSubtextWidth = fontBold.widthOfTextAtSize(logoSubtext, 11);
    page.drawText(logoSubtext, {
      x: (pageWidth - logoSubtextWidth) / 2,
      y: y,
      size: 11,
      font: fontBold,
      color: black,
    });
    y -= 25;
  } else {
    y -= 65;
  }

  // Header Title
  const dateYear = new Date(data.tanggal || Date.now()).getFullYear();

  if (isPenugasan) {
    const title1 = 'LAPORAN PENUGASAN BADAN PUSAT STATISTIK KABUPATEN LEBAK';
    const title1Width = fontBold.widthOfTextAtSize(title1, 11);
    page.drawText(title1, {
      x: (pageWidth - title1Width) / 2,
      y: y,
      size: 11,
      font: fontBold,
      color: black,
    });
    y -= 16;

    const title2 = `TAHUN ${dateYear}`;
    const title2Width = fontBold.widthOfTextAtSize(title2, 11);
    page.drawText(title2, {
      x: (pageWidth - title2Width) / 2,
      y: y,
      size: 11,
      font: fontBold,
      color: black,
    });
    y -= 25;
  } else {
    const title1 = 'BUKTI DUKUNG KEGIATAN';
    const title1Width = fontBold.widthOfTextAtSize(title1, 13);
    page.drawText(title1, {
      x: (pageWidth - title1Width) / 2,
      y: y,
      size: 13,
      font: fontBold,
      color: black,
    });
    y -= 16;

    const title2 = `BADAN PUSAT STATISTIK KABUPATEN LEBAK TAHUN ${dateYear}`;
    const title2Width = fontBold.widthOfTextAtSize(title2, 12);
    page.drawText(title2, {
      x: (pageWidth - title2Width) / 2,
      y: y,
      size: 12,
      font: fontBold,
      color: black,
    });
    y -= 25;
  }

  const cleanNamaPegawai = sanitizeWinAnsiText(data.namaPegawai);
  const cleanJabatan = sanitizeWinAnsiText(data.jabatan);
  const cleanNip = sanitizeWinAnsiText(data.nip);
  const cleanNamaKegiatan = sanitizeWinAnsiText(data.namaKegiatan);
  const cleanRingkasan = sanitizeWinAnsiText(data.ringkasanKegiatan || data.deskripsiKegiatan || '');
  const formattedDate = formatDateIndonesian(data.tanggal, data.tanggalSelesai);
  const dates = generateDateList(data.tanggal, data.tanggalSelesai);
  const allPhotos = extractPhotosList(data);

  const headerHeight = 22;
  const fontSize = 10;
  const lineHeight = 14;

  if (isPenugasan) {
    /* =========================================================================
       LAPORAN PERJALANAN DINAS FORMAT (5 SECTIONS WITH VERTICAL BORDERS & JUSTIFIED TEXT)
       ========================================================================= */

    // I. KETERANGAN PELAKSANA PERJALANAN DINAS
    page.drawRectangle({ x: margin, y: y - headerHeight, width: contentWidth, height: headerHeight, color: lightGrayBg, borderColor: black, borderWidth: 1 });
    page.drawText('I. KETERANGAN PELAKSANA PERJALANAN DINAS', { x: margin + 10, y: y - 15, size: 10, font: fontBold, color: black });
    y -= headerHeight;

    const pdPelaksana = [
      { label: 'Nama', val: cleanNamaPegawai },
      { label: 'Jabatan', val: cleanJabatan },
      { label: 'NIP', val: cleanNip },
    ];
    const colLabelW = 140;
    const colValW = contentWidth - colLabelW;

    for (const r of pdPelaksana) {
      const rH = 22;
      page.drawRectangle({ x: margin, y: y - rH, width: contentWidth, height: rH, borderColor: black, borderWidth: 1 });
      page.drawLine({ start: { x: margin + colLabelW, y }, end: { x: margin + colLabelW, y: y - rH }, thickness: 1, color: black });
      page.drawText(r.label, { x: margin + 8, y: y - 15, size: 10, font: fontRegular, color: black });
      page.drawText(r.val, { x: margin + colLabelW + 8, y: y - 15, size: 10, font: fontBold, color: black });
      y -= rH;
    }
    y -= 12;

    // II. KETERANGAN PERJALANAN DINAS
    page.drawRectangle({ x: margin, y: y - headerHeight, width: contentWidth, height: headerHeight, color: lightGrayBg, borderColor: black, borderWidth: 1 });
    page.drawText('II. KETERANGAN PERJALANAN DINAS', { x: margin + 10, y: y - 15, size: 10, font: fontBold, color: black });
    y -= headerHeight;

    const cleanTujuan = sanitizeWinAnsiText(data.tempatTujuan || data.destination || '-');
    const cleanNoSurat = sanitizeWinAnsiText(data.nomorSurat || data.letter_number || '-');
    const cleanNoSpd = sanitizeWinAnsiText(data.nomorSpd || data.spd_number || '-');

    const pdKet = [
      { label: 'Nama Kegiatan', val: cleanNamaKegiatan },
      { label: 'Tanggal Perjadin', val: formattedDate },
      { label: 'Tempat Tujuan', val: cleanTujuan },
      { label: 'Nomor Surat', val: cleanNoSurat },
      { label: 'Nomor SPD', val: cleanNoSpd },
    ];

    for (const r of pdKet) {
      const rH = 22;
      page.drawRectangle({ x: margin, y: y - rH, width: contentWidth, height: rH, borderColor: black, borderWidth: 1 });
      page.drawLine({ start: { x: margin + colLabelW, y }, end: { x: margin + colLabelW, y: y - rH }, thickness: 1, color: black });
      page.drawText(r.label, { x: margin + 8, y: y - 15, size: 10, font: fontRegular, color: black });
      page.drawText(r.val, { x: margin + colLabelW + 8, y: y - 15, size: 10, font: fontBold, color: black });
      y -= rH;
    }
    y -= 12;

    // III. DAFTAR PETUGAS YANG DITEMUI
    page.drawRectangle({ x: margin, y: y - headerHeight, width: contentWidth, height: headerHeight, color: lightGrayBg, borderColor: black, borderWidth: 1 });
    page.drawText('III. DAFTAR PETUGAS YANG DITEMUI', { x: margin + 10, y: y - 15, size: 10, font: fontBold, color: black });
    y -= headerHeight;

    const petugasList = data.petugasDitemui || data.people?.map((p) => ({ nama: p.person_name, jabatan: p.position })) || [];
    const tColNoW = 35;
    const tColNamaW = 220;

    // Table Header
    const thH = 20;
    page.drawRectangle({ x: margin, y: y - thH, width: contentWidth, height: thH, color: lightGrayBg, borderColor: black, borderWidth: 1 });
    page.drawLine({ start: { x: margin + tColNoW, y }, end: { x: margin + tColNoW, y: y - thH }, thickness: 1, color: black });
    page.drawLine({ start: { x: margin + tColNoW + tColNamaW, y }, end: { x: margin + tColNoW + tColNamaW, y: y - thH }, thickness: 1, color: black });
    page.drawText('No', { x: margin + 10, y: y - 14, size: 9, font: fontBold, color: black });
    page.drawText('Nama', { x: margin + tColNoW + 10, y: y - 14, size: 9, font: fontBold, color: black });
    page.drawText('Jabatan', { x: margin + tColNoW + tColNamaW + 10, y: y - 14, size: 9, font: fontBold, color: black });
    y -= thH;

    if (petugasList.length === 0) {
      const tbH = 20;
      page.drawRectangle({ x: margin, y: y - tbH, width: contentWidth, height: tbH, borderColor: black, borderWidth: 1 });
      page.drawLine({ start: { x: margin + tColNoW, y }, end: { x: margin + tColNoW, y: y - tbH }, thickness: 1, color: black });
      page.drawLine({ start: { x: margin + tColNoW + tColNamaW, y }, end: { x: margin + tColNoW + tColNamaW, y: y - tbH }, thickness: 1, color: black });
      page.drawText('1', { x: margin + 12, y: y - 14, size: 9, font: fontRegular, color: black });
      page.drawText('-', { x: margin + tColNoW + 10, y: y - 14, size: 9, font: fontRegular, color: black });
      page.drawText('-', { x: margin + tColNoW + tColNamaW + 10, y: y - 14, size: 9, font: fontRegular, color: black });
      y -= tbH;
    } else {
      petugasList.forEach((p: any, idx: number) => {
        const tbH = 20;
        page.drawRectangle({ x: margin, y: y - tbH, width: contentWidth, height: tbH, borderColor: black, borderWidth: 1 });
        page.drawLine({ start: { x: margin + tColNoW, y }, end: { x: margin + tColNoW, y: y - tbH }, thickness: 1, color: black });
        page.drawLine({ start: { x: margin + tColNoW + tColNamaW, y }, end: { x: margin + tColNoW + tColNamaW, y: y - tbH }, thickness: 1, color: black });
        page.drawText(String(idx + 1), { x: margin + 12, y: y - 14, size: 9, font: fontRegular, color: black });
        page.drawText(sanitizeWinAnsiText(p.nama || p.person_name || '-'), { x: margin + tColNoW + 10, y: y - 14, size: 9, font: fontBold, color: black });
        page.drawText(sanitizeWinAnsiText(p.jabatan || p.position || '-'), { x: margin + tColNoW + tColNamaW + 10, y: y - 14, size: 9, font: fontRegular, color: black });
        y -= tbH;
      });
    }
    y -= 12;

    // IV. RESUME PERJALANAN DINAS (JUSTIFIED PARAGRAPH TEXT)
    page.drawRectangle({ x: margin, y: y - headerHeight, width: contentWidth, height: headerHeight, color: lightGrayBg, borderColor: black, borderWidth: 1 });
    page.drawText('IV. RESUME PERJALANAN DINAS', { x: margin + 10, y: y - 15, size: 10, font: fontBold, color: black });
    y -= headerHeight;

    const paragraphBlocks = cleanRingkasan.split('\n');
    const resumeLines: { text: string; isLastInBlock: boolean }[] = [];

    for (const block of paragraphBlocks) {
      const words = block.split(' ');
      let currentLine = '';
      for (let wIdx = 0; wIdx < words.length; wIdx++) {
        const word = words[wIdx];
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = fontRegular.widthOfTextAtSize(testLine, fontSize);
        if (testWidth <= contentWidth - 20) {
          currentLine = testLine;
        } else {
          resumeLines.push({ text: currentLine, isLastInBlock: false });
          currentLine = word;
        }
      }
      if (currentLine) {
        resumeLines.push({ text: currentLine, isLastInBlock: true });
      }
    }

    const resumeBoxH = Math.max(resumeLines.length * lineHeight + 16, 50);

    page.drawRectangle({ x: margin, y: y - resumeBoxH, width: contentWidth, height: resumeBoxH, borderColor: black, borderWidth: 1 });

    resumeLines.forEach((lineObj, idx) => {
      drawJustifiedLine(
        page,
        lineObj.text,
        margin + 10,
        y - 16 - idx * lineHeight,
        contentWidth - 20,
        fontRegular,
        fontSize,
        black,
        lineObj.isLastInBlock
      );
    });
    y -= resumeBoxH + 15;

    // V. DOKUMENTASI (FORCE NEW PAGE / LEMBAR BARU FOR PERJALANAN DINAS)
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - 40;

    page.drawRectangle({ x: margin, y: y - headerHeight, width: contentWidth, height: headerHeight, color: lightGrayBg, borderColor: black, borderWidth: 1 });
    page.drawText('V. DOKUMENTASI', { x: margin + 10, y: y - 15, size: 10, font: fontBold, color: black });
    y -= headerHeight;
  } else {
    /* =========================================================================
       LAPORAN HARIAN FORMAT (NON-PD 2 SECTIONS)
       ========================================================================= */
    page.drawRectangle({ x: margin, y: y - headerHeight, width: contentWidth, height: headerHeight, color: peachBg, borderColor: black, borderWidth: 1 });
    page.drawText('I. KETERANGAN PELAKSANA', { x: (pageWidth - fontBold.widthOfTextAtSize('I. KETERANGAN PELAKSANA', 11)) / 2, y: y - 15, size: 11, font: fontBold, color: black });
    y -= headerHeight;

    const rows = [
      { no: '1.', label: 'NAMA', val: cleanNamaPegawai },
      { no: '2.', label: 'JABATAN', val: cleanJabatan },
      { no: '3.', label: 'NIP', val: cleanNip },
      { no: '4.', label: 'KEGIATAN', val: cleanNamaKegiatan },
      { no: '5.', label: 'TANGGAL', val: formattedDate },
      { no: '6.', label: 'RINGKASAN', val: cleanRingkasan },
    ];

    const col1Width = 30;
    const col2Width = 100;
    const col3Width = 15;
    const col4Width = contentWidth - col1Width - col2Width - col3Width;

    for (const row of rows) {
      const paragraphBlocks = row.val.split('\n');
      const lines: { text: string; isLastInBlock: boolean }[] = [];

      for (const block of paragraphBlocks) {
        const words = block.split(' ');
        let currentLine = '';

        for (let wIdx = 0; wIdx < words.length; wIdx++) {
          const word = words[wIdx];
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testWidth = fontRegular.widthOfTextAtSize(testLine, fontSize);
          if (testWidth <= col4Width - 12) {
            currentLine = testLine;
          } else {
            lines.push({ text: currentLine, isLastInBlock: false });
            currentLine = word;
          }
        }
        if (currentLine) {
          lines.push({ text: currentLine, isLastInBlock: true });
        }
      }

      const rowHeight = Math.max(lines.length * lineHeight + 10, 24);

      page.drawRectangle({ x: margin, y: y - rowHeight, width: contentWidth, height: rowHeight, borderColor: black, borderWidth: 1 });
      page.drawLine({ start: { x: margin + col1Width, y }, end: { x: margin + col1Width, y: y - rowHeight }, thickness: 1, color: black });
      page.drawLine({ start: { x: margin + col1Width + col2Width, y }, end: { x: margin + col1Width + col2Width, y: y - rowHeight }, thickness: 1, color: black });
      page.drawLine({ start: { x: margin + col1Width + col2Width + col3Width, y }, end: { x: margin + col1Width + col2Width + col3Width, y: y - rowHeight }, thickness: 1, color: black });

      page.drawText(row.no, { x: margin + 8, y: y - 16, size: fontSize, font: fontRegular, color: black });
      page.drawText(row.label, { x: margin + col1Width + 8, y: y - 16, size: fontSize, font: fontRegular, color: black });
      page.drawText(':', { x: margin + col1Width + col2Width + 4, y: y - 16, size: fontSize, font: fontRegular, color: black });

      lines.forEach((lineObj, idx) => {
        drawJustifiedLine(
          page,
          lineObj.text,
          margin + col1Width + col2Width + col3Width + 6,
          y - 16 - idx * lineHeight,
          col4Width - 12,
          fontRegular,
          fontSize,
          black,
          lineObj.isLastInBlock
        );
      });

      y -= rowHeight;
    }

    y -= 15;

    const sec2HeaderTitle = 'II. DOKUMENTASI';
    page.drawRectangle({ x: margin, y: y - headerHeight, width: contentWidth, height: headerHeight, color: peachBg, borderColor: black, borderWidth: 1 });
    page.drawText(sec2HeaderTitle, { x: (pageWidth - fontBold.widthOfTextAtSize(sec2HeaderTitle, 11)) / 2, y: y - 15, size: 11, font: fontBold, color: black });
    y -= headerHeight;
  }

  // RENDER DOKUMENTASI FOTO GRID FOR BOTH FORMATS
  for (let dIdx = 0; dIdx < dates.length; dIdx++) {
    const dItem = dates[dIdx];
    const isMultiDate = dates.length > 1;

    let datePhotos: PdfReportPhoto[] = [];
    if (isMultiDate) {
      datePhotos = allPhotos.filter((p) => p.tanggal_foto === dItem.dateStr);
      if (datePhotos.length === 0) {
        const photosPerDay = Math.ceil(allPhotos.length / dates.length);
        const startIdx = dIdx * photosPerDay;
        datePhotos = allPhotos.slice(startIdx, startIdx + photosPerDay);
      }
    } else {
      datePhotos = allPhotos;
    }

    if (y - 200 < 60) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - 50;
    }

    const totalCount = datePhotos.length;

    if (totalCount === 0) {
      const emptyBoxHeight = 80;
      page.drawRectangle({ x: margin, y: y - emptyBoxHeight, width: contentWidth, height: emptyBoxHeight, borderColor: black, borderWidth: 1 });
      page.drawText('[ Tidak Ada Foto Dokumentasi Terlampir ]', { x: margin + 140, y: y - 45, size: 10, font: fontRegular, color: black });
      y -= emptyBoxHeight + 15;
    } else if (totalCount === 1) {
      const photoBoxHeight = 240;
      const photoInnerY = y - photoBoxHeight;

      page.drawRectangle({ x: margin, y: photoInnerY, width: contentWidth, height: photoBoxHeight, borderColor: black, borderWidth: 1 });
      const captionAreaHeight = isPenugasan ? 0 : 45;
      const imageAreaHeight = photoBoxHeight - captionAreaHeight;

      if (!isPenugasan) {
        page.drawLine({ start: { x: margin, y: photoInnerY + captionAreaHeight }, end: { x: margin + contentWidth, y: photoInnerY + captionAreaHeight }, thickness: 1, color: black });
      }

      try {
        const base64Clean = datePhotos[0].base64.replace(/^data:image\/\w+;base64,/, '');
        const imageBytes = Buffer.from(base64Clean, 'base64');
        const embeddedImg = datePhotos[0].base64.includes('data:image/png') ? await pdfDoc.embedPng(imageBytes) : await pdfDoc.embedJpg(imageBytes);

        const imgWidth = embeddedImg.width;
        const imgHeight = embeddedImg.height;
        const imgAspectRatio = imgWidth / imgHeight;

        const maxSlotWidth = contentWidth - 20;
        const maxSlotHeight = imageAreaHeight - 10;
        const slotAspectRatio = maxSlotWidth / maxSlotHeight;

        let renderWidth = maxSlotWidth;
        let renderHeight = maxSlotHeight;

        if (imgAspectRatio > slotAspectRatio) {
          renderHeight = maxSlotWidth / imgAspectRatio;
        } else {
          renderWidth = maxSlotHeight * imgAspectRatio;
        }

        const offsetX = margin + (contentWidth - renderWidth) / 2;
        const offsetY = photoInnerY + captionAreaHeight + (imageAreaHeight - renderHeight) / 2;

        page.drawImage(embeddedImg, { x: offsetX, y: offsetY, width: renderWidth, height: renderHeight });
      } catch (e) {}

      if (!isPenugasan) {
        const cap1 = cleanNamaKegiatan;
        page.drawText(cap1, { x: (pageWidth - fontRegular.widthOfTextAtSize(cap1, 10)) / 2, y: photoInnerY + 26, size: 10, font: fontRegular, color: black });
        const cap2 = dItem.label;
        page.drawText(cap2, { x: (pageWidth - fontRegular.widthOfTextAtSize(cap2, 10)) / 2, y: photoInnerY + 10, size: 10, font: fontRegular, color: black });
      }

      y -= photoBoxHeight + 15;
    } else {
      const photoRows = Math.ceil(totalCount / 2);
      const rowHeight = 220;
      const halfWidth = contentWidth / 2;

      for (let r = 0; r < photoRows; r++) {
        if (y - rowHeight < 60) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - 50;
        }

        const photoInnerY = y - rowHeight;

        page.drawRectangle({ x: margin, y: photoInnerY, width: contentWidth, height: rowHeight, borderColor: black, borderWidth: 1 });
        const captionAreaHeight = isPenugasan ? 0 : 45;
        const imageAreaHeight = rowHeight - captionAreaHeight;

        if (!isPenugasan) {
          page.drawLine({ start: { x: margin, y: photoInnerY + captionAreaHeight }, end: { x: margin + contentWidth, y: photoInnerY + captionAreaHeight }, thickness: 1, color: black });
        }
        page.drawLine({ start: { x: pageWidth / 2, y: y }, end: { x: pageWidth / 2, y: photoInnerY }, thickness: 1, color: black });

        for (let c = 0; c < 2; c++) {
          const photoIdx = r * 2 + c;
          if (photoIdx >= totalCount) break;

          const slotX = margin + c * halfWidth;

          try {
            const base64Clean = datePhotos[photoIdx].base64.replace(/^data:image\/\w+;base64,/, '');
            const imageBytes = Buffer.from(base64Clean, 'base64');
            const embeddedImg = datePhotos[photoIdx].base64.includes('data:image/png') ? await pdfDoc.embedPng(imageBytes) : await pdfDoc.embedJpg(imageBytes);

            const imgWidth = embeddedImg.width;
            const imgHeight = embeddedImg.height;
            const imgAspectRatio = imgWidth / imgHeight;

            const maxSlotWidth = halfWidth - 10;
            const maxSlotHeight = imageAreaHeight - 10;
            const slotAspectRatio = maxSlotWidth / maxSlotHeight;

            let renderWidth = maxSlotWidth;
            let renderHeight = maxSlotHeight;

            if (imgAspectRatio > slotAspectRatio) {
              renderHeight = maxSlotWidth / imgAspectRatio;
            } else {
              renderWidth = maxSlotHeight * imgAspectRatio;
            }

            const offsetX = slotX + 5 + (maxSlotWidth - renderWidth) / 2;
            const offsetY = photoInnerY + captionAreaHeight + 5 + (maxSlotHeight - renderHeight) / 2;

            page.drawImage(embeddedImg, { x: offsetX, y: offsetY, width: renderWidth, height: renderHeight });
          } catch (e) {}
        }

        if (!isPenugasan) {
          const cap1 = cleanNamaKegiatan;
          page.drawText(cap1, { x: (pageWidth - fontRegular.widthOfTextAtSize(cap1, 10)) / 2, y: photoInnerY + 26, size: 10, font: fontRegular, color: black });
          const cap2 = dItem.label;
          page.drawText(cap2, { x: (pageWidth - fontRegular.widthOfTextAtSize(cap2, 10)) / 2, y: photoInnerY + 10, size: 10, font: fontRegular, color: black });
        }

        y -= rowHeight + 15;
      }
    }
  }

  // 4. FOOTER AT BOTTOM OF PAGE
  const footer1 = BPS_CONFIG.alamatFooter;
  const footer1Width = fontRegular.widthOfTextAtSize(footer1, 9);
  page.drawText(footer1, { x: (pageWidth - footer1Width) / 2, y: 35, size: 9, font: fontRegular, color: black });

  const footer2 = BPS_CONFIG.contactFooter;
  const footer2Width = fontRegular.widthOfTextAtSize(footer2, 9);
  page.drawText(footer2, { x: (pageWidth - footer2Width) / 2, y: 22, size: 9, font: fontRegular, color: black });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
