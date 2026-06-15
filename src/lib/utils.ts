import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
