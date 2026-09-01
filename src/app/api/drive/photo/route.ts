import { NextRequest, NextResponse } from 'next/server';
import { downloadDriveFileBuffer } from '@/lib/drive';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('id');

    if (!fileId || fileId.startsWith('foto_') || fileId.startsWith('mock_') || fileId.startsWith('prev_')) {
      return new NextResponse('Invalid file ID', { status: 400 });
    }

    const userToken = req.headers.get('x-google-token') || searchParams.get('token') || undefined;
    const downloaded = await downloadDriveFileBuffer(fileId, userToken);

    if (!downloaded || !downloaded.buffer) {
      return new NextResponse('Photo not found on Drive', { status: 404 });
    }

    return new NextResponse(new Uint8Array(downloaded.buffer), {
      status: 200,
      headers: {
        'Content-Type': downloaded.mimeType || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (err: any) {
    return new NextResponse(err.message || 'Error fetching drive photo', { status: 500 });
  }
}
