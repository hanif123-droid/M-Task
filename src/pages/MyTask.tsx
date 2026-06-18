import { useState, useEffect } from 'react';
import { ArrowLeft, Filter, Search, X, Plus, Loader2, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { getSheetData } from '../lib/api';
import { auth } from '../lib/firebase';

function formatDateMMDDYY(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function formatToMMDDYYYY(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}

function getDuration(assignDateStr: string, completeDateStr: string): string {
  if (!assignDateStr || !completeDateStr) return '';
  const start = new Date(assignDateStr);
  const end = new Date(completeDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';

  const diffTime = end.getTime() - start.getTime();
  const totalDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  let months = end.getMonth() - start.getMonth() + (12 * (end.getFullYear() - start.getFullYear()));
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    months = 0;
    days = totalDays;
  }

  return `(dur : ${days} day,${months} month)`;
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

export function MyTask() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [inlineFilter, setInlineFilter] = useState<'To Do' | 'Review' | 'Done'>('To Do');

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const [unitRes, projRes, taskRes, userRes] = await Promise.all([
          getSheetData('Unit!A1:Z500').catch(() => null),
          getSheetData('Project!A1:Z1000').catch(() => null),
          getSheetData('Task!A1:Z2000').catch(() => null),
          getSheetData('User!A1:Z500').catch(() => null)
        ]);

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

        const unitMap = new Map<string, string>();
        if (unitRes?.values?.length > 0) {
          const headers = unitRes.values[0] as string[];
          const idIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ID');
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'UNIT NAME');
          if (idIdx > -1 && nameIdx > -1) {
            unitRes.values.slice(1).forEach((row: any[]) => {
              unitMap.set(row[idIdx]?.trim() || '', row[nameIdx]?.trim() || '');
            });
          }
        }

        const projMap = new Map<string, {name: string, unitId: string}>();
        if (projRes?.values?.length > 0) {
          const headers = projRes.values[0] as string[];
          const idIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PROJECT ID');
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PROJECT NAME');
          const possibleUnitIdx = headers.findIndex(h => {
             const key = h?.trim().toUpperCase();
             return key === 'UNIT' || key === 'UNIT ID' || key === 'ID UNIT' || key === 'UNIT_ID';
          });
          if (idIdx > -1) {
            projRes.values.slice(1).forEach((row: any[]) => {
              const id = row[idIdx]?.trim() || '';
              if (id) {
                projMap.set(id, {
                  name: nameIdx > -1 ? (row[nameIdx] || id) : id,
                  unitId: possibleUnitIdx > -1 ? row[possibleUnitIdx]?.trim() : ''
                });
              }
            });
          }
        }

        if (taskRes?.values?.length > 0) {
          const headers = taskRes.values[0] as string[];
          const taskIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TASK ID');
          const taskNameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TASK NAME' || h?.trim().toUpperCase() === 'TITLE');
          const projIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PROJECT ID' || h?.trim().toUpperCase() === 'PROJECT' || h?.trim().toUpperCase() === 'ID PROJECT');
          const statusIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'STATUS');
          const pioIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'TASK PRIORITY' || h?.trim().toUpperCase() === 'PRIORITY');
          const dueIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'TASK DUE DATE' || h?.trim().toUpperCase() === 'DUE DATE');
          const userIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'USER' || h?.trim().toUpperCase() === 'EMAIL');
          const assignIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'TASK ASSIGN DATE' || h?.trim().toUpperCase() === 'ASSIGN DATE' || h?.trim().toUpperCase() === 'DATE ASSIGN' || h?.trim().toUpperCase() === 'TASK_ASSIGN_DATE');
          const completeIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'TASK COMPLETE DATE' || h?.trim().toUpperCase() === 'COMPLETE DATE' || h?.trim().toUpperCase() === 'TASK COMPLETE_DATE' || h?.trim().toUpperCase() === 'TASK COMPLETE DATE');

          if (taskIdIdx > -1) {
            const fetchedTasks = taskRes.values.slice(1).map((row: any[]) => {
              const id = row[taskIdIdx]?.trim() || '';
              const pId = projIdIdx > -1 ? row[projIdIdx]?.trim() : '';
              const uEmail = userIdx > -1 ? row[userIdx]?.trim() : '';
              
              const projInfo = projMap.get(pId) || { name: 'Unknown Project', unitId: '' };
              const unitName = unitMap.has(projInfo.unitId) ? unitMap.get(projInfo.unitId) : (projInfo.unitId || 'Unknown Unit');
              const userInfo = userMap.get(uEmail) || { name: uEmail || 'Unknown User', photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(uEmail || 'U')}&background=eff6ff&color=3b82f6` };

              return {
                id,
                title: taskNameIdx > -1 ? (row[taskNameIdx] || 'No Title') : 'No Title',
                project: projInfo.name,
                unit: unitName,
                status: statusIdx > -1 ? (row[statusIdx] || 'Unknown') : 'Unknown',
                priority: pioIdx > -1 ? (row[pioIdx] || 'Normal') : 'Normal',
                dueDate: dueIdx > -1 ? (row[dueIdx] || '') : '',
                userName: userInfo.name,
                userPhoto: userInfo.photo,
                userEmail: uEmail,
                assignDate: (assignIdx > -1 && row[assignIdx]) ? String(row[assignIdx]).trim() : '',
                completeDate: (completeIdx > -1 && row[completeIdx]) ? String(row[completeIdx]).trim() : ''
              };
            }).filter((t: any) => t.id);
            setTasks(fetchedTasks);
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

  const units = Array.from(new Set(tasks.map(t => t.unit)));

  const filteredTasks = tasks.filter(t => {
    // Check if task belongs to active user
    const isActiveUserTask = t.userEmail && auth.currentUser?.email 
      ? t.userEmail.toLowerCase() === auth.currentUser.email.toLowerCase() 
      : false;
      
    if (!isActiveUserTask) return false;

    // Inline Filter Logic
    // Adjust based on typical status values or literal matching
    const s = (t.status || '').toLowerCase().trim();
    let matchesInline = false;
    
    if (inlineFilter === 'To Do') {
      matchesInline = s === 'to do' || s.includes('not started') || s.includes('belum mulai') || s.includes('on going') || s.includes('ongoing'); // Broad "To Do"
      // User says: jika tombol "To Do" maka yang di tampilkan adalah Task dengan nilai pada kolom "Status" = "To Do"
      // So let's fall back to exactly what they said + variations for safety if literal "To Do" isn't used
      matchesInline = s === 'to do' || s.includes('not started') || s.includes('on going') || s.includes('ongoing');
    } else if (inlineFilter === 'Review') {
      matchesInline = s === 'review' || s.includes('review') || s.includes('menunggu');
    } else if (inlineFilter === 'Done') {
      matchesInline = s === 'done' || s.includes('complete') || s.includes('selesai');
    }

    return matchesInline;
  });

  const getStatusPriority = (status: string) => {
    const s = status.toLowerCase().trim();
    if (s.includes('not started') || s.includes('belum mulai')) return 1;
    if (s.includes('on going') || s.includes('ongoing')) return 2;
    if (s.includes('complete') || s.includes('done') || s.includes('selesai')) return 3;
    if (s.includes('cancel') || s.includes('batal')) return 4;
    return 5;
  };

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    return getStatusPriority(a.status) - getStatusPriority(b.status);
  });

  return (
    <div className="pb-24 bg-gray-50 min-h-screen relative">
      <header className="bg-[#429dbb] text-white px-5 py-4 shadow-md sticky top-0 z-50 w-full mb-4 flex items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight drop-shadow-sm">My Task</h1>
      </header>

      {/* Card 1: Inline Filter */}
      <div className="px-4 mb-4">
        <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 flex gap-1">
          {(['To Do', 'Review', 'Done'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setInlineFilter(filter)}
              className={cn(
                "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                inlineFilter === filter
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-3">
        {isLoading && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            <span className="ml-2 text-sm text-gray-500">Memuat data...</span>
          </div>
        )}
        {!isLoading && sortedTasks.map((task) => {
          let cardBg = 'bg-white border-gray-100';
          let badgeBg = 'bg-gray-100 text-gray-700';
          
          const s = task.status.toLowerCase().trim();
          if (s.includes('not started') || s.includes('belum mulai')) {
            cardBg = 'bg-slate-50 border-slate-200';
            badgeBg = 'bg-slate-200 text-slate-800';
          } else if (s.includes('on going') || s.includes('ongoing')) {
            cardBg = 'bg-blue-50 border-blue-200';
            badgeBg = 'bg-blue-200 text-blue-800';
          } else if (s.includes('complete') || s.includes('done') || s.includes('selesai')) {
            cardBg = 'bg-green-50 border-green-200';
            badgeBg = 'bg-green-200 text-green-800';
          } else if (s.includes('cancel') || s.includes('batal')) {
            cardBg = 'bg-red-50 border-red-200';
            badgeBg = 'bg-red-200 text-red-800';
          }
          
          let pioClass = "bg-gray-100 text-gray-700";
          const pLower = (task.priority || '').toLowerCase();
          if (pLower === 'high' || pLower === 'tinggi') pioClass = "bg-red-100 text-red-700";
          else if (pLower === 'medium' || pLower === 'sedang') pioClass = "bg-orange-100 text-orange-700";
          else if (pLower === 'low' || pLower === 'rendah') pioClass = "bg-blue-100 text-blue-700";
          
          const dueInfo = task.dueDate ? getDueDaysLeft(task.dueDate) : null;

          return (
            <motion.div 
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate(`/tasks/${task.id}`)}
              className={cn("rounded-xl shadow-sm border p-4 cursor-pointer active:scale-[0.98] transition-transform", cardBg)}
            >
              <div className="flex justify-between items-start mb-2 gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 leading-tight truncate">{task.title}</h3>
                  <div className="mt-1 space-y-0.5">
                    <p className="text-xs text-gray-600 truncate"><span className="text-gray-400 font-medium">Project:</span> {task.project}</p>
                    <p className="text-xs text-gray-600 truncate mb-2"><span className="text-gray-400 font-medium">Unit:</span> {task.unit}</p>
                    
                    {task.userName && task.userName !== 'Unknown User' && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <img 
                          src={task.userPhoto || undefined} 
                          alt={task.userName} 
                          className="w-5 h-5 rounded-full object-cover border border-gray-200"
                          onError={(e) => {
                             (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(task.userName)}&background=eff6ff&color=3b82f6`;
                          }}
                        />
                        <span className="text-xs font-medium text-gray-700 truncate">{task.userName}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={cn(
                    "text-[10px] font-bold px-2.5 py-1 rounded-md whitespace-nowrap",
                    badgeBg
                  )}>
                    {task.status || 'No Status'}
                  </span>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap", pioClass)}>
                    {task.priority || 'Normal'}
                  </span>
                </div>
              </div>
              
              {(() => {
                const isTaskDone = (task.status || '').trim().toUpperCase() === 'DONE' || (task.status || '').trim().toUpperCase() === 'COMPLETE' || (task.status || '').trim().toUpperCase() === 'SELESAI';
                return ((task.dueDate && dueInfo) || isTaskDone) && (
                  <div className="mt-3 pt-3 border-t border-gray-100/60 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">{task.dueDate ? formatDateMMDDYY(task.dueDate) : '-'}</span>
                    </div>
                    {isTaskDone ? (
                      <div className="text-right flex flex-col items-end">
                        <div className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          Done @ {formatToMMDDYYYY(task.completeDate)}
                        </div>
                        {task.assignDate && task.completeDate ? (
                          <span className="text-[10px] text-gray-400 mt-1 font-mono">
                            {getDuration(task.assignDate, task.completeDate)}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      dueInfo && (
                        <div className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", dueInfo.isOverdue ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600")}>
                           {dueInfo.days} {dueInfo.label}
                        </div>
                      )
                    )}
                  </div>
                );
              })()}
            </motion.div>
          );
        })}
        {sortedTasks.length === 0 && (
          <div className="text-center py-10">
             <p className="text-gray-500 text-sm">Tidak ada task yang ditemukan.</p>
          </div>
        )}
      </div>
    </div>
  );
}

