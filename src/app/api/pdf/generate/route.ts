import { NextRequest, NextResponse } from 'next/server';
import { generateBpsPdfBuffer } from '@/lib/pdf';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pdfBuffer = await generateBpsPdfBuffer(body);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(
          body.namaKegiatan || 'laporan'
        )}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('API PDF generate error:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal menghasilkan PDF' },
      { status: 500 }
    );
  }
}
