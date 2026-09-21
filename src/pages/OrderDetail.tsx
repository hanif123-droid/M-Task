import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  Building, 
  User as UserIcon, 
  FileText, 
  CreditCard, 
  Camera, 
  Upload, 
  Send, 
  MessageSquare, 
  Clock, 
  Lock, 
  Unlock, 
  CheckCircle,
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  X,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatImageUrl } from '../lib/utils';
import { getSheetData, updateSheetData } from '../lib/api';
import { logActivity } from '../lib/activityLogger';
import { DriveService } from '../lib/driveService';
import { NotaMediaViewer } from '../components/NotaMediaViewer';

function formatIDR(amount: number | string) {
  if (amount === undefined || amount === null) return 'Rp 0';
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]/g, '')) || 0 : amount;
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
}

const COL_MAPPINGS = {
  id: ['Order ID', 'ID', 'ORDER_ID'],
  roNumber: ['RO_Number', 'RO_NUMBER', 'RO NUMBER', 'RO NO', 'RO'],
  orderDetail: ['Order Detail', 'ORDER DETAIL', 'DETAIL', 'ORDER NAME', 'ORDER_DETAIL'],
  unitBusiness: ['Unit Business', 'UNIT BUSINESS', 'UNIT ID', 'UNIT', 'UNIT_BUSINESS'],
  amount: ['Amount', 'AMOUNT', 'TOTAL', 'NILAI'],
  reviewTier: ['Review Tier', 'REVIEW TIER', 'TIER'],
  orderStatus: ['Status', 'STATUS', 'STATUS PESANAN'],
  emailUser: ['Email User', 'EMAIL USER', 'EMAIL', 'USER'],
  date: ['Date', 'DATE', 'TANGGAL', 'TIMESTAMP'],
  projectId: ['Project_id', 'PROJECT_ID', 'PROJECT ID', 'PROJECT', 'ID PROJECT'],
  taskId: ['Task_id', 'TASK_ID', 'TASK ID', 'TASK', 'ID TASK'],
  orderType: ['Order Type', 'ORDER TYPE', 'TYPE', 'UNTUK PEMBAYARAN'],
  contactId: ['Contact_ID', 'CONTACT_ID', 'CONTACT ID', 'CONTACT', 'NAMA'],
  via: ['Via', 'VIA', 'DENGAN CARA'],
  viaNama: ['via_nama', 'VIA_NAMA', 'VIA NAMA', 'BANK', 'PENERIMA', 'VIA_RECEIVER'],
  rekNo: ['Rek No', 'REK NO', 'REK_NO', 'REKENING', 'NOMOR REKENING'],
  an: ['A n', 'A N', 'A_N', 'ATAS NAMA'],
  berita: ['Berita', 'BERITA', 'BERITA ACARA', 'BERITA_ACARA'],
  qris: ['Qris', 'QRIS'],
  ewallet: ['Ewallet', 'EWALLET', 'E-WALLET'],
  virtual: ['Virtual', 'VIRTUAL', 'VIRTUAL_AKUN', 'VIRTUAL AKUN'],
  notaBelanja: ['Nota Belanja', 'NOTA_BELANJA', 'NOTA', 'NOTA BELANJA', 'BUKTI_NOTA'],
  tier1Review: ['Tier 1 Review', 'TIER 1 REVIEW', 'TIER 1', 'ADMIN', 'ADMIN_REVIEW'],
  dateTier1: ['Date Tier 1', 'DATE TIER 1', 'DATE_TIER_1', 'DATE TIER1'],
  tier2Review: ['Tier 2 Review', 'TIER 2 REVIEW', 'TIER 2', 'BOARD', 'BOARD_REVIEW'],
  dateTier2: ['Date Tier 2', 'DATE TIER 2', 'DATE_TIER_2', 'DATE TIER2'],
  tier3Review: ['Tier 3 Review', 'TIER 3 REVIEW', 'TIER 3', 'BOSS', 'BOSS_REVIEW'],
  dateTier3: ['Date Tier 3', 'DATE TIER 3', 'DATE_TIER_3', 'DATE TIER3'],
  buktiTransfer: ['Bukti Transfer', 'BUKTI_TRANSFER', 'BUKTI_BAYAR', 'BUKTI'],
  catatan: ['Catatan', 'CATATAN', 'NOTE', 'MEMO', 'KETERANGAN'],
  read: ['Read', 'READ', 'STATUS BACA'],
  kantong: ['Kantong', 'KANTONG', 'KANTONG BANK', 'BANK_KANTONG', 'BANK KANTONG'],
};

function findIndexForField(headers: string[], fieldKeys: string[]): number {
  return headers.findIndex(h => {
    const norm = h?.trim().toUpperCase() || '';
    return fieldKeys.some(fk => 
      norm === fk.toUpperCase() || 
      norm.replace(/[^A-Z0-9]/g, '') === fk.replace(/[^A-Z0-9]/g, '').toUpperCase()
    );
  });
}

function colLetter(index: number) {
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

function calculateReviewTier(t1: string, t2: string, t3: string): string {
  const v1 = (t1 || '').trim();
  const v2 = (t2 || '').trim();
  const v3 = (t3 || '').trim();

  const norm1 = v1.toLowerCase();
  const norm2 = v2.toLowerCase();
  const norm3 = v3.toLowerCase();

  const isApproved = (v: string) => v === 'aprove' || v === 'approve';

  if (norm1 === 'pending' || norm2 === 'pending' || norm3 === 'pending') {
    return 'PENDING';
  }
  if (norm1 === 'decline' || norm2 === 'decline' || norm3 === 'decline') {
    return 'DECLINE';
  }

  if (!v1 && !v2 && !v3) {
    return 'Admin Check';
  }
  if (isApproved(norm1) && !v2 && !v3) {
    return 'Admin Approve';
  }
  if (isApproved(norm1) && isApproved(norm2) && !v3) {
    return 'Board Approve';
  }
  if (isApproved(norm1) && isApproved(norm2) && isApproved(norm3)) {
    return 'DISBURSED';
  }

  return 'Admin Check';
}

function parseCatatan(text: string) {
  if (!text) return [];
  return text.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed) return null;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx > -1) {
      const sender = trimmed.substring(0, colonIdx).trim();
      const message = trimmed.substring(colonIdx + 1).trim();
      return { sender, message, raw: trimmed };
    }
    return { sender: 'System', message: trimmed, raw: trimmed };
  }).filter(Boolean) as { sender: string; message: string; raw: string }[];
}

function formatDateToMMDDYYYY(dateStr: string) {
  if (!dateStr || dateStr === '-') return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  } catch (e) {
    return dateStr;
  }
}

export function OrderDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const currentUserEmail = localStorage.getItem('mtask_user_email') || '';

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveTarget, setSaveTarget] = useState<string | null>(null);
  
  const [sheetName, setSheetName] = useState('Order Budget');
  const [headers, setHeaders] = useState<string[]>([]);
  const [currentRow, setCurrentRow] = useState<any[]>([]);
  const [rowIndex, setRowIndex] = useState<number>(-1);

  // Mapped Data state
  const [orderId, setOrderId] = useState('');
  const [roNumber, setRoNumber] = useState('');
  const [orderDetail, setOrderDetail] = useState('');
  const [unitBusinessId, setUnitBusinessId] = useState('');
  const [amount, setAmount] = useState('');
  const [reviewTier, setReviewTier] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [readStatus, setReadStatus] = useState('');
  const [emailUser, setEmailUser] = useState('');
  const [date, setDate] = useState('');
  const [projectId, setProjectId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [orderType, setOrderType] = useState('');
  const [contactId, setContactId] = useState('');
  const [via, setVia] = useState('');
  const [viaNama, setViaNama] = useState('');
  const [rekNo, setRekNo] = useState('');
  const [an, setAn] = useState('');
  const [berita, setBerita] = useState('');
  const [qris, setQris] = useState('');
  const [ewallet, setEwallet] = useState('');
  const [virtual, setVirtual] = useState('');
  const [notaBelanja, setNotaBelanja] = useState('');
  
  // Tiers Reviews
  const [tier1Review, setTier1Review] = useState('');
  const [dateTier1, setDateTier1] = useState('');
  const [tier2Review, setTier2Review] = useState('');
  const [dateTier2, setDateTier2] = useState('');
  const [tier3Review, setTier3Review] = useState('');
  const [dateTier3, setDateTier3] = useState('');
  
  // Bukti and notes
  const [buktiTransfer, setBuktiTransfer] = useState('');
  const [catatan, setCatatan] = useState('');
  const [kantong, setKantong] = useState('');
  
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [imgScale, setImgScale] = useState(1);

  useEffect(() => {
    if (!zoomedImage) {
      setImgScale(1);
    }
  }, [zoomedImage]);

  // Auxiliary data dictionaries
  const [unitMap, setUnitMap] = useState<Map<string, { name: string; logo: string }>>(new Map());
  const [userMap, setUserMap] = useState<Map<string, { name: string; photo: string }>>(new Map());
  const [projectMap, setProjectMap] = useState<Map<string, string>>(new Map());
  const [taskMap, setTaskMap] = useState<Map<string, string>>(new Map());
  const [contactMap, setContactMap] = useState<Map<string, string>>(new Map());

  // Input states for writing
  const [roNumInput, setRoNumInput] = useState('');
  const [isEditingRo, setIsEditingRo] = useState(false);

  // Chat/Catatan states
  const [selectedRole, setSelectedRole] = useState<'Admin' | 'Board' | 'Boss' | 'User'>('Admin');
  const [newChatText, setNewChatText] = useState('');
  const [isDoneClicked, setIsDoneClicked] = useState(false);

  // Camera & File upload targets
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all necessary data
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);

        // Fetch Order Budget (try space fallback)
        let orderRes = await getSheetData('Order Budget!A1:Z2000').catch(() => null);
        let resolvedName = 'Order Budget';
        if (!orderRes) {
          orderRes = await getSheetData('OrderBudget!A1:Z2000').catch(() => null);
          resolvedName = 'OrderBudget';
        }
        setSheetName(resolvedName);

        // Fetch other reference data
        const [unitRes, userRes, projectRes, taskRes, contactRes] = await Promise.all([
          getSheetData('Unit!A1:Z500').catch(() => null),
          getSheetData('User!A1:Z500').catch(() => null),
          getSheetData('Project!A1:Z1000').catch(() => null),
          getSheetData('Task!A1:Z2000').catch(() => null),
          getSheetData('Contact!A1:Z500').catch(() => null)
        ]);

        // 1. Process Unit Map
        const units = new Map<string, { name: string; logo: string }>();
        if (unitRes?.values?.length > 0) {
          const uH = unitRes.values[0] as string[];
          const idIdx = uH.findIndex(h => h?.trim().toUpperCase() === 'ID' || h?.trim().toUpperCase() === 'UNIT ID');
          const nameIdx = uH.findIndex(h => h?.trim().toUpperCase() === 'UNIT NAME');
          const logoIdx = uH.findIndex(h => h?.trim().toUpperCase() === 'IMAGE' || h?.trim().toUpperCase() === 'LOGO' || h?.trim().toUpperCase() === 'AVATAR');
          if (idIdx > -1) {
            unitRes.values.slice(1).forEach((row: any[]) => {
              const uId = row[idIdx]?.trim();
              if (uId) {
                units.set(uId, {
                  name: nameIdx > -1 ? (row[nameIdx] || uId) : uId,
                  logo: logoIdx > -1 ? (row[logoIdx] || '') : ''
                });
              }
            });
          }
        }
        setUnitMap(units);

        // 2. Process User Map
        const users = new Map<string, { name: string; photo: string }>();
        if (userRes?.values?.length > 0) {
          const uH = userRes.values[0] as string[];
          const emailIdx = uH.findIndex(h => h?.trim().toUpperCase() === 'EMAIL');
          const nameIdx = uH.findIndex(h => h?.trim().toUpperCase() === 'NAME' || h?.trim().toUpperCase() === 'FULL NAME');
          const photoIdx = uH.findIndex(h => h?.trim().toUpperCase() === 'PHOTO' || h?.trim().toUpperCase() === 'AVATAR');
          if (emailIdx > -1) {
            userRes.values.slice(1).forEach((row: any[]) => {
              const email = row[emailIdx]?.trim();
              if (email) {
                users.set(email, {
                  name: nameIdx > -1 ? (row[nameIdx] || email) : email,
                  photo: photoIdx > -1 ? (row[photoIdx] || '') : ''
                });
              }
            });
          }
        }
        setUserMap(users);

        // 3. Process Project Map
        const projects = new Map<string, string>();
        if (projectRes?.values?.length > 0) {
          const pH = projectRes.values[0] as string[];
          const idIdx = pH.findIndex(h => h?.trim().toUpperCase() === 'PROJECT ID' || h?.trim().toUpperCase() === 'ID');
          const nameIdx = pH.findIndex(h => h?.trim().toUpperCase() === 'PROJECT NAME' || h?.trim().toUpperCase() === 'PROJECT TITLE' || h?.trim().toUpperCase() === 'TITLE');
          if (idIdx > -1) {
            projectRes.values.slice(1).forEach((row: any[]) => {
              const pId = row[idIdx]?.trim();
              if (pId) {
                projects.set(pId, nameIdx > -1 ? (row[nameIdx] || pId) : pId);
              }
            });
          }
        }
        setProjectMap(projects);

        // 4. Process Task Map
        const tasks = new Map<string, string>();
        if (taskRes?.values?.length > 0) {
          const tH = taskRes.values[0] as string[];
          const idIdx = tH.findIndex(h => h?.trim().toUpperCase() === 'TASK ID' || h?.trim().toUpperCase() === 'ID' || h?.trim().toUpperCase() === 'TASK_ID');
          const nameIdx = tH.findIndex(h => h?.trim().toUpperCase() === 'TASK TITLE' || h?.trim().toUpperCase() === 'TASK NAME' || h?.trim().toUpperCase() === 'TASK_TITLE');
          if (idIdx > -1) {
            taskRes.values.slice(1).forEach((row: any[]) => {
              const tId = row[idIdx]?.trim();
              if (tId) {
                tasks.set(tId, nameIdx > -1 ? (row[nameIdx] || tId) : tId);
              }
            });
          }
        }
        setTaskMap(tasks);

        // 5. Process Contact Map
        const contacts = new Map<string, string>();
        if (contactRes?.values?.length > 0) {
          const cH = contactRes.values[0] as string[];
          const idIdx = cH.findIndex(h => h?.trim().toUpperCase() === 'ID' || h?.trim().toUpperCase() === 'CONTACT ID');
          const nameIdx = cH.findIndex(h => h?.trim().toUpperCase() === 'NAME' || h?.trim().toUpperCase() === 'CONTACT NAME');
          if (idIdx > -1) {
            contactRes.values.slice(1).forEach((row: any[]) => {
              const cId = row[idIdx]?.trim();
              if (cId) {
                contacts.set(cId, nameIdx > -1 ? (row[nameIdx] || cId) : cId);
              }
            });
          }
        }
        setContactMap(contacts);

        // 6. Process Order Budget records
        if (orderRes?.values?.length > 0) {
          const orderHeaders = orderRes.values[0] as string[];
          setHeaders(orderHeaders);

          const idIdx = findIndexForField(orderHeaders, COL_MAPPINGS.id);
          const roIdx = findIndexForField(orderHeaders, COL_MAPPINGS.roNumber);
          const rawRows = orderRes.values.slice(1);

          let foundIdx = -1;
          let foundRow: any[] = [];
          const cleanId = id?.trim().toLowerCase() || '';

          if (idIdx > -1) {
            foundIdx = rawRows.findIndex(r => {
              const rowId = (r[idIdx] || '').trim().toLowerCase();
              const rowRo = roIdx > -1 ? (r[roIdx] || '').trim().toLowerCase() : '';
              return rowId === cleanId ||
                     rowId.replace(/[^a-z0-9]/g, '') === cleanId.replace(/[^a-z0-9]/g, '') ||
                     (rowRo && (rowRo === cleanId || rowRo.replace(/[^a-z0-9]/g, '') === cleanId.replace(/[^a-z0-9]/g, '')));
            });
          }

          if (foundIdx > -1) {
            foundRow = rawRows[foundIdx];
            setCurrentRow(foundRow);
            // row index in sheets is i + 2
            setRowIndex(foundIdx + 2);

            // Mapping state fields
            const getValue = (keys: string[]) => {
              const colIdx = findIndexForField(orderHeaders, keys);
              return colIdx > -1 ? (foundRow[colIdx] || '') : '';
            };

            setOrderId(getValue(COL_MAPPINGS.id));
            
            const rawRo = getValue(COL_MAPPINGS.roNumber);
            setRoNumber(rawRo);
            setRoNumInput(rawRo);

            setOrderDetail(getValue(COL_MAPPINGS.orderDetail));
            setUnitBusinessId(getValue(COL_MAPPINGS.unitBusiness));
            setAmount(getValue(COL_MAPPINGS.amount));
            setReviewTier(getValue(COL_MAPPINGS.reviewTier));
            setOrderStatus(getValue(COL_MAPPINGS.orderStatus));
            setReadStatus(getValue(COL_MAPPINGS.read));
            setEmailUser(getValue(COL_MAPPINGS.emailUser));
            setDate(getValue(COL_MAPPINGS.date));
            setProjectId(getValue(COL_MAPPINGS.projectId));
            setTaskId(getValue(COL_MAPPINGS.taskId));
            setOrderType(getValue(COL_MAPPINGS.orderType));
            setContactId(getValue(COL_MAPPINGS.contactId));
            setVia(getValue(COL_MAPPINGS.via));
            setViaNama(getValue(COL_MAPPINGS.viaNama));
            setRekNo(getValue(COL_MAPPINGS.rekNo));
            setAn(getValue(COL_MAPPINGS.an));
            setBerita(getValue(COL_MAPPINGS.berita));
            setQris(getValue(COL_MAPPINGS.qris));
            setEwallet(getValue(COL_MAPPINGS.ewallet));
            setVirtual(getValue(COL_MAPPINGS.virtual));
            setNotaBelanja(getValue(COL_MAPPINGS.notaBelanja));
            
            setTier1Review(getValue(COL_MAPPINGS.tier1Review));
            setDateTier1(getValue(COL_MAPPINGS.dateTier1));
            setTier2Review(getValue(COL_MAPPINGS.tier2Review));
            setDateTier2(getValue(COL_MAPPINGS.dateTier2));
            setTier3Review(getValue(COL_MAPPINGS.tier3Review));
            setDateTier3(getValue(COL_MAPPINGS.dateTier3));
            
            setBuktiTransfer(getValue(COL_MAPPINGS.buktiTransfer));
            setCatatan(getValue(COL_MAPPINGS.catatan));
            setKantong(getValue(COL_MAPPINGS.kantong));
            
            const fetchedTier = getValue(COL_MAPPINGS.reviewTier);
            if (fetchedTier === 'Admin Check') setSelectedRole('Admin');
            else if (fetchedTier === 'Admin Approve') setSelectedRole('Board');
            else if (fetchedTier === 'Board Approve') setSelectedRole('Boss');
          } else {
            console.error(`Order with ID ${id} not found in sheet.`);
          }
        }
      } catch (err) {
        console.error('Failed to load OrderDetail data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [id]);

  // Utility to write change to Sheet column and update state
  const writeCell = async (fieldKeys: string[], columnName: string, value: string, targetKey: string) => {
    if (rowIndex === -1) return;
    try {
      setSaveTarget(targetKey);
      setIsSaving(true);

      // Locate column idx or create it dynamically if missing
      const headersCopy = [...headers];
      const colIdx = await getOrAddColIndex(headersCopy, columnName, fieldKeys);
      if (colIdx === -1) {
        throw new Error(`Could not access or append column header index for ${columnName}`);
      }
      setHeaders(headersCopy);

      const cellRange = `${sheetName}!${colLetter(colIdx)}${rowIndex}`;
      await updateSheetData(cellRange, [[value]]);

      // Update local row copies
      const rowCopy = [...currentRow];
      while (rowCopy.length <= colIdx) {
        rowCopy.push('');
      }
      rowCopy[colIdx] = value;
      setCurrentRow(rowCopy);

      console.log(`Saved "${value}" to column "${columnName}" at range ${cellRange}`);
    } catch (err) {
      console.error(`Error saving column ${columnName} with value ${value}:`, err);
      alert(`Gagal menyimpan perubahan ke spreadsheet: ${err}`);
    } finally {
      setIsSaving(false);
      setSaveTarget(null);
    }
  };

  // Locate or create column index
  const getOrAddColIndex = async (headersList: string[], columnName: string, fieldKeys: string[]): Promise<number> => {
    let idx = findIndexForField(headersList, fieldKeys);
    if (idx > -1) return idx;

    // Col missing, write header
    const newColIdx = headersList.length;
    const colLtr = colLetter(newColIdx);
    const headerRange = `${sheetName}!${colLtr}1`;
    try {
      await updateSheetData(headerRange, [[columnName]]);
      headersList.push(columnName);
      return newColIdx;
    } catch (err) {
      console.error(`Failed to dynamically add column header "${columnName}" to sheet:`, err);
      return -1;
    }
  };

  // Handles updating RO Number
  const handleSaveRoNumber = async () => {
    await writeCell(COL_MAPPINGS.roNumber, 'RO_NUMBER', roNumInput, 'roNumber');
    setRoNumber(roNumInput);
    setIsEditingRo(false);
  };

  // Handles updating Kantong
  const handleKantongChange = async (val: string) => {
    setKantong(val);
    await writeCell(COL_MAPPINGS.kantong, 'Kantong', val, 'kantong');
  };

  // Handles approving / updating tiers
  const handleTierUpdate = async (tierIdx: 1 | 2 | 3, value: string) => {
    if (rowIndex === -1) return;
    try {
      setSaveTarget(`tier${tierIdx}`);
      setIsSaving(true);

      const headersList = [...headers];
      const dNow = new Date();
      const nowString = String(dNow.getMonth() + 1).padStart(2, '0') + '/' + String(dNow.getDate()).padStart(2, '0') + '/' + dNow.getFullYear();

      // Prepare target keys
      const tierKeys = tierIdx === 1 ? COL_MAPPINGS.tier1Review : tierIdx === 2 ? COL_MAPPINGS.tier2Review : COL_MAPPINGS.tier3Review;
      const dateKeys = tierIdx === 1 ? COL_MAPPINGS.dateTier1 : tierIdx === 2 ? COL_MAPPINGS.dateTier2 : COL_MAPPINGS.dateTier3;
      const tierHeaderName = `Tier ${tierIdx} Review`;
      const dateHeaderName = `Date Tier ${tierIdx}`;

      // Update tier review
      const tColIdx = await getOrAddColIndex(headersList, tierHeaderName, tierKeys);
      if (tColIdx > -1) {
        await updateSheetData(`${sheetName}!${colLetter(tColIdx)}${rowIndex}`, [[value]]);
      }

      // Update date
      const dColIdx = await getOrAddColIndex(headersList, dateHeaderName, dateKeys);
      if (dColIdx > -1) {
        await updateSheetData(`${sheetName}!${colLetter(dColIdx)}${rowIndex}`, [[nowString]]);
      }

      // Update state immediately
      let newT1 = tier1Review;
      let newT2 = tier2Review;
      let newT3 = tier3Review;

      if (tierIdx === 1) {
        setTier1Review(value);
        setDateTier1(nowString);
        newT1 = value;
      } else if (tierIdx === 2) {
        setTier2Review(value);
        setDateTier2(nowString);
        newT2 = value;
      } else if (tierIdx === 3) {
        setTier3Review(value);
        setDateTier3(nowString);
        newT3 = value;
      }

      // Determine new Overall Review Tier and update sheet too!
      const nextReviewTier = calculateReviewTier(newT1, newT2, newT3);
      setReviewTier(nextReviewTier);
      
      // Log this activity to Supabase
      const roClean = roNumber ? (roNumber.toUpperCase().startsWith('RO') ? roNumber : `RO ${roNumber}`) : 'RO -';
      let formattedNominal = amount || 'Rp.0';
      if (amount) {
        const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]/g, '')) || 0 : amount;
        formattedNominal = `Rp.${num.toLocaleString('id-ID')}`;
      }
      const statusStr = (nextReviewTier || value || '').trim();
      if (statusStr.toLowerCase() !== 'admin check') {
        const approverName = localStorage.getItem("mtask_user_name") || "User";
        const actionVerb = value.toLowerCase() === 'decline' ? 'menolak' : 'menyetujui';
        const logText = `${approverName} ${actionVerb} ${roClean} ${orderDetail} ${formattedNominal} ${statusStr.toLowerCase()}`;
        logActivity('Order Budget', 'Order Detail', logText);
      }

      const rtColIdx = await getOrAddColIndex(headersList, 'Review Tier', COL_MAPPINGS.reviewTier);
      if (rtColIdx > -1) {
        await updateSheetData(`${sheetName}!${colLetter(rtColIdx)}${rowIndex}`, [[nextReviewTier]]);
      }

      setHeaders(headersList);
      
      if (value.toLowerCase() === 'approve') {
        if (!(tierIdx === 3 && reviewTier === 'Board Approve') && tierIdx !== 1) {
          navigate('/orders');
        }
      }
    } catch (err) {
      console.error(`Failed to update Tier ${tierIdx} Approval:`, err);
      alert(`Gagal memperbarui status Approval : ${err}`);
    } finally {
      setIsSaving(false);
      setSaveTarget(null);
    }
  };

  const handleDone = async () => {
    if (rowIndex === -1) return;
    try {
      setSaveTarget('done');
      setIsSaving(true);
      await writeCell(COL_MAPPINGS.read, 'Read', 'FALSE', 'done');
      await writeCell(['Status', 'STATUS', 'STATUS PESANAN'], 'Status', 'Sudah', 'done');
      navigate('/orders');
    } catch (err) {
      console.error('Failed to mark as done:', err);
      alert('Gagal memproses Done.');
    } finally {
      setIsSaving(false);
      setSaveTarget(null);
    }
  };

  // Upload attachment & update Bukti Transfer
  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || rowIndex === -1) return;

    try {
      setSaveTarget('buktiTransfer');
      setIsSaving(true);
      
      const uploadRes = await DriveService.uploadFile(file);
      const url = uploadRes.url;
      
      await writeCell(COL_MAPPINGS.buktiTransfer, 'Bukti Transfer', url, 'buktiTransfer');
      setBuktiTransfer(url);
    } catch (err: any) {
      console.error("Upload proof failed:", err);
      alert(`Gagal mengunggah bukti transfer: ${err.message || err}`);
    } finally {
      setIsSaving(false);
      setSaveTarget(null);
    }
  };

  // Submit chat comment
  const handleSendChat = async () => {
    if (!newChatText.trim()) return;
    
    // Construct new message string
    const newEntry = `${selectedRole.toLowerCase()}: ${newChatText.trim()}`;
    const updatedCatatan = catatan ? `${catatan}\n${newEntry}` : newEntry;

    await writeCell(COL_MAPPINGS.catatan, 'Catatan', updatedCatatan, 'catatan');
    setCatatan(updatedCatatan);
    setNewChatText('');
  };

  // Render spinner & screen during load
  if (isLoading) {
    return (
      <div className="bg-gray-50 min-h-screen relative flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-[#429dbb] animate-spin mb-3" />
        <p className="text-gray-500 font-medium font-sans animate-pulse">Menghubungkan ke Google Sheet...</p>
      </div>
    );
  }

  if (rowIndex === -1) {
    return (
      <div className="pb-24 bg-gray-50 min-h-screen">
        <header className="bg-[#429dbb] text-white px-5 py-4 shadow-md sticky top-0 z-50 w-full flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Detail Order</h1>
        </header>
        <div className="p-8 max-w-md mx-auto text-center mt-12 bg-white rounded-3xl border border-gray-100 shadow-xl flex flex-col items-center">
          <ShieldAlert className="w-16 h-16 text-yellow-500 mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Order Tidak Ditemukan</h2>
          <p className="text-gray-500 text-sm mb-6">Maaf, data order dengan ID "{id}" tidak ditemukan dalam lembar Google Sheet.</p>
          <button 
            onClick={() => navigate('/orders')} 
            className="w-full bg-[#429dbb] text-white font-semibold py-3 rounded-xl hover:bg-opacity-95 transition-all text-sm shadow-md"
          >
            Kembali ke Daftar Order
          </button>
        </div>
      </div>
    );
  }

  // Resolve auxiliary details
  const matchedUnit = unitMap.get(unitBusinessId) || { name: unitBusinessId || 'No Unit', logo: '' };
  const matchedUser = userMap.get(emailUser) || { name: emailUser || 'No User', photo: '' };
  const matchedProject = projectMap.get(projectId) || projectId;
  const matchedTask = taskMap.get(taskId) || taskId;
  const matchedContact = contactMap.get(contactId) || contactId;

  // Resolve computed Review Tier
  const dynamicReviewTier = calculateReviewTier(tier1Review, tier2Review, tier3Review);
  const isBoardApprove = dynamicReviewTier?.toUpperCase() === 'BOARD APPROVE' || reviewTier?.toUpperCase() === 'BOARD APPROVE' || orderStatus?.toUpperCase() === 'BOARD APPROVE';

  // Generate chat messages
  const chatMessages = parseCatatan(catatan);

  // Styling helpers
  const getBadgeStyle = (tier: string) => {
    const t = (tier || '').trim().toUpperCase();
    if (t === 'DISBURSED' || t.includes('APPROVE')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (t === 'PENDING') {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (t === 'DECLINE') {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  return (
    <div className="pb-24 bg-gray-50 min-h-screen relative font-sans">
      {/* Header Panel */}
      <header className="bg-[#429dbb] text-white px-5 py-4 shadow-md sticky top-0 z-50 w-full flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button 
            onClick={() => navigate(-1)} 
            className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-bold tracking-tight truncate drop-shadow-sm">Detail Order</h1>
        </div>

        {/* Global spinner / indicator when writing cells */}
        {isSaving && (
          <div className="bg-white/25 px-2.5 py-1 rounded-full flex items-center gap-1.5 shrink-0 text-white animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-[10px] font-bold">Sinkronisasi...</span>
          </div>
        )}
      </header>
      {/* Main Container */}
      <main className="max-w-2xl mx-auto p-4 space-y-5">

        {/* Card 1: Core Information */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-4"
        >
          {/* Header Row */}
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Order Detail</span>
              <h2 className="text-lg font-bold text-gray-900 leading-tight mt-1 mb-2">{orderDetail || 'No Detail'}</h2>
            </div>
            
            <span className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border shadow-sm",
              getBadgeStyle(dynamicReviewTier)
            )}>
              {dynamicReviewTier}
            </span>
          </div>

          <hr className="border-gray-100" />

          {/* Form RO NUMBER Input Row */}
          <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">RO. NUMBER :</label>
              {!isEditingRo ? (
                <span className="font-mono text-sm font-semibold text-gray-800">{roNumber || '-'}</span>
              ) : (
                <input 
                  type="text" 
                  value={roNumInput} 
                  autoFocus
                  onChange={(e) => setRoNumInput(e.target.value)}
                  className="bg-white text-xs font-mono font-semibold px-2 py-1 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 w-full max-w-[120px]"
                  placeholder="Ketik RO..."
                />
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              {!isEditingRo ? (
                reviewTier === 'Admin Check' && (
                  <button 
                    onClick={() => setIsEditingRo(true)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    Edit RO
                  </button>
                )
              ) : (
                <>
                  <button 
                    onClick={() => {
                      setRoNumInput(roNumber);
                      setIsEditingRo(false);
                    }}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button 
                    disabled={isSaving && saveTarget === 'roNumber'}
                    onClick={handleSaveRoNumber}
                    className="bg-[#429dbb] hover:bg-opacity-95 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    {isSaving && saveTarget === 'roNumber' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      'Simpan'
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Amount / Nilai */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                <span className="text-emerald-600 font-bold text-xs">Rp</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Nilai Amount</span>
                <span className="text-sm font-bold text-emerald-600">{formatIDR(amount)}</span>
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Date</span>
                <span className="text-sm font-semibold text-gray-700">{formatDateToMMDDYYYY(date)}</span>
              </div>
            </div>

            {/* Unit Business */}
            <div className="flex items-center gap-3 bg-[#eff6ff]/30 p-2.5 rounded-2xl border border-blue-50/50">
              <div className="w-10 h-10 rounded-xl border border-blue-100 bg-white overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                {matchedUnit.logo ? (
                  <img src={matchedUnit.logo} alt={matchedUnit.name} className="w-full h-full object-cover" />
                ) : (
                  <Building className="w-5 h-5 text-blue-500" />
                )}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-blue-500/70 block tracking-wider">Unit Business</span>
                <span className="text-xs font-bold text-blue-900 truncate block">{matchedUnit.name}</span>
              </div>
            </div>

            {/* User */}
            <div className="flex items-center gap-3 bg-[#f8fafc] p-2.5 rounded-2xl border border-slate-100">
              <div className="w-10 h-10 rounded-xl border border-slate-200 overflow-hidden shrink-0 shadow-sm bg-white flex items-center justify-center">
                {matchedUser.photo ? (
                  <img src={formatImageUrl(matchedUser.photo)} alt={matchedUser.name} className="w-full h-full object-cover" />
                ) : (
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(matchedUser.name || 'U')}&background=f1f5f9&color=64748b`} alt={matchedUser.name} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">User</span>
                <span className="text-xs font-bold text-slate-800 truncate block">{matchedUser.name}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Project Info (Only display if Project_id is not empty) */}
        {projectId && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-4 bg-[#429dbb] rounded-full" />
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Konteks Proyek</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
                <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Project Name</span>
                <span className="text-xs font-bold text-slate-800 mt-1 block">{matchedProject}</span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
                <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Task Item</span>
                <span className="text-xs font-bold text-slate-800 mt-1 block">{matchedTask}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Card 3: Payment Details */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-4"
        >
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-[#429dbb] rounded-full" />
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Rencana Pembayaran</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-2.5">
              <CreditCard className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Untuk Pembayaran</span>
                <span className="text-xs font-bold text-gray-800">{orderType || '-'}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <UserIcon className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Nama Contact</span>
                <span className="text-xs font-bold text-gray-800">{matchedContact || '-'}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 sm:col-span-2 bg-[#f8fafc] p-3 rounded-2xl border border-slate-100">
              <Clock className="w-4.5 h-4.5 text-blue-500 mt-0.5" />
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-500 block tracking-wider">Dengan Cara / Metode</span>
                <span className="text-xs font-bold text-blue-900 mt-0.5 block">
                  Metode: <strong className="text-blue-700">{via || '-'}</strong> Ke: <strong className="text-blue-700">{viaNama || '-'}</strong>
                </span>
              </div>
            </div>

            {isBoardApprove && (
              <div className="flex flex-col gap-1.5 sm:col-span-2 bg-gradient-to-r from-amber-50 to-orange-50/50 p-3.5 rounded-2xl border border-amber-100 shadow-sm mt-1">
                <label className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Pilih Kantong (Opsional)
                </label>
                <div className="relative">
                  <select
                    value={kantong}
                    onChange={(e) => handleKantongChange(e.target.value)}
                    disabled={isSaving && saveTarget === 'kantong'}
                    className="w-full bg-white text-xs font-semibold text-gray-700 px-3.5 py-2.5 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all shadow-sm disabled:opacity-60 cursor-pointer appearance-none"
                  >
                    <option value="">-- Pilih Kantong --</option>
                    <option value="bank jago">bank jago</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
                {isSaving && saveTarget === 'kantong' && (
                  <span className="text-[10px] text-amber-600 font-medium animate-pulse flex items-center gap-1 mt-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Menyimpan kantong...
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Conditional Transfer Area */}
          {(virtual || ewallet || rekNo || qris || an || berita) ? (
            <div className="bg-[#eff6ff] p-4 rounded-2xl border border-blue-100 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Informasi Akun Rekening</span>
              </div>
              
              <div className="text-xs font-mono font-medium text-blue-900 leading-relaxed bg-white border border-blue-100/75 p-3 rounded-xl shadow-inner flex flex-wrap items-center gap-2">
                {virtual && <span>{virtual}</span>}
                {ewallet && <span>{ewallet}</span>}
                {rekNo && <span>{rekNo}</span>}
                {an && <span>an. <strong>{an}</strong></span>}
                {berita && <span>Berita : <strong>{berita}</strong></span>}
                {qris && (
                  <div className="mt-2 w-full">
                    <a href={qris} target="_blank" rel="noopener noreferrer">
                      <img src={qris} alt="QRIS" className="w-32 h-32 object-cover rounded-xl shadow-sm border border-blue-100 hover:opacity-90 transition-opacity" referrerPolicy="no-referrer" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </motion.div>

        {/* Nota Belanja Card */}
        {(notaBelanja || orderType === 'Reimburse' || orderType === 'Operational') && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-4"
          >
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 bg-[#429dbb] rounded-full" />
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Nota Belanja</h3>
            </div>
            
            <NotaMediaViewer url={notaBelanja} onZoomImage={(img) => setZoomedImage(img)} />
          </motion.div>
        )}

        {/* Card 4: Catatan / Comments section */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-4"
        >
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-[#429dbb] rounded-full" />
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Kolom Catatan</h3>
          </div>

          {/* Chat Stream View */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 min-h-[140px] max-h-[300px] overflow-y-auto space-y-3 shadow-inner">
            {chatMessages.length === 0 ? (
              <div className="h-28 flex flex-col items-center justify-center text-center">
                <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-gray-400 text-xs font-medium">Belum ada catatan atau komentar.</p>
              </div>
            ) : (
              chatMessages.map((msg, i) => {
                const sLower = msg.sender.toLowerCase();
                const isSystem = sLower === 'system';
                
                let themeBg = 'bg-blue-50/50 border-blue-100/50';
                let tagColor = 'bg-blue-100 text-blue-700';

                if (sLower.includes('board')) {
                  themeBg = 'bg-emerald-50/50 border-emerald-100/50';
                  tagColor = 'bg-emerald-100 text-emerald-700';
                } else if (sLower.includes('boss')) {
                  themeBg = 'bg-purple-50/50 border-purple-100/50';
                  tagColor = 'bg-purple-100 text-purple-700';
                } else if (sLower.includes('user')) {
                  themeBg = 'bg-amber-50/50 border-amber-100/50';
                  tagColor = 'bg-amber-100 text-amber-700';
                }

                return (
                  <div key={`msg-${i}`} className={cn("p-2.5 rounded-xl border flex flex-col gap-1 text-xs", themeBg)}>
                    <div className="flex justify-between items-center">
                      <span className={cn("px-2 py-0.5 rounded-md font-extrabold uppercase text-[9px] tracking-wide", tagColor)}>
                        {msg.sender}
                      </span>
                    </div>
                    <p className="text-gray-700 leading-normal font-medium mt-0.5 whitespace-pre-wrap">{msg.message}</p>
                  </div>
                );
              })
            )}
          </div>

          <div className="space-y-3">
            {/* Speaker Selector Roles */}
            <div>
              <span className="text-[10px] uppercase font-extrabold text-gray-400 block tracking-wider mb-2">Tulis Catatan Sebagai</span>
              <div className="flex flex-wrap gap-2">
                {(['Admin', 'Board', 'Boss', 'User'] as const).map((rl) => {
                  if (reviewTier === 'Admin Check' && rl !== 'Admin') return null;
                  if (reviewTier === 'Admin Approve' && rl !== 'Board') return null;
                  if (reviewTier === 'Board Approve' && rl !== 'Boss') return null;
                  return (
                    <button
                      key={rl}
                      type="button"
                      onClick={() => setSelectedRole(rl)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                        selectedRole === rl 
                          ? "bg-slate-800 border-slate-900 text-white" 
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {rl}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message input */}
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newChatText}
                onChange={(e) => setNewChatText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendChat();
                }}
                placeholder="Tulis catatan di sini..."
                className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
              <button 
                disabled={isSaving || !newChatText.trim()}
                onClick={handleSendChat}
                className="w-10 h-10 rounded-2xl bg-[#429dbb] text-white flex items-center justify-center shrink-0 hover:scale-[1.03] active:scale-[0.97] transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isSaving && saveTarget === 'catatan' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Card 5: Approvals & Upload Proof */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-4 relative overflow-hidden"
        >
          {(!roNumber || roNumber.trim() === '') && (
            <div 
              className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] cursor-pointer flex items-center justify-center"
              onClick={() => alert("Silakan isi RO. NUMBER terlebih dahulu sebelum melanjutkan persetujuan.")}
            >
              {/* Overlay hit area that stops propagation */}
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-[#429dbb] rounded-full" />
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Persetujuan & Bukti</h3>
          </div>

          {/* Workflow Steps */}
          <div className="space-y-4">
            
            {/* Admin Block (Step 1) */}
            <div className="border border-gray-100 rounded-2xl p-3.5 bg-[#fcfdfe]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center">1</span>
                  ADMIN :
                </span>
                {dateTier1 && (
                  <span className="text-[9px] font-mono font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {formatDateToMMDDYYYY(dateTier1)}
                  </span>
                )}
              </div>
              {((tier1Review || '').trim() !== '') ? (
                <div className={cn("w-full bg-white border border-slate-200 text-xs font-bold uppercase px-3 py-2.5 rounded-xl", 
                  tier1Review.toLowerCase() === 'approve' ? "text-emerald-600" : tier1Review.toLowerCase() === 'pending' ? "text-amber-500" : "text-rose-500"
                )}>
                  {tier1Review}
                </div>
              ) : (
                <div className="flex gap-2 w-full mt-1">
                  <button
                    disabled={isSaving}
                    onClick={() => handleTierUpdate(1, 'Approve')}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs flex justify-center items-center gap-1 font-bold border transition-all shadow-sm",
                      tier1Review === 'Approve' ? "bg-emerald-600 text-white border-emerald-700" : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50 active:bg-emerald-100"
                    )}
                  >
                    Approve
                  </button>
                  <button
                    disabled={isSaving}
                    onClick={() => handleTierUpdate(1, 'Pending')}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs flex justify-center items-center gap-1 font-bold border transition-all shadow-sm",
                      tier1Review === 'Pending' ? "bg-amber-500 text-white border-amber-600" : "bg-white text-amber-600 border-amber-200 hover:bg-amber-50 active:bg-amber-100"
                    )}
                  >
                    Pending
                  </button>
                  <button
                    disabled={isSaving}
                    onClick={() => handleTierUpdate(1, 'Decline')}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs flex justify-center items-center gap-1 font-bold border transition-all shadow-sm",
                      tier1Review === 'Decline' ? "bg-rose-500 text-white border-rose-600" : "bg-white text-rose-600 border-rose-200 hover:bg-rose-50 active:bg-rose-100"
                    )}
                  >
                    Decline
                  </button>
                </div>
              )}
            </div>

            {/* Board Block (Step 2) - Visible only if Admin approved */}
            {((tier1Review || '').trim().toLowerCase() === 'approve' || (tier1Review || '').trim().toLowerCase() === 'aprove') && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="border border-gray-100 rounded-2xl p-3.5 bg-[#fcfdfe]"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center">2</span>
                    BOARD :
                  </span>
                  {dateTier2 && (
                    <span className="text-[9px] font-mono font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {formatDateToMMDDYYYY(dateTier2)}
                    </span>
                  )}
                </div>
                {((tier2Review || '').trim() !== '' || currentUserEmail.toLowerCase() === 'vonyloselia@gmail.com') ? (
                  <div className={cn("w-full bg-white border border-slate-200 text-xs font-bold uppercase px-3 py-2.5 rounded-xl", 
                    (tier2Review || '').toLowerCase() === 'approve' ? "text-emerald-600" : (tier2Review || '').toLowerCase() === 'pending' ? "text-amber-500" : ((tier2Review || '').trim() === '' ? "text-slate-400" : "text-rose-500")
                  )}>
                    {tier2Review || 'PENDING'}
                  </div>
                ) : (
                  <div className="flex gap-2 w-full mt-1">
                    <button
                      disabled={isSaving}
                      onClick={() => handleTierUpdate(2, 'Approve')}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs flex justify-center items-center gap-1 font-bold border transition-all shadow-sm",
                      tier2Review === 'Approve' ? "bg-emerald-600 text-white border-emerald-700" : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50 active:bg-emerald-100"
                    )}
                  >
                    Approve
                  </button>
                  <button
                    disabled={isSaving}
                    onClick={() => handleTierUpdate(2, 'Pending')}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs flex justify-center items-center gap-1 font-bold border transition-all shadow-sm",
                      tier2Review === 'Pending' ? "bg-amber-500 text-white border-amber-600" : "bg-white text-amber-600 border-amber-200 hover:bg-amber-50 active:bg-amber-100"
                    )}
                  >
                    Pending
                  </button>
                  <button
                    disabled={isSaving}
                    onClick={() => handleTierUpdate(2, 'Decline')}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs flex justify-center items-center gap-1 font-bold border transition-all shadow-sm",
                      tier2Review === 'Decline' ? "bg-rose-500 text-white border-rose-600" : "bg-white text-rose-600 border-rose-200 hover:bg-rose-50 active:bg-rose-100"
                    )}
                  >
                    Decline
                  </button>
                </div>
              )}
              </motion.div>
            )}

            {/* Boss Block (Step 3) - Visible only if Admin and Board approved */}
            {((tier1Review || '').trim().toLowerCase() === 'approve' || (tier1Review || '').trim().toLowerCase() === 'aprove') && 
             ((tier2Review || '').trim().toLowerCase() === 'approve' || (tier2Review || '').trim().toLowerCase() === 'aprove') && 
             currentUserEmail.toLowerCase() !== 'adi.grinder.9@gmail.com' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="border border-gray-100 rounded-2xl p-3.5 bg-[#fcfdfe]"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center">3</span>
                    BOSS :
                  </span>
                  {dateTier3 && (
                    <span className="text-[9px] font-mono font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {formatDateToMMDDYYYY(dateTier3)}
                    </span>
                  )}
                </div>
                {((tier3Review || '').trim() !== '' || (currentUserEmail.toLowerCase() === 'vonyloselia@gmail.com' && reviewTier !== 'Board Approve')) ? (
                  <div className={cn("w-full bg-white border border-slate-200 text-xs font-bold uppercase px-3 py-2.5 rounded-xl", 
                    (tier3Review || '').toLowerCase() === 'approve' ? "text-emerald-600" : (tier3Review || '').toLowerCase() === 'pending' ? "text-amber-500" : ((tier3Review || '').trim() === '' ? "text-slate-400" : "text-rose-500")
                  )}>
                    {tier3Review || 'PENDING'}
                  </div>
                ) : (
                  <div className="flex gap-2 w-full mt-1">
                    <button
                      disabled={isSaving}
                      onClick={() => handleTierUpdate(3, 'Approve')}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs flex justify-center items-center gap-1 font-bold border transition-all shadow-sm",
                        tier3Review === 'Approve' ? "bg-emerald-600 text-white border-emerald-700" : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50 active:bg-emerald-100"
                      )}
                    >
                      Approve
                    </button>
                    <button
                      disabled={isSaving}
                      onClick={() => handleTierUpdate(3, 'Pending')}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs flex justify-center items-center gap-1 font-bold border transition-all shadow-sm",
                        tier3Review === 'Pending' ? "bg-amber-500 text-white border-amber-600" : "bg-white text-amber-600 border-amber-200 hover:bg-amber-50 active:bg-amber-100"
                      )}
                    >
                      Pending
                    </button>
                    <button
                      disabled={isSaving}
                      onClick={() => handleTierUpdate(3, 'Decline')}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs flex justify-center items-center gap-1 font-bold border transition-all shadow-sm",
                        tier3Review === 'Decline' ? "bg-rose-500 text-white border-rose-600" : "bg-white text-rose-600 border-rose-200 hover:bg-rose-50 active:bg-rose-100"
                      )}
                    >
                      Decline
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Bukti Transfer Section - Available only if Board has Approved */}
            {((tier2Review || '').trim().toLowerCase() === 'approve' || (tier2Review || '').trim().toLowerCase() === 'aprove') && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border border-[#429dbb]/20 bg-[#fbfdfe] hover:border-[#429dbb]/40 rounded-2xl p-4 transition-all space-y-3.5"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#429dbb] uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    Bukti Transfer :
                  </span>
                </div>

                {/* Upload Action buttons */}
                <div className="grid grid-cols-2 gap-3.5">
                  {/* Camera capture input */}
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    ref={cameraInputRef}
                    onChange={handleUploadProof}
                    className="hidden" 
                    id="camera-capture-input"
                  />
                  <div
                    type="button"
                    disabled={isSaving}
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 p-3 border border-dashed border-gray-200 rounded-2xl bg-white hover:bg-sky-50/50 hover:border-[#429dbb]/50 transition-colors cursor-pointer group"
                    role="button"
                    tabIndex={0}>
                    <div className="w-8 h-8 rounded-full bg-sky-50 text-[#429dbb] flex items-center justify-center group-hover:bg-sky-100 transition-colors">
                      <Camera className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[11px] font-bold text-gray-700">Ambil Gambar</span>
                  </div>

                  {/* General file upload uploader */}
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef}
                    onChange={handleUploadProof}
                    className="hidden" 
                    id="file-upload-input"
                  />
                  <div
                    type="button"
                    disabled={isSaving}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 p-3 border border-dashed border-gray-200 rounded-2xl bg-white hover:bg-indigo-50/50 hover:border-indigo-400/50 transition-colors cursor-pointer group"
                    role="button"
                    tabIndex={0}>
                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                      <Upload className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[11px] font-bold text-gray-700">Pilih File</span>
                  </div>
                </div>

                {/* Show uploaded image if exists */}
                {buktiTransfer && (
                  <div className="bg-white border rounded-2xl p-2.5 overflow-hidden shadow-inner flex flex-col items-center gap-2.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block self-start">Lampiran Bukti Aktif</span>
                    
                    <div
                      onClick={() => setZoomedImage(buktiTransfer)}
                      className="block relative group max-w-xs w-full overflow-hidden rounded-xl border border-gray-100 shadow-sm cursor-pointer"
                    >
                      <img src={buktiTransfer} alt="Bukti Transfer" className="w-full max-h-56 object-cover object-center group-hover:scale-105 transition-transform" />
                      
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-1 text-white">
                        <ZoomIn className="w-4 h-4" />
                        <span className="text-xs font-bold font-sans">Perbesar</span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

          </div>
        </motion.div>

        {/* Card 6: Done Action */}
        {!isDoneClicked && orderStatus === 'Done' && (!readStatus || readStatus.trim() === '') && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 flex flex-col items-center justify-center space-y-3"
        >
          <button
            onClick={() => {
              setIsDoneClicked(true);
              handleDone();
            }}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 bg-[#429dbb] text-white py-3 rounded-2xl font-bold shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isSaving && saveTarget === 'done' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
            Done
          </button>
        </motion.div>
        )}

        {/* Zoomed Image popup modal */}
        <AnimatePresence>
          {zoomedImage && (
            <div
              className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4 cursor-zoom-out"
              onClick={() => setZoomedImage(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative max-w-4xl w-full max-h-[90vh] bg-neutral-900 overflow-hidden rounded-2xl shadow-2xl flex flex-col border border-white/10"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header with Title and Close button */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-neutral-950 shrink-0 text-white">
                  <span className="text-xs font-semibold tracking-wider uppercase text-gray-400">
                    Pratinjau Foto ID / Bukti
                  </span>
                  <button
                    onClick={() => setZoomedImage(null)}
                    className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
                    aria-label="Tutup foto"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Scrollable container for scaled image */}
                <div className="overflow-auto flex-1 p-6 flex items-center justify-center bg-neutral-900/50 min-h-[350px] max-h-[70vh]">
                  <div className="relative overflow-visible p-12 flex items-center justify-center">
                    <img
                      src={formatImageUrl(zoomedImage)}
                      alt="Zoomed"
                      style={{
                        transform: `scale(${imgScale})`,
                        transformOrigin: "center center",
                        transition: "transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
                      }}
                      className="max-w-full max-h-[55vh] object-contain rounded-lg shadow-xl"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                {/* Zoom Controls Footer */}
                <div className="bg-neutral-950 border-t border-white/10 px-6 py-4 flex items-center justify-between gap-4 shrink-0">
                  <div className="text-xs text-gray-400 font-medium hidden sm:block">
                    Gunakan tombol di sebelah kanan untuk memperbesar atau memperkecil gambar.
                  </div>
                  <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10 mx-auto sm:mx-0">
                    <button
                      onClick={() => setImgScale((s) => Math.max(0.5, s - 0.25))}
                      disabled={imgScale <= 0.5}
                      className="p-1 hover:bg-white/10 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Perkecil"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono font-bold text-white min-w-[3rem] text-center select-none">
                      {Math.round(imgScale * 100)}%
                    </span>
                    <button
                      onClick={() => setImgScale((s) => Math.min(3, s + 0.25))}
                      disabled={imgScale >= 3.0}
                      className="p-1 hover:bg-white/10 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Perbesar"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <div className="w-[1px] h-4 bg-white/20 self-center mx-1" />
                    <button
                      onClick={() => setImgScale(1)}
                      className="text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/10 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}
