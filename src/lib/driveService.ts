import { getAccessToken } from './firebase';

const DRIVE_FOLDER_ID = '1_JsXFbHDqsoLO1Mxse1kLiptmtcHCiOF';

export class DriveService {
  /**
   * Initializes or returns the current authenticated token.
   * Throws an error if the user is not authenticated.
   */
  static async getToken(): Promise<string> {
    const token = await getAccessToken();
    if (!token) throw new Error('Not authenticated with Firebase.');
    if (token === 'mock-token') throw new Error('Mock authentication used, bypassing Drive API.');
    return token;
  }

  /**
   * Uploads a file to the specific Google Drive folder using a chunked resumable upload.
   * @param file The file to upload.
   * @returns Information about the uploaded file.
   */
  static async uploadFile(file: File) {
    const token = await this.getToken();

    const metadata = {
      name: file.name,
      parents: [DRIVE_FOLDER_ID]
    };

    // 1. Initial request to get the resumable upload URL
    const initRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': file.type || 'application/octet-stream',
        'X-Upload-Content-Length': file.size.toString()
      },
      body: JSON.stringify(metadata)
    });

    if (!initRes.ok) {
      const text = await initRes.text();
      throw new Error(`Failed to initialize upload: ${initRes.status} ${text}`);
    }

    const locationUrl = initRes.headers.get('Location');
    if (!locationUrl) {
      throw new Error('Upload initialization failed: No Location header found');
    }

    // 2. Upload the actual file content to the resumable location
    const uploadRes = await fetch(locationUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'Content-Length': file.size.toString()
      },
      body: file
    });

    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      throw new Error(`Failed to upload file content: ${uploadRes.status} ${text}`);
    }
    
    return uploadRes.json();
  }
}
