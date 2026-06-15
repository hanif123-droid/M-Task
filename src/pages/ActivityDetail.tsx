import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Edit2, DollarSign, Clock, Paperclip, CheckCircle2, FileText, Loader2, X, Plus, ChevronUp, ChevronDown, Image as ImageIcon, Link as LinkIcon, StickyNote, File as FileIcon, Globe } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { getSheetData, appendSheetData } from '../lib/api';
import { DriveService } from '../lib/driveService';
import { auth } from '../lib/firebase';
import { CameraModal } from '../components/CameraModal';

function formatIDR(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

function formatDateMMDDYY(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
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
  // If it's today and within a few hours or just exactly today, we can output 'Just Now', let's just make it simple: if date is today, return 'Just Now'
  const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (isToday) return 'Just Now';
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

const ubahKeDirectLink = (urlDrive: string) => {
  if (!urlDrive) return '';
  const match = urlDrive.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
  }
  return urlDrive;
};

function PhotoViewer({ src, alt }: { src: string, alt: string }) {
  const [loading, setLoading] = useState(true);
  const directLink = ubahKeDirectLink(src);

  return (
    <div className="image-container relative flex flex-col items-center justify-center min-h-[250px] w-full rounded-2xl bg-gray-50/80 shadow-inner border border-gray-100 overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-2 z-10 bg-gray-50/50 backdrop-blur-sm">
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
          "w-full h-auto object-contain max-h-[60vh] transition-all duration-500 ease-out",
          loading ? "opacity-0 scale-95" : "opacity-100 scale-100"
        )}
      />
    </div>
  );
}

export function ActivityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [activity, setActivity] = useState<any>(null);
  
  const [expandDocuments, setExpandDocuments] = useState(true);
  
  const [editInstructionModal, setEditInstructionModal] = useState(false);
  const [tempInstruction, setTempInstruction] = useState('');
  
  const [editAmountModal, setEditAmountModal] = useState(false);
  const [tempAmount, setTempAmount] = useState('');

  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [addDocType, setAddDocType] = useState<'Photo' | 'File' | 'Link' | 'Note' | null>(null);
  const [addDocTitle, setAddDocTitle] = useState('');
  const [addDocFile, setAddDocFile] = useState<File | null>(null);
  const [addDocLink, setAddDocLink] = useState('');
  const [addDocNote, setAddDocNote] = useState('');
  const [isUploadingDok, setIsUploadingDok] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [dokHeaders, setDokHeaders] = useState<string[]>([]);
  const [dokSheetName, setDokSheetName] = useState<string>('Dok Sub Task');
  const [dokCount, setDokCount] = useState<number>(0);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        setIsLoading(true);
        const [subRes1, subRes2, userRes, dokRes1, dokRes2] = await Promise.all([
          getSheetData('Subtask!A1:Z3000').catch(() => null),
          getSheetData('Sub Task!A1:Z3000').catch(() => null),
          getSheetData('User!A1:Z500').catch(() => null),
          getSheetData('Dok Sub Task!A1:Z3000').catch(() => null),
          getSheetData('Dok Subtask!A1:Z3000').catch(() => null),
        ]);

        const userMap = new Map<string, { photo: string, name: string }>();
        if (userRes?.values?.length > 0) {
          const headers = userRes.values[0] as string[];
          const emailIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'EMAIL');
          const photoIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PHOTO' || h?.trim().toUpperCase() === 'AVATAR');
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'NAME');
          if (emailIdx > -1) {
            userRes.values.slice(1).forEach((row: any[]) => {
              const email = row[emailIdx]?.trim();
              if (email) {
                userMap.set(email, {
                  photo: (photoIdx > -1 && row[photoIdx]) ? row[photoIdx] : `https://ui-avatars.com/api/?name=${encodeURIComponent(row[nameIdx] || email)}&background=eff6ff&color=3b82f6`,
                  name: (nameIdx > -1 && row[nameIdx]) ? row[nameIdx] : email.split('@')[0],
                });
              }
            });
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
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TITLE_DOK' || h?.trim().toUpperCase() === 'TITLE DOK' || h?.trim().toUpperCase() === 'NAME' || h?.trim().toUpperCase() === 'FILE NAME' || h?.trim().toUpperCase() === 'TITLE');
          const typeIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'DOK_TYPE' || h?.trim().toUpperCase() === 'DOK TYPE' || h?.trim().toUpperCase() === 'TYPE');
          const tsIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TIMESTAMP' || h?.trim().toUpperCase() === 'TIME' || h?.trim().toUpperCase() === 'DATE');
          const image01Idx = headers.findIndex(h => h?.trim().toUpperCase() === 'IMAGE_01' || h?.trim().toUpperCase() === 'IMAGE 01' || h?.trim().toUpperCase() === 'IMAGE');
          const noteIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'NOTE');
          const file01Idx = headers.findIndex(h => h?.trim().toUpperCase() === 'FILE_01' || h?.trim().toUpperCase() === 'FILE 01' || h?.trim().toUpperCase() === 'FILE');
          const url01Idx = headers.findIndex(h => h?.trim().toUpperCase() === 'URL_01' || h?.trim().toUpperCase() === 'URL 01' || h?.trim().toUpperCase() === 'URL');
          
          if (subIdIdx > -1) {
            dokRes.values.slice(1).forEach((row: any[]) => {
              if (row[subIdIdx]?.trim() === id) {
                documents.push({
                  id: dokIdIdx > -1 ? row[dokIdIdx] : Math.random().toString(),
                  name: nameIdx > -1 ? row[nameIdx] : 'Unknown Document',
                  type: typeIdx > -1 ? row[typeIdx]?.trim() : 'File',
                  timestamp: tsIdx > -1 ? row[tsIdx] : '',
                  image01: image01Idx > -1 ? row[image01Idx] : '',
                  note: noteIdx > -1 ? row[noteIdx] : '',
                  file01: file01Idx > -1 ? row[file01Idx] : '',
                  url01: url01Idx > -1 ? row[url01Idx] : '',
                });
              }
            });
          }
        }

        const subRes = subRes2?.values ? subRes2 : subRes1;
        if (subRes?.values?.length > 0) {
          const headers = subRes.values[0] as string[];
          const subtaskIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'SUBTASK ID' || h?.trim().toUpperCase() === 'ID');
          const titleIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'SUBTASK NAME' || h?.trim().toUpperCase() === 'SUBTASK' || h?.trim().toUpperCase() === 'TITLE');
          const instIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'SUBTASK INSTRUCTION' || h?.trim().toUpperCase() === 'INSTRUCTION' || h?.trim().toUpperCase() === 'DESC');
          const statusIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'STATUS');
          const expIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'AMOUNT' || h?.trim().toUpperCase() === 'EXPENSES' || h?.trim().toUpperCase() === 'EXPENSE');
          const dueIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'SUBTASK DUE DATE' || h?.trim().toUpperCase() === 'DUE DATE');
          const userIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'USER' || h?.trim().toUpperCase() === 'ASSIGNED TO');

          if (subtaskIdIdx > -1) {
            const row = subRes.values.slice(1).find((r: any[]) => r[subtaskIdIdx]?.trim() === id);
            if (row) {
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
                documents: documents
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

  const handleAddDocumentSubmit = async () => {
    if (!addDocType) return;
    try {
      setIsUploadingDok(true);
      
      let finalImageUrl = '';
      let finalFileUrl = '';
      let finalLink = '';
      let finalNote = '';
      
      if (addDocType === 'Photo' && addDocFile) {
        const res = await DriveService.uploadFile(addDocFile);
        finalImageUrl = `https://drive.google.com/file/d/${res.id}/view?usp=drivesdk`;
      } else if (addDocType === 'File' && addDocFile) {
        const res = await DriveService.uploadFile(addDocFile);
        finalFileUrl = `https://drive.google.com/file/d/${res.id}/view?usp=drivesdk`;
      } else if (addDocType === 'Link') {
        finalLink = addDocLink;
      } else if (addDocType === 'Note') {
        finalNote = addDocNote;
      }
      
      const newDokId = `DSK-${new Date().getTime().toString().slice(-6)}`;
      const ts = (() => {
        const d = new Date();
        return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
      })();
      const currentUserEmail = auth.currentUser?.email || 'guest@example.com';
      
      // Determine what to append based on existing headers
      let headersToUse = dokHeaders.length > 0 ? dokHeaders : [];
      let newRow: any[] = [];
      
      // Fallback ordered columns if we cannot find headers (assuming standard order):
      // Timestamp | Dok Sub ID | Sub_ID | User | Title_Dok | Dok_Type | Image_01 | Note | File_01 | Url_01
      if (headersToUse.length === 0) {
        headersToUse = ['Timestamp', 'Dok Sub ID', 'Sub_ID', 'User', 'Title_Dok', 'Dok_Type', 'Image_01', 'Note', 'File_01', 'Url_01'];
      }
      
      newRow = new Array(headersToUse.length).fill('');
      
      const setCol = (name: string, value: string) => {
        const idx = headersToUse.findIndex(h => {
             const key = h?.trim().toUpperCase() || '';
             return key === name.toUpperCase() || key.includes(name.toUpperCase());
        });
        if (idx > -1) {
          newRow[idx] = value;
        }
      };
      
      setCol('TIMESTAMP', ts);
      setCol('DOK SUB ID', newDokId);
      setCol('SUB_ID', id || '');
      setCol('USER', currentUserEmail);
      setCol('TITLE_DOK', addDocTitle || ' ');
      setCol('DOK_TYPE', addDocType);
      
      const imageIdx = headersToUse.findIndex(h => h?.trim().toUpperCase() === 'IMAGE_01' || h?.trim().toUpperCase() === 'IMAGE 01');
      if (imageIdx > -1) newRow[imageIdx] = finalImageUrl;
      
      const fileIdx = headersToUse.findIndex(h => h?.trim().toUpperCase() === 'FILE_01' || h?.trim().toUpperCase() === 'FILE 01');
      if (fileIdx > -1) newRow[fileIdx] = finalFileUrl;
      
      const urlIdx = headersToUse.findIndex(h => h?.trim().toUpperCase() === 'URL_01' || h?.trim().toUpperCase() === 'URL 01');
      if (urlIdx > -1) newRow[urlIdx] = finalLink;
      
      const noteIdx = headersToUse.findIndex(h => h?.trim().toUpperCase() === 'NOTE');
      if (noteIdx > -1) newRow[noteIdx] = finalNote;

      await appendSheetData(`${dokSheetName}!A1:Z`, [newRow]);
      
      // Add to local state
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
    } catch (err: any) {
      if (err.message !== 'Mock authentication used, bypassing Sheets API' && err.message !== 'Not authenticated') {
        alert('Gagal menambahkan dokumen: ' + err.message);
      } else {
        alert('Preview limits: Firebase not fully configured, bypass upload.');
        setShowAddDocModal(false);
      }
    } finally {
      setIsUploadingDok(false);
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
          <div className="flex items-start justify-between gap-3 mb-2">
            <h2 className="text-xl font-bold text-gray-900 leading-tight flex-1">{activity.title}</h2>
            <button 
              onClick={() => {
                setTempInstruction(activity.instruction || '');
                setEditInstructionModal(true);
              }}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
          {activity.instruction && (
            <p className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100 italic">
              {activity.instruction}
            </p>
          )}
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap",
              (() => {
                const s = activity.status.toLowerCase();
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Expenses</p>
              <p className="text-lg font-bold text-gray-900">{formatIDR(activity.expense)}</p>
            </div>
          </div>
          <button 
            onClick={() => {
              setTempAmount(activity.expense.toString());
              setEditAmountModal(true);
            }}
            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors shrink-0"
          >
            <Edit2 className="w-4 h-4" />
          </button>
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
          <div className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg", dueInfo.isOverdue ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600")}>
             {dueInfo.days} {dueInfo.label}
          </div>
        </div>

        {/* Card 6: Assigned To */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
          <img src={activity.assignedTo.photo || undefined} alt="Assigned User" className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0" />
          <div className="flex flex-col justify-center">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Assigned To</span>
            <span className="text-sm font-bold text-gray-900 leading-none">{activity.assignedTo.name}</span>
          </div>
        </div>

        {/* Card 7: Attached Document */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
                     <p className="text-center text-gray-500 text-sm py-2">Tidak ada dokumen.</p>
                  ) : (
                    activity.documents.map((doc: any) => {
                      const typeLower = (doc.type || '').toLowerCase();
                      let DocIcon = FileText;
                      if (typeLower.includes('photo') || typeLower.includes('image')) DocIcon = ImageIcon;
                      else if (typeLower.includes('note')) DocIcon = StickyNote;
                      else if (typeLower.includes('link')) DocIcon = LinkIcon;
                      else if (typeLower.includes('file')) DocIcon = File;
                      
                      return (
                        <div 
                          key={doc.id} 
                          className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:bg-blue-50 transition-colors"
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
                          <p className="text-sm font-medium text-gray-900 truncate flex-1">{doc.name}</p>
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
        <button className="w-full bg-emerald-600 rounded-xl shadow-sm border border-emerald-600 p-4 flex items-center justify-center gap-2 text-white font-bold hover:bg-emerald-700 transition-colors text-lg mt-6">
          <CheckCircle2 className="w-6 h-6" />
          Done
        </button>

      </div>

      {/* Instruction Modal */}
      <AnimatePresence>
        {editInstructionModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setEditInstructionModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden z-10 flex flex-col"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Edit Instruction</h3>
                <button onClick={() => setEditInstructionModal(false)} className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                <textarea 
                  className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[120px] resize-none text-sm text-gray-700"
                  placeholder="Isi instruksi di sini..."
                  value={tempInstruction}
                  onChange={(e) => setTempInstruction(e.target.value)}
                />
              </div>
              <div className="p-4 bg-gray-50 flex gap-3">
                <button 
                  onClick={() => setEditInstructionModal(false)}
                  className="flex-1 py-2.5 font-bold text-sm text-gray-600 bg-white border border-gray-300 rounded-xl shadow-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setActivity({...activity, instruction: tempInstruction});
                    setEditInstructionModal(false);
                  }}
                  className="flex-1 py-2.5 font-bold text-sm text-white bg-blue-600 rounded-xl shadow-sm hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Amount Modal */}
      <AnimatePresence>
        {editAmountModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setEditAmountModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden z-10 flex flex-col"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Edit Expenses</h3>
                <button onClick={() => setEditAmountModal(false)} className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 font-bold text-sm">Rp</span>
                  </div>
                  <input 
                    type="number"
                    className="w-full border border-gray-300 rounded-xl pl-10 pr-3 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 font-semibold"
                    placeholder="0"
                    value={tempAmount}
                    onChange={(e) => setTempAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="p-4 bg-gray-50 flex gap-3">
                <button 
                  onClick={() => setEditAmountModal(false)}
                  className="flex-1 py-2.5 font-bold text-sm text-gray-600 bg-white border border-gray-300 rounded-xl shadow-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    const parsed = parseInt(tempAmount, 10);
                    setActivity({...activity, expense: isNaN(parsed) ? 0 : parsed});
                    setEditAmountModal(false);
                  }}
                  className="flex-1 py-2.5 font-bold text-sm text-white bg-emerald-600 rounded-xl shadow-sm hover:bg-emerald-700 transition-colors"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-center gap-2">
                 <Clock className="w-4 h-4 text-gray-400" />
                 <span className="text-xs text-gray-500 font-medium">
                   {selectedDoc.timestamp ? new Date(selectedDoc.timestamp).toLocaleString() : 'No timestamp'}
                 </span>
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

      {/* Add Document Modal */}
      <AnimatePresence>
        {showAddDocModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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

                      {addDocType === 'Note' && (
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Note Content</label>
                          <textarea
                            value={addDocNote}
                            onChange={(e) => setAddDocNote(e.target.value)}
                            placeholder="Type your notes here..."
                            rows={4}
                            disabled={isUploadingDok}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none disabled:opacity-50"
                          />
                        </div>
                      )}
                      
                      {/* Additional spacing at the end if needed */}
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <button
                  onClick={handleAddDocumentSubmit}
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

    </div>
  );
}
