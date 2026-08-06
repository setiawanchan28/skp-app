export interface DriveFolder {
  id: string;
  name: string;
  mimeType: string;
}

export interface DriveUploadResult {
  id: string;
  name: string;
  webViewLink: string;
  webContentLink?: string;
}

export interface DriveFolderStructure {
  yearFolderId: string;
  monthFolderId: string;
  dokumentasiFolderId: string;
  pdfFolderId: string;
}
