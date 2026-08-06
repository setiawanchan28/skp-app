import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { formatDateIndonesian } from '@/utils/formatters';
import { BPS_CONFIG } from '@/constants/bpsConfig';

export interface PdfReportData {
  namaPegawai: string;
  nip: string;
  jabatan: string;
  tanggal: string;
  namaKegiatan: string;
  ringkasanKegiatan: string;
  photosBase64?: string[]; // Array of photo base64 strings or buffer images
}

/**
 * Generate official BPS Bukti Dukung Kegiatan PDF document
 */
export async function generateBpsPdfBuffer(data: PdfReportData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // A4 size in points: 595.28 x 841.89
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // Colors
  const bpsBlue = rgb(0.01, 0.52, 0.78);
  const darkText = rgb(0.1, 0.1, 0.1);
  const borderGray = rgb(0.7, 0.7, 0.7);
  const headerBg = rgb(0.93, 0.96, 0.99);

  // 1. HEADER SECTION
  // Draw Top Accent Bar
  page.drawRectangle({
    x: margin,
    y: y - 4,
    width: contentWidth,
    height: 4,
    color: bpsBlue,
  });
  y -= 24;

  // Header Title
  page.drawText(BPS_CONFIG.instansi, {
    x: margin,
    y: y,
    size: 13,
    font: fontBold,
    color: bpsBlue,
  });
  y -= 16;

  page.drawText(BPS_CONFIG.alamat, {
    x: margin,
    y: y,
    size: 8,
    font: fontRegular,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 15;

  // Line separator
  page.drawLine({
    start: { x: margin, y: y },
    end: { x: pageWidth - margin, y: y },
    thickness: 1,
    color: borderGray,
  });
  y -= 25;

  // Document Title
  const titleText = BPS_CONFIG.judulLaporan;
  const titleWidth = fontBold.widthOfTextAtSize(titleText, 14);
  page.drawText(titleText, {
    x: (pageWidth - titleWidth) / 2,
    y: y,
    size: 14,
    font: fontBold,
    color: darkText,
  });
  y -= 25;

  // 2. BAGIAN I: KETERANGAN PELAKSANA
  page.drawText('BAGIAN I: KETERANGAN PELAKSANA', {
    x: margin,
    y: y,
    size: 10,
    font: fontBold,
    color: bpsBlue,
  });
  y -= 15;

  // Helper for drawing wrapped table rows
  const drawTableRow = (label: string, value: string, currentY: number): number => {
    const labelWidth = 140;
    const valueWidth = contentWidth - labelWidth - 10;
    const fontSize = 9;
    const lineHeight = 14;

    // Wrap value text
    const lines: string[] = [];
    const words = value.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = fontRegular.widthOfTextAtSize(testLine, fontSize);
      if (testWidth <= valueWidth) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    const rowHeight = Math.max(lines.length * lineHeight + 8, 24);

    // Row Background
    page.drawRectangle({
      x: margin,
      y: currentY - rowHeight,
      width: contentWidth,
      height: rowHeight,
      color: rgb(0.98, 0.98, 0.98),
      borderColor: borderGray,
      borderWidth: 0.5,
    });

    // Vertical Divider
    page.drawLine({
      start: { x: margin + labelWidth, y: currentY },
      end: { x: margin + labelWidth, y: currentY - rowHeight },
      thickness: 0.5,
      color: borderGray,
    });

    // Label Text
    page.drawText(label, {
      x: margin + 8,
      y: currentY - 15,
      size: fontSize,
      font: fontBold,
      color: darkText,
    });

    // Value Text Lines
    lines.forEach((line, idx) => {
      page.drawText(line, {
        x: margin + labelWidth + 8,
        y: currentY - 15 - idx * lineHeight,
        size: fontSize,
        font: fontRegular,
        color: darkText,
      });
    });

    return currentY - rowHeight;
  };

  y = drawTableRow('Nama Pegawai', data.namaPegawai, y);
  y = drawTableRow('NIP', data.nip, y);
  y = drawTableRow('Jabatan', data.jabatan, y);
  y = drawTableRow('Tanggal Kegiatan', formatDateIndonesian(data.tanggal), y);
  y = drawTableRow('Nama Kegiatan', data.namaKegiatan, y);
  y = drawTableRow('Ringkasan Kegiatan', data.ringkasanKegiatan, y);

  y -= 25;

  // 3. BAGIAN II: DOKUMENTASI
  page.drawText('BAGIAN II: DOKUMENTASI KEGIATAN', {
    x: margin,
    y: y,
    size: 10,
    font: fontBold,
    color: bpsBlue,
  });
  y -= 15;

  // Embed and draw photos in 2-column grid
  if (data.photosBase64 && data.photosBase64.length > 0) {
    const colGap = 15;
    const colWidth = (contentWidth - colGap) / 2;
    const imgHeight = 130;
    const captionHeight = 35;
    const cardHeight = imgHeight + captionHeight;

    let colIndex = 0;
    let cardY = y - cardHeight;

    for (let i = 0; i < data.photosBase64.length; i++) {
      // Check if space left on current page, add new page if necessary
      if (cardY < margin + 40) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
        cardY = y - cardHeight;
        colIndex = 0;
      }

      const photoX = margin + colIndex * (colWidth + colGap);

      // Card border
      page.drawRectangle({
        x: photoX,
        y: cardY,
        width: colWidth,
        height: cardHeight,
        borderColor: borderGray,
        borderWidth: 0.5,
        color: rgb(1, 1, 1),
      });

      // Embed photo
      try {
        const base64Clean = data.photosBase64[i].replace(/^data:image\/\w+;base64,/, '');
        const imageBytes = Buffer.from(base64Clean, 'base64');
        
        let embeddedImg;
        if (data.photosBase64[i].includes('data:image/png')) {
          embeddedImg = await pdfDoc.embedPng(imageBytes);
        } else {
          embeddedImg = await pdfDoc.embedJpg(imageBytes);
        }

        page.drawImage(embeddedImg, {
          x: photoX + 5,
          y: cardY + captionHeight + 5,
          width: colWidth - 10,
          height: imgHeight - 10,
        });
      } catch (imgErr) {
        // Fallback placeholder box if image fails to render
        page.drawRectangle({
          x: photoX + 5,
          y: cardY + captionHeight + 5,
          width: colWidth - 10,
          height: imgHeight - 10,
          color: headerBg,
        });
        page.drawText('[ Dokumentasi Photo ]', {
          x: photoX + 25,
          y: cardY + captionHeight + (imgHeight / 2),
          size: 8,
          font: fontRegular,
          color: darkText,
        });
      }

      // Caption Background
      page.drawRectangle({
        x: photoX,
        y: cardY,
        width: colWidth,
        height: captionHeight,
        color: headerBg,
      });

      // Caption Text
      const capNama = data.namaKegiatan.length > 30 ? data.namaKegiatan.substring(0, 28) + '...' : data.namaKegiatan;
      page.drawText(capNama, {
        x: photoX + 6,
        y: cardY + 20,
        size: 7.5,
        font: fontBold,
        color: darkText,
      });

      page.drawText(`Tanggal: ${formatDateIndonesian(data.tanggal)}`, {
        x: photoX + 6,
        y: cardY + 8,
        size: 7,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
      });

      // Grid toggle column index
      if (colIndex === 1) {
        colIndex = 0;
        y = cardY - 15;
        cardY = y - cardHeight;
      } else {
        colIndex = 1;
      }
    }
  } else {
    page.drawText('Tidak ada foto dokumentasi terlampir.', {
      x: margin,
      y: y - 10,
      size: 9,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  // Footer on all pages
  const totalPages = pdfDoc.getPageCount();
  for (let i = 0; i < totalPages; i++) {
    const currentPage = pdfDoc.getPage(i);
    currentPage.drawText(`${BPS_CONFIG.instansi} - Bukti Dukung Harian Kerja`, {
      x: margin,
      y: margin - 20,
      size: 7,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });

    const pageStr = `Halaman ${i + 1} dari ${totalPages}`;
    const pageStrWidth = fontRegular.widthOfTextAtSize(pageStr, 7);
    currentPage.drawText(pageStr, {
      x: pageWidth - margin - pageStrWidth,
      y: margin - 20,
      size: 7,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
