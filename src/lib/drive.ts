import { google } from 'googleapis';
import { Readable } from 'stream';
import { DriveFolderStructure, DriveUploadResult } from '@/types/drive';
import { getYearAndMonthName } from '@/utils/formatters';

const SCOPES = ['https://www.googleapis.com/auth/drive'];

function getDriveClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !privateKey || clientEmail.includes('dummy')) {
    return null;
  }

  // Format private key properly
  privateKey = privateKey.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: SCOPES,
  });

  return google.drive({ version: 'v3', auth });
}

/**
 * Ensure folder hierarchy exists in Google Drive:
 * Root Folder ("Laporan Harian Kerja") -> Year ("2026") -> Month ("Agustus") -> "Dokumentasi" & "PDF"
 */
export async function getOrCreateFolderHierarchy(dateString: string): Promise<DriveFolderStructure> {
  const drive = getDriveClient();
  const { year, monthName } = getYearAndMonthName(dateString);

  const rootParentId = process.env.GOOGLE_DRIVE_FOLDER_ID && !process.env.GOOGLE_DRIVE_FOLDER_ID.includes('root')
    ? process.env.GOOGLE_DRIVE_FOLDER_ID
    : null;

  if (!drive) {
    // Fallback response for offline/demo mode
    return {
      yearFolderId: `mock_year_${year}`,
      monthFolderId: `mock_month_${monthName}`,
      dokumentasiFolderId: `mock_dok_${year}_${monthName}`,
      pdfFolderId: `mock_pdf_${year}_${monthName}`,
    };
  }

  try {
    // 1. Ensure Root Folder "Laporan Harian Kerja" exists
    let mainRootId = rootParentId;
    if (!mainRootId) {
      mainRootId = await findOrCreateFolder(drive, 'Laporan Harian Kerja', 'root');
    }

    // 2. Ensure Year Folder exists (e.g. "2026")
    const yearFolderId = await findOrCreateFolder(drive, year, mainRootId);

    // 3. Ensure Month Folder exists (e.g. "Agustus")
    const monthFolderId = await findOrCreateFolder(drive, monthName, yearFolderId);

    // 4. Ensure "Dokumentasi" and "PDF" subfolders exist
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

  // Create folder if not found
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
    // Return mock URLs for testing when credentials aren't present
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

  // Set file permissions to 'anyone with link can view' for convenience
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
