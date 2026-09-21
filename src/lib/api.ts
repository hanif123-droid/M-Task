
const getAccessToken = async () => 'mock-token'; // Disabled Authentication

const SPREADSHEET_ID = '1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao';
const DRIVE_FOLDER_ID = '1_JsXFbHDqsoLO1Mxse1kLiptmtcHCiOF';

// Read data from sheets
export async function getSheetData(range: string) {
  try {
    const token = await getAccessToken();
    if (!token || token === 'mock-token') {
      return await getSheetDataAnonymously(range);
    }

    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) {
      return await getSheetDataAnonymously(range);
    }
    return await res.json();
  } catch (err) {
    return await getSheetDataAnonymously(range);
  }
}

// Write/Append to sheets
export async function appendSheetData(range: string, values: any[][]) {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');
  if (token === 'mock-token') {
    const appScriptUrl = import.meta.env.VITE_APP_SCRIPT_URL;
    if (appScriptUrl) {
      console.log(`[AppsScript] appendSheetData to ${range}`);
      try {
        await fetch(appScriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: JSON.stringify({ action: 'append', spreadsheetId: SPREADSHEET_ID, range, values }),
        });
        return { success: true };
      } catch (err) {
        console.warn(`[AppsScript] appendSheetData failed, falling back to mock:`, err);
      }
    }
    console.warn(`[Mock] appendSheetData to ${range} (Set VITE_APP_SCRIPT_URL to write data)`, values);
    return { tableRange: range };
  }

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values })
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update sheet data: ${res.status} ${text}`);
  }
  return res.json();
}

// Update specific range in sheets
export async function updateSheetData(range: string, values: any[][]) {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');
  if (token === 'mock-token') {
    const appScriptUrl = import.meta.env.VITE_APP_SCRIPT_URL;
    if (appScriptUrl) {
      console.log(`[AppsScript] updateSheetData to ${range}`);
      try {
        await fetch(appScriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: JSON.stringify({ action: 'update', spreadsheetId: SPREADSHEET_ID, range, values }),
        });
        return { success: true };
      } catch (err) {
        console.warn(`[AppsScript] updateSheetData failed, falling back to mock:`, err);
      }
    }
    console.warn(`[Mock] updateSheetData to ${range} (Set VITE_APP_SCRIPT_URL to write data)`, values);
    return { updatedRange: range };
  }

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values })
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update sheet data: ${res.status} ${text}`);
  }
  return res.json();
}

// CSV Parser helper for robust spreadsheet fallback
function parseCsv(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal);
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentVal);
      if (currentRow.some(c => c.trim() !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal);
    if (currentRow.some(c => c.trim() !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// Resilient Anonymous Sheet Fetcher (GViz JSON -> GViz CSV -> Export CSV Fallbacks)
async function fetchSheetDataAnonymouslyCore(spreadsheetId: string, range: string): Promise<{ values: any[][] }> {
  const cleanSheet = range.split('!')[0].replace(/^['"]|['"]$/g, '').trim();

  // Try GViz JSON first
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&headers=1&sheet=${encodeURIComponent(cleanSheet)}&_cb=${Date.now()}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const text = await res.text();
        const startIdx = text.indexOf('{');
        const endIdx = text.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1) {
          const jsonString = text.substring(startIdx, endIdx + 1);
          const data = JSON.parse(jsonString);
          if (data && data.table && data.table.cols) {
            const headers = data.table.cols.map((c: any) => (c ? c.label || '' : ''));
            const rows = (data.table.rows || []).map((r: any) =>
              r && r.c
                ? r.c.map((cell: any) =>
                    cell
                      ? cell.f !== undefined
                        ? cell.f
                        : cell.v !== null && cell.v !== undefined
                        ? cell.v.toString()
                        : ''
                      : ''
                  )
                : []
            );
            return { values: [headers, ...rows] };
          }
        }
      }
    } catch {
      // Brief pause before retry
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
  }

  // Fallback 1: GViz CSV
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(cleanSheet)}&_cb=${Date.now()}`;
    const res = await fetch(csvUrl, { cache: 'no-store' });
    if (res.ok) {
      const text = await res.text();
      const parsed = parseCsv(text);
      if (parsed.length > 0) {
        return { values: parsed };
      }
    }
  } catch {
    // Ignore and proceed to Fallback 2
  }

  // Fallback 2: Google Docs Export CSV
  try {
    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&sheet=${encodeURIComponent(cleanSheet)}`;
    const res = await fetch(exportUrl, { cache: 'no-store' });
    if (res.ok) {
      const text = await res.text();
      const parsed = parseCsv(text);
      if (parsed.length > 0) {
        return { values: parsed };
      }
    }
  } catch {
    // Return empty on total failure
  }

  return { values: [] };
}

// Read data from sheets anonymously using API Key (for public sheets)
export async function getSheetDataAnonymously(range: string) {
  return await fetchSheetDataAnonymouslyCore(SPREADSHEET_ID, range);
}

// Read data from custom Spreadsheet ID
export async function appendSheetDataFromId(spreadsheetId: string, range: string, values: any[][]) {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with valid Auth Token');
  if (token === 'mock-token') {
    const appScriptUrl = import.meta.env.VITE_APP_SCRIPT_URL;
    if (appScriptUrl) {
      console.log(`[AppsScript] appendSheetDataFromId to ${spreadsheetId} ${range}`);
      try {
        await fetch(appScriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: JSON.stringify({ action: 'append', spreadsheetId, range, values }),
        });
        return { success: true };
      } catch (err) {
        console.warn(`[AppsScript] appendSheetDataFromId failed, falling back to mock:`, err);
      }
    }
    console.warn(`[Mock] appendSheetDataFromId to ${spreadsheetId} ${range} (Set VITE_APP_SCRIPT_URL to write data)`, values);
    return { updatedRange: range };
  }

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values })
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to append sheet data: ${res.status} ${text}`);
  }
  return res.json();
}

export async function getSheetDataFromId(spreadsheetId: string, range: string) {
  try {
    const token = await getAccessToken();
    if (!token || token === 'mock-token') {
      return await getSheetDataAnonymouslyFromId(spreadsheetId, range);
    }

    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) {
      return await getSheetDataAnonymouslyFromId(spreadsheetId, range);
    }
    return await res.json();
  } catch (err) {
    return await getSheetDataAnonymouslyFromId(spreadsheetId, range);
  }
}

// Update data in custom Spreadsheet ID
export async function updateSheetDataFromId(spreadsheetId: string, range: string, values: any[][]) {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with valid Auth Token');
  if (token === 'mock-token') {
    const appScriptUrl = import.meta.env.VITE_APP_SCRIPT_URL;
    if (appScriptUrl) {
      console.log(`[AppsScript] updateSheetDataFromId to ${spreadsheetId} ${range}`);
      try {
        await fetch(appScriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: JSON.stringify({ action: 'update', spreadsheetId, range, values }),
        });
        return { success: true };
      } catch (err) {
        console.warn(`[AppsScript] updateSheetDataFromId failed, falling back to mock:`, err);
      }
    }
    console.warn(`[Mock] updateSheetDataFromId to ${spreadsheetId} ${range} (Set VITE_APP_SCRIPT_URL to write data)`, values);
    return { updatedRange: range };
  }

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values })
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update sheet data: ${res.status} ${text}`);
  }
  return res.json();
}

// Read data from custom Spreadsheet ID anonymously using API Key (for public sheets)
export async function getSheetDataAnonymouslyFromId(spreadsheetId: string, range: string) {
  return await fetchSheetDataAnonymouslyCore(spreadsheetId, range);
}

// Get Spreadsheet Metadata to avoid bruteforcing sheet names
export async function getSpreadsheetMetadata(spreadsheetId: string) {
  const token = await getAccessToken();
  if (!token || token === 'mock-token') {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY || 'AIzaSyCQDNscCCqFl_3w2QU0kyr5aAlC9cBZjuM';
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}&fields=sheets.properties.title`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch spreadsheet metadata anonymously: ${res.status} ${text}`);
    }
    return res.json();
  }

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch spreadsheet metadata: ${res.status} ${text}`);
  }
  return res.json();
}

// Fetch Calendar Events
export async function getCalendarEvents(timeMin: string, timeMax: string) {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');
  if (token === 'mock-token') return [];

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.append('timeMin', timeMin);
  url.searchParams.append('timeMax', timeMax);
  url.searchParams.append('orderBy', 'startTime');
  url.searchParams.append('singleEvents', 'true');
  url.searchParams.append('maxResults', '10');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch calendar events: ${res.status} ${text}`);
  }
  return res.json();
}
