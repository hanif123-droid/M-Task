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

/**
 * Helper untuk mencari Sheet secara toleran (exact match diutamakan)
 */
function getSheetCaseInsensitive(ss, sheetName) {
  if (!sheetName) return null;
  // Bersihkan kutip tunggal atau spasi luar
  var cleanTarget = sheetName.replace(/^['"]|['"]$/g, '').trim();
  
  // 1. Cek exact match
  var exact = ss.getSheetByName(cleanTarget);
  if (exact) return exact;

  // 2. Cek case-insensitive exact string match
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().trim().toLowerCase() === cleanTarget.toLowerCase()) {
      return sheets[i];
    }
  }

  // 3. Cek tanpa spasi atau garis bawah (fallback terakhir)
  var normalizedTarget = cleanTarget.toLowerCase().replace(/[\s_]+/g, '');
  for (var j = 0; j < sheets.length; j++) {
    if (sheets[j].getName().trim().toLowerCase().replace(/[\s_]+/g, '') === normalizedTarget) {
      return sheets[j];
    }
  }
  return null;
}

/**
 * Handle POST requests for sheet operations (append, update, order checkout, dll.)
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  var hasLock = false;
  try {
    hasLock = lock.tryLock(30000);

    var postData = {};
    if (e && e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
      } catch(parseErr) {
        postData = e.parameter || {};
      }
    } else if (e && e.parameter) {
      postData = e.parameter;
    }

    var action = postData.action;
    var spreadsheetId = postData.spreadsheetId || SPREADSHEET_ID;
    var range = postData.range || '';
    var values = postData.values || [];

    // Jika values dikirim dalam bentuk string JSON
    if (typeof values === 'string') {
      try {
        values = JSON.parse(values);
      } catch(_) {}
    }

    var ss = SpreadsheetApp.openById(spreadsheetId);

    // 1. ACTION: APPEND (Menulis baris baru ke Pesanan, Detail_Pesanan, Task, dsb)
    if (action === 'append') {
      var sheetName = range.includes('!') ? range.split('!')[0] : (range || 'Sheet1');
      sheetName = sheetName.replace(/^['"]|['"]$/g, '').trim();

      var sheet = getSheetCaseInsensitive(ss, sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      }

      var rowsAppended = 0;
      if (Array.isArray(values) && values.length > 0) {
        // Jika 2D Array (banyak baris seperti Detail_Pesanan)
        if (Array.isArray(values[0])) {
          for (var r = 0; r < values.length; r++) {
            var rowData = Array.isArray(values[r]) ? values[r] : [values[r]];
            var maxCols = sheet.getMaxColumns();
            if (rowData.length > maxCols) {
              sheet.insertColumnsAfter(maxCols, rowData.length - maxCols);
            }
            sheet.appendRow(rowData);
            rowsAppended++;
          }
        } else {
          // Jika 1D Array (1 baris)
          var maxCols1D = sheet.getMaxColumns();
          if (values.length > maxCols1D) {
            sheet.insertColumnsAfter(maxCols1D, values.length - maxCols1D);
          }
          sheet.appendRow(values);
          rowsAppended = 1;
        }
      }

      // Pastikan data langsung tersimpan ke spreadsheet
      SpreadsheetApp.flush();

      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        message: 'Data appended successfully to ' + sheet.getName(),
        rowsAppended: rowsAppended 
      })).setMimeType(ContentService.MimeType.JSON);

    // 2. ACTION: UPDATE (Memperbarui cell tertentu seperti status kirim atau poin user)
    } else if (action === 'update') {
      var targetSheetName = '';
      var a1Notation = '';

      if (range.includes('!')) {
        var parts = range.split('!');
        targetSheetName = parts[0].replace(/^['"]|['"]$/g, '').trim();
        a1Notation = parts[1];
      } else {
        targetSheetName = range;
      }

      var updateSheet = getSheetCaseInsensitive(ss, targetSheetName);
      if (!updateSheet) {
        updateSheet = ss.getSheetByName(targetSheetName) || ss.getSheets()[0];
      }

      var sheetRange;
      if (a1Notation) {
        sheetRange = updateSheet.getRange(a1Notation);
      } else {
        sheetRange = ss.getRange(range);
      }

      sheetRange.setValues(values);
      SpreadsheetApp.flush();

      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        message: 'Data updated successfully',
        updatedRange: range 
      })).setMimeType(ContentService.MimeType.JSON);

    // 3. ACTION: SIGNUP USER
    } else if (action === 'signup') {
      var signUpRes = signUpUser(postData.email, postData.password);
      return ContentService.createTextOutput(JSON.stringify(signUpRes))
        .setMimeType(ContentService.MimeType.JSON);

    // 4. ACTION: LOGIN USER
    } else if (action === 'login') {
      var loginRes = checkLogin(postData.email, postData.password);
      return ContentService.createTextOutput(JSON.stringify(loginRes))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Invalid action: ' + action }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    if (hasLock) {
      lock.releaseLock();
    }
  }
}
