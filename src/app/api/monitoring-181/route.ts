import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parseMon181CsvContent, Mon181ParsedResult } from '@/utils/mon181Parser';

const MON181_DIR = path.join(process.cwd(), 'Mon181');

export async function GET() {
  try {
    let files: string[] = [];
    if (fs.existsSync(MON181_DIR)) {
      files = fs.readdirSync(MON181_DIR).filter(f => f.endsWith('.csv') || f.endsWith('.xlsx') || f.endsWith('.xls'));
    }

    let pplResult: Mon181ParsedResult | null = null;
    let pmlResult: Mon181ParsedResult | null = null;

    for (const file of files) {
      const filePath = path.join(MON181_DIR, file);
      if (file.endsWith('.csv')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = parseMon181CsvContent(content, file);
        if (parsed.type === 'PPL' && !pplResult) {
          pplResult = parsed;
        } else if (parsed.type === 'PML' && !pmlResult) {
          pmlResult = parsed;
        } else if (parsed.type === 'UNKNOWN') {
          if (file.toUpperCase().includes('PPL') && !pplResult) pplResult = parsed;
          if (file.toUpperCase().includes('PML') && !pmlResult) pmlResult = parsed;
        }
      }
    }

    return NextResponse.json({
      success: true,
      files,
      pplResult,
      pmlResult,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal membaca data Mon181' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, message: 'Tidak ada file yang diunggah' }, { status: 400 });
    }

    if (!fs.existsSync(MON181_DIR)) {
      fs.mkdirSync(MON181_DIR, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(MON181_DIR, file.name);
    fs.writeFileSync(filePath, buffer);

    const fileContent = buffer.toString('utf-8');
    const parsedResult = parseMon181CsvContent(fileContent, file.name);

    return NextResponse.json({
      success: true,
      message: `File ${file.name} berhasil diunggah dan diproses`,
      parsedResult,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal mengunggah file' },
      { status: 500 }
    );
  }
}
