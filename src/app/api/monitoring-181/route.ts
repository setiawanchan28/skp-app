import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parseMon181CsvContent, Mon181ParsedResult } from '@/utils/mon181Parser';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

const MON181_DIR = path.join(process.cwd(), 'Mon181');

export async function GET() {
  try {
    let pplResult: Mon181ParsedResult | null = null;
    let pmlResult: Mon181ParsedResult | null = null;
    let historyList: any[] = [];

    // 1. Prioritize reading from Supabase database for persistent storage (Works across devices/refreshes)
    if (isSupabaseConfigured()) {
      try {
        const { data: dbRecords, error } = await supabaseAdmin
          .from('monitoring_181')
          .select('*')
          .order('uploaded_at', { ascending: false });

        if (!error && dbRecords && dbRecords.length > 0) {
          historyList = dbRecords;

          const latestPpl = dbRecords.find((r: any) => r.type === 'PPL');
          const latestPml = dbRecords.find((r: any) => r.type === 'PML');

          if (latestPpl) pplResult = latestPpl.parsed_data;
          if (latestPml) pmlResult = latestPml.parsed_data;
        }
      } catch (err) {
        console.warn('Supabase reading warning:', err);
      }
    }

    // 2. Fallback to local files in /Mon181 if Supabase is empty or unconfigured
    if (!pplResult || !pmlResult) {
      let files: string[] = [];
      if (fs.existsSync(MON181_DIR)) {
        files = fs.readdirSync(MON181_DIR).filter(f => f.endsWith('.csv') || f.endsWith('.xlsx') || f.endsWith('.xls'));
      }

      for (const file of files) {
        const filePath = path.join(MON181_DIR, file);
        if (file.endsWith('.csv')) {
          const content = fs.readFileSync(filePath, 'utf-8');
          const parsed = parseMon181CsvContent(content, file);

          if (parsed.type === 'PPL' && !pplResult) pplResult = parsed;
          else if (parsed.type === 'PML' && !pmlResult) pmlResult = parsed;
          else if (parsed.type === 'UNKNOWN') {
            if (file.toUpperCase().includes('PPL') && !pplResult) pplResult = parsed;
            if (file.toUpperCase().includes('PML') && !pmlResult) pmlResult = parsed;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      pplResult,
      pmlResult,
      historyList,
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
    const typeOverride = formData.get('type') as string | null;

    if (!file) {
      return NextResponse.json({ success: false, message: 'Tidak ada file yang diunggah' }, { status: 400 });
    }

    // Save to local filesystem directory /Mon181 if possible
    try {
      if (!fs.existsSync(MON181_DIR)) fs.mkdirSync(MON181_DIR, { recursive: true });
      const buffer = Buffer.from(await file.arrayBuffer());
      const filePath = path.join(MON181_DIR, file.name);
      fs.writeFileSync(filePath, buffer);
    } catch (e) {
      console.warn('Filesystem write warning:', e);
    }

    const fileContent = await file.text();
    const parsedResult = parseMon181CsvContent(fileContent, file.name);
    if (typeOverride === 'PPL' || typeOverride === 'PML') {
      parsedResult.type = typeOverride;
    }

    // Save to Supabase Database permanently
    if (isSupabaseConfigured()) {
      try {
        await supabaseAdmin.from('monitoring_181').insert({
          type: parsedResult.type,
          file_name: file.name,
          total_rows: parsedResult.totalRows,
          total_target: parsedResult.totalTarget,
          total_realisasi: parsedResult.totalRealisasi,
          overall_progres: parsedResult.overallProgres,
          parsed_data: parsedResult,
        });
      } catch (dbErr) {
        console.error('Supabase write error:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `File ${file.name} berhasil diunggah dan tersimpan permanen di database!`,
      parsedResult,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal mengunggah file' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id && isSupabaseConfigured()) {
      await supabaseAdmin.from('monitoring_181').delete().eq('id', id);
    }

    return NextResponse.json({ success: true, message: 'Riwayat data berhasil dihapus' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
