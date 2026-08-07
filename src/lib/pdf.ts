import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
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
  photos?: PdfReportPhoto[];
  photosBase64?: string[]; // fallback
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
 * Generate official BPS Bukti Dukung Kegiatan PDF with separate daily documentation tables and clean captions
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

  // 1. LOGO & HEADER TITLE
  const logoX = pageWidth / 2;
  const logoY = y - 20;

  // Blue Polygon
  page.drawRectangle({ x: logoX - 25, y: logoY + 12, width: 22, height: 18, color: rgb(0, 0.63, 0.91) });
  // Orange Polygon
  page.drawRectangle({ x: logoX, y: logoY + 3, width: 22, height: 18, color: rgb(0.95, 0.44, 0.14) });
  // Green Polygon
  page.drawRectangle({ x: logoX - 25, y: logoY - 6, width: 22, height: 18, color: rgb(0.55, 0.78, 0.25) });

  y -= 55;

  // Logo Subtext
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

  // Title 1: BUKTI DUKUNG KEGIATAN
  const title1 = BPS_CONFIG.judulLaporan;
  const title1Width = fontBold.widthOfTextAtSize(title1, 13);
  page.drawText(title1, {
    x: (pageWidth - title1Width) / 2,
    y: y,
    size: 13,
    font: fontBold,
    color: black,
  });
  y -= 16;

  // Title 2: BADAN PUSAT STATISTIK KABUPATEN LEBAK TAHUN 2026
  const dateYear = new Date(data.tanggal || Date.now()).getFullYear();
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

  // 2. BAGIAN I: I. KETERANGAN PELAKSANA
  const headerHeight = 22;
  page.drawRectangle({
    x: margin,
    y: y - headerHeight,
    width: contentWidth,
    height: headerHeight,
    color: peachBg,
    borderColor: black,
    borderWidth: 1,
  });

  const sec1Text = 'I. KETERANGAN PELAKSANA';
  const sec1Width = fontBold.widthOfTextAtSize(sec1Text, 11);
  page.drawText(sec1Text, {
    x: (pageWidth - sec1Width) / 2,
    y: y - 15,
    size: 11,
    font: fontBold,
    color: black,
  });
  y -= headerHeight;

  const cleanNamaPegawai = sanitizeWinAnsiText(data.namaPegawai);
  const cleanJabatan = sanitizeWinAnsiText(data.jabatan);
  const cleanNip = sanitizeWinAnsiText(data.nip);
  const cleanNamaKegiatan = sanitizeWinAnsiText(data.namaKegiatan);
  const cleanRingkasan = sanitizeWinAnsiText(data.ringkasanKegiatan);

  const formattedDate = formatDateIndonesian(data.tanggal, data.tanggalSelesai);
  const dates = generateDateList(data.tanggal, data.tanggalSelesai);

  // Table Rows: NAMA, JABATAN, NIP, KEGIATAN, RINGKASAN
  const rows = [
    { no: '1.', label: 'NAMA', val: cleanNamaPegawai },
    { no: '2.', label: 'JABATAN', val: cleanJabatan },
    { no: '3.', label: 'NIP', val: cleanNip },
    { no: '4.', label: 'KEGIATAN', val: cleanNamaKegiatan },
    { no: '5.', label: 'TANGGAL', val: formattedDate },
    { no: '6.', label: 'RINGKASAN', val: cleanRingkasan },
  ];

  const col1Width = 30; // No
  const col2Width = 100; // Field Name
  const col3Width = 15; // Colon :
  const col4Width = contentWidth - col1Width - col2Width - col3Width;

  const fontSize = 10;
  const lineHeight = 14;

  for (const row of rows) {
    const paragraphBlocks = row.val.split('\n');
    const lines: string[] = [];

    for (const block of paragraphBlocks) {
      const words = block.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = fontRegular.widthOfTextAtSize(testLine, fontSize);
        if (testWidth <= col4Width - 10) {
          currentLine = testLine;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);
    }

    const rowHeight = Math.max(lines.length * lineHeight + 10, 24);

    page.drawRectangle({
      x: margin,
      y: y - rowHeight,
      width: contentWidth,
      height: rowHeight,
      borderColor: black,
      borderWidth: 1,
    });

    page.drawLine({
      start: { x: margin + col1Width, y: y },
      end: { x: margin + col1Width, y: y - rowHeight },
      thickness: 1,
      color: black,
    });
    page.drawLine({
      start: { x: margin + col1Width + col2Width, y: y },
      end: { x: margin + col1Width + col2Width, y: y - rowHeight },
      thickness: 1,
      color: black,
    });
    page.drawLine({
      start: { x: margin + col1Width + col2Width + col3Width, y: y },
      end: { x: margin + col1Width + col2Width + col3Width, y: y - rowHeight },
      thickness: 1,
      color: black,
    });

    page.drawText(row.no, { x: margin + 8, y: y - 16, size: fontSize, font: fontRegular, color: black });
    page.drawText(row.label, { x: margin + col1Width + 8, y: y - 16, size: fontSize, font: fontRegular, color: black });
    page.drawText(':', { x: margin + col1Width + col2Width + 4, y: y - 16, size: fontSize, font: fontRegular, color: black });

    lines.forEach((line, idx) => {
      page.drawText(line, {
        x: margin + col1Width + col2Width + col3Width + 6,
        y: y - 16 - idx * lineHeight,
        size: fontSize,
        font: fontRegular,
        color: black,
      });
    });

    y -= rowHeight;
  }

  y -= 15;

  // Extract photos list
  let allPhotos: PdfReportPhoto[] = [];
  if (data.photos && data.photos.length > 0) {
    allPhotos = data.photos;
  } else if (data.photosBase64 && data.photosBase64.length > 0) {
    allPhotos = data.photosBase64.map((b) => ({ base64: b }));
  }

  // 3. BAGIAN II: DOKUMENTASI (REPEATABLE PER DATE IF MULTI-DAY)
  for (let dIdx = 0; dIdx < dates.length; dIdx++) {
    const dItem = dates[dIdx];
    const isMultiDate = dates.length > 1;

    // Filter photos for this date
    let datePhotos: PdfReportPhoto[] = [];
    if (isMultiDate) {
      datePhotos = allPhotos.filter((p) => p.tanggal_foto === dItem.dateStr);
      if (datePhotos.length === 0 && dIdx === 0 && allPhotos.length > 0) {
        // Fallback: assign unassigned photos to first date
        datePhotos = allPhotos.filter((p) => !p.tanggal_foto);
      }
    } else {
      datePhotos = allPhotos;
    }

    if (y - 200 < 60) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - 50;
    }

    const secHeaderTitle = isMultiDate
      ? `II. DOKUMENTASI (${dItem.label.toUpperCase()})`
      : 'II. DOKUMENTASI';

    page.drawRectangle({
      x: margin,
      y: y - headerHeight,
      width: contentWidth,
      height: headerHeight,
      color: peachBg,
      borderColor: black,
      borderWidth: 1,
    });

    const sec2Width = fontBold.widthOfTextAtSize(secHeaderTitle, 11);
    page.drawText(secHeaderTitle, {
      x: (pageWidth - sec2Width) / 2,
      y: y - 15,
      size: 11,
      font: fontBold,
      color: black,
    });
    y -= headerHeight;

    const totalCount = datePhotos.length;

    if (totalCount === 0) {
      const emptyBoxHeight = 80;
      page.drawRectangle({
        x: margin,
        y: y - emptyBoxHeight,
        width: contentWidth,
        height: emptyBoxHeight,
        borderColor: black,
        borderWidth: 1,
      });
      page.drawText('[ Tidak Ada Foto Dokumentasi Terlampir ]', {
        x: margin + 140,
        y: y - 45,
        size: 10,
        font: fontRegular,
        color: black,
      });
      y -= emptyBoxHeight + 15;
    } else if (totalCount === 1) {
      // 1 PHOTO UPLOADED: CENTERED HORIZONTALLY IN CELL
      const photoBoxHeight = 240;
      const photoInnerY = y - photoBoxHeight;

      page.drawRectangle({
        x: margin,
        y: photoInnerY,
        width: contentWidth,
        height: photoBoxHeight,
        borderColor: black,
        borderWidth: 1,
      });

      const captionAreaHeight = 45;
      const imageAreaHeight = photoBoxHeight - captionAreaHeight;

      page.drawLine({
        start: { x: margin, y: photoInnerY + captionAreaHeight },
        end: { x: margin + contentWidth, y: photoInnerY + captionAreaHeight },
        thickness: 1,
        color: black,
      });

      try {
        const base64Clean = datePhotos[0].base64.replace(/^data:image\/\w+;base64,/, '');
        const imageBytes = Buffer.from(base64Clean, 'base64');
        const embeddedImg = datePhotos[0].base64.includes('data:image/png')
          ? await pdfDoc.embedPng(imageBytes)
          : await pdfDoc.embedJpg(imageBytes);

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

        page.drawImage(embeddedImg, {
          x: offsetX,
          y: offsetY,
          width: renderWidth,
          height: renderHeight,
        });
      } catch (e) {}

      // Clean separate caption row at bottom (no inner overlays)
      const cap1 = cleanNamaKegiatan;
      const cap1Width = fontRegular.widthOfTextAtSize(cap1, 10);
      page.drawText(cap1, {
        x: (pageWidth - cap1Width) / 2,
        y: photoInnerY + 26,
        size: 10,
        font: fontRegular,
        color: black,
      });

      const cap2 = dItem.label;
      const cap2Width = fontRegular.widthOfTextAtSize(cap2, 10);
      page.drawText(cap2, {
        x: (pageWidth - cap2Width) / 2,
        y: photoInnerY + 10,
        size: 10,
        font: fontRegular,
        color: black,
      });

      y -= photoBoxHeight + 15;
    } else {
      // 2 OR MORE PHOTOS: 2-COLUMN GRID (ROW BY ROW)
      const photoRows = Math.ceil(totalCount / 2);
      const rowHeight = 220;
      const halfWidth = contentWidth / 2;

      for (let r = 0; r < photoRows; r++) {
        if (y - rowHeight < 60) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - 50;
        }

        const photoInnerY = y - rowHeight;

        page.drawRectangle({
          x: margin,
          y: photoInnerY,
          width: contentWidth,
          height: rowHeight,
          borderColor: black,
          borderWidth: 1,
        });

        const captionAreaHeight = 45;
        const imageAreaHeight = rowHeight - captionAreaHeight;

        page.drawLine({
          start: { x: margin, y: photoInnerY + captionAreaHeight },
          end: { x: margin + contentWidth, y: photoInnerY + captionAreaHeight },
          thickness: 1,
          color: black,
        });

        page.drawLine({
          start: { x: pageWidth / 2, y: y },
          end: { x: pageWidth / 2, y: photoInnerY + captionAreaHeight },
          thickness: 1,
          color: black,
        });

        for (let c = 0; c < 2; c++) {
          const photoIdx = r * 2 + c;
          if (photoIdx >= totalCount) break;

          const slotX = margin + c * halfWidth;

          try {
            const base64Clean = datePhotos[photoIdx].base64.replace(/^data:image\/\w+;base64,/, '');
            const imageBytes = Buffer.from(base64Clean, 'base64');
            const embeddedImg = datePhotos[photoIdx].base64.includes('data:image/png')
              ? await pdfDoc.embedPng(imageBytes)
              : await pdfDoc.embedJpg(imageBytes);

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

            page.drawImage(embeddedImg, {
              x: offsetX,
              y: offsetY,
              width: renderWidth,
              height: renderHeight,
            });
          } catch (e) {}
        }

        // Clean separate caption at bottom of row
        const cap1 = cleanNamaKegiatan;
        const cap1Width = fontRegular.widthOfTextAtSize(cap1, 10);
        page.drawText(cap1, {
          x: (pageWidth - cap1Width) / 2,
          y: photoInnerY + 26,
          size: 10,
          font: fontRegular,
          color: black,
        });

        const cap2 = dItem.label;
        const cap2Width = fontRegular.widthOfTextAtSize(cap2, 10);
        page.drawText(cap2, {
          x: (pageWidth - cap2Width) / 2,
          y: photoInnerY + 10,
          size: 10,
          font: fontRegular,
          color: black,
        });

        y -= rowHeight + 15;
      }
    }
  }

  // 4. FOOTER AT BOTTOM OF PAGE
  const footer1 = BPS_CONFIG.alamatFooter;
  const footer1Width = fontRegular.widthOfTextAtSize(footer1, 9);
  page.drawText(footer1, {
    x: (pageWidth - footer1Width) / 2,
    y: 35,
    size: 9,
    font: fontRegular,
    color: black,
  });

  const footer2 = BPS_CONFIG.contactFooter;
  const footer2Width = fontRegular.widthOfTextAtSize(footer2, 9);
  page.drawText(footer2, {
    x: (pageWidth - footer2Width) / 2,
    y: 22,
    size: 9,
    font: fontRegular,
    color: black,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
