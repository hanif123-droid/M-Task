import { useState, useEffect, useRef, FormEvent } from 'react';
import { ArrowLeft, Edit2, DollarSign, Clock, Paperclip, CheckCircle2, FileText, Loader2, X, Plus, ChevronUp, ChevronDown, ChevronRight, Image as ImageIcon, Link as LinkIcon, StickyNote, File as FileIcon, Globe, Camera, Database } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatImageUrl, formatUnitName } from '../lib/utils';
import { getSheetData, appendSheetData, updateSheetData, appendSheetDataFromId, getSheetDataFromId, updateSheetDataFromId } from '../lib/api';
import { DriveService } from '../lib/driveService';
import { logActivity } from '../lib/activityLogger';
import { CameraModal } from '../components/CameraModal';
import { OrderBudgetNotaUploader } from '../components/OrderBudgetNotaUploader';
import { triggerNotificationFeedback } from '../utils/feedback';

function formatIDR(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

function formatDateMMDDYY(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function formatCompleteDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function getDueDaysLeft(dueDateStr: string): { label: string, days: number, isOverdue: boolean } {
  const due = new Date(dueDateStr);
  if (isNaN(due.getTime())) return { label: '', days: 0, isOverdue: false };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return { label: 'Days Overdue', days: Math.abs(diffDays), isOverdue: true };
  } else {
    return { label: 'Days Left', days: diffDays, isOverdue: false };
  }
}

function formatDocTimestamp(tsStr: string) {
  if (!tsStr) return '';
  const d = new Date(tsStr);
  if (isNaN(d.getTime())) return tsStr;
  const now = new Date();
  const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (isToday) return 'Just Now';
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

const ubahKeDirectLink = (urlDrive: string) => {
  if (!urlDrive) return '';
  const matchD = urlDrive.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  const matchId = urlDrive.match(/id=([a-zA-Z0-9_-]+)/);
  const fileId = matchD ? matchD[1] : (matchId ? matchId[1] : null);
  
  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }
  return urlDrive;
};

function PhotoViewer({ src, alt }: { src: string, alt: string }) {
  const [loading, setLoading] = useState(true);
  const directLink = ubahKeDirectLink(src);

  return (
    <div className="image-container relative flex flex-col items-center justify-center min-h-[250px] w-full rounded-2xl bg-gray-50/80 shadow-md border border-gray-100 overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-2 z-10 bg-gray-50/50 backdrop-blur-sm shadow-inner rounded-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="text-sm font-semibold tracking-wide uppercase text-gray-500">Memuat gambar...</span>
        </div>
      )}
      <img
        id="preview-gambar"
        src={directLink}
        alt={alt}
        onLoad={() => setLoading(false)}
        onError={() => setLoading(false)}
        className={cn(
          "w-full h-auto object-contain max-h-[60vh] rounded-2xl shadow-sm transition-all duration-500 ease-out",
          loading ? "opacity-0 scale-95" : "opacity-100 scale-100"
        )}
      />
    </div>
  );
}

export function ActivityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUserEmail = localStorage.getItem('mtask_user_email') || 'designify.creative7@gmail.com';
  const [isLoading, setIsLoading] = useState(true);
  const [activity, setActivity] = useState<any>(null);
  
  const [expandDocuments, setExpandDocuments] = useState(true);
  
  const [isEditingInstruction, setIsEditingInstruction] = useState(false);
  const [tempInstruction, setTempInstruction] = useState('');
  const [isSavingInstruction, setIsSavingInstruction] = useState(false);
  
  const [isEditingExpense, setIsEditingExpense] = useState(false);
  const [tempAmount, setTempAmount] = useState('');
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [addDocType, setAddDocType] = useState<'Photo' | 'File' | 'Link' | 'Note' | null>(null);
  const [addDocTitle, setAddDocTitle] = useState('');
  const [addDocFile, setAddDocFile] = useState<File | null>(null);
  const [addDocLink, setAddDocLink] = useState('');
  const [addDocNote, setAddDocNote] = useState('');
  const [isUploadingDok, setIsUploadingDok] = useState(false);
  const [docToSaveAsData, setDocToSaveAsData] = useState<any | null>(null);
  const [isSavingDocData, setIsSavingDocData] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [dokHeaders, setDokHeaders] = useState<string[]>([]);
  const [dokSheetName, setDokSheetName] = useState<string>('Dok Sub Task');
  const [dokCount, setDokCount] = useState<number>(0);

  const [subSheetName, setSubSheetName] = useState<string>('Sub Task');
  const [subRowIndex, setSubRowIndex] = useState<number>(-1);
  const [subRowData, setSubRowData] = useState<any[]>([]);
  const [subHeaders, setSubHeaders] = useState<string[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      triggerNotificationFeedback();
    }
  }, [toastMessage]);

  // Order Budget dynamic states
  const [contacts, setContacts] = useState<{ id: string; name: string; type: string }[]>([]);
  const [orderStatus, setOrderStatus] = useState<string>('');
  const [reviewTier, setReviewTier] = useState<string>('');
  const [orderHeaders, setOrderHeaders] = useState<string[]>([]);
  const [parentTaskInfo, setParentTaskInfo] = useState<{ taskId: string; projectId: string; unitId: string } | null>(null);
  const [showOrderBudgetModal, setShowOrderBudgetModal] = useState<boolean>(false);
  const [activeUserName, setActiveUserName] = useState<string>('');
  const [unitNameMap, setUnitNameMap] = useState<Record<string, string>>({});

  // Form states for Order Budget
  const [obOrderType, setObOrderType] = useState<string>('');
  const [obKepada, setObKepada] = useState<string>('');
  const [obAmount, setObAmount] = useState<string>('');
  const [obVia, setObVia] = useState<string>('');
  const [obBank, setObBank] = useState<string>('');
  const [obRekNo, setObRekNo] = useState<string>('');
  const [obAtasNama, setObAtasNama] = useState<string>('');
  const [obBerita, setObBerita] = useState<string>('');
  const [obNote, setObNote] = useState<string>('');
  const [obQrisFile, setObQrisFile] = useState<File | null>(null);
  const [obQrisUrl, setObQrisUrl] = useState<string>('');
  const [obEwalletName, setObEwalletName] = useState<string>('');
  const [obEwalletNo, setObEwalletNo] = useState<string>('');
  const [obVirtualNo, setObVirtualNo] = useState<string>('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [obNotaFiles, setObNotaFiles] = useState<File[]>([]);

  const [tallentList, setTallentList] = useState<any[]>([]);

  const [vendorList, setVendorList] = useState<any[]>([]);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [showAddTallentModal, setShowAddTallentModal] = useState(false);
  
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactUsecase, setNewContactUsecase] = useState('');
  const [newContactAddress, setNewContactAddress] = useState('');
  const [newContactWebsite, setNewContactWebsite] = useState('');
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);


  const obFileInputRef = useRef<HTMLInputElement>(null);
  const obNotaFileInputRef = useRef<HTMLInputElement>(null);
  const obNotaCameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        setIsLoading(true);
        const [subRes1, subRes2, userRes, dokRes1, dokRes2, taskRes, projectRes, contactRes, orderRes1, orderRes2, unitRes] = await Promise.all([
          getSheetData('Subtask!A1:Z3000').catch(() => null),
          getSheetData('Sub Task!A1:Z3000').catch(() => null),
          getSheetData('User!A1:Z500').catch(() => null),
          getSheetDataFromId('1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao', 'Dok Sub Task!A1:Z3000').catch(() => null),
          getSheetDataFromId('1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao', 'Dok Subtask!A1:Z3000').catch(() => null),
          getSheetData('Task!A1:Z2000').catch(() => null),
          getSheetData('Project!A1:Z1000').catch(() => null),
          getSheetData('Contact!A1:Z500').catch(() => null),
          getSheetData('Order Budget!A1:Z3000').catch(() => null),
          getSheetData('OrderBudget!A1:Z3000').catch(() => null),
          getSheetData('Unit!A1:Z500').catch(() => null),
        ]);

        const userMap = new Map<string, { photo: string, name: string }>();
        const vendors: any[] = [];
        const tallents: any[] = [];
        if (userRes?.values?.length > 0) {
          const headers = userRes.values[0] as string[];
          const emailIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'EMAIL');
          const photoIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PHOTO' || h?.trim().toUpperCase() === 'AVATAR');
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'NAME');
          const roleIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ROLE');
          if (emailIdx > -1) {
            userRes.values.slice(1).forEach((row: any[]) => {
              const email = row[emailIdx]?.trim();
              const role = roleIdx > -1 ? row[roleIdx]?.trim() : '';
              if (email) {
                userMap.set(email, {
                  photo: (photoIdx > -1 && row[photoIdx]) ? row[photoIdx] : `https://ui-avatars.com/api/?name=${encodeURIComponent(row[nameIdx] || email)}&background=eff6ff&color=3b82f6`,
                  name: (nameIdx > -1 && row[nameIdx]) ? row[nameIdx] : email.split('@')[0],
                });
              }
              if (role?.toLowerCase() === 'vendor' && nameIdx > -1 && row[nameIdx]) {
                vendors.push({
                  id: row[0], // ID is usually index 0
                  name: row[nameIdx],
                  email: email || '',
                  role: role
                });
              }
              if (role?.toLowerCase() === 'tallent' && nameIdx > -1 && row[nameIdx]) {
                tallents.push({
                  id: row[0],
                  name: row[nameIdx],
                  email: email || '',
                  role: role
                });
              }
            });

            setVendorList(vendors);
            setTallentList(tallents);

            if (currentUserEmail) {
              const userRow = userRes.values.slice(1).find((row: any[]) => row[emailIdx]?.trim().toLowerCase() === currentUserEmail.toLowerCase());
              if (userRow && nameIdx > -1 && userRow[nameIdx]) {
                setActiveUserName(userRow[nameIdx].trim());
              }
            }
          }
        }

        if (unitRes?.values?.length > 0) {
          const uHeaders = unitRes.values[0] as string[];
          const uIdIdx = uHeaders.findIndex(h => h?.trim().toUpperCase() === 'ID' || h?.trim().toUpperCase() === 'UNIT ID');
          const uNameIdx = uHeaders.findIndex(h => h?.trim().toUpperCase() === 'UNIT NAME');
          if (uIdIdx > -1 && uNameIdx > -1) {
            const tempMap: Record<string, string> = {};
            unitRes.values.slice(1).forEach((row: any[]) => {
              const uId = row[uIdIdx]?.trim();
              const uName = row[uNameIdx]?.trim();
              if (uId && uName) {
                tempMap[uId] = uName;
              }
            });
            setUnitNameMap(tempMap);
          }
        }

        let documents: any[] = [];
        const dokRes = dokRes1?.values ? dokRes1 : dokRes2;
        if (dokRes?.values?.length > 0) {
          const headers = dokRes.values[0] as string[];
          setDokHeaders(headers);
          setDokSheetName(dokRes1?.values ? 'Dok Sub Task' : 'Dok Subtask');
          setDokCount(dokRes.values.length);
          
          const dokIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'DOK SUB ID' || h?.trim().toUpperCase() === 'ID');
          const subIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'SUB_ID' || h?.trim().toUpperCase() === 'SUB ID' || h?.trim().toUpperCase() === 'SUBTASK ID');
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TITLE_DOK' || h?.trim().toUpperCase() === 'JUDUL' || h?.trim().toUpperCase() === 'TITLE DOK' || h?.trim().toUpperCase() === 'NAME' || h?.trim().toUpperCase() === 'FILE NAME' || h?.trim().toUpperCase() === 'TITLE');
          const typeIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'DOK_TYPE' || h?.trim().toUpperCase() === 'DOK TYPE' || h?.trim().toUpperCase() === 'TYPE');
          const tsIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TIMESTAMP' || h?.trim().toUpperCase() === 'TIME' || h?.trim().toUpperCase() === 'DATE');
          const image01Idx = headers.findIndex(h => h?.trim().toUpperCase() === 'IMAGE_01' || h?.trim().toUpperCase() === 'IMAGE 01' || h?.trim().toUpperCase() === 'IMAGE');
          const noteIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'NOTE');
          const file01Idx = headers.findIndex(h => h?.trim().toUpperCase() === 'FILE_01' || h?.trim().toUpperCase() === 'FILE 01' || h?.trim().toUpperCase() === 'FILE');
          const url01Idx = headers.findIndex(h => h?.trim().toUpperCase() === 'URL_01' || h?.trim().toUpperCase() === 'URL 01' || h?.trim().toUpperCase() === 'URL');
          const dataIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'DATA');
          
          if (subIdIdx > -1) {
            dokRes.values.slice(1).forEach((row: any[], rIdx: number) => {
              const rowIdRaw = row[subIdIdx]?.toString() || '';
              const rowIdMatch = rowIdRaw.trim().replace(/^#/, '').toUpperCase();
              const targetIdMatch = id?.trim().replace(/^#/, '').toUpperCase() || '';
              if (rowIdMatch === targetIdMatch && targetIdMatch !== '') {
                const isDataValue = dataIdx > -1 ? (row[dataIdx]?.toString().trim().toUpperCase() === 'TRUE') : false;
                documents.push({
                  id: dokIdIdx > -1 ? row[dokIdIdx] : Math.random().toString(),
                  name: nameIdx > -1 ? row[nameIdx] : 'Unknown Document',
                  type: typeIdx > -1 ? row[typeIdx]?.trim() : 'File',
                  timestamp: tsIdx > -1 ? row[tsIdx] : '',
                  image01: image01Idx > -1 ? row[image01Idx] : '',
                  note: noteIdx > -1 ? row[noteIdx] : '',
                  file01: file01Idx > -1 ? row[file01Idx] : '',
                  url01: url01Idx > -1 ? row[url01Idx] : '',
                  isData: isDataValue,
                  rowIndex: rIdx + 2,
                });
              }
            });
          }
        }

        if (contactRes?.values?.length > 0) {
          const cHeaders = contactRes.values[0] as string[];
          const cIdIdx = cHeaders.findIndex(h => h?.trim().toUpperCase() === 'ID' || h?.trim().toUpperCase() === 'CONTACT ID');
          const cNameIdx = cHeaders.findIndex(h => h?.trim().toUpperCase() === 'NAME');
          const cTypeIdx = cHeaders.findIndex(h => h?.trim().toUpperCase() === 'TYPE');
          if (cNameIdx > -1) {
            const fetched = contactRes.values.slice(1).map((row: any[], i: number) => {
              const cId = cIdIdx > -1 ? row[cIdIdx]?.trim() : `contact-${i}`;
              const cName = row[cNameIdx]?.trim() || '';
              const cType = cTypeIdx > -1 ? row[cTypeIdx]?.trim() : '';
              return { id: cId, name: cName, type: cType };
            }).filter((c: any) => c.name);
            setContacts(fetched);
          }
        }

        const orderRes = orderRes1?.values ? orderRes1 : orderRes2;
        if (orderRes?.values?.length > 0) {
          const oHeaders = orderRes.values[0] as string[];
          setOrderHeaders(oHeaders);
          
          const oSubIdIdx = oHeaders.findIndex(h => {
            const k = h?.trim().toUpperCase();
            return k === 'SUB TASK_ID' || k === 'SUB TASK ID' || k === 'SUBTASK ID' || k === 'SUBTASK_ID' || k === 'ACTIVITY';
          });
          const oStatusIdx = oHeaders.findIndex(h => {
            const k = h?.trim().toUpperCase();
            return k === 'REVIEW TIER';
          });
          const oStatusFallbackIdx = oHeaders.findIndex(h => {
            const k = h?.trim().toUpperCase();
            return k === 'STATUS' || k === 'TIER';
          });
          
          if (oSubIdIdx > -1) {
            const relatedRow = orderRes.values.slice(1).find(row => row[oSubIdIdx]?.trim() === id);
            if (relatedRow) {
              const mainStatusValue = oStatusIdx > -1 ? relatedRow[oStatusIdx]?.trim() : undefined;
              const fallbackStatusValue = oStatusFallbackIdx > -1 ? relatedRow[oStatusFallbackIdx]?.trim() : undefined;
              setOrderStatus(mainStatusValue !== undefined ? mainStatusValue : (fallbackStatusValue || ''));
              setReviewTier(mainStatusValue || '');
            } else {
              setOrderStatus('');
              setReviewTier('');
            }
          } else {
            setOrderStatus('');
            setReviewTier('');
          }
        }

        const subRes = subRes2?.values ? subRes2 : subRes1;
        if (subRes?.values?.length > 0) {
          const headers = subRes.values[0] as string[];
          setSubHeaders(headers);
          setSubSheetName(subRes2?.values ? 'Sub Task' : 'Subtask');

          const subtaskIdIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'SUBTASK ID' || h?.trim().toUpperCase() === 'ID');
          const titleIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'SUBTASK NAME' || h?.trim().toUpperCase() === 'SUBTASK' || h?.trim().toUpperCase() === 'TITLE');
          const instIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'SUBTASK INSTRUCTION' || h?.trim().toUpperCase() === 'INSTRUCTION' || h?.trim().toUpperCase() === 'DESC');
          const statusIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'STATUS');
          const expIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'AMOUNT' || h?.trim().toUpperCase() === 'EXPENSES' || h?.trim().toUpperCase() === 'EXPENSE');
          const dueIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'SUBTASK DUE DATE' || h?.trim().toUpperCase() === 'DUE DATE');
          const userIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'USER' || h?.trim().toUpperCase() === 'ASSIGNED TO');
          const compDateIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'SUBTASK COMPLETE DATE' || h?.trim().toUpperCase() === 'COMPLETE DATE' || h?.trim().toUpperCase() === 'SUBTASK COMPLETED DATE' || h?.trim().toUpperCase() === 'COMPLETED DATE');

          if (subtaskIdIdx > -1) {
            const rowIndex = subRes.values.findIndex((r: any[], i: number) => i > 0 && r[subtaskIdIdx]?.trim() === id);
            
            if (rowIndex > 0) {
              const row = subRes.values[rowIndex];
              setSubRowIndex(rowIndex + 1);
              
              // Ensure row has the same number of elements as headers
              const fullRow = [...row];
              while (fullRow.length < headers.length) fullRow.push('');
              setSubRowData(fullRow);

              // Find parent task references
              const taskIdIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'TASK ID' || h?.trim().toUpperCase() === 'TASK' || h?.trim().toUpperCase() === 'TASK_ID');
              const parentTaskId = taskIdIdx > -1 ? row[taskIdIdx]?.trim() : '';

              let parentProjectId = '';
              if (parentTaskId && taskRes?.values?.length > 0) {
                const tHeaders = taskRes.values[0] as string[];
                const tIdIdx = tHeaders.findIndex(h => h?.trim().toUpperCase() === 'TASK ID' || h?.trim().toUpperCase() === 'ID');
                const tProjIdx = tHeaders.findIndex(h => h?.trim().toUpperCase() === 'PROJECT ID' || h?.trim().toUpperCase() === 'PROJECT' || h?.trim().toUpperCase() === 'PROJECT_ID');
                
                if (tIdIdx > -1 && tProjIdx > -1) {
                  const tRow = taskRes.values.slice(1).find(r => r[tIdIdx]?.trim() === parentTaskId);
                  if (tRow) {
                    parentProjectId = tRow[tProjIdx]?.trim() || '';
                  }
                }
              }

              let parentUnitId = '';
              if (parentProjectId && projectRes?.values?.length > 0) {
                const pHeaders = projectRes.values[0] as string[];
                const pIdIdx = pHeaders.findIndex(h => h?.trim().toUpperCase() === 'PROJECT ID' || h?.trim().toUpperCase() === 'ID');
                const pUnitIdx = pHeaders.findIndex(h => {
                  const key = h?.trim().toUpperCase();
                  return key === 'UNIT' || key === 'UNIT ID' || key === 'ID UNIT' || key === 'UNIT_ID' || key === 'UNIT BUSINESS';
                });
                
                if (pIdIdx > -1 && pUnitIdx > -1) {
                  const pRow = projectRes.values.slice(1).find(r => r[pIdIdx]?.trim() === parentProjectId);
                  if (pRow) {
                    parentUnitId = pRow[pUnitIdx]?.trim() || '';
                  }
                }
              }

              setParentTaskInfo({
                taskId: parentTaskId,
                projectId: parentProjectId,
                unitId: parentUnitId
              });

              const userEmail = userIdx > -1 ? row[userIdx]?.trim() : '';
              const userInfo = userMap.get(userEmail) || { photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(userEmail || 'U')}&background=eff6ff&color=3b82f6`, name: userEmail || 'Unknown User' };
              
              let sExp = 0;
              if (expIdx > -1 && row[expIdx]) {
                sExp = parseInt(row[expIdx].replace(/\D/g, ''), 10) || 0;
              }

              setActivity({
                id,
                title: titleIdx > -1 ? row[titleIdx] : 'Unknown Activity',
                instruction: instIdx > -1 ? row[instIdx] : '',
                status: statusIdx > -1 ? (row[statusIdx] || 'Unknown') : 'Unknown',
                expense: sExp,
                dueDate: dueIdx > -1 ? (row[dueIdx] || new Date().toISOString()) : new Date().toISOString(),
                assignedTo: userInfo,
                documents: documents,
                completeDate: compDateIdx > -1 ? row[compDateIdx] : ''
              });
            }
          }
        }
      } catch (error) {
        console.error("Failed fetching activity detail", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const handleAddDocumentSubmit = async (isData: boolean) => {
    if (!addDocType) return;
    try {
      setIsUploadingDok(true);
      
      let finalImageUrl = '';
      let finalFileUrl = '';
      let finalLink = '';
      let finalNote = addDocNote;
      
      if (addDocType === 'Photo' && addDocFile) {
        const res = await DriveService.uploadFile(addDocFile);
        finalImageUrl = res.url;
      } else if (addDocType === 'File' && addDocFile) {
        const res = await DriveService.uploadFile(addDocFile);
        finalFileUrl = res.url;
      } else if (addDocType === 'Link') {
        finalLink = addDocLink;
      }
      
      const newDokId = `DSK${Date.now().toString().slice(-4)}`;
      const ts = (() => {
        const d = new Date();
        const mm = (d.getMonth() + 1).toString().padStart(2, '0');
        const dd = d.getDate().toString().padStart(2, '0');
        const yyyy = d.getFullYear();
        let hr = d.getHours();
        const mins = d.getMinutes().toString().padStart(2, '0');
        const ampm = hr >= 12 ? 'PM' : 'AM';
        hr = hr % 12;
        hr = hr ? hr : 12; 
        return `${mm}/${dd}/${yyyy}, ${hr.toString().padStart(2, '0')}:${mins} ${ampm}`;
      })();
      const currentUserEmail = localStorage.getItem('mtask_user_email') || 'guest@example.com';
      
      // Determine what to append based on existing headers
      let headersToUse = dokHeaders.length > 0 ? dokHeaders : [];
      
      if (headersToUse.length === 0) {
        headersToUse = ['Timestamp', 'Dok Sub ID', 'Sub_ID', 'User', 'Title_Dok', 'Dok_Type', 'Image_01', 'Note', 'File_01', 'Url_01', 'DATA'];
      } else {
        const hasData = headersToUse.some(h => h?.trim().toUpperCase() === 'DATA');
        if (!hasData) {
          headersToUse = [...headersToUse, 'DATA'];
          try {
            const nextColLetter = (() => {
              let temp = headersToUse.length - 1;
              let letter = "";
              while (temp >= 0) {
                letter = String.fromCharCode((temp % 26) + 65) + letter;
                temp = Math.floor(temp / 26) - 1;
              }
              return letter;
            })();
            const sheetToUse = dokSheetName || 'Dok Sub Task';
            const rangeToUpdate = `${sheetToUse}!${nextColLetter}1`;
            updateSheetDataFromId('1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao', rangeToUpdate, [['DATA']]).catch(e => console.warn(e));
          } catch (headerErr) {
            console.warn('Failed to dynamically write DATA header:', headerErr);
          }
        }
      }
      
      let newRow: any[] = new Array(headersToUse.length).fill('');
      
      const setCol = (name: string, value: string) => {
        let idx = headersToUse.findIndex(h => h?.trim().toUpperCase() === name.toUpperCase());
        if (idx === -1) {
          idx = headersToUse.findIndex(h => {
             const key = h?.trim().toUpperCase() || '';
             return key.includes(name.toUpperCase());
          });
        }
        if (idx > -1) {
          newRow[idx] = value;
        }
      };
      
      setCol('TIME', ts); 
      setCol('TIMESTAMP', ts);
      setCol('DOK SUB ID', newDokId);
      setCol('SUB_ID', id || '');
      setCol('SUBTASK ID', id || '');
      setCol('USER', currentUserEmail);
      setCol('JUDUL', addDocTitle || ' ');
      setCol('TITLE_DOK', addDocTitle || ' ');
      setCol('INFO', addDocTitle || ' ');
      setCol('INFO DETAIL', addDocTitle || ' ');
      setCol('DOK_TYPE', addDocType);
      
      setCol('IMAGE_01', finalImageUrl);
      setCol('FILE_01', finalFileUrl);
      setCol('URL_01', finalLink);
      setCol('NOTE', finalNote);
      setCol('CATATAN', finalNote);
      setCol('DATA', isData ? 'TRUE' : 'FALSE');


      // Add to local state first to ensure it shows up regardless of API limit
      if (activity) {
        const newDocObj = {
          id: newDokId,
          name: addDocTitle || `New ${addDocType}`,
          type: addDocType,
          timestamp: ts,
          image01: finalImageUrl,
          note: finalNote,
          file01: finalFileUrl,
          url01: finalLink,
          isData: false,
        };
        setActivity({
          ...activity,
          documents: [...activity.documents, newDocObj]
        });
      }
      
      setShowAddDocModal(false);
      setAddDocType(null);
      setAddDocTitle('');
      setAddDocFile(null);
      setAddDocLink('');
      setAddDocNote('');

      try {
        await appendSheetDataFromId('1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao', 'Dok Sub Task!A1:Z', [newRow]);
        const docTitleStr = addDocTitle ? ` ${addDocTitle}` : '';
        const currentUserEmail = localStorage.getItem('mtask_user_email') || '';
        const userName = activeUserName || localStorage.getItem("mtask_user_name") || (currentUserEmail ? (currentUserEmail.includes('@') ? currentUserEmail.split('@')[0] : currentUserEmail) : 'User');
        const stRefId = activity?.taskId || id || '';
        logActivity('subTask', 'subtask Detail', `${userName} menambahkan ${addDocType}${docTitleStr} di subtask "${activity?.title || 'subtask'}" [${stRefId}]`);
      } catch (err: any) {
        if (err.message !== 'Mock authentication used, bypassing Sheets API' && err.message !== 'Not authenticated') {
          console.error('Failed appending to sheet', err);
        }
      }
    } catch (err: any) {
      if (err.message !== 'Mock authentication used, bypassing Sheets API' && err.message !== 'Not authenticated') {
        alert('Gagal menambahkan dokumen: ' + err.message);
      }
    } finally {
      setIsUploadingDok(false);
    }
  };

  const handleSaveDocAsData = async (doc: any) => {
    if (!doc) return;
    try {
      setIsSavingDocData(true);
      const sheetToUse = dokSheetName || 'Dok Sub Task';
      const SPREADSHEET_ID = '1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao';

      // 1. Fetch current header and rows to find exact position
      const dokRes = await getSheetDataFromId(SPREADSHEET_ID, `${sheetToUse}!A1:Z3000`).catch(() => null);
      if (!dokRes?.values || dokRes.values.length === 0) {
        throw new Error('Data lembar kerja dokumen tidak ditemukan');
      }

      let headers = dokRes.values[0] as string[];
      let dataColIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'DATA');

      if (dataColIdx === -1) {
        // Need to add DATA header to row 1
        dataColIdx = headers.length;
        headers = [...headers, 'DATA'];
        let temp = dataColIdx;
        let letter = "";
        while (temp >= 0) {
          letter = String.fromCharCode((temp % 26) + 65) + letter;
          temp = Math.floor(temp / 26) - 1;
        }
        await updateSheetDataFromId(SPREADSHEET_ID, `${sheetToUse}!${letter}1`, [['DATA']]);
        setDokHeaders(headers);
      }

      // Compute column letter for dataColIdx
      let temp = dataColIdx;
      let colLetter = "";
      while (temp >= 0) {
        colLetter = String.fromCharCode((temp % 26) + 65) + colLetter;
        temp = Math.floor(temp / 26) - 1;
      }

      // 2. Locate target row in sheet
      const dokIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'DOK SUB ID' || h?.trim().toUpperCase() === 'ID');
      const subIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'SUB_ID' || h?.trim().toUpperCase() === 'SUB ID' || h?.trim().toUpperCase() === 'SUBTASK ID');
      const titleIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TITLE_DOK' || h?.trim().toUpperCase() === 'JUDUL' || h?.trim().toUpperCase() === 'NAME');

      let targetRowIndex = doc.rowIndex || -1;
      const cleanSubId = id?.trim().replace(/^#/, '').toUpperCase() || '';

      const foundIdx = dokRes.values.slice(1).findIndex((r: any[]) => {
        if (dokIdIdx > -1 && doc.id && r[dokIdIdx]?.toString().trim() === doc.id.toString().trim()) {
          return true;
        }
        if (titleIdx > -1 && doc.name && r[titleIdx]?.toString().trim() === doc.name.toString().trim()) {
          if (subIdIdx > -1 && cleanSubId) {
            const rowSub = r[subIdIdx]?.toString().trim().replace(/^#/, '').toUpperCase();
            if (rowSub === cleanSubId) return true;
          } else {
            return true;
          }
        }
        return false;
      });

      if (foundIdx > -1) {
        targetRowIndex = foundIdx + 2; // +1 for 0-indexed slice, +1 for 1-based header row
      }

      if (targetRowIndex > 1) {
        await updateSheetDataFromId(SPREADSHEET_ID, `${sheetToUse}!${colLetter}${targetRowIndex}`, [['TRUE']]);
      } else {
        throw new Error('Baris dokumen tidak ditemukan di spreadsheet.');
      }

      // 3. Update local state
      if (activity) {
        const updatedDocs = activity.documents.map((d: any) => {
          if (d.id === doc.id || (doc.name && d.name === doc.name)) {
            return { ...d, isData: true };
          }
          return d;
        });
        setActivity({
          ...activity,
          documents: updatedDocs
        });
      }

      if (selectedDoc && (selectedDoc.id === doc.id || selectedDoc.name === doc.name)) {
        setSelectedDoc({ ...selectedDoc, isData: true });
      }

      // 4. Log activity
      const currentUserEmail = localStorage.getItem('mtask_user_email') || '';
      const userName = activeUserName || localStorage.getItem("mtask_user_name") || (currentUserEmail ? (currentUserEmail.includes('@') ? currentUserEmail.split('@')[0] : currentUserEmail) : 'User');
      const docTitle = doc.name ? ` "${doc.name}"` : '';
      logActivity('subTask', 'subtask Detail', `${userName} menyimpan dokumen${docTitle} sebagai data di subtask "${activity?.title || 'subtask'}" [${id || ''}]`);

      setDocToSaveAsData(null);
      setToastMessage('Dokumen berhasil disimpan sebagai data!');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed saving doc as data:', err);
      alert('Gagal menyimpan sebagai data: ' + (err.message || 'Error'));
    } finally {
      setIsSavingDocData(false);
    }
  };

  const handleSaveInstruction = async () => {
    try {
      setIsSavingInstruction(true);
      
      const payload = {
        action: "UPDATE_ACTIVITY_DETAIL",
        sub_task_id: id,
        description: tempInstruction,
        expenses: activity.expense
      };

      try {
        await fetch('https://script.google.com/macros/s/AKfycbzYn2CpEC17pLTcaEo7yiBLm4KF-8In3a_Bp4OaUnBHQuvgFTi43ZthZnHUlhlHXjYEgA/exec', {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload)
        });
      } catch (fetchErr) {
        console.warn('Network or CORS error updating activity details, proceeding with local fallback:', fetchErr);
      }

      setActivity({ ...activity, instruction: tempInstruction });
      setIsEditingInstruction(false);
      setToastMessage('Perubahan Berhasil Disimpan');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      alert('Gagal menyimpan deskripsi: ' + err.message);
    } finally {
      setIsSavingInstruction(false);
    }
  };

  const handleSaveExpense = async () => {
    try {
      setIsSavingExpense(true);
      const parsed = parseInt(tempAmount, 10);
      const val = isNaN(parsed) ? 0 : parsed;

      const payload = {
        action: "UPDATE_ACTIVITY_DETAIL",
        sub_task_id: id,
        description: activity.instruction || "",
        expenses: val
      };

      try {
        await fetch('https://script.google.com/macros/s/AKfycbzYn2CpEC17pLTcaEo7yiBLm4KF-8In3a_Bp4OaUnBHQuvgFTi43ZthZnHUlhlHXjYEgA/exec', {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload)
        });
      } catch (fetchErr) {
        console.warn('Network or CORS error updating activity expenses, proceeding with local fallback:', fetchErr);
      }

      setActivity({ ...activity, expense: val });
      setIsEditingExpense(false);
      setToastMessage('Perubahan Berhasil Disimpan');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      alert('Gagal menyimpan expenses: ' + err.message);
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleAddContact = async (e: FormEvent, roleType: 'Vendor' | 'Tallent') => {
    e.preventDefault();
    try {
      setIsSubmittingContact(true);
      const res = await getSheetData('User!A1:ZZ1').catch(() => null);
      let userHeaders = ['ID', 'Role', 'Usecase', 'Unit Business', 'Name', 'Email', 'Phone', 'Alamat', 'Website', 'Avail'];
      if (res?.values?.length > 0) {
        userHeaders = res.values[0] as string[];
      }
      
      const newRow = new Array(userHeaders.length).fill('');
      let headersChanged = false;
      const setCol = (name: string, value: string) => {
        const normName = name.trim().toUpperCase();
        let idx = userHeaders.findIndex(h => h?.trim().toUpperCase() === normName || h?.trim().toUpperCase() === normName.replace(/ /g, '_'));
        if (idx === -1) {
          idx = userHeaders.length;
          userHeaders.push(name);
          headersChanged = true;
          newRow.push('');
        }
        newRow[idx] = value;
      };

      const prefix = roleType === 'Vendor' ? 'vdr' : 'tln';
      const contactId = `${prefix}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      setCol('ID', contactId);
      setCol('Name', newContactName);
      setCol('AVAIL', 'CNT');
      setCol('Email', newContactEmail);
      setCol('Phone', newContactPhone);
      setCol('Role', roleType);
      setCol('Usecase', newContactUsecase);
      
      // Unit uses ID according to user requirements
      const uId = parentTaskInfo?.unitId || '';
      setCol('Unit Business', uId);
      
      setCol('Alamat', newContactAddress);
      setCol('Website', newContactWebsite);

      // Truncate trailing empty strings so we don't overwrite columns (like AB and onwards) that might hold formulas
      while (newRow.length > 0 && newRow[newRow.length - 1] === '') {
        newRow.pop();
      }

      await appendSheetData('User', [newRow]);
      const adderName = activeUserName || localStorage.getItem("mtask_user_name") || "User";
      logActivity('Add Contact', 'Activity Detail', `${adderName} menambahkan ${roleType} baru bernama "${newContactName}"`);

      const newContactObj = {
        id: contactId,
        name: newContactName,
        email: newContactEmail,
        role: roleType
      };

      if (roleType === 'Vendor') {
        setVendorList(prev => [...prev, newContactObj]);
        setShowAddVendorModal(false);
      } else {
        setTallentList(prev => [...prev, newContactObj]);
        setShowAddTallentModal(false);
      }
      
      setObKepada(newContactName);
      setNewContactName('');
      setNewContactEmail('');
      setNewContactPhone('');
      setNewContactUsecase('');
      setNewContactAddress('');
      setNewContactWebsite('');
      setToastMessage(`${roleType} berhasil ditambahkan`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error(err);
      alert(`Gagal menambah ${roleType.toLowerCase()}`);
    } finally {
      setIsSubmittingContact(false);
    }
  };

  const handleOrderBudgetSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!obOrderType) {
      alert("Silakan pilih Order type!");
      return;
    }
    if (!obKepada.trim()) {
      alert("Silakan pilih atau isi penerima (Kepada)!");
      return;
    }
    const currentAmountVal = obAmount || activity.expense?.toString() || '0';
    const parsedAmount = parseInt(currentAmountVal.replace(/\D/g, ""), 10);
    if (!currentAmountVal || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Silakan masukkan nominal pengajuan (Amount) yang valid!");
      return;
    }
    if (!obVia) {
      alert("Silakan pilih VIA Pembayaran!");
      return;
    }
    if (obVia === 'Transfer') {
      if (!obBank) {
        alert("Silakan pilih Bank tujuan transfer!");
        return;
      }
      if (!obRekNo.trim()) {
        alert("Silakan isi nomor rekening!");
        return;
      }
      if (!obAtasNama.trim()) {
        alert("Silakan isi nama pemilik rekening (Atas Nama)!");
        return;
      }
    }
    if (obVia === 'Cash' && !obNote.trim()) {
      alert("Silakan isi catatan untuk pembayaran Cash!");
      return;
    }
    if (obVia === 'Qris' && !obQrisFile) {
      alert("Silakan upload foto/gambar QRIS!");
      return;
    }
    if (obVia === 'Ewallet') {
      if (!obEwalletName) {
        alert("Silakan pilih jenis E-Wallet!");
        return;
      }
      if (!obEwalletNo.trim()) {
        alert("Silakan isi nomor E-Wallet / HP!");
        return;
      }
    }
    if (obVia === 'Virtual Akun' && !obVirtualNo.trim()) {
      alert("Silakan isi nomor Virtual Account!");
      return;
    }
    
    setIsSubmittingOrder(true);
    try {
      const ts = (() => {
        const d = new Date();
        return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
      })();
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const currentUserEmail = localStorage.getItem('mtask_user_email') || 'designify.creative7@gmail.com';
      
      let qrisUrl = '';
      if (obVia === 'Qris' && obQrisFile) {
        try {
          const res = await DriveService.uploadFile(obQrisFile);
          qrisUrl = res.url;
        } catch (uploadErr) {
          console.error('Failed to upload Qris image', uploadErr);
        }
      }

      let notaUrl = '';
      if ((obOrderType === 'Reimburse' || obOrderType === 'Operational') && obNotaFiles.length > 0) {
        try {
          const uploadedUrls: string[] = [];
          for (const file of obNotaFiles) {
            const res = await DriveService.uploadFile(file);
            if (res?.url) uploadedUrls.push(res.url);
          }
          notaUrl = uploadedUrls.join(" ");
        } catch (uploadErr) {
          console.error('Failed to upload Nota Belanja images', uploadErr);
        }
      }

      // Determine headers and initialize row
      const headersToUse = orderHeaders.length > 0 ? [...orderHeaders] : [
        'Order ID', 'RO_NUMBER', 'Order Detail', 'Unit Business', 'Amount', 
        'Review Tier', 'Email User', 'Date', 'Project_id', 'Task_id', 
        'Sub Task_id', 'Order Type', 'Vendor', 'Tallent', 'Via', 'Bank', 
        'Rek No', 'A n', 'Berita', 'Catatan', 'Qris', 'Ewallet Name', 
        'Ewallet', 'Virtual', 'Nota Belanja', 'via_nama'
      ];
      
      const newRow = new Array(Math.max(headersToUse.length, 25)).fill('');
      let headersChanged = false;
      
      const setCol = (name: string, value: string) => {
        const norm = name.trim().toUpperCase();
        let idx = headersToUse.findIndex(h => {
          const kh = h?.trim().toUpperCase() || '';
          return kh === norm || kh.replace(/_/, ' ') === norm.replace(/_/, ' ') || kh.includes(norm);
        });
        if (idx > -1) {
          newRow[idx] = value;
        } else {
          idx = headersToUse.length;
          headersToUse.push(name);
          headersChanged = true;
          while (newRow.length <= idx) {
            newRow.push('');
          }
          newRow[idx] = value;
        }
      };

      setCol('Order ID', `ORD${randomId}`);
      setCol('RO_NUMBER', '');
      setCol('Date', ts);
      setCol('Email User', currentUserEmail);
      setCol('Unit Business', parentTaskInfo?.unitId || '');
      setCol('Project_id', parentTaskInfo?.projectId || '');
      setCol('Task_id', parentTaskInfo?.taskId || '');
      setCol('Sub Task_id', id || '');
      
      const orderDetailVal = activity.title || '';
      setCol('Order Detail', orderDetailVal);
      setCol('Order Type', obOrderType);
      setCol('Contact ID', obKepada);
      setCol('Nota Belanja', notaUrl);
      
      const amountVal = obAmount || activity.expense?.toString() || '0';
      setCol('Amount', amountVal);
      setCol('Via', obVia);
      
      if (obVia === 'Transfer') {
        setCol('via_nama', obBank);
        setCol('Rek No', obRekNo);
        setCol('A n', obAtasNama);
        setCol('Berita', obBerita);
      } else if (obVia === 'Cash') {
        setCol('Catatan', obNote);
      } else if (obVia === 'Qris') {
        setCol('Qris', qrisUrl);
      } else if (obVia === 'Ewallet') {
        setCol('Ewallet Name', obEwalletName);
        setCol('Ewallet', obEwalletNo);
        setCol('via_nama', obEwalletName);
      } else if (obVia === 'Virtual Akun') {
        setCol('Virtual', obVirtualNo);
      }
      
      setCol('Review Tier', 'Admin Check');
      setCol('Status', 'SENT');

      // Generates "Text gabung" with CONCATENATE rule
      const userNamePrefix = activeUserName || (currentUserEmail ? currentUserEmail.split('@')[0] : '');
      const amountNum = parseInt(amountVal.replace(/\D/g, ''), 10) || 0;
      const formattedAmount = `Rp.${amountNum.toLocaleString('id-ID')}`;
      const unitBusinessVal = parentTaskInfo?.unitId || '';
      const unitBusinessName = unitNameMap[unitBusinessVal] || unitBusinessVal;
      const textGabung = `Order Budget ${orderDetailVal} ${formattedAmount} untuk ${obOrderType} | ${obKepada} via ${obVia} | Unit: ${unitBusinessName}`;
      setCol('Text gabung', textGabung);

      if (headersChanged) {
        try {
          const getLet = (n: number) => {
            let res = '';
            while (n >= 0) {
              res = String.fromCharCode((n % 26) + 65) + res;
              n = Math.floor(n / 26) - 1;
            }
            return res;
          };
          const range = `Order Budget!A1:${getLet(headersToUse.length - 1)}1`;
          await updateSheetData(range, [headersToUse]);
        } catch (e) {
          console.warn('Could not update headers', e);
        }
      }

      // Attempt to append to sheet
      await appendSheetData('Order Budget!A1:Z', [newRow]).catch(async () => {
        await appendSheetData('OrderBudget!A1:Z', [newRow]);
      });
      const userNameForOb = activeUserName || localStorage.getItem("mtask_user_name") || (currentUserEmail ? (currentUserEmail.includes('@') ? currentUserEmail.split('@')[0] : currentUserEmail) : 'User');
      const formattedUnitBizName = formatUnitName(unitBusinessName);
      const obLogDesc = `${userNameForOb} order ${orderDetailVal} ${formattedAmount} untuk ${obOrderType} | ${obKepada} via ${obVia} | Unit : ${formattedUnitBizName}`;
      logActivity('Order Budget', 'Activity Detail', obLogDesc);

      // Update local state
      setOrderStatus('Admin Check');
      
      // Reset form options
      setObOrderType('');
      setObKepada('');
      setObAmount('');
      setObVia('');
      setObBank('');
      setObRekNo('');
      setObAtasNama('');
      setObBerita('');
      setObNote('');
      setObQrisFile(null);
      setObNotaFiles([]);
      setObQrisUrl('');
      setObEwalletName('');
      setObEwalletNo('');
      setObVirtualNo('');
      setShowOrderBudgetModal(false);
      
      setToastMessage('Order Budget berhasil diajukan');
      setTimeout(() => setToastMessage(null), 3500);

    } catch (err: any) {
      alert('Gagal membuat Order Budget: ' + err.message);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleComplete = async () => {
    if (subRowIndex < 0 || subHeaders.length === 0) return;
    
    try {
      setIsCompleting(true);
      setShowConfirmModal(false);
      
      const payload = {
        action: "UPDATE_STATUS_DONE",
        sub_task_id: id
      };

      try {
        await fetch('https://script.google.com/macros/s/AKfycbzc95gFQWJTr5xDycc989JmOb7rV9SOogwaeMr0gxVf75hsbmFu5ZF0UH8FhgyksNqTIA/exec', {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: JSON.stringify(payload)
        });
      } catch (fetchErr) {
        console.warn('Network or CORS error updating subtask status to done, proceeding with local fallback:', fetchErr);
      }

      setToastMessage('Status diperbarui ke Done');
      setTimeout(() => setToastMessage(null), 3000);

      const statusIdx = subHeaders.findIndex((h: string) => h?.trim().toUpperCase() === 'STATUS');
      const compDateIdx = subHeaders.findIndex((h: string) => h?.trim().toUpperCase() === 'SUBTASK COMPLETE DATE' || h?.trim().toUpperCase() === 'COMPLETE DATE' || h?.trim().toUpperCase() === 'SUBTASK COMPLETED DATE' || h?.trim().toUpperCase() === 'COMPLETED DATE');
      const todayStr = new Date().toISOString();
      const newRowData = [...subRowData];
      
      if (statusIdx > -1) {
        newRowData[statusIdx] = 'Done';
      }
      if (compDateIdx > -1) {
        newRowData[compDateIdx] = todayStr;
      }
      
      setSubRowData(newRowData);
      setActivity({ 
        ...activity, 
        status: 'Done',
        completeDate: todayStr
      });
    } catch (err: any) {
      alert('Gagal menyelesaikan activity: ' + err.message);
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Memuat data activity...</p>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4 text-gray-500">
          <X className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Activity Tidak Ditemukan</h2>
        <p className="text-gray-500 mb-6">Mungkin data activity ini telah dihapus atau ID tidak valid.</p>
        <button onClick={() => navigate(-1)} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 transition">
          Kembali
        </button>
      </div>
    );
  }

  const dueInfo = getDueDaysLeft(activity.dueDate);
  const isOrderBudgetClickable = !reviewTier || reviewTier.trim() === '' || reviewTier.trim().toLowerCase() === 'kosong';

  return (
    <div className="pb-24 bg-gray-50 min-h-screen relative">
      <header className="bg-[#429dbb] text-white px-5 py-4 shadow-md sticky top-0 z-50 w-full flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-blue-700 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 focus:ring-offset-blue-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold tracking-wide flex-1">Activity Detail</h1>
      </header>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Card 1: Title, Instruction, Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 relative">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold text-gray-900 leading-tight flex-1">{activity.title}</h2>
          </div>
          
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Deskripsi</span>
              {!isEditingInstruction && activity.status?.toUpperCase() !== 'DONE' && (
                <button 
                  onClick={() => {
                    setTempInstruction(activity.instruction || '');
                    setIsEditingInstruction(true);
                  }}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shrink-0 flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase">Edit</span>
                </button>
              )}
            </div>
            
            {isEditingInstruction ? (
              <div className="mb-2">
                <textarea 
                  className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px] resize-none text-sm text-gray-700 bg-gray-50/50"
                  placeholder="Isi deskripsi aktivitas..."
                  value={tempInstruction}
                  onChange={(e) => setTempInstruction(e.target.value)}
                  disabled={isSavingInstruction}
                />
                <div className="flex gap-2 mt-2 justify-end">
                  <button 
                    onClick={() => setIsEditingInstruction(false)}
                    disabled={isSavingInstruction}
                    className="px-4 py-1.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleSaveInstruction}
                    disabled={isSavingInstruction}
                    className="px-4 py-1.5 text-sm font-bold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {isSavingInstruction ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Save
                  </button>
                </div>
              </div>
            ) : activity.instruction ? (
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 italic">
                {activity.instruction}
              </p>
            ) : (
              <p className="text-sm text-gray-400 italic">Tidak ada deskripsi.</p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap",
              (() => {
                const s = (activity?.status || '').toLowerCase();
                if (s.includes('complete') || s.includes('done') || s.includes('selesai')) return "bg-green-100 text-green-700";
                if (s.includes('cancel') || s.includes('batal')) return "bg-red-100 text-red-700";
                if (s.includes('not started') || s.includes('belum mulai')) return "bg-slate-100 text-slate-700";
                return "bg-blue-100 text-blue-700";
              })()
            )}>
              {activity.status}
            </span>
          </div>
        </div>

        {/* Card 2: Expenses */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Expenses</p>
                {!isEditingExpense && <p className="text-lg font-bold text-gray-900">{formatIDR(activity.expense)}</p>}
              </div>
            </div>
            {!isEditingExpense && activity.status?.toUpperCase() !== 'DONE' && (
              <button 
                onClick={() => {
                  setTempAmount(activity.expense.toString());
                  setIsEditingExpense(true);
                }}
                className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors shrink-0 flex items-center gap-1"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase">Edit</span>
              </button>
            )}
          </div>
          
          {isEditingExpense && (
            <div className="mt-2">
              <div className="relative mb-3">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 font-bold text-sm">Rp</span>
                </div>
                <input 
                  type="number"
                  className="w-full border border-gray-300 rounded-xl pl-10 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 font-semibold"
                  placeholder="0"
                  value={tempAmount}
                  onChange={(e) => setTempAmount(e.target.value)}
                  disabled={isSavingExpense}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button 
                  onClick={() => setIsEditingExpense(false)}
                  disabled={isSavingExpense}
                  className="px-4 py-1.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button 
                  onClick={handleSaveExpense}
                  disabled={isSavingExpense}
                  className="px-4 py-1.5 text-sm font-bold text-white bg-emerald-600 rounded-lg shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {isSavingExpense ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Card 2.5: Order Budget Card */}
        <div id="order-budget-card" className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (isOrderBudgetClickable) {
                  setObAmount(activity.expense?.toString() || '0');
                  setShowOrderBudgetModal(true);
                }
              }}
              disabled={!isOrderBudgetClickable}
              className={cn(
                "font-bold py-2.5 px-4 rounded-xl shadow-sm flex items-center gap-2 text-xs uppercase tracking-wider transition-all",
                isOrderBudgetClickable 
                  ? "bg-[#429dbb] hover:bg-[#35829c] text-white cursor-pointer" 
                  : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
              )}
            >
              <DollarSign className="w-4 h-4" />
              Order Budget
            </button>
          </div>
          {orderStatus && orderStatus.trim() !== '' && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status:</span>
              <span className={cn(
                "text-[10px] font-bold px-2.5 py-1 rounded-lg border capitalize shadow-sm",
                (() => {
                  const s = orderStatus.toLowerCase();
                  if (s.includes('approve') || s.includes('done') || s.includes('selesai') || s.includes('sukses')) return "bg-green-50 text-green-700 border-green-200";
                  if (s.includes('reject') || s.includes('batal') || s.includes('cancel')) return "bg-red-50 text-red-700 border-red-200";
                  if (s.includes('review') || s.includes('pending')) return "bg-yellow-50 text-yellow-700 border-yellow-200";
                  return "bg-slate-50 text-slate-700 border-slate-200";
                })()
              )}>
                {orderStatus}
              </span>
            </div>
          )}
        </div>

        {/* Card 5 (mapped to Card 3): Due Date */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Due Date</p>
              <p className="text-sm font-bold text-gray-900">{formatDateMMDDYY(activity.dueDate)}</p>
            </div>
          </div>
          <div className={cn(
            "text-xs font-semibold px-2.5 py-1 rounded-lg", 
            activity.status?.toUpperCase() === 'DONE' 
              ? "bg-green-100 text-green-700" 
              : (dueInfo.isOverdue ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600")
          )}>
             {activity.status?.toUpperCase() === 'DONE' ? (
               `Done @ ${formatCompleteDate(activity.completeDate || '')}`
             ) : (
               `${dueInfo.days} ${dueInfo.label}`
             )}
          </div>
        </div>

        {/* Card 6: Assigned To */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
          <img src={formatImageUrl(activity.assignedTo.photo) || undefined} alt="Assigned User" className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0" />
          <div className="flex flex-col justify-center">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Assigned To</span>
            <span className="text-sm font-bold text-gray-900 leading-none">{activity.assignedTo.name}</span>
          </div>
        </div>

        {/* Card 7: Attached Document */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-4">
          <div 
            className="p-4 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setExpandDocuments(!expandDocuments)}
          >
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-gray-500" />
              <h3 className="font-bold text-gray-900 text-sm">Attached Document ({activity.documents.length})</h3>
            </div>
            {expandDocuments ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </div>
          <AnimatePresence>
            {expandDocuments && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-gray-50/50 space-y-3">
                  {activity.documents.length === 0 ? (
                    <p className="text-center text-sm text-gray-500 py-2">No documents attached yet.</p>
                  ) : (
                    activity.documents.map((doc: any, idx: number) => {
                      let DocIcon = FileText;
                      const typeLower = (doc.type || '').toLowerCase();
                      if (typeLower.includes('photo') || typeLower.includes('image')) DocIcon = ImageIcon;
                      if (typeLower.includes('link')) DocIcon = LinkIcon;
                      if (typeLower.includes('note')) DocIcon = StickyNote;
                      
                      return (
                        <div 
                          key={`${doc.id}-${idx}`} 
                          className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:bg-blue-50/50 transition-colors"
                          onClick={() => setSelectedDoc(doc)}
                        >
                          {doc.timestamp && (
                            <span className="text-[10px] text-gray-500 font-medium shrink-0 text-center uppercase tracking-wide min-w-[3.5rem]">
                              {formatDocTimestamp(doc.timestamp)}
                            </span>
                          )}
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <DocIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {doc.type && (
                                <span className="text-[10px] text-gray-400 font-medium px-1.5 py-0.5 bg-gray-50 rounded capitalize">
                                  {doc.type}
                                </span>
                              )}
                              {doc.isData && (
                                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <Database className="w-2.5 h-2.5" /> Data
                                </span>
                              )}
                            </div>
                          </div>

                          {!doc.isData ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDocToSaveAsData(doc);
                              }}
                              className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 px-2.5 py-1.5 rounded-lg transition active:scale-95 shrink-0"
                              title="Simpan sebagai data"
                            >
                              <Database className="w-3.5 h-3.5" />
                              <span>Simpan</span>
                            </button>
                          ) : (
                            <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 shrink-0">
                              Tersimpan
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Card 8: Add Document */}
        <button 
          onClick={() => setShowAddDocModal(true)}
          className="w-full bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-4 flex items-center justify-center gap-2 text-blue-600 font-semibold hover:bg-blue-50 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Document
        </button>

        {/* Card 9: Done Button */}
        {(activity.status || '').toLowerCase().includes('done') ? (
          <div className="w-full bg-green-50 rounded-xl shadow-sm border border-green-200 p-4 flex items-center justify-center gap-2 text-green-700 font-bold mt-6">
            <CheckCircle2 className="w-6 h-6" />
            Activity has been Done
          </div>
        ) : (
          <button 
            onClick={() => setShowConfirmModal(true)}
            disabled={isCompleting || subRowIndex < 0}
            className="w-full bg-emerald-600 rounded-xl shadow-sm border border-emerald-600 p-4 flex items-center justify-center gap-2 text-white font-bold hover:bg-emerald-700 transition-colors text-lg mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCompleting ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Completing...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-6 h-6" />
                Done
              </>
            )}
          </button>
        )}

      </div>

      {/* Confirm Done Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowConfirmModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden z-10 flex flex-col p-6 items-center text-center"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-xl mb-2">Selesaikan Activity?</h3>
              <p className="text-gray-500 mb-6 font-medium">Activity yang sudah diselesaikan tidak dapat dikembalikan lagi. Anda yakin untuk melajutkan?</p>
              
              <div className="w-full flex gap-3">
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3 font-bold text-gray-600 bg-white border border-gray-300 rounded-xl shadow-sm hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={handleComplete}
                  className="flex-1 py-3 font-bold text-white bg-emerald-600 rounded-xl shadow-sm hover:bg-emerald-700 transition-colors"
                >
                  Ya, Selesai
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modals have been converted to inline forms */}

      {/* View Document Modal */}
      <AnimatePresence>
        {selectedDoc && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setSelectedDoc(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden z-10 flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <h3 className="font-bold text-gray-900 truncate flex-1 pr-4">{selectedDoc.name}</h3>
                <button onClick={() => setSelectedDoc(null)} className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto">
                {(() => {
                  const t = (selectedDoc.type || '').toLowerCase();
                  if (t.includes('photo') || t.includes('image')) {
                    if (selectedDoc.image01) {
                      return <PhotoViewer src={selectedDoc.image01} alt={selectedDoc.name || 'Foto Drive'} />;
                    } else {
                      return <p className="text-sm text-gray-500 italic">No image available.</p>;
                    }
                  } else if (t.includes('note')) {
                     return (
                       <div className="bg-white text-gray-800 text-sm whitespace-pre-wrap border border-gray-200 rounded-xl p-4 shadow-sm min-h-[100px]">
                         {selectedDoc.note || <span className="text-gray-400 italic">Empty note.</span>}
                       </div>
                     );
                  } else if (t.includes('file')) {
                     return (
                       <div className="flex flex-col items-center justify-center py-8">
                         <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                           <FileIcon className="w-8 h-8" />
                         </div>
                         {selectedDoc.file01 ? (
                           <a href={selectedDoc.file01} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition shadow-sm inline-flex items-center">
                             Download File
                           </a>
                         ) : (
                           <p className="text-sm text-gray-500 italic">No file link available.</p>
                         )}
                       </div>
                     );
                  } else if (t.includes('link')) {
                     return (
                       <div className="flex flex-col items-center justify-center py-8">
                         <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                           <LinkIcon className="w-8 h-8" />
                         </div>
                         {selectedDoc.url01 ? (
                           <a href={selectedDoc.url01} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition shadow-sm break-all text-center max-w-full inline-flex items-center">
                             Open Link
                           </a>
                         ) : (
                           <p className="text-sm text-gray-500 italic">No URL available.</p>
                         )}
                       </div>
                     );
                  }
                  return <p className="text-sm text-gray-500 italic text-center py-8">Unsupported document type.</p>;
                })()}
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>
                    {selectedDoc.timestamp ? new Date(selectedDoc.timestamp).toLocaleString() : 'No timestamp'}
                  </span>
                </div>
                {!selectedDoc.isData ? (
                  <button
                    type="button"
                    onClick={() => setDocToSaveAsData(selectedDoc)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition active:scale-95 shrink-0"
                    title="Simpan sebagai data"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>Simpan sebagai Data</span>
                  </button>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tersimpan sebagai Data</span>
                  </span>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showCameraModal && (
        <CameraModal 
          onClose={() => setShowCameraModal(false)}
          onCapture={(blob) => {
            const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
            setAddDocFile(file);
            setShowCameraModal(false);
          }}
          onGallerySelect={() => {
            setShowCameraModal(false);
            // Fallback to regular file input
            setTimeout(() => {
               const photoInput = document.getElementById('direct-camera-input');
               if (photoInput) {
                 photoInput.removeAttribute('capture');
                 photoInput.click();
               }
            }, 300);
          }}
        />
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-gray-800 text-white px-6 py-3 rounded-xl shadow-lg font-medium text-sm whitespace-nowrap"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Document Modal */}
      <AnimatePresence>
        {showAddDocModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => {
                if (!isUploadingDok) setShowAddDocModal(false);
              }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <h3 className="font-bold text-gray-900">Add Document</h3>
                <button 
                  onClick={() => {
                    if (!isUploadingDok) setShowAddDocModal(false);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4">
                {/* Document Title - Displayed before Document Type */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex justify-between">
                    <span>Judul</span>
                  </label>
                  <input
                    type="text"
                    value={addDocTitle}
                    onChange={(e) => setAddDocTitle(e.target.value)}
                    placeholder="Masukkan judul dokumen"
                    disabled={isUploadingDok}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
                  />
                </div>

                {/* Dok Type Selection */}
                <div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { type: 'Photo', icon: ImageIcon },
                      { type: 'File', icon: FileText },
                      { type: 'Link', icon: Globe },
                      { type: 'Note', icon: StickyNote },
                    ].map(item => (
                      <button
                        key={item.type}
                        onClick={() => {
                          setAddDocType(item.type as any);
                          if (item.type === 'Photo') {
                             setShowCameraModal(true);
                          } else if (item.type === 'File') {
                             fileInputRef.current?.click();
                          }
                        }}
                        disabled={isUploadingDok}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-xl border transition-all",
                          addDocType === item.type 
                            ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm" 
                            : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                        )}
                      >
                        <item.icon className="w-5 h-5 mb-1.5" />
                        <span className="text-[10px] font-bold">{item.type}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload / Input Fields based on type */}
                {/* Hidden direct camera input to avoid mounting delays */}
                <input 
                  id="direct-camera-input"
                  type="file" 
                  accept="image/*"
                  capture="environment"
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setAddDocFile(e.target.files[0]);
                      setAddDocType('Photo');
                    }
                  }}
                  disabled={isUploadingDok}
                />
                <AnimatePresence mode="popLayout">
                  {addDocType && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4">
                      {(addDocType === 'Photo' || addDocType === 'File') && (
                        <div>
                          {addDocType === 'File' && <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Upload File</label>}
                          <label className={cn("flex flex-col items-center justify-center w-full border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition relative overflow-hidden group", addDocType === 'Photo' && addDocFile ? "h-auto p-2" : "h-32")}>
                            {addDocFile ? (
                              addDocType === 'Photo' ? (
                                <img src={URL.createObjectURL(addDocFile)} alt="Preview" className="w-full h-auto max-h-48 object-contain rounded-lg" />
                              ) : (
                                <div className="text-center p-4">
                                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                                    <CheckCircle2 className="w-5 h-5" />
                                  </div>
                                  <p className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">{addDocFile.name}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">Click to change</p>
                                </div>
                              )
                            ) : (
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                {addDocType === 'Photo' ? <ImageIcon className="w-8 h-8 text-gray-400 mb-2 group-hover:text-blue-500 transition-colors" /> : <FileText className="w-8 h-8 text-gray-400 mb-2 group-hover:text-blue-500 transition-colors" />}
                                <p className="text-sm font-medium text-gray-500"><span className="text-blue-600 font-semibold">Click to upload</span> {addDocType.toLowerCase()}</p>
                              </div>
                            )}
                            <input 
                              type="file" 
                              accept={addDocType === 'Photo' ? "image/*" : "*/*"}
                              {...(addDocType === 'Photo' ? { capture: 'environment' } : {})}
                              className="hidden" 
                              ref={fileInputRef}
                              onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  setAddDocFile(e.target.files[0]);
                                }
                              }}
                              disabled={isUploadingDok}
                            />
                          </label>
                        </div>
                      )}

                      {addDocType === 'Link' && (
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">URL</label>
                          <input
                            type="url"
                            value={addDocLink}
                            onChange={(e) => setAddDocLink(e.target.value)}
                            placeholder="https://..."
                            disabled={isUploadingDok}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
                          />
                        </div>
                      )}

                      <div className="pt-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Note / Catatan (Optional)</label>
                        <textarea
                          value={addDocNote}
                          onChange={(e) => setAddDocNote(e.target.value)}
                          placeholder="Type your notes here..."
                          rows={3}
                          disabled={isUploadingDok}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none disabled:opacity-50"
                        />
                      </div>
                      
                      {/* Additional spacing at the end if needed */}
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <button
                  onClick={() => handleAddDocumentSubmit(false)}
                  disabled={!addDocTitle.trim() || !addDocType || isUploadingDok || (addDocType === 'Photo' && !addDocFile) || (addDocType === 'File' && !addDocFile) || (addDocType === 'Link' && !addDocLink) || (addDocType === 'Note' && !addDocNote)}
                  className="w-full bg-blue-600 text-white font-bold rounded-xl py-3.5 shadow-sm hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                >
                  {isUploadingDok ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving {addDocType === 'Photo' ? 'Photo' : 'Document'}...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Save {addDocType === 'Photo' ? 'Photo' : 'Document'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Konfirmasi Simpan Sebagai Data */}
      <AnimatePresence>
        {docToSaveAsData && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
              onClick={() => {
                if (!isSavingDocData) setDocToSaveAsData(null);
              }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 10 }} 
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 text-center space-y-5 z-10"
            >
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Database className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-gray-900 text-lg">Simpan sebagai data?</h4>
                <p className="text-sm text-gray-500 max-w-[260px] mx-auto">
                  Apakah Anda ingin menyimpan dokumen ini sebagai data (nilai TRUE pada kolom DATA)?
                </p>
                {docToSaveAsData.name && (
                  <p className="text-xs font-medium text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 truncate">
                    {docToSaveAsData.name}
                  </p>
                )}
              </div>
              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  disabled={isSavingDocData}
                  onClick={() => setDocToSaveAsData(null)}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition active:scale-[0.98] disabled:opacity-50"
                >
                  Tidak
                </button>
                <button
                  type="button"
                  disabled={isSavingDocData}
                  onClick={() => handleSaveDocAsData(docToSaveAsData)}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition shadow-sm active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSavingDocData ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    'Iya'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Budget Modal */}
      <AnimatePresence>
        {showOrderBudgetModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => {
                if (!isSubmittingOrder) setShowOrderBudgetModal(false);
              }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex flex-col">
                  <h3 className="font-bold text-gray-900 text-base">Form Order Budget</h3>
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Activity: {activity.title}</span>
                </div>
                <button 
                  onClick={() => {
                    if (!isSubmittingOrder) setShowOrderBudgetModal(false);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleOrderBudgetSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
                {/* Order type */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Order type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Vendor', 'Tallent', 'Reimburse', 'Operational'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setObOrderType(opt)}
                        disabled={isSubmittingOrder}
                        className={cn(
                          "py-2.5 px-3 text-xs font-bold rounded-xl border transition-all text-center cursor-pointer",
                          obOrderType === opt
                            ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                            : "bg-gray-50/50 border-gray-200 text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nota Belanja (Only for Reimburse or Operational) */}
                {(obOrderType === 'Reimburse' || obOrderType === 'Operational') && (
                  <div className="mb-4">
                    <OrderBudgetNotaUploader
                      files={obNotaFiles}
                      onChangeFiles={setObNotaFiles}
                      disabled={isSubmittingOrder}
                    />
                  </div>
                )}

                {/* Kepada */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Kepada <span className="text-red-500">*</span>
                    </label>
                    {obOrderType === 'Vendor' && (
                      <button
                        type="button"
                        onClick={() => setShowAddVendorModal(true)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Tambah vendor
                      </button>
                    )}
                    {obOrderType === 'Tallent' && (
                      <button
                        type="button"
                        onClick={() => setShowAddTallentModal(true)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Tambah tallent
                      </button>
                    )}
                  </div>
                  {obOrderType === 'Vendor' ? (
                    <select
                      required
                      value={obKepada}
                      onChange={(e) => setObKepada(e.target.value)}
                      disabled={isSubmittingOrder}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 font-medium"
                    >
                      <option value="">Pilih Vendor</option>
                      {vendorList.map((v, i) => (
                        <option key={`vendor-${i}`} value={v.name}>{v.name}</option>
                      ))}
                    </select>
                  ) : obOrderType === 'Tallent' ? (
                    <select
                      required
                      value={obKepada}
                      onChange={(e) => setObKepada(e.target.value)}
                      disabled={isSubmittingOrder}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 font-medium"
                    >
                      <option value="">Pilih Tallent</option>
                      {tallentList.map((t, i) => (
                        <option key={`tallent-${i}`} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      required
                      type="text"
                      placeholder="Masukkan nama penerima / Kepada"
                      value={obKepada}
                      onChange={(e) => setObKepada(e.target.value)}
                      disabled={isSubmittingOrder}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 font-medium"
                    />
                  )}
                </div>

                {/* Amount Field */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Amount
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-bold text-gray-500">Rp</span>
                    <input
                      type="number"
                      value={obAmount}
                      onChange={(e) => setObAmount(e.target.value)}
                      placeholder={activity.expense ? activity.expense.toString() : '0'}
                      disabled={isSubmittingOrder}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* VIA inline choices */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    VIA Pembayaran
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Transfer', 'Cash', 'Qris', 'Ewallet', 'Virtual Akun'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setObVia(opt);
                          // Reset suboptions
                          setObBank('');
                          setObRekNo('');
                          setObAtasNama('');
                          setObBerita('');
                          setObNote('');
                          setObQrisFile(null);
                          setObEwalletName('');
                          setObEwalletNo('');
                          setObVirtualNo('');
                        }}
                        className={cn(
                          "py-2 px-1 text-[11px] font-bold rounded-xl border transition-all text-center cursor-pointer",
                          obVia === opt
                            ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                            : "bg-gray-50/50 border-gray-200 text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conditionally rendered sub-fields based on VIA selection */}
                {obVia === 'Transfer' && (
                  <div className="space-y-4 p-3 bg-gray-50/50 rounded-2xl border border-gray-100">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Pilih Bank
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { name: "BCA", logo: "https://i.ibb.co.com/1YDFDCVJ/bca.png" },
                          { name: "Mandiri", logo: "https://i.ibb.co.com/sJsJ7tZZ/mandiri.png" },
                          { name: "BRI", logo: "https://i.ibb.co.com/293FsVJ/bri.png" },
                          { name: "BNI 46", logo: "https://i.ibb.co.com/YFXND4Xd/bni.png" },
                          { name: "JAGO", logo: "https://i.ibb.co.com/jkmnFMY0/jago.png" },
                        ].map(b => (
                          <button
                            key={b.name}
                            type="button"
                            onClick={() => setObBank(b.name)}
                            className={cn(
                              "p-2 rounded-xl border flex items-center gap-2 transition-all cursor-pointer text-left",
                              obBank === b.name
                                ? "border-blue-500 bg-blue-50/50 text-blue-700 font-bold"
                                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                            )}
                          >
                            <img src={b.logo} alt={b.name} className="w-5 h-5 object-contain rounded shrink-0" referrerPolicy="no-referrer" />
                            <span className="text-xs">{b.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {obBank && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            No. Rekening
                          </label>
                          <input
                            type="text"
                            value={obRekNo}
                            onChange={(e) => setObRekNo(e.target.value)}
                            required
                            placeholder="Masukkan nomor rekening"
                            disabled={isSubmittingOrder}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Atas Nama (A/N)
                          </label>
                          <input
                            type="text"
                            value={obAtasNama}
                            onChange={(e) => setObAtasNama(e.target.value)}
                            required
                            placeholder="Pemilik rekening"
                            disabled={isSubmittingOrder}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Berita Transfer
                          </label>
                          <input
                            type="text"
                            value={obBerita}
                            onChange={(e) => setObBerita(e.target.value)}
                            placeholder="Contoh: Pembayaran talent..."
                            disabled={isSubmittingOrder}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {obVia === 'Cash' && (
                  <div className="p-3 bg-gray-50/50 rounded-2xl border border-gray-100">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Catatan Pembayaran Cash
                    </label>
                    <textarea
                      value={obNote}
                      onChange={(e) => setObNote(e.target.value)}
                      required
                      placeholder="Masukkan catatan / detail keperluan cash..."
                      disabled={isSubmittingOrder}
                      rows={3}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                    />
                  </div>
                )}

                {obVia === 'Qris' && (
                  <div className="p-3 bg-gray-50/50 rounded-2xl border border-gray-100 flex flex-col gap-3">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Upload QRIS / Nota QR
                    </label>
                    
                    <input
                      type="file"
                      accept="image/*"
                      ref={obFileInputRef}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setObQrisFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                    
                    <div 
                      onClick={() => {
                        if (!isSubmittingOrder) obFileInputRef.current?.click();
                      }}
                      className="flex flex-col items-center justify-center border-2 border-gray-300 border-dashed rounded-xl p-4 cursor-pointer bg-white hover:bg-gray-50 transition relative overflow-hidden"
                    >
                      {obQrisFile ? (
                        <div className="text-center">
                          <img src={URL.createObjectURL(obQrisFile)} alt="QRIS preview" className="w-full h-auto max-h-32 object-contain rounded-lg mx-auto mb-2" />
                          <p className="text-xs font-semibold text-gray-900 truncate max-w-[200px]">{obQrisFile.name}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Ketuk untuk mengganti</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center">
                          <ImageIcon className="w-8 h-8 text-gray-400 mb-1" />
                          <p className="text-sm text-gray-600 font-bold">Pilih Foto QRIS</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Upload image file QRIS</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {obVia === 'Ewallet' && (
                  <div className="space-y-4 p-3 bg-gray-50/50 rounded-2xl border border-gray-100">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Pilih E-Wallet
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { name: "Dana", logo: "https://i.ibb.co.com/zTTkGxx5/Dana.png" },
                          { name: "GoPay", logo: "https://i.ibb.co.com/YFzq1Mfn/gopay.png" },
                          { name: "ShopeePay", logo: "https://i.ibb.co.com/fdc2wYYR/shoppe.png" },
                        ].map(ew => (
                          <button
                            key={ew.name}
                            type="button"
                            onClick={() => setObEwalletName(ew.name)}
                            className={cn(
                              "p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer text-center",
                              obEwalletName === ew.name
                                ? "border-blue-500 bg-blue-50 text-blue-700 font-bold"
                                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                            )}
                          >
                            <img src={ew.logo} alt={ew.name} className="w-6 h-6 object-contain rounded" referrerPolicy="no-referrer" />
                            <span className="text-[10px] font-semibold">{ew.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {obEwalletName && (
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Nomor E-Wallet / HP
                        </label>
                        <input
                          type="text"
                          value={obEwalletNo}
                          onChange={(e) => setObEwalletNo(e.target.value)}
                          required
                          placeholder="Contoh: 0812xxxxxxxx"
                          disabled={isSubmittingOrder}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>
                )}

                {obVia === 'Virtual Akun' && (
                  <div className="p-3 bg-gray-50/50 rounded-2xl border border-gray-100">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Nomor Virtual Account (VA)
                    </label>
                    <input
                      type="text"
                      value={obVirtualNo}
                      onChange={(e) => setObVirtualNo(e.target.value)}
                      required
                      placeholder="Masukkan nomor VA lengkap"
                      disabled={isSubmittingOrder}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={
                    isSubmittingOrder || 
                    !obOrderType || 
                    !obKepada || 
                    !obAmount || 
                    !obVia || 
                    ((obOrderType === 'Reimburse' || obOrderType === 'Operational') && obNotaFiles.length === 0) ||
                    (obVia === 'Transfer' && (!obBank || !obRekNo || !obAtasNama)) || 
                    (obVia === 'Cash' && !obNote) || 
                    (obVia === 'Qris' && !obQrisFile) || 
                    (obVia === 'Ewallet' && (!obEwalletName || !obEwalletNo)) || 
                    (obVia === 'Virtual Akun' && !obVirtualNo)
                  }
                  className="w-full bg-blue-600 text-white font-bold rounded-xl py-3.5 shadow-sm hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 cursor-pointer"
                >
                  {isSubmittingOrder ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Proses Mengirim...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Ajukan Order Budget
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tambah Contact Modal */}
      <AnimatePresence>
        {(showAddVendorModal || showAddTallentModal) && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => {
                if (!isSubmittingContact) {
                  setShowAddVendorModal(false);
                  setShowAddTallentModal(false);
                }
              }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="relative bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <h3 className="text-lg font-bold text-gray-900">Tambah {showAddVendorModal ? 'Vendor' : 'Tallent'} Baru</h3>
                <button
                  onClick={() => {
                    setShowAddVendorModal(false);
                    setShowAddTallentModal(false);
                  }}
                  disabled={isSubmittingContact}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto min-h-0 custom-scrollbar">
                <form id="addContactForm" onSubmit={(e) => handleAddContact(e, showAddVendorModal ? 'Vendor' : 'Tallent')} className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Nama <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      placeholder={`Masukkan nama ${showAddVendorModal ? 'vendor' : 'tallent'}`}
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      disabled={isSubmittingContact}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 font-medium"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder={`Email ${showAddVendorModal ? 'vendor' : 'tallent'}`}
                      value={newContactEmail}
                      onChange={(e) => setNewContactEmail(e.target.value)}
                      disabled={isSubmittingContact}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 font-medium"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Phone
                    </label>
                    <input
                      type="tel"
                      placeholder={`Nomor telepon ${showAddVendorModal ? 'vendor' : 'tallent'}`}
                      value={newContactPhone}
                      onChange={(e) => setNewContactPhone(e.target.value)}
                      disabled={isSubmittingContact}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 font-medium"
                    />
                  </div>

                  {/* Usecase */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Usecase <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      placeholder={`Usecase (misal: ${showAddVendorModal ? 'Vendor Transport' : 'Actor'})`}
                      value={newContactUsecase}
                      onChange={(e) => setNewContactUsecase(e.target.value)}
                      disabled={isSubmittingContact}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 font-medium"
                    />
                  </div>

                  {/* Alamat */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Alamat
                    </label>
                    <textarea
                      placeholder={`Alamat lengkap ${showAddVendorModal ? 'vendor' : 'tallent'}`}
                      value={newContactAddress}
                      onChange={(e) => setNewContactAddress(e.target.value)}
                      disabled={isSubmittingContact}
                      rows={3}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 font-medium resize-none"
                    />
                  </div>

                  {/* Website */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Website <span className="text-gray-400 normal-case font-normal">(Optional)</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={newContactWebsite}
                      onChange={(e) => setNewContactWebsite(e.target.value)}
                      disabled={isSubmittingContact}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 font-medium"
                    />
                  </div>

                </form>
              </div>

              <div className="p-5 border-t border-gray-100 bg-white shrink-0 mt-auto">
                <button
                  type="submit"
                  form="addContactForm"
                  disabled={isSubmittingContact || !newContactName || !newContactUsecase}
                  className="w-full bg-blue-600 text-white font-bold rounded-xl py-3.5 shadow-sm hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmittingContact ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Tambah {showAddVendorModal ? 'Vendor' : 'Tallent'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
