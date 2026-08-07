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

export interface DocxReportPhoto {
  base64: string;
  tanggal_foto?: string;
}

export interface DocxReportData {
  namaPegawai: string;
  nip: string;
  jabatan: string;
  tanggal: string;
  tanggalSelesai?: string;
  namaKegiatan: string;
  ringkasanKegiatan: string;
  photos?: DocxReportPhoto[];
  photosBase64?: string[];
}

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
 * Generate official BPS Bukti Dukung Kegiatan Word Document (.docx)
 */
export async function generateBpsDocxBuffer(data: DocxReportData): Promise<Buffer> {
  const dateYear = new Date(data.tanggal || Date.now()).getFullYear();
  const formattedDate = formatDateIndonesian(data.tanggal, data.tanggalSelesai);
  const dates = generateDateList(data.tanggal, data.tanggalSelesai);

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

  // Extract photos list
  let allPhotos: DocxReportPhoto[] = [];
  if (data.photos && data.photos.length > 0) {
    allPhotos = data.photos;
  } else if (data.photosBase64 && data.photosBase64.length > 0) {
    allPhotos = data.photosBase64.map((b) => ({ base64: b }));
  }

  // 3. Bagian II: Dokumentasi Tables (1 table per date in range)
  const docxTables: Table[] = [];

  for (let dIdx = 0; dIdx < dates.length; dIdx++) {
    const dItem = dates[dIdx];
    const isMultiDate = dates.length > 1;

    let datePhotos: DocxReportPhoto[] = [];
    if (isMultiDate) {
      datePhotos = allPhotos.filter((p) => p.tanggal_foto === dItem.dateStr);
      if (datePhotos.length === 0 && dIdx === 0 && allPhotos.length > 0) {
        datePhotos = allPhotos.filter((p) => !p.tanggal_foto);
      }
    } else {
      datePhotos = allPhotos;
    }

    const secHeaderTitle = isMultiDate
      ? `II. DOKUMENTASI (${dItem.label.toUpperCase()})`
      : 'II. DOKUMENTASI';

    const sec2HeaderRow = new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: secHeaderTitle,
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
    const totalPhotos = datePhotos.length;

    if (totalPhotos === 1) {
      try {
        const base64Clean = datePhotos[0].base64.replace(/^data:image\/\w+;base64,/, '');
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
                        type: datePhotos[0].base64.includes('png') ? 'png' : 'jpg',
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
                  children: [new TextRun({ text: dItem.label, size: 18, font: 'Arial' })],
                }),
              ],
            }),
          ],
        })
      );
    } else if (totalPhotos > 1) {
      const numRows = Math.ceil(totalPhotos / 2);
      for (let r = 0; r < numRows; r++) {
        const cells: TableCell[] = [];
        for (let c = 0; c < 2; c++) {
          const photoIdx = r * 2 + c;
          if (photoIdx < totalPhotos) {
            try {
              const base64Clean = datePhotos[photoIdx].base64.replace(/^data:image\/\w+;base64,/, '');
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
                          type: datePhotos[photoIdx].base64.includes('png') ? 'png' : 'jpg',
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

      // Shared caption row for grid
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
                  children: [new TextRun({ text: dItem.label, size: 18, font: 'Arial' })],
                }),
              ],
            }),
          ],
        })
      );
    } else {
      photoRows.push(
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 2,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: '[ Tidak Ada Foto ]', font: 'Arial', size: 20 })],
                }),
              ],
            }),
          ],
        })
      );
    }

    docxTables.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: photoRows,
      })
    );
  }

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
          ...docxTables.flatMap((tbl) => [tbl, new Paragraph({ text: '' })]),
          ...footerParagraphs,
        ],
      },
    ],
  });

  const docxBuffer = await Packer.toBuffer(doc);
  return docxBuffer;
}
