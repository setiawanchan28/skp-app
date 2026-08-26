import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { LaporanPenugasan } from '@/types/penugasan';
import { formatDateIndonesian } from '@/utils/formatters';

export async function generatePenugasanPdfBuffer(
  laporan: LaporanPenugasan,
  compressedPhotos: { buffer: Buffer; fileName: string; tanggalFoto?: string }[]
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Embed Logo BPS
  let logoImage: any = null;
  try {
    const fs = require('fs');
    const path = require('path');
    const logoPath = path.join(process.cwd(), 'public', 'logo-bps.png');
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      logoImage = await pdfDoc.embedPng(logoBuffer);
    }
  } catch (e) {}

  const pageWidth = 595.28; // A4 Width
  const pageHeight = 841.89; // A4 Height
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // Colors
  const greyHeaderBg = rgb(0.94, 0.94, 0.94);
  const borderColor = rgb(0.8, 0.8, 0.8);
  const blackColor = rgb(0, 0, 0);

  // Helper draw table row
  const drawCell = (
    pg: any,
    x: number,
    yPos: number,
    w: number,
    h: number,
    text: string,
    isBold = false,
    bg: any = null,
    fontSize = 9,
    align = 'left'
  ) => {
    if (bg) {
      pg.drawRectangle({
        x,
        y: yPos - h,
        width: w,
        height: h,
        color: bg,
        borderColor: borderColor,
        borderWidth: 0.5,
      });
    } else {
      pg.drawRectangle({
        x,
        y: yPos - h,
        width: w,
        height: h,
        borderColor: borderColor,
        borderWidth: 0.5,
      });
    }

    const font = isBold ? fontBold : fontRegular;
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    let textX = x + 6;
    if (align === 'center') {
      textX = x + (w - textWidth) / 2;
    }

    pg.drawText(text, {
      x: textX,
      y: yPos - h + (h - fontSize) / 2 + 1,
      size: fontSize,
      font,
      color: blackColor,
    });
  };

  // Check Page Break
  const checkNewPage = (neededHeight: number) => {
    if (y - neededHeight < margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };

  // 1. Draw Top Logo BPS (Centered)
  if (logoImage) {
    const logoDims = logoImage.scale(0.35);
    page.drawImage(logoImage, {
      x: (pageWidth - logoDims.width) / 2,
      y: y - logoDims.height,
      width: logoDims.width,
      height: logoDims.height,
    });
    y -= logoDims.height + 8;
  }

  // 2. Sub-header & Main Title (Centered)
  const subTitle = 'BADAN PUSAT STATISTIK KABUPATEN LEBAK';
  const subTitleWidth = fontBold.widthOfTextAtSize(subTitle, 10);
  page.drawText(subTitle, {
    x: (pageWidth - subTitleWidth) / 2,
    y: y - 10,
    size: 10,
    font: fontBold,
    color: blackColor,
  });
  y -= 22;

  const currentYear = laporan.tanggal_perjadin ? new Date(laporan.tanggal_perjadin).getFullYear() : 2026;
  const mainTitle = `LAPORAN PENUGASAN BADAN PUSAT STATISTIK KABUPATEN LEBAK`;
  const yearTitle = `TAHUN ${currentYear}`;
  
  const mainTitleWidth = fontBold.widthOfTextAtSize(mainTitle, 11);
  page.drawText(mainTitle, {
    x: (pageWidth - mainTitleWidth) / 2,
    y: y - 10,
    size: 11,
    font: fontBold,
    color: blackColor,
  });
  y -= 16;

  const yearTitleWidth = fontBold.widthOfTextAtSize(yearTitle, 11);
  page.drawText(yearTitle, {
    x: (pageWidth - yearTitleWidth) / 2,
    y: y - 10,
    size: 11,
    font: fontBold,
    color: blackColor,
  });
  y -= 24;

  // 3. BAGIAN I: KETERANGAN PELAKSANA PERJALANAN DINAS
  checkNewPage(90);
  drawCell(page, margin, y, contentWidth, 20, 'I. KETERANGAN PELAKSANA PERJALANAN DINAS', true, greyHeaderBg, 9);
  y -= 20;

  const labelW = 160;
  const valueW = contentWidth - labelW;
  const rowH = 18;

  drawCell(page, margin, y, labelW, rowH, 'Nama', false, null, 9);
  drawCell(page, margin + labelW, y, valueW, rowH, laporan.nama_pegawai || '', false, null, 9);
  y -= rowH;

  drawCell(page, margin, y, labelW, rowH, 'Jabatan', false, null, 9);
  drawCell(page, margin + labelW, y, valueW, rowH, laporan.jabatan || '', false, null, 9);
  y -= rowH;

  drawCell(page, margin, y, labelW, rowH, 'NIP', false, null, 9);
  drawCell(page, margin + labelW, y, valueW, rowH, laporan.nip || '', false, null, 9);
  y -= rowH + 12;

  // 4. BAGIAN II: KETERANGAN PERJALANAN DINAS
  checkNewPage(140);
  drawCell(page, margin, y, contentWidth, 20, 'II. KETERANGAN PERJALANAN DINAS', true, greyHeaderBg, 9);
  y -= 20;

  const tglFormatted = formatDateIndonesian(laporan.tanggal_perjadin, laporan.tanggal_selesai_perjadin);

  const pdKetPenugasan = [
    { label: 'Nama Kegiatan', val: laporan.nama_kegiatan || '' },
    { label: 'Tanggal Perjadin', val: tglFormatted },
    { label: 'Tempat Tujuan', val: laporan.tempat_tujuan || '' },
    { label: 'Nomor Surat', val: laporan.nomor_surat || '' },
    { label: 'Nomor SPD', val: laporan.nomor_spd || '' },
  ];

  for (const r of pdKetPenugasan) {
    const words = (r.val || '').split(/\s+/);
    const valLines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (!word) continue;
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = fontRegular.widthOfTextAtSize(testLine, 9);
      if (testWidth <= valueW - 12) {
        currentLine = testLine;
      } else {
        if (currentLine) valLines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) valLines.push(currentLine);
    if (valLines.length === 0) valLines.push('');

    const rH = Math.max(18, valLines.length * 13 + 6);
    checkNewPage(rH);

    page.drawRectangle({
      x: margin,
      y: y - rH,
      width: contentWidth,
      height: rH,
      borderColor: borderColor,
      borderWidth: 0.5,
    });
    page.drawLine({
      start: { x: margin + labelW, y },
      end: { x: margin + labelW, y: y - rH },
      thickness: 0.5,
      color: borderColor,
    });

    page.drawText(r.label, {
      x: margin + 6,
      y: y - 13,
      size: 9,
      font: fontRegular,
      color: blackColor,
    });

    valLines.forEach((lineText, lIdx) => {
      page.drawText(lineText, {
        x: margin + labelW + 6,
        y: y - 13 - lIdx * 13,
        size: 9,
        font: fontRegular,
        color: blackColor,
      });
    });

    y -= rH;
  }
  y -= 12;

  // 5. BAGIAN III: DAFTAR PETUGAS YANG DITEMUI
  const petugasList = laporan.petugas_ditemui || [];
  const neededHeightPetugas = 40 + Math.max(1, petugasList.length) * 18;
  checkNewPage(neededHeightPetugas);

  drawCell(page, margin, y, contentWidth, 20, 'III. DAFTAR PETUGAS YANG DITEMUI', true, greyHeaderBg, 9);
  y -= 20;

  const noW = 40;
  const nameW = 200;
  const jabatanPetugasW = contentWidth - noW - nameW;

  drawCell(page, margin, y, noW, 18, 'No', true, greyHeaderBg, 9, 'center');
  drawCell(page, margin + noW, y, nameW, 18, 'Nama', true, greyHeaderBg, 9, 'center');
  drawCell(page, margin + noW + nameW, y, jabatanPetugasW, 18, 'Jabatan', true, greyHeaderBg, 9, 'center');
  y -= 18;

  if (petugasList.length === 0) {
    drawCell(page, margin, y, noW, 18, '1', false, null, 9, 'center');
    drawCell(page, margin + noW, y, nameW, 18, '-', false, null, 9);
    drawCell(page, margin + noW + nameW, y, jabatanPetugasW, 18, '-', false, null, 9);
    y -= 18;
  } else {
    petugasList.forEach((p, idx) => {
      drawCell(page, margin, y, noW, 18, String(idx + 1), false, null, 9, 'center');
      drawCell(page, margin + noW, y, nameW, 18, p.nama || '', false, null, 9);
      drawCell(page, margin + noW + nameW, y, jabatanPetugasW, 18, p.jabatan || '', false, null, 9);
      y -= 18;
    });
  }
  y -= 12;

  // 6. BAGIAN IV: RESUME PERJALANAN DINAS
  checkNewPage(60);
  drawCell(page, margin, y, contentWidth, 20, 'IV. RESUME PERJALANAN DINAS', true, greyHeaderBg, 9);
  y -= 20;

  const resumeText = laporan.resume_kegiatan || '';
  const lines: string[] = [];
  const words = resumeText.split(/\s+/);
  let currentLine = '';

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = fontRegular.widthOfTextAtSize(testLine, 9);
    if (testWidth > contentWidth - 16) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });
  if (currentLine) lines.push(currentLine);

  let lineIdx = 0;
  const totalResumeLines = lines.length;

  while (lineIdx < totalResumeLines) {
    const availH = y - margin - 20;
    const maxLinesOnThisPage = Math.max(1, Math.floor((availH - 14) / 13));
    const linesChunk = lines.slice(lineIdx, lineIdx + maxLinesOnThisPage);
    const isLastPageOfResume = (lineIdx + linesChunk.length >= totalResumeLines);

    const chunkH = isLastPageOfResume
      ? Math.max(linesChunk.length * 13 + 14, 40)
      : availH;

    const topY = y;
    const bottomY = y - chunkH;

    // Draw left vertical line
    page.drawLine({
      start: { x: margin, y: topY },
      end: { x: margin, y: bottomY },
      thickness: 0.5,
      color: borderColor,
    });

    // Draw right vertical line
    page.drawLine({
      start: { x: margin + contentWidth, y: topY },
      end: { x: margin + contentWidth, y: bottomY },
      thickness: 0.5,
      color: borderColor,
    });

    // Only draw bottom closing line if this is the last page of resume
    if (isLastPageOfResume) {
      page.drawLine({
        start: { x: margin, y: bottomY },
        end: { x: margin + contentWidth, y: bottomY },
        thickness: 0.5,
        color: borderColor,
      });
    }

    let lineY = topY - 14;
    linesChunk.forEach((ln) => {
      page.drawText(ln, {
        x: margin + 8,
        y: lineY,
        size: 9,
        font: fontRegular,
        color: blackColor,
      });
      lineY -= 13;
    });

    lineIdx += linesChunk.length;
    y = bottomY - 12;

    if (lineIdx < totalResumeLines) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  }

  // 7. BAGIAN V: DOKUMENTASI (Photo Grid - 2 per row with white canvas)
  if (compressedPhotos.length > 0) {
    checkNewPage(180);
    drawCell(page, margin, y, contentWidth, 20, 'V. DOKUMENTASI', true, greyHeaderBg, 9);
    y -= 20;

    const photoCellW = (contentWidth - 12) / 2;
    const photoCellH = 140;

    for (let i = 0; i < compressedPhotos.length; i += 2) {
      checkNewPage(photoCellH + 20);

      // Photo 1
      const item1 = compressedPhotos[i];
      try {
        const img1 = await pdfDoc.embedJpg(item1.buffer);
        const scaled1 = img1.scaleToFit(photoCellW - 12, photoCellH - 24);

        // White canvas background
        page.drawRectangle({
          x: margin,
          y: y - photoCellH,
          width: photoCellW,
          height: photoCellH,
          color: rgb(1, 1, 1),
          borderColor: borderColor,
          borderWidth: 0.5,
        });

        const imgX1 = margin + (photoCellW - scaled1.width) / 2;
        const imgY1 = y - photoCellH + (photoCellH - 20 - scaled1.height) / 2 + 16;
        page.drawImage(img1, {
          x: imgX1,
          y: imgY1,
          width: scaled1.width,
          height: scaled1.height,
        });

        const cap1 = item1.tanggalFoto ? `Dokumentasi - ${formatDateIndonesian(item1.tanggalFoto)}` : `Dokumentasi ${i + 1}`;
        const capWidth1 = fontRegular.widthOfTextAtSize(cap1, 8);
        page.drawText(cap1, {
          x: margin + (photoCellW - capWidth1) / 2,
          y: y - photoCellH + 6,
          size: 8,
          font: fontRegular,
          color: blackColor,
        });
      } catch (err) {}

      // Photo 2 if present
      if (i + 1 < compressedPhotos.length) {
        const item2 = compressedPhotos[i + 1];
        const posX2 = margin + photoCellW + 12;
        try {
          const img2 = await pdfDoc.embedJpg(item2.buffer);
          const scaled2 = img2.scaleToFit(photoCellW - 12, photoCellH - 24);

          // White canvas background
          page.drawRectangle({
            x: posX2,
            y: y - photoCellH,
            width: photoCellW,
            height: photoCellH,
            color: rgb(1, 1, 1),
            borderColor: borderColor,
            borderWidth: 0.5,
          });

          const imgX2 = posX2 + (photoCellW - scaled2.width) / 2;
          const imgY2 = y - photoCellH + (photoCellH - 20 - scaled2.height) / 2 + 16;
          page.drawImage(img2, {
            x: imgX2,
            y: imgY2,
            width: scaled2.width,
            height: scaled2.height,
          });

          const cap2 = item2.tanggalFoto ? `Dokumentasi - ${formatDateIndonesian(item2.tanggalFoto)}` : `Dokumentasi ${i + 2}`;
          const capWidth2 = fontRegular.widthOfTextAtSize(cap2, 8);
          page.drawText(cap2, {
            x: posX2 + (photoCellW - capWidth2) / 2,
            y: y - photoCellH + 6,
            size: 8,
            font: fontRegular,
            color: blackColor,
          });
        } catch (err) {}
      }

      y -= photoCellH + 12;
    }
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
