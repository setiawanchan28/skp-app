import { google } from 'googleapis';
import { Readable } from 'stream';
import { DriveFolderStructure, DriveUploadResult } from '@/types/drive';
import { formatDriveFolderName, formatDrivePdfName } from '@/utils/sanitizeFilename';
import { Activity } from '@/types/laporan';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

function cleanEnvVal(val?: string): string {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '');
}

export function extractRawDriveFolderId(input?: string): string | null {
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

function getDriveClient(userAccessToken?: string) {
  if (userAccessToken && userAccessToken.length > 5 && !userAccessToken.includes('dummy')) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: userAccessToken });
    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  const clientId = cleanEnvVal(process.env.GOOGLE_CLIENT_ID);
  const clientSecret = cleanEnvVal(process.env.GOOGLE_CLIENT_SECRET);
  const refreshToken = cleanEnvVal(process.env.GOOGLE_REFRESH_TOKEN);

  if (clientId && clientSecret && refreshToken && !clientId.includes('dummy')) {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'https://developers.google.com/oauthplayground'
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return google.drive({ version: 'v3', auth: oauth2Client });
  }

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
 * Standard Folder Structure (PRD.md / SRS.md / DESIGN.md):
 * Laporan Kegiatan / YYYY / MM / YYMMDD - Nama Kegiatan /
 */
export async function getOrCreateActivityDriveFolder(
  startDateString: string,
  activityName: string,
  userAccessToken?: string
): Promise<{ rootFolderId: string; yearFolderId: string; monthFolderId: string; activityFolderId: string }> {
  const drive = getDriveClient(userAccessToken);
  const date = new Date(startDateString || Date.now());
  const yearStr = isNaN(date.getFullYear()) ? String(new Date().getFullYear()) : String(date.getFullYear());
  const monthStr = isNaN(date.getMonth()) ? '01' : String(date.getMonth() + 1).padStart(2, '0');
  const activityFolderName = formatDriveFolderName(startDateString, activityName);

  const rootParentId = extractRawDriveFolderId(process.env.GOOGLE_DRIVE_FOLDER_ID);

  if (!drive) {
    throw new Error('Kredensial Google Drive tidak tersedia. Silakan logout lalu login kembali menggunakan akun Google (Gmail) Anda.');
  }

  try {
    let mainRootId = rootParentId || '';
    if (!mainRootId) {
      mainRootId = await findOrCreateFolder(drive, 'Laporan Kegiatan', 'root');
    }

    const yearFolderId = await findOrCreateFolder(drive, yearStr, mainRootId);
    const monthFolderId = await findOrCreateFolder(drive, monthStr, yearFolderId);
    const activityFolderId = await findOrCreateFolder(drive, activityFolderName, monthFolderId);

    return {
      rootFolderId: mainRootId,
      yearFolderId,
      monthFolderId,
      activityFolderId,
    };
  } catch (err: any) {
    console.error('Google Drive folder hierarchy creation error:', err);
    throw new Error(`Gagal membuat folder di Google Drive: ${err.message || 'Izin Google OAuth tidak mencukupi'}`);
  }
}

/**
 * Backward compatibility helper wrapper
 */
export async function getOrCreateFolderHierarchy(dateString: string): Promise<DriveFolderStructure> {
  const res = await getOrCreateActivityDriveFolder(dateString, 'Kegiatan');
  return {
    yearFolderId: res.yearFolderId,
    monthFolderId: res.monthFolderId,
    dokumentasiFolderId: res.activityFolderId,
    pdfFolderId: res.activityFolderId,
  };
}

async function findOrCreateFolder(drive: any, folderName: string, parentId?: string): Promise<string> {
  let query = `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentId && parentId !== 'root') {
    query += ` and '${parentId}' in parents`;
  } else {
    query += ` and 'root' in parents`;
  }

  try {
    const searchRes = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (searchRes.data.files && searchRes.data.files.length > 0) {
      return searchRes.data.files[0].id || '';
    }
  } catch (searchErr) {
    console.warn('Folder search failed, attempting create directly:', searchErr);
  }

  const requestBody: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId && parentId !== 'root') {
    requestBody.parents = [parentId];
  }

  const createRes = await drive.files.create({
    requestBody,
    fields: 'id',
  });

  return createRes.data.id || '';
}

/**
 * Upload file buffer to Google Drive folder
 */
export async function uploadFileToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId: string,
  existingFileId?: string,
  userAccessToken?: string
): Promise<DriveUploadResult> {
  const drive = getDriveClient(userAccessToken);

  if (!drive) {
    throw new Error('Kredensial Google Drive tidak tersedia. Silakan logout lalu login kembali menggunakan akun Google (Gmail) Anda.');
  }

  if (folderId.startsWith('mock_') || folderId.startsWith('fallback_')) {
    throw new Error('Folder tujuan Google Drive tidak valid.');
  }

  const bufferStream = new Readable();
  bufferStream.push(buffer);
  bufferStream.push(null);

  let fileId = existingFileId;

  if (fileId && !fileId.startsWith('mock_') && !fileId.startsWith('file_')) {
    try {
      const res = await drive.files.update({
        fileId: fileId,
        media: { mimeType, body: bufferStream },
        fields: 'id, name, webViewLink, webContentLink',
      });
      return {
        id: res.data.id || fileId,
        name: res.data.name || fileName,
        webViewLink: res.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
        webContentLink: res.data.webContentLink || undefined,
      };
    } catch (updateErr) {
      console.warn('Drive update file failed, falling back to create:', updateErr);
    }
  }

  const requestBody: any = { name: fileName };
  if (folderId && folderId !== 'root') {
    requestBody.parents = [folderId];
  }

  const res = await drive.files.create({
    requestBody,
    media: {
      mimeType: mimeType,
      body: bufferStream,
    },
    fields: 'id, name, webViewLink, webContentLink',
  });

  fileId = res.data.id || undefined;
  if (!fileId) {
    throw new Error('Google Drive API tidak mengembalikan ID berkas setelah upload.');
  }

  // Set permission "Anyone with the link - Viewer" for PDFs
  if (mimeType === 'application/pdf') {
    try {
      await drive.permissions.create({
        fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (permErr) {
      console.warn('Could not set public permission on Drive PDF:', permErr);
    }
  }

  let viewLink = res.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
  if (viewLink.includes('/edit')) {
    viewLink = viewLink.replace(/\/edit.*$/, '/view?usp=sharing');
  }

  return {
    id: fileId,
    name: res.data.name || fileName,
    webViewLink: viewLink,
    webContentLink: res.data.webContentLink || undefined,
  };
}

/**
 * Rename Google Drive resource (Folder or File) for Force Change workflow
 */
export async function renameDriveResource(resourceId: string, newName: string): Promise<boolean> {
  const drive = getDriveClient();
  if (!drive || !resourceId || resourceId.startsWith('mock_') || resourceId.startsWith('file_')) {
    return true;
  }

  try {
    await drive.files.update({
      fileId: resourceId,
      requestBody: { name: newName },
    });
    return true;
  } catch (err) {
    console.error('Failed to rename Google Drive resource:', err);
    return false;
  }
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
 * Legacy stubs for backward compatibility
 */
export async function fetchLaporanFromDriveCloud(): Promise<Activity[]> {
  return [];
}

export async function syncLaporanToDriveCloud(laporanItem: any): Promise<boolean> {
  return true;
}
