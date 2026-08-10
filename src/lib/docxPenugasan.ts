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
  BorderStyle,
  ImageRun,
} from 'docx';
import { LaporanPenugasan } from '@/types/penugasan';
import { formatDateIndonesian } from '@/utils/formatters';

export async function generatePenugasanDocxBuffer(
  laporan: LaporanPenugasan,
  compressedPhotos: { buffer: Buffer; fileName: string; tanggalFoto?: string }[]
): Promise<Buffer> {
  const greyBg = 'F0F0F0';
  const borderStyle = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: 'CCCCCC',
  };
  const cellBorders = {
    top: borderStyle,
    bottom: borderStyle,
    left: borderStyle,
    right: borderStyle,
  };

  const currentYear = laporan.tanggal_perjadin ? new Date(laporan.tanggal_perjadin).getFullYear() : 2026;

  // Header Titles
  const titleParagraphs = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'BADAN PUSAT STATISTIK KABUPATEN LEBAK',
          bold: true,
          size: 20,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `LAPORAN PENUGASAN BADAN PUSAT STATISTIK KABUPATEN LEBAK`,
          bold: true,
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `TAHUN ${currentYear}`,
          bold: true,
          size: 22,
        }),
      ],
      spacing: { after: 300 },
    }),
  ];

  // Section Header Helper
  const createSectionHeader = (title: string) =>
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 2,
          shading: { fill: greyBg },
          borders: cellBorders,
          children: [
            new Paragraph({
              children: [new TextRun({ text: title, bold: true, size: 18 })],
            }),
          ],
        }),
      ],
    });

  // Key-Value Row Helper
  const createKvRow = (label: string, val: string) =>
    new TableRow({
      children: [
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          borders: cellBorders,
          children: [new Paragraph({ children: [new TextRun({ text: label, size: 18 })] })],
        }),
        new TableCell({
          width: { size: 70, type: WidthType.PERCENTAGE },
          borders: cellBorders,
          children: [new Paragraph({ children: [new TextRun({ text: val || '', size: 18 })] })],
        }),
      ],
    });

  // Table I: Pelaksana
  const table1 = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      createSectionHeader('I. KETERANGAN PELAKSANA PERJALANAN DINAS'),
      createKvRow('Nama', laporan.nama_pegawai),
      createKvRow('Jabatan', laporan.jabatan),
      createKvRow('NIP', laporan.nip),
    ],
  });

  // Table II: Perjalanan Dinas
  const tglFormatted = formatDateIndonesian(laporan.tanggal_perjadin, laporan.tanggal_selesai_perjadin);
  const table2 = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      createSectionHeader('II. KETERANGAN PERJALANAN DINAS'),
      createKvRow('Nama Kegiatan', laporan.nama_kegiatan),
      createKvRow('Tanggal Perjadin', tglFormatted),
      createKvRow('Tempat Tujuan', laporan.tempat_tujuan),
      createKvRow('Nomor Surat', laporan.nomor_surat),
      createKvRow('Nomor SPD', laporan.nomor_spd),
    ],
  });

  // Table III: Petugas Ditemui
  const petugasList = laporan.petugas_ditemui || [];
  const petugasRows = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 10, type: WidthType.PERCENTAGE },
          shading: { fill: greyBg },
          borders: cellBorders,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No', bold: true, size: 18 })] })],
        }),
        new TableCell({
          width: { size: 45, type: WidthType.PERCENTAGE },
          shading: { fill: greyBg },
          borders: cellBorders,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Nama', bold: true, size: 18 })] })],
        }),
        new TableCell({
          width: { size: 45, type: WidthType.PERCENTAGE },
          shading: { fill: greyBg },
          borders: cellBorders,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Jabatan', bold: true, size: 18 })] })],
        }),
      ],
    }),
  ];

  if (petugasList.length === 0) {
    petugasRows.push(
      new TableRow({
        children: [
          new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '1', size: 18 })] })] }),
          new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: '-', size: 18 })] })] }),
          new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: '-', size: 18 })] })] }),
        ],
      })
    );
  } else {
    petugasList.forEach((p, idx) => {
      petugasRows.push(
        new TableRow({
          children: [
            new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(idx + 1), size: 18 })] })] }),
            new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: p.nama || '', size: 18 })] })] }),
            new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: p.jabatan || '', size: 18 })] })] }),
          ],
        })
      );
    });
  }

  const table3Header = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [createSectionHeader('III. DAFTAR PETUGAS YANG DITEMUI')],
  });

  const table3Content = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: petugasRows,
  });

  // Table IV: Resume
  const table4 = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      createSectionHeader('IV. RESUME PERJALANAN DINAS'),
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            borders: cellBorders,
            children: [
              new Paragraph({
                children: [new TextRun({ text: laporan.resume_kegiatan || '', size: 18 })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Table V: Dokumentasi
  const docChildren: any[] = [
    ...titleParagraphs,
    table1,
    new Paragraph({ spacing: { after: 200 } }),
    table2,
    new Paragraph({ spacing: { after: 200 } }),
    table3Header,
    table3Content,
    new Paragraph({ spacing: { after: 200 } }),
    table4,
  ];

  if (compressedPhotos.length > 0) {
    const table5Header = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [createSectionHeader('V. DOKUMENTASI')],
    });
    docChildren.push(new Paragraph({ spacing: { before: 200 } }), table5Header);

    // Render photos in table cells
    const photoRows: TableRow[] = [];
    for (let i = 0; i < compressedPhotos.length; i += 2) {
      const item1 = compressedPhotos[i];
      const cells: TableCell[] = [];

      try {
        cells.push(
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: cellBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new ImageRun({
                    data: item1.buffer,
                    transformation: { width: 220, height: 145 },
                    type: 'jpg',
                  } as any),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: item1.tanggalFoto ? `Dokumentasi - ${formatDateIndonesian(item1.tanggalFoto)}` : `Dokumentasi ${i + 1}`,
                    size: 16,
                  }),
                ],
              }),
            ],
          })
        );
      } catch (e) {}

      if (i + 1 < compressedPhotos.length) {
        const item2 = compressedPhotos[i + 1];
        try {
          cells.push(
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: cellBorders,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new ImageRun({
                      data: item2.buffer,
                      transformation: { width: 220, height: 145 },
                      type: 'jpg',
                    } as any),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: item2.tanggalFoto ? `Dokumentasi - ${formatDateIndonesian(item2.tanggalFoto)}` : `Dokumentasi ${i + 2}`,
                      size: 16,
                    }),
                  ],
                }),
              ],
            })
          );
        } catch (e) {}
      } else {
        cells.push(
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: cellBorders,
            children: [new Paragraph({ text: '' })],
          })
        );
      }

      photoRows.push(new TableRow({ children: cells }));
    }

    const table5Content = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: photoRows,
    });
    docChildren.push(table5Content);
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children: docChildren,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
