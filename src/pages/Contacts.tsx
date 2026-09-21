import { useState, useEffect } from 'react';
import { ArrowLeft, Filter, Search, X, Loader2, Users, Mail, MessageCircle, Globe, MapPin, CreditCard, Phone, Building2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatImageUrl } from '../lib/utils';
import { getSheetData } from '../lib/api';

const formatWhatsAppNumber = (phone: string) => {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  }
  return cleaned;
};

export function Contacts() {
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
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [unitFilter, setUnitFilter] = useState<string | null>(null);
  const [usecaseFilter, setUsecaseFilter] = useState<string | null>(null);
  const [selectedContactDetail, setSelectedContactDetail] = useState<any | null>(null);
  const [showMapPopup, setShowMapPopup] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const [contactRes, unitRes] = await Promise.all([
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

        if (contactRes?.values?.length > 0) {
          const headers = contactRes.values[0] as string[];
          const idIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ID' || h?.trim().toUpperCase() === 'NIK' || h?.trim().toUpperCase() === 'KTA_ID');
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'NAME' || h?.trim().toUpperCase() === 'NAMA');
          const photoIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PHOTO' || h?.trim().toUpperCase() === 'IMAGE' || h?.trim().toUpperCase() === 'FOTO' || h?.trim().toUpperCase() === 'AVATAR');
          const typeIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TYPE' || h?.trim().toUpperCase() === 'TIPE'); // We will use this if needed, or remove unit business from type
          const unitIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'UNIT BUSINESS' || h?.trim().toUpperCase() === 'UNIT_BUSINESS' || h?.trim().toUpperCase() === 'UNIT ID');
          const jenisIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'JENIS' || h?.trim().toUpperCase() === 'JABATAN');
          const availIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'AVAIL');
          const usecaseIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'USECASE');
          const roleIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ROLE' || h?.trim().toUpperCase() === 'ROLES');
          const noKtpIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'NO KTP' || h?.trim().toUpperCase() === 'NO. KTP' || h?.trim().toUpperCase() === 'KTP');
          const phoneIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PHONE' || h?.trim().toUpperCase() === 'TELEPON' || h?.trim().toUpperCase() === 'TELP' || h?.trim().toUpperCase() === 'NO HP');
          const emailIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'EMAIL');
          const websiteIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'WEBSITE' || h?.trim().toUpperCase() === 'WEB');
          const alamatIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ALAMAT' || h?.trim().toUpperCase() === 'ADDRESS');
          const mapIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'MAP' || h?.trim().toUpperCase() === 'MAPS');
          
          const fetched = contactRes.values.slice(1).map((row: any[], i: number) => {
            const cId = idIdx > -1 ? row[idIdx]?.trim() : `contact-${i}`;
            const cName = nameIdx > -1 ? row[nameIdx] : 'Unknown Name';
            const photo = photoIdx > -1 ? (row[photoIdx] || '') : '';
            const avail = availIdx > -1 ? (row[availIdx] || '') : '';
            const usecase = usecaseIdx > -1 ? (row[usecaseIdx] || '') : '';
            const role = roleIdx > -1 ? (row[roleIdx] || '') : '';
            const rawUnitId = unitIdIdx > -1 ? (row[unitIdIdx] || '') : '';
            const noKtp = noKtpIdx > -1 ? (row[noKtpIdx] || '') : '';
            const phone = phoneIdx > -1 ? (row[phoneIdx] || '') : '';
            const email = emailIdx > -1 ? (row[emailIdx] || '') : '';
            const website = websiteIdx > -1 ? (row[websiteIdx] || '') : '';
            const alamat = alamatIdx > -1 ? (row[alamatIdx] || '') : '';
            const map = mapIdx > -1 ? (row[mapIdx] || '') : '';
            
            const unitEntry = uMap.get(rawUnitId.toString().trim().toUpperCase());
            const unitName = unitEntry ? unitEntry.name : (rawUnitId || '-');
            const unitLogo = unitEntry ? unitEntry.logo : '';
            
            return {
              id: cId || `contact-${i}`,
              name: cName || 'Unknown Name',
              photo,
              type: typeIdx > -1 ? (row[typeIdx] || 'General') : 'General',
              jenis: jenisIdx > -1 ? (row[jenisIdx] || '-') : '-',
              avail,
              usecase,
              role,
              unitName,
              unitLogo,
              rawUnitId,
              noKtp,
              phone,
              email,
              website,
              alamat,
              map
            };
          }).filter((c: any) => c.name !== 'Unknown Name' && c.name && c.avail?.trim().toUpperCase() === 'CNT');
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

  const roles = Array.from(new Set(contacts.map(c => c.role).filter(Boolean)));
  const units = Array.from(new Set(contacts.map(c => c.unitName).filter(u => u && u !== '-')));
  const usecases = Array.from(new Set(contacts.map(c => c.usecase).filter(Boolean)));

  const filteredItems = contacts.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                       (c.jenis && c.jenis.toLowerCase().includes(search.toLowerCase())) ||
                       (c.role && c.role.toLowerCase().includes(search.toLowerCase())) ||
                       (c.unitName && c.unitName.toLowerCase().includes(search.toLowerCase())) ||
                       (c.usecase && c.usecase.toLowerCase().includes(search.toLowerCase()));
    
    const matchRole = roleFilter ? c.role === roleFilter : true;
    const matchUnit = unitFilter ? c.unitName === unitFilter : true;
    const matchUsecase = usecaseFilter ? c.usecase === usecaseFilter : true;
    
    return matchSearch && matchRole && matchUnit && matchUsecase;
  });

  if (selectedContactDetail) {
    return (
      <div className="pb-24 bg-gray-50 min-h-screen relative font-sans">
        <header className="bg-white px-5 py-4 shadow-sm sticky top-0 z-50 w-full mb-4 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3">
             <button onClick={() => setSelectedContactDetail(null)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors shrink-0 cursor-pointer">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">Detail Kontak</h1>
          </div>
        </header>
        <div className="px-4">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl w-full p-6 shadow-sm border border-gray-100/50 space-y-6"
          >
              <div className="flex flex-col items-center pt-2">
                <div className="w-24 h-24 bg-blue-50 rounded-full border-4 border-white shadow-md overflow-hidden flex items-center justify-center mb-4 relative z-0">
                  {selectedContactDetail.photo ? (
                    <img 
                      src={formatImageUrl(selectedContactDetail.photo)} 
                      alt={selectedContactDetail.name} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedContactDetail.name)}&background=eff6ff&color=3b82f6&size=100`;
                      }} 
                    />
                  ) : (
                    <Users className="w-10 h-10 text-blue-300" />
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-900 text-center leading-tight mb-1">{selectedContactDetail.name}</h2>
                <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                  {selectedContactDetail.usecase && (
                    <span className="bg-purple-50 text-purple-700 text-xs font-semibold px-2.5 py-1 rounded-md border border-purple-100/50">
                      {selectedContactDetail.usecase}
                    </span>
                  )}
                  {selectedContactDetail.role && (
                    <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-md border border-emerald-100/50">
                      {selectedContactDetail.role}
                    </span>
                  )}
                </div>
                
                {selectedContactDetail.unitName && selectedContactDetail.unitName !== '-' && (
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100/50 mt-1">
                    {selectedContactDetail.unitLogo ? (
                      <img src={selectedContactDetail.unitLogo} alt="Unit Logo" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <Building2 className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm font-medium text-gray-700">{selectedContactDetail.unitName}</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {selectedContactDetail.noKtp && selectedContactDetail.noKtp !== '-' && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-100 shrink-0">
                      <CreditCard className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">No. KTP</p>
                      <p className="text-sm font-semibold text-gray-800">{selectedContactDetail.noKtp}</p>
                    </div>
                  </div>
                )}

                {(selectedContactDetail.phone || selectedContactDetail.email) && (
                  <div className="grid grid-cols-1 gap-3">
                    {selectedContactDetail.phone && selectedContactDetail.phone !== '-' && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-xl border border-gray-100 justify-between group">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center border border-green-100 shrink-0">
                            <Phone className="w-5 h-5 text-green-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Telepon</p>
                            <p className="text-sm font-semibold text-gray-800 truncate">{selectedContactDetail.phone}</p>
                          </div>
                        </div>
                        <a 
                          href={`https://wa.me/${formatWhatsAppNumber(selectedContactDetail.phone)}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 hover:bg-green-200 transition-colors cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                    
                    {selectedContactDetail.email && selectedContactDetail.email !== '-' && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-xl border border-gray-100 justify-between group">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100 shrink-0">
                            <Mail className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Email</p>
                            <p className="text-sm font-semibold text-gray-800 truncate">{selectedContactDetail.email}</p>
                          </div>
                        </div>
                        <a 
                          href={`mailto:${selectedContactDetail.email}`} 
                          className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 hover:bg-blue-200 transition-colors cursor-pointer"
                        >
                          <Mail className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {selectedContactDetail.website && selectedContactDetail.website !== '-' && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-xl border border-gray-100 group">
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100 shrink-0">
                      <Globe className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Website</p>
                      <a 
                        href={selectedContactDetail.website.startsWith('http') ? selectedContactDetail.website : `https://${selectedContactDetail.website}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline truncate block cursor-pointer"
                      >
                        {selectedContactDetail.website}
                      </a>
                    </div>
                  </div>
                )}
                
                {selectedContactDetail.alamat && selectedContactDetail.alamat !== '-' && (
                  <div className="flex gap-3 p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                    <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center border border-rose-100 shrink-0 mt-0.5">
                      <MapPin className="w-5 h-5 text-rose-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Alamat</p>
                      {selectedContactDetail.map && selectedContactDetail.map !== '-' ? (
                         <button 
                           onClick={() => setShowMapPopup(true)}
                           className="text-sm font-semibold text-gray-800 hover:text-rose-600 text-left transition-colors block leading-snug cursor-pointer underline decoration-dotted underline-offset-4"
                         >
                           {selectedContactDetail.alamat}
                         </button>
                      ) : (
                         <p className="text-sm font-semibold text-gray-800 leading-snug">{selectedContactDetail.alamat}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
          </motion.div>
        </div>
        <AnimatePresence>
          {showMapPopup && selectedContactDetail.map && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setShowMapPopup(false)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col"
              >
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-rose-500" />
                    <h3 className="font-bold text-gray-900">Lokasi</h3>
                  </div>
                  <button 
                    onClick={() => setShowMapPopup(false)}
                    className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-500 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="w-full h-[60vh] md:h-[400px]">
                  {(() => {
                     let url = selectedContactDetail.map || '';
                     const srcMatch = url.match(/src="([^"]+)"/);
                     if (srcMatch && srcMatch[1]) {
                       url = srcMatch[1];
                     } else if (url && !url.startsWith('http')) {
                       url = `https://maps.google.com/maps?q=${encodeURIComponent(url)}&z=15&output=embed`;
                     } else if (url.startsWith('http') && !url.includes('embed') && !url.includes('output=embed')) {
                       // If it's a raw google maps link (without embed), we can try to turn it into an embed link or just query it
                       // Actually, if it's latitude,longitude, encodeURIComponent(url) handles it.
                       // Just to be safe, if we get raw latitude longitude we use the above.
                     }
                     return (
                        <iframe 
                          src={url} 
                          className="w-full h-full border-0" 
                          allowFullScreen 
                          loading="lazy" 
                          referrerPolicy="no-referrer-when-downgrade"
                        ></iframe>
                     );
                  })()}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="pb-24 bg-gray-50 min-h-screen relative">
      <header className="bg-[#429dbb] text-white px-5 py-4 shadow-md sticky top-0 z-50 w-full mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors shrink-0 cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-xl font-bold tracking-tight drop-shadow-sm">Daftar Kontak</h1>
      </header>

      <div className="px-4 mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="search" 
            placeholder="Cari Kontak..." 
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
            onClick={() => setSelectedContactDetail(item)}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex gap-4 hover:shadow-md cursor-pointer transition-shadow"
          >
            <div className="w-14 h-14 bg-blue-50 rounded-full border border-blue-100 overflow-hidden shrink-0 flex items-center justify-center">
              {item.photo ? (
                <img src={formatImageUrl(item.photo)} alt={item.name} className="w-full h-full object-cover" onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=eff6ff&color=3b82f6`;
                }} />
              ) : (
                <Users className="w-6 h-6 text-blue-300" />
              )}
            </div>
            
            <div className="flex-1 min-w-0 flex justify-between items-start gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 leading-tight truncate">{item.name}</h3>
                <div className="mt-1 space-y-0.5 flex flex-col gap-1">
                  {item.usecase && (
                    <p className="text-xs text-gray-800 font-medium truncate leading-none">
                      {item.usecase}
                    </p>
                  )}
                  {item.unitName && item.unitName !== '-' && (
                    <p className="text-[11px] text-gray-600 truncate leading-none flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></span>
                      {item.unitName}
                    </p>
                  )}
                  {item.jenis && item.jenis !== '-' && (
                    <p className="text-[10px] text-gray-500 truncate leading-none mt-0.5">
                      <span className="text-gray-400">Jenis:</span> {item.jenis}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0 h-full justify-between">
                <div className="flex flex-col items-end gap-1.5">
                  {item.role && (
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-100 whitespace-nowrap shadow-sm">
                      {item.role}
                    </span>
                  )}
                  {item.type && item.type !== 'General' && (
                    <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-md whitespace-nowrap border border-indigo-100/50">
                      {item.type}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-auto">
                  {item.email && item.email !== '-' && (
                    <a 
                      href={`mailto:${item.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {item.phone && item.phone !== '-' && (
                    <a 
                      href={`https://wa.me/${formatWhatsAppNumber(item.phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        {filteredItems.length === 0 && !isLoading && (
          <div className="text-center py-10">
             <p className="text-gray-500 text-sm">Tidak ada kontak yang ditemukan.</p>
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
                <h3 className="font-bold text-gray-900">Filter Kontak</h3>
                <button onClick={() => setShowFilter(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="p-4 space-y-6 max-h-[60vh] overflow-y-auto">
                {roles.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Role</h4>
                    <div className="flex flex-wrap gap-2">
                      {roles.map((r: any) => (
                        <button
                          key={r}
                          onClick={() => setRoleFilter(roleFilter === r ? null : r)}
                          className={cn(
                            "px-4 py-2 rounded-full text-sm font-medium border transition-all cursor-pointer",
                            roleFilter === r 
                              ? "bg-blue-50 border-blue-200 text-blue-700" 
                              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {usecases.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Usecase</h4>
                    <div className="flex flex-wrap gap-2">
                      {usecases.map((u: any) => (
                        <button
                          key={u}
                          onClick={() => setUsecaseFilter(usecaseFilter === u ? null : u)}
                          className={cn(
                            "px-4 py-2 rounded-full text-sm font-medium border transition-all cursor-pointer",
                            usecaseFilter === u 
                              ? "bg-blue-50 border-blue-200 text-blue-700" 
                              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {units.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Unit Business</h4>
                    <div className="flex flex-wrap gap-2">
                      {units.map((u: any) => (
                        <button
                          key={u}
                          onClick={() => setUnitFilter(unitFilter === u ? null : u)}
                          className={cn(
                            "px-4 py-2 rounded-full text-sm font-medium border transition-all cursor-pointer",
                            unitFilter === u 
                              ? "bg-blue-50 border-blue-200 text-blue-700" 
                              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-white border-t border-gray-100 flex gap-3">
                <button 
                  onClick={() => {
                    setRoleFilter(null);
                    setUnitFilter(null);
                    setUsecaseFilter(null);
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
