import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Camera, Image as ImageIcon, Check, Building2, User, Mail, Phone, Shield, FileText, X, Printer, Download, Sparkles, CreditCard, MessageSquare } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { getSheetData, appendSheetData } from '../lib/api';
import { DriveService } from '../lib/driveService';
import { CameraModal } from '../components/CameraModal';

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
        return new Date(p2, p1 - 1, p0);
      }
    }
  }

  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d;
  return null;
}

const generateGuestRegPdfFile = (
  lghId: string,
  guestName: string,
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
  doc.text("Full Name:", 20, 60);
  doc.setFont("Helvetica", "normal");
  doc.text(guestName || "-", 60, 60);

  doc.setFont("Helvetica", "bold");
  doc.text("ID / Passport Number:", 20, 66);
  doc.setFont("Helvetica", "normal");
  doc.text(idNo || "Loaded Existing", 60, 66);

  doc.setFont("Helvetica", "bold");
  doc.text("WhatsApp / Phone:", 20, 72);
  doc.setFont("Helvetica", "normal");
  doc.text(phone || "-", 60, 72);

  doc.setFont("Helvetica", "bold");
  doc.text("Email Address:", 20, 78);
  doc.setFont("Helvetica", "normal");
  doc.text(email || "-", 60, 78);

  // Stay Details Segment
  doc.setFont("Helvetica", "bold");
  doc.text("STAY PERIOD DETAILS", 20, 88);
  doc.line(20, 90, 190, 90);

  doc.setFont("Helvetica", "bold");
  doc.text("Stay Period:", 20, 96);
  doc.setFont("Helvetica", "normal");
  doc.text(`[${checkIn}] to [${checkOut}]`, 60, 96);

  doc.setFont("Helvetica", "bold");
  doc.text("Stay Type:", 20, 102);
  doc.setFont("Helvetica", "normal");
  doc.text(stayType || "-", 60, 102);

  doc.setFont("Helvetica", "bold");
  doc.text("Room Number:", 20, 108);
  doc.setFont("Helvetica", "normal");
  doc.text(roomNum ? `Room ${roomNum}` : "-", 60, 108);

  doc.setFont("Helvetica", "bold");
  doc.text("Duration:", 20, 114);
  doc.setFont("Helvetica", "normal");
  const stayLabel = stayType === 'Daily' ? 'Days' : stayType === 'Weekly' ? 'Weeks' : 'Month';
  doc.text(`${dur} ${stayLabel}`, 60, 114);

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
  doc.text("Tanda Tangan Tamu,", rightAlignX, signatureY, { align: 'center' });

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
  const [newContactId] = useState(() => `Contact-${Math.floor(1000 + Math.random() * 9000)}`);

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
  const [guestType, setGuestType] = useState<'Repeater' | 'New Guest'>('New Guest');
  
  // Repeater States
  const [selectedRepeaterId, setSelectedRepeaterId] = useState<string>('');

  // New Guest States
  const [namaTamu, setNamaTamu] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [noId, setNoId] = useState('');
  const [photoIdFile, setPhotoIdFile] = useState<File | null>(null);

  // Financial States
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
        const [lovissaRes, contactRes] = await Promise.all([
          getSheetData('Lovissa Guest House!A1:Z1000').catch(() => null),
          getSheetData('Contact!A1:Z1000').catch(() => null)
        ]);

        // 1. Process existing Lovissa Guest house transactions
        if (lovissaRes?.values?.length > 1) {
          const headers = lovissaRes.values[0] as string[];
          const checkInIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'CHECK IN' || h?.trim().toUpperCase() === 'CHECK-IN' || h?.trim().toUpperCase() === 'CHECKIN');
          const checkOutIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'CHECK OUT' || h?.trim().toUpperCase() === 'CHECK-OUT' || h?.trim().toUpperCase() === 'CHECKOUT');
          const roomIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ROOM' || h?.trim().toUpperCase() === 'KAMAR');

          const processed = lovissaRes.values.slice(1).map((row) => ({
            room: roomIdx > -1 ? row[roomIdx] : '',
            checkIn: checkInIdx > -1 ? row[checkInIdx] : '',
            checkOut: checkOutIdx > -1 ? row[checkOutIdx] : ''
          }));
          setExistingTransactions(processed);
        }

        // 2. Process Contact sheet for Repeater guests
        if (contactRes?.values?.length > 1) {
          const cHeaders = contactRes.values[0] as string[];
          const idIdx = cHeaders.findIndex(h => h?.trim().toUpperCase() === 'ID' || h?.trim().toUpperCase() === 'CONTACT ID');
          const nameIdx = cHeaders.findIndex(h => h?.trim().toUpperCase() === 'NAME');
          const usecaseIdx = cHeaders.findIndex(h => h?.trim().toUpperCase() === 'USECASE');
          const unitIdx = cHeaders.findIndex(h => h?.trim().toUpperCase() === 'UNIT' || h?.trim().toUpperCase() === 'UNIT ID');
          const emailIdx = cHeaders.findIndex(h => h?.trim().toUpperCase() === 'EMAIL');
          const phoneIdx = cHeaders.findIndex(h => h?.trim().toUpperCase() === 'PHONE' || h?.trim().toUpperCase() === 'TELEPON' || h?.trim().toUpperCase() === 'NO HP');

          const fetched = contactRes.values.slice(1).map((row, i) => {
            const id = idIdx > -1 ? row[idIdx]?.trim() : `contact-${i}`;
            const name = nameIdx > -1 ? row[nameIdx]?.trim() : '';
            const usecase = usecaseIdx > -1 ? row[usecaseIdx]?.trim() : '';
            const unit = unitIdx > -1 ? row[unitIdx]?.trim() : '';
            const em = emailIdx > -1 ? row[emailIdx]?.trim() : '';
            const ph = phoneIdx > -1 ? row[phoneIdx]?.trim() : '';

            return { id, name, usecase, unit, email: em, phone: ph };
          }).filter(c => c.name && c.usecase?.toUpperCase() === 'GUEST' && c.unit?.toUpperCase() === 'UNT19');

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
    const targetTime = targetDate.getTime();

    return existingTransactions.some(t => {
      if (!t.room) return false;
      const tRoomNum = parseInt(t.room.toString().replace(/\D/g, ''), 10);
      if (isNaN(tRoomNum) || tRoomNum !== roomNum) return false;

      const start = parseDate(t.checkIn);
      const end = parseDate(t.checkOut);
      if (!start || !end) return false;

      const startTime = new Date(start).setHours(0, 0, 0, 0);
      const endTime = new Date(end).setHours(23, 59, 59, 999);
      return targetTime >= startTime && targetTime <= endTime;
    });
  };

  // Find info about Repeater Guest if selected
  const activeRepeaterInfo = contactList.find(c => c.id === selectedRepeaterId);

  // Name / Guest details to write
  const activeGuestNameStr = guestType === 'Repeater' 
    ? (activeRepeaterInfo?.name || '') 
    : namaTamu;

  const activeGuestEmailStr = guestType === 'Repeater'
    ? (activeRepeaterInfo?.email || '')
    : email;

  const activeGuestPhoneStr = guestType === 'Repeater'
    ? (activeRepeaterInfo?.phone || '')
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

  // Handle Main Form Submission
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRoom) {
      alert('Silakan pilih nomor Kamar (Room) terlebih dahulu!');
      return;
    }

    if (guestType === 'Repeater' && !selectedRepeaterId) {
      alert('Silakan pilih salah satu data tamu Repeater!');
      return;
    }

    if ((payment === 'Transfer' || payment === 'Qris') && !buktiTransferFile) {
      alert(`Silakan lampirkan Bukti ${payment === 'Qris' ? 'Pembayaran QRIS' : 'Transfer'} terlebih dahulu!`);
      return;
    }

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
      const resolvedContactId = guestType === 'Repeater' ? selectedRepeaterId : newContactId;

      // 2. Fetch Contact Table Headers to append Contact row dynamically
      const contactSheetRes = await getSheetData('Contact!A1:Z1').catch(() => null);
      if (guestType === 'New Guest') {
        let contactHeaders = ['ID', 'Type', 'Usecase', 'Unit', 'Name', 'Email', 'Phone', 'No.ID', 'Photo ID', 'Sign'];
        if (contactSheetRes?.values?.length > 0) {
          contactHeaders = contactSheetRes.values[0] as string[];
        }

        const newContactRow = new Array(contactHeaders.length).fill('');
        const setContactCol = (headerName: string, value: any) => {
          const normName = headerName.trim().toUpperCase().replace(/[\s._-]+/g, '');
          const idx = contactHeaders.findIndex(h => {
            if (!h) return false;
            const normH = h.trim().toUpperCase().replace(/[\s._-]+/g, '');
            
            // Exact match
            if (normH === normName) return true;
            
            // Specific mappings for potential variants
            if (normName === 'ID' && (normH === 'ID' || normH === 'CONTACTID' || normH === 'IDCONTACT')) {
              return true;
            }
            if (normName === 'NAME' && (normH === 'NAME' || normH === 'NAMA' || normH === 'NAMALENGKAP')) {
              return true;
            }
            if (normName === 'PHONE' && (normH === 'PHONE' || normH === 'TELEPON' || normH === 'NOHP' || normH === 'NO.HP' || normH === 'NO_HP')) {
              return true;
            }
            if (normName === 'NOID' && (normH === 'NOID' || normH === 'NO.ID' || normH === 'NO_ID' || normH === 'IDENTITYNO' || normH === 'KTP')) {
              return true;
            }
            if (normName === 'PHOTOID' && (normH === 'PHOTOID' || normH === 'PHOTO ID' || normH === 'FOTOID' || normH === 'FOTOKTP' || normH === 'KTPPHOTO')) {
              return true;
            }
            if (normName === 'SIGN' && (normH === 'SIGN' || normH === 'TANDATANGAN' || normH === 'SIGNATURE')) {
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
            newContactRow[idx] = value;
          }
        };

        setContactCol('ID', resolvedContactId);
        setContactCol('Type', 'Client');
        setContactCol('Usecase', 'Guest');
        setContactCol('Unit', 'UNT19');
        setContactCol('Name', namaTamu);
        setContactCol('Email', email);
        setContactCol('Phone', phone);
        setContactCol('No.ID', noId);
        setContactCol('Photo ID', photoIdUrl);
        setContactCol('Sign', signatureUrl);

        await appendSheetData('Contact!A1:Z', [newContactRow]);
      } else {
        // If Repeater, upload signature to match sign url if drew
        if (signatureUrl) {
          console.log('Repeater signature generated:', signatureUrl);
        }
      }

      // 3. Fetch Lovissa Guest House headers to append Transaction row dynamically
      const lovissaSheetRes = await getSheetData('Lovissa Guest House!A1:Z1').catch(() => null);
      let lovissaHeaders = ['ID', 'Type', 'Check In', 'Dur', 'Check out', 'Room', 'Name', 'Price', 'Amount', 'Payment', 'Bukti Transfer'];
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
          if (normName === 'NAME' && (normH === 'NAME' || normH === 'NAMA' || normH === 'CONTACTID')) {
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
      setLovissaCol('Room', `Room ${selectedRoom}`);
      setLovissaCol('Name', resolvedContactId);
      setLovissaCol('Price', Number(price || 0));
      setLovissaCol('Amount', calculatedAmount);
      setLovissaCol('Payment', payment);
      setLovissaCol('Bukti Transfer', buktiTransferUrl);
      setLovissaCol('Keterangan', keterangan);
      setLovissaCol('Guest Reg', guestRegPdfUrl);

      await appendSheetData('Lovissa Guest House!A1:Z', [newLovissaRow]);

      alert('Data Registrasi Lovissa Guest House berhasil dikirim!');
      navigate(-1);
    } catch (err: any) {
      console.error(err);
      alert('Gagal mengirim data form: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
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

            {/* Check In Date & Duration */}
            <div className="grid grid-cols-2 gap-3">
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

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                  Durasi ({type === 'Daily' ? 'Days' : type === 'Weekly' ? 'Weeks' : 'Month'}) <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  value={duration}
                  onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans"
                />
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

                  return (
                    <button
                      key={roomNum}
                      type="button"
                      disabled={isOccupied}
                      onClick={() => setSelectedRoom(roomNum)}
                      className={`aspect-square rounded-xl border font-mono text-xs font-extrabold flex flex-col items-center justify-center p-1 transition-all duration-150 ${
                        isOccupied 
                          ? 'bg-gray-100 text-gray-400 border-gray-200 line-through cursor-not-allowed'
                          : isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10 scale-102 font-bold cursor-pointer'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-500 cursor-pointer hover:bg-indigo-50/20'
                      }`}
                    >
                      <span>{roomNum}</span>
                      <span className="text-[8px] scale-90 mt-0.5 font-sans font-normal uppercase">
                        {isOccupied ? 'Okp' : 'Vac'}
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
                {(['New Guest', 'Repeater'] as const).map((gt) => (
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

            {/* REPEATER SELECT FLOW */}
            {guestType === 'Repeater' && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                  Select Guest <span className="text-red-500">*</span>
                </label>
                {contactList.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg font-bold">
                    Tidak ditemukan data tamu contact yang sesuai (Guest di Unit UNT19).
                  </p>
                ) : (
                  <select
                    value={selectedRepeaterId}
                    onChange={(e) => setSelectedRepeaterId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans cursor-pointer"
                  >
                    <option value="">-- Pilih Tamu Repeater --</option>
                    {contactList.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.name} ({contact.phone || contact.email || contact.id})
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
              <FileText className="w-3.5 h-3.5 text-indigo-500" /> Tanda Tangan Tamu
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
                if (guestType === 'New Guest' && !namaTamu) {
                  alert('Mohon isi nama lengkap tamu di Data Tamu!');
                  return;
                }
                setShowRegModal(true);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 border border-indigo-200 hover:border-indigo-300 bg-indigo-50 text-indigo-900 rounded-xl py-3.5 text-xs font-bold cursor-pointer transition-all hover:bg-indigo-100/50"
            >
              <FileText className="w-4 h-4 text-indigo-700" />
              Surat Regis Tamu
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
      {showRegModal && (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
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
            <div className="flex-1 overflow-y-auto p-6" id="printable-area">
              <div className="max-w-md mx-auto bg-white border border-gray-200 p-6 rounded-lg text-left shadow-inner text-zinc-800 font-sans text-xs space-y-4">
                
                {/* Title */}
                <div className="text-center pb-2 border-b border-gray-100">
                  <h2 className="text-base font-black tracking-tight text-gray-900 uppercase">GUEST REGISTRATION</h2>
                  <p className="text-[10px] font-bold text-gray-500">No. {lghId}</p>
                  <p className="text-[11px] font-extrabold text-indigo-900 mt-0.5">Lovissa Guesthouse - Bali</p>
                </div>

                {/* Subtitle intro */}
                <p className="text-[10px] text-gray-500 leading-relaxed text-justify">
                  Welcome to Lovissa Guesthouse. To ensure a comfortable and enjoyable stay for all guests, we kindly ask you to review and agree to the following terms and conditions.
                </p>

                {/* GUEST DETAILS */}
                <div className="space-y-2 pt-1">
                  <h4 className="font-extrabold text-gray-900 border-b border-gray-100 pb-0.5 text-[10px] uppercase tracking-wider">GUEST DETAILS</h4>
                  <div className="grid grid-cols-2 gap-y-1.5 text-[11px]">
                    <div><span className="text-gray-400 font-medium select-none">Full Name:</span> <p className="font-bold text-gray-950 inline">{activeGuestNameStr || '-'}</p></div>
                    <div><span className="text-gray-400 font-medium select-none">ID / Passport Number:</span> <p className="font-mono font-bold text-gray-805 inline">{noId || 'Loaded Existing'}</p></div>
                    <div>
                      <span className="text-gray-400 font-medium select-none">WhatsApp / Phone:</span> <p className="font-bold text-zinc-900 inline">{activeGuestPhoneStr || '-'}</p>
                    </div>
                    <div><span className="text-gray-400 font-medium select-none">Email:</span> <p className="font-bold text-zinc-900 inline">{activeGuestEmailStr || '-'}</p></div>
                  </div>
                </div>

                {/* STAY INFORMATION */}
                <div className="space-y-2">
                  <h4 className="font-extrabold text-gray-900 border-b border-gray-100 pb-0.5 text-[10px] uppercase tracking-wider">STAY PERIOD DETAILS</h4>
                  <div className="grid grid-cols-2 gap-y-1.5 text-[11px]">
                    <div><span className="text-gray-400 font-medium select-none">Stay Period:</span> <p className="font-bold text-gray-950 inline">[{formattedCheckInStr}] to [{checkOutStr}]</p></div>
                    <div><span className="text-gray-400 font-medium select-none">Stay Type:</span> <p className="font-bold text-indigo-900 inline">{type}</p></div>
                    <div><span className="text-gray-400 font-medium select-none">Room Number:</span> <p className="font-bold text-indigo-600 inline">Room {selectedRoom || '-'}</p></div>
                    <div>
                      <span className="text-gray-400 font-medium select-none">Duration:</span> <p className="font-bold text-gray-950 inline">{duration} {type === 'Daily' ? 'Days' : type === 'Weekly' ? 'Weeks' : 'Month'}</p>
                    </div>
                  </div>
                </div>

                {/* PAYMENT SECTION */}
                <div className="bg-zinc-50 border border-zinc-100 p-2.5 rounded-xl">
                  <p className="text-[11px] font-black text-emerald-900 flex justify-between">
                    <span>PAYMENT BY {payment.toUpperCase()}:</span>
                    <span>Rp {Number(price || 0).toLocaleString('id-ID')} X {duration} = Rp {calculatedAmount.toLocaleString('id-ID')}</span>
                  </p>
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
                <div className="flex flex-col items-end pt-4">
                  <div className="w-[150px] text-center space-y-2">
                    <p className="text-[10px] text-gray-400 select-none">Tanda Tangan Tamu,</p>
                    
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
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl py-3 text-xs font-bold cursor-pointer transition-all"
              >
                <Printer className="w-4 h-4" />
                Cetak / Download PDF
              </button>
              <button
                type="button"
                onClick={() => setShowRegModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-xl py-3 text-xs font-bold cursor-pointer transition-all bg-white"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
