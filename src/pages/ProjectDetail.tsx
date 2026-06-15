import { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, DollarSign, Calendar, Users, X, Plus, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { getSheetData } from '../lib/api';

// Helper for duration
function getFormattedDuration(startStr: string, endStr: string) {
  try {
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Unknown duration';
    
    let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    let days = end.getDate() - start.getDate();
    if (days < 0) {
      months--;
      const temp = new Date(end.getFullYear(), end.getMonth(), 0);
      days += temp.getDate();
    }
    const parts = [];
    if (months > 0) parts.push(`${months} months`);
    if (days > 0) parts.push(`${days} days`);
    return parts.length ? parts.join(' ') : '0 days';
  } catch (e) {
    return 'Unknown duration';
  }
}

// Format IDR money
function formatIDR(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

function formatDateMMDDYY(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

export function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [expandTasks, setExpandTasks] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showUnitPopup, setShowUnitPopup] = useState(false);
  const [showAttendantPopup, setShowAttendantPopup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        setIsLoading(true);
        const [unitRes, projRes, taskRes, userRes] = await Promise.all([
          getSheetData('Unit!A1:Z500').catch(() => null),
          getSheetData('Project!A1:Z1000').catch(() => null),
          getSheetData('Task!A1:Z2000').catch(() => null),
          getSheetData('User!A1:Z500').catch(() => null)
        ]);

        const userMap = new Map<string, { photo: string, name: string, id: string }>();
        if (userRes && userRes.values && userRes.values.length > 0) {
          const headers = userRes.values[0] as string[];
          const emailIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'EMAIL');
          const photoIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PHOTO' || h?.trim().toUpperCase() === 'AVATAR');
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'NAME');
          const uidIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ID');
          if (emailIdx > -1) {
            userRes.values.slice(1).forEach((row: any[]) => {
              const email = row[emailIdx]?.trim();
              if (email) {
                userMap.set(email, {
                  photo: (photoIdx > -1 && row[photoIdx]) ? row[photoIdx] : '',
                  name: (nameIdx > -1 && row[nameIdx]) ? row[nameIdx] : email.split('@')[0],
                  id: (uidIdx > -1 && row[uidIdx]) ? row[uidIdx] : ''
                });
              }
            });
          }
        }

        let unitInfo = { name: 'Unknown Unit', logo: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=100&q=80', type: '' };
        const unitMap = new Map<string, { name: string, logo: string, type: string }>();
        
        if (unitRes && unitRes.values && unitRes.values.length > 0) {
          const headers = unitRes.values[0] as string[];
          const idIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ID');
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'UNIT NAME');
          const logoIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'LOGO' || h?.trim().toUpperCase() === 'IMAGE');
          const typeIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TYPE');
          
          if (idIdx > -1 && nameIdx > -1) {
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

        let tasksList: any[] = [];
        let totalTasks = 0;
        let completedTasks = 0;
        let totalTaskExpenses = 0;
        const projectUsers = new Set<string>();
        const attendants: { name: string, avatar: string, id: string }[] = [];
        
        if (taskRes && taskRes.values && taskRes.values.length > 0) {
          const headers = taskRes.values[0] as string[];
          const taskIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TASK ID');
          const projIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PROJECT' || h?.trim().toUpperCase() === 'PROJECT ID' || h?.trim().toUpperCase() === 'ID PROJECT');
          const taskNameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TASK NAME' || h?.trim().toUpperCase() === 'TASK TITLE' || h?.trim().toUpperCase() === 'TITLE' || h?.trim().toUpperCase() === 'TASK');
          const statusIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'STATUS');
          const tExpIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'EXPENSES' || h?.trim().toUpperCase() === 'EXPENSE');
          const tUserIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'USER');
          const dueIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TASK DUE DATE' || h?.trim().toUpperCase() === 'DUE DATE');
          
          if (projIdIdx > -1 && taskIdIdx > -1) {
             taskRes.values.slice(1).forEach((row: any[]) => {
               if (!row[taskIdIdx] || !row[taskIdIdx].trim()) return;
               const pId = row[projIdIdx]?.trim();
               if (pId === id) {
                 totalTasks++;
                 const status = row[statusIdx]?.trim().toUpperCase() || '';
                 let parsedStatus = 'Todo';
                 if (status === 'DONE' || status === 'SELESAI' || status === 'COMPLETE') {
                    completedTasks++;
                    parsedStatus = 'Done';
                 } else if (status === 'IN PROGRESS' || status === 'ON GOING') {
                    parsedStatus = 'In Progress';
                 }
                 
                 let taskExp = 0;
                 if (tExpIdx > -1 && row[tExpIdx]) {
                    taskExp = parseInt(row[tExpIdx].replace(/\D/g, ''), 10) || 0;
                 }
                 totalTaskExpenses += taskExp;

                 const taskUserEmail = tUserIdx > -1 ? row[tUserIdx]?.trim() : '';
                 const userDetails = userMap.get(taskUserEmail);
                 let avatarStr = '';
                 let userName = taskUserEmail ? taskUserEmail.split('@')[0] : 'U';
                 let userId = '';

                 if (userDetails) {
                   avatarStr = userDetails.photo;
                   userName = userDetails.name;
                   userId = userDetails.id;
                 }
                 
                 if (!avatarStr) {
                   avatarStr = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=eff6ff&color=3b82f6`;
                 }
                 
                 if (taskUserEmail && !projectUsers.has(taskUserEmail)) {
                   projectUsers.add(taskUserEmail);
                   attendants.push({ name: userName, avatar: avatarStr, id: userId });
                 }

                 tasksList.push({
                   id: row[taskIdIdx].trim(),
                   title: taskNameIdx > -1 ? (row[taskNameIdx] || row[taskIdIdx]) : row[taskIdIdx],
                   status: parsedStatus,
                   expense: taskExp,
                   avatar: avatarStr,
                   dueDate: dueIdx > -1 ? row[dueIdx] : ''
                 });
               }
             });
          }
        }

        if (projRes && projRes.values && projRes.values.length > 0) {
          const headers = projRes.values[0] as string[];
          const idIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PROJECT ID');
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PROJECT NAME');
          const statusIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'STATUS');
          const descIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'DESCRIPTION' || h?.trim().toUpperCase() === 'PROJECT DESCRIPTION');
          const expenseIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'EXPENSE' || h?.trim().toUpperCase() === 'EXPENSES' || h?.trim().toUpperCase() === 'BUDGET');
          const startIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'START DATE' || h?.trim().toUpperCase() === 'START');
          const endIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'END DATE' || h?.trim().toUpperCase() === 'END');
          
          const possibleUnitIdx = headers.findIndex(h => {
             const key = h?.trim().toUpperCase();
             return key === 'UNIT' || key === 'UNIT ID' || key === 'ID UNIT' || key === 'UNIT_ID';
          });

          if (idIdx > -1) {
             const projRow = projRes.values.slice(1).find((row: any[]) => row[idIdx]?.trim() === id);
             if (projRow) {
                const uId = possibleUnitIdx > -1 ? projRow[possibleUnitIdx]?.trim() : '';
                if (uId && unitMap.has(uId)) {
                  unitInfo = unitMap.get(uId)!;
                } else if (uId) {
                  unitInfo.name = uId;
                }
                
                let expenseValue = 0;
                if (expenseIdx > -1 && projRow[expenseIdx]) {
                   expenseValue = parseInt(projRow[expenseIdx].replace(/\D/g, ''), 10) || 0;
                }

                setProject({
                  id: id,
                  name: nameIdx > -1 ? (projRow[nameIdx] || id) : id,
                  description: descIdx > -1 ? projRow[descIdx] : 'No description available.',
                  status: statusIdx > -1 ? (projRow[statusIdx] || 'Unknown') : 'Unknown',
                  totalTasks,
                  completedTasks,
                  expenses: totalTaskExpenses,
                  unit: unitInfo,
                  startDate: startIdx > -1 && projRow[startIdx] ? projRow[startIdx] : new Date().toISOString(),
                  endDate: endIdx > -1 && projRow[endIdx] ? projRow[endIdx] : new Date().toISOString(),
                  attendants: attendants,
                  tasks: tasksList
                });
             }
          }
        }
      } catch (error) {
        console.error("Failed fetching detail data", error);
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
        <p className="text-gray-500 font-medium">Memuat data project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4 text-gray-500">
          <X className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Project Tidak Ditemukan</h2>
        <p className="text-gray-500 mb-6">Mungkin data project ini telah dihapus atau ID tidak valid.</p>
        <button onClick={() => navigate(-1)} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 transition">
          Kembali
        </button>
      </div>
    );
  }

  const completionPercentage = project.totalTasks > 0 ? Math.round((project.completedTasks / project.totalTasks) * 100) : 0;

  return (
    <div className="pb-24 bg-gray-50 min-h-screen relative">
      <header className="bg-[#429dbb] text-white px-5 py-4 shadow-md sticky top-0 z-50 w-full mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors shrink-0 cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-xl font-bold tracking-tight drop-shadow-sm">Project Detail</h1>
      </header>

      <div className="px-4 space-y-4">
        {/* Card 1: Judul & Deskripsi */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-xl font-bold text-gray-900 leading-tight flex-1">{project.name}</h2>
            <div className="ml-4 shrink-0 mt-0.5">
              <span className={cn(
                "text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap",
                (() => {
                  const s = project.status.toLowerCase();
                  if (s.includes('complete') || s.includes('done') || s.includes('selesai')) return "bg-green-100 text-green-700";
                  if (s.includes('cancel') || s.includes('batal')) return "bg-red-100 text-red-700";
                  if (s.includes('not started') || s.includes('belum mulai')) return "bg-slate-100 text-slate-700";
                  return "bg-blue-100 text-blue-700";
                })()
              )}>
                {project.status}
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed mt-1.5">{project.description}</p>
        </div>

        {/* Card 2: Overall Progress, Expenses, Unit, Period, Attendant */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
          {/* Progress */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-gray-500 font-medium">Overall Progress</span>
              <span className="font-bold text-gray-800">{completionPercentage}%</span>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all duration-500", project.status === 'Complete' ? "bg-green-500" : "bg-blue-500")}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-4">
            {/* Expenses */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center shrink-0">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Expenses</p>
                <p className="text-xs font-bold text-gray-900 mt-0.5 whitespace-nowrap">{formatIDR(project.expenses)}</p>
              </div>
            </div>

            {/* Unit */}
            <div onClick={() => setShowUnitPopup(true)} className="flex items-start gap-3 cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                <img src={project.unit.logo || undefined} alt="Unit Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Unit</p>
                <p className="text-xs font-bold text-gray-900 mt-0.5">{project.unit.name}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-4">
            {/* Period */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Period</p>
                <p className="text-xs font-bold text-gray-900 mt-0.5">
                  {formatDateMMDDYY(project.startDate)}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5 italic">
                  Until {formatDateMMDDYY(project.endDate)} ({getFormattedDuration(project.startDate, project.endDate)})
                </p>
              </div>
            </div>

            {/* Attendant */}
            <div onClick={() => setShowAttendantPopup(true)} className="flex justify-end items-center mr-2 cursor-pointer">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {project.attendants.slice(0, 3).map((att: any, i: number) => (
                    <img key={i} src={att.avatar || undefined} alt="attendant" className="w-6 h-6 rounded-full border border-white" />
                  ))}
                  {project.attendants.length > 3 && (
                    <div className="w-6 h-6 rounded-full bg-gray-100 border border-white flex items-center justify-center text-[8px] font-bold text-gray-600 z-10">
                      +{project.attendants.length - 3}
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 leading-tight uppercase font-bold tracking-wider mb-0.5">Attendants</span>
                  <span className="text-xs font-bold text-gray-900 leading-tight">{project.attendants.length} Person</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Tasks List (Toggle expand) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <button 
            onClick={() => setExpandTasks(!expandTasks)}
            className="w-full flex items-center justify-between p-4 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-semibold text-gray-900">Task <span className="font-normal text-gray-500 ml-1">({project.completedTasks}/{project.totalTasks} Done)</span></h3>
            {expandTasks ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          
          <AnimatePresence>
            {expandTasks && (
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 pt-0 space-y-3">
                  {project.tasks.map((task: any) => (
                    <div 
                      key={task.id} 
                      onClick={() => navigate(`/tasks/${task.id}`)}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      {task.status === 'Done' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-medium truncate", task.status === 'Done' ? "text-gray-500 line-through" : "text-gray-900")}>
                          {task.title}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5 font-medium">{formatIDR(task.expense || 0)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {task.avatar && <img src={task.avatar || undefined} alt="avatar" className="w-6 h-6 rounded-full border border-gray-200 object-cover" />}
                        {task.dueDate && <span className="text-[9px] bg-white px-1.5 py-0.5 rounded border border-gray-200 whitespace-nowrap text-gray-600 font-medium">{new Date(task.dueDate).toLocaleDateString('id-ID')}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Card 4: Action Buttons */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex gap-3">
          <button className="flex-1 bg-green-600 text-white rounded-xl py-3 font-medium text-sm shadow-sm hover:bg-green-700 transition">
            Complete
          </button>
          <button className="flex-1 bg-red-50 text-red-600 border border-red-100 rounded-xl py-3 font-medium text-sm shadow-sm hover:bg-red-100 transition">
            Cancelled
          </button>
        </div>
      </div>

      {/* FAB Add Task */}
      <button 
        onClick={() => setShowAddTask(true)}
        className="fixed bottom-20 right-5 w-14 h-14 bg-blue-600 rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center text-white hover:bg-blue-700 active:scale-95 transition-all z-20 cursor-pointer"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Slide Up Add Task (BottomSheet) */}
      <AnimatePresence>
        {showAddTask && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddTask(false)}
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
                <h3 className="font-bold text-gray-900">Add New Task</h3>
                <button onClick={() => setShowAddTask(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Task Title</label>
                  <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., Create UI Mockups" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status</label>
                  <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Todo</option>
                    <option>In Progress</option>
                    <option>Done</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-white border-t border-gray-100">
                <button 
                  onClick={() => setShowAddTask(false)}
                  className="w-full py-3 px-4 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                >
                  Create Task
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Unit Detail Popup */}
      <AnimatePresence>
        {showUnitPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowUnitPopup(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative z-10">
              <div className="p-6 text-center">
                <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full overflow-hidden border-4 border-white shadow-sm mb-4">
                  <img src={project.unit.logo || undefined} alt="Unit Logo" className="w-full h-full object-cover" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{project.unit.name}</h3>
                <p className="text-sm text-gray-500 font-medium">{project.unit.type || 'Unknown Type'}</p>
                <button onClick={() => setShowUnitPopup(false)} className="mt-6 w-full py-2.5 bg-blue-50 text-blue-600 font-medium rounded-xl hover:bg-blue-100 transition cursor-pointer">
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Attendant Popup */}
      <AnimatePresence>
        {showAttendantPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAttendantPopup(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl w-full max-w-sm mx-auto relative z-10 max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center shrink-0">
                <h3 className="font-bold text-gray-900 text-lg">Daftar Attendant</h3>
                <button onClick={() => setShowAttendantPopup(false)} className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-500 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto space-y-3">
                {project.attendants.map((att: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                    <img src={att.avatar || undefined} alt="attendant" className="w-10 h-10 rounded-full border border-gray-200 object-cover shrink-0" />
                    <div>
                      <p className="font-bold text-gray-900 leading-tight">{att.name}</p>
                      {att.id && <p className="text-xs text-gray-500 mt-0.5">{att.id}</p>}
                    </div>
                  </div>
                ))}
                {project.attendants.length === 0 && (
                  <p className="text-center text-gray-500 py-4 text-sm">Belum ada attendant.</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
