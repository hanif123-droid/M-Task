import { useState, useEffect } from 'react';
import { ArrowLeft, Filter, Search, X, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatImageUrl } from '../lib/utils';
import { getSheetData } from '../lib/api';

function formatIDR(amount: number | string) {
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/\D/g, '')) || 0 : amount;
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
}

export function Orders() {
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
  const [showFilter, setShowFilter] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [tierFilter, setTierFilter] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());

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

        const userMap = new Map<string, {name: string, photo: string, role: string}>();
        if (userRes?.values?.length > 0) {
          const headers = userRes.values[0] as string[];
          const emailIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'EMAIL');
          const nameIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'NAME');
          const photoIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'PHOTO' || h?.trim().toUpperCase() === 'AVATAR');
          const roleIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'ROLE' || h?.trim().toUpperCase() === 'GROUP');
          if (emailIdx > -1) {
            userRes.values.slice(1).forEach((row: any[]) => {
              const email = row[emailIdx]?.trim();
              if (email) {
                userMap.set(email, {
                  name: (nameIdx > -1 && row[nameIdx]) ? row[nameIdx] : email.split('@')[0],
                  photo: (photoIdx > -1 && row[photoIdx]) ? row[photoIdx] : `https://ui-avatars.com/api/?name=${encodeURIComponent(row[nameIdx] || email)}&background=eff6ff&color=3b82f6`,
                  role: roleIdx > -1 ? row[roleIdx]?.trim() : ''
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
          const dateIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'DATE' || h?.trim().toUpperCase() === 'TANGGAL');
          
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
            
            let dateStr = dateIdx > -1 ? row[dateIdx]?.trim() : '';
            let yearStr = new Date().getFullYear().toString();
            if (dateStr) {
              const d = new Date(dateStr);
              if (!isNaN(d.getTime())) {
                yearStr = d.getFullYear().toString();
              } else if (dateStr.length >= 4) {
                 // Try to find a 4 digit year
                 const match = dateStr.match(/\d{4}/);
                 if (match) yearStr = match[0];
              }
            }

            return {
              id: oId || `order-${i}`,
              ro,
              detail,
              unit: unitName,
              amount,
              tier,
              date: dateStr,
              year: yearStr,
              userName: userInfo.name,
              userPhoto: userInfo.photo
            };
          }).filter((o: any) => o.detail !== 'Unknown Detail' && o.detail);

          const activeUserEmail = localStorage.getItem('mtask_user_email') || 'designify.creative7@gmail.com';
          const activeUserRole = userMap.get(activeUserEmail)?.role || '';
          
          let filteredByRole = fetched;
          if (activeUserEmail.toLowerCase() === 'vonyloselia@gmail.com') {
            filteredByRole = fetched;
          } else if (activeUserRole?.trim().toLowerCase() === 'admin') {
            filteredByRole = fetched.filter((o: any) => o.tier?.trim().toLowerCase() === 'admin check');
          } else if (activeUserEmail.toLowerCase() === 'adi.grinder.9@gmail.com' || activeUserRole?.trim().toLowerCase() === 'board') {
            filteredByRole = fetched.filter((o: any) => o.tier?.trim().toLowerCase() === 'admin approve');
          } else if (activeUserEmail.toLowerCase() === 'gilangpradnyatoplo@gmail.com' || activeUserRole?.trim().toLowerCase() === 'boss') {
            filteredByRole = fetched.filter((o: any) => o.tier?.trim().toLowerCase() === 'board approve');
          }

          setOrders(filteredByRole.reverse());
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
  const years = Array.from(new Set(orders.map(o => o.year))).sort((a, b) => Number(b) - Number(a));

  const filteredItems = orders.filter(o => {
    const matchSearch = o.detail.toLowerCase().includes(search.toLowerCase()) || 
                        o.ro.toString().toLowerCase().includes(search.toLowerCase()) ||
                        o.unit.toLowerCase().includes(search.toLowerCase());
    const matchTier = tierFilter ? o.tier === tierFilter : true;
    const matchYear = yearFilter ? o.year === yearFilter : true;
    return matchSearch && matchTier && matchYear;
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
        {!isLoading && filteredItems.map((item, idx) => (
          <motion.div 
            key={`${item.id}-${idx}`}
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
                {(() => {
                  const tStr = (item.tier || '').toLowerCase();
                  let colorClass = "bg-yellow-50 text-yellow-700 border-yellow-200"; // default for Board Approve or unknown
                  
                  if (tStr.includes('decline')) {
                     colorClass = "bg-red-50 text-red-700 border-red-200";
                  } else if (tStr.includes('disburse')) {
                     colorClass = "bg-green-50 text-green-700 border-green-200";
                  } else if (tStr.includes('admin approve')) {
                     colorClass = "bg-purple-50 text-purple-700 border-purple-200";
                  } else if (tStr.includes('board approve')) {
                     colorClass = "bg-yellow-50 text-yellow-700 border-yellow-200";
                  }
                  
                  return (
                    <span className={cn("text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap border shadow-sm", colorClass)}>
                      {item.tier || 'No Status'}
                    </span>
                  );
                })()}
                
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
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Tahun</h4>
                  <div className="flex flex-wrap gap-2">
                    {years.map((y) => (
                      <button
                        key={y}
                        onClick={() => setYearFilter(y)}
                        className={cn(
                          "px-4 py-2 rounded-full text-sm font-medium border transition-all cursor-pointer",
                          yearFilter === y 
                            ? "bg-blue-50 border-blue-200 text-blue-700" 
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>

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
                    setYearFilter(new Date().getFullYear().toString());
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
