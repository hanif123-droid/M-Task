import React, { useState, useEffect } from 'react';
import { ArrowLeft, Filter, Search, X, Plus, Loader2, Clock, ChevronDown, ChevronUp, CheckCircle2, DollarSign, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { getSheetData, appendSheetData } from '../lib/api';

function formatIDR(amount: number | string) {
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/\D/g, '')) || 0 : amount;
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
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

export function Activities() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [subHeaders, setSubHeaders] = useState<string[]>([]);
  const [subSheetName, setSubSheetName] = useState<string>('Sub Task');
  
  const [newActivityTitle, setNewActivityTitle] = useState('');
  const [newActivityTaskId, setNewActivityTaskId] = useState('');
  const [newActivityUser, setNewActivityUser] = useState('');
  const [newActivityAmount, setNewActivityAmount] = useState('');
  const [newActivityStatus, setNewActivityStatus] = useState('Not Started');
  const [newActivityDueDate, setNewActivityDueDate] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isSavingActivity, setIsSavingActivity] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const [subRes1, subRes2, taskRes, userRes] = await Promise.all([
          getSheetData('Subtask!A1:Z3000').catch(() => null),
          getSheetData('Sub Task!A1:Z3000').catch(() => null),
          getSheetData('Task!A1:Z2000').catch(() => null),
          getSheetData('User!A1:Z500').catch(() => null)
        ]);

        const userMap = new Map<string, {name: string, photo: string, id: string}>();
        const uList: any[] = [];
        if (userRes?.values?.length > 0) {
          const headers = userRes.values[0] as string[];
          const emailIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'EMAIL');
          const nameIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'NAME');
          const photoIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'PHOTO' || h?.trim().toUpperCase() === 'AVATAR');
          const uidIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'ID' || h?.trim().toUpperCase() === 'USER ID');
          if (emailIdx > -1) {
            userRes.values.slice(1).forEach((row: any[]) => {
              const email = row[emailIdx]?.trim();
              if (email) {
                const userId = (uidIdx > -1 && row[uidIdx]) ? String(row[uidIdx]).trim() : '';
                if (userId.toUpperCase() === 'XXX') {
                  return;
                }
                const photo = (photoIdx > -1 && row[photoIdx]) ? row[photoIdx] : `https://ui-avatars.com/api/?name=${encodeURIComponent(row[nameIdx] || email)}&background=eff6ff&color=3b82f6`;
                const name = (nameIdx > -1 && row[nameIdx]) ? row[nameIdx] : email.split('@')[0];
                const uObj = { photo, name, id: userId, email };
                userMap.set(email, uObj);
                uList.push(uObj);
              }
            });
          }
        }
        setAllUsers(uList);

        const taskMap = new Map<string, string>();
        const tList: any[] = [];
        if (taskRes?.values?.length > 0) {
          const headers = taskRes.values[0] as string[];
          const taskIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TASK ID');
          const taskNameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TASK NAME' || h?.trim().toUpperCase() === 'TITLE');
          if (taskIdIdx > -1) {
             taskRes.values.slice(1).forEach((row: any[]) => {
                const id = row[taskIdIdx]?.trim() || '';
                const title = taskNameIdx > -1 ? (row[taskNameIdx] || id) : id;
                if (id) {
                   taskMap.set(id, title);
                   tList.push({ id, title });
                }
             });
          }
        }
        setAllTasks(tList);

        const subRes = subRes2?.values ? subRes2 : subRes1;
        setSubSheetName(subRes2?.values ? 'Sub Task' : 'Subtask');
        if (subRes?.values?.length > 0) {
          const headers = subRes.values[0] as string[];
          setSubHeaders(headers);
          const subtaskIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'SUBTASK ID' || h?.trim().toUpperCase() === 'ID');
          const titleIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'SUBTASK NAME' || h?.trim().toUpperCase() === 'SUBTASK' || h?.trim().toUpperCase() === 'TITLE');
          const taskIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TASK ID' || h?.trim().toUpperCase() === 'TASK');
          const statusIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'STATUS');
          const expIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'AMOUNT' || h?.trim().toUpperCase() === 'EXPENSES' || h?.trim().toUpperCase() === 'EXPENSE');
          const dueIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'SUBTASK DUE DATE' || h?.trim().toUpperCase() === 'DUE DATE');
          const userIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'USER' || h?.trim().toUpperCase() === 'ASSIGNED TO');

          if (subtaskIdIdx > -1) {
            const fetchedAct = subRes.values.slice(1).map((row: any[]) => {
              const id = row[subtaskIdIdx]?.trim() || '';
              const tId = taskIdIdx > -1 ? row[taskIdIdx]?.trim() : '';
              const uEmail = userIdx > -1 ? row[userIdx]?.trim() : '';
              
              const taskName = taskMap.get(tId) || tId || 'Unknown Task';
              const userInfo = userMap.get(uEmail) || { name: uEmail || 'Unknown User', photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(uEmail || 'U')}&background=eff6ff&color=3b82f6` };

              return {
                id,
                title: titleIdx > -1 ? (row[titleIdx] || 'No Title') : 'No Title',
                task: taskName,
                amount: expIdx > -1 ? (row[expIdx] || '0') : '0',
                status: statusIdx > -1 ? (row[statusIdx] || 'Unknown') : 'Unknown',
                dueDate: dueIdx > -1 ? (row[dueIdx] || '') : '',
                userName: userInfo.name,
                userPhoto: userInfo.photo
              };
            }).filter((t: any) => t.id);
            setActivities(fetchedAct);
          }
        }
      } catch (error) {
        console.error('Failed to fetch data', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSubmitActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityTitle.trim()) {
      setErrorToast('Nama aktivitas wajib diisi');
      setTimeout(() => setErrorToast(null), 3000);
      return;
    }
    if (!newActivityTaskId) {
      setErrorToast('Pilih Task terlebih dahulu');
      setTimeout(() => setErrorToast(null), 3000);
      return;
    }
    if (!newActivityUser) {
      setErrorToast('Pilih User terlebih dahulu');
      setTimeout(() => setErrorToast(null), 3000);
      return;
    }
    if (!newActivityDueDate) {
      setErrorToast('Pilih tanggal jatuh tempo');
      setTimeout(() => setErrorToast(null), 3000);
      return;
    }

    try {
      setIsSavingActivity(true);
      const newSubtaskId = 'SUB-' + Math.floor(1000 + Math.random() * 9000);

      let formattedDueDate = newActivityDueDate;
      const parts = newActivityDueDate.split('-');
      if (parts.length === 3) {
        formattedDueDate = `${parts[1]}/${parts[2]}/${parts[0]}`;
      }

      const findHeaderIndex = (headers: string[], names: string[]) => {
        return headers.findIndex(h => {
          const clean = h?.trim().toUpperCase() || '';
          return names.some(n => clean === n.toUpperCase());
        });
      };

      const newRow = new Array(subHeaders.length > 0 ? subHeaders.length : 8).fill('');

      const mappings = [
        { names: ['SUBTASK ID', 'ID', 'SUBTASK_ID'], val: newSubtaskId },
        { names: ['SUBTASK NAME', 'SUBTASK', 'TITLE', 'SUBTASK TITLE'], val: newActivityTitle },
        { names: ['TASK ID', 'TASK_ID', 'TASK'], val: newActivityTaskId },
        { names: ['STATUS'], val: newActivityStatus },
        { names: ['AMOUNT', 'EXPENSES', 'EXPENSE'], val: newActivityAmount || '0' },
        { names: ['SUBTASK DUE DATE', 'DUE DATE', 'SUBTASK_DUE_DATE'], val: formattedDueDate },
        { names: ['USER', 'EMAIL', 'ASSIGNED TO'], val: newActivityUser }
      ];

      if (subHeaders.length > 0) {
        mappings.forEach(m => {
          const idx = findHeaderIndex(subHeaders, m.names);
          if (idx > -1) {
            newRow[idx] = m.val;
          }
        });
      } else {
        newRow[0] = newSubtaskId;
        newRow[1] = newActivityTitle;
        newRow[2] = newActivityTaskId;
        newRow[3] = newActivityStatus;
        newRow[4] = newActivityAmount || '0';
        newRow[5] = formattedDueDate;
        newRow[6] = newActivityUser;
      }

      await appendSheetData(`${subSheetName}!A1:Z`, [newRow]);

      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3000);
      setShowAddActivity(false);

      // Reset form
      setNewActivityTitle('');
      setNewActivityTaskId('');
      setNewActivityUser('');
      setNewActivityAmount('');
      setNewActivityStatus('Not Started');
      setNewActivityDueDate('');

      // Refresh page to load new task item
      window.location.reload();

    } catch (err: any) {
      console.error(err);
      setErrorToast(err?.message || 'Gagal menyimpan aktivitas. Silakan coba lagi.');
      setTimeout(() => setErrorToast(null), 4000);
    } finally {
      setIsSavingActivity(false);
    }
  };

  const filteredItems = activities.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter ? t.status === statusFilter : true;
    return matchSearch && matchStatus;
  });

  const getStatusPriority = (status: string) => {
    const s = status.toLowerCase().trim();
    if (s.includes('not started') || s.includes('belum mulai')) return 1;
    if (s.includes('on going') || s.includes('ongoing') || s.includes('review')) return 2;
    if (s.includes('complete') || s.includes('done') || s.includes('selesai')) return 3;
    if (s.includes('cancel') || s.includes('batal')) return 4;
    return 5;
  };

  const sortedItems = [...filteredItems].sort((a, b) => {
    return getStatusPriority(a.status) - getStatusPriority(b.status);
  });

  return (
    <div className="pb-24 bg-gray-50 min-h-screen relative">
      <header className="bg-[#429dbb] text-white px-5 py-4 shadow-md sticky top-0 z-50 w-full mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors shrink-0 cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-xl font-bold tracking-tight drop-shadow-sm">Daftar Activity</h1>
      </header>

      <div className="px-4 mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="search" 
            placeholder="Cari activity..." 
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
        {!isLoading && sortedItems.map((item) => {
          let cardBg = 'bg-white border-gray-100';
          let badgeBg = 'bg-gray-100 text-gray-700';
          
          const s = item.status.toLowerCase().trim();
          if (s.includes('not started') || s.includes('belum mulai')) {
            cardBg = 'bg-slate-50 border-slate-200';
            badgeBg = 'bg-slate-200 text-slate-800';
          } else if (s.includes('on going') || s.includes('ongoing') || s.includes('review')) {
            cardBg = 'bg-blue-50 border-blue-200';
            badgeBg = 'bg-blue-200 text-blue-800';
          } else if (s.includes('complete') || s.includes('done') || s.includes('selesai')) {
            cardBg = 'bg-green-50 border-green-200';
            badgeBg = 'bg-green-200 text-green-800';
          } else if (s.includes('cancel') || s.includes('batal')) {
            cardBg = 'bg-red-50 border-red-200';
            badgeBg = 'bg-red-200 text-red-800';
          }
          
          const dueInfo = item.dueDate ? getDueDaysLeft(item.dueDate) : null;

          return (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate(`/activities/${item.id}`)}
              className={cn("rounded-xl shadow-sm border p-4 cursor-pointer active:scale-[0.98] transition-transform", cardBg)}
            >
              <div className="flex justify-between items-start mb-2 gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 leading-tight truncate">{item.title}</h3>
                  <div className="mt-1 space-y-0.5">
                    <p className="text-xs text-gray-600 truncate"><span className="text-gray-400 font-medium">Task:</span> {item.task}</p>
                    <p className="text-xs text-gray-600 truncate mb-2"><span className="text-gray-400 font-medium">Expenses:</span> <span className="font-bold text-gray-900">{formatIDR(item.amount)}</span></p>
                    
                    {item.userName && item.userName !== 'Unknown User' && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <img 
                          src={item.userPhoto || undefined} 
                          alt={item.userName} 
                          className="w-5 h-5 rounded-full object-cover border border-gray-200"
                          onError={(e) => {
                             (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.userName)}&background=eff6ff&color=3b82f6`;
                          }}
                        />
                        <span className="text-xs font-medium text-gray-700 truncate">{item.userName}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={cn(
                    "text-[10px] font-bold px-2.5 py-1 rounded-md whitespace-nowrap",
                    badgeBg
                  )}>
                    {item.status || 'No Status'}
                  </span>
                </div>
              </div>
              
              {item.dueDate && dueInfo && (
                <div className="mt-3 pt-3 border-t border-gray-100/60 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">{formatDateMMDDYY(item.dueDate)}</span>
                  </div>
                  <div className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", dueInfo.isOverdue ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600")}>
                     {dueInfo.days} {dueInfo.label}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
        {sortedItems.length === 0 && (
          <div className="text-center py-10">
             <p className="text-gray-500 text-sm">Tidak ada activity yang ditemukan.</p>
          </div>
        )}
      </div>

      {/* FAB Add */}
      <button 
        onClick={() => setShowAddActivity(true)}
        className="fixed bottom-20 right-5 w-14 h-14 bg-blue-600 rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center text-white hover:bg-blue-700 active:scale-95 transition-all z-20 cursor-pointer"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Slide Up Filter (BottomSheet) */}
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
                <h3 className="font-bold text-gray-900">Filter Activity</h3>
                <button onClick={() => setShowFilter(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="p-4 space-y-6 max-h-[60vh] overflow-y-auto">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Status</h4>
                  <div className="flex gap-2">
                    {['On going', 'Complete'].map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(statusFilter === st ? null : st)}
                        className={cn(
                          "px-4 py-2 rounded-full text-sm font-medium border transition-all cursor-pointer",
                          statusFilter === st 
                            ? "bg-blue-50 border-blue-200 text-blue-700" 
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white border-t border-gray-100 flex gap-3">
                <button 
                  onClick={() => {
                    setStatusFilter(null);
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

      {/* Slide Up Add Activity (Popup Modal) */}
      <AnimatePresence>
        {showAddActivity && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isSavingActivity) setShowAddActivity(false);
              }}
              className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="fixed bottom-0 sm:bottom-4 left-0 right-0 max-w-md mx-auto bg-white rounded-t-3xl sm:rounded-3xl z-[110] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
                <h3 className="font-bold text-gray-900 text-lg">Add New Activity</h3>
                <button 
                  type="button" 
                  onClick={() => setShowAddActivity(false)} 
                  disabled={isSavingActivity}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer text-gray-500 disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmitActivity} className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* Activity title */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Activity Name</label>
                  <input 
                    type="text" 
                    value={newActivityTitle}
                    onChange={e => setNewActivityTitle(e.target.value)}
                    required
                    disabled={isSavingActivity}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50" 
                    placeholder="Enter activity name" 
                  />
                </div>

                {/* Main Task Selection */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Task</label>
                  <select 
                    value={newActivityTaskId}
                    onChange={e => setNewActivityTaskId(e.target.value)}
                    required
                    disabled={isSavingActivity}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="">Select task</option>
                    {allTasks.map(t => (
                      <option key={t.id} value={t.id}>{t.title} ({t.id})</option>
                    ))}
                  </select>
                </div>

                {/* Custom User Dropdown with Avatar */}
                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Assigned User</label>
                  <button
                    type="button"
                    onClick={() => !isSavingActivity && setShowUserDropdown(!showUserDropdown)}
                    disabled={isSavingActivity}
                    className="w-full flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
                  >
                    {newActivityUser ? (
                      (() => {
                        const selectedUser = allUsers.find(u => u.email === newActivityUser);
                        const avatarUrl = selectedUser?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser?.name || newActivityUser)}&background=eff6ff&color=3b82f6`;
                        return (
                          <div className="flex items-center gap-2">
                            <img src={avatarUrl} alt="user avatar" className="w-6 h-6 rounded-full object-cover border border-gray-200" />
                            <span className="font-semibold text-gray-900">{selectedUser?.name || newActivityUser}</span>
                          </div>
                        );
                      })()
                    ) : (
                      <span className="text-gray-400">Select user...</span>
                    )}
                    <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                  </button>
                  
                  <AnimatePresence>
                    {showUserDropdown && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowUserDropdown(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute left-0 right-0 bottom-full mb-1 max-h-40 bg-white border border-gray-100 rounded-xl shadow-lg overflow-y-auto z-20 divide-y divide-gray-50"
                        >
                          {allUsers.map((u) => {
                            const avatarUrl = u.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || u.email)}&background=eff6ff&color=3b82f6`;
                            return (
                              <button
                                key={u.email}
                                type="button"
                                onClick={() => {
                                  setNewActivityUser(u.email);
                                  setShowUserDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-colors focus:outline-none hover:bg-gray-50"
                              >
                                <img src={avatarUrl} alt={u.name} className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-gray-900 truncate leading-tight">{u.name}</p>
                                  <p className="text-[10px] text-gray-400 truncate mt-0.5">{u.email}</p>
                                </div>
                              </button>
                            );
                          })}
                          {allUsers.length === 0 && (
                            <div className="p-4 text-center text-xs text-gray-400">No users found</div>
                          )}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Expenses / Nominal Budget */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Expenses / Nominal (IDR)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">Rp</span>
                    <input 
                      type="number" 
                      value={newActivityAmount}
                      onChange={e => setNewActivityAmount(e.target.value)}
                      disabled={isSavingActivity}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50" 
                      placeholder="0" 
                    />
                  </div>
                </div>

                {/* Status Selection */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status</label>
                  <select 
                    value={newActivityStatus}
                    onChange={e => setNewActivityStatus(e.target.value)}
                    required
                    disabled={isSavingActivity}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="Not Started">Not Started</option>
                    <option value="On going">On going</option>
                    <option value="Review">Review</option>
                    <option value="Complete">Complete</option>
                    <option value="Cancel">Cancel</option>
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Due Date</label>
                  <input 
                    type="date" 
                    value={newActivityDueDate}
                    onChange={e => setNewActivityDueDate(e.target.value)}
                    required
                    disabled={isSavingActivity}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50" 
                  />
                </div>

                {/* Submit button */}
                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={isSavingActivity}
                    className="w-full py-3 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSavingActivity ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <span>Create Activity</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Toast Notification alerts */}
      <AnimatePresence>
        {errorToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] bg-red-600 text-white px-5 py-3 rounded-xl shadow-lg font-medium text-sm whitespace-nowrap"
          >
            {errorToast}
          </motion.div>
        )}
        {successToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg font-medium text-sm whitespace-nowrap"
          >
            ✓ Activity berhasil ditambahkan!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
