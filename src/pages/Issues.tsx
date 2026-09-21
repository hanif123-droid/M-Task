import { useState, useEffect } from 'react';
import { ArrowLeft, Search, X, Loader2, RefreshCw, AlertTriangle, AlertCircle, MapPin, Filter } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatImageUrl } from '../lib/utils';
import { getSheetData } from '../lib/api';

export function Issues() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('q') || searchParams.get('search') || '';
  const [search, setSearch] = useState(initialSearch);

  useEffect(() => {
    const q = searchParams.get('q') || searchParams.get('search');
    if (q) {
      setSearch(q);
    }
  }, [searchParams]);
  const [issues, setIssues] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [showFilter, setShowFilter] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [issueRes1, issueRes2, unitRes, userRes] = await Promise.all([
        getSheetData('ISSUE!A1:Z1000').catch(() => null),
        getSheetData('Issue!A1:Z1000').catch(() => null),
        getSheetData('Unit!A1:Z500').catch(() => null),
        getSheetData('User!A1:Z1000').catch(() => null)
      ]);

      // Parse Units
      const unitMap = new Map<string, { name: string; logo: string }>();
      const parsedUnits: any[] = [];
      if (unitRes?.values?.length > 0) {
        const headers = unitRes.values[0] as string[];
        const idIdx = headers.findIndex(h => (h || '').trim().toUpperCase() === 'ID' || (h || '').trim().toUpperCase() === 'UNIT ID');
        const nameIdx = headers.findIndex(h => (h || '').trim().toUpperCase() === 'UNIT NAME');
        const logoIdx = headers.findIndex(h => (h || '').trim().toUpperCase() === 'LOGO' || (h || '').trim().toUpperCase() === 'IMAGE');
        
        unitRes.values.slice(1).forEach((row: any[]) => {
          const id = idIdx > -1 ? row[idIdx]?.trim() : '';
          const name = nameIdx > -1 ? row[nameIdx]?.trim() : id;
          const logo = logoIdx > -1 ? row[logoIdx]?.trim() : '';
          if (id) {
            const unitInfo = { name: name || id, logo: logo || '' };
            unitMap.set(id, unitInfo);
            unitMap.set(name, unitInfo); // key by both ID and Name for safer matching
            parsedUnits.push({ id, name, logo });
          }
        });
      }
      setUnits(parsedUnits);

      // Parse Users
      const userMap = new Map<string, { name: string; avatar: string }>();
      if (userRes?.values?.length > 0) {
        const headers = userRes.values[0] as string[];
        const emailIdx = headers.findIndex(h => (h || '').trim().toUpperCase() === 'EMAIL');
        const nameIdx = headers.findIndex(h => (h || '').trim().toUpperCase() === 'NAME');
        const avatarIdx = headers.findIndex(h => (h || '').trim().toUpperCase() === 'AVATAR' || (h || '').trim().toUpperCase() === 'PHOTO');
        
        userRes.values.slice(1).forEach((row: any[]) => {
          const email = emailIdx > -1 ? row[emailIdx]?.trim() : '';
          const name = nameIdx > -1 ? row[nameIdx]?.trim() : '';
          const avatar = avatarIdx > -1 ? row[avatarIdx]?.trim() : '';
          if (email) {
            userMap.set(email.toLowerCase(), {
              name: name || email.split('@')[0],
              avatar: formatImageUrl(avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || email)}&background=f0f9ff&color=0284c7`
            });
          }
        });
      }

      // Parse Issues
      const issueRes = issueRes1?.values ? issueRes1 : issueRes2;
      if (issueRes?.values && issueRes.values.length > 0) {
        const headers = issueRes.values[0] as string[];
        const valueRows = issueRes.values.slice(1) as string[][];

        const getColIndex = (headerName: string) => {
          const normName = headerName.trim().toUpperCase().replace(/[\s._-]+/g, '');
          return headers.findIndex(h => {
            if (!h) return false;
            const normH = h.trim().toUpperCase().replace(/[\s._-]+/g, '');
            if (normH === normName) return true;
            if (normName === 'ISSUEID' && (normH === 'ISSUEID' || normH === 'ISSUE_ID' || normH === 'ID')) return true;
            if (normName === 'TIMESTAMP' && (normH === 'TIMESTAMP' || normH === 'TIME')) return true;
            if (normName === 'USER' && (normH === 'USER' || normH === 'EMAIL' || normH === 'PELAPOR')) return true;
            if (normName === 'UNIT' && (normH === 'UNIT' || normH === 'UNIT_NAME' || normH === 'UNITNAME')) return true;
            if (normName === 'KETERANGAN' && (normH === 'KETERANGAN' || normH === 'ISSUE' || normH === 'DETAIL' || normH === 'NOTE' || normH === 'INFO')) return true;
            if (normName === 'STATUS' && (normH === 'STATUS')) return true;
            if (normName === 'LAMPIRAN' && (normH === 'LAMPIRAN' || normH === 'TIPE' || normH === 'ATTACHMENT')) return true;
            if (normName === 'CATATAN' && (normH === 'CATATAN' || normH === 'VALUE' || normH === 'ATTACHMENT_VALUE')) return true;
            if (normName === 'LAMPIRAN2' && (normH === 'LAMPIRAN2' || normH === 'LAMPIRAN_2' || normH === 'TIPE2')) return true;
            if (normName === 'CATATAN2' && (normH === 'CATATAN2' || normH === 'CATATAN_2' || normH === 'VALUE2')) return true;
            if (normName === 'LOKASI' && (normH === 'LOKASI' || normH === 'LOCATION' || normH === 'COORDINATES')) return true;
            return false;
          });
        };

        const issueIdIdx = getColIndex('issue_id');
        const timestampIdx = getColIndex('Timestamp');
        const userIdx = getColIndex('user');
        const unitIdx = getColIndex('Unit');
        const keteranganIdx = getColIndex('keterangan');
        const statusIdx = getColIndex('Status');
        const lampiranIdx = getColIndex('Lampiran');
        const catatanIdx = getColIndex('Catatan');
        const lampiran2Idx = getColIndex('Lampiran2');
        const catatan2Idx = getColIndex('Catatan2');
        const lokasiIdx = getColIndex('Lokasi');

        const parsed = valueRows.map((row, i) => {
          const getVal = (idx: number) => idx > -1 && idx < row.length ? row[idx]?.trim() || '' : '';
          
          const userEmail = getVal(userIdx);
          const matchedUser = userMap.get(userEmail.toLowerCase()) || {
            name: userEmail || 'Unknown User',
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userEmail || 'U')}&background=f0f9ff&color=0284c7`
          };

          const unitVal = getVal(unitIdx);
          const matchedUnit = unitMap.get(unitVal) || {
            name: unitVal || 'Unknown Unit',
            logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(unitVal || 'Unit')}&background=f5f5f5&color=737373`
          };

          return {
            id: getVal(issueIdIdx) || `ISS-${1000 + i}`,
            timestamp: getVal(timestampIdx) || '',
            keterangan: getVal(keteranganIdx) || '',
            status: getVal(statusIdx) || 'SEND',
            userEmail,
            userName: matchedUser.name,
            userAvatar: matchedUser.avatar,
            unitVal,
            unitName: matchedUnit.name,
            unitLogo: matchedUnit.logo,
            lampiran: getVal(lampiranIdx),
            catatan: getVal(catatanIdx),
            lampiran2: getVal(lampiran2Idx),
            catatan2: getVal(catatan2Idx),
            lokasi: getVal(lokasiIdx),
          };
        }).filter(item => item.keterangan && item.status.toUpperCase() !== 'DONE');

        setIssues(parsed.reverse());
      } else {
        setIssues([]);
      }
    } catch (err: any) {
      console.error('Error in Issues fetch:', err);
      setError(err?.message || 'Gagal memuat data laporan issue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredIssues = issues.filter(issue => {
    const matchesSearch = 
      (issue.keterangan || '').toLowerCase().includes(search.toLowerCase()) ||
      (issue.userName || '').toLowerCase().includes(search.toLowerCase()) ||
      (issue.unitName || '').toLowerCase().includes(search.toLowerCase()) ||
      (issue.id || '').toLowerCase().includes(search.toLowerCase());
    
    const matchesUnit = selectedUnitFilter === 'ALL' || issue.unitName === selectedUnitFilter || issue.unitVal === selectedUnitFilter;
    const matchesStatus = selectedStatusFilter === 'ALL' || (issue.status || '').toUpperCase() === selectedStatusFilter.toUpperCase();

    return matchesSearch && matchesUnit && matchesStatus;
  });

  return (
    <div className="pb-24 bg-gray-50 min-h-screen relative font-sans">
      {/* Header */}
      <header className="bg-[#429dbb] text-white px-5 py-4 shadow-md sticky top-0 z-50 w-full mb-4 flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)} 
          className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors shrink-0 cursor-pointer"
          id="back-to-dashboard-btn"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight drop-shadow-sm">Daftar Issue</h1>
        </div>
      </header>

            {/* Search and Filters Row */}
      <div className="px-4 mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="search" 
            placeholder="Cari kendala, unit, pelapor..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white shadow-sm border-gray-100 border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#429dbb] transition-all font-sans"
            id="issue-search-input"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button 
          onClick={() => setShowFilter(true)}
          className="bg-white border border-gray-100 shadow-sm rounded-xl px-3 py-2.5 flex items-center justify-center shrink-0 hover:bg-gray-50 focus:ring-2 focus:ring-[#429dbb] transition-all cursor-pointer"
        >
          <Filter className="w-5 h-5 text-gray-600" />
        </button>
      </div>

{/* Main List Container */}
      <div className="px-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 text-[#429dbb] animate-spin" />
            <p className="text-sm font-semibold text-gray-500">Menghubungkan ke Google Sheet...</p>
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
        ) : filteredIssues.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-150 shadow-sm p-6">
            <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3 animate-pulse" />
            <p className="text-sm font-bold text-gray-500">Tidak ada laporan issue yang ditemukan.</p>
            <p className="text-xs text-gray-400 mt-1">Coba gunakan filter lain atau ketik kata pencarian baru.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 flex justify-between items-center">
              <span>List Laporan ({filteredIssues.length})</span>
              <span className="text-[10px] lowercase font-normal bg-gray-150 px-2 py-0.5 rounded-full text-gray-600 font-mono">
                realtime sync
              </span>
            </div>

            <AnimatePresence mode="popLayout">
              {filteredIssues.map((issue, idx) => {
                const isResolved = issue.status.toUpperCase() === 'RESOLVED';
                const isInProgress = issue.status.toUpperCase() === 'IN_PROGRESS';
                const isSend = issue.status.toUpperCase() === 'SEND';

                return (
                  <motion.div 
                    key={`issue-card-${issue.id}-${idx}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer active:scale-[0.98] transition-transform"
                    onClick={() => navigate(`/issues/${issue.id}`)}
                    id={`issue-item-${issue.id}`}
                  >
                    <div className="flex justify-between items-start mb-2 gap-3">
                      <div className="flex-1 min-w-0">
                        
                        <h3 className="font-semibold text-gray-900 leading-tight mb-2 pr-2">{issue.keterangan}</h3>
                        
                        <div className="space-y-1">
                          <p className="text-xs text-gray-600 truncate"><span className="text-gray-400 font-medium">Unit :</span> {issue.unitName}</p>
                          <p className="text-xs text-gray-900 font-bold">{issue.timestamp}</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3 shrink-0">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap border shadow-sm",
                          isResolved ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          isInProgress ? "bg-amber-50 text-amber-700 border-amber-200" :
                          "bg-blue-50 text-blue-700 border-blue-200"
                        )}>
                          {issue.status}
                        </span>
                        
                        {issue.userName && issue.userName !== 'Unknown User' && (
                          <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-100 mt-auto">
                            <img 
                              src={issue.userAvatar || undefined} 
                              alt={issue.userName} 
                              className="w-5 h-5 rounded-full object-cover shadow-sm bg-white"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(issue.userName)}&background=eff6ff&color=3b82f6`;
                              }} 
                            />
                            <span className="text-[10px] font-medium text-gray-700 truncate max-w-[80px]">{issue.userName}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    </motion.div>
                );
              })}
            </AnimatePresence>
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
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-2xl z-50 overflow-hidden shadow-2xl pb-safe"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0">
                <h3 className="font-bold text-gray-900">Filter Issue</h3>
                <button onClick={() => setShowFilter(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="p-4 space-y-6 max-h-[60vh] overflow-y-auto">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Unit</h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedUnitFilter('ALL')}
                      className={cn(
                        "px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer",
                        selectedUnitFilter === 'ALL'
                          ? "bg-[#429dbb] text-white shadow-sm"
                          : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                      )}
                    >
                      ALL
                    </button>
                    {units.map((u, idx) => (
                      <button
                        key={`filter-unit-${u.id}-${idx}`}
                        type="button"
                        onClick={() => setSelectedUnitFilter(u.name)}
                        className={cn(
                          "px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5",
                          selectedUnitFilter === u.name
                            ? "bg-[#429dbb] text-white shadow-sm"
                            : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                        )}
                      >
                        {u.logo && (
                          <img 
                            src={u.logo} 
                            alt="" 
                            className="w-4 h-4 rounded-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <span>{u.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Status</h4>
                  <div className="flex flex-wrap gap-2">
                    {['ALL', 'SEND', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
                      <button
                        key={`filter-status-${st}`}
                        type="button"
                        onClick={() => setSelectedStatusFilter(st)}
                        className={cn(
                          "px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer",
                          selectedStatusFilter === st
                            ? "bg-[#429dbb] text-white shadow-sm"
                            : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                        )}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setShowFilter(false)}
                    className="w-full py-3 bg-[#429dbb] text-white rounded-xl font-bold shadow-sm hover:bg-[#36859f] transition-colors cursor-pointer"
                  >
                    Terapkan Filter
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
</div>
  );
}
