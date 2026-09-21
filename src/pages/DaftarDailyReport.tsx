import { useState, useEffect } from 'react';
import { ArrowLeft, Search, X, Loader2, AlertCircle, FileText, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getSheetDataFromId, getSheetData } from '../lib/api';
import { formatImageUrl, parseGvizDate, cn } from '../lib/utils';

export function DaftarDailyReport() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [res, userRes, unitRes] = await Promise.all([
        getSheetDataFromId("1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao", "Dok Sub Task!A1:Z3000").catch(() => null),
        getSheetData('User!A1:Z1000').catch(() => null),
        getSheetData('Unit!A1:Z500').catch(() => null)
      ]);
      
      const unitMap = new Map<string, { name: string; logo: string }>();
      if (unitRes?.values?.length > 0) {
        const headers = unitRes.values[0] as string[];
        const idIdx = headers.findIndex((h: string) => (h || '').trim().toUpperCase() === 'ID' || (h || '').trim().toUpperCase() === 'UNIT ID');
        const nameIdx = headers.findIndex((h: string) => (h || '').trim().toUpperCase() === 'UNIT NAME');
        const logoIdx = headers.findIndex((h: string) => (h || '').trim().toUpperCase() === 'LOGO' || (h || '').trim().toUpperCase() === 'IMAGE');
        
        unitRes.values.slice(1).forEach((row: any[]) => {
          const id = idIdx > -1 ? row[idIdx]?.trim() : '';
          const name = nameIdx > -1 ? row[nameIdx]?.trim() : id;
          const logo = logoIdx > -1 ? row[logoIdx]?.trim() : '';
          if (id) {
            unitMap.set(id, { name: name || id, logo: formatImageUrl(logo) || '' });
          }
        });
      }

      const userMap = new Map<string, { name: string; unitId: string; avatar: string }>();
      if (userRes?.values?.length > 0) {
        const headers = userRes.values[0] as string[];
        const emailIdx = headers.findIndex((h: string) => (h || '').trim().toUpperCase() === 'EMAIL');
        const nameIdx = headers.findIndex((h: string) => (h || '').trim().toUpperCase() === 'NAME');
        const unitBusIdx = headers.findIndex((h: string) => (h || '').trim().toUpperCase() === 'UNIT BUSINESS');
        const avatarIdx = headers.findIndex((h: string) => (h || '').trim().toUpperCase() === 'AVATAR' || (h || '').trim().toUpperCase() === 'PHOTO');
        
        userRes.values.slice(1).forEach((row: any[]) => {
          const email = emailIdx > -1 ? row[emailIdx]?.trim() : '';
          const name = nameIdx > -1 ? row[nameIdx]?.trim() : '';
          const unitId = unitBusIdx > -1 ? row[unitBusIdx]?.trim() : '';
          const avatar = avatarIdx > -1 ? formatImageUrl(row[avatarIdx]?.trim()) : '';
          if (email) {
            userMap.set(email.toLowerCase(), { name: name || email, unitId: unitId, avatar: avatar });
          }
        });
      }
      
      if (res?.values && res.values.length > 0) {
        const headers = res.values[0] as string[];
        const valueRows = res.values.slice(1) as string[][];
        
        const getColIndex = (headerName: string) => {
          const normName = headerName.trim().toUpperCase().replace(/[\s._-]+/g, '');
          return headers.findIndex(h => {
            if (!h) return false;
            const normH = h.trim().toUpperCase().replace(/[\s._-]+/g, '');
            if (normH === normName) return true;
            if (normName === 'IDDOK' && (normH === 'IDDOK' || normH === 'DOKSUBID')) return true;
            if (normName === 'TIMESTAMP' && (normH === 'TIMESTAMP' || normH === 'TIME')) return true;
            if (normName === 'TIME' && (normH === 'TIME' || normH === 'TIMESTAMP')) return true;
            return false;
          });
        };

        const idIdx = getColIndex('IDDOK');
        const timestampIdx = getColIndex('TIME') > -1 ? getColIndex('TIME') : getColIndex('TIMESTAMP');
        const userIdx = getColIndex('USER');
        const noteIdx = getColIndex('NOTE');
        const statusIdx = getColIndex('STATUS');
        const fileIdx = getColIndex('FILE01');
        const titleIdx = getColIndex('TITLEDOK');

        const parsed = valueRows.map((row, i) => {
          const getVal = (idx: number) => idx > -1 && idx < row.length ? row[idx]?.trim() || '' : '';
          
          return {
            id: getVal(idIdx),
            timestamp: parseGvizDate(getVal(timestampIdx)),
            userEmail: getVal(userIdx),
            title: getVal(titleIdx),
            note: getVal(noteIdx),
            status: getVal(statusIdx),
            file: getVal(fileIdx),
          };
        }).filter(item => item.id && item.id.toUpperCase().startsWith('DR-')).map(item => {
          const matchedUser = userMap.get((item.userEmail || '').toLowerCase());
          const userName = matchedUser ? matchedUser.name : item.userEmail;
          const unitId = matchedUser?.unitId || '';
          const matchedUnit = unitMap.get(unitId) || { name: unitId, logo: '' };
          return {
            ...item,
            user: item.title || userName,
            userNameOnly: userName,
            userAvatar: matchedUser?.avatar || '',
            unitName: matchedUnit.name,
            unitLogo: matchedUnit.logo
          };
        });
        
        setReports(parsed.reverse());
      } else {
        setReports([]);
      }
    } catch (err: any) {
      console.error('Error in DaftarDailyReport fetch:', err);
      setError(err?.message || 'Gagal memuat data laporan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const statuses = Array.from(
    new Set(
      reports
        .map((r) => (r.status || '').trim())
        .filter(Boolean)
    )
  );

  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      (report.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (report.user || '').toLowerCase().includes(search.toLowerCase()) ||
      (report.note || '').toLowerCase().includes(search.toLowerCase());
      
    const matchesStatus = statusFilter 
      ? (report.status || '').trim().toUpperCase() === statusFilter.trim().toUpperCase() 
      : true;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="pb-24 bg-gray-50 min-h-screen relative font-sans">
      <header className="bg-[#429dbb] text-white px-5 py-4 shadow-md sticky top-0 z-50 w-full mb-4 flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)} 
          className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight drop-shadow-sm">Daftar Daily Report</h1>
        </div>
      </header>
      
      <div className="px-4 mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="search" 
            placeholder="Cari ID, pelapor, catatan..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white shadow-sm border-gray-100 border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#429dbb] transition-all font-sans"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button 
          onClick={() => setShowFilter(true)}
          className={cn(
            "bg-white border border-gray-100 shadow-sm rounded-xl px-3 py-2.5 flex items-center justify-center shrink-0 hover:bg-gray-50 focus:ring-2 focus:ring-[#429dbb] transition-all cursor-pointer relative",
            statusFilter && "border-[#429dbb] text-[#429dbb] bg-[#429dbb]/5"
          )}
          title="Filter Status"
        >
          <Filter className={cn("w-5 h-5", statusFilter ? "text-[#429dbb]" : "text-gray-600")} />
          {statusFilter && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#429dbb] rounded-full"></span>
          )}
        </button>
      </div>

      {statusFilter && (
        <div className="px-4 mb-4 flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Filter:</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#429dbb]/10 text-[#429dbb] border border-[#429dbb]/20">
            Status: {statusFilter}
            <button 
              onClick={() => setStatusFilter(null)} 
              className="hover:text-red-500 p-0.5 rounded-full hover:bg-black/5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        </div>
      )}

      <div className="px-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 text-[#429dbb] animate-spin" />
            <p className="text-sm font-semibold text-gray-500">Memuat data...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-red-50 rounded-2xl border border-red-100 p-6 shadow-inner">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <p className="text-sm font-bold text-red-600 mb-3">{error}</p>
            <button
              onClick={fetchData}
              className="px-5 py-2 bg-red-600 text-white rounded-xl text-xs font-bold shadow hover:bg-red-700 transition active:scale-95 cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-600">Tidak ada report ditemukan.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredReports.map((report, idx) => (
              <motion.div
                onClick={() => navigate(`/daily-report/${report.id}`)}
                key={report.id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.05 }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-2 relative overflow-hidden cursor-pointer hover:shadow-md hover:border-gray-200 transition-all active:scale-[0.98]"
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-gray-500 font-mono tracking-wider">{report.id}</span>
                  </div>
                  {report.status && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide
                      ${report.status.toUpperCase() === 'REVIEW' ? 'bg-amber-100 text-amber-700' : 
                        report.status.toUpperCase() === 'DONE' ? 'bg-green-100 text-green-700' : 
                        'bg-gray-100 text-gray-600'}`
                    }>
                      {report.status}
                    </span>
                  )}
                </div>
                
                {report.user && (
                  <p className="text-sm font-bold text-gray-800 line-clamp-1">{report.user}</p>
                )}
                
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-medium">{report.timestamp}</span>
                  {report.userNameOnly && (
                    <div className="flex items-center gap-2 bg-gray-50/80 px-2 py-1.5 rounded-md border border-gray-100">
                      {report.userAvatar ? (
                        <img src={report.userAvatar} alt={report.userNameOnly} className="w-5 h-5 rounded-full object-cover border border-gray-200" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-[9px] font-bold border border-gray-300 shrink-0">
                          {report.userNameOnly.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-[10px] font-bold text-gray-600">{report.userNameOnly}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showFilter && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilter(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-2xl z-50 overflow-hidden shadow-2xl pb-safe"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0">
                <h3 className="font-bold text-gray-900">Filter Daily Report</h3>
                <button 
                  onClick={() => setShowFilter(false)} 
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="p-4 space-y-6 max-h-[60vh] overflow-y-auto">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Status Dok Sub Task</h4>
                  <div className="flex flex-wrap gap-2">
                    {statuses.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Tidak ada status yang tersedia.</p>
                    ) : (
                      statuses.map((st) => (
                        <button
                          key={st}
                          onClick={() => setStatusFilter(statusFilter === st ? null : st)}
                          className={cn(
                            "px-4 py-2 rounded-full text-sm font-medium border transition-all cursor-pointer",
                            statusFilter === st 
                              ? "bg-[#429dbb]/10 border-[#429dbb] text-[#429dbb] font-bold shadow-xs" 
                              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          {st}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white border-t border-gray-100 flex gap-3">
                <button 
                  onClick={() => {
                    setStatusFilter(null);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Reset
                </button>
                <button 
                  onClick={() => setShowFilter(false)}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-[#429dbb] hover:bg-[#388ba8] transition-colors shadow-sm cursor-pointer"
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
