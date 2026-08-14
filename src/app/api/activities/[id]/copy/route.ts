import { NextRequest, NextResponse } from 'next/server';
import { copyActivityRecord } from '@/services/laporanService';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const copied = await copyActivityRecord(id);
    return NextResponse.json({ success: true, data: copied });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
