import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Search, Loader2, AlertCircle, Calendar, 
  User, Image as ImageIcon, FileText, Link as LinkIcon, 
  MapPin, ShieldAlert, X, ExternalLink, Bookmark, Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { getSheetData } from '../lib/api';

interface IssueItem {
  timestamp: string;
  unitId: string;
  unitName: string;
  unitLogo: string;
  info: string;
  note: string;
  image01: string;
  file01: string;
  url01: string;
  status: string;
  titleDok: string;
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

export function Issues() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<IssueItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [unitFilter, setUnitFilter] = useState<string>(''); // empty means All
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);

        // 1. Fetch Units Map
        const unitMap = new Map<string, { name: string; logo: string }>();
        const unitRes = await getSheetData('Unit!A1:Z500').catch(() => null);
        if (unitRes?.values?.length > 0) {
          const headers = unitRes.values[0] as string[];
          const idIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ID');
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'UNIT NAME');
          const logoIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'LOGO' || h?.trim().toUpperCase() === 'IMAGE');
          
          if (idIdx > -1) {
            unitRes.values.slice(1).forEach((row: any[]) => {
              const uId = row[idIdx]?.trim() || '';
              if (uId) {
                unitMap.set(uId.toUpperCase(), {
                  name: nameIdx > -1 ? (row[nameIdx] || uId) : uId,
                  logo: logoIdx > -1 ? (row[logoIdx] || '') : '',
                });
              }
            });
          }
        }

        // 2. Fetch Dok Sub Task
        let dokRes = await getSheetData('Dok Sub Task!A1:Z3000').catch(() => null);
        if (!dokRes || !dokRes.values) {
          dokRes = await getSheetData('Dok Subtask!A1:Z3000').catch(() => null);
        }

        if (dokRes?.values?.length > 0) {
          const headers = dokRes.values[0] as string[];
          
          const getIndex = (names: string[]) => {
            return headers.findIndex(h => {
              if (!h) return false;
              const normalized = h.trim().toUpperCase().replace(/[\s._-]+/g, '');
              return names.some(n => normalized === n.toUpperCase().replace(/[\s._-]+/g, ''));
            });
          };

          const tsIdx = getIndex(['Timestamp', 'Time', 'Tanggal', 'Tgl', 'Date']);
          const unitIdx = getIndex(['Unit', 'UnitID', 'IDUnit', 'Unit Name', 'Nama Unit']);
          const infoIdx = getIndex(['Info', 'Keterangan', 'Info_01', 'InfoDetail', 'Detail']);
          const noteIdx = getIndex(['Note', 'Catatan', 'KeteranganNote']);
          const imageIdx = getIndex(['Image_01', 'Image01', 'Image', 'Foto', 'Photo', 'Gambar']);
          const fileIdx = getIndex(['File_01', 'File01', 'File', 'Dokumen', 'Lampiran']);
          const urlIdx = getIndex(['Url_01', 'Url01', 'Url', 'Link', 'Tautan']);
          const statusIdx = getIndex(['Status', 'KeteranganStatus', 'PaymentStatus', 'Payment']);
          const titleDokIdx = getIndex(['Title_Dok', 'TitleDok', 'Title', 'Name', 'FileName', 'File Name', 'Judul']);

          const fetchedIssues: IssueItem[] = [];

          dokRes.values.slice(1).forEach((row: any[]) => {
            const titleDokVal = titleDokIdx > -1 ? (row[titleDokIdx] || '').trim() : '';
            
            // Only process if Title_Dok is equal to "Issue" (case-insensitive)
            if (titleDokVal.toUpperCase() !== 'ISSUE') return;

            const unitRaw = unitIdx > -1 ? (row[unitIdx] || '').trim() : '';
            const unitEntry = unitMap.get(unitRaw.toUpperCase());
            const unitName = unitEntry ? unitEntry.name : (unitRaw || 'Unknown Unit');
            const unitLogo = unitEntry ? unitEntry.logo : '';

            fetchedIssues.push({
              timestamp: tsIdx > -1 ? (row[tsIdx] || '') : '',
              unitId: unitRaw,
              unitName,
              unitLogo,
              info: infoIdx > -1 ? (row[infoIdx] || '') : '',
              note: noteIdx > -1 ? (row[noteIdx] || '').trim() : '',
              image01: imageIdx > -1 ? (row[imageIdx] || '').trim() : '',
              file01: fileIdx > -1 ? (row[fileIdx] || '').trim() : '',
              url01: urlIdx > -1 ? (row[urlIdx] || '').trim() : '',
              status: statusIdx > -1 ? (row[statusIdx] || '').trim() : '',
              titleDok: titleDokVal,
            });
          });

          setIssues(fetchedIssues);
        }
      } catch (error) {
        console.error('Failed to load issues', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Filter Issues
  const filteredIssues = issues.filter(issue => {
    const matchSearch = 
      issue.info.toLowerCase().includes(search.toLowerCase()) || 
      issue.unitName.toLowerCase().includes(search.toLowerCase()) || 
      issue.note.toLowerCase().includes(search.toLowerCase());

    const isPaidStatus = issue.status?.trim().toLowerCase() === 'paid' || 
                         issue.status?.trim().toLowerCase() === 'lunas' || 
                         issue.status?.trim().toLowerCase() === 'done' || 
                         issue.status?.trim().toLowerCase() === 'selesai';
    const isEmptyStatus = !issue.status || issue.status.trim() === '';
    const isUnpaidStatus = !isEmptyStatus && !isPaidStatus;

    let matchStatus = true;
    if (statusFilter === 'PAID') matchStatus = isPaidStatus;
    else if (statusFilter === 'UNPAID') matchStatus = isUnpaidStatus;
    else if (statusFilter === 'NEW ISSUE') matchStatus = isEmptyStatus;

    let matchUnit = true;
    if (unitFilter) matchUnit = issue.unitName === unitFilter;

    return matchSearch && matchStatus && matchUnit;
  });

  const units = Array.from(new Set(issues.map(i => i.unitName).filter(Boolean)));

  // Extract list of statuses for filters
  const counts = {
    all: issues.length,
    paid: issues.filter(i => {
      const s = i.status?.trim().toLowerCase();
      return s === 'paid' || s === 'lunas' || s === 'done' || s === 'selesai';
    }).length,
    unpaid: issues.filter(i => {
      const s = i.status?.trim().toLowerCase();
      const isEmpty = !s || s.trim() === '';
      return !isEmpty && !(s === 'paid' || s === 'lunas' || s === 'done' || s === 'selesai');
    }).length,
    newIssue: issues.filter(i => {
      const s = i.status?.trim();
      return !s || s === '';
    }).length,
  };

  return (
    <div className="pb-24 bg-gray-50 min-h-screen relative">
      <header className="bg-[#429dbb] text-white px-5 py-4 shadow-md sticky top-0 z-40 w-full mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors shrink-0 cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-xl font-bold tracking-tight drop-shadow-sm flex-1">Daftar Issue</h1>
      </header>

      {/* Search and Filters */}
      <div className="px-4 flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="search" 
            placeholder="Cari issue, unit, atau catatan..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white shadow-sm border-gray-150 border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#429dbb] transition-all font-sans"
          />
        </div>
        <button 
          onClick={() => setShowFilter(true)}
          className="bg-white border border-gray-150 shadow-sm rounded-xl px-3 py-2.5 flex items-center justify-center shrink-[#1] hover:bg-gray-50 focus:ring-2 focus:ring-[#429dbb] transition-all cursor-pointer"
        >
          <Filter className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Main Issue List */}
      <div className="px-4 space-y-3">
        {isLoading && (
          <div className="flex flex-col justify-center items-center py-20 gap-2">
            <Loader2 className="w-8 h-8 text-[#429dbb] animate-spin" />
            <span className="text-sm font-semibold text-gray-500">Memuat info issue...</span>
          </div>
        )}
        
        {!isLoading && filteredIssues.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-150/80 p-6 shadow-sm">
            <AlertCircle className="w-10 h-10 text-gray-350 mx-auto mb-2.5" />
            <h3 className="font-bold text-gray-700">Tidak Ada Issue</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-[240px] mx-auto">Tidak ditemukan daftar issue yang sesuai dengan pencarian atau filter Anda.</p>
          </div>
        )}

         {!isLoading && filteredIssues.map((issue, idx) => {
          const isPaid = issue.status?.trim().toLowerCase() === 'paid' || 
                         issue.status?.trim().toLowerCase() === 'lunas' || 
                         issue.status?.trim().toLowerCase() === 'done' || 
                         issue.status?.trim().toLowerCase() === 'selesai';
          const isEmptyStatus = !issue.status || issue.status.trim() === '';
          
          return (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.04, 0.4), duration: 0.25 }}
              onClick={() => setSelectedIssue(issue)}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:border-gray-200 transition-all cursor-pointer active:scale-[0.99] hover:shadow-md relative overflow-hidden group"
            >
              {/* Top Row: Unit, Avatar, timestamp */}
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 bg-blue-50/60 rounded-full border border-blue-100/40 overflow-hidden shrink-0 flex items-center justify-center font-bold text-[#429dbb] text-xs">
                    {issue.unitLogo ? (
                      <img src={ubahKeDirectLink(issue.unitLogo)} alt={issue.unitName} className="w-full h-full object-cover" />
                    ) : (
                      <span>{issue.unitName.substring(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate leading-tight group-hover:text-[#429dbb] transition-colors">{issue.unitName}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{issue.timestamp}</p>
                  </div>
                </div>

                <div className="shrink-0">
                  <span className={cn(
                    "inline-block text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border",
                    isPaid 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                      : (isEmptyStatus 
                          ? "bg-sky-50 text-sky-700 border-sky-100" 
                          : "bg-rose-50 text-rose-700 border-rose-100")
                  )}>
                    {isPaid ? 'Paid' : (isEmptyStatus ? 'New Issue' : 'Unpaid')}
                  </span>
                </div>
              </div>

              {/* Middle Row: Title / Info */}
              <p className="text-sm font-bold text-gray-800 line-clamp-2 leading-snug pr-2 mb-2">
                {issue.info || 'No Title Info'}
              </p>

              {/* Note Preview if exists */}
              {issue.note && (
                <div className="bg-slate-50 border-l-2 border-slate-300 p-2 rounded-r-lg mb-2.5">
                  <p className="text-[11px] italic text-gray-500 line-clamp-1">
                    "{issue.note}"
                  </p>
                </div>
              )}

              {/* Bottom Row: Attachments badging indicator */}
              {(issue.image01 || issue.file01 || issue.url01) && (
                <div className="flex gap-2 mt-1">
                  {issue.image01 && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded-lg font-bold border border-blue-100/30">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      Foto
                    </span>
                  )}
                  {issue.file01 && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg font-bold border border-indigo-100/30">
                      <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      File
                    </span>
                  )}
                  {issue.url01 && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] text-violet-600 bg-violet-50 px-2 py-1 rounded-lg font-bold border border-violet-100/30">
                      <LinkIcon className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                      Link
                    </span>
                  )}
                </div>
              )}

            </motion.div>
          );
        })}
      </div>

      {/* POPUP MODAL: Issue Detail */}
      <AnimatePresence>
        {selectedIssue && (() => {
          const isPaid = selectedIssue.status?.trim().toLowerCase() === 'paid' || 
                         selectedIssue.status?.trim().toLowerCase() === 'lunas' || 
                         selectedIssue.status?.trim().toLowerCase() === 'done' || 
                         selectedIssue.status?.trim().toLowerCase() === 'selesai';
          const isEmptyStatus = !selectedIssue.status || selectedIssue.status.trim() === '';
          
          const popupStatusClass = isPaid 
            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
            : (isEmptyStatus 
                ? "bg-sky-50 text-sky-700 border-sky-100" 
                : "bg-rose-50 text-rose-700 border-rose-200");

          return (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedIssue(null)}
                className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
              />
              <motion.div
                initial={{ y: '100%', scale: 1 }}
                animate={{ y: 0, scale: 1 }}
                exit={{ y: '100%', scale: 1 }}
                transition={{ type: "spring", damping: 26, stiffness: 300 }}
                className="fixed bottom-0 sm:bottom-auto left-0 sm:left-auto right-0 sm:right-auto sm:top-1/2 sm:-translate-y-1/2 w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl z-[110] border border-gray-100 overflow-hidden flex flex-col shadow-2xl max-h-[85vh] sm:max-h-[90vh]"
              >
                {/* Modal Header */}
                <div className="px-5 py-4.5 border-b border-gray-100 flex items-center justify-between bg-white relative">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
                    <span className="font-bold text-gray-900 text-sm tracking-wide">Detail Laporan Issue</span>
                  </div>
                  <button 
                    onClick={() => setSelectedIssue(null)}
                    className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Content - Scrollable */}
                <div className="p-5 overflow-y-auto space-y-4 font-sans text-sm flex-1 scrollbar-thin">
                  {/* Judul Issue / Info */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Judul Issue</p>
                    <h3 className="font-extrabold text-gray-900 text-base leading-snug">
                      {selectedIssue.info || 'Tidak ada judul/keterangan'}
                    </h3>
                  </div>

                  {/* Unit & Timestamp row */}
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100/50">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Unit</p>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 bg-blue-50 rounded-full border border-blue-100/50 overflow-hidden shrink-0 flex items-center justify-center font-bold text-[#429dbb] text-[10px]">
                          {selectedIssue.unitLogo ? (
                            <img src={ubahKeDirectLink(selectedIssue.unitLogo)} alt={selectedIssue.unitName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{selectedIssue.unitName.substring(0,2).toUpperCase()}</span>
                          )}
                        </div>
                        <span className="font-bold text-gray-800 text-xs truncate" title={selectedIssue.unitName}>
                          {selectedIssue.unitName}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Timestamp</p>
                      <div className="flex items-center gap-1.5 text-xs text-gray-700 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{selectedIssue.timestamp || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="space-y-1 border-b border-gray-100/60 pb-3">
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Status</p>
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase border tracking-wider",
                      popupStatusClass
                    )}>
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        isPaid ? "bg-emerald-500 animate-pulse" : (isEmptyStatus ? "bg-sky-500 animate-pulse" : "bg-rose-500 animate-pulse")
                      )} />
                      {isPaid ? 'Paid' : (isEmptyStatus ? 'New Issue' : 'Unpaid')}
                    </span>
                  </div>

                  {/* Note Section if not empty */}
                  {selectedIssue.note && (
                    <div className="space-y-1.5 bg-amber-50/50 border-l-4 border-amber-400 p-3.5 rounded-r-xl">
                      <p className="text-[10px] uppercase font-extrabold text-amber-700 tracking-wider flex items-center gap-1">
                        <Bookmark className="w-3.5 h-3.5 fill-current" />
                        Catatan Tambahan
                      </p>
                      <p className="text-xs text-gray-700 font-medium italic whitespace-pre-wrap leading-relaxed">
                        "{selectedIssue.note}"
                      </p>
                    </div>
                  )}

                  {/* Attachments Section */}
                  {(selectedIssue.image01 || selectedIssue.file01 || selectedIssue.url01) && (
                    <div className="space-y-3.5 pt-1">
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Lampiran Dokumen</p>
                      
                      {/* Image Viewer Element */}
                      {selectedIssue.image01 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                            <ImageIcon className="w-3.5 h-3.5 text-blue-500" /> Image Preview
                          </p>
                          <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-slate-50 flex justify-center items-center h-48 max-h-48 group">
                            <img 
                              src={ubahKeDirectLink(selectedIssue.image01)} 
                              alt="Attachment Preview" 
                              onError={(e) => {
                                // fallback if image fails to load
                                e.currentTarget.style.display = 'none';
                              }}
                              className="w-full h-full object-cover transition-transform group-hover:scale-102 duration-300" 
                            />
                            <a 
                              href={selectedIssue.image01} 
                              target="_blank" 
                              rel="noreferrer"
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1 cursor-pointer"
                            >
                              <ExternalLink className="w-4 h-4" /> Buka Foto Ukuran Penuh
                            </a>
                          </div>
                        </div>
                      )}

                      {/* File Card Attachment */}
                      {selectedIssue.file01 && (
                        <a 
                          href={selectedIssue.file01}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between p-3 rounded-xl border border-dashed border-indigo-150 bg-indigo-50/20 hover:bg-indigo-50/50 transition-colors group cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600 shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-indigo-950 truncate">Dokumen Lampiran</p>
                              <p className="text-[9px] text-gray-400 truncate font-mono">Buka file / Drive</p>
                            </div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600 transition-colors shrink-0" />
                        </a>
                      )}

                      {/* Links Card Attachment */}
                      {selectedIssue.url01 && (
                        <a 
                          href={selectedIssue.url01}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between p-3 rounded-xl border border-dashed border-violet-150 bg-violet-50/20 hover:bg-violet-50/50 transition-colors group cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2 rounded-lg bg-violet-100 text-violet-600 shrink-0">
                              <LinkIcon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-violet-950 truncate">Link Tautan</p>
                              <p className="text-[9px] text-gray-400 truncate font-mono">{selectedIssue.url01}</p>
                            </div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-violet-400 group-hover:text-violet-600 transition-colors shrink-0" />
                        </a>
                      )}
                    </div>
                  )}

                </div>

                {/* Modal Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                  <button 
                    type="button"
                    onClick={() => setSelectedIssue(null)}
                    className="px-5 py-2 bg-[#429dbb] hover:bg-[#32849d] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>

      {/* Slide Up Filter (BottomSheet) */}
      <AnimatePresence>
        {showFilter && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilter(false)}
              className="fixed inset-0 bg-black/50 z-[120]"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-2xl z-[130] overflow-hidden shadow-2xl pb-safe"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0">
                <h3 className="font-bold text-gray-900 text-sm">Filter Issue</h3>
                <button onClick={() => setShowFilter(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="p-4 space-y-6 max-h-[60vh] overflow-y-auto">
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">Status</h4>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'ALL', label: `Semua (${counts.all})` },
                      { key: 'PAID', label: `Paid (${counts.paid})` },
                      { key: 'UNPAID', label: `Unpaid (${counts.unpaid})` },
                      { key: 'NEW ISSUE', label: `New Issue (${counts.newIssue})` }
                    ].map((st) => (
                      <button
                        key={st.key}
                        type="button"
                        onClick={() => setStatusFilter(st.key)}
                        className={cn(
                          "px-4 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer",
                          statusFilter === st.key 
                            ? "bg-[#e5f5f9] border-[#429dbb] text-[#256e84]" 
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {units.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">Unit</h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setUnitFilter('')}
                        className={cn(
                          "px-4 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer",
                          unitFilter === '' 
                            ? "bg-[#e5f5f9] border-[#429dbb] text-[#256e84]" 
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        Semua Unit
                      </button>
                      {units.map((unit) => (
                        <button
                          key={unit}
                          type="button"
                          onClick={() => setUnitFilter(unit === unitFilter ? '' : unit)}
                          className={cn(
                            "px-4 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer",
                            unitFilter === unit 
                              ? "bg-[#e5f5f9] border-[#429dbb] text-[#256e84]" 
                              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          {unit}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-white border-t border-gray-100 flex gap-3">
                <button 
                  type="button"
                  onClick={() => {
                    setStatusFilter('ALL');
                    setUnitFilter('');
                  }}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer text-xs"
                >
                  Reset
                </button>
                <button 
                  type="button"
                  onClick={() => setShowFilter(false)}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-[#429dbb] hover:bg-[#32849d] transition-colors shadow-sm cursor-pointer text-xs"
                >
                  Terapkan
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
