import { useState, useEffect } from 'react';
import { ArrowLeft, Search, Loader2, Star, Filter, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getSheetData } from '../lib/api';
import { cn } from '../lib/utils';

export function getStars(poin: number) {
  if (poin >= 71) return 4;
  if (poin >= 51) return 3;
  if (poin >= 21) return 2;
  if (poin >= 1) return 1;
  return 0;
}

export function UsersList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [unitFilter, setUnitFilter] = useState<string>(''); // empty means All
  const [unitMap, setUnitMap] = useState<Map<string, { name: string; logo: string }>>(new Map());

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const [userRes, unitRes] = await Promise.all([
          getSheetData('User!A1:Z1000').catch(() => null),
          getSheetData('Unit!A1:Z500').catch(() => null)
        ]);

        const uMap = new Map<string, { name: string; logo: string }>();
        if (unitRes?.values?.length > 0) {
          const headers = unitRes.values[0] as string[];
          const idIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ID' || h?.trim().toUpperCase() === 'UNIT ID');
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'UNIT NAME');
          const logoIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'IMAGE' || h?.trim().toUpperCase() === 'LOGO');
          if (idIdx > -1) {
            unitRes.values.slice(1).forEach((row: any[]) => {
              const uId = row[idIdx]?.trim();
              if (uId) {
                uMap.set(uId.toUpperCase(), {
                  name: nameIdx > -1 ? (row[nameIdx] || uId) : uId,
                  logo: logoIdx > -1 ? (row[logoIdx] || '') : ''
                });
              }
            });
          }
        }
        setUnitMap(uMap);

        if (userRes?.values?.length > 0) {
          const headers = userRes.values[0] as string[];
          const emailIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'EMAIL');
          const nameIdx = headers.findIndex(h => {
             const key = h?.trim().toUpperCase() || '';
             return key === 'NAME' || key === 'NAMA';
          });
          const idIdx = headers.findIndex(h => {
             const key = h?.trim().toUpperCase() || '';
             return key === 'ID' || key === 'KTA' || key === 'KTA ID' || key === 'KTA_ID' || key === 'NIK';
          });
          const photoIdx = headers.findIndex(h => {
             const key = h?.trim().toUpperCase() || '';
             return key === 'PHOTO' || key === 'AVATAR' || key === 'FOTO' || key === 'IMAGE';
          });
          const poinIdx = headers.findIndex(h => {
             const key = h?.trim().toUpperCase() || '';
             return key === 'POIN' || key === 'POINT' || key === 'POINTS';
          });
          const unitIdIdx = headers.findIndex(h => {
             const key = h?.trim().toUpperCase() || '';
             return key === 'UNIT ID' || key === 'UNIT BUSINESS' || key === 'UNIT_BUSINESS' || key === 'UNITID' || key === 'KODE UNIT' || key === 'UNITKODE';
          });

          const fetched = userRes.values.slice(1).map((row: any[]) => {
            const email = emailIdx > -1 ? row[emailIdx]?.trim() : '';
            const name = nameIdx > -1 && row[nameIdx] ? row[nameIdx] : 'Unknown Name';
            const ktaId = idIdx > -1 && row[idIdx] ? row[idIdx].toString().trim() : '-';
            const photo = photoIdx > -1 && row[photoIdx] ? row[photoIdx] : '';
            const poinVal = poinIdx > -1 && row[poinIdx] ? parseInt(row[poinIdx], 10) : 0;
            const poin = isNaN(poinVal) ? 0 : poinVal;
            const rawUnitId = unitIdIdx > -1 && row[unitIdIdx] ? row[unitIdIdx].toString().trim() : '';
            
            // Look up unit name
            const unitEntry = uMap.get(rawUnitId.toUpperCase());
            const unitName = unitEntry ? unitEntry.name : (rawUnitId || '-');
            
            return {
              email: email || `user-${Date.now()}-${Math.random()}`,
              name: name || 'Unknown Name',
              ktaId,
              photo,
              poin,
              unitId: rawUnitId,
              unitName
            };
          }).filter((u: any) => u.name !== 'Unknown Name' && u.name && u.ktaId?.toUpperCase() !== 'XXX');
          setUsers(fetched);
        }
      } catch (error) {
        console.error('Failed to fetch data', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredItems = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.ktaId.toLowerCase().includes(search.toLowerCase());
    const matchUnit = unitFilter ? (u.unitName === unitFilter || u.unitId === unitFilter) : true;
    return matchSearch && matchUnit;
  });

  const unitsList = Array.from(new Set(users.map(u => u.unitName).filter(u => u && u !== '-')));

  return (
    <div className="pb-24 bg-gray-50 min-h-screen relative">
      <header className="bg-[#429dbb] text-white px-5 py-4 shadow-md sticky top-0 z-50 w-full mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors shrink-0 cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-xl font-bold tracking-tight drop-shadow-sm">Daftar Warga</h1>
      </header>

      {/* Search and Filters */}
      <div className="px-4 flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="search" 
            placeholder="Cari warga..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white shadow-sm border-gray-100 border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans"
          />
        </div>
        <button 
          onClick={() => setShowFilter(true)}
          className="bg-white border border-gray-150 shadow-sm rounded-xl px-3 py-2.5 flex items-center justify-center shrink-0 hover:bg-gray-50 focus:ring-2 focus:ring-[#429dbb] transition-all cursor-pointer"
        >
          <Filter className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="px-4">
        {isLoading && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="w-6 h-6 text-[#429dbb] animate-spin" />
            <span className="ml-2 text-sm text-gray-500">Memuat data...</span>
          </div>
        )}
        
        {!isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredItems.map((item) => {
              const stars = getStars(item.poin);
              return (
                <motion.div 
                  key={item.email}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => navigate(`/users/${encodeURIComponent(item.email)}`)}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 cursor-pointer active:scale-95 transition-transform flex flex-col items-center text-center h-full justify-between"
                >
                  <div className="flex flex-col items-center w-full">
                    <div className="flex gap-0.5 mb-2 h-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-3.5 h-3.5 ${i < stars ? 'fill-yellow-400 text-yellow-500' : 'text-gray-200'}`} 
                        />
                      ))}
                    </div>

                    <div className="w-16 h-16 bg-blue-50 rounded-full border-2 border-white shadow-md overflow-hidden mb-3">
                      <img 
                        src={item.photo || undefined} 
                        alt={item.name} 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=eff6ff&color=3b82f6`;
                        }} 
                      />
                    </div>
                    
                    <h3 className="font-bold text-gray-900 text-sm leading-tight mb-1 truncate w-full">{item.name}</h3>
                    <p className="text-xs text-gray-500 font-medium truncate w-full mb-1">{item.ktaId}</p>
                  </div>
                  
                  {item.unitName && item.unitName !== '-' && (
                    <span className="mt-1 inline-block text-[10.5px] font-bold text-[#256e84] bg-[#e5f5f9] px-2 py-0.5 rounded-full border border-[#429dbb]/20 truncate max-w-full">
                      {item.unitName}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
        
        {filteredItems.length === 0 && !isLoading && (
          <div className="text-center py-10">
             <p className="text-gray-500 text-sm">Tidak ada warga yang ditemukan.</p>
          </div>
        )}
      </div>

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
                <h3 className="font-bold text-gray-900 text-sm">Filter Warga</h3>
                <button onClick={() => setShowFilter(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="p-4 space-y-6 max-h-[60vh] overflow-y-auto">
                {unitsList.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">Unit Business</h4>
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
                      {unitsList.map((unit) => (
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
