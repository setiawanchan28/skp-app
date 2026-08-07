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
  ImageRun,
} from 'docx';
import { formatDateIndonesian } from '@/utils/formatters';
import { BPS_CONFIG, BULAN_INDONESIA } from '@/constants/bpsConfig';

export interface DocxReportData {
  namaPegawai: string;
  nip: string;
  jabatan: string;
  tanggal: string;
  tanggalSelesai?: string;
  namaKegiatan: string;
  ringkasanKegiatan: string;
  photosBase64?: string[];
}

function generateDateList(startDateStr: string, endDateStr?: string): string[] {
  if (!endDateStr || startDateStr === endDateStr) {
    return [formatDateIndonesian(startDateStr)];
  }

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return [formatDateIndonesian(startDateStr)];
  }

  const list: string[] = [];
  const curr = new Date(start);
  while (curr <= end) {
    list.push(
      `${curr.getDate()} ${BULAN_INDONESIA[curr.getMonth()]} ${curr.getFullYear()}`
    );
    curr.setDate(curr.getDate() + 1);
  }
  return list;
}

/**
 * Generate official BPS Bukti Dukung Kegiatan Word Document (.docx)
 */
export async function generateBpsDocxBuffer(data: DocxReportData): Promise<Buffer> {
  const dateYear = new Date(data.tanggal || Date.now()).getFullYear();
  const formattedDate = formatDateIndonesian(data.tanggal, data.tanggalSelesai);
  const dateList = generateDateList(data.tanggal, data.tanggalSelesai);

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
    new Paragraph({ text: '' }),
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
          width: { size: 5, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: no, font: 'Arial', size: 20 })] })],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, font: 'Arial', size: 20 })] })],
        }),
        new TableCell({
          width: { size: 3, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: ':', font: 'Arial', size: 20 })] })],
        }),
        new TableCell({
          width: { size: 67, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: value, font: 'Arial', size: 20 })] })],
        }),
      ],
    });

  const tableSection1 = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      sec1HeaderRow,
      createDetailRow('1.', 'NAMA', data.namaPegawai),
      createDetailRow('2.', 'JABATAN', data.jabatan),
      createDetailRow('3.', 'NIP', data.nip),
      createDetailRow('4.', 'KEGIATAN', data.namaKegiatan),
      createDetailRow('5.', 'TANGGAL', formattedDate),
      createDetailRow('6.', 'RINGKASAN', data.ringkasanKegiatan),
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

  const photoRows: TableRow[] = [sec2HeaderRow];
  const totalPhotos = data.photosBase64 ? data.photosBase64.length : 0;

  if (totalPhotos === 1) {
    // 1 Photo Uploaded: Centered full width cell
    try {
      const base64Clean = data.photosBase64![0].replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(base64Clean, 'base64');

      photoRows.push(
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 2,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new ImageRun({
                      data: imageBuffer,
                      transformation: { width: 320, height: 220 },
                      type: data.photosBase64![0].includes('png') ? 'png' : 'jpg',
                    }),
                  ],
                }),
              ],
            }),
          ],
        })
      );
    } catch (e) {}

    photoRows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: data.namaKegiatan, bold: true, size: 20, font: 'Arial' })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: formattedDate, size: 18, font: 'Arial' })],
              }),
            ],
          }),
        ],
      })
    );
  } else if (totalPhotos > 1) {
    // Multi photo grid
    const numRows = Math.ceil(totalPhotos / 2);
    for (let r = 0; r < numRows; r++) {
      const cells: TableCell[] = [];
      for (let c = 0; c < 2; c++) {
        const photoIdx = r * 2 + c;
        if (photoIdx < totalPhotos) {
          const photoDateLabel = dateList[photoIdx % dateList.length] || formattedDate;
          try {
            const base64Clean = data.photosBase64![photoIdx].replace(/^data:image\/\w+;base64,/, '');
            const imageBuffer = Buffer.from(base64Clean, 'base64');
            cells.push(
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new ImageRun({
                        data: imageBuffer,
                        transformation: { width: 220, height: 160 },
                        type: data.photosBase64![photoIdx].includes('png') ? 'png' : 'jpg',
                      }),
                    ],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: `Dokumentasi #${photoIdx + 1} (${photoDateLabel})`,
                        size: 16,
                        font: 'Arial',
                      }),
                    ],
                  }),
                ],
              })
            );
          } catch (e) {
            cells.push(
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [new Paragraph({ text: '[ Foto ]' })],
              })
            );
          }
        } else {
          cells.push(
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ text: '' })],
            })
          );
        }
      }
      photoRows.push(new TableRow({ children: cells }));
    }
  } else {
    photoRows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: '[ Tidak ada foto ]', font: 'Arial', size: 20 })],
              }),
            ],
          }),
        ],
      })
    );
  }

  const tableSection2 = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: photoRows,
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
