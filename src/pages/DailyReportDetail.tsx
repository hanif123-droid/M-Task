import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Loader2, AlertCircle, FileText, Calendar, User, AlignLeft, Download, Send, MessageSquare, X, Maximize2, CheckCircle2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSheetDataFromId, getSheetData, updateSheetDataFromId } from '../lib/api';
import { formatImageUrl, cn, parseGvizDate } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;


const PDFPreview = ({ url, onClick }: { url: string, onClick: () => void }) => {
  const [numPages, setNumPages] = useState<number>();
  const [width, setWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm group"
    >
      <div className="relative group/pdf cursor-pointer w-full min-h-[300px] flex flex-col justify-center bg-white">
        <Document
          file={url}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          className="w-full flex flex-col items-center"
          loading={<div className="p-10 text-sm font-semibold text-gray-400 animate-pulse flex flex-col items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Memuat Dokumen...</div>}
          error={<div className="p-10 text-sm font-semibold text-red-400">Gagal memuat dokumen PDF.</div>}
        >
          {Array.from(new Array(numPages || 0), (el, index) => (
            <div key={`page_${index + 1}`}>
              <Page 
                pageNumber={index + 1} 
                renderTextLayer={false} 
                renderAnnotationLayer={false}
                className="bg-white overflow-hidden"
                width={width ? width : undefined}
              />
            </div>
          ))}
        </Document>
        {/* Transparent overlay to catch clicks for fullscreen */}
        <div 
          className="absolute inset-0 z-10 hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover/pdf:opacity-100"
          onClick={onClick}
        >
           <div className="bg-black/50 text-white px-4 py-2 rounded-xl backdrop-blur-sm text-sm font-bold flex items-center gap-2 sticky top-1/2 -translate-y-1/2">
             <Maximize2 className="w-4 h-4" /> Buka Layar Penuh
           </div>
        </div>
      </div>
    </div>
  );
};

export function DailyReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [fullscreenMedia, setFullscreenMedia] = useState<{url: string, type: 'pdf' | 'image' | 'video' | 'drive' | 'unknown'} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Current user and all users
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('mtask_user_email') || 'User');
  const [users, setUsers] = useState<any[]>([]);

  // Chat/Note states
  const [newChatText, setNewChatText] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  
  // Headers and row for updating
  const [headers, setHeaders] = useState<string[]>([]);
  const [rowIndex, setRowIndex] = useState(-1);

  // Fullscreen state
  

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [res, userRes, unitRes] = await Promise.all([
          getSheetDataFromId("1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao", "Dok Sub Task!A1:Z3000").catch(() => null),
          getSheetData('User!A1:Z1000').catch(() => null),
          getSheetData('Unit!A1:Z500').catch(() => null)
        ]);

        if (res?.values && res.values.length > 0) {
          const fetchedHeaders = res.values[0] as string[];
          setHeaders(fetchedHeaders);
          const valueRows = res.values.slice(1) as string[][];

          const getColIndex = (headerName: string) => {
            const normName = headerName.trim().toUpperCase().replace(/[\s._-]+/g, '');
            return fetchedHeaders.findIndex(h => {
              if (!h) return false;
              const normH = h.trim().toUpperCase().replace(/[\s._-]+/g, '');
              if (normH === normName) return true;
              if (normName === 'IDDOK' && (normH === 'IDDOK' || normH === 'DOKSUBID')) return true;
              if (normName === 'TIME' && (normH === 'TIME' || normH === 'TIMESTAMP')) return true;
              if (normName === 'TITLEDOK' && (normH === 'TITLEDOK' || normH === 'TITLE')) return true;
              return false;
            });
          };

          const idIdx = getColIndex('IDDOK');
          const timestampIdx = getColIndex('TIME') > -1 ? getColIndex('TIME') : getColIndex('TIMESTAMP');
          const userIdx = getColIndex('USER');
          const noteIdx = getColIndex('NOTE');
          const statusIdx = getColIndex('STATUS');
          const fileIdx = getColIndex('FILE01');
          const imageIdx = getColIndex('IMAGE01');
          const titleIdx = getColIndex('TITLEDOK');

          const foundIndex = valueRows.findIndex(row => {
             const rowId = idIdx > -1 && idIdx < row.length ? row[idIdx]?.trim() : '';
             return rowId === id;
          });

          if (foundIndex === -1) {
             setError("Laporan tidak ditemukan.");
             setIsLoading(false);
             return;
          }
          setRowIndex(foundIndex + 2); // +1 for header, +1 for 1-based indexing
          
          const targetRow = valueRows[foundIndex];
          const getVal = (idx: number) => idx > -1 && idx < targetRow.length ? targetRow[idx]?.trim() || '' : '';
          
          let userName = getVal(userIdx);
          let userAvatar = '';
          let unitName = '';
          let unitLogo = '';

          if (userRes?.values?.length > 0) {
            const userHeaders = userRes.values[0] as string[];
            const emailIdx = userHeaders.findIndex(h => (h || '').trim().toUpperCase() === 'EMAIL');
            const nameIdx = userHeaders.findIndex(h => (h || '').trim().toUpperCase() === 'NAME');
            const unitBusIdx = userHeaders.findIndex(h => (h || '').trim().toUpperCase() === 'UNIT BUSINESS');
            const avatarIdx = userHeaders.findIndex(h => (h || '').trim().toUpperCase() === 'AVATAR' || (h || '').trim().toUpperCase() === 'PHOTO');

            const allUsers = userRes.values.slice(1).map(r => ({
               email: (r[emailIdx] || '').trim(),
               name: (r[nameIdx] || '').trim(),
               avatar: formatImageUrl(avatarIdx > -1 ? r[avatarIdx] : '')
            }));
            setUsers(allUsers);

            const myEmail = localStorage.getItem('mtask_user_email') || '';
            const myMatchedUser = myEmail ? userRes.values.slice(1).find(r => (r[emailIdx] || '').trim().toLowerCase() === myEmail.toLowerCase()) : null;
            if (myMatchedUser) {
               setCurrentUser(myMatchedUser[nameIdx]?.trim() || myEmail);
            }
            const matchedUser = userRes.values.slice(1).find(r => (r[emailIdx] || '').trim().toLowerCase() === userName.toLowerCase());
            
            if (matchedUser) {
               userName = matchedUser[nameIdx]?.trim() || userName;
               userAvatar = formatImageUrl(avatarIdx > -1 ? matchedUser[avatarIdx] : '');
               const unitId = matchedUser[unitBusIdx]?.trim();
               
               if (unitId && unitRes?.values?.length > 0) {
                 const unitHeaders = unitRes.values[0] as string[];
                 const unitIdIdx = unitHeaders.findIndex(h => (h || '').trim().toUpperCase() === 'UNIT ID' || (h || '').trim().toUpperCase() === 'ID UNIT');
                 const unitNameIdx = unitHeaders.findIndex(h => (h || '').trim().toUpperCase() === 'UNIT NAME');
                 const unitLogoIdx = unitHeaders.findIndex(h => (h || '').trim().toUpperCase() === 'LOGO' || (h || '').trim().toUpperCase() === 'IMAGE');
                 
                 const matchedUnit = unitRes.values.slice(1).find(r => (r[unitIdIdx] || '').trim() === unitId);
                 if (matchedUnit) {
                    unitName = matchedUnit[unitNameIdx]?.trim() || unitId;
                    unitLogo = formatImageUrl(matchedUnit[unitLogoIdx]?.trim() || '');
                 }
               }
            }
          }

          const imageText = getVal(imageIdx);
          const images = imageText ? imageText.split('\n').map(img => formatImageUrl(img.trim())).filter(Boolean) : [];
          
          setReport({
            id: getVal(idIdx),
            timestamp: parseGvizDate(getVal(timestampIdx)),
            title: getVal(titleIdx),
            user: userName,
            userAvatar,
            note: getVal(noteIdx),
            status: getVal(statusIdx),
            file: getVal(fileIdx),
            images,
            unitName,
            unitLogo
          });

        } else {
          setError("Gagal memuat data laporan.");
        }
      } catch (err: any) {
        console.error('Error fetching DailyReportDetail:', err);
        setError(err?.message || 'Gagal memuat data laporan.');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  const colLetter = (idx: number) => {
    let temp, letter = '';
    let i = idx;
    while (i >= 0) {
      temp = i % 26;
      letter = String.fromCharCode(temp + 65) + letter;
      i = (i - temp) / 26 - 1;
    }
    return letter;
  };

  const handleMarkAsDone = async () => {
    if (rowIndex === -1) return;
    setIsSaving(true);
    try {
       let statusIdx = headers.findIndex(h => (h || '').trim().toUpperCase() === 'STATUS');
       if (statusIdx === -1) {
          statusIdx = headers.length;
          setHeaders([...headers, 'STATUS']);
       }

       const cellRange = `Dok Sub Task!${colLetter(statusIdx)}${rowIndex}`;
       await updateSheetDataFromId("1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao", cellRange, [['Done']]);

       setReport((prev: any) => ({ ...prev, status: 'Done' }));
    } catch (err) {
       console.error('Failed to mark as done', err);
       alert('Gagal mengupdate status');
    } finally {
       setIsSaving(false);
    }
  };

  const handleSendChat = async () => {
    if (!newChatText.trim() || rowIndex === -1) return;
    setIsSaving(true);
    try {
       const newEntry = `${currentUser} : ${newChatText.trim()}`;
       const currentNote = report?.note || '';
       const updatedNote = currentNote ? `${currentNote}\n${newEntry}` : newEntry;

       let noteIdx = headers.findIndex(h => (h || '').trim().toUpperCase() === 'NOTE');
       let colName = 'Note';
       
       if (noteIdx === -1) {
          noteIdx = headers.findIndex(h => (h || '').trim().toUpperCase() === 'CATATAN');
          if (noteIdx !== -1) colName = headers[noteIdx];
       }

       if (noteIdx === -1) {
          noteIdx = headers.length;
          setHeaders([...headers, 'Note']);
       }

       const cellRange = `Dok Sub Task!${colLetter(noteIdx)}${rowIndex}`;
       await updateSheetDataFromId("1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao", cellRange, [[updatedNote]]);

       setReport((prev: any) => ({ ...prev, note: updatedNote }));
       setNewChatText('');
    } catch (e) {
       console.error("Failed to save note:", e);
       alert("Gagal menyimpan catatan.");
    } finally {
       setIsSaving(false);
    }
  };

  const parseChatMessages = (text: string) => {
    if (!text) return [];
    const lines = text.split('\n').filter(l => l.trim() !== '');
    return lines.map(line => {
      const match = line.match(/^([a-zA-Z\s]+):\s*(.*)/);
      if (match) {
        return { sender: match[1].trim(), message: match[2].trim() };
      }
      return { sender: 'System/User', message: line };
    });
  };

  const chatMessages = report?.note ? parseChatMessages(report.note) : [];

  const getDriveFileId = (url: string) => {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    const idMatch = url.match(/id=([a-zA-Z0-9_-]+)/);
    if (idMatch) return idMatch[1];
    return null;
  };

  const getMediaType = (url: string) => {
    if (!url) return 'unknown';
    const lower = url.toLowerCase();
    if (lower.match(/\.(jpeg|jpg|gif|png|webp|svg|heic)(\?.*)?$/)) return 'image';
    if (lower.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/)) return 'video';
    if (lower.match(/\.(pdf)(\?.*)?$/)) return 'pdf';
    return 'unknown';
  };

  const renderMedia = (url: string) => {
    if (!url) return null;
    const type = getMediaType(url);
    const isDrive = url.includes('drive.google.com');
    const driveId = isDrive ? getDriveFileId(url) : null;

    // Use /preview for any Google Drive file to bypass X-Frame-Options/CORS issues natively
    if (isDrive && driveId) {
      return (
        <div className="relative w-full rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 shadow-sm group">
          <div className="relative group/drive cursor-pointer w-full h-[500px] md:h-[700px]">
            <iframe 
              src={`https://drive.google.com/file/d/${driveId}/preview`}
              className="w-full h-full bg-white" 
              title="Drive Preview"
              allow="autoplay; encrypted-media; fullscreen"
            />
            {/* Transparent overlay to catch clicks for fullscreen */}
            <div 
              className="absolute inset-0 z-10 hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover/drive:opacity-100"
              onClick={() => setFullscreenMedia({ url, type: 'drive' })}
            >
               <div className="bg-black/50 text-white px-4 py-2 rounded-xl backdrop-blur-sm text-sm font-bold flex items-center gap-2">
                 <Maximize2 className="w-4 h-4" /> Buka Layar Penuh
               </div>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'image') {
      return (
        <div className="relative w-full bg-slate-50 rounded-2xl overflow-hidden border border-gray-200 shadow-sm group cursor-pointer" onClick={() => setFullscreenMedia({ url, type })}>
           <img src={url} alt="Media" className="w-full h-auto max-h-[700px] object-contain mx-auto" />
           <div className="absolute inset-0 z-10 hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
             <div className="bg-black/50 text-white px-4 py-2 rounded-xl backdrop-blur-sm text-sm font-bold flex items-center gap-2">
               <Maximize2 className="w-4 h-4" /> Perbesar Gambar
             </div>
           </div>
        </div>
      );
    }
    
    if (type === 'video') {
      return (
        <div className="relative w-full bg-black rounded-2xl overflow-hidden shadow-sm group">
           <video src={url} className="w-full h-auto max-h-[700px] mx-auto cursor-pointer" onClick={() => setFullscreenMedia({ url, type })} controls playsInline />
        </div>
      );
    }

    // Native PDF or Unknown (Fallback to react-pdf)
    return <PDFPreview url={url} onClick={() => setFullscreenMedia({ url, type })} />;
  };

  return (
    <div className="pb-24 bg-gray-50 min-h-screen relative font-sans">
      <header className="bg-[#429dbb] text-white px-5 py-4 shadow-md sticky top-0 z-50 w-full mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button 
             onClick={() => navigate(-1)} 
             className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1 truncate">
            <h1 className="text-xl font-bold tracking-tight drop-shadow-sm truncate">Detail Laporan</h1>
          </div>
        </div>
        {isSaving && (
          <div className="bg-white/25 px-2.5 py-1 rounded-full flex items-center gap-1.5 shrink-0 text-white animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-[10px] font-bold">Menyimpan...</span>
          </div>
        )}
      </header>

      <div className="px-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 text-[#429dbb] animate-spin" />
            <p className="text-sm font-semibold text-gray-500">Memuat detail laporan...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-red-50 rounded-2xl border border-red-100 p-6 shadow-inner">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <p className="text-sm font-bold text-red-600 mb-3">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2 bg-red-600 text-white rounded-xl text-xs font-bold shadow hover:bg-red-700 transition active:scale-95 cursor-pointer"
            >
              Muat Ulang
            </button>
          </div>
        ) : report ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-4"
          >
            {/* Main Details Card */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
              <div className="flex justify-between items-start gap-4">
                 <div className="flex-1">
                   {report.title ? (
                     <>
                       <h2 className="text-xl font-extrabold text-gray-900 tracking-tight leading-tight">{report.title}</h2>
                       <p className="text-xs font-mono text-gray-400 mt-1">{report.id}</p>
                     </>
                   ) : (
                     <h2 className="text-xl font-extrabold text-gray-900 tracking-tight leading-tight">{report.id}</h2>
                   )}
                 </div>
                 {report.status && (
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0
                        ${report.status.toUpperCase() === 'REVIEW' ? 'bg-amber-100 text-amber-700' : 
                           report.status.toUpperCase() === 'DONE' ? 'bg-green-100 text-green-700' : 
                           'bg-gray-100 text-gray-600'}`
                      }>
                        {report.status}
                      </span>
                      
                    </div>
                 )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                 <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1"><User className="w-3 h-3" /> Pelapor</span>
                    <div className="flex items-center gap-2">
                      {report.userAvatar ? (
                        <img src={report.userAvatar} alt={report.user} className="w-6 h-6 rounded-full object-cover border border-gray-100" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold border border-blue-200">
                           {(report.user || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <p className="text-sm font-semibold text-gray-800">{report.user || '-'}</p>
                    </div>
                 </div>
                 <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1"><Calendar className="w-3 h-3" /> Waktu</span>
                    <p className="text-sm font-semibold text-gray-800">{report.timestamp || '-'}</p>
                 </div>
              </div>
              
              {report.unitName && (
                 <div className="pt-3 border-t border-gray-50 flex items-center gap-2">
                    {report.unitLogo && (
                       <img src={report.unitLogo} alt={report.unitName} className="w-6 h-6 rounded-full object-cover border border-gray-100" />
                    )}
                    <span className="text-sm font-bold text-gray-700">{report.unitName}</span>
                 </div>
              )}
            </div>

            {/* File Laporan Utama */}
            {report.file && (
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col gap-3">
                 <h3 className="text-xs uppercase font-extrabold text-gray-400 tracking-wider flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Dokumen Laporan</h3>
                 {renderMedia(report.file)}
              </div>
            )}

            {/* Note / Discussion (Styled like OrderDetail Catatan) */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-[#429dbb] rounded-full" />
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Catatan Diskusi</h3>
              </div>

              {/* Chat Stream View */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 min-h-[120px] max-h-[300px] overflow-y-auto space-y-3 shadow-inner">
                {chatMessages.length === 0 ? (
                  <div className="h-24 flex flex-col items-center justify-center text-center">
                    <MessageSquare className="w-6 h-6 text-slate-300 mb-2" />
                    <p className="text-gray-400 text-xs font-medium">Belum ada catatan atau komentar.</p>
                  </div>
                ) : (
                  chatMessages.map((msg, i) => {
                    const sLower = msg.sender.toLowerCase();
                    const isMe = sLower === currentUser.toLowerCase();
                    
                    let themeBg = isMe ? 'bg-[#429dbb] border-[#429dbb] text-white' : 'bg-white border-slate-200';
                    let tagColor = isMe ? 'text-blue-100' : 'text-slate-600';
                    let messageColor = isMe ? 'text-white' : 'text-gray-700';
                    let layoutClass = isMe ? 'flex-row-reverse' : 'flex-row';

                    const userMatch = users.find(u => u.name.toLowerCase() === sLower);
                    const avatarUrl = userMatch?.avatar;
                    const initial = msg.sender.charAt(0).toUpperCase();

                    return (
                      <div key={`msg-${i}`} className={`flex items-start gap-2.5 ${layoutClass}`}>
                        <div className="shrink-0 mt-0.5">
                           {avatarUrl ? (
                             <img src={avatarUrl} alt={msg.sender} className="w-7 h-7 rounded-full object-cover border border-gray-200" />
                           ) : (
                             <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold border border-slate-200">
                                {initial}
                             </div>
                           )}
                        </div>
                        <div className={cn("px-3 py-2.5 rounded-2xl border flex flex-col text-xs shadow-sm max-w-[85%]", themeBg)}>
                          <span className={cn("font-extrabold text-[10px] tracking-wide mb-0.5", tagColor, isMe ? "text-right" : "")}>
                            {msg.sender}
                          </span>
                          <p className={cn("leading-normal font-medium whitespace-pre-wrap", messageColor)}>{msg.message}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="space-y-3 pt-2">
                

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
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Images / Lampiran */}
            {report.images && report.images.length > 0 && (
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
                 <h3 className="text-xs uppercase font-extrabold text-gray-400 tracking-wider flex items-center gap-1.5">Lampiran Tambahan</h3>
                 <div className="flex flex-col gap-5">
                    {report.images.map((imgUrl: string, idx: number) => (
                       <div key={idx} className="w-full">
                          {renderMedia(imgUrl)}
                       </div>
                    ))}
                 </div>
              </div>
            )}
          
            {/* Mark as Done Button at bottom */}
            {(localStorage.getItem('mtask_user_email') || '').toLowerCase() === 'adi.grinder.9@gmail.com' && report.status && report.status.toUpperCase() !== 'DONE' && (
              <div className="pt-6 border-t border-gray-100 flex justify-end">
                <button 
                  onClick={handleMarkAsDone}
                  disabled={isSaving}
                  className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-2xl text-sm font-bold shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  MARK AS DONE
                </button>
              </div>
            )}
          </motion.div>
        ) : null}
      </div>

      {/* Fullscreen Media Modal */}
      <AnimatePresence>
        {fullscreenMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm"
          >
            <div className="flex justify-between items-center p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10">
              <a 
                href={fullscreenMedia.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 backdrop-blur-md border border-white/10"
              >
                Buka di Tab Baru
              </a>
              <button 
                onClick={() => setFullscreenMedia(null)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md border border-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 w-full h-full flex items-center justify-center p-4 md:p-8 pt-16">
              {fullscreenMedia.type === 'image' && (
                <img src={fullscreenMedia.url} alt="Fullscreen Media" className="w-full h-full object-contain" />
              )}
              {fullscreenMedia.type === 'video' && (
                <video src={fullscreenMedia.url} className="w-full h-full object-contain" controls autoPlay playsInline />
              )}
              {fullscreenMedia.type === 'drive' && (
                <iframe 
                  src={`https://drive.google.com/file/d/${getDriveFileId(fullscreenMedia.url)}/preview`}
                  className="w-full h-full bg-white rounded-xl shadow-2xl" 
                  title="Drive Fullscreen Preview"
                  allow="autoplay; encrypted-media; fullscreen"
                />
              )}
              {fullscreenMedia.type !== 'image' && fullscreenMedia.type !== 'video' && fullscreenMedia.type !== 'drive' && (
                <object 
                  data={fullscreenMedia.url} 
                  type="application/pdf" 
                  className="w-full h-full bg-white rounded-xl shadow-2xl"
                >
                  <iframe 
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(fullscreenMedia.url)}&embedded=true`}
                    className="w-full h-full bg-white rounded-xl shadow-2xl"
                    title="PDF Fullscreen Fallback"
                  />
                </object>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}