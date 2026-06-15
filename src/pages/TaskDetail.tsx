import { useState, useEffect } from 'react';
import { ArrowLeft, DollarSign, Calendar, Users, X, Plus, CheckCircle2, Circle, Loader2, Building, Folder, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { getSheetData } from '../lib/api';

// Format currency
function formatIDR(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
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

export function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [task, setTask] = useState<any>(null);
  const [expandActivities, setExpandActivities] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        setIsLoading(true);
        const [unitRes, projRes, taskRes, userRes, subRes1, subRes2] = await Promise.all([
          getSheetData('Unit!A1:Z500').catch(() => null),
          getSheetData('Project!A1:Z1000').catch(() => null),
          getSheetData('Task!A1:Z2000').catch(() => null),
          getSheetData('User!A1:Z500').catch(() => null),
          getSheetData('Subtask!A1:Z3000').catch(() => null),
          getSheetData('Sub Task!A1:Z3000').catch(() => null)
        ]);
        const subRes = subRes2?.values ? subRes2 : subRes1;

        const userMap = new Map<string, { photo: string, name: string }>();
        if (userRes?.values?.length > 0) {
          const headers = userRes.values[0] as string[];
          const emailIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'EMAIL');
          const photoIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PHOTO' || h?.trim().toUpperCase() === 'AVATAR');
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'NAME');
          if (emailIdx > -1) {
            userRes.values.slice(1).forEach((row: any[]) => {
              const email = row[emailIdx]?.trim();
              if (email) {
                userMap.set(email, {
                  photo: (photoIdx > -1 && row[photoIdx]) ? row[photoIdx] : `https://ui-avatars.com/api/?name=${encodeURIComponent(row[nameIdx] || email)}&background=eff6ff&color=3b82f6`,
                  name: (nameIdx > -1 && row[nameIdx]) ? row[nameIdx] : email.split('@')[0],
                });
              }
            });
          }
        }

        const projectMap = new Map<string, any>();
        let unitMap = new Map<string, any>();
        
        if (unitRes?.values?.length > 0) {
          const headers = unitRes.values[0] as string[];
          const idIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ID');
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'UNIT NAME');
          const logoIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'LOGO' || h?.trim().toUpperCase() === 'IMAGE');
          const typeIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TYPE');
          
          if (idIdx > -1) {
            unitRes.values.slice(1).forEach((row: any[]) => {
              const uId = row[idIdx]?.trim();
              if (uId) {
                unitMap.set(uId, {
                  name: row[nameIdx]?.trim() || 'Unknown',
                  logo: (logoIdx > -1 && row[logoIdx]) ? row[logoIdx].trim() : 'https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=100&q=80',
                  type: typeIdx > -1 ? (row[typeIdx] || '') : ''
                });
              }
            });
          }
        }

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
               const pId = row[idIdx]?.trim();
               if (pId) {
                 const uId = possibleUnitIdx > -1 ? row[possibleUnitIdx]?.trim() : '';
                 let uInfo = { name: uId || 'Unknown', logo: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=100&q=80', type: ''};
                 if (unitMap.has(uId)) {
                   uInfo = unitMap.get(uId);
                 }
                 projectMap.set(pId, {
                   name: nameIdx > -1 ? row[nameIdx] : pId,
                   unit: uInfo
                 });
               }
             });
           }
        }

        let totalSubtasks = 0;
        let completedSubtasks = 0;
        let totalExpenses = 0;
        let subtaskList: any[] = [];

        if (subRes?.values?.length > 0) {
          const headers = subRes.values[0] as string[];
          const taskIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TASK ID' || h?.trim().toUpperCase() === 'TASK');
          const subtaskIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'SUBTASK ID');
          const titleIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'SUBTASK NAME' || h?.trim().toUpperCase() === 'SUBTASK' || h?.trim().toUpperCase() === 'TITLE');
          const statusIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'STATUS');
          const expIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'AMOUNT' || h?.trim().toUpperCase() === 'EXPENSES' || h?.trim().toUpperCase() === 'EXPENSE');
          const unitIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'UNIT ID' || h?.trim().toUpperCase() === 'UNIT');
          const userIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'USER');
          const dueIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'DUE DATE' || h?.trim().toUpperCase() === 'SUBTASK DUE DATE');
          
          if (taskIdIdx > -1) {
            subRes.values.slice(1).forEach((row: any[]) => {
              if (row[taskIdIdx]?.trim() === id) {
                totalSubtasks++;
                const stStatus = row[statusIdx]?.trim().toUpperCase() || '';
                let isDone = false;
                if (stStatus === 'DONE' || stStatus === 'SELESAI' || stStatus === 'COMPLETE') {
                  completedSubtasks++;
                  isDone = true;
                }
                
                let sExp = 0;
                if (expIdx > -1 && row[expIdx]) {
                  sExp = parseInt(row[expIdx].replace(/\D/g, ''), 10) || 0;
                }
                totalExpenses += sExp;

                const userEmail = userIdx > -1 ? row[userIdx]?.trim() : '';
                const userInfo = userMap.get(userEmail) || { photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(userEmail || 'U')}&background=eff6ff&color=3b82f6`, name: userEmail || 'Unknown User' };
                const dueDate = dueIdx > -1 ? (row[dueIdx] || '') : '';

                subtaskList.push({
                  id: subtaskIdIdx > -1 ? row[subtaskIdIdx] : Math.random().toString(),
                  title: titleIdx > -1 ? row[titleIdx] : 'Unknown Subtask',
                  status: isDone ? 'Done' : 'Todo',
                  expense: sExp,
                  user: userInfo,
                  dueDate: dueDate
                });
              }
            });
          }
        }

        if (taskRes?.values?.length > 0) {
          const headers = taskRes.values[0] as string[];
          const taskIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TASK ID');
          const taskNameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TASK NAME' || h?.trim().toUpperCase() === 'TITLE');
          const instIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TASK INSTRUCTION' || h?.trim().toUpperCase() === 'INSTRUCTION');
          const statusIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'STATUS');
          const pioIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TASK PRIORITY' || h?.trim().toUpperCase() === 'PRIORITY');
          const projIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PROJECT ID' || h?.trim().toUpperCase() === 'PROJECT');
          const dueIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TASK DUE DATE' || h?.trim().toUpperCase() === 'DUE DATE');
          const userIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'USER');
          
          if (taskIdIdx > -1) {
            const row = taskRes.values.slice(1).find((r: any[]) => r[taskIdIdx]?.trim() === id);
            if (row) {
              const pId = projIdIdx > -1 ? row[projIdIdx]?.trim() : '';
              const projInfo = projectMap.get(pId) || { name: pId || 'Unknown Project', unit: { name: 'Unknown Unit', logo: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=100&q=80' } };
              
              const userEmail = userIdx > -1 ? row[userIdx]?.trim() : '';
              const userInfo = userMap.get(userEmail) || { name: userEmail || 'Unknown User', photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(userEmail || 'U')}&background=eff6ff&color=3b82f6` };

              setTask({
                id,
                title: taskNameIdx > -1 ? row[taskNameIdx] : id,
                instruction: instIdx > -1 ? row[instIdx] : '',
                status: statusIdx > -1 ? (row[statusIdx] || 'Unknown') : 'Unknown',
                priority: pioIdx > -1 ? (row[pioIdx] || 'Medium') : 'Medium',
                dueDate: dueIdx > -1 ? (row[dueIdx] || new Date().toISOString()) : new Date().toISOString(),
                project: projInfo,
                assignedTo: userInfo,
                totalSubtasks,
                completedSubtasks,
                expenses: totalExpenses,
                activities: subtaskList
              });
            }
          }
        }
      } catch (error) {
        console.error("Failed fetching task detail data", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Memuat data task...</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4 text-gray-500">
          <X className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Task Tidak Ditemukan</h2>
        <p className="text-gray-500 mb-6">Mungkin data task ini telah dihapus atau ID tidak valid.</p>
        <button onClick={() => navigate(-1)} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 transition">
          Kembali
        </button>
      </div>
    );
  }

  const completionPercentage = task.totalSubtasks > 0 ? Math.round((task.completedSubtasks / task.totalSubtasks) * 100) : 0;
  const dueInfo = getDueDaysLeft(task.dueDate);

  return (
    <div className="pb-24 bg-gray-50 min-h-screen relative">
      <header className="bg-[#429dbb] text-white px-5 py-4 shadow-md sticky top-0 z-50 w-full flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-blue-700 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 focus:ring-offset-blue-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold tracking-wide">Task Detail</h1>
      </header>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Card 1: Title, Instruction, Status, Priority */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h2 className="text-xl font-bold text-gray-900 leading-tight mb-2">{task.title}</h2>
          {task.instruction && (
            <p className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100 italic">
              {task.instruction}
            </p>
          )}
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap",
              (() => {
                const s = task.status.toLowerCase();
                if (s.includes('complete') || s.includes('done') || s.includes('selesai')) return "bg-green-100 text-green-700";
                if (s.includes('cancel') || s.includes('batal')) return "bg-red-100 text-red-700";
                if (s.includes('not started') || s.includes('belum mulai')) return "bg-slate-100 text-slate-700";
                return "bg-blue-100 text-blue-700";
              })()
            )}>
              {task.status}
            </span>
            <span className={cn(
              "text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap",
              task.priority.toLowerCase().includes('high') ? "bg-red-100 text-red-700" :
              task.priority.toLowerCase().includes('low') ? "bg-gray-100 text-gray-700" :
              "bg-orange-100 text-orange-700"
            )}>
              {task.priority.toLowerCase().includes('high') ? 'High' : task.priority.toLowerCase().includes('low') ? 'Low' : 'Medium'}
            </span>
          </div>
        </div>

        {/* Card 2: Expenses */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Expenses</p>
            <p className="text-lg font-bold text-gray-900">{formatIDR(task.expenses)}</p>
          </div>
        </div>

        {/* Card 3: Unit */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-200 p-0.5">
            <img src={task.project.unit.logo || undefined} alt="Unit Logo" className="w-full h-full object-cover rounded-full" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Unit</p>
            <p className="text-sm font-bold text-gray-900 leading-none">{task.project.unit.name}</p>
          </div>
        </div>

        {/* Card 4: Project */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Folder className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Project</p>
            <p className="text-sm font-bold text-gray-900 leading-none">{task.project.name}</p>
          </div>
        </div>

        {/* Card 5: Due Date and Progress */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 grid grid-cols-2 gap-4 divide-x divide-gray-100">
          <div className="flex flex-col justify-center">
             <div className="flex items-center gap-2 mb-1">
               <Clock className="w-4 h-4 text-gray-400" />
               <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Due Date</p>
             </div>
             <p className="text-sm font-bold text-gray-900 mb-1">{formatDateMMDDYY(task.dueDate)}</p>
             <div className={cn("text-xs font-semibold inline-block px-2 py-0.5 rounded", dueInfo.isOverdue ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600")}>
               {dueInfo.days} {dueInfo.label}
             </div>
          </div>
          <div className="flex flex-col items-center justify-center pl-4 relative">
             <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider w-full text-center absolute top-0 left-4 right-0">Progress</p>
             <div className="relative w-16 h-16 mt-4">
                <svg viewBox="0 0 36 36" className="w-16 h-16 circular-chart blue">
                  <path className="text-gray-100 stroke-current"
                    strokeWidth="3.8"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path className={cn("stroke-current", completionPercentage === 100 ? "text-green-500" : "text-blue-500")}
                    strokeDasharray={`${completionPercentage}, 100`}
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-800">
                  {completionPercentage}%
                </div>
             </div>
          </div>
        </div>

        {/* Card 6: Assigned To */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
          <img src={task.assignedTo.photo || undefined} alt="Assigned User" className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0" />
          <div className="flex flex-col justify-center">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Assigned To</span>
            <span className="text-sm font-bold text-gray-900 leading-none">{task.assignedTo.name}</span>
          </div>
        </div>

        {/* Card 7: Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
           <div 
             className="p-4 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
             onClick={() => setExpandActivities(!expandActivities)}
           >
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900">Activity</h3>
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{task.completedSubtasks}/{task.totalSubtasks} Done</span>
              </div>
              {expandActivities ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
           </div>
           
           <AnimatePresence>
             {expandActivities && (
               <motion.div 
                 initial={{ height: 0, opacity: 0 }}
                 animate={{ height: 'auto', opacity: 1 }}
                 exit={{ height: 0, opacity: 0 }}
                 className="overflow-hidden"
               >
                 <div className="p-4 space-y-3 bg-gray-50/50">
                   {task.activities.length === 0 && (
                     <p className="text-center text-gray-500 text-sm py-2">Belum ada activity (subtask).</p>
                   )}
                   {task.activities.map((act: any) => (
                      <div 
                        key={act.id} 
                        className="flex flex-col p-3 bg-white rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => navigate(`/activities/${act.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          {act.status === 'Done' ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-300 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-sm font-medium truncate", act.status === 'Done' ? "text-gray-500 line-through" : "text-gray-900")}>
                              {act.title}
                            </p>
                            {act.expense > 0 && (
                               <p className="text-[10px] text-gray-500 mt-0.5 font-medium">{formatIDR(act.expense)}</p>
                            )}
                          </div>
                          {act.user?.photo && (
                            <img src={act.user.photo || undefined} alt={act.user.name} className="w-7 h-7 rounded-full ml-auto shrink-0 border border-gray-200 object-cover" />
                          )}
                          {act.dueDate && (
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">{formatDateMMDDYY(act.dueDate)}</span>
                          )}
                        </div>
                      </div>
                   ))}
                 </div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
          <button className="flex-1 px-4 py-3 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all text-center shadow-sm border border-blue-100">
            Send Report
          </button>
          <button className="flex-1 px-4 py-3 text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all text-center shadow-sm border border-emerald-100">
            Done
          </button>
        </div>

      </div>

      {/* FAB Add Activity */}
      <button 
        className="fixed bottom-24 right-5 w-14 h-14 bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30 border border-blue-500 z-40 group"
        onClick={() => {}}
      >
        <Plus className="w-7 h-7 group-hover:rotate-90 transition-transform duration-300" strokeWidth={2.5} />
      </button>

    </div>
  );
}
