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
  photosBase64?: string[];
}

/**
 * Generate official BPS Bukti Dukung Kegiatan PDF matching exact BPS Lebak template
 */
export async function generateBpsPdfBuffer(data: PdfReportData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // A4 dimensions: 595.28 x 841.89
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - 35;

  const black = rgb(0, 0, 0);
  const peachBg = rgb(0.97, 0.78, 0.56); // #F8C48C exact BPS header color
  const grayLine = rgb(0.2, 0.2, 0.2);

  // 1. LOGO & HEADER TITLE
  // Draw Top BPS Logo (3 Polygons: Blue, Orange, Green)
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
  // Header Bar Box
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

  // Table Rows: NAMA, JABATAN, NIP, KEGIATAN, RINGKASAN
  const rows = [
    { no: '1.', label: 'NAMA', val: data.namaPegawai },
    { no: '2.', label: 'JABATAN', val: data.jabatan },
    { no: '3.', label: 'NIP', val: data.nip },
    { no: '4.', label: 'KEGIATAN', val: data.namaKegiatan },
    { no: '5.', label: 'RINGKASAN', val: data.ringkasanKegiatan },
  ];

  const col1Width = 30; // No
  const col2Width = 100; // Field Name
  const col3Width = 15; // Colon :
  const col4Width = contentWidth - col1Width - col2Width - col3Width;

  const fontSize = 10;
  const lineHeight = 14;

  for (const row of rows) {
    // Text wrapping for Column 4
    const lines: string[] = [];
    const words = row.val.split(' ');
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

    const rowHeight = Math.max(lines.length * lineHeight + 10, 24);

    // Row Border Outer Box
    page.drawRectangle({
      x: margin,
      y: y - rowHeight,
      width: contentWidth,
      height: rowHeight,
      borderColor: black,
      borderWidth: 1,
    });

    // Column Dividers
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

    // Draw Column 1: No
    page.drawText(row.no, {
      x: margin + 8,
      y: y - 16,
      size: fontSize,
      font: fontRegular,
      color: black,
    });

    // Draw Column 2: Label
    page.drawText(row.label, {
      x: margin + col1Width + 8,
      y: y - 16,
      size: fontSize,
      font: fontRegular,
      color: black,
    });

    // Draw Column 3: Colon :
    page.drawText(':', {
      x: margin + col1Width + col2Width + 4,
      y: y - 16,
      size: fontSize,
      font: fontRegular,
      color: black,
    });

    // Draw Column 4: Value Lines
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

  // 3. BAGIAN II: II. DOKUMENTASI
  // Header Bar Box
  page.drawRectangle({
    x: margin,
    y: y - headerHeight,
    width: contentWidth,
    height: headerHeight,
    color: peachBg,
    borderColor: black,
    borderWidth: 1,
  });

  const sec2Text = 'II. DOKUMENTASI';
  const sec2Width = fontBold.widthOfTextAtSize(sec2Text, 11);
  page.drawText(sec2Text, {
    x: (pageWidth - sec2Width) / 2,
    y: y - 15,
    size: 11,
    font: fontBold,
    color: black,
  });
  y -= headerHeight;

  // Photo Section Box
  const photoBoxHeight = 250;
  const photoInnerY = y - photoBoxHeight;

  // Outer Border Box for Documentation Section
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

  // Horizontal divider for caption area
  page.drawLine({
    start: { x: margin, y: photoInnerY + captionAreaHeight },
    end: { x: margin + contentWidth, y: photoInnerY + captionAreaHeight },
    thickness: 1,
    color: black,
  });

  // Vertical Divider between 2 photo slots
  page.drawLine({
    start: { x: pageWidth / 2, y: y },
    end: { x: pageWidth / 2, y: photoInnerY + captionAreaHeight },
    thickness: 1,
    color: black,
  });

  // Embed Photos in 2 columns
  if (data.photosBase64 && data.photosBase64.length > 0) {
    const halfWidth = contentWidth / 2;

    for (let i = 0; i < Math.min(data.photosBase64.length, 2); i++) {
      const slotX = margin + i * halfWidth;

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
          x: slotX + 4,
          y: photoInnerY + captionAreaHeight + 4,
          width: halfWidth - 8,
          height: imageAreaHeight - 8,
        });
      } catch (err) {
        // Fallback photo box placeholder
        page.drawText('[ Foto Dokumentasi ]', {
          x: slotX + 40,
          y: photoInnerY + captionAreaHeight + (imageAreaHeight / 2),
          size: 9,
          font: fontRegular,
          color: black,
        });
      }
    }
  }

  // Draw Centered Documentation Captions at Bottom
  const capLine1 = data.namaKegiatan;
  const capLine1Width = fontRegular.widthOfTextAtSize(capLine1, 10);
  page.drawText(capLine1, {
    x: (pageWidth - capLine1Width) / 2,
    y: photoInnerY + 26,
    size: 10,
    font: fontRegular,
    color: black,
  });

  const capLine2 = formatDateIndonesian(data.tanggal);
  const capLine2Width = fontRegular.widthOfTextAtSize(capLine2, 10);
  page.drawText(capLine2, {
    x: (pageWidth - capLine2Width) / 2,
    y: photoInnerY + 10,
    size: 10,
    font: fontRegular,
    color: black,
  });

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
