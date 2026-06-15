import { useState, useEffect } from 'react';
import { ArrowLeft, Star, Mail, Phone, MapPin, Calendar, Clock, ChevronDown, ChevronUp, CheckCircle2, Circle, Briefcase, FileText, SwitchCamera, Loader2, Award, CreditCard, Activity, X, Settings as SettingsIcon } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getSheetData, updateSheetData } from '../lib/api';
import { getStars } from './Users';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

function formatIDR(amount: number | string) {
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/\D/g, '')) || 0 : amount;
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
}

function calculateDuration(joinDateStr: string) {
  if (!joinDateStr || joinDateStr === '-') return '-';
  const parts = joinDateStr.split('/');
  if (parts.length !== 3) return '-';
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  
  const joinDate = new Date(year, month, day);
  const now = new Date();
  
  let years = now.getFullYear() - joinDate.getFullYear();
  let months = now.getMonth() - joinDate.getMonth();
  
  if (months < 0 || (months === 0 && now.getDate() < joinDate.getDate())) {
    years--;
    months += 12;
  }
  
  if (years > 0) return `${years} tahun`;
  if (months > 0) return `${months} bulan`;
  return 'Baru bergabung';
}

function formatDateMMDDYY(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function getDueDaysLeft(dueDateStr: string): { label: string, days: number, isOverdue: boolean } {
  const due = new Date(dueDateStr);
  if (isNaN(due.getTime())) return { label: '', days: 0, isOverdue: false };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return { label: 'Days Overdue', days: Math.abs(diffDays), isOverdue: true };
  } else {
    return { label: 'Days Left', days: diffDays, isOverdue: false };
  }
}

function colIndexToLetter(index: number): string {
  let temp, letter = '';
  let i = index;
  while (i >= 0) {
    temp = i % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    i = (i - temp) / 26 - 1;
  }
  return letter;
}

export function UserDetail({ userEmail, isProfile }: { userEmail?: string, isProfile?: boolean } = {}) {
  const navigate = useNavigate();
  const { id } = useParams(); // id is encoded email
  const decodedEmail = userEmail || (id ? decodeURIComponent(id) : '');

  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [unitMap, setUnitMap] = useState<Map<string, {name: string, logo: string}>>(new Map());
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  
  const [showSilhouette, setShowSilhouette] = useState(false);

  const [showProjects, setShowProjects] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [showMapPopup, setShowMapPopup] = useState(false);
  const [isToggleLoading, setIsToggleLoading] = useState(false);

  const handleToggleSilhouette = async () => {
    if (!userData || isToggleLoading) return;
    const currentSilhouette = showSilhouette;
    const newSilhouette = !currentSilhouette;
    const newAvail = !newSilhouette; // If silhouette is ON, avail is FALSE. If silhouette is OFF, avail is TRUE.
    
    // Optimistic update
    setShowSilhouette(newSilhouette);
    setIsToggleLoading(true);

    try {
      // 1. Get column letter
      const colLetter = colIndexToLetter(userData.availColIndex);
      const range = `User!${colLetter}${userData.rowIndex}`;
      const headersRange = `User!${colLetter}1`;

      // In case we are appending the column, let's just make sure we update the header too
      // But updateSheetData on a single cell is easiest
      await updateSheetData(headersRange, [['AVAIL']]);
      await updateSheetData(range, [[newAvail ? 'TRUE' : 'FALSE']]);
      
      setUserData({ ...userData, avail: newAvail });
    } catch (error) {
      console.error('Failed to update toggle', error);
      // Revert optimistic update
      setShowSilhouette(currentSilhouette);
    } finally {
      setIsToggleLoading(false);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const [userRes, unitRes, projectRes, taskRes, orderRes1, orderRes2] = await Promise.all([
          getSheetData('User!A1:Z500').catch(() => null),
          getSheetData('Unit!A1:Z500').catch(() => null),
          getSheetData('Project!A1:Z1000').catch(() => null),
          getSheetData('Task!A1:Z2000').catch(() => null),
          getSheetData('Order Budget!A1:Z2000').catch(() => null),
          getSheetData('OrderBudget!A1:Z2000').catch(() => null),
        ]);

        // Units
        const units = new Map<string, {name: string, logo: string}>();
        if (unitRes?.values?.length > 0) {
          const headers = unitRes.values[0] as string[];
          const idIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ID' || h?.trim().toUpperCase() === 'UNIT ID');
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'UNIT NAME');
          const logoIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'IMAGE' || h?.trim().toUpperCase() === 'LOGO');
          if (idIdx > -1) {
            unitRes.values.slice(1).forEach((row: any[]) => {
               const idx = row[idIdx]?.trim();
               if (idx) {
                 units.set(idx, {
                   name: nameIdx > -1 ? (row[nameIdx] || idx) : idx,
                   logo: logoIdx > -1 ? (row[logoIdx] || '') : ''
                 });
               }
            });
          }
        }
        setUnitMap(units);

        // User
        let foundUser = null;
        if (userRes?.values?.length > 0) {
          const headers = userRes.values[0] as string[];
          const emailIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'EMAIL');
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'NAME');
          const fullnameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'FULL NAME');
          const idIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ID');
          const photoIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PHOTO' || h?.trim().toUpperCase() === 'AVATAR');
          const poinIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'POIN');
          const unitIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'UNIT ID' || h?.trim().toUpperCase() === 'UNIT BUSINESS');
          const phoneIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PHONE');
          const alamatIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ALAMAT' || h?.trim().toUpperCase() === 'ADDRESS');
          const joinIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'JOIN DATE');
          const availIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'AVAIL');
          const mapIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'MAP' || h?.trim().toUpperCase() === 'MAPS');

          userRes.values.slice(1).forEach((row: any[], i: number) => {
            const email = emailIdx > -1 ? row[emailIdx]?.trim() : '';
            if (email && email.toLowerCase() === decodedEmail.toLowerCase()) {
              foundUser = {
                email,
                name: nameIdx > -1 ? row[nameIdx] : '-',
                fullName: fullnameIdx > -1 ? row[fullnameIdx] : '-',
                ktaId: idIdx > -1 ? row[idIdx] : '-',
                photo: photoIdx > -1 ? (row[photoIdx] || '') : '',
                poin: poinIdx > -1 ? parseInt(row[poinIdx], 10) || 0 : 0,
                unitId: unitIdIdx > -1 ? row[unitIdIdx] : '',
                phone: phoneIdx > -1 ? row[phoneIdx] : '-',
                alamat: alamatIdx > -1 ? row[alamatIdx] : '-',
                joinDate: joinIdx > -1 ? row[joinIdx] : '-',
                mapUrl: mapIdx > -1 ? (row[mapIdx] || '') : '',
                avail: availIdx > -1 ? (row[availIdx]?.trim().toUpperCase() !== 'FALSE') : true, // default True unless FALSE
                rowIndex: i + 2, // 1-based header + 1-based index (0 mapped to 2)
                availColIndex: availIdx > -1 ? availIdx : headers.length // append col if not exists
              };
            }
          });
        }
        setUserData(foundUser);
        if (foundUser) {
           setShowSilhouette(!foundUser.avail);
        }

        // Tasks
        const userProjectIds = new Set<string>();
        if (taskRes?.values?.length > 0) {
          const headers = taskRes.values[0] as string[];
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TASK TITLE' || h?.trim().toUpperCase() === 'TASK NAME');
          const userIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'USER');
          const statusIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'STATUS');
          const dueIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'DUE DATE');
          const taskProjIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PROJECT ID' || h?.trim().toUpperCase() === 'PROJECT' || h?.trim().toUpperCase() === 'ID PROJECT');
          
          const usrTask = taskRes.values.slice(1).filter((row: any[]) => {
            const u = userIdx > -1 ? row[userIdx]?.trim() : '';
            return u && u.toLowerCase() === decodedEmail.toLowerCase();
          }).map((row: any[], i: number) => {
             const projectId = taskProjIdIdx > -1 ? row[taskProjIdIdx]?.trim() : '';
             if (projectId) userProjectIds.add(projectId);

             return {
               id: `t-${i}`,
               name: nameIdx > -1 ? row[nameIdx] : 'Unknown',
               status: statusIdx > -1 ? row[statusIdx] : 'Todo',
               dueDate: dueIdx > -1 ? row[dueIdx] : '-'
             };
          });
          setTasks(usrTask);
        }

        // Projects
        if (projectRes?.values?.length > 0) {
          const headers = projectRes.values[0] as string[];
          const idIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PROJECT ID');
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PROJECT NAME' || h?.trim().toUpperCase() === 'PROJECT TITLE');
          const statusIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'STATUS');
          
          const usrProj = projectRes.values.slice(1).filter((row: any[]) => {
            const pId = idIdx > -1 ? row[idIdx]?.trim() : '';
            return pId && userProjectIds.has(pId);
          }).map((row: any[], i: number) => ({
             id: `p-${i}`,
             name: nameIdx > -1 ? row[nameIdx] : 'Unknown',
             status: statusIdx > -1 ? row[statusIdx] : 'Active'
          }));
          setProjects(usrProj);
        }

        // Orders
        const orderRes = orderRes1?.values ? orderRes1 : orderRes2;
        if (orderRes?.values?.length > 0) {
          const headers = orderRes.values[0] as string[];
          const userIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'EMAIL USER' || h?.trim().toUpperCase() === 'EMAIL' || h?.trim().toUpperCase() === 'USER');
          const roIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'RO_NUMBER' || h?.trim().toUpperCase() === 'RO NUMBER' || h?.trim().toUpperCase() === 'RO');
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ORDER DETAIL' || h?.trim().toUpperCase() === 'DETAIL');
          const amountIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'AMOUNT');
          const tierIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'REVIEW TIER' || h?.trim().toUpperCase() === 'STATUS');
          
          const usrOrder = orderRes.values.slice(1).filter((row: any[]) => {
            const u = userIdx > -1 ? row[userIdx]?.trim() : '';
            return u && u.toLowerCase() === decodedEmail.toLowerCase();
          }).map((row: any[], i: number) => ({
             id: `o-${i}`,
             ro: roIdx > -1 ? row[roIdx] : '-',
             detail: nameIdx > -1 ? row[nameIdx] : '-',
             amount: amountIdx > -1 ? row[amountIdx] : '0',
             status: tierIdx > -1 ? row[tierIdx] : '-'
          }));
          setOrders(usrOrder);
        }

      } catch (error) {
        console.error('Failed to fetch data', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [decodedEmail]);

  if (isLoading) {
    return (
      <div className="pb-24 bg-gray-50 min-h-screen relative flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="pb-24 bg-gray-50 min-h-screen relative">
        <header className="bg-[#429dbb] text-white px-5 py-4 shadow-md sticky top-0 z-50 w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!isProfile && (
              <button onClick={() => navigate(-1)} className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors shrink-0">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            )}
            <h1 className="text-xl font-bold tracking-tight">{isProfile ? 'My Profile' : 'User Detail'}</h1>
          </div>
          {isProfile && (
            <button onClick={() => navigate('/settings')} className="p-1 -mr-1 hover:bg-white/10 rounded-full transition-colors shrink-0 cursor-pointer" title="Settings">
              <SettingsIcon className="w-5 h-5 text-white" />
            </button>
          )}
        </header>
        <div className="p-10 text-center text-gray-500">User not found</div>
      </div>
    );
  }

  const unitRef = unitMap.get(userData.unitId);
  const unitName = unitRef?.name || userData.unitId || '-';
  const unitLogo = unitRef?.logo || '';
  const stars = getStars(userData.poin);
  const duration = calculateDuration(userData.joinDate);
  
  const doneTasksCount = tasks.filter(t => t.status.toLowerCase().includes('done')).length;
  
  // Pie chart data
  const pieData = tasks.length > 0 ? [
    { name: 'Done', value: doneTasksCount, color: '#10b981' },
    { name: 'Todo', value: tasks.length - doneTasksCount, color: '#e2e8f0' }
  ] : [
    { name: 'No Tasks', value: 1, color: '#e2e8f0' }
  ];

  return (
    <div className="pb-8 bg-gray-50 min-h-screen relative font-sans">
      <header className="bg-[#429dbb] text-white px-5 py-4 shadow-md sticky top-0 z-50 w-full mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!isProfile && (
            <button onClick={() => navigate(-1)} className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors shrink-0 cursor-pointer">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          )}
          <h1 className="text-xl font-bold tracking-tight drop-shadow-sm truncate">{isProfile ? 'My Profile' : 'User Detail'}</h1>
        </div>
        {isProfile && (
          <button onClick={() => navigate('/settings')} className="p-1 -mr-1 hover:bg-white/10 rounded-full transition-colors shrink-0 cursor-pointer" title="Settings">
            <SettingsIcon className="w-5 h-5 text-white" />
          </button>
        )}
      </header>

      <div className="px-4 space-y-4 max-w-md mx-auto">
        {/* Card 1: Main Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 relative overflow-hidden">
          {isProfile && (
            <div className="absolute top-4 right-4 z-10">
              <button 
                onClick={handleToggleSilhouette}
                disabled={isToggleLoading}
                className={`p-1.5 rounded-full transition-colors ${isToggleLoading ? 'opacity-50 cursor-not-allowed bg-gray-100/50' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                title="Toggle Silhouette Avatar"
              >
                {isToggleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <SwitchCamera className="w-4 h-4" />}
              </button>
            </div>
          )}

          <div className="flex flex-col items-center mb-6 pt-2">
            <div className="flex gap-1 mb-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Star 
                  key={i} 
                  className={`w-5 h-5 ${i < stars ? 'fill-yellow-400 text-yellow-500 drop-shadow-sm' : 'text-gray-200'}`} 
                />
              ))}
            </div>

            <div className="w-24 h-24 bg-blue-50 rounded-full border-4 border-white shadow-lg overflow-hidden mb-4 relative flex items-center justify-center">
              {showSilhouette ? (
                <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <img 
                  src={userData.photo || undefined} 
                  alt={userData.name} 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                     (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=eff6ff&color=3b82f6`;
                  }}
                />
              )}
            </div>

            <h2 className="text-xl font-bold text-gray-900 leading-tight text-center">{userData.name}</h2>
            <p className="text-sm text-gray-500 font-medium text-center">{userData.fullName}</p>
          </div>

          <div className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100/50">
            <div className="flex justify-between items-center text-sm gap-4">
              <span className="text-gray-500 font-medium whitespace-nowrap">KTA ID</span>
              <span className="font-semibold text-gray-900 truncate">{userData.ktaId}</span>
            </div>
            <div className="flex justify-between items-center text-sm gap-4">
              <span className="text-gray-500 font-medium whitespace-nowrap">Unit Business</span>
              <div className="flex items-center gap-2 max-w-[60%] justify-end">
                {unitLogo && (
                  <img 
                    src={unitLogo || undefined}
                    alt={unitName}
                    className="w-5 h-5 rounded-full object-cover shadow-sm bg-white border border-gray-100 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(unitName)}&background=eff6ff&color=3b82f6`;
                    }}
                  />
                )}
                <span className="font-semibold text-gray-900 truncate text-right">{unitName}</span>
              </div>
            </div>
            <div className="flex justify-between items-center text-sm gap-4 pt-1">
              <span className="text-gray-500 font-medium whitespace-nowrap">Email</span>
              <a href={`mailto:${userData.email}`} className="flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-700 hover:underline truncate">
                <span className="truncate">{userData.email}</span>
                <Mail className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>
            <div className="flex justify-between items-center text-sm gap-4 pt-1">
              <span className="text-gray-500 font-medium whitespace-nowrap">Phone</span>
              <a href={`tel:${userData.phone}`} className="flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-700 hover:underline truncate">
                <span className="truncate">{userData.phone}</span>
                <Phone className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>
          </div>
        </div>

        {/* Card 2: Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div 
            className={`flex items-start gap-3 ${userData.mapUrl ? 'cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-xl transition-colors' : ''}`}
            onClick={() => {
              if (userData.mapUrl) setShowMapPopup(true);
            }}
          >
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg shrink-0 mt-0.5">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-0.5">Alamat</p>
              <p className={`text-sm font-semibold leading-snug ${userData.mapUrl ? 'text-blue-600 underline decoration-blue-200 underline-offset-2' : 'text-gray-900'}`}>{userData.alamat}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0 mt-0.5">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="flex-1 flex justify-between items-center pr-2">
              <div>
                <p className="text-xs text-gray-500 font-medium mb-0.5">Join Date</p>
                <p className="text-sm font-semibold text-gray-900 leading-snug">{userData.joinDate}</p>
              </div>
              <div className="text-right flex items-center gap-1.5 text-orange-600 bg-orange-50 px-2 py-1 rounded-md border border-orange-100">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">{duration}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Overviews */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          
          {/* Project Overview */}
          <div className="border-b border-gray-100">
            <button 
              onClick={() => setShowProjects(!showProjects)}
              className="w-full flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-sm text-gray-900">Project Overview</span>
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md ml-1">{projects.length}</span>
              </div>
              {showProjects ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            <AnimatePresence>
              {showProjects && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="p-4 pt-0 space-y-2">
                    {projects.length === 0 && <p className="text-xs text-gray-500 text-center py-2">No projects</p>}
                    {projects.map(p => (
                      <div key={p.id} className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <span className="font-medium text-gray-800 truncate pr-3">{p.name}</span>
                        <span className="text-[10px] font-bold px-2 py-1 bg-white border border-gray-200 rounded-md text-gray-700 shrink-0">{p.status}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Task Overview */}
          <div className="border-b border-gray-100">
            <button 
              onClick={() => setShowTasks(!showTasks)}
              className="w-full flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-sm text-gray-900">Task Overview</span>
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md ml-1">{doneTasksCount}/{tasks.length} Done</span>
              </div>
              {showTasks ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            <AnimatePresence>
              {showTasks && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="p-4 pt-0 space-y-2">
                    {tasks.length === 0 && <p className="text-xs text-gray-500 text-center py-2">No tasks</p>}
                    {tasks.map(t => {
                      const isDone = t.status.toLowerCase().includes('done');
                      const dueInfo = getDueDaysLeft(t.dueDate);
                      return (
                        <div key={t.id} className="flex flex-col text-sm p-3 bg-gray-50 rounded-xl border border-gray-100 gap-1.5">
                          <div className="flex items-center justify-between gap-2">
                             <div className="flex items-center gap-2 min-w-0">
                               {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-gray-300 shrink-0" />}
                               <span className={`font-semibold truncate ${isDone ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{t.name}</span>
                             </div>
                             <span className="text-[10px] font-bold px-2 py-0.5 bg-white border border-gray-200 rounded-md text-gray-700 shrink-0 uppercase">{t.status}</span>
                          </div>
                          {t.dueDate && t.dueDate !== '-' && (
                            <div className="mt-1 pt-2 border-t border-gray-200/60 flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <Clock className="w-3.5 h-3.5" />
                                <span className="text-xs font-medium">{formatDateMMDDYY(t.dueDate)}</span>
                              </div>
                              <div className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${dueInfo.isOverdue ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                                 {dueInfo.days} {dueInfo.label}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Order Budget Overview */}
          <div>
            <button 
              onClick={() => setShowOrders(!showOrders)}
              className="w-full flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-600" />
                <span className="font-semibold text-sm text-gray-900">Order Budget Overview</span>
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md ml-1">{orders.length}</span>
              </div>
              {showOrders ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            <AnimatePresence>
              {showOrders && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-white">
                  <div className="p-4 pt-0 space-y-2 border-t border-gray-50 mt-1">
                    {orders.length === 0 && <p className="text-xs text-gray-500 text-center py-2">No orders</p>}
                    {orders.map(o => (
                      <div key={o.id} className="text-sm p-3 bg-white shadow-sm rounded-xl border border-gray-100">
                         <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-gray-700 text-xs">RO: {o.ro}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-yellow-50 text-yellow-700 border border-yellow-100 rounded-md shrink-0 uppercase">{o.status}</span>
                         </div>
                         <p className="font-medium text-gray-900 mb-1">{o.detail}</p>
                         <p className="font-bold text-blue-600">{formatIDR(o.amount)}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Card 4: Daftar Tagihan */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
           <div className="flex items-center gap-2 mb-4">
             <CreditCard className="w-4 h-4 text-indigo-600" />
             <h3 className="font-semibold text-gray-900 text-sm">Daftar Tagihan</h3>
           </div>
           <div className="bg-gray-50 text-center p-6 rounded-xl border border-gray-100 border-dashed">
             <p className="text-sm text-gray-400 italic">Tidak ada tagihan</p>
           </div>
        </div>

        {/* Card 5: Index Performance & Pie Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
           <div className="flex items-center gap-2 mb-2">
             <Activity className="w-4 h-4 text-violet-600" />
             <h3 className="font-semibold text-gray-900 text-sm">Index Performance</h3>
           </div>
           
           <div className="mt-6 flex flex-col items-center pb-2">
             <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Task Completion</h4>
             
             {tasks.length > 0 ? (
               <div className="w-full h-[180px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#111827', fontWeight: 600, fontSize: '14px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                     <span className="text-2xl font-black text-gray-900 leading-none">
                       {Math.round((doneTasksCount / tasks.length) * 100)}%
                     </span>
                     <span className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">Done</span>
                  </div>
               </div>
             ) : (
                <div className="w-full h-32 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-100 border-dashed mt-2">
                   <p className="text-sm text-gray-400 italic">Belum ada task</p>
                </div>
             )}
             
             {/* Legend */}
             {tasks.length > 0 && (
               <div className="flex gap-4 mt-2">
                 <div className="flex items-center gap-1.5">
                   <div className="w-3 h-3 rounded-full bg-emerald-500 mt-0.5"></div>
                   <span className="text-xs font-medium text-gray-600">Done ({doneTasksCount})</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                   <div className="w-3 h-3 rounded-full bg-slate-200 mt-0.5"></div>
                   <span className="text-xs font-medium text-gray-600">Todo ({tasks.length - doneTasksCount})</span>
                 </div>
               </div>
             )}
           </div>
        </div>

        {/* Card 6: Daftar Reward */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
           <div className="flex items-center gap-2 mb-4">
             <Award className="w-4 h-4 text-amber-500" />
             <h3 className="font-semibold text-gray-900 text-sm">Daftar Reward</h3>
           </div>
           <div className="bg-amber-50/50 text-center p-6 rounded-xl border border-amber-100 border-dashed">
             <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2 relative overflow-hidden">
                <Award className="w-5 h-5 text-amber-500 z-10" />
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-200/40 to-transparent"></div>
             </div>
             <p className="text-sm text-amber-700/60 font-medium">Belum ada reward</p>
           </div>
        </div>

      </div>

      {/* Map Popup Modal */}
      <AnimatePresence>
        {showMapPopup && userData?.mapUrl && (
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
              <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-white z-10">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-rose-500" />
                  Lokasi Address
                </h3>
                <button 
                  onClick={() => setShowMapPopup(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="w-full h-[60vh] sm:h-[400px] bg-gray-100 flex items-center justify-center relative">
                {(() => {
                   let url = userData.mapUrl || '';
                   const srcMatch = url.match(/src="([^"]+)"/);
                   if (srcMatch && srcMatch[1]) {
                     url = srcMatch[1];
                   } else if (url && !url.startsWith('http')) {
                     url = `https://maps.google.com/maps?q=${encodeURIComponent(url)}&z=15&output=embed`;
                   }
                   
                   return (
                     <iframe 
                       src={url}
                       width="100%" 
                       height="100%" 
                       style={{ border: 0 }} 
                       allowFullScreen 
                       loading="lazy" 
                       referrerPolicy="no-referrer-when-downgrade"
                       className="absolute inset-0 w-full h-full"
                     />
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
