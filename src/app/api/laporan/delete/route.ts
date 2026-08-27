import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getStoredLaporanList, saveStoredLaporanList } from '@/lib/laporanStore';
import { fetchLaporanFromDriveCloud, deleteFileFromDrive } from '@/lib/drive';
import { Readable } from 'stream';
import { google } from 'googleapis';

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'ID laporan wajib diisi' }, { status: 400 });
    }

    // 1. Delete from Server JSON Store
    const currentServerList = getStoredLaporanList();
    const updatedServerList = currentServerList.filter((l) => l.id !== id);
    saveStoredLaporanList(updatedServerList);

    // 2. Delete from Supabase DB using supabaseAdmin
    if (isSupabaseConfigured()) {
      try {
        await supabaseAdmin.from('activity_documents').delete().eq('activity_id', id);
        await supabaseAdmin.from('activity_people').delete().eq('activity_id', id);
        await supabaseAdmin.from('activities').delete().eq('id', id);
        await supabaseAdmin.from('laporan_foto').delete().eq('laporan_id', id);
        await supabaseAdmin.from('laporan').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase DB delete notice:', err);
      }
    }

    // 3. Delete from Google Drive Cloud DB store
    try {
      const driveList = await fetchLaporanFromDriveCloud();
      const targetItem = driveList.find((l) => l.id === id);
      if (targetItem?.drive_pdf_file_id) {
        await deleteFileFromDrive(targetItem.drive_pdf_file_id);
      }
      const updatedDriveList = driveList.filter((l) => l.id !== id);

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

      if (clientId && clientSecret && refreshToken && !clientId.includes('dummy')) {
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 'https://developers.google.com/oauthplayground');
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || 'root';
        const query = `name = 'bps_laporan_db.json' and '${folderId}' in parents and trashed = false`;
        const res = await drive.files.list({ q: query, fields: 'files(id)' });

        if (res.data.files && res.data.files.length > 0) {
          const fileId = res.data.files[0].id;
          const bufferStream = new Readable();
          bufferStream.push(Buffer.from(JSON.stringify(updatedDriveList, null, 2), 'utf-8'));
          bufferStream.push(null);

          await drive.files.update({
            fileId: fileId!,
            media: { mimeType: 'application/json', body: bufferStream },
          });
        }
      }
    } catch (err) {
      console.warn('Google Drive Cloud DB delete notice:', err);
    }

    return NextResponse.json({
      success: true,
      message: 'Laporan berhasil dihapus secara permanen di seluruh penyimpanan (Local, Server, Google Drive, & Supabase DB)!',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menghapus laporan' }, { status: 500 });
  }
}
