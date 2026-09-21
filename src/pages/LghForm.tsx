import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Camera, Image as ImageIcon, Check, Building2, User, Mail, Phone, Shield, FileText, X, Printer, Download, Sparkles, CreditCard, MessageSquare, Plus, Minus, Globe, Trash2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { getSheetData, appendSheetData } from '../lib/api';
import { DriveService } from '../lib/driveService';
import { logActivity } from '../lib/activityLogger';
import { CameraModal } from '../components/CameraModal';
import { toJpeg } from 'html-to-image';

// Clean date parser similar to UnitDetail.tsx
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const cleaned = dateStr.trim();
  
  const parts = cleaned.split(/[-/.]/);
  if (parts.length === 3) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const p2 = parseInt(parts[2], 10);
    
    if (parts[0].length === 4 && !isNaN(p0)) {
      return new Date(p0, p1 - 1, p2);
    }
    
    if (parts[2].length === 4 && !isNaN(p2)) {
      if (p1 > 12) {
        return new Date(p2, p0 - 1, p1);
      } else if (p0 > 12) {
        return new Date(p2, p1 - 1, p0);
      } else {
        // LGH Form saves checkIn and checkOut as MM/DD/YYYY
        return new Date(p2, p0 - 1, p1);
      }
    }
  }

  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d;
  return null;
}

function getWitaParts(d: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Makassar",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(d);
  let year = d.getFullYear(),
    month = d.getMonth() + 1,
    day = d.getDate(),
    hour = d.getHours(),
    minute = d.getMinutes(),
    second = d.getSeconds();

  for (const p of parts) {
    if (p.type === "year") year = parseInt(p.value, 10);
    if (p.type === "month") month = parseInt(p.value, 10);
    if (p.type === "day") day = parseInt(p.value, 10);
    if (p.type === "hour") hour = parseInt(p.value, 10);
    if (p.type === "minute") minute = parseInt(p.value, 10);
    if (p.type === "second") second = parseInt(p.value, 10);
  }
  return { year, month, day, hour, minute, second };
}

const generateGuestRegPdfFile = (
  lghId: string,
  guestName: string,
  guestTypeStr: string,
  idNo: string,
  phone: string,
  email: string,
  checkIn: string,
  checkOut: string,
  stayType: string,
  roomNum: number | string | null,
  dur: number,
  payMethod: string,
  totalAmount: number,
  sigDataUrl: string | null
): File => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Title Headers
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("GUEST REGISTRATION", 105, 20, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(79, 70, 229); // indigo-600
  doc.text("LOVISSA GUESTHOUSE - BALI", 105, 25, { align: 'center' });
  
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Registration No: ${lghId}`, 105, 30, { align: 'center' });

  // Add Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(20, 34, 190, 34);

  // Subtitle / Intro
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const introTxt = "Welcome to Lovissa Guesthouse. To ensure a comfortable and enjoyable stay for all guests, we kindly ask you to review and agree to the following terms and conditions.";
  const splitIntro = doc.splitTextToSize(introTxt, 170);
  doc.text(splitIntro, 20, 39);

  // Guest Details Segment
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("GUEST DETAILS", 20, 52);
  doc.line(20, 54, 190, 54);

  doc.setFontSize(9);
  doc.setFont("Helvetica", "bold");
  doc.text("Guest Type:", 20, 60);
  doc.setFont("Helvetica", "normal");
  doc.text(guestTypeStr || "-", 60, 60);

  doc.setFont("Helvetica", "bold");
  doc.text("Full Name:", 20, 66);
  doc.setFont("Helvetica", "normal");
  doc.text(guestName || "-", 60, 66);

  doc.setFont("Helvetica", "bold");
  doc.text("ID / Passport Number:", 20, 72);
  doc.setFont("Helvetica", "normal");
  doc.text(idNo || "Loaded Existing", 60, 72);

  doc.setFont("Helvetica", "bold");
  doc.text("WhatsApp / Phone:", 20, 78);
  doc.setFont("Helvetica", "normal");
  doc.text(phone || "-", 60, 78);

  doc.setFont("Helvetica", "bold");
  doc.text("Email Address:", 20, 84);
  doc.setFont("Helvetica", "normal");
  doc.text(email || "-", 60, 84);

  // Stay Details Segment
  doc.setFont("Helvetica", "bold");
  doc.text("STAY PERIOD DETAILS", 20, 94);
  doc.line(20, 96, 190, 96);

  doc.setFont("Helvetica", "bold");
  doc.text("Stay Period:", 20, 102);
  doc.setFont("Helvetica", "normal");
  doc.text(`[${checkIn}] to [${checkOut}]`, 60, 102);

  doc.setFont("Helvetica", "bold");
  doc.text("Stay Type:", 20, 108);
  doc.setFont("Helvetica", "normal");
  doc.text(stayType || "-", 60, 108);

  doc.setFont("Helvetica", "bold");
  doc.text("Room Number:", 20, 114);
  doc.setFont("Helvetica", "normal");
  doc.text(roomNum ? `Room ${roomNum}` : "-", 60, 114);

  doc.setFont("Helvetica", "bold");
  doc.text("Duration:", 20, 120);
  doc.setFont("Helvetica", "normal");
  const stayLabel = stayType === 'Daily' ? 'Days' : stayType === 'Weekly' ? 'Weeks' : 'Month';
  doc.text(`${dur} ${stayLabel}`, 60, 120);

  // Payment box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(20, 120, 170, 11, "F");
  doc.setDrawColor(241, 245, 249);
  doc.rect(20, 120, 170, 11, "S");
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(6, 78, 59); // emerald-900
  doc.text(`PAYMENT BY ${payMethod.toUpperCase()}:`, 24, 127);
  doc.text(`Rp ${totalAmount.toLocaleString('id-ID')}`, 186, 127, { align: 'right' });

  // Terms and Conditions
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("TERMS & CONDITIONS", 20, 140);
  doc.line(20, 142, 190, 142);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const terms = [
    "1. Check-out Time: 12:00 PM, Check-in Time: 2:00 PM",
    "2. Security Deposit (Monthly): A deposit of IDR 1,000,000 is required, fully refundable upon check-out.",
    "3. Liability: Guests are responsible for any damage or loss of guesthouse property.",
    "4. Illegal Activities: Any illegal activities will be reported to the authorities.",
    "5. Payment: full payment is required upon check-in, All payments are non refundable",
    "6. Key & Access: Guests are responsible for keeping their room key/access secure.",
    "7. Pets Policy: Pets are not allowed unless approved in advance by management.",
    "8. Force Majeure: The guesthouse shall not be held responsible for unforeseen circumstances.",
    "9. Extension: Extension is subject to room availability and must be confirmed with management."
  ];
  let yPos = 146;
  terms.forEach((term) => {
    const splitTerm = doc.splitTextToSize(term, 170);
    doc.text(splitTerm, 20, yPos);
    yPos += 4.5;
  });

  // Guest Declaration
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("GUEST DECLARATION", 20, yPos + 2);
  doc.line(20, yPos + 4, 190, yPos + 4);
  
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const declarationText = "I hereby confirm that the information provided is accurate. I have read, understood, and agreed to follow the Terms & Conditions of Lovissa Guesthouse during my stay.";
  const splitDec = doc.splitTextToSize(declarationText, 170);
  doc.text(splitDec, 20, yPos + 8);

  // Signature area on the right bottom
  const rightAlignX = 150;
  const signatureY = yPos + 18;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(115, 115, 115);
  doc.text("Guest Signature,", rightAlignX, signatureY, { align: 'center' });

  if (sigDataUrl) {
    try {
      doc.addImage(sigDataUrl, 'PNG', rightAlignX - 20, signatureY + 2, 40, 15);
    } catch (e) {
      console.error("Failed to render signature in PDF:", e);
    }
  }

  doc.setFont("Helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`( ${guestName} )`, rightAlignX, signatureY + 22, { align: 'center' });

  const pdfBlob = doc.output('blob');
  return new File([pdfBlob], `regis_${lghId}_${Date.now()}.pdf`, { type: 'application/pdf' });
};

export function LghForm() {
  const navigate = useNavigate();

  // Loading States
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Data storage
  const [existingTransactions, setExistingTransactions] = useState<any[]>([]);
  const [contactList, setContactList] = useState<any[]>([]);

  // Generated IDs
  const [lghId] = useState(() => `lgh-${Math.floor(1000 + Math.random() * 9000)}`);
  const [newContactId] = useState(() => `guest${Math.floor(1000 + Math.random() * 9000)}`);

  // Basic Form States
  const [type, setType] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');
  const [checkIn, setCheckIn] = useState(() => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${today.getFullYear()}-${mm}-${dd}`;
  });
  const [duration, setDuration] = useState<number>(1);
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);

  // Guest Type States
  const [guestType, setGuestType] = useState<'New Guest' | 'Repeater' | 'Extend'>('New Guest');
  
  // Repeater States
  const [selectedRepeaterId, setSelectedRepeaterId] = useState<string>('');

  // Extend States
  const [selectedExtendId, setSelectedExtendId] = useState<string>('');

  // New Guest States
  const [namaTamu, setNamaTamu] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [noId, setNoId] = useState('');
  const [photoIdFile, setPhotoIdFile] = useState<File | null>(null);

  // Financial States
  const DEFAULT_BOOKING_SOURCES = [
    'Booking.com',
    'Airbnb',
    'Trip.com',
    'Tiket.com',
    'Agoda',
    'Direct / Walk-in',
    'WhatsApp',
    'Instagram'
  ];

  const [bookingSources, setBookingSources] = useState<string[]>(() => {
    let deletedSources: string[] = [];
    try {
      const deleted = localStorage.getItem('lgh_deleted_booking_sources');
      if (deleted) deletedSources = JSON.parse(deleted);
    } catch (e) {}

    try {
      const saved = localStorage.getItem('lgh_custom_booking_sources');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const combined = [...DEFAULT_BOOKING_SOURCES];
          parsed.forEach((item: string) => {
            if (
              item && 
              typeof item === 'string' && 
              !combined.some(s => s.toLowerCase() === item.toLowerCase()) &&
              !deletedSources.some(d => d.toLowerCase() === item.toLowerCase())
            ) {
              combined.push(item);
            }
          });
          return combined;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_BOOKING_SOURCES;
  });

  const [bookingSource, setBookingSource] = useState<string>('Booking.com');
  const [showAddBookingSourceModal, setShowAddBookingSourceModal] = useState(false);
  const [showManageBookingSourceModal, setShowManageBookingSourceModal] = useState(false);
  const [newBookingSourceName, setNewBookingSourceName] = useState('');
  const [price, setPrice] = useState<string>('');
  const [payment, setPayment] = useState<'Cash' | 'Transfer' | 'Qris'>('Cash');
  const [buktiTransferFile, setBuktiTransferFile] = useState<File | null>(null);

  // Modals & Camera Helper
  const [cameraTarget, setCameraTarget] = useState<'photoId' | 'bukti' | null>(null);
  const [showRegModal, setShowRegModal] = useState(false);
  const [keterangan, setKeterangan] = useState('');

  // Refs
  const photoIdInputRef = useRef<HTMLInputElement>(null);
  const buktiInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Fetch Lovissa occupancy table & Contacts on mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        const [lovissaRes, userRes] = await Promise.all([
          getSheetData('Lovissa Guest House!A1:Z1000').catch(() => null),
          getSheetData('User!A1:Z1000').catch(() => null)
        ]);

        // 1. Process existing Lovissa Guest house transactions
        if (lovissaRes?.values?.length > 1) {
          const headers = lovissaRes.values[0] as string[];
          const idColIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ID' || h?.trim().toUpperCase() === 'TRANSACTION ID');
          const checkInIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'CHECK IN' || h?.trim().toUpperCase() === 'CHECK-IN' || h?.trim().toUpperCase() === 'CHECKIN');
          const checkOutIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'CHECK OUT' || h?.trim().toUpperCase() === 'CHECK-OUT' || h?.trim().toUpperCase() === 'CHECKOUT');
          const roomIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ROOM' || h?.trim().toUpperCase() === 'KAMAR');
          const contactIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'KONTAK' || h?.trim().toUpperCase() === 'CONTACT' || h?.trim().toUpperCase() === 'NAMA' || h?.trim().toUpperCase() === 'NAMA TAMU');
          const priceIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PRICE' || h?.trim().toUpperCase() === 'HARGA');
          const emailIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'EMAIL');
          const phoneIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PHONE' || h?.trim().toUpperCase() === 'NO HP');
          const typeIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TYPE' || h?.trim().toUpperCase() === 'TIPE');
          const noIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'NO ID' || h?.trim().toUpperCase() === 'KTP' || h?.trim().toUpperCase() === 'NO. KTP' || h?.trim().toUpperCase() === 'NO. IDENTITAS');
          const sourceIdx = headers.findIndex(h => {
            const norm = h?.trim().toUpperCase().replace(/[\s._-]+/g, '') || '';
            return norm === 'BOOKINGSOURCE' || norm === 'SOURCE' || norm === 'CHANNEL' || norm === 'OTA' || norm === 'SUMBER';
          });

          const processed = lovissaRes.values.slice(1).map((row, idx) => ({
            id: (idColIdx > -1 && row[idColIdx]) ? row[idColIdx] : `lgh-row-${idx}`,
            room: roomIdx > -1 ? row[roomIdx] : '',
            checkIn: checkInIdx > -1 ? row[checkInIdx] : '',
            checkOut: checkOutIdx > -1 ? row[checkOutIdx] : '',
            kontak: contactIdx > -1 ? row[contactIdx] : '',
            price: priceIdx > -1 ? row[priceIdx] : '',
            email: emailIdx > -1 ? row[emailIdx] : '',
            phone: phoneIdx > -1 ? row[phoneIdx] : '',
            type: typeIdx > -1 ? row[typeIdx] : '',
            noId: noIdIdx > -1 ? row[noIdIdx] : '',
            bookingSource: sourceIdx > -1 ? row[sourceIdx] : '',
            raw: row
          }));
          setExistingTransactions(processed);

          // Merge any booking sources discovered from existing sheet records
          const sheetSources = processed
            .map((t) => t.bookingSource?.trim())
            .filter(Boolean);
          if (sheetSources.length > 0) {
            setBookingSources((prev) => {
              let deletedSources: string[] = [];
              try {
                const deleted = localStorage.getItem('lgh_deleted_booking_sources');
                if (deleted) deletedSources = JSON.parse(deleted);
              } catch (e) {}

              const updated = [...prev];
              sheetSources.forEach((src: string) => {
                if (
                  !updated.some((s) => s.toLowerCase() === src.toLowerCase()) &&
                  !deletedSources.some(d => d.toLowerCase() === src.toLowerCase())
                ) {
                  updated.push(src);
                }
              });
              return updated;
            });
          }
        }

        // 2. Process User sheet for Repeater guests
        if (userRes?.values?.length > 1) {
          const cHeaders = userRes.values[0] as string[];
          const idIdx = cHeaders.findIndex(h => h?.trim().toUpperCase() === 'ID' || h?.trim().toUpperCase() === 'CONTACT ID' || h?.trim().toUpperCase() === 'KTA ID');
          const nameIdx = cHeaders.findIndex(h => h?.trim().toUpperCase() === 'NAME');
          const usecaseIdx = cHeaders.findIndex(h => h?.trim().toUpperCase() === 'USECASE');
          const roleIdx = cHeaders.findIndex(h => h?.trim().toUpperCase() === 'ROLE' || h?.trim().toUpperCase() === 'ROLES');
          const unitIdx = cHeaders.findIndex(h => h?.trim().toUpperCase() === 'UNIT BUSINESS' || h?.trim().toUpperCase() === 'UNIT' || h?.trim().toUpperCase() === 'UNIT_BUSINESS' || h?.trim().toUpperCase() === 'UNIT ID');
          const emailIdx = cHeaders.findIndex(h => h?.trim().toUpperCase() === 'EMAIL');
          const phoneIdx = cHeaders.findIndex(h => h?.trim().toUpperCase() === 'PHONE' || h?.trim().toUpperCase() === 'TELEPON' || h?.trim().toUpperCase() === 'TELP' || h?.trim().toUpperCase() === 'NO HP');
          const photoKtpIdx = cHeaders.findIndex(h => {
            const norm = h?.trim().toUpperCase().replace(/[\s._-]+/g, '') || '';
            return norm === 'PHOTOKTP' || norm === 'PHOTOID' || norm === 'FOTOKTP' || norm === 'KTPPHOTO';
          });

          const fetched = userRes.values.slice(1).map((row, i) => {
            const id = idIdx > -1 ? row[idIdx]?.trim() : `user-${i}`;
            const name = nameIdx > -1 ? row[nameIdx]?.trim() : '';
            const usecase = usecaseIdx > -1 ? row[usecaseIdx]?.trim() : '';
            const unit = unitIdx > -1 ? row[unitIdx]?.trim() : '';
            const role = roleIdx > -1 ? row[roleIdx]?.trim() : '';
            const em = emailIdx > -1 ? row[emailIdx]?.trim() : '';
            const ph = phoneIdx > -1 ? row[phoneIdx]?.trim() : '';
            const photoKtp = photoKtpIdx > -1 ? row[photoKtpIdx]?.trim() : '';

            return { id, name, usecase, role, unit, email: em, phone: ph, photoKtp };
          }).filter(c => c.name && c.role?.toUpperCase() === 'CLIENT' && c.usecase?.toUpperCase() === 'GUEST');

          setContactList(fetched);
        }
      } catch (err) {
        console.error('Gagal mengambil data inisialisasi LGH:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  // Initialize Canvas stroke styles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#312e81'; // dark indigo
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [canvasRef.current]);

  // Handle selected room reset when Check In or Type changes
  useEffect(() => {
    setSelectedRoom(null);
  }, [checkIn, type]);

  // Calculate check out date based on checkIn, type and duration
  const checkOutStr = (() => {
    if (!checkIn || !duration || duration <= 0) return '';
    const date = new Date(checkIn);
    if (isNaN(date.getTime())) return '';
    
    if (type === 'Daily') {
      date.setDate(date.getDate() + duration);
    } else if (type === 'Weekly') {
      date.setDate(date.getDate() + duration * 7);
    } else if (type === 'Monthly') {
      date.setMonth(date.getMonth() + duration);
    }

    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  })();

  // Format Check in into mm/dd/yyyy
  const formattedCheckInStr = (() => {
    if (!checkIn) return '';
    const date = new Date(checkIn);
    if (isNaN(date.getTime())) return '';
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${mm}/${dd}/${date.getFullYear()}`;
  })();

  // Calculate occupancy of room index
  const checkRoomOccupancy = (roomNum: number) => {
    if (!checkIn) return false;
    const targetDate = parseDate(checkIn);
    if (!targetDate) return false;

    const witaNow = getWitaParts();
    const witaTodayStr = `${witaNow.year}-${String(witaNow.month).padStart(2, '0')}-${String(witaNow.day).padStart(2, '0')}`;
    const isTargetTodayWita = checkIn === witaTodayStr;

    const tYear = targetDate.getFullYear();
    const tMonth = targetDate.getMonth();
    const tDay = targetDate.getDate();
    const targetDayTime = new Date(tYear, tMonth, tDay).getTime();

    return existingTransactions.some(t => {
      if (!t.room) return false;
      const tRoomNum = parseInt(t.room.toString().replace(/\D/g, ''), 10);
      if (isNaN(tRoomNum) || tRoomNum !== roomNum) return false;

      const start = parseDate(t.checkIn);
      const end = parseDate(t.checkOut);
      if (!start || !end) return false;

      const sYear = start.getFullYear();
      const sMonth = start.getMonth();
      const sDay = start.getDate();
      const startDayTime = new Date(sYear, sMonth, sDay).getTime();

      const eYear = end.getFullYear();
      const eMonth = end.getMonth();
      const eDay = end.getDate();
      const endDayTime = new Date(eYear, eMonth, eDay).getTime();

      if (targetDayTime < startDayTime || targetDayTime > endDayTime) {
        return false;
      }

      if (targetDayTime < endDayTime) {
        return true;
      }

      // Check-out date: if today in WITA and hour >= 12:00 WITA, previous guest already checked out.
      // We also check for '24' just in case some engines format 00:00 as 24:00
      if (isTargetTodayWita) {
        if (witaNow.hour >= 12 && witaNow.hour !== 24) {
          return false;
        }
        return true;
      }

      // If the target check-in is in the future or past, the room is available for check-in on that same day
      // because check-in time (14:00) is after check-out time (12:00).
      return false;
    });
  };

  // Find info about Repeater Guest if selected
  const activeRepeaterInfo = contactList.find(c => c.id === selectedRepeaterId);

  // Find info about Extend stay if selected
  const activeExtendTrans = existingTransactions.find(t => t.id === selectedExtendId);
  const extendContactInfo = contactList.find(c => c.id === activeExtendTrans?.kontak || c.name.toLowerCase() === activeExtendTrans?.kontak?.toLowerCase());

  // Name / Guest details to write
  const activeGuestNameStr = guestType === 'Repeater' 
    ? (activeRepeaterInfo?.name || '') 
    : guestType === 'Extend'
    ? (namaTamu || extendContactInfo?.name || activeExtendTrans?.kontak || '')
    : namaTamu;

  const activeGuestEmailStr = guestType === 'Repeater'
    ? (activeRepeaterInfo?.email || '')
    : guestType === 'Extend'
    ? (email || extendContactInfo?.email || activeExtendTrans?.email || '')
    : email;

  const activeGuestPhoneStr = guestType === 'Repeater'
    ? (activeRepeaterInfo?.phone || '')
    : guestType === 'Extend'
    ? (phone || extendContactInfo?.phone || activeExtendTrans?.phone || '')
    : phone;

  const calculatedAmount = Number(price || 0) * duration;

  // Drawing Pad Canvas Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Convert canvas signature pad to Blob
  const getSignatureBlob = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas || !hasSignature) {
        resolve(null);
        return;
      }
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    });
  };

  const submitData = async (printJpegUrl: string = '') => {
    try {
      setSubmitting(true);

      // 1. Upload files to Drive
      let photoIdUrl = '';
      if (photoIdFile) {
        const up = await DriveService.uploadFile(photoIdFile).catch(() => null);
        if (up) photoIdUrl = up.url;
      }

      let buktiTransferUrl = '';
      if (buktiTransferFile) {
        const up = await DriveService.uploadFile(buktiTransferFile).catch(() => null);
        if (up) buktiTransferUrl = up.url;
      }

      let signatureUrl = '';
      const sigBlob = await getSignatureBlob();
      if (sigBlob) {
        const sigFile = new File([sigBlob], `signature_${Date.now()}.png`, { type: 'image/png' });
        const up = await DriveService.uploadFile(sigFile).catch(() => null);
        if (up) signatureUrl = up.url;
      }

      let guestRegPdfUrl = '';
      try {
        let signatureBase64: string | null = null;
        if (hasSignature && canvasRef.current) {
          signatureBase64 = canvasRef.current.toDataURL('image/png');
        }
        const pdfFile = generateGuestRegPdfFile(
          lghId,
          activeGuestNameStr,
          guestType,
          noId,
          activeGuestPhoneStr,
          activeGuestEmailStr,
          formattedCheckInStr,
          checkOutStr,
          type,
          selectedRoom,
          duration,
          payment,
          calculatedAmount,
          signatureBase64
        );
        const up = await DriveService.uploadFile(pdfFile).catch((e) => {
          console.error("PDF upload failure:", e);
          return null;
        });
        if (up) {
          guestRegPdfUrl = up.url;
        }
      } catch (pdfErr) {
        console.error("Failed creating/uploading guest reg PDF", pdfErr);
      }

      // Guest metadata and ID Mapping
      const resolvedContactId = guestType === 'Repeater' 
        ? selectedRepeaterId 
        : guestType === 'Extend'
          ? (extendContactInfo?.id || activeExtendTrans?.kontak || newContactId)
          : newContactId;

      // 2. Fetch User Table Headers to append User row dynamically
      const userSheetRes = await getSheetData('User!A1:Z1').catch(() => null);
      if (guestType === 'New Guest') {
        let userHeaders = ['ID', 'Role', 'Usecase', 'Unit', 'Name', 'Email', 'Phone', 'No. KTP', 'Photo KTP', 'TTD', 'Avail'];
        if (userSheetRes?.values?.length > 0) {
          userHeaders = userSheetRes.values[0] as string[];
        }

        const newUserRow = new Array(userHeaders.length).fill('');
        const setUserCol = (headerName: string, value: any) => {
          const normName = headerName.trim().toUpperCase().replace(/[\s._-]+/g, '');
          const idx = userHeaders.findIndex(h => {
            if (!h) return false;
            const normH = h.trim().toUpperCase().replace(/[\s._-]+/g, '');
            
            // Exact match
            if (normH === normName) return true;
            
            // Specific mappings for potential variants
            if (normName === 'ID' && (normH === 'ID' || normH === 'CONTACTID' || normH === 'IDCONTACT' || normH === 'KTAID')) {
              return true;
            }
            if (normName === 'ROLE' && (normH === 'ROLE' || normH === 'ROLES' || normH === 'TYPE' || normH === 'TIPE')) {
              return true;
            }
            if (normName === 'NAME' && (normH === 'NAME' || normH === 'NAMA' || normH === 'NAMALENGKAP')) {
              return true;
            }
            if (normName === 'EMAIL' && (normH === 'EMAIL' || normH === 'ALAMATEMAIL')) {
              return true;
            }
            if (normName === 'PHONE' && (normH === 'PHONE' || normH === 'TELEPON' || normH === 'NOHP' || normH === 'NO.HP' || normH === 'TELP')) {
              return true;
            }
            if (normName === 'NOKTP' && (normH === 'NOKTP' || normH === 'NO.KTP' || normH === 'NO_KTP' || normH === 'IDENTITYNO' || normH === 'KTP' || normH === 'NOID')) {
              return true;
            }
            if (normName === 'PHOTOKTP') {
              if (normH === 'PHOTOKTP' || normH === 'FOTOKTP' || normH === 'KTPPHOTO' || normH === 'PHOTOID') return true;
              return false; // strictly match only equivalents, do not fallback to PHOTO
            }
            if ((normName === 'SIGN' || normName === 'TTD') && (normH === 'SIGN' || normH === 'TANDATANGAN' || normH === 'SIGNATURE' || normH === 'TTD')) {
              return true;
            }
            if (normName === 'USECASE' && (normH === 'USECASE' || normH === 'KATEGORI')) {
              return true;
            }
            
            // Fallback for non-short fields to avoid wrong matches like ID inside PhotoID
            if (normName.length > 2 && normH.includes(normName)) return true;
            if (normH.length > 2 && normName.includes(normH)) return true;
            return false;
          });
          if (idx > -1) {
            newUserRow[idx] = value;
          }
        };

        setUserCol('ID', resolvedContactId);
        setUserCol('Role', 'Client');
        setUserCol('Usecase', 'Guest');
        setUserCol('Unit', 'UNT19');
        setUserCol('Name', namaTamu);
        setUserCol('Email', email);
        setUserCol('Phone', phone);
        setUserCol('No. KTP', noId);
        setUserCol('Photo KTP', photoIdUrl);
        setUserCol('AVAIL', 'CNT');
        setUserCol('TTD', signatureUrl);

        await appendSheetData('User!A1:Z', [newUserRow]);
      } else {
        // If Repeater, upload signature to match sign url if drew
        if (signatureUrl) {
          console.log('Repeater signature generated:', signatureUrl);
        }
      }

      // 3. Fetch Lovissa Guest House headers to append Transaction row dynamically
      const lovissaSheetRes = await getSheetData('Lovissa Guest House!A1:Z1').catch(() => null);
      let lovissaHeaders = ['ID', 'Type', 'Check In', 'Dur', 'Check out', 'Room', 'Kontak', 'Price', 'Amount', 'Payment', 'Bukti Transfer', 'Photo ID', 'Email', 'Phone'];
      if (lovissaSheetRes?.values?.length > 0) {
        lovissaHeaders = lovissaSheetRes.values[0] as string[];
      }

       const newLovissaRow = new Array(lovissaHeaders.length).fill('');
      const setLovissaCol = (headerName: string, value: any) => {
        const normName = headerName.trim().toUpperCase().replace(/[\s._-]+/g, '');
        const idx = lovissaHeaders.findIndex(h => {
          if (!h) return false;
          const normH = h.trim().toUpperCase().replace(/[\s._-]+/g, '');
          
          // Exact match
          if (normH === normName) return true;
          
          // Specific mappings for potential variants
          if (normName === 'ID' && (normH === 'ID' || normH === 'TRANSACTIONID' || normH === 'IDTRANSACTION')) {
            return true;
          }
          if (normName === 'DUR' && (normH === 'DUR' || normH === 'DURATION' || normH === 'DURASI' || normH === 'DURASIDAY' || normH === 'DURASIDAYS')) {
            return true;
          }
          if (normName === 'CHECKIN' && (normH === 'CHECKIN' || normH === 'CHECK-IN' || normH === 'CHECK IN')) {
            return true;
          }
          if (normName === 'CHECKOUT' && (normH === 'CHECKOUT' || normH === 'CHECK-OUT' || normH === 'CHECK OUT')) {
            return true;
          }
          if (normName === 'ROOM' && (normH === 'ROOM' || normH === 'KAMAR' || normH === 'NOROOM')) {
            return true;
          }
          if (normName === 'KONTAK' && (normH === 'KONTAK' || normH === 'CONTACT' || normH === 'CONTACTID')) {
            return true;
          }
          if (normName === 'PRICE' && (normH === 'PRICE' || normH === 'HARGA')) {
            return true;
          }
          if (normName === 'AMOUNT' && (normH === 'AMOUNT' || normH === 'TOTAL' || normH === 'JUMLAH' || normH === 'TOTALBAYAR')) {
            return true;
          }
          if (normName === 'PAYMENT' && (normH === 'PAYMENT' || normH === 'PEMBAYARAN' || normH === 'PAYMENTMETHOD' || normH === 'METODEPEMBAYARAN')) {
            return true;
          }
          if (normName === 'BUKTITRANSFER' && (normH === 'BUKTITRANSFER' || normH === 'BUKTI' || normH === 'BUKTIBAYAR' || normH === 'TRANSFERPROOF')) {
            return true;
          }
          if (normName === 'KETERANGAN' && (normH === 'KETERANGAN' || normH === 'KET' || normH === 'NOTE' || normH === 'NOTES' || normH === 'DESKRIPSI' || normH === 'DETAIL')) {
            return true;
          }
          if (normName === 'GUESTREG' && (normH === 'GUESTREG' || normH === 'GUEST REG' || normH === 'GUESTREGISTRATION' || normH === 'REGISRATIONURL' || normH === 'REGISTRASIPDF' || normH === 'SURATREGISTAMU')) {
            return true;
          }
          if (normName === 'PRINT' && (normH === 'PRINT' || normH === 'CETAK' || normH === 'GAMBARPRINT' || normH === 'GAMBARREGISTRASI')) {
            return true;
          }
          if (normName === 'PHOTOID' && (normH === 'PHOTOID' || normH === 'PHOTO ID' || normH === 'FOTOID' || normH === 'PHOTOKTP' || normH === 'KTPPHOTO')) {
            return true;
          }
          if (normName === 'EMAIL' && (normH === 'EMAIL' || normH === 'ALAMATEMAIL')) {
            return true;
          }
          if (normName === 'PHONE' && (normH === 'PHONE' || normH === 'TELEPON' || normH === 'NOHP' || normH === 'NO.HP' || normH === 'TELP')) {
            return true;
          }
          if (normName === 'BOOKINGSOURCE' && (normH === 'BOOKINGSOURCE' || normH === 'SOURCE' || normH === 'CHANNEL' || normH === 'OTA' || normH === 'SUMBER' || normH === 'BOOKING SOURCE')) {
            return true;
          }

          // Fallback for fields longer than 2 characters
          if (normName.length > 2 && normH.includes(normName)) return true;
          if (normH.length > 2 && normName.includes(normH)) return true;
          return false;
        });
        if (idx > -1) {
          newLovissaRow[idx] = value;
        }
      };

      setLovissaCol('ID', lghId);
      setLovissaCol('Type', type);
      setLovissaCol('Check In', formattedCheckInStr);
      setLovissaCol('Dur', duration);
      setLovissaCol('Check out', checkOutStr);
      setLovissaCol('Booking Source', bookingSource);
      setLovissaCol('Room', `Room ${selectedRoom}`);
      setLovissaCol('Kontak', resolvedContactId);
      setLovissaCol('Price', Number(price || 0));
      setLovissaCol('Amount', calculatedAmount);
      setLovissaCol('Payment', payment);
      setLovissaCol('Bukti Transfer', buktiTransferUrl);
      setLovissaCol('Keterangan', keterangan);
      setLovissaCol('Guest Reg', '');
      
      // additional user info
      if (guestType === 'New Guest') {
         setLovissaCol('Photo ID', photoIdUrl);
         setLovissaCol('Email', email);
         setLovissaCol('Phone', phone);
      } else if (guestType === 'Repeater' && activeRepeaterInfo) {
         setLovissaCol('Email', activeRepeaterInfo.email);
         setLovissaCol('Phone', activeRepeaterInfo.phone);
         setLovissaCol('Photo ID', activeRepeaterInfo.photoKtp || '');
      } else if (guestType === 'Extend') {
         setLovissaCol('Email', activeGuestEmailStr);
         setLovissaCol('Phone', activeGuestPhoneStr);
         setLovissaCol('Photo ID', extendContactInfo?.photoKtp || activeExtendTrans?.['Photo ID'] || activeExtendTrans?.photoId || '');
      }

      if (printJpegUrl) {
        setLovissaCol('Print', printJpegUrl);
      }

      await appendSheetData('Lovissa Guest House!A1:Z', [newLovissaRow]);

      // Log Activity to Newsfeed
      const submitterEmail = localStorage.getItem('mtask_user_email') || 'unknown@kipapola.com';
      const submitterName = localStorage.getItem('mtask_user_name') || (submitterEmail.includes('@') ? submitterEmail.split('@')[0] : submitterEmail) || 'User';

      logActivity(
        "Form",
        "Check In LGH",
        `${submitterName} mencatat Check In Room ${selectedRoom} (${activeGuestNameStr || "Tamu"}) | Rp.${Number(calculatedAmount || 0).toLocaleString("id-ID")}`
      );

      alert('Data Registrasi Lovissa Guest House berhasil dikirim!');
      setShowRegModal(false);
      navigate(-1);
    } catch (err: any) {
      console.error(err);
      alert('Gagal mengirim data form: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleValidation = () => {
    if (!selectedRoom) {
      alert('Silakan pilih nomor Kamar (Room) terlebih dahulu!');
      return false;
    }
    if (guestType === 'Repeater' && !selectedRepeaterId) {
      alert('Silakan pilih salah satu data tamu Repeater!');
      return false;
    }
    if (guestType === 'Extend' && !selectedExtendId && !namaTamu) {
      alert('Silakan pilih atau lengkapi data tamu untuk extend!');
      return false;
    }
    if (guestType === 'New Guest' && !namaTamu) {
      alert('Silakan isi nama lengkap tamu!');
      return false;
    }
    if ((payment === 'Transfer' || payment === 'Qris') && !buktiTransferFile) {
      alert(`Silakan lampirkan Bukti ${payment === 'Qris' ? 'Pembayaran QRIS' : 'Transfer'} terlebih dahulu!`);
      return false;
    }
    return true;
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (handleValidation()) {
      setSubmitting(true);
      try {
        let capturedJpegUrl = '';
        const el = document.getElementById('printable-area');
        if (el) {
          // Use html-to-image to capture the element
          const dataUrl = await toJpeg(el, { quality: 0.8, backgroundColor: '#ffffff', pixelRatio: 2 });
          const resBlob = await fetch(dataUrl).then(res => res.blob());
          if (resBlob) {
            const file = new File([resBlob], `guest_registration_print_${Date.now()}.jpg`, { type: 'image/jpeg' });
            const res = await DriveService.uploadFile(file);
            capturedJpegUrl = res.url;
          }
        }
        await submitData(capturedJpegUrl);
      } catch (err: any) {
        console.error(err);
        alert('Gagal memproses print dan pengiriman data: ' + err.message);
        setSubmitting(false);
      }
    }
  };

  const handleAddBookingSource = () => {
    if (!newBookingSourceName.trim()) {
      alert("Nama sumber tidak boleh kosong");
      return;
    }
    const val = newBookingSourceName.trim();
    if (!bookingSources.some((s) => s.toLowerCase() === val.toLowerCase())) {
      const updated = [...bookingSources, val];
      setBookingSources(updated);
      try {
        const customOnly = updated.filter(
          (s) => !DEFAULT_BOOKING_SOURCES.includes(s),
        );
        localStorage.setItem(
          "lgh_custom_booking_sources",
          JSON.stringify(customOnly),
        );

        // Remove from deleted list if it's there
        const savedDeleted = localStorage.getItem('lgh_deleted_booking_sources');
        if (savedDeleted) {
          let deletedSources: string[] = JSON.parse(savedDeleted);
          deletedSources = deletedSources.filter(d => d.toLowerCase() !== val.toLowerCase());
          localStorage.setItem('lgh_deleted_booking_sources', JSON.stringify(deletedSources));
        }
      } catch (e) {
        console.error(e);
      }
    }
    setBookingSource(val);
    setShowAddBookingSourceModal(false);
    setNewBookingSourceName("");
  };

  const handleDeleteBookingSource = (sourceToRemove: string) => {
    if (DEFAULT_BOOKING_SOURCES.includes(sourceToRemove)) {
      alert("Sumber bawaan tidak dapat dihapus.");
      return;
    }

    const updated = bookingSources.filter(s => s !== sourceToRemove);
    setBookingSources(updated);

    if (bookingSource === sourceToRemove) {
      setBookingSource(updated[0] || 'Booking.com');
    }

    try {
      const customOnly = updated.filter(
        (s) => !DEFAULT_BOOKING_SOURCES.includes(s),
      );
      localStorage.setItem(
        "lgh_custom_booking_sources",
        JSON.stringify(customOnly),
      );

      // add to deleted list
      let deletedSources: string[] = [];
      const savedDeleted = localStorage.getItem('lgh_deleted_booking_sources');
      if (savedDeleted) deletedSources = JSON.parse(savedDeleted);
      
      if (!deletedSources.some(d => d.toLowerCase() === sourceToRemove.toLowerCase())) {
        deletedSources.push(sourceToRemove);
        localStorage.setItem('lgh_deleted_booking_sources', JSON.stringify(deletedSources));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="pb-24 bg-gray-50 min-h-screen relative text-right">
      {/* Header bar */}
      <header className="bg-indigo-900 text-white px-5 py-4 shadow-lg sticky top-0 z-[100] w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => navigate(-1)} 
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="text-left">
            <h1 className="text-lg font-black tracking-tight flex items-center gap-1.5">
              <Building2 className="w-5 h-5 text-indigo-300" />
              Lovissa Guest House
            </h1>
            <p className="text-[10px] text-indigo-200">Form Pemesanan & Okupansi Kamar</p>
          </div>
        </div>
        <div className="bg-indigo-850 px-2.5 py-1 rounded-full border border-indigo-700/60 text-xs font-mono font-bold text-indigo-200">
          {lghId}
        </div>
      </header>
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-sm text-gray-500">
          <div className="w-8 h-8 rounded-full border-4 border-indigo-400 border-t-transparent animate-spin" />
          Memuat data okupansi...
        </div>
      ) : (
        <form onSubmit={handleSubmitForm} className="max-w-md mx-auto p-4 space-y-5 text-left">
          
          {/* UNIT DETAILS */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Detil Menginap
            </h3>

            {/* Stay Type Choices */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 font-sans">
                Type <span className="text-red-500">*</span>
              </label>
              <div className="flex bg-gray-100 p-1 rounded-xl">
                {(['Daily', 'Weekly', 'Monthly'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex-1 text-center py-2 text-xs font-bold rounded-lg cursor-pointer transition-all duration-150 ${
                      type === t 
                        ? 'bg-white text-indigo-900 shadow' 
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Check In Date */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                Check In <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  required
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3 py-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans cursor-pointer"
                />
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                Durasi ({type === 'Daily' ? 'Days' : type === 'Weekly' ? 'Weeks' : 'Month'}) <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setDuration((prev) => Math.max(1, prev - 1))}
                  disabled={duration <= 1}
                  className="w-10 h-9 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95 shadow-sm font-bold"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  required
                  type="number"
                  min="1"
                  value={duration}
                  onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 bg-transparent text-center text-xs font-bold text-gray-800 focus:outline-none font-sans py-1.5"
                />
                <button
                  type="button"
                  onClick={() => setDuration((prev) => prev + 1)}
                  className="w-10 h-9 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-indigo-600 cursor-pointer transition-all active:scale-95 shadow-sm font-bold"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Check Out Date - READ ONLY */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                Check Out (Otomatis)
              </label>
              <div className="bg-gray-100/70 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-zinc-600 font-sans select-none flex items-center justify-between">
                <span>{checkOutStr || '-'}</span>
                <span className="text-[10px] text-zinc-400 font-normal">Calculated based on Type</span>
              </div>
            </div>

            {/* Room (tombol kecil denga angka 1..12) */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                Room Number <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-6 gap-2">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((roomNum) => {
                  const isOccupied = checkRoomOccupancy(roomNum);
                  const isSelected = selectedRoom === roomNum;
                  const isExtendMode = guestType === 'Extend';
                  const isExtendRoomMatch = isExtendMode && selectedExtendId && (() => {
                    const trans = existingTransactions.find(t => t.id === selectedExtendId);
                    if (trans && trans.room) {
                      const match = String(trans.room).match(/\d+/);
                      return match && parseInt(match[0], 10) === roomNum;
                    }
                    return false;
                  })();

                  let isDisabled = false;
                  if (guestType === 'Extend') {
                    if (selectedExtendId) {
                      isDisabled = !isExtendRoomMatch;
                    } else {
                      isDisabled = !isOccupied;
                    }
                  } else {
                    isDisabled = isOccupied;
                  }
                  
                  // Auto-fill logic when selecting a room manually in extend mode
                  const handleRoomClick = () => {
                    setSelectedRoom(roomNum);
                    
                    if (isExtendMode && isOccupied) {
                      // Try to auto-select the latest transaction for this room if it exists
                      const latestTransForRoom = existingTransactions.slice().reverse().find(t => {
                        if (!t.room) return false;
                        const match = String(t.room).match(/\d+/);
                        return match && parseInt(match[0], 10) === roomNum;
                      });
                      
                      if (latestTransForRoom) {
                        setSelectedExtendId(latestTransForRoom.id);
                        const outDate = parseDate(latestTransForRoom.checkOut);
                        if (outDate) {
                          const y = outDate.getFullYear();
                          const m = String(outDate.getMonth() + 1).padStart(2, '0');
                          const d = String(outDate.getDate()).padStart(2, '0');
                          setCheckIn(`${y}-${m}-${d}`);
                        }
                        const cInfo = contactList.find(c => c.id === latestTransForRoom.kontak || c.name.toLowerCase() === latestTransForRoom.kontak?.toLowerCase());
                        setNamaTamu(cInfo?.name || latestTransForRoom.kontak || '');
                        if (cInfo?.email || latestTransForRoom.email) setEmail(cInfo?.email || latestTransForRoom.email);
                        if (cInfo?.phone || latestTransForRoom.phone) setPhone(cInfo?.phone || latestTransForRoom.phone);
                        if (cInfo?.photoKtp || latestTransForRoom.noId) setNoId(latestTransForRoom.noId || '');
                        if (latestTransForRoom.price) setPrice(String(latestTransForRoom.price).replace(/[^0-9]/g, ''));
                        if (latestTransForRoom.bookingSource) setBookingSource(latestTransForRoom.bookingSource);
                        if (latestTransForRoom.type && (latestTransForRoom.type === 'Daily' || latestTransForRoom.type === 'Weekly' || latestTransForRoom.type === 'Monthly')) {
                          setType(latestTransForRoom.type as any);
                        }
                      }
                    }
                  };

                  return (
                    <button
                      key={roomNum}
                      type="button"
                      disabled={isDisabled}
                      onClick={handleRoomClick}
                      className={`aspect-square rounded-xl border font-mono text-xs font-extrabold flex flex-col items-center justify-center p-1 transition-all duration-150 ${
                        isDisabled 
                          ? 'bg-gray-100 text-gray-400 border-gray-200 line-through cursor-not-allowed'
                          : isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10 scale-102 font-bold cursor-pointer'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-500 cursor-pointer hover:bg-indigo-50/20'
                      }`}
                    >
                      <span>{roomNum}</span>
                      <span className="text-[8px] scale-90 mt-0.5 font-sans font-normal uppercase">
                        {isOccupied && (isExtendRoomMatch || (isExtendMode && isSelected)) ? 'Ext' : isOccupied ? 'Okp' : 'Vac'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                * Kamar yang sedang dicoret (line-through) memiliki okupansi aktif pada tanggal check-in pilihan Anda.
              </p>
            </div>
          </div>

          {/* GUEST SECTION DIVIDER */}
          <div className="relative py-2 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-indigo-400/20"></div>
            </div>
            <span className="relative px-4 bg-gray-50 text-xs font-black text-indigo-900 tracking-widest uppercase">
              Data Tamu
            </span>
          </div>

          {/* DATA TAMU SELECTOR & DETAILS */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
            
            {/* Guest Type button group */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 font-sans">
                Guest Type <span className="text-red-500">*</span>
              </label>
              <div className="flex bg-gray-100 p-1 rounded-xl">
                {(['New Guest', 'Repeater', 'Extend'] as const).map((gt) => (
                  <button
                    key={gt}
                    type="button"
                    onClick={() => setGuestType(gt)}
                    className={`flex-1 text-center py-2 text-xs font-bold rounded-lg cursor-pointer transition-all duration-150 ${
                      guestType === gt 
                        ? 'bg-white text-indigo-900 shadow' 
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {gt}
                  </button>
                ))}
              </div>
            </div>

            {/* EXTEND SELECT FLOW */}
            {guestType === 'Extend' && (
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                    Pilih Tamu / Kamar untuk Di-Extend <span className="text-red-500">*</span>
                  </label>
                  {existingTransactions.length === 0 ? (
                    <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg font-bold">
                      Belum ada data transaksi aktif Lovissa Guest House.
                    </p>
                  ) : (
                    <select
                      value={selectedExtendId}
                      onChange={(e) => {
                        const selId = e.target.value;
                        setSelectedExtendId(selId);
                        const trans = existingTransactions.find(t => t.id === selId);
                        if (trans) {
                          const rMatch = trans.room ? String(trans.room).match(/\d+/) : null;
                          if (rMatch) {
                            setSelectedRoom(parseInt(rMatch[0], 10));
                          }
                          const outDate = parseDate(trans.checkOut);
                          if (outDate) {
                            const y = outDate.getFullYear();
                            const m = String(outDate.getMonth() + 1).padStart(2, '0');
                            const d = String(outDate.getDate()).padStart(2, '0');
                            setCheckIn(`${y}-${m}-${d}`);
                          }
                          const cInfo = contactList.find(c => c.id === trans.kontak || c.name.toLowerCase() === trans.kontak?.toLowerCase());
                          setNamaTamu(cInfo?.name || trans.kontak || '');
                          if (cInfo?.email || trans.email) setEmail(cInfo?.email || trans.email);
                          if (cInfo?.phone || trans.phone) setPhone(cInfo?.phone || trans.phone);
                          if (cInfo?.photoKtp || trans.noId) setNoId(trans.noId || '');
                          if (trans.price) setPrice(String(trans.price).replace(/[^0-9]/g, ''));
                          if (trans.bookingSource) setBookingSource(trans.bookingSource);
                          if (trans.type && (trans.type === 'Daily' || trans.type === 'Weekly' || trans.type === 'Monthly')) {
                            setType(trans.type as any);
                          }
                        }
                      }}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans cursor-pointer"
                    >
                      <option value="">-- Pilih Tamu / Kamar yang Diperpanjang --</option>
                      {(() => {
                        const witaNow = getWitaParts();
                        const todayTime = new Date(witaNow.year, witaNow.month - 1, witaNow.day).getTime();
                        
                        const activeExtends = existingTransactions.slice().reverse().filter(t => {
                           const end = parseDate(t.checkOut);
                           if (!end) return false;
                           const endDayTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
                           
                           if (endDayTime < todayTime) return false;

                           const tRoomMatch = t.room ? String(t.room).match(/\d+/) : null;
                           if (tRoomMatch) {
                              const roomNum = parseInt(tRoomMatch[0], 10);
                              const latestForRoom = existingTransactions.slice().reverse().find(tr => {
                                const trMatch = tr.room ? String(tr.room).match(/\d+/) : null;
                                return trMatch && parseInt(trMatch[0], 10) === roomNum;
                              });
                              if (latestForRoom?.id !== t.id) return false;
                           }
                           
                           return true;
                        });

                        if (activeExtends.length === 0) {
                          return <option value="" disabled>Belum ada kamar yang terisi saat ini</option>;
                        }

                        return activeExtends.map((t, idx) => {
                          const cInfo = contactList.find(c => c.id === t.kontak || c.name.toLowerCase() === t.kontak?.toLowerCase());
                          const gName = cInfo?.name || t.kontak || 'Tamu';
                          return (
                            <option key={`${t.id}-${idx}`} value={t.id}>
                              {t.room || 'Room'} - {gName} (Check Out: {t.checkOut || '-'})
                            </option>
                          );
                        });
                      })()}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                    Nama Tamu <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                    <input
                      required
                      readOnly
                      type="text"
                      placeholder="Nama lengkap tamu..."
                      value={namaTamu}
                      onChange={(e) => setNamaTamu(e.target.value)}
                      className="w-full bg-gray-100 border border-gray-200 rounded-xl pl-10 pr-3 py-2.5 text-xs font-bold text-gray-500 focus:outline-none cursor-not-allowed font-sans"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                      WhatsApp / No. HP
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                      <input
                        readOnly
                        type="tel"
                        placeholder="0812..."
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-gray-100 border border-gray-200 rounded-xl pl-10 pr-3 py-2.5 text-xs font-bold text-gray-500 focus:outline-none cursor-not-allowed font-sans"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                      <input
                        readOnly
                        type="email"
                        placeholder="email@tamu.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-gray-100 border border-gray-200 rounded-xl pl-10 pr-3 py-2.5 text-xs font-bold text-gray-500 focus:outline-none cursor-not-allowed font-sans"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* REPEATER SELECT FLOW */}
            {guestType === 'Repeater' && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                  Select Guest <span className="text-red-500">*</span>
                </label>
                {contactList.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg font-bold">
                    Tidak ditemukan data tamu yang sesuai (Role: Client, Usecase: Guest).
                  </p>
                ) : (
                  <select
                    value={selectedRepeaterId}
                    onChange={(e) => setSelectedRepeaterId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans cursor-pointer"
                  >
                    <option value="">-- Pilih Tamu Repeater --</option>
                    {contactList.map((contact, idx) => (
                      <option key={`${contact.id}-${idx}`} value={contact.id}>
                        {contact.name}
                      </option>
                    ))}
                  </select>
                )}

                {activeRepeaterInfo && (
                  <div className="mt-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs space-y-1">
                    <p className="font-bold text-indigo-900">Metadata Contact Terelasi:</p>
                    <p className="text-gray-600">ID: <span className="font-mono text-indigo-500">{activeRepeaterInfo.id}</span></p>
                    <p className="text-gray-600">Usecase / Unit: <span className="font-bold">{activeRepeaterInfo.usecase}</span> / {activeRepeaterInfo.unit}</p>
                    {activeRepeaterInfo.email && <p className="text-gray-600">Email: {activeRepeaterInfo.email}</p>}
                    {activeRepeaterInfo.phone && <p className="text-gray-600">No HP: {activeRepeaterInfo.phone}</p>}
                    {activeRepeaterInfo.photoKtp && (
                      <div className="mt-2">
                        <p className="text-gray-600">Photo KTP:</p>
                        <img 
                          src={activeRepeaterInfo.photoKtp} 
                          alt="KTP" 
                          className="h-20 w-auto object-cover rounded mt-1 border border-indigo-200" 
                          referrerPolicy="no-referrer" 
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* NEW GUEST FIELDS */}
            {guestType === 'New Guest' && (
              <div className="space-y-3.5">
                {/* Generated Contact ID */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Generated Contact ID</span>
                  <div className="px-3.5 py-2 font-mono text-[11px] font-bold text-gray-500 bg-gray-100 rounded-lg inline-block">{newContactId}</div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                    Nama Tamu <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                    <input
                      required
                      type="text"
                      placeholder="Masukkan nama lengkap tamu"
                      value={namaTamu}
                      onChange={(e) => setNamaTamu(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      placeholder="Contoh: tamu@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                    No. Handphone (WhatsApp) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                    <input
                      required
                      type="tel"
                      placeholder="Masukkan nomor whatsapp aktif"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                    No. Identitas (KTP / Passport) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                    <input
                      required
                      type="text"
                      placeholder="Masukkan nomor KTP / Passport"
                      value={noId}
                      onChange={(e) => setNoId(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans"
                    />
                  </div>
                </div>

                {/* Photo ID file uploader */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                    Photo ID (KTP / Passport) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    ref={photoIdInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setPhotoIdFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCameraTarget('photoId')}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl py-2.5 px-3 text-xs font-bold cursor-pointer transition-all"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Kamera
                    </button>
                    <button
                      type="button"
                      onClick={() => photoIdInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer bg-white transition-all hover:border-gray-300"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
                      Galeri
                    </button>
                  </div>
                  {photoIdFile && (
                    <div className="mt-3 p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                      <img 
                        src={URL.createObjectURL(photoIdFile)} 
                        alt="Photo ID preview" 
                        className="w-12 h-12 object-cover rounded-lg border border-gray-200 bg-white" 
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-gray-950 truncate">{photoIdFile.name}</p>
                        <p className="text-[9px] text-gray-400">{(photoIdFile.size / 1024).toFixed(1)} KB</p>
                        <button
                          type="button"
                          onClick={() => setPhotoIdFile(null)}
                          className="text-[10px] font-bold text-red-500 cursor-pointer hover:underline"
                        >
                          Hapus Foto
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* BOOKING SOURCE SECTION */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-indigo-500" /> Booking Source
            </h3>
            <div>
              <label className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                <span>Sumber Pemesanan <span className="text-red-500">*</span></span>
                <button 
                  type="button" 
                  onClick={() => setShowManageBookingSourceModal(true)}
                  className="text-[10px] text-indigo-500 hover:text-indigo-700 hover:underline capitalize"
                >
                  Kelola Daftar
                </button>
              </label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={bookingSource}
                  onChange={(e) => {
                    if (e.target.value === "ADD_NEW") {
                      setShowAddBookingSourceModal(true);
                    } else {
                      setBookingSource(e.target.value);
                    }
                  }}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans cursor-pointer"
                >
                  {bookingSources.map((src, idx) => (
                    <option key={`bs-${idx}`} value={src}>{src}</option>
                  ))}
                  <option value="ADD_NEW">+ Lainnya (Tambah Baru)</option>
                </select>
              </div>
            </div>
          </div>

          {/* FINANCIAL SECTION */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-indigo-500" /> Pembayaran
            </h3>

            {/* Price field */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                Price (Tarif Sewa) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-xs font-bold text-gray-500">Rp</span>
                <input
                  required
                  type="number"
                  placeholder="Contoh: 150000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans"
                />
              </div>
            </div>

            {/* Amount - READ ONLY (Price * Duration) */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                Amount (Total Bayar - Otomatis)
              </label>
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm font-extrabold text-amber-900 font-sans select-none flex items-center justify-between">
                <span>Rp {calculatedAmount.toLocaleString('id-ID')}</span>
                <span className="text-[10px] text-amber-600 font-normal">{price || 0} X {duration} {type === 'Daily' ? 'Days' : type === 'Weekly' ? 'Weeks' : 'Months'}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 font-sans">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <div className="flex bg-gray-100 p-1 rounded-xl">
                {(['Cash', 'Transfer', 'Qris'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPayment(p)}
                    className={`flex-1 text-center py-2 text-xs font-bold rounded-lg cursor-pointer transition-all duration-150 ${
                      payment === p 
                        ? 'bg-white text-indigo-900 shadow' 
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* QRIS Image Display (only if selected) */}
            {payment === 'Qris' && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex flex-col items-center justify-center space-y-2">
                <p className="text-[10px] font-black text-indigo-950 uppercase tracking-widest text-center">
                  PINDAI QRIS UNTUK PEMBAYARAN
                </p>
                <div className="bg-white p-2.5 rounded-lg shadow-sm border border-gray-150">
                  <img 
                    src="https://i.ibb.co.com/FLNW0tnL/QRIS-KTA.png" 
                    alt="QRIS Lovissa Guesthouse" 
                    referrerPolicy="no-referrer"
                    className="max-w-[200px] w-full h-auto object-contain mx-auto"
                  />
                </div>
                <p className="text-[9px] text-amber-800 text-center font-bold">
                  Silakan pindai/scan QRIS di atas untuk menyelesaikan pembayaran Anda, lalu lampirkan bukti pembayaran di bawah ini.
                </p>
              </div>
            )}

            {/* Bukti Transfer (Transfer and Qris) */}
            {(payment === 'Transfer' || payment === 'Qris') && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                  Bukti {payment === 'Qris' ? 'Pembayaran QRIS' : 'Transfer'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  ref={buktiInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setBuktiTransferFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCameraTarget('bukti')}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl py-2.5 px-3 text-xs font-bold cursor-pointer transition-all"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Kamera
                  </button>
                  <button
                    type="button"
                    onClick={() => buktiInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer bg-white transition-all hover:border-gray-300"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
                    Galeri
                  </button>
                </div>
                {buktiTransferFile && (
                  <div className="mt-3 p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                    <img 
                      src={URL.createObjectURL(buktiTransferFile)} 
                      alt="Transfer Proof preview" 
                      className="w-12 h-12 object-cover rounded-lg border border-gray-200 bg-white" 
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-gray-950 truncate">{buktiTransferFile.name}</p>
                      <p className="text-[9px] text-gray-400">{(buktiTransferFile.size / 1024).toFixed(1)} KB</p>
                      <button
                        type="button"
                        onClick={() => setBuktiTransferFile(null)}
                        className="text-[10px] font-bold text-red-500 cursor-pointer hover:underline"
                      >
                        Hapus Bukti
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SIGN TAB */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3.5">
            <h3 className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-indigo-500" /> Guest Signature
            </h3>
            
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-2 bg-indigo-50/20 relative">
              <canvas
                ref={canvasRef}
                width={380}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-[160px] bg-white rounded-lg cursor-crosshair touch-none"
              />
              <button
                type="button"
                onClick={clearCanvas}
                className="absolute right-4 bottom-4 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-black py-1 px-3 text-[10px] font-bold rounded-lg cursor-pointer transition-all border border-gray-200"
              >
                Hapus Tanda Tangan
              </button>
            </div>
            <p className="text-[10px] text-zinc-400">
              * Silakan gambar tanda tangan di atas (touchpad, touch screen, atau dengan click & drag mouse).
            </p>
          </div>

          {/* KETERANGAN CARD */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3.5">
            <h3 className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-1.55">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-500" /> Keterangan
            </h3>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                Keterangan Tambahan
              </label>
              <textarea
                placeholder="Masukkan catatan atau keterangan tambahan di sini..."
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                rows={3}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans"
              />
            </div>
          </div>

          {/* GUEST REGISTRATION PREVIEW / PRINT TRIGGERS */}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                if (!selectedRoom) {
                  alert('Pilih nomor Kamar (Room) terlebih dahulu!');
                  return;
                }
                if (guestType === 'Repeater' && !selectedRepeaterId) {
                  alert('Masukkan atau pilih data tamu!');
                  return;
                }
                if (guestType === 'Extend' && !selectedExtendId && !namaTamu) {
                  alert('Pilih atau lengkapi data tamu untuk extend!');
                  return;
                }
                if (guestType === 'New Guest' && !namaTamu) {
                  alert('Mohon isi nama lengkap tamu di Data Tamu!');
                  return;
                }
                setShowRegModal(true);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 border border-indigo-200 hover:border-indigo-300 bg-indigo-50 text-indigo-900 rounded-xl py-3.5 text-xs font-bold cursor-pointer transition-all hover:bg-indigo-100/50"
            >
              <FileText className="w-4 h-4 text-indigo-700" />
              Preview
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex-[1.5] flex items-center justify-center gap-1.5 bg-gradient-to-tr from-indigo-700 to-indigo-900 hover:from-indigo-800 hover:to-indigo-950 text-white rounded-xl py-3.5 text-xs font-bold cursor-pointer shadow-lg shadow-indigo-900/15 disabled:opacity-50 transition-all text-center"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Kirim Data Registrasi
                </>
              )}
            </button>
          </div>
        </form>
      )}
      {/* CAMERA CAPTURE ASSISTANCE */}
      {cameraTarget && (
        <CameraModal
          onClose={() => setCameraTarget(null)}
          onCapture={(blob) => {
            const file = new File([blob], `capture_${cameraTarget === 'photoId' ? 'ktp' : 'bukti'}_${Date.now()}.jpg`, { type: 'image/jpeg' });
            if (cameraTarget === 'photoId') {
              setPhotoIdFile(file);
            } else {
              setBuktiTransferFile(file);
            }
            setCameraTarget(null);
          }}
          onGallerySelect={() => {
            if (cameraTarget === 'photoId') {
              photoIdInputRef.current?.click();
            } else {
              buktiInputRef.current?.click();
            }
            setCameraTarget(null);
          }}
        />
      )}
      {/* GUEST REGISTRATION MODAL WITH FORMAT GUEST REGISTRATION TO PRINT */}
      <div className={`fixed ${showRegModal ? 'inset-0 z-[200] bg-black/50 backdrop-blur-sm' : '-left-[9999px] -top-[9999px] opacity-0 pointer-events-none'} flex items-center justify-center p-4`}>
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="text-left">
                <h3 className="font-extrabold text-gray-900 text-sm">Guest Registration Preview</h3>
                <p className="text-[10px] text-zinc-400">Lovissa Guesthouse - Bali, Indonesia</p>
              </div>
              <button 
                onClick={() => setShowRegModal(false)}
                className="p-1.5 bg-gray-100 rounded-full hover:bg-gray-200 cursor-pointer"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Scrollable document layout print area */}
            <div className="flex-1 overflow-y-auto p-6" id="printable-area-wrapper">
              <div id="printable-area" className="max-w-md mx-auto bg-white border border-gray-200 p-6 rounded-lg text-left shadow-inner text-zinc-800 font-sans text-xs space-y-4">
                
                {/* Title */}
                <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                  <img src="https://i.ibb.co.com/V0WH2wQN/lovissa.png" alt="Lovissa" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
                  <div className="text-left flex-1">
                    <h2 className="text-base font-black tracking-tight text-gray-900 uppercase">GUEST REGISTRATION</h2>
                    <p className="text-[10px] font-bold text-gray-500">No. {lghId}</p>
                    <p className="text-[11px] font-extrabold text-indigo-900 mt-0.5">Lovissa Guesthouse - Bali</p>
                  </div>
                </div>

                {/* Subtitle intro */}
                <p className="text-[10px] text-gray-500 leading-relaxed text-justify">
                  Welcome to Lovissa Guesthouse. To ensure a comfortable and enjoyable stay for all guests, we kindly ask you to review and agree to the following terms and conditions.
                </p>

                {/* GUEST DETAILS */}
                <div className="space-y-2 pt-1">
                  <h4 className="font-extrabold text-gray-900 border-b border-gray-100 pb-0.5 text-[10px] uppercase tracking-wider">GUEST DETAILS</h4>
                  <div className="grid grid-cols-2 gap-y-1.5 text-[11px]">
                    <div>
                      <span className="text-gray-400 font-medium select-none block">Guest Type:</span> 
                      <p className="font-bold text-indigo-900">{guestType}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 font-medium select-none block">Full Name:</span> 
                      <p className="font-bold text-gray-950">{activeGuestNameStr || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 font-medium select-none block">ID / Passport Number:</span> 
                      <p className="font-mono font-bold text-gray-800">{noId || (guestType === 'Repeater' ? 'Loaded Existing' : '-')}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 font-medium select-none block">WhatsApp / Phone:</span> 
                      <p className="font-bold text-zinc-900">{activeGuestPhoneStr || '-'}</p>
                    </div>
                    <div className="overflow-hidden">
                      <span className="text-gray-400 font-medium select-none block">Email:</span> 
                      <p className="font-bold text-zinc-900 break-all pr-2">{activeGuestEmailStr || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* STAY INFORMATION */}
                <div className="space-y-2">
                  <h4 className="font-extrabold text-gray-900 border-b border-gray-100 pb-0.5 text-[10px] uppercase tracking-wider">STAY PERIOD DETAILS</h4>
                  <div className="grid grid-cols-2 gap-y-1.5 text-[11px]">
                    <div>
                      <span className="text-gray-400 font-medium select-none block">Stay Period:</span> 
                      <p className="font-bold text-gray-950">[{formattedCheckInStr}] to [{checkOutStr}]</p>
                    </div>
                    <div>
                      <span className="text-gray-400 font-medium select-none block">Stay Type:</span> 
                      <p className="font-bold text-indigo-900">{type}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 font-medium select-none block">Room Number:</span> 
                      <p className="font-bold text-indigo-600">Room {selectedRoom || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 font-medium select-none block">Duration:</span> 
                      <p className="font-bold text-gray-950">{duration} {type === 'Daily' ? 'Days' : type === 'Weekly' ? 'Weeks' : 'Month'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 font-medium select-none block">Booking Source:</span> 
                      <p className="font-bold text-indigo-900">{bookingSource || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* PAYMENT SECTION */}
                <div className="bg-zinc-50 border border-zinc-100 p-2.5 rounded-xl">
                  <div className="text-[11px] font-black text-emerald-900 flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center">
                    <span>PAYMENT BY {payment.toUpperCase()}:</span>
                    <span className="text-right whitespace-normal break-words">Rp {Number(price || 0).toLocaleString('id-ID')} X {duration} = Rp {calculatedAmount.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {/* TERMS & CONDITIONS */}
                <div className="space-y-1 text-[9px] text-gray-500 leading-relaxed text-justify">
                  <h4 className="font-extrabold text-gray-900 text-[10px] uppercase tracking-wider">TERMS & CONDITIONS</h4>
                  <ul className="list-disc pl-3.5 space-y-0.5">
                    <li>Check-out Time: 12:00 PM , Check - in Time: 2:00 PM</li>
                    <li>Security Deposit (Monthly): A deposit of IDR 1,000,000 is required. This is fully refundable upon check-out provided there is no damage or unpaid bills.</li>
                    <li>Liability: Guests are responsible for any damage or loss of guesthouse property.</li>
                    <li>Illegal Activities: Any illegal activities will be reported to the authorities.</li>
                    <li>Payment: full payment is required upon check-in , All payments are non refundable</li>
                    <li>Key & Access: Guests are responsible for keeping their room key/access secure. Lost keys may incur a replacement fee.</li>
                    <li>Pets Policy: Pets are not allowed unless approved in advance by management.</li>
                    <li>Force Majeure: The guesthouse shall not be held responsible for failure to provide services due to circumstances beyond control (e.g., natural disasters, government regulations, etc.).</li>
                    <li>Extension of Stay: Any extension of stay is subject to room availability and must be confirmed with management in advance.</li>
                  </ul>
                </div>

                {/* GUEST DECLARATION */}
                <div className="space-y-1.5 pt-2 border-t border-gray-100">
                  <h4 className="font-extrabold text-gray-900 text-[10px] uppercase tracking-wider">GUEST DECLARATION</h4>
                  <p className="text-[9px] text-gray-400 leading-relaxed text-justify">
                    I hereby confirm that the information provided is accurate. I have read, understood, and agreed to follow the Terms & Conditions of Lovissa Guesthouse during my stay.
                  </p>
                </div>

                {/* SIGNATURE AREA DISPLAY */}
                <div className="flex justify-between items-end pt-4 w-full">
                  <img src="https://i.ibb.co/whqcWsG8/qr-lovissa.png" alt="QR Lovissa" className="h-[90px] w-auto object-contain" referrerPolicy="no-referrer" />
                  <div className="w-[150px] text-center space-y-2">
                    <p className="text-[10px] text-gray-400 select-none">Guest Signature,</p>
                    
                    {/* Rendered signature image if drawn */}
                    {hasSignature && canvasRef.current ? (
                      <div className="border border-gray-100 rounded p-1 bg-gray-50 inline-block">
                        <img 
                          src={canvasRef.current.toDataURL()} 
                          alt="Signature Preview" 
                          className="w-[120px] h-[50px] object-contain mx-auto" 
                        />
                      </div>
                    ) : (
                      <div className="h-[50px] flex items-center justify-center text-[10px] text-zinc-300 border border-dashed border-gray-200 rounded">
                        No Signature
                      </div>
                    )}
                    
                    <p className="font-bold text-gray-950 text-[11px] border-t border-gray-300 pt-1">
                      ({activeGuestNameStr || 'Nama Tamu'})
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Print/Download controls footer */}
            <div className="p-4 bg-gray-50 rounded-b-2xl border-t border-gray-100 flex gap-2">
              <button
                type="button"
                onClick={() => setShowRegModal(false)}
                disabled={submitting}
                className="w-full border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-xl py-3 text-xs font-bold cursor-pointer transition-all bg-white"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>

      {/* MODAL: Add New Booking Source */}
      {showAddBookingSourceModal && (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
            <button
              onClick={() => {
                setShowAddBookingSourceModal(false);
                setBookingSource(bookingSources[0] || "Booking.com");
              }}
              className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-black text-indigo-900 mb-4">
              Tambah Sumber Booking
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Masukkan nama sumber pemesanan yang baru (contoh: Traveloka, Agoda, dsb).
            </p>
            <input
              type="text"
              value={newBookingSourceName}
              onChange={(e) => setNewBookingSourceName(e.target.value)}
              placeholder="Nama sumber..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 mb-5"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowAddBookingSourceModal(false);
                  setBookingSource(bookingSources[0] || "Booking.com");
                }}
                className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-xl py-3 text-xs font-bold cursor-pointer transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleAddBookingSource}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 text-xs font-bold shadow-md cursor-pointer transition-all"
              >
                Tambah
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Manage Booking Sources */}
      {showManageBookingSourceModal && (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setShowManageBookingSourceModal(false)}
              className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-black text-indigo-900 mb-2">
              Kelola Sumber Booking
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Hapus sumber pemesanan khusus yang tidak lagi digunakan.
            </p>
            
            <div className="max-h-64 overflow-y-auto space-y-2 mb-5 pr-1">
              {bookingSources.map((src, idx) => {
                const isDefault = DEFAULT_BOOKING_SOURCES.includes(src);
                return (
                  <div key={`manage-bs-${idx}`} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl">
                    <span className="text-sm font-bold text-gray-700">{src}</span>
                    {!isDefault && (
                      <button 
                        onClick={() => handleDeleteBookingSource(src)}
                        className="text-red-500 hover:text-red-700 p-1 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                        title="Hapus sumber"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {isDefault && (
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-200 px-2 py-0.5 rounded-md uppercase">
                        Bawaan
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowManageBookingSourceModal(false)}
              className="w-full bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 rounded-xl py-3 text-xs font-bold cursor-pointer transition-all"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
