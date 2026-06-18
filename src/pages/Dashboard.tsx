import { useState, useRef, useEffect, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Briefcase, CheckCircle2, Activity, DollarSign, Building2, 
  Users, ListOrdered, AlertCircle, AlertTriangle, FileText, UserPlus, 
  Package, Box, Coffee, ShieldCheck, Settings, Grip, Camera, Loader2, X, Image as ImageIcon, RefreshCw, Bell, Plus, File as FileIcon, Link
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { DriveService } from '../lib/driveService';
import { getSheetData, appendSheetData, updateSheetData } from '../lib/api';

type ActionItem = {
  id: string;
  label: string;
  icon: any; // using any for simplicity, can be LucideIcon
  color: string;
  path?: string;
  isImageUpload?: boolean;
  isFileUpload?: boolean;
};

const LionParcelIcon = (props: { className?: string }) => {
  return (
    <img 
      src="https://i.ibb.co.com/gbksTwPr/lion-parcel-461x512.png" 
      alt="Lion Parcel" 
      className={cn("object-contain", props.className)} 
      style={{ filter: "none" }}
    />
  );
};

const LghIcon = (props: { className?: string }) => {
  return (
    <img 
      src="https://i.ibb.co.com/V0WH2wQN/lovissa.png" 
      alt="LGH" 
      className={cn("object-contain", props.className)} 
      style={{ filter: "none" }}
    />
  );
};

const ChillhubIcon = (props: { className?: string }) => {
  return (
    <img 
      src="https://i.ibb.co.com/Y4dtQSpg/Main-Logo-Black-2.png" 
      alt="Chillhub" 
      className={cn("object-contain", props.className)} 
      style={{ filter: "none" }}
    />
  );
};

const BoganathaIcon = (props: { className?: string }) => {
  return (
    <img 
      src="https://i.ibb.co.com/VWMgNrNj/boganatha.png" 
      alt="Boganatha" 
      className={cn("object-contain", props.className)} 
      style={{ filter: "none" }}
    />
  );
};

const ALL_ACTIONS: ActionItem[] = [
  { id: '1', label: 'Project', icon: Briefcase, color: 'text-blue-600', path: '/projects' },
  { id: '3', label: 'Task', icon: CheckCircle2, color: 'text-green-600', path: '/all-tasks' },
  { id: '5', label: 'Order Budget', icon: DollarSign, color: 'text-yellow-600' },
  { id: '6', label: 'Unit', icon: Building2, color: 'text-indigo-600', path: '/units' },
  { id: '7', label: 'Contact', icon: Users, color: 'text-pink-600', path: '/contacts' },
  { id: '8', label: 'Daftar Order', icon: ListOrdered, color: 'text-teal-600', path: '/orders' },
  { id: '9', label: 'Daftar Issue', icon: AlertCircle, color: 'text-red-600', path: '/issues' },
  { id: '10', label: 'Activities', icon: Activity, color: 'text-purple-600', path: '/activities' },
  { id: '11', label: 'Warga', icon: UserPlus, color: 'text-cyan-600', path: '/users' },
  { id: '12', label: 'Lion Parcel', icon: LionParcelIcon, color: 'text-sky-600' },
  { id: '13', label: 'LGH', icon: LghIcon, color: 'text-violet-600', path: '/lgh-form' },
  { id: '14', label: 'Chillhub', icon: ChillhubIcon, color: 'text-fuchsia-600' },
  { id: '15', label: 'Boganatha', icon: BoganathaIcon, color: 'text-rose-600', path: '/boganatha-transactions' },
  { id: '16', label: 'Setting', icon: Settings, color: 'text-slate-600', path: '/settings' },
  { id: 'add_issue', label: 'Add Issue', icon: Plus, color: 'text-emerald-600' },
];

function BannerCarousel({ 
  items, 
  onItemClick 
}: { 
  items: { image: string; judul?: string; linkTo?: string }[]; 
  onItemClick?: (link: string | undefined) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 7000); // 7 seconds automatic slide interval completed as requested
    return () => clearInterval(timer);
  }, [items.length]);

  if (items.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 relative h-40">
      <div 
        className="flex transition-transform duration-500 ease-in-out h-full"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {items.map((item, i) => (
          item.image && typeof item.image === 'string' && item.image.trim() !== '' ? (
            <div 
              key={i} 
              onClick={() => onItemClick?.(item.linkTo)}
              className={cn(
                "w-full h-full flex-shrink-0 relative", 
                item.linkTo && item.linkTo.trim() !== '' ? "cursor-pointer" : ""
              )}
            >
              <img src={item.image} className="w-full h-full object-cover" alt={`Banner ${i + 1}`} />
              {item.judul && item.judul.trim() !== '' ? (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-3">
                  <span className="text-white text-sm font-medium drop-shadow-sm">{item.judul}</span>
                </div>
              ) : null}
            </div>
          ) : null
        ))}
      </div>
      {items.length > 1 && (
        <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5 z-10">
          {items.map((_, i) => (
            <button 
              key={i} 
              onClick={() => setCurrentIndex(i)}
              className={cn("h-1.5 rounded-full transition-all duration-300 cursor-pointer", currentIndex === i ? "w-4 bg-white" : "w-1.5 bg-white/50")}
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
  
  const [banner1, setBanner1] = useState<{image: string, judul: string, linkTo?: string} | null>(null);
  const [banner2List, setBanner2List] = useState<{image: string, judul: string, linkTo?: string}[]>([]);
  const [banner3List, setBanner3List] = useState<{image: string, judul?: string, linkTo?: string}[]>([]);

  // Interface for unread Task notifications
  interface UnreadTask {
    id: string;
    name: string;
    dueDate: string;
    rowNumber: number;
    readColLetter: string;
  }

  // Interface for unread Sub Task notifications
  interface UnreadSubtask {
    id: string;
    name: string;
    dueDate: string;
    rowNumber: number;
    readColLetter: string;
    sheetName: 'Sub Task' | 'Subtask';
  }

  interface OverdueTask {
    id: string;
    name: string;
    dueDate: string;
    daysOverdue: number;
    status: string;
  }

  const currentUserEmail = localStorage.getItem('mtask_user_email') || 'user@example.com';
  const [unreadTasks, setUnreadTasks] = useState<UnreadTask[]>([]);
  const [unreadSubtasks, setUnreadSubtasks] = useState<UnreadSubtask[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<OverdueTask[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [subNotifLoading, setSubNotifLoading] = useState(false);
  const [activeUserName, setActiveUserName] = useState<string>('');

  // Helper to convert index to letter (A, B, C... Z, AA, AB)
  const getColLetter = (colIndex: number): string => {
    let temp = colIndex;
    let letter = '';
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  // Effect to fetch unread notifications (Tasks & Sub Tasks & User Profile Name)
  useEffect(() => {
    if (!currentUserEmail) return;

    let timer: NodeJS.Timeout;

    const fetchAllNotifications = async () => {
      try {
        // 1. Fetch User details to get Active User's name
        const userRes = await getSheetData('User!A1:Z1000').catch(() => null);
        if (userRes?.values && userRes.values.length > 0) {
          const userHeaders = userRes.values[0] as string[];
          const emailIdx = userHeaders.findIndex(h => h?.trim().toUpperCase() === 'EMAIL');
          const nameIdx = userHeaders.findIndex(h => h?.trim().toUpperCase() === 'NAME');
          if (emailIdx > -1 && nameIdx > -1) {
            const userRow = userRes.values.slice(1).find((row: any[]) => row[emailIdx]?.trim().toLowerCase() === currentUserEmail.toLowerCase());
            if (userRow && userRow[nameIdx]) {
              setActiveUserName(userRow[nameIdx].trim());
            }
          }
        }

        // 2. Fetch Tasks Notifications
        const taskRes = await getSheetData('Task!A1:Z2000').catch(() => null);
        if (taskRes?.values && taskRes.values.length > 0) {
          const taskHeaders = taskRes.values[0] as string[];
          const userIdx = taskHeaders.findIndex(h => h?.trim().toUpperCase() === 'USER' || h?.trim().toUpperCase() === 'EMAIL');
          const readIdx = taskHeaders.findIndex(h => {
            const norm = h?.trim().toUpperCase();
            return norm === 'TASK READ' || norm === 'READ' || norm === 'TASK_READ';
          });
          const idIdx = taskHeaders.findIndex(h => h?.trim().toUpperCase() === 'TASK ID' || h?.trim().toUpperCase() === 'ID');
          const nameIdx = taskHeaders.findIndex(h => h?.trim().toUpperCase() === 'TASK NAME' || h?.trim().toUpperCase() === 'TITLE');
          const dueIdx = taskHeaders.findIndex(h => h?.trim().toUpperCase() === 'TASK DUE DATE' || h?.trim().toUpperCase() === 'DUE DATE');

          const statusIdx = taskHeaders.findIndex(h => h?.trim().toUpperCase() === 'STATUS');
          if (userIdx > -1 && readIdx > -1) {
            const pending: UnreadTask[] = [];
            const overdues: OverdueTask[] = [];
            const readColLetter = getColLetter(readIdx);

            taskRes.values.slice(1).forEach((row: any[], index: number) => {
              const uEmail = (row[userIdx] || '').toString().trim().toLowerCase();

              if (uEmail === currentUserEmail.toLowerCase()) {
                const isRead = (row[readIdx] || '').toString().trim().toUpperCase() === 'TRUE';

                // Track unread notifications
                if (!isRead) {
                  pending.push({
                    id: idIdx > -1 ? (row[idIdx]?.trim() || '') : '',
                    name: nameIdx > -1 ? (row[nameIdx]?.trim() || '') : 'Unnamed Task',
                    dueDate: dueIdx > -1 ? (row[dueIdx]?.trim() || '') : '',
                    rowNumber: index + 2,
                    readColLetter
                  });
                }

                // Track Overdue active user tasks
                const status = statusIdx > -1 ? (row[statusIdx] || '').toString().trim().toLowerCase() : '';
                const isCompleted = status.includes('complete') || status.includes('done') || status.includes('selesai') || status.includes('cancel') || status.includes('batal');

                if (!isCompleted) {
                  const dueDateStr = dueIdx > -1 ? (row[dueIdx] || '').toString().trim() : '';
                  if (dueDateStr) {
                    const due = new Date(dueDateStr);
                    if (!isNaN(due.getTime())) {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      due.setHours(0, 0, 0, 0);
                      const diffTime = due.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      if (diffDays < 0) {
                        overdues.push({
                          id: idIdx > -1 ? (row[idIdx]?.trim() || '') : '',
                          name: nameIdx > -1 ? (row[nameIdx]?.trim() || '') : 'Unnamed Task',
                          dueDate: dueDateStr,
                          daysOverdue: Math.abs(diffDays),
                          status: row[statusIdx] || 'To Do'
                        });
                      }
                    }
                  }
                }
              }
            });
            setUnreadTasks(pending);
            setOverdueTasks(overdues);
          }
        }

        // 3. Fetch Sub Tasks Notifications
        const [subRes1, subRes2] = await Promise.all([
          getSheetData('Subtask!A1:Z3000').catch(() => null),
          getSheetData('Sub Task!A1:Z3000').catch(() => null),
        ]);
        const subRes = subRes2?.values ? subRes2 : subRes1;
        const subSheetName = subRes2?.values ? 'Sub Task' : 'Subtask';

        if (subRes?.values && subRes.values.length > 0) {
          const subHeaders = subRes.values[0] as string[];
          const userIdx = subHeaders.findIndex(h => h?.trim().toUpperCase() === 'USER' || h?.trim().toUpperCase() === 'ASSIGNED TO');
          const readIdx = subHeaders.findIndex(h => {
            const norm = h?.trim().toUpperCase();
            return norm === 'READ' || norm === 'SUBTASK READ' || norm === 'SUB_TASK_READ' || norm === 'READ_STATUS';
          });
          const idIdx = subHeaders.findIndex(h => h?.trim().toUpperCase() === 'SUBTASK ID' || h?.trim().toUpperCase() === 'ID');
          const nameIdx = subHeaders.findIndex(h => h?.trim().toUpperCase() === 'SUBTASK NAME' || h?.trim().toUpperCase() === 'SUBTASK' || h?.trim().toUpperCase() === 'TITLE');
          const dueIdx = subHeaders.findIndex(h => h?.trim().toUpperCase() === 'SUBTASK DUE DATE' || h?.trim().toUpperCase() === 'DUE DATE');

          if (userIdx > -1 && readIdx > -1) {
            const pendingSub: UnreadSubtask[] = [];
            const readColLetter = getColLetter(readIdx);

            subRes.values.slice(1).forEach((row: any[], index: number) => {
              const uEmail = (row[userIdx] || '').toString().trim().toLowerCase();
              const isRead = (row[readIdx] || '').toString().trim().toUpperCase() === 'TRUE';

              if (uEmail === currentUserEmail.toLowerCase() && !isRead) {
                pendingSub.push({
                  id: idIdx > -1 ? (row[idIdx]?.trim() || '') : '',
                  name: nameIdx > -1 ? (row[nameIdx]?.trim() || '') : 'Unnamed Sub Task',
                  dueDate: dueIdx > -1 ? (row[dueIdx]?.trim() || '') : '',
                  rowNumber: index + 2,
                  readColLetter,
                  sheetName: subSheetName as 'Sub Task' | 'Subtask'
                });
              }
            });
            setUnreadSubtasks(pendingSub);
          }
        }
      } catch (err) {
        console.warn('Error fetching custom notifications:', err);
      }
    };

    fetchAllNotifications();
    timer = setInterval(fetchAllNotifications, 10000); // Poll notifications every 10 seconds

    return () => {
      clearInterval(timer);
    };
  }, [currentUserEmail]);

  // Click handler to mark read and redirect
  const handleNotifClick = async (task: UnreadTask) => {
    if (notifLoading) return;
    setNotifLoading(true);
    try {
      const range = `Task!${task.readColLetter}${task.rowNumber}`;
      await updateSheetData(range, [['TRUE']]);
      
      // Update local state is immediate
      setUnreadTasks(prev => prev.filter(t => t.id !== task.id));
      
      // Navigate to detail
      navigate(`/tasks/${task.id}`);
    } catch (err) {
      console.error('Failed to mark task as read:', err);
      alert('Gagal menandai task sebagai sudah dibaca.');
    } finally {
      setNotifLoading(false);
    }
  };

  // Click handler for sub tasks
  const handleSubNotifClick = async (sub: UnreadSubtask) => {
    if (subNotifLoading) return;
    setSubNotifLoading(true);
    try {
      const range = `${sub.sheetName}!${sub.readColLetter}${sub.rowNumber}`;
      await updateSheetData(range, [['TRUE']]);
      
      // Update local state is immediate
      setUnreadSubtasks(prev => prev.filter(t => t.id !== sub.id));
      
      // Navigate to activity detail
      navigate(`/activities/${sub.id}`);
    } catch (err) {
      console.error('Failed to mark subtask as read:', err);
      alert('Gagal menandai sub task sebagai sudah dibaca.');
    } finally {
      setSubNotifLoading(false);
    }
  };

  const handleBannerClick = (link: string | undefined) => {
    if (!link || link.trim() === '') return;
    const target = link.trim();
    if (target.startsWith('/') || target.startsWith('http') || target.startsWith('#')) {
      if (target.startsWith('http')) {
        window.location.href = target;
      } else {
        navigate(target);
      }
    } else {
      navigate('/' + target);
    }
  };

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
          const linkToIdx = headers.findIndex((h: string) => {
            const norm = h?.trim().toLowerCase();
            return norm === 'link to' || norm === 'link_to' || norm === 'link' || norm === 'target' || norm === 'url';
          });

          if (imgIdx > -1 && lokIdx > -1 && showIdx > -1) {
            const data = res.values.slice(1).map((row: any[]) => ({
              image: row[imgIdx] || '',
              lokasi: row[lokIdx]?.trim() || '',
              show: (row[showIdx] || '').toString().trim().toUpperCase() === 'TRUE',
              judul: judulIdx > -1 ? (row[judulIdx] || '') : '',
              linkTo: linkToIdx > -1 ? (row[linkToIdx] || '') : ''
            }));
            
            const b1 = data.find((r: any) => r.lokasi === 'OK 1' && r.show);
            if (b1) {
              setBanner1({ 
                image: b1.image?.trim() ? b1.image : 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=2670&auto=format&fit=crop', 
                judul: b1.judul,
                linkTo: b1.linkTo
              });
            } else {
              setBanner1(null);
            }
            
            const b2List = data.filter((r: any) => r.lokasi === 'OK 2' && r.show).map((r: any, i: number) => ({ 
              image: r.image?.trim() ? r.image : `https://images.unsplash.com/photo-1664575602276-acd073f104c1?q=80&w=2670&auto=format&fit=crop&sig=${i+10}`, 
              judul: r.judul,
              linkTo: r.linkTo
            }));
            setBanner2List(b2List);
            
            const b3List = data.filter((r: any) => r.lokasi === 'OK 3' && r.show).map((r: any, i: number) => ({
              image: r.image?.trim() ? r.image : `https://images.unsplash.com/photo-1556761175-4b46a572b786?q=80&w=2574&auto=format&fit=crop&sig=${i+20}`,
              judul: r.judul,
              linkTo: r.linkTo
            }));
            setBanner3List(b3List);
          }
        }
        setLastSync(new Date().toLocaleTimeString());
        setSyncStatus('idle');
      } catch (err: any) {
        if (err.message !== 'Mock authentication used, bypassing Sheets API' && err.message !== 'Not authenticated') {
           // console.warn('Polling error:', err.message);
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

  // Click counts tracking & Favorite calculating
  const [clickCounts, setClickCounts] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem('quick_action_click_counts') || '{}');
    } catch {
      return {};
    }
  });

  const recordClick = (id: string) => {
    const updated = { ...clickCounts, [id]: (clickCounts[id] || 0) + 1 };
    setClickCounts(updated);
    try {
      localStorage.setItem('quick_action_click_counts', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const favoriteActions = (() => {
    const sorted = Object.keys(clickCounts)
      .filter(id => clickCounts[id] > 0)
      .sort((a, b) => clickCounts[b] - clickCounts[a]);

    const found = sorted.map(id => ALL_ACTIONS.find(a => a.id === id)).filter(Boolean) as ActionItem[];
    if (found.length < 4) {
      const defaults = ['3', '9', '6', '1'] // Task, Daftar Issue, Unit, Project
        .map(id => ALL_ACTIONS.find(a => a.id === id))
        .filter(Boolean) as ActionItem[];
      const combined = [...found];
      defaults.forEach(def => {
        if (combined.length < 4 && !combined.some(item => item.id === def.id)) {
          combined.push(def);
        }
      });
      return combined;
    }
    return found.slice(0, 4);
  })();

  // Unit Business list for dropdown selectors
  const [unitList, setUnitList] = useState<any[]>([]);
  const [contacts, setContacts] = useState<{ id: string; name: string; type: string }[]>([]);

  useEffect(() => {
    async function loadUnitsAndContacts() {
      try {
        const [res, contactRes] = await Promise.all([
          getSheetData('Unit!A1:Z500').catch(() => null),
          getSheetData('Contact!A1:Z500').catch(() => null)
        ]);

        if (res?.values?.length > 1) {
          const headers = res.values[0] as string[];
          const idIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ID' || h?.trim().toUpperCase() === 'UNIT ID');
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'UNIT NAME');
          const logoIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'LOGO' || h?.trim().toUpperCase() === 'IMAGE');
          const fetched = res.values.slice(1).map((row: any[]) => {
            const id = idIdx > -1 ? row[idIdx]?.trim() || '' : '';
            const name = nameIdx > -1 ? row[nameIdx]?.trim() || id : id;
            const logo = logoIdx > -1 ? row[logoIdx]?.trim() || '' : '';
            return { id, name, logo };
          }).filter(u => u.id);
          setUnitList(fetched);
        }

        if (contactRes?.values?.length > 0) {
          const cHeaders = contactRes.values[0] as string[];
          const cIdIdx = cHeaders.findIndex(h => h?.trim().toUpperCase() === 'ID' || h?.trim().toUpperCase() === 'CONTACT ID');
          const cNameIdx = cHeaders.findIndex(h => h?.trim().toUpperCase() === 'NAME');
          const cTypeIdx = cHeaders.findIndex(h => h?.trim().toUpperCase() === 'TYPE');
          if (cNameIdx > -1) {
            const fetched = contactRes.values.slice(1).map((row: any[], i: number) => {
              const cId = cIdIdx > -1 ? row[cIdIdx]?.trim() : `contact-${i}`;
              const cName = row[cNameIdx]?.trim() || '';
              const cType = cTypeIdx > -1 ? row[cTypeIdx]?.trim() : '';
              return { id: cId, name: cName, type: cType };
            }).filter((c: any) => c.name);
            setContacts(fetched);
          }
        }
      } catch (err) {
        console.warn('Failed to load unit or contact list:', err);
      }
    }
    loadUnitsAndContacts();
  }, []);

  // Form handling states
  const [activeFormAction, setActiveFormAction] = useState<ActionItem | null>(null);
  
  // Detailed Order Budget States for Dashboard Quick Action
  const [obType, setObType] = useState<string>('');
  const [obVendorId, setObVendorId] = useState<string>('');
  const [obTallentId, setObTallentId] = useState<string>('');
  const [obAmount, setObAmount] = useState<string>('');
  const [obVia, setObVia] = useState<string>('');
  const [obBank, setObBank] = useState<string>('');
  const [obRekNo, setObRekNo] = useState<string>('');
  const [obAtasNama, setObAtasNama] = useState<string>('');
  const [obBerita, setObBerita] = useState<string>('');
  const [obNote, setObNote] = useState<string>('');
  const [obQrisFile, setObQrisFile] = useState<File | null>(null);
  const [obEwalletName, setObEwalletName] = useState<string>('');
  const [obEwalletNo, setObEwalletNo] = useState<string>('');
  const [obVirtualNo, setObVirtualNo] = useState<string>('');
  const [obNotaFile, setObNotaFile] = useState<File | null>(null);
  const [obUnitId, setObUnitId] = useState<string>('');
  const [obPurpose, setObPurpose] = useState<string>('');
  const [isOpenUnitDropdown, setIsOpenUnitDropdown] = useState<boolean>(false);
  
  // Add Issue custom states
  const [issueUnitId, setIssueUnitId] = useState('');
  const [issueInfo, setIssueInfo] = useState('');
  const [issueNote, setIssueNote] = useState('');
  const [issueType, setIssueType] = useState<'Photo' | 'File' | 'Link'>('Photo');
  const [issuePhotoFile, setIssuePhotoFile] = useState<File | null>(null);
  const [issuePhotoPreview, setIssuePhotoPreview] = useState<string>('');
  const [issueDocFile, setIssueDocFile] = useState<File | null>(null);
  const [issueLinkUrl, setIssueLinkUrl] = useState('');
  const [showIssueCameraModal, setShowIssueCameraModal] = useState(false);
  const [isOpenIssueUnitDropdown, setIsOpenIssueUnitDropdown] = useState(false);
  const issuePhotoInputRef = useRef<HTMLInputElement>(null);
  const issueFileInputRef = useRef<HTMLInputElement>(null);

  // Sync and cleanup local object URL for Photo attachment review
  useEffect(() => {
    if (!issuePhotoFile) {
      setIssuePhotoPreview('');
      return;
    }
    const url = URL.createObjectURL(issuePhotoFile);
    setIssuePhotoPreview(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [issuePhotoFile]);
  
  // Custom automatic trigger for Camera / File picker depending on Selected Attachment Mode
  useEffect(() => {
    if (activeFormAction?.id === 'add_issue') {
      if (issueType === 'Photo') {
        setShowIssueCameraModal(true);
      } else if (issueType === 'File') {
        setTimeout(() => {
          issueFileInputRef.current?.click();
        }, 150);
      }
    }
  }, [issueType, activeFormAction?.id]);
  
  const obFileInputRef = useRef<HTMLInputElement>(null);
  const obNotaFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeFormAction?.id === '5') {
      setObType('');
      setObVendorId('');
      setObTallentId('');
      setObAmount('');
      setObVia('');
      setObBank('');
      setObRekNo('');
      setObAtasNama('');
      setObBerita('');
      setObNote('');
      setObQrisFile(null);
      setObEwalletName('');
      setObEwalletNo('');
      setObVirtualNo('');
      setObNotaFile(null);
      setObUnitId('');
      setObPurpose('');
      setIsOpenUnitDropdown(false);
    }
    if (activeFormAction?.id === 'add_issue') {
      setIssueUnitId('');
      setIssueInfo('');
      setIssueNote('');
      setIssueType('Photo');
      setIssuePhotoFile(null);
      setIssueDocFile(null);
      setIssueLinkUrl('');
      setShowIssueCameraModal(false);
      setIsOpenIssueUnitDropdown(false);
    }
    if (activeFormAction?.id !== '14') {
      setChAmount('');
      setChNotaFile(null);
      setShowChCameraModal(false);
    }
  }, [activeFormAction]);
  const [formData, setFormData] = useState({
    unitId: '',
    detail: '',
    note: '',
    amount: '',
    purpose: '',
    trackingId: '',
    receiver: '',
    address: '',
    weight: '',
    menuItem: '',
    quantity: '1',
    itemName: '',
    spec: '',
    category: 'Operational',
  });
  const [formIsSubmitting, setFormIsSubmitting] = useState(false);
  const [formImageFile, setFormImageFile] = useState<File | null>(null);
  const [formImageUrl, setFormImageUrl] = useState('');

  // Lion Parcel specific form states
  const [lpNoResi, setLpNoResi] = useState('');
  const [lpNamaPengirim, setLpNamaPengirim] = useState('');
  const [lpTujuan, setLpTujuan] = useState('');
  const [lpLayanan, setLpLayanan] = useState('');
  const [lpBerat, setLpBerat] = useState('');
  const [lpJenisBarang, setLpJenisBarang] = useState('');
  const [lpTarifStr, setLpTarifStr] = useState('');
  const [lpKeterangan, setLpKeterangan] = useState('');
  const [lpBuktiBayarFile, setLpBuktiBayarFile] = useState<File | null>(null);
  const [showLpCameraModal, setShowLpCameraModal] = useState(false);
  const lpFileInputRef = useRef<HTMLInputElement>(null);

  // Chillhub Daily Sale Report states
  const [chAmount, setChAmount] = useState<string>('');
  const [chNotaFile, setChNotaFile] = useState<File | null>(null);
  const [showChCameraModal, setShowChCameraModal] = useState(false);
  const chFileInputRef = useRef<HTMLInputElement>(null);

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeFormAction) return;

    setFormIsSubmitting(true);
    try {
      const ts = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      const randomId = Math.floor(10000 + Math.random() * 90000);
      
      let finalImgUrl = '';
      if (formImageFile) {
        try {
          const uploadRes = await DriveService.uploadFile(formImageFile);
          finalImgUrl = uploadRes.url;
        } catch (uploadErr) {
          console.warn('Image upload failed, falling back', uploadErr);
        }
      }

      if (activeFormAction.id === 'add_issue') {
        if (!issueUnitId) {
          alert('Silakan pilih Unit Business terlebih dahulu!');
          setFormIsSubmitting(false);
          return;
        }
        if (!issueInfo.trim()) {
          alert('Silakan isi detail issue!');
          setFormIsSubmitting(false);
          return;
        }

        let uploadedPhotoUrl = '';
        let uploadedFileUrl = '';
        let finalUrlValue = '';

        if (issueType === 'Photo') {
          if (!issuePhotoFile) {
            alert('Silakan ambil atau pilih foto terlebih dahulu!');
            setFormIsSubmitting(false);
            return;
          }
          try {
            const uploadRes = await DriveService.uploadFile(issuePhotoFile);
            uploadedPhotoUrl = uploadRes.url;
          } catch (uploadErr) {
            console.error('Failed uploading photo asset:', uploadErr);
          }
        } else if (issueType === 'File') {
          if (!issueDocFile) {
            alert('Silakan pilih file terlebih dahulu!');
            setFormIsSubmitting(false);
            return;
          }
          try {
            const uploadRes = await DriveService.uploadFile(issueDocFile);
            uploadedFileUrl = uploadRes.url;
          } catch (uploadErr) {
            console.error('Failed uploading file asset:', uploadErr);
          }
        } else if (issueType === 'Link') {
          if (!issueLinkUrl.trim()) {
            alert('Silakan isi URL link terlebih dahulu!');
            setFormIsSubmitting(false);
            return;
          }
          finalUrlValue = issueLinkUrl.trim();
        }

        // Fetch sheet headers dynamically
        let dokHeaders: string[] = [];
        let sheetName = 'Dok Sub Task';
        let dokRes = await getSheetData('Dok Sub Task!A1:Z1').catch(() => null);
        if (!dokRes || !dokRes.values) {
          dokRes = await getSheetData('Dok Subtask!A1:Z1').catch(() => null);
          if (dokRes && dokRes.values) {
            sheetName = 'Dok Subtask';
          }
        }
        if (dokRes && dokRes.values && dokRes.values[0]) {
          dokHeaders = dokRes.values[0] as string[];
        } else {
          dokHeaders = ['Timestamp', 'Unit', 'Info', 'Note', 'Title_Dok', 'Status', 'Image_01', 'File_01', 'Url_01', 'Dok Sub ID', 'Issue ID', 'User', 'Sub_ID'];
        }

        const newRow = new Array(dokHeaders.length || 15).fill('');
        const setCol = (headerName: string, value: any) => {
          const normName = headerName.trim().toUpperCase().replace(/[\s._-]+/g, '');
          const idx = dokHeaders.findIndex(h => {
            if (!h) return false;
            const normH = h.trim().toUpperCase().replace(/[\s._-]+/g, '');
            if (normH === normName) return true;
            
            if (normName === 'DOKSUBID' && (normH === 'DOKSUBID' || normH === 'DOKSUB_ID' || normH === 'DOK' || normH === 'SUBTASKID')) return true;
            if (normName === 'ISSUEID' && (normH === 'ISSUEID' || normH === 'ISSUE_ID' || normH === 'ISSUE' || normH === 'ID_ISSUE')) return true;
            if (normName === 'SUBID' && (normH === 'SUBID' || normH === 'SUB_ID')) return true;
            if (normName === 'TITLEDOK' && (normH === 'TITLEDOK' || normH === 'TITLE_DOK')) return true;
            if (normName === 'IMAGE01' && (normH === 'IMAGE01' || normH === 'IMAGE_01' || normH === 'FOTO' || normH === 'PHOTO' || normH === 'FOTO_01')) return true;
            if (normName === 'FILE01' && (normH === 'FILE01' || normH === 'FILE_01' || normH === 'DOKUMEN')) return true;
            if (normName === 'URL01' && (normH === 'URL01' || normH === 'URL_01' || normH === 'LINK')) return true;

            if (normName.length > 2 && normH.includes(normName)) return true;
            if (normH.length > 2 && normName.includes(normH)) return true;
            return false;
          });
          if (idx > -1) {
            newRow[idx] = value;
          }
        };

        const uniqueDokSubId = `ISSUE-${Math.floor(1000 + Math.random() * 9000)}`;
        const issueTs = (() => {
          const d = new Date();
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Jakarta',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          });
          const parts = formatter.formatToParts(d);
          const month = parts.find(p => p.type === 'month')?.value || '01';
          const day = parts.find(p => p.type === 'day')?.value || '01';
          const year = parts.find(p => p.type === 'year')?.value || '2026';
          return `${month}/${day}/${year}`;
        })();

        setCol('Dok Sub ID', uniqueDokSubId);
        setCol('Issue ID', uniqueDokSubId);
        setCol('Timestamp', issueTs);
        setCol('Sub_ID', '');
        setCol('User', currentUserEmail);
        setCol('Title_Dok', 'Issue');
        setCol('Unit', issueUnitId);
        setCol('Info', issueInfo.trim());
        setCol('Note', issueNote.trim());
        setCol('Image_01', uploadedPhotoUrl);
        setCol('File_01', uploadedFileUrl);
        setCol('Url_01', finalUrlValue);
        setCol('Status', '');

        await appendSheetData(`${sheetName}!A1:Z`, [newRow]);
        alert('Laporan Issue berhasil dikirim!');
        setActiveFormAction(null);
        setFormIsSubmitting(false);
        return;
      } else if (activeFormAction.id === '5') {
        const orderIdRandom = `order-${Math.floor(1000 + Math.random() * 9000)}`;
        const tsDate = (() => {
          const d = new Date();
          return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
        })();
        
        let qrisUrl = '';
        if (obVia === 'Qris' && obQrisFile) {
          try {
            const res = await DriveService.uploadFile(obQrisFile);
            qrisUrl = `https://drive.google.com/file/d/${res.id}/view?usp=drivesdk`;
          } catch (uploadErr) {
            console.error('Failed to upload Qris image', uploadErr);
          }
        }

        let notaUrl = '';
        if (obType === 'Reimburse' && obNotaFile) {
          try {
            const res = await DriveService.uploadFile(obNotaFile);
            notaUrl = `https://drive.google.com/file/d/${res.id}/view?usp=drivesdk`;
          } catch (uploadErr) {
            console.error('Failed to upload Reimburse Nota', uploadErr);
          }
        }

        let orderHeadersFetched: string[] = [];
        try {
          const hRes = await getSheetData('Order Budget!A1:Z1').catch(() => null)
            || await getSheetData('OrderBudget!A1:Z1').catch(() => null);
          if (hRes?.values?.length > 0) {
            orderHeadersFetched = hRes.values[0] as string[];
          }
        } catch (err) {
          console.warn('Failed to fetch Order Budget headers:', err);
        }
        
        const headersToUse = orderHeadersFetched.length > 0 ? [...orderHeadersFetched] : [
          'Order ID', 'RO_NUMBER', 'Order Detail', 'Unit Business', 'Amount', 
          'Review Tier', 'Email User', 'Date', 'Project_id', 'Task_id', 
          'Sub Task_id', 'Order Type', 'Vendor', 'Tallent', 'Via', 'Bank', 
          'Rek No', 'A n', 'Berita', 'Catatan', 'Qris', 'Ewallet Name', 
          'Ewallet', 'Virtual', 'Nota Belanja', 'Status'
        ];

        const newRow = new Array(Math.max(headersToUse.length, 25)).fill('');
        const setCol = (name: string, value: string) => {
          const norm = name.trim().toUpperCase().replace(/[\s._-]+/g, '');
          let idx = headersToUse.findIndex(h => {
            if (!h) return false;
            const kh = h.trim().toUpperCase().replace(/[\s._-]+/g, '');
            return kh === norm || kh.includes(norm) || norm.includes(kh);
          });
          if (idx > -1) {
            newRow[idx] = value;
          } else {
            idx = headersToUse.length;
            headersToUse.push(name);
            while (newRow.length <= idx) {
              newRow.push('');
            }
            newRow[idx] = value;
          }
        };

        setCol('Order ID', orderIdRandom);
        setCol('RO_NUMBER', ''); // RO_Number biarkan kosong & sembunyikan
        setCol('Date', tsDate);
        setCol('Email User', currentUserEmail);
        setCol('Unit Business', obUnitId); // unitId writes to Unit Business
        setCol('Project_id', ''); // Project_id biarkan kosong
        setCol('Task_id', ''); // Task_id biarkan kosong
        setCol('Sub Task_id', ''); // Sub Task_id biarkan kosong
        setCol('Order Detail', obPurpose); // Keperluan writes to Order Detail
        setCol('Order Type', obType);
        
        if (obType === 'Vendor') {
          setCol('Vendor', obVendorId);
        } else if (obType === 'Tallent') {
          setCol('Tallent', obTallentId);
        }

        if (obType === 'Reimburse') {
          setCol('Nota Belanja', notaUrl);
        } else {
          setCol('Nota Belanja', '');
        }
        
        setCol('Amount', obAmount || '0'); // Amount field writes to Amount
        setCol('Via', obVia);
        
        if (obVia === 'Transfer') {
          setCol('Bank', obBank);
          setCol('Rek No', obRekNo);
          setCol('A n', obAtasNama);
          setCol('Berita', obBerita);
        } else if (obVia === 'Cash') {
          setCol('Catatan', obNote);
        } else if (obVia === 'Qris') {
          setCol('Qris', qrisUrl);
        } else if (obVia === 'Ewallet') {
          setCol('Ewallet Name', obEwalletName);
          setCol('Ewallet', obEwalletNo);
        } else if (obVia === 'Virtual Akun') {
          setCol('Virtual', obVirtualNo);
        }
        
        setCol('Review Tier', 'Review');
        setCol('Status', 'Review');

        await appendSheetData('Order Budget!A1:Z', [newRow]).catch(async () => {
          await appendSheetData('OrderBudget!A1:Z', [newRow]);
        });
        alert('Order Budget berhasil diajukan!');
        setActiveFormAction(null);
      } else if (activeFormAction.id === '12') {
        let finalLpProofUrl = '';
        if (lpBuktiBayarFile) {
          try {
            const uploadRes = await DriveService.uploadFile(lpBuktiBayarFile);
            finalLpProofUrl = uploadRes.url || `https://drive.google.com/file/d/${uploadRes.id}/view?usp=drivesdk`;
          } catch (uploadErr) {
            console.warn('Lion Parcel proof upload failed, falling back', uploadErr);
          }
        }

        // Fetch current headers from the sheets
        let lionHeaders: string[] = [];
        try {
          const res = await getSheetData('Lion Parcel!A1:Z1').catch(() => null) 
            || await getSheetData('LionParcel!A1:Z1').catch(() => null);
          if (res && res.values && res.values.length > 0) {
            lionHeaders = res.values[0] as string[];
          }
        } catch (err) {
          console.warn('Failed to fetch Lion Parcel headers: ', err);
        }

        const headersToUse = lionHeaders.length > 0 ? [...lionHeaders] : [
          'ID', 'Date', 'No. Resi', 'Nama Pengirim', 'Tujuan', 'Layanan',
          'Berat', 'Jenis Barang', 'Tarif Masuk', 'Keterangan', 'Bukti Bayar'
        ];
        
        const newRow = new Array(Math.max(headersToUse.length, 11)).fill('');
        
        const setCol = (name: string, value: string) => {
          const norm = name.trim().toUpperCase().replace(/[\s._-]+/g, '');
          let idx = headersToUse.findIndex(h => {
            if (!h) return false;
            const kh = h.trim().toUpperCase().replace(/[\s._-]+/g, '');
            return kh === norm || kh.includes(norm) || norm.includes(kh);
          });
          if (idx > -1) {
            newRow[idx] = value;
          } else {
            idx = headersToUse.length;
            headersToUse.push(name);
            while (newRow.length <= idx) {
              newRow.push('');
            }
            newRow[idx] = value;
          }
        };

        const randomLpcId = `Lpc-${Math.floor(1000 + Math.random() * 9000)}`;
        const nowD = new Date();
        const dateFormatted = `${(nowD.getMonth() + 1).toString().padStart(2, '0')}/${nowD.getDate().toString().padStart(2, '0')}/${nowD.getFullYear()}`;

        setCol('ID', randomLpcId);
        setCol('Date', dateFormatted);
        setCol('No. Resi', lpNoResi);
        setCol('Nama Pengirim', lpNamaPengirim);
        setCol('Tujuan', lpTujuan);
        setCol('Layanan', lpLayanan);
        setCol('Berat', lpBerat || '');
        setCol('Jenis Barang', lpJenisBarang);
        setCol('Tarif Masuk', lpTarifStr || '');
        setCol('Keterangan', lpKeterangan);
        setCol('Bukti Bayar', finalLpProofUrl);

        await appendSheetData('Lion Parcel!A1:Z', [newRow]).catch(async () => {
          await appendSheetData('LionParcel!A1:Z', [newRow]);
        });
        alert('Pengiriman Lion Parcel berhasil dicatat!');

        // Reset the Lion Parcel form states
        setLpNoResi('');
        setLpNamaPengirim('');
        setLpTujuan('');
        setLpLayanan('');
        setLpBerat('');
        setLpJenisBarang('');
        setLpTarifStr('');
        setLpKeterangan('');
        setLpBuktiBayarFile(null);
      } else if (activeFormAction.id === '14') {
        if (!chNotaFile) {
          alert('Silakan ambil atau pilih foto Nota terlebih dahulu!');
          setFormIsSubmitting(false);
          return;
        }

        let finalChNotaUrl = '';
        try {
          const uploadChRes = await DriveService.uploadFile(chNotaFile);
          finalChNotaUrl = uploadChRes.url || `https://drive.google.com/file/d/${uploadChRes.id}/view?usp=drivesdk`;
        } catch (uploadErr) {
          console.warn('Chillhub Nota upload failed, falling back', uploadErr);
        }

        const dNow = new Date();
        const randId = `chs-${Math.floor(1000 + Math.random() * 9000)}`;
        const formattedDate = `${(dNow.getMonth() + 1).toString().padStart(2, '0')}/${dNow.getDate().toString().padStart(2, '0')}/${dNow.getFullYear()}`;
        const formattedTime = dNow.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        // Fetch current headers from the sheets
        let chillhubHeaders: string[] = [];
        try {
          const res = await getSheetData('Chillhub Surabaya!A1:Z1').catch(() => null) 
            || await getSheetData('Chillhub!A1:Z1').catch(() => null);
          if (res?.values?.length > 0) {
            chillhubHeaders = res.values[0] as string[];
          }
        } catch (err) {
          console.warn('Failed to fetch Chillhub headers:', err);
        }

        const defaultHeaders = ['ID', 'Date', 'Time', 'Activities', 'Price', 'User', 'Nota'];
        const headersToUse = chillhubHeaders.length > 0 ? [...chillhubHeaders] : defaultHeaders;

        const newRow = new Array(Math.max(headersToUse.length, 7)).fill('');

        const setCol = (name: string, value: string) => {
          const norm = name.trim().toUpperCase().replace(/[\s._-]+/g, '');
          let idx = headersToUse.findIndex(h => {
            if (!h) return false;
            const kh = h.trim().toUpperCase().replace(/[\s._-]+/g, '');
            return kh === norm || kh.includes(norm) || norm.includes(kh);
          });
          if (idx > -1) {
            newRow[idx] = value;
          } else {
            idx = headersToUse.length;
            headersToUse.push(name);
            while (newRow.length <= idx) {
              newRow.push('');
            }
            newRow[idx] = value;
          }
        };

        setCol('ID', randId);
        setCol('Date', formattedDate);
        setCol('Time', formattedTime);
        setCol('Activities', 'Daily Sales');
        setCol('Price', chAmount);
        setCol('User', currentUserEmail);
        setCol('Nota', finalChNotaUrl);

        await appendSheetData('Chillhub Surabaya!A1:Z', [newRow]).catch(async () => {
          await appendSheetData('Chillhub!A1:Z', [newRow]);
        });

        alert('Chillhub Daily Sales Report berhasil dicatat!');

        // Reset the form states
        setChAmount('');
        setChNotaFile(null);
      } else if (activeFormAction.id === '13') {
        const newRow = [ts, formData.itemName, formData.quantity, formData.spec, currentUserEmail];
        await appendSheetData('LGH!A1:Z', [newRow]);
        alert('Form LGH berhasil dikirim!');
      } else if (activeFormAction.id === '15') {
        const newRow = [ts, formData.detail, formData.address, formData.category, currentUserEmail];
        await appendSheetData('Boganatha!A1:Z', [newRow]);
        alert('Laporan Boganatha berhasil dikirim!');
      }

      setFormData({
        unitId: '',
        detail: '',
        note: '',
        amount: '',
        purpose: '',
        trackingId: '',
        receiver: '',
        address: '',
        weight: '',
        menuItem: '',
        quantity: '1',
        itemName: '',
        spec: '',
        category: 'Operational',
      });
      setFormImageFile(null);
      setFormImageUrl('');
      setActiveFormAction(null);
    } catch (err: any) {
      console.error(err);
      alert('Gagal mengirim form: ' + err.message);
    } finally {
      setFormIsSubmitting(false);
    }
  };

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
      {/* Dynamic Pop-up Notification for New Unread Tasks & Sub Tasks */}
      <AnimatePresence>
        {unreadSubtasks.length > 0 ? (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              id="subtask-notif-dialog"
              className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full border border-gray-100 flex flex-col items-center text-center relative overflow-hidden"
            >
              {/* Highlight background accent */}
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
              
              {/* Close Button to dismiss temporarily */}
              <button 
                type="button"
                id="subtask-notif-close"
                onClick={() => setUnreadSubtasks([])}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer border-none bg-transparent"
                title="Sembunyikan"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon container */}
              <div className="w-16 h-16 bg-gradient-to-tr from-amber-50 to-orange-50 rounded-2xl flex items-center justify-center mb-4 mt-2 shadow-inner border border-amber-100/50">
                <Bell className="w-8 h-8 text-amber-600 animate-bounce" />
              </div>

              {/* Notification Header */}
              <h3 className="text-lg font-bold text-gray-900 tracking-tight leading-snug">
                {activeUserName || currentUserEmail.split('@')[0]}, kamu dapat tugas baru
              </h3>
              
              {/* Sub Task Details Card */}
              <div 
                id="subtask-notif-card"
                onClick={() => handleSubNotifClick(unreadSubtasks[0])}
                className="mt-4 p-4 w-full bg-slate-50/80 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100/80 hover:border-slate-200 transition-all hover:shadow-md group active:scale-[0.99] text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-white border border-gray-150 rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:bg-amber-50 group-hover:border-amber-200 transition-colors">
                    <CheckCircle2 className="w-4.5 h-4.5 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 leading-snug group-hover:text-amber-700 transition-colors line-clamp-2">
                      {unreadSubtasks[0].name}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-1.5 text-xs text-gray-400 font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-red-50 text-red-600 font-bold rounded-md shrink-0 uppercase tracking-widest text-[9px] border border-red-100 animate-pulse">
                          Due
                        </span>
                        <span className="truncate text-gray-500 font-semibold">{unreadSubtasks[0].dueDate || 'No Due Date'}</span>
                      </div>
                      <span className="text-[10px] text-amber-600 font-bold group-hover:underline self-end shrink-0">Buka Tugas →</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : unreadTasks.length > 0 ? (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              id="task-notif-dialog"
              className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full border border-gray-100 flex flex-col items-center text-center relative overflow-hidden"
            >
              {/* Highlight background accent */}
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-505" />
              
              {/* Close Button to dismiss temporarily */}
              <button 
                type="button"
                id="task-notif-close"
                onClick={() => setUnreadTasks([])}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer border-none bg-transparent"
                title="Sembunyikan"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon container */}
              <div className="w-16 h-16 bg-gradient-to-tr from-sky-50 to-indigo-50 rounded-2xl flex items-center justify-center mb-4 mt-2 shadow-inner border border-sky-100/50">
                <Bell className="w-8 h-8 text-sky-600 animate-bounce" />
              </div>

              {/* Notification Header */}
              <h3 className="text-lg font-bold text-gray-900 tracking-tight leading-snug">
                {activeUserName || currentUserEmail.split('@')[0]}, Kamu dapat Task Baru
              </h3>
              
              {/* Task Details Card */}
              <div 
                id="task-notif-card"
                onClick={() => handleNotifClick(unreadTasks[0])}
                className="mt-4 p-4 w-full bg-slate-50/80 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100/80 hover:border-slate-200 transition-all hover:shadow-md group active:scale-[0.99] text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-white border border-gray-150 rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:bg-sky-50 group-hover:border-sky-200 transition-colors">
                    <CheckCircle2 className="w-4.5 h-4.5 text-sky-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 leading-snug group-hover:text-sky-700 transition-colors line-clamp-2">
                      {unreadTasks[0].name}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-1.5 text-xs text-gray-400 font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-red-50 text-red-600 font-bold rounded-md shrink-0 uppercase tracking-widest text-[9px] border border-red-100 animate-pulse">
                          Due
                        </span>
                        <span className="truncate text-gray-500">{unreadTasks[0].dueDate || 'No Due Date'}</span>
                      </div>
                      <span className="text-[10px] text-sky-600 font-bold group-hover:underline self-end shrink-0">Buka Task →</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

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

      {showLpCameraModal && (
        <CameraModal 
          onClose={() => setShowLpCameraModal(false)}
          onCapture={(blob) => {
            const file = new File([blob], `capture_lion_${Date.now()}.jpg`, { type: 'image/jpeg' });
            setLpBuktiBayarFile(file);
            setShowLpCameraModal(false);
          }}
          onGallerySelect={() => {
            setShowLpCameraModal(false);
            lpFileInputRef.current?.click();
          }}
        />
      )}

      {showChCameraModal && (
        <CameraModal 
          onClose={() => setShowChCameraModal(false)}
          onCapture={(blob) => {
            const file = new File([blob], `capture_chillhub_${Date.now()}.jpg`, { type: 'image/jpeg' });
            setChNotaFile(file);
            setShowChCameraModal(false);
          }}
          onGallerySelect={() => {
            setShowChCameraModal(false);
            chFileInputRef.current?.click();
          }}
        />
      )}

      {showIssueCameraModal && (
        <CameraModal 
          onClose={() => setShowIssueCameraModal(false)}
          onCapture={(blob) => {
            const file = new File([blob], `capture_issue_${Date.now()}.jpg`, { type: 'image/jpeg' });
            setIssuePhotoFile(file);
            setShowIssueCameraModal(false);
          }}
          onGallerySelect={() => {
            setShowIssueCameraModal(false);
            issuePhotoInputRef.current?.click();
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
        </div>
      </header>

      <div className="px-4 space-y-6">
        {/* Card 1: Banner 1 */}
        {banner1 && typeof banner1.image === 'string' && banner1.image.trim() !== '' && (
          <div 
            onClick={() => handleBannerClick(banner1.linkTo)}
            className={cn(
              "bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 relative",
              banner1.linkTo && banner1.linkTo.trim() !== '' ? "cursor-pointer active:scale-[0.99] transition-transform" : ""
            )}
          >
            <img 
              src={banner1.image} 
              alt="Main Banner" 
              className="w-full h-40 object-cover"
            />
            {banner1.judul && banner1.judul.trim() !== '' && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end p-4">
                <span className="text-white text-base font-bold drop-shadow">{banner1.judul}</span>
              </div>
            )}
          </div>
        )}

        {/* Task Overdue Alert Section */}
        {overdueTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50/95 rounded-2xl p-4 border border-red-200/60 shadow-xs flex flex-col gap-3 relative overflow-hidden"
          >
            {/* Header with Icon and Badge count */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-red-900 text-sm tracking-tight text-left">Perhatian: Task Overdue!</h4>
                  <p className="text-[10px] text-red-700/85 font-medium text-left">Kamu memiliki {overdueTasks.length} tugas yang melewati tenggat waktu</p>
                </div>
              </div>
              <span className="bg-red-200 text-red-800 text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 animate-pulse border border-red-300">
                LATE
              </span>
            </div>

            {/* List of Overdue Tasks */}
            <div className="space-y-2 mt-1">
              {overdueTasks.slice(0, 5).map((t) => (
                <div
                  key={`overdue-${t.id}`}
                  onClick={() => navigate(`/tasks/${t.id}`)}
                  className="bg-white hover:bg-red-50/40 border border-red-100 hover:border-red-300 p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 shadow-xs active:scale-[0.99] group text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-800 truncate group-hover:text-red-700 transition-colors">
                      {t.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-400 font-medium font-mono">
                      <span>Due:</span>
                      <span className="text-red-600 font-semibold">{t.dueDate}</span>
                    </div>
                  </div>
                  
                  {/* Overdue Badge */}
                  <div className="flex flex-col items-end shrink-0">
                    <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[9px] font-extrabold rounded-md border border-red-100 uppercase whitespace-nowrap">
                      Lewat {t.daysOverdue} Hari
                    </span>
                    <span className="text-[9px] text-red-500 font-bold group-hover:underline mt-1 flex items-center gap-0.5 shrink-0">
                      Buka Task →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Card 2: Quick Actions */}
        <AnimatePresence>
          {showAll ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100 space-y-6"
            >
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-lg">Semua Layanan</h3>
                <button 
                  onClick={() => setShowAll(false)} 
                  className="text-sm font-semibold text-blue-600 hover:text-blue-800 shrink-0 cursor-pointer"
                >
                  Tutup
                </button>
              </div>

              {/* Group FAVORITE */}
              <div>
                <div className="flex flex-col mb-3">
                  <h4 className="text-xs font-extrabold text-blue-700 uppercase tracking-wider">Favorite</h4>
                  <p className="text-[10px] text-gray-400 font-sans font-medium">Quick action yang paling sering di click oleh user aktive</p>
                </div>
                <div className="grid grid-cols-4 gap-y-4 gap-x-2">
                  {favoriteActions.map((action) => (
                    <button 
                      key={`fav-${action.id}`} 
                      onClick={() => {
                        recordClick(action.id);
                        if (action.path) {
                          navigate(action.path);
                        } else {
                          setActiveFormAction(action);
                        }
                      }}
                      className="flex flex-col items-center gap-2 cursor-pointer transition-transform active:scale-95 duration-150"
                    >
                      <div className={cn("flex items-center justify-center p-2 rounded-2xl bg-gray-50/80 hover:bg-gray-100/80", action.color)}>
                        <action.icon className="w-8 h-8" />
                      </div>
                      <span className="text-[10px] font-semibold text-center text-gray-600 leading-tight">
                        {action.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Group GENERAL */}
              <div>
                <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-3">General</h4>
                <div className="grid grid-cols-4 gap-y-4 gap-x-2">
                  {['6', '1', '3', '10', '11', '7', '8', '9']
                    .map((id) => ALL_ACTIONS.find((a) => a.id === id))
                    .filter(Boolean)
                    .map((action: any) => (
                      <button 
                        key={`gen-${action.id}`} 
                        onClick={() => {
                          recordClick(action.id);
                          if (action.path) {
                            navigate(action.path);
                          } else {
                            setActiveFormAction(action);
                          }
                        }}
                        className="flex flex-col items-center gap-2 cursor-pointer transition-transform active:scale-95 duration-150"
                      >
                        <div className={cn("flex items-center justify-center p-2 rounded-2xl bg-gray-50/80 hover:bg-gray-100/80", action.color)}>
                          <action.icon className="w-8 h-8" />
                        </div>
                        <span className="text-[10px] font-semibold text-center text-gray-600 leading-tight">
                          {action.label}
                        </span>
                      </button>
                    ))}
                </div>
              </div>

              {/* Group FORM */}
              <div>
                <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-3 block">Form</h4>
                <div className="grid grid-cols-4 gap-y-4 gap-x-2">
                  {['5', '12', '14', '13', '15', 'add_issue']
                    .map((id) => ALL_ACTIONS.find((a) => a.id === id))
                    .filter(Boolean)
                    .map((action: any) => (
                      <button 
                        key={`form-${action.id}`} 
                        onClick={() => {
                          recordClick(action.id);
                          if (action.path) {
                            navigate(action.path);
                          } else {
                            setActiveFormAction(action);
                          }
                        }}
                        className="flex flex-col items-center gap-2 cursor-pointer transition-transform active:scale-95 duration-150 animate-fade-in"
                      >
                        <div className={cn("flex items-center justify-center p-2 rounded-2xl bg-gray-50/80 hover:bg-gray-100/80", action.color)}>
                          <action.icon className="w-8 h-8" />
                        </div>
                        <span className="text-[10px] font-semibold text-center text-gray-600 leading-tight whitespace-normal max-w-full">
                          {action.label}
                        </span>
                      </button>
                    ))}
                </div>
              </div>

              {/* Group SYSTEM */}
              <div>
                <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-3">System</h4>
                <div className="grid grid-cols-4 gap-y-4 gap-x-2">
                  {['16']
                    .map((id) => ALL_ACTIONS.find((a) => a.id === id))
                    .filter(Boolean)
                    .map((action: any) => (
                      <button 
                        key={`sys-${action.id}`} 
                        onClick={() => {
                          recordClick(action.id);
                          if (action.path) {
                            navigate(action.path);
                          } else {
                            setActiveFormAction(action);
                          }
                        }}
                        className="flex flex-col items-center gap-2 cursor-pointer transition-transform active:scale-95 duration-150 font-sans"
                      >
                        <div className={cn("flex items-center justify-center p-2 rounded-2xl bg-gray-50/80 hover:bg-gray-100/80", action.color)}>
                          <action.icon className="w-8 h-8" />
                        </div>
                        <span className="text-[10px] font-semibold text-center text-gray-600 leading-tight font-sans">
                          {action.label}
                        </span>
                      </button>
                    ))}
                </div>
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
                {favoriteActions.map((action) => (
                  <button 
                    key={action.id} 
                    onClick={() => {
                      recordClick(action.id);
                      if (action.path) {
                        navigate(action.path);
                      } else {
                        setActiveFormAction(action);
                      }
                    }}
                    className="flex flex-col items-center gap-2 cursor-pointer transition-transform active:scale-95"
                  >
                    <div className={cn("flex items-center justify-center p-2 rounded-2xl bg-gray-50/80 hover:bg-gray-100/80", action.color)}>
                      <action.icon className="w-7 h-7" />
                    </div>
                    <span className="text-[10px] font-semibold text-center text-gray-600 leading-tight">
                      {action.label}
                    </span>
                  </button>
                ))}
                
                {/* 9th Action: Lihat Semua (Always bottom left position visually in a 3x3 or 4-col layout context) */}
                <button 
                  onClick={() => setShowAll(true)}
                  className="flex flex-col items-center gap-2 cursor-pointer transition-transform active:scale-95"
                >
                  <div className="flex items-center justify-center p-2 text-gray-400 bg-gray-50/80 hover:bg-gray-100/80 rounded-2xl">
                    <Grip className="w-7 h-7" />
                  </div>
                  <span className="text-[10px] font-semibold text-center text-gray-600 leading-tight">
                    Lihat Semua
                  </span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Slide Up Sheet for Form Action */}
        <AnimatePresence>
          {activeFormAction && (
            <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center px-4">
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="bg-white rounded-t-3xl w-full max-w-md p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto mb-4"
              >
                <button 
                  type="button"
                  onClick={() => setActiveFormAction(null)}
                  className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-6 border-b pb-4">
                  <div className={cn("p-3 rounded-2xl bg-gray-50", activeFormAction.color)}>
                    <activeFormAction.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">
                      {activeFormAction.id === '14' ? 'Daily Sales' : activeFormAction.id === 'add_issue' ? 'Add Issue' : `Formulir ${activeFormAction.label}`}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {activeFormAction.id === '14' ? 'Laporan Penjualan harian Chillhub Surabaya' : 'Isi formulir dengan lengkap untuk mengirim data'}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                  {/* REDESIGNED ADD_ISSUE FORM POPUP */}
                  {activeFormAction.id === 'add_issue' && (
                    <div className="space-y-4 text-left">
                      {/* Unit Business Custom Dropdown Selector */}
                      <div className="relative">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                          Unit <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsOpenIssueUnitDropdown(!isOpenIssueUnitDropdown)}
                          className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-700 font-semibold flex items-center justify-between cursor-pointer"
                        >
                          {(() => {
                            const selectedUnit = unitList.find(u => u.id === issueUnitId);
                            if (selectedUnit) {
                              return (
                                <div className="flex items-center gap-2.5">
                                  {selectedUnit.logo ? (
                                    <img 
                                      src={selectedUnit.logo} 
                                      alt={selectedUnit.name} 
                                      className="w-5.5 h-5.5 rounded-full object-cover border border-gray-200 bg-white" 
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-5.5 h-5.5 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                                      {selectedUnit.name.substring(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                  <span>{selectedUnit.name}</span>
                                </div>
                              );
                            }
                            return <span className="text-gray-400 font-medium">-- Pilih Unit Business --</span>;
                          })()}
                          <Grip className="w-4 h-4 text-gray-400 rotate-90" />
                        </button>

                        <AnimatePresence>
                          {isOpenIssueUnitDropdown && (
                            <>
                              <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setIsOpenIssueUnitDropdown(false)} 
                              />
                              <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.15 }}
                                className="absolute left-0 right-0 mt-1.5 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 max-h-56 overflow-y-auto p-1.5 space-y-1"
                              >
                                {unitList.map((unit) => (
                                  <button
                                    key={unit.id}
                                    type="button"
                                    onClick={() => {
                                      setIssueUnitId(unit.id);
                                      setIsOpenIssueUnitDropdown(false);
                                    }}
                                    className={cn(
                                      "w-full px-3 py-2 text-sm rounded-xl flex items-center gap-3 text-left transition-all cursor-pointer hover:bg-gray-50",
                                      issueUnitId === unit.id ? "bg-indigo-50 text-indigo-700 font-bold" : "text-gray-700"
                                    )}
                                  >
                                    {unit.logo ? (
                                      <img 
                                        src={unit.logo} 
                                        alt={unit.name} 
                                        className="w-6 h-6 rounded-full object-cover border border-gray-200 bg-white shadow-sm shrink-0" 
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                        {unit.name.substring(0, 2).toUpperCase()}
                                      </div>
                                    )}
                                    <div className="flex flex-col">
                                      <span className="text-xs font-semibold text-gray-900">{unit.name}</span>
                                      <span className="text-[10px] text-gray-400 font-mono">{unit.id}</span>
                                    </div>
                                  </button>
                                ))}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* ISSUE Section */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                          ISSUE <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          required
                          rows={3}
                          placeholder="Tulis detail issue di sini..."
                          value={issueInfo}
                          onChange={(e) => setIssueInfo(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all font-sans text-gray-800 animate-none"
                        />
                      </div>

                      {/* Keterangan Section */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                          Keterangan
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Catatan tambahan / keterangan (opsional)..."
                          value={issueNote}
                          onChange={(e) => setIssueNote(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all font-sans text-gray-800 animate-none"
                        />
                      </div>

                      {/* Inline toggle buttons: Photo, File, Link */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 font-sans">
                          Tipe Lampiran
                        </label>
                        <div className="grid grid-cols-3 gap-1 bg-gray-105 p-1 rounded-xl border border-gray-200">
                          {(['Photo', 'File', 'Link'] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setIssueType(t)}
                              className={cn(
                                "py-2 px-1 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                                issueType === t 
                                  ? "bg-white text-gray-900 shadow-sm" 
                                  : "text-gray-500 hover:text-gray-800"
                              )}
                            >
                              {t === 'Photo' && <Camera className="w-3.5 h-3.5 text-emerald-600" />}
                              {t === 'File' && <FileIcon className="w-3.5 h-3.5 text-blue-600" />}
                              {t === 'Link' && <Link className="w-3.5 h-3.5 text-purple-600" />}
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Photo Capture field */}
                      {issueType === 'Photo' && (
                        <div className="space-y-1.5">
                          <input
                            type="file"
                            accept="image/*"
                            ref={issuePhotoInputRef}
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                setIssuePhotoFile(e.target.files[0]);
                              }
                            }}
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setShowIssueCameraModal(true)}
                              className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-emerald-250 hover:border-emerald-400 rounded-xl py-3 px-4 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100/70 transition-all cursor-pointer"
                            >
                              <Camera className="w-5 h-5 text-emerald-600" />
                              {issuePhotoFile ? 'Ganti Foto' : 'Ambil Foto via Kamera'}
                            </button>
                            <button
                              type="button"
                              onClick={() => issuePhotoInputRef.current?.click()}
                              className="px-4 border border-gray-200 hover:border-gray-300 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-800 bg-white transition-all cursor-pointer"
                            >
                              Pilih Galeri
                            </button>
                          </div>
                          {issuePhotoFile && (
                            <div className="space-y-2 border border-gray-150 rounded-xl overflow-hidden bg-gray-50/50 p-3">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                Review Photo
                              </p>
                              {issuePhotoPreview && (
                                <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-white max-h-56 flex items-center justify-center">
                                  <img
                                    src={issuePhotoPreview}
                                    alt="Preview Lampiran"
                                    className="w-full max-h-52 object-contain rounded-lg"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setIssuePhotoFile(null)}
                                    className="absolute top-2 right-2 bg-red-600/90 hover:bg-red-700 hover:scale-105 active:scale-95 text-white rounded-full p-2 transition-all cursor-pointer shadow-md inline-flex items-center justify-center border-none"
                                    title="Hapus Foto"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                              <div className="p-2 bg-white border border-gray-100 rounded-lg flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                  <ImageIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                                  <span className="text-xs text-gray-600 truncate">{issuePhotoFile.name}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setIssuePhotoFile(null)}
                                  className="text-red-500 hover:text-red-700 text-xs font-bold shrink-0 cursor-pointer"
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* File Upload field */}
                      {issueType === 'File' && (
                        <div className="space-y-1.5">
                          <input
                            type="file"
                            ref={issueFileInputRef}
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                setIssueDocFile(e.target.files[0]);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => issueFileInputRef.current?.click()}
                            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-blue-250 hover:border-blue-400 rounded-xl py-3 px-4 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100/70 transition-all cursor-pointer"
                          >
                            <FileIcon className="w-5 h-5 text-blue-500" />
                            {issueDocFile ? `Ganti File` : 'Pilih File / Dokumen'}
                          </button>
                          {issueDocFile && (
                            <div className="p-3 bg-gray-50 border rounded-xl flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileIcon className="w-4 h-4 text-blue-500 shrink-0" />
                                <span className="text-xs text-gray-600 truncate">{issueDocFile.name}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setIssueDocFile(null)}
                                className="text-red-500 hover:text-red-700 text-xs font-bold shrink-0"
                              >
                                Batal
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* URL Link field */}
                      {issueType === 'Link' && (
                        <div className="space-y-1">
                          <label className="block text-xs font-semibold text-gray-500 font-sans">URL Link</label>
                          <div className="relative">
                            <input
                              type="url"
                              required
                              placeholder="https://example.com/some-detail"
                              value={issueLinkUrl}
                              onChange={(e) => setIssueLinkUrl(e.target.value)}
                              className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-sans"
                            />
                            <Link className="w-4 h-4 text-purple-600 absolute left-3 top-3.5" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* FORM BOGANATHA LAPS (id 15) */}
                  {activeFormAction.id === '15' && (
                    <div className="space-y-4 text-left">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                          Laporan / Aktivitas
                        </label>
                        <textarea
                          required
                          rows={3}
                          placeholder="Tulis detail informasi di sini..."
                          value={formData.detail}
                          onChange={(e) => setFormData({ ...formData, detail: e.target.value })}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">Kategori Aktivitas</label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 font-sans"
                        >
                          <option value="Operational">Operational</option>
                          <option value="Kebersihan">Kebersihan</option>
                          <option value="Keamanan">Keamanan</option>
                          <option value="Komplain">Komplain</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* FIELDS FOR ORDER BUDGET */}
                  {activeFormAction.id === '5' && (
                    <div className="space-y-4 text-left">
                      {/* Unit Business Custom Dropdown Selector */}
                      <div className="relative">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                          Unit Business <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsOpenUnitDropdown(!isOpenUnitDropdown)}
                          className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-700 font-semibold flex items-center justify-between cursor-pointer"
                        >
                          {(() => {
                            const selectedUnit = unitList.find(u => u.id === obUnitId);
                            if (selectedUnit) {
                              return (
                                <div className="flex items-center gap-2.5">
                                  {selectedUnit.logo ? (
                                    <img 
                                      src={selectedUnit.logo} 
                                      alt={selectedUnit.name} 
                                      className="w-5.5 h-5.5 rounded-full object-cover border border-gray-200 bg-white" 
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-5.5 h-5.5 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                                      {selectedUnit.name.substring(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                  <span>{selectedUnit.name}</span>
                                </div>
                              );
                            }
                            return <span className="text-gray-400 font-medium">-- Pilih Unit Business --</span>;
                          })()}
                          <Grip className="w-4 h-4 text-gray-400 rotate-90" />
                        </button>

                        <AnimatePresence>
                          {isOpenUnitDropdown && (
                            <>
                              <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setIsOpenUnitDropdown(false)} 
                              />
                              <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.15 }}
                                className="absolute left-0 right-0 mt-1.5 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 max-h-56 overflow-y-auto p-1.5 space-y-1"
                              >
                                {unitList.map((unit) => (
                                  <button
                                    key={unit.id}
                                    type="button"
                                    onClick={() => {
                                      setObUnitId(unit.id);
                                      setIsOpenUnitDropdown(false);
                                    }}
                                    className={cn(
                                      "w-full px-3 py-2 text-sm rounded-xl flex items-center gap-3 text-left transition-all cursor-pointer hover:bg-gray-50",
                                      obUnitId === unit.id ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-700"
                                    )}
                                  >
                                    {unit.logo ? (
                                      <img 
                                        src={unit.logo} 
                                        alt={unit.name} 
                                        className="w-6 h-6 rounded-full object-cover border border-gray-200 bg-white shadow-sm shrink-0" 
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                        {unit.name.substring(0, 2).toUpperCase()}
                                      </div>
                                    )}
                                    <div className="flex flex-col">
                                      <span className="leading-tight">{unit.name}</span>
                                      <span className="text-[10px] text-gray-400 font-medium font-mono">{unit.id}</span>
                                    </div>
                                  </button>
                                ))}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Keperluan input mapping to Order Detail */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                          Keperluan <span className="text-red-500">*</span>
                        </label>
                        <input
                          required
                          type="text"
                          placeholder="Masukkan keperluan pengajuan"
                          value={obPurpose}
                          onChange={(e) => setObPurpose(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans"
                        />
                      </div>

                      {/* Order Type Selector */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                          Order Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={obType}
                          onChange={(e) => {
                            setObType(e.target.value);
                            // Reset conditional states
                            setObVendorId('');
                            setObTallentId('');
                            setObVia('');
                            setObBank('');
                          }}
                          required
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium cursor-pointer"
                        >
                          <option value="">-- Pilih Type --</option>
                          <option value="Vendor">Vendor</option>
                          <option value="Tallent">Tallent</option>
                          <option value="Reimburse">Reimburse</option>
                          <option value="Operasional">Operasional</option>
                        </select>
                      </div>

                      {/* Conditional dropdown: Vendor */}
                      {obType === 'Vendor' && (
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                            Vendor Contact <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={obVendorId}
                            onChange={(e) => setObVendorId(e.target.value)}
                            required
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium cursor-pointer"
                          >
                            <option value="">-- Pilih Vendor --</option>
                            {contacts.filter(c => c.type?.trim().toLowerCase() === 'vendor').map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Conditional dropdown: Tallent */}
                      {obType === 'Tallent' && (
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                            Tallent Contact <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={obTallentId}
                            onChange={(e) => setObTallentId(e.target.value)}
                            required
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium cursor-pointer"
                          >
                            <option value="">-- Pilih Tallent --</option>
                            {contacts.filter(c => c.type?.trim().toLowerCase() === 'tallent' || c.type?.trim().toLowerCase() === 'talent').map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Conditional file upload: Reimburse */}
                      {obType === 'Reimburse' && (
                        <div className="p-3 bg-gray-50/50 rounded-2xl border border-gray-100 flex flex-col gap-3">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Bukti Nota <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            ref={obNotaFileInputRef}
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                setObNotaFile(e.target.files[0]);
                              }
                            }}
                            className="hidden"
                          />
                          <div 
                            onClick={() => obNotaFileInputRef.current?.click()}
                            className="flex flex-col items-center justify-center border-2 border-gray-300 border-dashed rounded-xl p-4 cursor-pointer bg-white hover:bg-gray-50 transition relative overflow-hidden"
                          >
                            {obNotaFile ? (
                              <div className="text-center">
                                {obNotaFile.type.startsWith('image/') ? (
                                  <img src={URL.createObjectURL(obNotaFile)} alt="Nota preview" className="w-full h-auto max-h-32 object-contain rounded-lg mx-auto mb-2" />
                                ) : (
                                  <FileIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                )}
                                <p className="text-xs font-semibold text-gray-900 truncate max-w-[200px]">{obNotaFile.name}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Ketuk untuk mengganti</p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center text-center">
                                <ImageIcon className="w-8 h-8 text-gray-400 mb-1" />
                                <p className="text-sm text-gray-600 font-bold">Pilih File / Ambil Foto Nota</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Upload file atau ambil foto nota belanja</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Options when order type is selected */}
                      {obType && (
                        <>
                          {/* Amount Input */}
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                              Nilai (Amount) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-bold text-gray-500">Rp</span>
                              <input
                                required
                                type="number"
                                value={obAmount}
                                onChange={(e) => setObAmount(e.target.value)}
                                placeholder="Contoh: 500000"
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans"
                              />
                            </div>
                          </div>

                          {/* VIA Pembayaran Selector */}
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                              VIA Pembayaran <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              {['Transfer', 'Cash', 'Qris', 'Ewallet', 'Virtual Akun'].map(opt => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => {
                                    setObVia(opt);
                                    // Reset suboptions
                                    setObBank('');
                                    setObRekNo('');
                                    setObAtasNama('');
                                    setObBerita('');
                                    setObNote('');
                                    setObQrisFile(null);
                                    setObEwalletName('');
                                    setObEwalletNo('');
                                    setObVirtualNo('');
                                  }}
                                  className={cn(
                                    "py-2.5 px-2 text-[11px] font-bold rounded-xl border transition-all text-center cursor-pointer",
                                    obVia === opt
                                      ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                      : "bg-gray-50/50 border-gray-200 text-gray-600 hover:bg-gray-50"
                                  )}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* VIA Sub Options */}
                      {obVia === 'Transfer' && (
                        <div className="space-y-4 p-3 bg-gray-50/50 rounded-2xl border border-gray-100">
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                              Pilih Bank <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { name: "BCA", logo: "https://i.ibb.co.com/1YDFDCVJ/bca.png" },
                                { name: "Mandiri", logo: "https://i.ibb.co.com/sJsJ7tZZ/mandiri.png" },
                                { name: "BRI", logo: "https://i.ibb.co.com/293FsVJ/bri.png" },
                                { name: "BNI 46", logo: "https://i.ibb.co.com/YFXND4Xd/bni.png" },
                                { name: "JAGO", logo: "https://i.ibb.co.com/jkmnFMY0/jago.png" },
                              ].map(b => (
                                <button
                                  key={b.name}
                                  type="button"
                                  onClick={() => setObBank(b.name)}
                                  className={cn(
                                    "p-2 rounded-xl border flex items-center gap-2 transition-all cursor-pointer text-left",
                                    obBank === b.name
                                      ? "border-blue-500 bg-blue-50/50 text-blue-700 font-bold"
                                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                                  )}
                                >
                                  <img src={b.logo} alt={b.name} className="w-5 h-5 object-contain rounded shrink-0" referrerPolicy="no-referrer" />
                                  <span className="text-xs">{b.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {obBank && (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                  No. Rekening <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={obRekNo}
                                  onChange={(e) => setObRekNo(e.target.value)}
                                  required
                                  placeholder="Masukkan nomor rekening"
                                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                  Atas Nama (A/N) <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={obAtasNama}
                                  onChange={(e) => setObAtasNama(e.target.value)}
                                  required
                                  placeholder="Pemilik rekening"
                                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                  Berita Transfer
                                </label>
                                <input
                                  type="text"
                                  value={obBerita}
                                  onChange={(e) => setObBerita(e.target.value)}
                                  placeholder="Contoh: Pembayaran talent..."
                                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {obVia === 'Cash' && (
                        <div className="p-3 bg-gray-50/50 rounded-2xl border border-gray-100">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Catatan Pembayaran Cash <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={obNote}
                            onChange={(e) => setObNote(e.target.value)}
                            required
                            placeholder="Masukkan catatan / detail keperluan cash..."
                            rows={3}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none font-sans"
                          />
                        </div>
                      )}

                      {obVia === 'Qris' && (
                        <div className="p-3 bg-gray-50/50 rounded-2xl border border-gray-100 flex flex-col gap-3">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Upload QRIS / Nota QR <span className="text-red-500">*</span>
                          </label>
                          
                          <input
                            type="file"
                            accept="image/*"
                            ref={obFileInputRef}
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                setObQrisFile(e.target.files[0]);
                              }
                            }}
                            className="hidden"
                          />
                          
                          <div 
                            onClick={() => obFileInputRef.current?.click()}
                            className="flex flex-col items-center justify-center border-2 border-gray-300 border-dashed rounded-xl p-4 cursor-pointer bg-white hover:bg-gray-50 transition relative overflow-hidden"
                          >
                            {obQrisFile ? (
                              <div className="text-center">
                                <img src={URL.createObjectURL(obQrisFile)} alt="QRIS preview" className="w-full h-auto max-h-32 object-contain rounded-lg mx-auto mb-2" />
                                <p className="text-xs font-semibold text-gray-900 truncate max-w-[200px]">{obQrisFile.name}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Ketuk untuk mengganti</p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center text-center">
                                <ImageIcon className="w-8 h-8 text-gray-400 mb-1" />
                                <p className="text-sm text-gray-600 font-bold">Pilih Foto QRIS</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Upload image file QRIS</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {obVia === 'Ewallet' && (
                        <div className="space-y-4 p-3 bg-gray-50/50 rounded-2xl border border-gray-100">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                              Pilih E-Wallet <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { name: "Dana", logo: "https://i.ibb.co.com/zTTkGxx5/Dana.png" },
                                { name: "GoPay", logo: "https://i.ibb.co.com/YFzq1Mfn/gopay.png" },
                                { name: "ShopeePay", logo: "https://i.ibb.co.com/fdc2wYYR/shoppe.png" },
                              ].map(ew => (
                                <button
                                  key={ew.name}
                                  type="button"
                                  onClick={() => setObEwalletName(ew.name)}
                                  className={cn(
                                    "p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer text-center",
                                    obEwalletName === ew.name
                                      ? "border-blue-500 bg-blue-50 text-blue-700 font-bold"
                                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                                  )}
                                >
                                  <img src={ew.logo} alt={ew.name} className="w-5 h-5 object-contain rounded" referrerPolicy="no-referrer" />
                                  <span className="text-[9px] font-semibold">{ew.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {obEwalletName && (
                            <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                Nomor E-Wallet / HP <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={obEwalletNo}
                                onChange={(e) => setObEwalletNo(e.target.value)}
                                required
                                placeholder="Contoh: 0812xxxxxxxx"
                                className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {obVia === 'Virtual Akun' && (
                        <div className="p-3 bg-gray-50/50 rounded-2xl border border-gray-100">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Nomor Virtual Account (VA) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={obVirtualNo}
                            onChange={(e) => setObVirtualNo(e.target.value)}
                            required
                            placeholder="Masukkan nomor VA lengkap"
                            className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* FIELDS FOR LION PARCEL */}
                  {activeFormAction.id === '12' && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">Nomor Resi</label>
                        <input
                          required
                          type="text"
                          placeholder="Masukkan nomor resi..."
                          value={lpNoResi}
                          onChange={(e) => setLpNoResi(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">Nama Pengirim</label>
                        <input
                          required
                          type="text"
                          placeholder="Nama pengirim..."
                          value={lpNamaPengirim}
                          onChange={(e) => setLpNamaPengirim(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">Tujuan</label>
                        <input
                          required
                          type="text"
                          placeholder="Alamat / Kota tujuan..."
                          value={lpTujuan}
                          onChange={(e) => setLpTujuan(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">Layanan</label>
                        <select
                          required
                          value={lpLayanan}
                          onChange={(e) => setLpLayanan(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 font-sans"
                        >
                          <option value="">-- Pilih Layanan --</option>
                          <option value="VIPPACK">VIPPACK</option>
                          <option value="BOSSPACK">BOSSPACK</option>
                          <option value="REGPACK">REGPACK</option>
                          <option value="JAGOPACK">JAGOPACK</option>
                          <option value="BIG/JUMBOPACK">BIG/JUMBOPACK</option>
                          <option value="INTERPACK">INTERPACK</option>
                          <option value="OTOPACK">OTOPACK</option>
                          <option value="PASTI">PASTI</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">Berat (Kg)</label>
                          <input
                            required
                            type="number"
                            step="0.01"
                            placeholder="Contoh: 1.5"
                            value={lpBerat}
                            onChange={(e) => setLpBerat(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">Tarif Masuk (Rp)</label>
                          <input
                            required
                            type="number"
                            placeholder="Contoh: 15000"
                            value={lpTarifStr}
                            onChange={(e) => setLpTarifStr(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">Jenis Barang</label>
                        <input
                          required
                          type="text"
                          placeholder="Pakaian, dokumen, dll..."
                          value={lpJenisBarang}
                          onChange={(e) => setLpJenisBarang(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">Keterangan</label>
                        <textarea
                          rows={2}
                          placeholder="Keterangan tambahan..."
                          value={lpKeterangan}
                          onChange={(e) => setLpKeterangan(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">Bukti Bayar (Upload/Ambil Foto)</label>
                        <input
                          type="file"
                          accept="image/*"
                          ref={lpFileInputRef}
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              setLpBuktiBayarFile(e.target.files[0]);
                            }
                          }}
                          className="hidden"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setShowLpCameraModal(true)}
                            className="flex-1 flex items-center justify-center gap-2 border border-blue-200 hover:border-blue-400 rounded-xl py-3 px-3 text-xs font-bold text-blue-600 hover:bg-blue-50 cursor-pointer transition-all bg-white"
                          >
                            <Camera className="w-4 h-4 text-blue-500" />
                            Ambil Foto Kamera
                          </button>
                          <button
                            type="button"
                            onClick={() => lpFileInputRef.current?.click()}
                            className="flex-1 flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 rounded-xl py-3 px-4 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer transition-all bg-white"
                          >
                            <ImageIcon className="w-4 h-4 text-gray-400" />
                            Pilih File Galeri
                          </button>
                        </div>
                        {lpBuktiBayarFile && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
                            <img 
                              src={URL.createObjectURL(lpBuktiBayarFile)} 
                              alt="Bukti bayar" 
                              className="w-16 h-16 object-cover rounded-xl border border-gray-200 bg-white" 
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-900 truncate">{lpBuktiBayarFile.name}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">{(lpBuktiBayarFile.size / 1024).toFixed(1)} KB</p>
                              <button
                                type="button"
                                onClick={() => setLpBuktiBayarFile(null)}
                                className="text-xs font-bold text-red-500 mt-1 cursor-pointer block hover:underline"
                              >
                                Hapus Foto
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* FIELDS FOR CHILLHUB */}
                  {activeFormAction.id === '14' && (
                    <div className="space-y-4 text-left">
                      {/* Hidden File Input for Chillhub Nota */}
                      <input
                        type="file"
                        accept="image/*"
                        ref={chFileInputRef}
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setChNotaFile(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                          Amount (Price) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-bold text-gray-500">Rp</span>
                          <input
                            required
                            type="number"
                            placeholder="Masukkan nominal harga"
                            value={chAmount}
                            onChange={(e) => setChAmount(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                          Nota <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setShowChCameraModal(true)}
                            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl py-3 px-3 text-xs font-bold shadow-md shadow-blue-500/10 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0 duration-150"
                          >
                            <Camera className="w-4 h-4 text-white" />
                            Ambil Foto Kamera
                          </button>
                          <button
                            type="button"
                            onClick={() => chFileInputRef.current?.click()}
                            className="flex-1 flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 rounded-xl py-3 px-4 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer transition-all bg-white"
                          >
                            <ImageIcon className="w-4 h-4 text-gray-400" />
                            Pilih File Galeri
                          </button>
                        </div>
                        {chNotaFile && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
                            <img 
                              src={URL.createObjectURL(chNotaFile)} 
                              alt="Nota preview" 
                              className="w-16 h-16 object-cover rounded-xl border border-gray-200 bg-white" 
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-900 truncate">{chNotaFile.name}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">{(chNotaFile.size / 1024).toFixed(1)} KB</p>
                              <button
                                type="button"
                                onClick={() => setChNotaFile(null)}
                                className="text-xs font-bold text-red-500 mt-1 cursor-pointer block hover:underline"
                              >
                                Hapus Foto
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* FIELDS FOR BOGANATHA ADDRESS */}
                  {activeFormAction.id === '15' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">Lokasi Laporan / Area</label>
                      <input
                        required
                        type="text"
                        placeholder="Contoh: Toilet Lantai Dasar / Lobi Utama"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                      />
                    </div>
                  )}

                  {/* SUBMIT BUTTON */}
                  <button
                    type="submit"
                    disabled={formIsSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mt-2 cursor-pointer font-sans"
                  >
                    {formIsSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Mengirim Formulir...</span>
                      </>
                    ) : (
                      <span>Kirim Formulir</span>
                    )}
                  </button>
                </form>
              </motion.div>
            </div>
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
                  <div 
                    key={i} 
                    onClick={() => handleBannerClick(item.linkTo)}
                    className={cn(
                      "bg-white rounded-xl shadow-sm w-[280px] h-28 flex-shrink-0 border border-gray-100 overflow-hidden relative active:scale-[0.98] transition-transform",
                      item.linkTo && item.linkTo.trim() !== '' ? "cursor-pointer" : ""
                    )}
                  >
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
        <BannerCarousel items={banner3List} onItemClick={handleBannerClick} />

      </div>
    </div>
  );
}
