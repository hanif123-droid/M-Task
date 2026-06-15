import { useState, useEffect } from 'react';
import { ArrowLeft, Filter, Search, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { getSheetData } from '../lib/api';

function formatIDR(amount: number | string) {
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/\D/g, '')) || 0 : amount;
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
}

export function Orders() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [tierFilter, setTierFilter] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const [orderRes1, orderRes2, unitRes, userRes] = await Promise.all([
          getSheetData('Order Budget!A1:Z2000').catch(() => null),
          getSheetData('OrderBudget!A1:Z2000').catch(() => null),
          getSheetData('Unit!A1:Z500').catch(() => null),
          getSheetData('User!A1:Z500').catch(() => null)
        ]);

        const unitMap = new Map<string, string>();
        if (unitRes?.values?.length > 0) {
          const headers = unitRes.values[0] as string[];
          const idIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ID' || h?.trim().toUpperCase() === 'UNIT ID');
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

        const userMap = new Map<string, {name: string, photo: string}>();
        if (userRes?.values?.length > 0) {
          const headers = userRes.values[0] as string[];
          const emailIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'EMAIL');
          const nameIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'NAME');
          const photoIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'PHOTO' || h?.trim().toUpperCase() === 'AVATAR');
          if (emailIdx > -1) {
            userRes.values.slice(1).forEach((row: any[]) => {
              const email = row[emailIdx]?.trim();
              if (email) {
                userMap.set(email, {
                  name: (nameIdx > -1 && row[nameIdx]) ? row[nameIdx] : email.split('@')[0],
                  photo: (photoIdx > -1 && row[photoIdx]) ? row[photoIdx] : `https://ui-avatars.com/api/?name=${encodeURIComponent(row[nameIdx] || email)}&background=eff6ff&color=3b82f6`
                });
              }
            });
          }
        }

        const orderRes = orderRes1?.values ? orderRes1 : orderRes2;
        if (orderRes?.values?.length > 0) {
          const headers = orderRes.values[0] as string[];
          const idIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ID' || h?.trim().toUpperCase() === 'ORDER ID');
          const roIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'RO_NUMBER' || h?.trim().toUpperCase() === 'RO NUMBER' || h?.trim().toUpperCase() === 'RO');
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ORDER DETAIL' || h?.trim().toUpperCase() === 'DETAIL' || h?.trim().toUpperCase() === 'ORDER NAME');
          const unitIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'UNIT BUSINESS' || h?.trim().toUpperCase() === 'UNIT ID' || h?.trim().toUpperCase() === 'UNIT');
          const amountIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'AMOUNT' || h?.trim().toUpperCase() === 'TOTAL');
          const tierIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'REVIEW TIER' || h?.trim().toUpperCase() === 'TIER' || h?.trim().toUpperCase() === 'STATUS');
          const userIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'EMAIL USER' || h?.trim().toUpperCase() === 'EMAIL' || h?.trim().toUpperCase() === 'USER');
          
          const fetched = orderRes.values.slice(1).map((row: any[], i: number) => {
            const oId = idIdx > -1 ? row[idIdx]?.trim() : `order-${i}`;
            const ro = roIdx > -1 ? row[roIdx] : '-';
            const detail = nameIdx > -1 ? row[nameIdx] : 'Unknown Detail';
            
            const uId = unitIdIdx > -1 ? row[unitIdIdx]?.trim() : '';
            const unitName = unitMap.get(uId) || uId || 'Unknown Unit';
            
            const amount = amountIdx > -1 ? row[amountIdx] : '0';
            const tier = tierIdx > -1 ? row[tierIdx] : 'Unknown';
            
            const uEmail = userIdx > -1 ? row[userIdx]?.trim() : '';
            const userInfo = userMap.get(uEmail) || { name: uEmail || 'Unknown User', photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(uEmail || 'U')}&background=eff6ff&color=3b82f6` };
            
            return {
              id: oId || `order-${i}`,
              ro,
              detail,
              unit: unitName,
              amount,
              tier,
              userName: userInfo.name,
              userPhoto: userInfo.photo
            };
          }).filter((o: any) => o.detail !== 'Unknown Detail' && o.detail);
          setOrders(fetched);
        }
      } catch (error) {
        console.error('Failed to fetch data', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const tiers = Array.from(new Set(orders.map(o => o.tier)));

  const filteredItems = orders.filter(o => {
    const matchSearch = o.detail.toLowerCase().includes(search.toLowerCase()) || 
                        o.ro.toString().toLowerCase().includes(search.toLowerCase()) ||
                        o.unit.toLowerCase().includes(search.toLowerCase());
    const matchTier = tierFilter ? o.tier === tierFilter : true;
    return matchSearch && matchTier;
  });

  return (
    <div className="pb-24 bg-gray-50 min-h-screen relative">
      <header className="bg-[#429dbb] text-white px-5 py-4 shadow-md sticky top-0 z-50 w-full mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors shrink-0 cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-xl font-bold tracking-tight drop-shadow-sm">Daftar Order</h1>
      </header>

      <div className="px-4 mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="search" 
            placeholder="Cari order... (RO, Detail, Unit)" 
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
            onClick={() => navigate(`/orders/${item.id}`)}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer active:scale-[0.98] transition-transform"
          >
            <div className="flex justify-between items-start mb-2 gap-3">
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-gray-500 mb-1 block">RO : {item.ro}</span>
                <h3 className="font-semibold text-gray-900 leading-tight mb-2 pr-2">{item.detail}</h3>
                
                <div className="space-y-1">
                  <p className="text-xs text-gray-600 truncate"><span className="text-gray-400 font-medium">Unit :</span> {item.unit}</p>
                  <p className="text-xs text-gray-900 font-bold">{formatIDR(item.amount)}</p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-3 shrink-0">
                <span className="bg-yellow-50 text-yellow-700 text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap border border-yellow-200 shadow-sm">
                  {item.tier || 'No Status'}
                </span>
                
                {item.userName && item.userName !== 'Unknown User' && (
                  <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-100 mt-auto">
                    <img 
                      src={item.userPhoto || undefined} 
                      alt={item.userName} 
                      className="w-5 h-5 rounded-full object-cover shadow-sm bg-white"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.userName)}&background=eff6ff&color=3b82f6`;
                      }} 
                    />
                    <span className="text-[10px] font-medium text-gray-700 truncate max-w-[80px]">{item.userName}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        {filteredItems.length === 0 && !isLoading && (
          <div className="text-center py-10">
             <p className="text-gray-500 text-sm">Tidak ada order yang ditemukan.</p>
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
                <h3 className="font-bold text-gray-900">Filter Order</h3>
                <button onClick={() => setShowFilter(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="p-4 space-y-6 max-h-[60vh] overflow-y-auto">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Review Tier</h4>
                  <div className="flex flex-wrap gap-2">
                    {tiers.map((t) => (
                      <button
                        key={t}
                        onClick={() => setTierFilter(tierFilter === t ? null : t)}
                        className={cn(
                          "px-4 py-2 rounded-full text-sm font-medium border transition-all cursor-pointer",
                          tierFilter === t 
                            ? "bg-blue-50 border-blue-200 text-blue-700" 
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        {t || 'Uncategorized'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white border-t border-gray-100 flex gap-3">
                <button 
                  onClick={() => {
                    setTierFilter(null);
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
