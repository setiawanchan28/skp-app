import { google } from 'googleapis';
import { Readable } from 'stream';
import { DriveFolderStructure, DriveUploadResult } from '@/types/drive';
import { getYearAndMonthName } from '@/utils/formatters';
import { Laporan } from '@/types/laporan';

const SCOPES = ['https://www.googleapis.com/auth/drive'];

function cleanEnvVal(val?: string): string {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '');
}

function extractRawDriveFolderId(input?: string): string | null {
  if (!input) return null;
  const trimmed = cleanEnvVal(input);
  if (trimmed.includes('folders/')) {
    const match = trimmed.match(/folders\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
  }
  if (trimmed.includes('id=')) {
    const match = trimmed.match(/id=([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
  }
  const cleaned = trimmed.replace(/\/+$/, '');
  if (cleaned.length > 5 && !cleaned.includes('/') && !cleaned.toLowerCase().includes('root')) {
    return cleaned;
  }
  return null;
}

function getDriveClient() {
  const clientId = cleanEnvVal(process.env.GOOGLE_CLIENT_ID);
  const clientSecret = cleanEnvVal(process.env.GOOGLE_CLIENT_SECRET);
  const refreshToken = cleanEnvVal(process.env.GOOGLE_REFRESH_TOKEN);

  // 1. Try OAuth2 Client ID + Refresh Token (User Preferred Method)
  if (clientId && clientSecret && refreshToken && !clientId.includes('dummy')) {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'https://developers.google.com/oauthplayground'
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  // 2. Fallback to Service Account JWT if present
  const clientEmail = cleanEnvVal(process.env.GOOGLE_CLIENT_EMAIL);
  let privateKey = cleanEnvVal(process.env.GOOGLE_PRIVATE_KEY);

  if (clientEmail && privateKey && !clientEmail.includes('dummy')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: SCOPES,
    });

    return google.drive({ version: 'v3', auth });
  }

  return null;
}

/**
 * Ensure folder hierarchy exists in Google Drive:
 * Root Folder ("Laporan Harian Kerja") -> Year ("2026") -> Month ("Agustus") -> "Dokumentasi" & "PDF"
 */
export async function getOrCreateFolderHierarchy(dateString: string): Promise<DriveFolderStructure> {
  const drive = getDriveClient();
  const { year, monthName } = getYearAndMonthName(dateString);

  const rootParentId = extractRawDriveFolderId(process.env.GOOGLE_DRIVE_FOLDER_ID);

  if (!drive) {
    return {
      yearFolderId: `mock_year_${year}`,
      monthFolderId: `mock_month_${monthName}`,
      dokumentasiFolderId: `mock_dok_${year}_${monthName}`,
      pdfFolderId: `mock_pdf_${year}_${monthName}`,
    };
  }

  try {
    let mainRootId = rootParentId;
    if (!mainRootId) {
      mainRootId = await findOrCreateFolder(drive, 'Laporan Harian Kerja', 'root');
    }

    const yearFolderId = await findOrCreateFolder(drive, year, mainRootId);
    const monthFolderId = await findOrCreateFolder(drive, monthName, yearFolderId);
    const dokumentasiFolderId = await findOrCreateFolder(drive, 'Dokumentasi', monthFolderId);
    const pdfFolderId = await findOrCreateFolder(drive, 'PDF', monthFolderId);

    return {
      yearFolderId,
      monthFolderId,
      dokumentasiFolderId,
      pdfFolderId,
    };
  } catch (error) {
    console.error('Error creating Google Drive hierarchy:', error);
    return {
      yearFolderId: 'fallback_year',
      monthFolderId: 'fallback_month',
      dokumentasiFolderId: 'fallback_dok',
      pdfFolderId: 'fallback_pdf',
    };
  }
}

/**
 * Search for an existing folder under parentId or create it if not found
 */
async function findOrCreateFolder(drive: any, folderName: string, parentId: string): Promise<string> {
  const query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and '${parentId}' in parents and trashed = false`;
  
  const searchRes = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (searchRes.data.files && searchRes.data.files.length > 0) {
    return searchRes.data.files[0].id || '';
  }

  const createRes = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  });

  return createRes.data.id || '';
}

/**
 * Upload file buffer or stream to a specific Google Drive folder
 */
export async function uploadFileToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId: string
): Promise<DriveUploadResult> {
  const drive = getDriveClient();

  if (!drive || folderId.startsWith('mock_') || folderId.startsWith('fallback_')) {
    const fakeId = `file_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    return {
      id: fakeId,
      name: fileName,
      webViewLink: `https://drive.google.com/file/d/${fakeId}/view`,
      webContentLink: `https://drive.google.com/uc?id=${fakeId}&export=download`,
    };
  }

  const bufferStream = new Readable();
  bufferStream.push(buffer);
  bufferStream.push(null);

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: mimeType,
      body: bufferStream,
    },
    fields: 'id, name, webViewLink, webContentLink',
  });

  const fileId = res.data.id || `file_${Date.now()}`;

  try {
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
  } catch (permErr) {
    console.warn('Could not set public permission on Drive file:', permErr);
  }

  return {
    id: fileId,
    name: res.data.name || fileName,
    webViewLink: res.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
    webContentLink: res.data.webContentLink || undefined,
  };
}

/**
 * Delete file from Google Drive
 */
export async function deleteFileFromDrive(fileId: string): Promise<boolean> {
  const drive = getDriveClient();
  if (!drive || !fileId || fileId.startsWith('file_') || fileId.startsWith('mock_')) {
    return true;
  }

  try {
    await drive.files.delete({ fileId });
    return true;
  } catch (err) {
    console.warn('Failed to delete Google Drive file:', err);
    return false;
  }
}

/**
 * Fetch cloud-synced laporan list directly from Google Drive cloud storage
 */
export async function fetchLaporanFromDriveCloud(): Promise<Laporan[]> {
  const drive = getDriveClient();
  if (!drive) return [];

  try {
    const rootParentId = extractRawDriveFolderId(process.env.GOOGLE_DRIVE_FOLDER_ID) || 'root';
    const query = `name = 'bps_laporan_db.json' and '${rootParentId}' in parents and trashed = false`;
    const res = await drive.files.list({ q: query, fields: 'files(id, name)' });

    if (res.data.files && res.data.files.length > 0) {
      const fileId = res.data.files[0].id;
      const fileRes = await drive.files.get({ fileId: fileId!, alt: 'media' }, { responseType: 'text' });
      const rawData = fileRes.data as string;
      return JSON.parse(rawData);
    }
  } catch (err) {
    console.warn('Drive Cloud DB fetch notice:', err);
  }

  return [];
}

/**
 * Sync and save laporan record directly to Google Drive cloud storage
 */
export async function syncLaporanToDriveCloud(laporanItem: Laporan): Promise<boolean> {
  const drive = getDriveClient();
  if (!drive) return false;

  try {
    const rootParentId = extractRawDriveFolderId(process.env.GOOGLE_DRIVE_FOLDER_ID) || 'root';
    const currentList = await fetchLaporanFromDriveCloud();

    const existingIdx = currentList.findIndex((l) => l.id === laporanItem.id);
    let updatedList: Laporan[];
    if (existingIdx >= 0) {
      updatedList = [...currentList];
      updatedList[existingIdx] = laporanItem;
    } else {
      updatedList = [laporanItem, ...currentList];
    }

    const jsonString = JSON.stringify(updatedList, null, 2);
    const bufferStream = new Readable();
    bufferStream.push(Buffer.from(jsonString, 'utf-8'));
    bufferStream.push(null);

    const query = `name = 'bps_laporan_db.json' and '${rootParentId}' in parents and trashed = false`;
    const res = await drive.files.list({ q: query, fields: 'files(id, name)' });

    if (res.data.files && res.data.files.length > 0) {
      const fileId = res.data.files[0].id;
      await drive.files.update({
        fileId: fileId!,
        media: { mimeType: 'application/json', body: bufferStream },
      });
    } else {
      await drive.files.create({
        requestBody: { name: 'bps_laporan_db.json', parents: [rootParentId], mimeType: 'application/json' },
        media: { mimeType: 'application/json', body: bufferStream },
      });
    }
    return true;
  } catch (err) {
    console.warn('Drive Cloud DB sync notice:', err);
    return false;
  }
}
