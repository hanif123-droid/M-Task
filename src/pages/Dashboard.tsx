import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Briefcase, CheckCircle2, Activity, DollarSign, Building2, 
  Users, ListOrdered, AlertCircle, FileText, UserPlus, 
  Package, Box, Coffee, ShieldCheck, Settings, Grip, Camera, Loader2, X, Image as ImageIcon, RefreshCw, Bell
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { DriveService } from '../lib/driveService';
import { getSheetData } from '../lib/api';

const ALL_ACTIONS = [
  { id: '1', label: 'Project', icon: Briefcase, color: 'text-blue-600', path: '/projects' },
  { id: '3', label: 'Task', icon: CheckCircle2, color: 'text-green-600', path: '/all-tasks' },
  { id: '5', label: 'Order Budget', icon: DollarSign, color: 'text-yellow-600' },
  { id: '6', label: 'Unit', icon: Building2, color: 'text-indigo-600', path: '/units' },
  { id: '7', label: 'Contact', icon: Users, color: 'text-pink-600', path: '/contacts' },
  { id: '8', label: 'Daftar Order', icon: ListOrdered, color: 'text-teal-600', path: '/orders' },
  { id: '9', label: 'Daftar Issue', icon: AlertCircle, color: 'text-red-600' },
  { id: '10', label: 'Activities', icon: Activity, color: 'text-purple-600', path: '/activities' },
  { id: '11', label: 'Warga', icon: UserPlus, color: 'text-cyan-600', path: '/users' },
  { id: '12', label: 'Lion Parcel', icon: Package, color: 'text-sky-600' },
  { id: '13', label: 'LGH', icon: Box, color: 'text-violet-600' },
  { id: '14', label: 'Chillhub', icon: Coffee, color: 'text-fuchsia-600' },
  { id: '15', label: 'Boganatha', icon: ShieldCheck, color: 'text-rose-600' },
  { id: '16', label: 'Setting', icon: Settings, color: 'text-slate-600' },
];

function BannerCarousel({ images }: { images: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [images.length]);

  if (images.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 relative h-40">
      <div 
        className="flex transition-transform duration-500 ease-in-out h-full"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {images.map((src, i) => (
          src && typeof src === 'string' && src.trim() !== '' ? (
            <img key={i} src={src} className="w-full h-full object-cover flex-shrink-0" alt={`Banner ${i + 1}`} />
          ) : null
        ))}
      </div>
      {images.length > 1 && (
        <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5 z-10">
          {images.map((_, i) => (
            <div 
              key={i} 
              className={cn("h-1.5 rounded-full transition-all duration-300", currentIndex === i ? "w-4 bg-white" : "w-1.5 bg-white/50")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

import { CameraModal } from '../components/CameraModal';

export function Dashboard() {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sheetData, setSheetData] = useState<any[][]>([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [lastSync, setLastSync] = useState<string>('');
  
  const [banner1, setBanner1] = useState<{image: string, judul: string} | null>(null);
  const [banner2List, setBanner2List] = useState<{image: string, judul: string}[]>([]);
  const [banner3List, setBanner3List] = useState<string[]>([]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const pollSheets = async () => {
      try {
        setSyncStatus('syncing');
        const res = await getSheetData('Banner2!A1:Z100'); // Dynamic fetch for banners
        if (res.values && res.values.length > 0) {
          const headers = res.values[0] as string[];
          const imgIdx = headers.findIndex((h: string) => h?.trim().toLowerCase() === 'image');
          const lokIdx = headers.findIndex((h: string) => h?.trim().toLowerCase() === 'lokasi');
          const showIdx = headers.findIndex((h: string) => h?.trim().toLowerCase() === 'show');
          const judulIdx = headers.findIndex((h: string) => h?.trim().toLowerCase() === 'judul');

          if (imgIdx > -1 && lokIdx > -1 && showIdx > -1) {
            const data = res.values.slice(1).map((row: any[]) => ({
              image: row[imgIdx] || '',
              lokasi: row[lokIdx]?.trim() || '',
              show: (row[showIdx] || '').toString().trim().toUpperCase() === 'TRUE',
              judul: judulIdx > -1 ? (row[judulIdx] || '') : ''
            }));
            
            const b1 = data.find((r: any) => r.lokasi === 'OK 1' && r.show);
            if (b1) {
              setBanner1({ 
                image: b1.image?.trim() ? b1.image : 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=2670&auto=format&fit=crop', 
                judul: b1.judul 
              });
            } else {
              setBanner1(null);
            }
            
            const b2List = data.filter((r: any) => r.lokasi === 'OK 2' && r.show).map((r: any, i: number) => ({ 
              image: r.image?.trim() ? r.image : `https://images.unsplash.com/photo-1664575602276-acd073f104c1?q=80&w=2670&auto=format&fit=crop&sig=${i+10}`, 
              judul: r.judul 
            }));
            setBanner2List(b2List);
            
            const b3List = data.filter((r: any) => r.lokasi === 'OK 3' && r.show).map((r: any, i: number) => 
               r.image?.trim() ? r.image : `https://images.unsplash.com/photo-1556761175-4b46a572b786?q=80&w=2574&auto=format&fit=crop&sig=${i+20}`
            );
            setBanner3List(b3List);
          }
        }
        setLastSync(new Date().toLocaleTimeString());
        setSyncStatus('idle');
      } catch (err: any) {
        if (err.message !== 'Mock authentication used, bypassing Sheets API' && err.message !== 'Not authenticated') {
           console.warn('Polling error:', err.message);
           // Show explicit error on the UI sync status instead of generic error
           setLastSync('Error: ' + err.message.substring(0, 30));
        }
        setSyncStatus('error');
      }
    };

    pollSheets(); // initial
    timer = setInterval(pollSheets, 10000); // every 10 seconds
    
    // Listen for manual pull to refresh from outside
    const handleManualRefresh = () => pollSheets();
    window.addEventListener('appDataSyncRequest', handleManualRefresh);
    
    return () => {
      clearInterval(timer);
      window.removeEventListener('appDataSyncRequest', handleManualRefresh);
    };
  }, []);

  // Quick actions: 8 items + 1 'Lihat Semua'
  const visibleActions = ALL_ACTIONS.slice(0, 8);

  const uploadFile = async (fileOrBlob: File | Blob) => {
    try {
      setIsUploading(true);
      
      // If it's a blob from camera, convert to File
      const fileToUpload = fileOrBlob instanceof File 
        ? fileOrBlob 
        : new File([fileOrBlob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
        
      await DriveService.uploadFile(fileToUpload);
      alert('Upload berhasil!');
    } catch (err: any) {
      console.warn('Upload failed:', err);
      if (err.message?.includes('Mock authentication used') || !err.message) {
         alert('Preview limits: Firebase not fully configured, bypass upload.');
      } else {
         alert('Upload gagal: ' + err.message);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFile(e.target.files[0]);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleDocumentChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFile(e.target.files[0]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCapture = (blob: Blob) => {
    setShowCameraModal(false);
    uploadFile(blob);
  };

  return (
    <div className="pb-24 bg-gray-50 min-h-screen">
      {showCameraModal && (
        <CameraModal 
          onClose={() => setShowCameraModal(false)}
          onCapture={handleCapture}
          onGallerySelect={() => {
            setShowCameraModal(false);
            imageInputRef.current?.click();
          }}
        />
      )}

      {/* Hidden File Input for Image Gallery */}
      <input 
        type="file" 
        accept="image/*" 
        ref={imageInputRef} 
        onChange={handleImageChange} 
        className="hidden" 
      />

      {/* Hidden File Input for Any File */}
      <input 
        type="file" 
        accept="*/*" 
        ref={fileInputRef} 
        onChange={handleDocumentChange} 
        className="hidden" 
      />

      {/* Header */}
      <header className="bg-[#429dbb] text-white px-5 py-4 shadow-md sticky top-0 z-50 w-full mb-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-tight drop-shadow-sm">Dashboard</h1>
          <div className="flex items-center gap-2 text-xs font-medium bg-blue-700/50 px-2 py-1 rounded-full">
             <RefreshCw className={cn("w-3 h-3 text-blue-200", syncStatus === 'syncing' && "animate-spin")} />
             <span className="text-blue-100 max-w-[150px] truncate">
               {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'error' ? lastSync || 'Offline' : lastSync}
             </span>
          </div>
        </div>
      </header>

      <div className="px-4 space-y-6">
        {/* Card 1: Banner 1 */}
        {banner1 && typeof banner1.image === 'string' && banner1.image.trim() !== '' && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 relative">
            <img 
              src={banner1.image} 
              alt="Main Banner" 
              className="w-full h-40 object-cover"
            />
          </div>
        )}

        {/* Card 2: Quick Actions */}
        <AnimatePresence>
          {showAll ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">Semua Layanan</h3>
                <button onClick={() => setShowAll(false)} className="text-sm font-medium text-blue-600">
                  Tutup
                </button>
              </div>
              <div className="grid grid-cols-4 gap-y-6 gap-x-2">
                {ALL_ACTIONS.map((action) => (
                  <button 
                    key={action.id} 
                    onClick={() => {
                      if (action.isImageUpload) {
                        setShowCameraModal(true);
                      } else if (action.isFileUpload) {
                        fileInputRef.current?.click();
                      } else if (action.path) {
                        navigate(action.path);
                      }
                    }}
                    disabled={isUploading && (action.isImageUpload || action.isFileUpload)}
                    className="flex flex-col items-center gap-2 cursor-pointer transition-transform active:scale-95 disabled:opacity-50"
                  >
                    <div className={cn("flex items-center justify-center p-2", action.color)}>
                      {isUploading && (action.isImageUpload || action.isFileUpload) ? (
                        <Loader2 className="w-8 h-8 animate-spin" />
                      ) : (
                        <action.icon className="w-8 h-8" />
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-center text-gray-600 leading-tight">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100"
            >
              <div className="grid grid-cols-4 gap-y-6 gap-x-2 relative">
                {visibleActions.map((action) => (
                  <button 
                    key={action.id} 
                    onClick={() => {
                      if (action.isImageUpload) {
                        setShowCameraModal(true);
                      } else if (action.isFileUpload) {
                        fileInputRef.current?.click();
                      } else if (action.path) {
                        navigate(action.path);
                      }
                    }}
                    disabled={isUploading && (action.isImageUpload || action.isFileUpload)}
                    className="flex flex-col items-center gap-2 cursor-pointer transition-transform active:scale-95 disabled:opacity-50"
                  >
                    <div className={cn("flex items-center justify-center p-2", action.color)}>
                      {isUploading && (action.isImageUpload || action.isFileUpload) ? (
                        <Loader2 className="w-7 h-7 animate-spin" />
                      ) : (
                        <action.icon className="w-7 h-7" />
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-center text-gray-600 leading-tight">
                      {action.label}
                    </span>
                  </button>
                ))}
                
                {/* 9th Action: Lihat Semua (Always bottom left position visually in a 3x3 or 4-col layout context) */}
                <button 
                  onClick={() => setShowAll(true)}
                  className="flex flex-col items-center gap-2 cursor-pointer transition-transform active:scale-95"
                >
                  <div className="flex items-center justify-center p-2 text-gray-400">
                    <Grip className="w-7 h-7" />
                  </div>
                  <span className="text-[10px] font-medium text-center text-gray-600 leading-tight">
                    Lihat Semua
                  </span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* News Feed (Ticker) */}
        <div className="bg-white border text-white border-blue-100 rounded-2xl p-4 flex items-center overflow-hidden shadow-sm relative">
           <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-90 rounded-2xl"></div>
           <div className="relative z-10 flex items-center w-full">
             <Bell className="w-5 h-5 mr-3 flex-shrink-0" />
             <div className="flex-1 overflow-hidden relative" style={{ maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' }}>
               <motion.div 
                 animate={{ x: ['100%', '-100%'] }}
                 transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
                 className="whitespace-nowrap text-sm font-medium"
               >
                 Terdapat pemberitahuan baru di dashboard hari ini. Periksa task dan approval Anda segera.
               </motion.div>
             </div>
           </div>
        </div>

        {/* Card 4: Banner 2 (Horizontal Scroll) */}
        {banner2List.length > 0 ? (
          <div className="bg-transparent -mx-4 px-4 overflow-x-auto pb-4 hide-scrollbar">
            <div className="flex gap-3 w-max">
              {banner2List.map((item, i) => (
                item && typeof item.image === 'string' && item.image.trim() !== '' ? (
                  <div key={i} className="bg-white rounded-xl shadow-sm w-[280px] h-28 flex-shrink-0 border border-gray-100 overflow-hidden relative">
                     <img src={item.image} className="absolute inset-0 w-full h-full object-cover opacity-80" alt="" />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-3">
                       <span className="text-white text-sm font-medium">{item.judul || `Promo Insight ${i + 1}`}</span>
                     </div>
                  </div>
                ) : null
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-transparent -mx-4 px-4 overflow-x-auto pb-4 hide-scrollbar">
            <div className="flex gap-3 w-max">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm w-[280px] h-28 flex-shrink-0 border border-gray-100 overflow-hidden relative">
                   <img src={`https://images.unsplash.com/photo-1664575602276-acd073f104c1?q=80&w=2670&auto=format&fit=crop&sig=${i+10}`} className="absolute inset-0 w-full h-full object-cover opacity-80" alt="" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-3">
                     <span className="text-white text-sm font-medium">Promo Insight {i}</span>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Card 5: Banner Carousel (Moved to bottom) */}
        <BannerCarousel images={banner3List} />

      </div>
    </div>
  );
}
