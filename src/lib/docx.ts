import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ImageRun,
} from 'docx';
import { formatDateIndonesian } from '@/utils/formatters';
import { BPS_CONFIG } from '@/constants/bpsConfig';

export interface DocxReportData {
  namaPegawai: string;
  nip: string;
  jabatan: string;
  tanggal: string;
  namaKegiatan: string;
  ringkasanKegiatan: string;
  photosBase64?: string[];
}

/**
 * Generate official BPS Bukti Dukung Kegiatan Word Document (.docx)
 */
export async function generateBpsDocxBuffer(data: DocxReportData): Promise<Buffer> {
  const dateYear = new Date(data.tanggal || Date.now()).getFullYear();

  // 1. Header Paragraphs
  const headerParagraphs = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: BPS_CONFIG.instansi,
          bold: true,
          size: 24, // 12pt
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: BPS_CONFIG.judulLaporan,
          bold: true,
          size: 26, // 13pt
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `BADAN PUSAT STATISTIK KABUPATEN LEBAK TAHUN ${dateYear}`,
          bold: true,
          size: 24, // 12pt
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({ text: '' }), // Spacer
  ];

  // 2. Bagian I: Keterangan Pelaksana Table
  const sec1HeaderRow = new TableRow({
    children: [
      new TableCell({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'I. KETERANGAN PELAKSANA',
                bold: true,
                size: 22,
                font: 'Arial',
              }),
            ],
          }),
        ],
        shading: { fill: 'F8C48C' },
        columnSpan: 4,
      }),
    ],
  });

  const createDetailRow = (no: string, label: string, value: string) =>
    new TableRow({
      children: [
        new TableCell({
          width: { size: 5, unit: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: no, font: 'Arial', size: 20 })] })],
        }),
        new TableCell({
          width: { size: 25, unit: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, font: 'Arial', size: 20 })] })],
        }),
        new TableCell({
          width: { size: 3, unit: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: ':', font: 'Arial', size: 20 })] })],
        }),
        new TableCell({
          width: { size: 67, unit: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: value, font: 'Arial', size: 20 })] })],
        }),
      ],
    });

  const tableSection1 = new Table({
    width: { size: 100, unit: WidthType.PERCENTAGE },
    rows: [
      sec1HeaderRow,
      createDetailRow('1.', 'NAMA', data.namaPegawai),
      createDetailRow('2.', 'JABATAN', data.jabatan),
      createDetailRow('3.', 'NIP', data.nip),
      createDetailRow('4.', 'KEGIATAN', data.namaKegiatan),
      createDetailRow('5.', 'RINGKASAN', data.ringkasanKegiatan),
    ],
  });

  // 3. Bagian II: Dokumentasi Table
  const sec2HeaderRow = new TableRow({
    children: [
      new TableCell({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'II. DOKUMENTASI',
                bold: true,
                size: 22,
                font: 'Arial',
              }),
            ],
          }),
        ],
        shading: { fill: 'F8C48C' },
        columnSpan: 2,
      }),
    ],
  });

  // Process photo cells
  const photoCells: TableCell[] = [];
  if (data.photosBase64 && data.photosBase64.length > 0) {
    for (let i = 0; i < Math.min(data.photosBase64.length, 2); i++) {
      try {
        const base64Clean = data.photosBase64[i].replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Clean, 'base64');

        photoCells.push(
          new TableCell({
            width: { size: 50, unit: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new ImageRun({
                    data: imageBuffer,
                    transformation: {
                      width: 250,
                      height: 180,
                    },
                    type: data.photosBase64[i].includes('png') ? 'png' : 'jpg',
                  }),
                ],
              }),
            ],
          })
        );
      } catch (e) {
        photoCells.push(
          new TableCell({
            width: { size: 50, unit: WidthType.PERCENTAGE },
            children: [new Paragraph({ text: '[ Foto Dokumentasi ]' })],
          })
        );
      }
    }
  }

  // If only 1 photo, add empty second cell
  while (photoCells.length < 2) {
    photoCells.push(
      new TableCell({
        width: { size: 50, unit: WidthType.PERCENTAGE },
        children: [new Paragraph({ text: '' })],
      })
    );
  }

  const photoRow = new TableRow({ children: photoCells });

  const captionRow = new TableRow({
    children: [
      new TableCell({
        columnSpan: 2,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: data.namaKegiatan, bold: true, size: 20, font: 'Arial' }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: formatDateIndonesian(data.tanggal), size: 18, font: 'Arial' }),
            ],
          }),
        ],
      }),
    ],
  });

  const tableSection2 = new Table({
    width: { size: 100, unit: WidthType.PERCENTAGE },
    rows: [sec2HeaderRow, photoRow, captionRow],
  });

  // Footer Paragraphs
  const footerParagraphs = [
    new Paragraph({ text: '' }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: BPS_CONFIG.alamatFooter,
          size: 16,
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: BPS_CONFIG.contactFooter,
          size: 16,
          font: 'Arial',
        }),
      ],
    }),
  ];

  const doc = new Document({
    sections: [
      {
        children: [
          ...headerParagraphs,
          tableSection1,
          new Paragraph({ text: '' }),
          tableSection2,
          ...footerParagraphs,
        ],
      },
    ],
  });

  const docxBuffer = await Packer.toBuffer(doc);
  return docxBuffer;
}
