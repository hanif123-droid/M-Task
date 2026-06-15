import { useState, useEffect } from 'react';
import { ArrowLeft, Search, Loader2, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getSheetData } from '../lib/api';

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

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const res = await getSheetData('User!A1:Z1000').catch(() => null);

        if (res?.values?.length > 0) {
          const headers = res.values[0] as string[];
          const emailIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'EMAIL');
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'NAME');
          const idIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ID');
          const photoIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PHOTO' || h?.trim().toUpperCase() === 'AVATAR');
          const poinIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'POIN');
          
          const fetched = res.values.slice(1).map((row: any[]) => {
            const email = emailIdx > -1 ? row[emailIdx]?.trim() : '';
            const name = nameIdx > -1 ? row[nameIdx] : 'Unknown Name';
            const ktaId = idIdx > -1 ? row[idIdx] : '-';
            const photo = photoIdx > -1 ? (row[photoIdx] || '') : '';
            const poinVal = poinIdx > -1 ? parseInt(row[poinIdx], 10) : 0;
            const poin = isNaN(poinVal) ? 0 : poinVal;
            
            return {
              email: email || `user-${Date.now()}-${Math.random()}`,
              name: name || 'Unknown Name',
              ktaId,
              photo,
              poin
            };
          }).filter((u: any) => u.name !== 'Unknown Name' && u.name && u.ktaId && u.ktaId !== '-' && u.ktaId.toLowerCase() !== 'xxx');
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
    return u.name.toLowerCase().includes(search.toLowerCase()) || u.ktaId.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="pb-24 bg-gray-50 min-h-screen relative">
      <header className="bg-[#429dbb] text-white px-5 py-4 shadow-md sticky top-0 z-50 w-full mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors shrink-0 cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-xl font-bold tracking-tight drop-shadow-sm">Daftar Warga</h1>
      </header>

      <div className="px-4 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="search" 
            placeholder="Cari warga..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white shadow-sm border-gray-100 border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans"
          />
        </div>
      </div>

      <div className="px-4">
        {isLoading && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
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
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 cursor-pointer active:scale-95 transition-transform flex flex-col items-center text-center"
                >
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
                  <p className="text-xs text-gray-500 font-medium truncate w-full">{item.ktaId}</p>
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
    </div>
  );
}
