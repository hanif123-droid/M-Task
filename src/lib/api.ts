import { getAccessToken } from './firebase';
import appletConfig from '../../firebase-applet-config.json';

const SPREADSHEET_ID = '1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao';
const DRIVE_FOLDER_ID = '1_JsXFbHDqsoLO1Mxse1kLiptmtcHCiOF';

// Read data from sheets
export async function getSheetData(range: string) {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated with valid Auth Token');
  }
  if (token === 'mock-token') {
    return getSheetDataAnonymously(range);
  }

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch sheet data: ${res.status} ${text}`);
  }
  return res.json();
}

// Write/Append to sheets
export async function appendSheetData(range: string, values: any[][]) {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

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

// Read data from sheets anonymously using API Key (for public sheets)
export async function getSheetDataAnonymously(range: string) {
  const apiKey = appletConfig.apiKey;
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${apiKey}`);
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch sheet data anonymously: ${res.status} ${text}`);
  }
  return res.json();
}

// Read data from custom Spreadsheet ID
export async function getSheetDataFromId(spreadsheetId: string, range: string) {
  const token = await getAccessToken();
  if (!token || token === 'mock-token') {
    return getSheetDataAnonymouslyFromId(spreadsheetId, range);
  }

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch sheet data: ${res.status} ${text}`);
  }
  return res.json();
}

// Update data in custom Spreadsheet ID
export async function updateSheetDataFromId(spreadsheetId: string, range: string, values: any[][]) {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with valid Auth Token');

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
  const apiKey = appletConfig.apiKey;
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`);
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch sheet data anonymously: ${res.status} ${text}`);
  }
  return res.json();
}

// Get Spreadsheet Metadata to avoid bruteforcing sheet names
export async function getSpreadsheetMetadata(spreadsheetId: string) {
  const token = await getAccessToken();
  if (!token || token === 'mock-token') {
    const apiKey = appletConfig.apiKey;
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
