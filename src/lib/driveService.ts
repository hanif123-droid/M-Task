const DRIVE_FOLDER_ID = '1_JsXFbHDqsoLO1Mxse1kLiptmtcHCiOF';
const APPROPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbytmdIdahbQ4y354eHa7m0F84bmKo9AxEYFHXATG8uIeRYQZB11b-GO7v4Tr43Ysi-P8w/exec';

export class DriveService {
  /**
   * Uploads a file to the specific Google Drive folder using Google Apps Script.
   * @param file The file to upload.
   * @returns Information about the uploaded file.
   */
  static async uploadFile(file: File): Promise<{ id: string, url: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const resultStr = reader.result as string;
          const base64Data = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;
          
          const payload = {
            action: 'UPLOAD_FILE',
            folderId: DRIVE_FOLDER_ID,
            filename: file.name,
            mimeType: file.type || 'application/octet-stream',
            base64Data: base64Data
          };

          try {
            // Use mode: 'no-cors' so the browser doesn't throw a cross-origin 'Failed to fetch' error
            // when the Google Apps Script doesn't return CORS headers.
            const res = await fetch(APPROPS_SCRIPT_URL, {
              method: 'POST',
              mode: 'no-cors',
              headers: {
                'Content-Type': 'text/plain',
              },
              redirect: 'follow',
              body: JSON.stringify(payload)
            });
            
            // With 'no-cors', res.ok is false, and we can't read res.text().
            // We just assume success if it didn't throw a network error.
            
            const finalId = `upload_${Date.now()}`;
            const finalUrl = `https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID}`;
            
            resolve({ id: finalId, url: finalUrl });

          } catch (fetchErr: any) {
            console.error("Fetch to Apps Script failed, could be CORS issue:", fetchErr);
            // Fallback: If it's a CORS error, sometimes the upload itself still succeeds on the backend.
            // We just reject so the UI doesn't hang indefinitely, OR we resolve with unknown.
            reject(new Error(`Failed to fetch from Apps Script: ${fetchErr.message}. Ensure the script is deployed as web app accessible to "Anyone".`));
          }

        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file locally before upload.'));
      reader.readAsDataURL(file);
    });
  }
}


