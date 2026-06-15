import { useState, useEffect } from 'react';
import { ArrowLeft, Filter, Search, X, Loader2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { getSheetData } from '../lib/api';

export function Contacts() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const [contactRes, unitRes] = await Promise.all([
          getSheetData('Contact!A1:Z1000').catch(() => null),
          getSheetData('Unit!A1:Z500').catch(() => null)
        ]);

        const unitMap = new Map<string, string>();
        if (unitRes?.values?.length > 0) {
          const headers = unitRes.values[0] as string[];
          const idIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ID');
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'UNIT NAME');
          if (idIdx > -1) {
            unitRes.values.slice(1).forEach((row: any[]) => {
              const id = row[idIdx]?.trim();
              if (id) {
                unitMap.set(id, nameIdx > -1 ? (row[nameIdx] || id) : id);
              }
            });
          }
        }

        if (contactRes?.values?.length > 0) {
          const headers = contactRes.values[0] as string[];
          const idIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ID' || h?.trim().toUpperCase() === 'CONTACT ID');
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'NAME');
          const photoIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PHOTO' || h?.trim().toUpperCase() === 'IMAGE');
          const unitIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'UNIT ID' || h?.trim().toUpperCase() === 'UNIT');
          const usecaseIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'USECASE');
          const typeIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TYPE');
          
          const fetched = contactRes.values.slice(1).map((row: any[], i: number) => {
            const cId = idIdx > -1 ? row[idIdx]?.trim() : `contact-${i}`;
            const cName = nameIdx > -1 ? row[nameIdx] : 'Unknown Name';
            const uId = unitIdIdx > -1 ? row[unitIdIdx]?.trim() : '';
            const unitName = unitMap.get(uId) || uId || 'Unknown Unit';
            const photo = photoIdx > -1 ? (row[photoIdx] || '') : '';
            
            return {
              id: cId || `contact-${i}`,
              name: cName || 'Unknown Name',
              photo,
              unit: unitName,
              usecase: usecaseIdx > -1 ? (row[usecaseIdx] || '-') : '-',
              type: typeIdx > -1 ? (row[typeIdx] || 'General') : 'General',
            };
          }).filter((c: any) => c.name !== 'Unknown Name' && c.name);
          setContacts(fetched);
        }
      } catch (error) {
        console.error('Failed to fetch data', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const types = Array.from(new Set(contacts.map(c => c.type)));

  const filteredItems = contacts.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.unit.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter ? c.type === typeFilter : true;
    return matchSearch && matchType;
  });

  return (
    <div className="pb-24 bg-gray-50 min-h-screen relative">
      <header className="bg-[#429dbb] text-white px-5 py-4 shadow-md sticky top-0 z-50 w-full mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors shrink-0 cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-xl font-bold tracking-tight drop-shadow-sm">Daftar Contact</h1>
      </header>

      <div className="px-4 mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="search" 
            placeholder="Cari contact..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white shadow-sm border-gray-100 border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans"
          />
        </div>
        <button 
          onClick={() => setShowFilter(true)}
          className="bg-white border border-gray-100 shadow-sm rounded-xl px-3 py-2.5 flex items-center justify-center shrink-0 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
        >
          <Filter className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="px-4 space-y-3">
        {isLoading && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            <span className="ml-2 text-sm text-gray-500">Memuat data...</span>
          </div>
        )}
        {!isLoading && filteredItems.map((item) => (
          <motion.div 
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex gap-4"
          >
            <div className="w-14 h-14 bg-blue-50 rounded-full border border-blue-100 overflow-hidden shrink-0 flex items-center justify-center">
              {item.photo ? (
                <img src={item.photo} alt={item.name} className="w-full h-full object-cover" onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=eff6ff&color=3b82f6`;
                }} />
              ) : (
                <Users className="w-6 h-6 text-blue-300" />
              )}
            </div>
            
            <div className="flex-1 min-w-0 flex justify-between items-start gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 leading-tight truncate">{item.name}</h3>
                <div className="mt-1 space-y-0.5">
                  <p className="text-xs text-gray-600 truncate"><span className="text-gray-400 font-medium">Unit:</span> {item.unit}</p>
                  <p className="text-xs text-gray-600 truncate"><span className="text-gray-400 font-medium">Usecase:</span> {item.usecase}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-md whitespace-nowrap">
                  {item.type || 'No Type'}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
        {filteredItems.length === 0 && !isLoading && (
          <div className="text-center py-10">
             <p className="text-gray-500 text-sm">Tidak ada contact yang ditemukan.</p>
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
                <h3 className="font-bold text-gray-900">Filter Contact</h3>
                <button onClick={() => setShowFilter(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="p-4 space-y-6 max-h-[60vh] overflow-y-auto">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Type</h4>
                  <div className="flex flex-wrap gap-2">
                    {types.map((t) => (
                      <button
                        key={t}
                        onClick={() => setTypeFilter(typeFilter === t ? null : t)}
                        className={cn(
                          "px-4 py-2 rounded-full text-sm font-medium border transition-all cursor-pointer",
                          typeFilter === t 
                            ? "bg-blue-50 border-blue-200 text-blue-700" 
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white border-t border-gray-100 flex gap-3">
                <button 
                  onClick={() => {
                    setTypeFilter(null);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Reset
                </button>
                <button 
                  onClick={() => setShowFilter(false)}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                >
                  Apply
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
