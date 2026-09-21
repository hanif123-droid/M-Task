import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format image url for broken supabase urls
export function formatImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  let cleanUrl = url;
  
  if (cleanUrl.includes('AVATAR%20USER')) {
    cleanUrl = cleanUrl.replace(/AVATAR%20USER/g, 'logo%20icon%26avatar%20user');
  }
  if (cleanUrl.includes('AVATAR USER')) {
    cleanUrl = cleanUrl.replace(/AVATAR USER/g, 'logo%20icon%26avatar%20user');
  }
  
  return cleanUrl;
}

// Format duration
export function formatDuration(joinDate: string) {
  if (!joinDate) return "Unknown";
  try {
    const start = new Date(joinDate);
    if (isNaN(start.getTime())) return "Unknown";
    const now = new Date();
    
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    if (months < 0 || (months === 0 && now.getDate() < start.getDate())) {
      years--;
      months += 12;
    }
    
    if (years > 0) return `${years} Tahun`;
    if (months > 0) return `${months} Bulan`;
    return "Kurang dari 1 bulan";
  } catch(e) {
    return "Unknown";
  }
}

export function formatUnitName(unitName: string): string {
  if (!unitName) return '';
  const normalized = unitName.trim().toUpperCase();
  if (normalized === 'UNT01') {
    return 'Head Quarter';
  }
  return unitName;
}

export function parseGvizDate(str: string | null | undefined): string {
  if (!str) return '';
  const s = str.trim();
  const pad = (n: string | number) => String(n).padStart(2, '0');

  // 1. Check for GViz format: Date(2026, 8, 10, 20, 33, 45)
  if (s.startsWith('Date(')) {
    const parts = s.match(/Date\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+))?(?:,\s*(\d+))?(?:,\s*(\d+))?\)/);
    if (parts) {
      const y = parts[1];
      const m = parts[2];
      const d = parts[3];
      const h = parts[4] || '0';
      const min = parts[5] || '0';
      const sec = parts[6] || '0';
      return pad(Number(m) + 1) + '/' + pad(d) + '/' + y + ' ' + pad(h) + ':' + pad(min) + ':' + pad(sec);
    }
  }

  // 2. Check for explicit text format: MM/DD/YYYY HH:MM:SS or MM/DD/YYYY HH:MM
  const match = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (match) {
    const m = match[1];
    const d = match[2];
    const y = match[3];
    const h = match[4] || '00';
    const min = match[5] || '00';
    const sec = match[6] || '00';
    return pad(m) + '/' + pad(d) + '/' + y + ' ' + pad(h) + ':' + pad(min) + ':' + pad(sec);
  }

  // 3. Fallback: If it's a valid date string from JS Date
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) {
     return pad(dt.getMonth() + 1) + '/' + pad(dt.getDate()) + '/' + dt.getFullYear() + ' ' + pad(dt.getHours()) + ':' + pad(dt.getMinutes()) + ':' + pad(dt.getSeconds());
  }

  return s;
}
