// SILAHKAN COPY KODE INI KE APPS SCRIPT ANDA (Editor Apps Script)

// Masukkan ID Google Sheet Anda di bawah ini
const SPREADSHEET_ID = "1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao";
const SHEET_NAME = "User";

/**
 * Mendapatkan referensi Tabel Sheet "User"
 */
function getUserSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    // Jika sheet belum ada, maka buat baru
    sheet = ss.insertSheet(SHEET_NAME);
    // Buat Header utama: Email, Password, dan info opsional seperti Tanggal Daftar
    sheet.appendRow(["Email", "Password", "Tanggal Daftar"]);
  }
  return sheet;
}

/**
 * Melayani User Interface jika di-deploy sebagai Web App
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('MTask Auth System')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
}

/**
 * FUngsi SignUpUser: Memeriksa apakah email sudah ada di tabel "User".
 * Jika belum ada, masukkan email dan password baru ke baris paling bawah.
 * 
 * @param {string} email
 * @param {string} password
 * @return {object} respon hasil pendaftaran
 */
function signUpUser(email, password) {
  try {
    if (!email || !password) {
      return { success: false, message: "Email dan password tidak boleh kosong." };
    }
    
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    
    if (cleanPassword.length < 6) {
      return { success: false, message: "Password minimal harus memiliki length 6 karakter." };
    }

    const sheet = getUserSheet();
    const data = sheet.getDataRange().getValues();
    
    // Cari index kolom "Email" di header
    const headers = data[0];
    const emailIdx = headers.indexOf("Email");
    const passwordIdx = headers.indexOf("Password");
    
    if (emailIdx === -1 || passwordIdx === -1) {
      return { success: false, message: "Struktur kolom 'Email' atau 'Password' di Tabel Sheet tidak ditemukan." };
    }

    // Periksa apakah email sudah terdaftar
    for (let i = 1; i < data.length; i++) {
      const existingEmail = String(data[i][emailIdx]).trim().toLowerCase();
      if (existingEmail === cleanEmail) {
        return { success: false, message: "Email sudah terdaftar. Silahkan login." };
      }
    }

    // Jika belum terdaftar, tambahkan data baru sesuai kolom
    const newRow = [];
    for (let j = 0; j < headers.length; j++) {
      const headerTitle = headers[j];
      if (headerTitle === "Email") {
        newRow.push(cleanEmail);
      } else if (headerTitle === "Password") {
        newRow.push(cleanPassword);
      } else if (headerTitle === "Tanggal Daftar") {
        newRow.push(new Date());
      } else {
        newRow.push(""); // Kosongkan kolom lain jika ada
      }
    }
    
    sheet.appendRow(newRow);
    return { success: true, message: "Pendaftaran berhasil! Silahkan login menggunakan email Anda." };

  } catch (error) {
    return { success: false, message: "Error saat signUpUser: " + error.toString() };
  }
}

/**
 * Fungsi checkLogin: Memeriksa dan mencocokkan email dan password di tabel "User".
 * 
 * @param {string} email
 * @param {string} password
 * @return {object} respon status login terpilih beserta email aktif
 */
function checkLogin(email, password) {
  try {
    if (!email || !password) {
      return { success: false, message: "Email dan password wajib diisi." };
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    
    const sheet = getUserSheet();
    const data = sheet.getDataRange().getValues();
    
    const headers = data[0];
    const emailIdx = headers.indexOf("Email");
    const passwordIdx = headers.indexOf("Password");
    
    if (emailIdx === -1 || passwordIdx === -1) {
      return { success: false, message: "Struktur tabel 'Email' atau 'Password' tidak ditemukan di Google Sheet." };
    }

    // Cari baris yang cocok
    for (let i = 1; i < data.length; i++) {
      const sheetEmail = String(data[i][emailIdx]).trim().toLowerCase();
      const sheetPassword = String(data[i][passwordIdx]).trim();
      
      if (sheetEmail === cleanEmail) {
        if (sheetPassword === cleanPassword) {
          return {
            success: true,
            message: "Login Berhasil!",
            user: {
              email: data[i][emailIdx].trim(), // Return email asli sesuai penulisan sheet
              rowIndex: i + 1
            }
          };
        } else {
          return { success: false, message: "Password yang Anda masukkan salah." };
        }
      }
    }

    return { success: false, message: "User email tidak ditemukan di database." };

  } catch (error) {
    return { success: false, message: "Error saat checkLogin: " + error.toString() };
  }
}
