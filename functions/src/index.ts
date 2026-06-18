import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { google } from "googleapis";

// Inisialisasi autentikasi untuk Google Sheets API
// Anda perlu memastikan Service Account dari Firebase memiliki akses ke Sheet
// atau menetapkan variabel environment GOOGLE_APPLICATION_CREDENTIALS.
const auth = new google.auth.GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

// ID Spreadsheet yang sesuai permintaan Anda
const SPREADSHEET_ID = "1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao";

// Sesuaikan dengan nama sheet (tab) yang menampung data Task di dalam Spreadsheet
const SHEET_NAME = "Task"; 

export const syncTaskStatusToSheet = onDocumentUpdated("tasks/{taskId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    logger.error("Tidak ada data yang disertakan dalam event");
    return;
  }

  const beforeData = snapshot.before.data();
  const afterData = snapshot.after.data();

  const previousStatus = beforeData.status;
  const currentStatus = afterData.status;

  // Cek apakah kolom status berubah
  if (previousStatus === currentStatus) {
    logger.info("Status tidak berubah, mengabaikan perubahan.");
    return;
  }

  // Kita hanya ingin memproses perubahan menjadi "Review" atau "Done"
  if (currentStatus !== "Review" && currentStatus !== "Done") {
    logger.info(`Perubahan status menjadi "${currentStatus}" diabaikan.`);
    return;
  }

  const taskId = event.params.taskId;
  logger.info(`Mencoba memperbarui task ${taskId} ke status "${currentStatus}" di Google Sheets`);

  try {
    // 1. Ambil seluruh data dari Sheet untuk mencari baris mana yang cocok dengan taskId
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:Z`, // Membaca kolom A sampai Z
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      logger.error("Tidak ada data yang ditemukan di sheet.");
      return;
    }

    // 2. Cari indeks kolom untuk TASK ID dan STATUS pada baris pertama (header)
    const headers = rows[0];
    const taskIdColIndex = headers.findIndex((h: string) => h?.trim().toUpperCase() === "TASK ID" || h?.trim().toUpperCase() === "ID");
    const statusColIndex = headers.findIndex((h: string) => h?.trim().toUpperCase() === "STATUS");

    if (taskIdColIndex === -1 || statusColIndex === -1) {
      logger.error("Tidak dapat menemukan header kolom 'TASK ID' atau 'STATUS' pada sheet.");
      return;
    }

    // 3. Menemukan baris yang cocok dengan taskId berdasarkan nilai kolom TASK ID
    const rowIndex = rows.findIndex((row: any[], idx: number) => idx > 0 && String(row[taskIdColIndex]).trim() === String(taskId).trim());

    if (rowIndex === -1) {
      logger.error(`Task dengan ID ${taskId} tidak ditemukan pada data sheet.`);
      return;
    }

    // 4. Hitung notasi sel yang tepat untuk diperbarui (misalnya F2 atau H5)
    // Fungsi bantuan untuk mengubah indeks angka ke huruf kolom (0 -> A, 1 -> B, dst)
    const getColumnLetter = (colIdx: number) => {
      let temp, letter = '';
      while (colIdx >= 0) {
        temp = colIdx % 26;
        letter = String.fromCharCode(temp + 65) + letter;
        colIdx = Math.floor(colIdx / 26) - 1;
      }
      return letter;
    };

    const statusLetter = getColumnLetter(statusColIndex);
    const targetRowNumber = rowIndex + 1; // Array adalah 0-indexed, baris Google Sheet adalah 1-indexed
    const targetCellRange = `${SHEET_NAME}!${statusLetter}${targetRowNumber}`;

    // 5. Update sel tersebut pada Google Sheets
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: targetCellRange,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[currentStatus]],
      },
    });

    logger.info(`Sukses memperbarui status Task ${taskId} ke "${currentStatus}" di sel ${targetCellRange}`);
  } catch (error) {
    logger.error("Terjadi kegagalan saat menghubungi Google Sheets API", error);
  }
});
