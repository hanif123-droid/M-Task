import { supabase } from './supabaseAuth';

export class DriveService {
  /**
   * Uploads a file to Supabase Storage. (Previously Google Drive)
   * @param file The file to upload.
   * @returns Information about the uploaded file.
   */
  static async uploadFile(file: File): Promise<{ id: string, url: string }> {
    try {
      // 1. If it's an image and larger than 1MB, try to compress it
      let fileToUpload = file;
      if (file.type.startsWith('image/') && file.size > 1024 * 1024) {
        try {
          fileToUpload = await this.compressImage(file);
        } catch (compressError) {
          console.warn("Image compression failed, uploading original:", compressError);
        }
      }

      // 2. Check size again after potential compression
      if (fileToUpload.size > 5 * 1024 * 1024) { // 5MB generic safeguard, though Supabase limit might be lower
        console.warn(`File ${fileToUpload.name} is quite large: ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB`);
      }

      const timestamp = new Date().getTime();
      const uniqueFileName = `${timestamp}_${fileToUpload.name.replace(/\s+/g, '_')}`;

      let bucketName = 'dokumen-aset';
      
      let uploadResult = await supabase.storage
        .from('dokumen-aset')
        .upload(uniqueFileName, fileToUpload);

      if (uploadResult.error) {
        // Fallback to Mtask
        uploadResult = await supabase.storage.from('Mtask').upload(uniqueFileName, fileToUpload);
        if (uploadResult.error) {
          if (uploadResult.error.message.includes('exceeded the maximum allowed size')) {
            throw new Error(`Ukuran file terlalu besar. Maksimal yang diizinkan adalah 1MB - 5MB (tergantung pengaturan server). Silakan perkecil ukuran file atau kompres gambar sebelum upload.`);
          }
          throw new Error(`Upload failed: ${uploadResult.error.message}`);
        }
        bucketName = 'Mtask';
      }

      const { data: pathData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(uniqueFileName);

      return { id: uniqueFileName, url: pathData.publicUrl };

    } catch (e: any) {
      console.error("Failed to upload to Supabase:", e);
      throw new Error(e.message.startsWith('Ukuran file') ? e.message : `Failed to upload to Supabase: ${e.message}`);
    }
  }

  /**
   * Simple client-side image compression using Canvas
   */
  private static async compressImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Max dimensions (e.g., 1920px)
          const MAX_WIDTH = 1920;
          const MAX_HEIGHT = 1920;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Compress to JPEG with 0.7 quality
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error("Canvas toBlob failed"));
              }
            },
            'image/jpeg',
            0.7
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  }
}
