import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, DollarSign, Calendar, Users, X, Plus, CheckCircle2, Circle, Loader2, Play } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { getSheetData, appendSheetData, updateSheetData } from '../lib/api';

// Helper to convert column index to letters (0 -> A, 1 -> B, ...)
function getColumnLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

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

// Format IDR money
function formatIDR(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

function formatDateMMDDYY(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function getTodayDateMMDDYYYY() {
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const yyyy = today.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
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

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [taskHeaders, setTaskHeaders] = useState<string[]>([]);
  
  // New task form fields
  const [newTaskId, setNewTaskId] = useState('');
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskInstruction, setNewTaskInstruction] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'med' | 'high'>('low');
  const [newTaskAssignDate, setNewTaskAssignDate] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskUser, setNewTaskUser] = useState('');
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  
  const [successToast, setSuccessToast] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const fetchData = async (showLoader = true) => {
    if (!id) return;
    try {
      if (showLoader) setIsLoading(true);
      const [unitRes, projRes, taskRes, userRes, subRes1, subRes2] = await Promise.all([
        getSheetData('Unit!A1:Z500').catch(() => null),
        getSheetData('Project!A1:Z1000').catch(() => null),
        getSheetData('Task!A1:Z2000').catch(() => null),
        getSheetData('User!A1:Z500').catch(() => null),
        getSheetData('Subtask!A1:Z3000').catch(() => null),
        getSheetData('Sub Task!A1:Z3000').catch(() => null)
      ]);
      const subRes = subRes2?.values ? subRes2 : subRes1;

      const userMap = new Map<string, { photo: string, name: string, id: string }>();
      const uList: any[] = [];
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
              const userId = (uidIdx > -1 && row[uidIdx]) ? String(row[uidIdx]).trim() : '';
              if (userId.toUpperCase() === 'XXX') {
                return;
              }
              const uObj = {
                photo: (photoIdx > -1 && row[photoIdx]) ? row[photoIdx] : '',
                name: (nameIdx > -1 && row[nameIdx]) ? row[nameIdx] : email.split('@')[0],
                id: userId,
                email: email
              };
              userMap.set(email, uObj);
              uList.push(uObj);
            }
          });
        }
      }
      setAllUsers(uList);

      if (taskRes && taskRes.values && taskRes.values.length > 0) {
        setTaskHeaders(taskRes.values[0] as string[]);
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
      const taskExpensesMap = new Map<string, number>();

      if (subRes && subRes.values && subRes.values.length > 0) {
        const headers = subRes.values[0] as string[];
        const stTaskIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TASK ID' || h?.trim().toUpperCase() === 'TASK');
        const stExpIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'AMOUNT' || h?.trim().toUpperCase() === 'EXPENSES' || h?.trim().toUpperCase() === 'EXPENSE');
        
        if (stTaskIdIdx > -1) {
          subRes.values.slice(1).forEach((row: any[]) => {
            const tid = row[stTaskIdIdx]?.trim();
            if (tid) {
              let exp = 0;
              if (stExpIdx > -1 && row[stExpIdx]) {
                exp = parseInt(row[stExpIdx].replace(/\D/g, ''), 10) || 0;
              }
              taskExpensesMap.set(tid, (taskExpensesMap.get(tid) || 0) + exp);
            }
          });
        }
      }
      
      if (taskRes && taskRes.values && taskRes.values.length > 0) {
        const headers = taskRes.values[0] as string[];
        const taskIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TASK ID');
        const projIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PROJECT' || h?.trim().toUpperCase() === 'PROJECT ID' || h?.trim().toUpperCase() === 'ID PROJECT');
        const taskNameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TASK NAME' || h?.trim().toUpperCase() === 'TASK TITLE' || h?.trim().toUpperCase() === 'TITLE' || h?.trim().toUpperCase() === 'TASK');
        const statusIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'STATUS');
        const tExpIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'EXPENSES' || h?.trim().toUpperCase() === 'EXPENSE');
        const tUserIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'USER');
        const dueIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TASK DUE DATE' || h?.trim().toUpperCase() === 'DUE DATE');
        const assignIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'TASK ASSIGN DATE' || h?.trim().toUpperCase() === 'ASSIGN DATE' || h?.trim().toUpperCase() === 'DATE ASSIGN' || h?.trim().toUpperCase() === 'TASK_ASSIGN_DATE');
        const completeIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'TASK COMPLETE DATE' || h?.trim().toUpperCase() === 'COMPLETE DATE' || h?.trim().toUpperCase() === 'TASK COMPLETE_DATE' || h?.trim().toUpperCase() === 'TASK COMPLETE DATE');
        
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
               } else if (status === 'REVIEW' || status === 'IN REVIEW') {
                  parsedStatus = 'Review';
               }
               
               const tid = row[taskIdIdx].trim();
               let taskExp = taskExpensesMap.get(tid) || 0;
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
                 id: tid,
                 title: taskNameIdx > -1 ? (row[taskNameIdx] || tid) : tid,
                 status: parsedStatus,
                 expense: taskExp,
                 avatar: avatarStr,
                 dueDate: dueIdx > -1 ? row[dueIdx] : '',
                 assignDate: (assignIdx > -1 && row[assignIdx]) ? String(row[assignIdx]).trim() : '',
                 completeDate: (completeIdx > -1 && row[completeIdx]) ? String(row[completeIdx]).trim() : ''
               });
             }
           });

           // Sort tasks: Todo status is placed at the top of the list. Under Todo status, sort by due date ascending
           tasksList.sort((a, b) => {
             const isTodoA = a.status === 'Todo';
             const isTodoB = b.status === 'Todo';
             if (isTodoA && !isTodoB) return -1;
             if (!isTodoA && isTodoB) return 1;
             if (isTodoA && isTodoB) {
               if (!a.dueDate) return 1;
               if (!b.dueDate) return -1;
               const timeA = new Date(a.dueDate).getTime();
               const timeB = new Date(b.dueDate).getTime();
               const isNaNA = isNaN(timeA);
               const isNaNB = isNaN(timeB);
               if (isNaNA && !isNaNB) return 1;
               if (!isNaNA && isNaNB) return -1;
               if (isNaNA && isNaNB) return 0;
               return timeA - timeB;
             }
             return 0;
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
        const archivedIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ARCHIVED_IN');
        
        const possibleUnitIdx = headers.findIndex(h => {
           const key = h?.trim().toUpperCase();
           return key === 'UNIT' || key === 'UNIT ID' || key === 'ID UNIT' || key === 'UNIT_ID';
        });

        if (idIdx > -1) {
           const projRowIndex = projRes.values.slice(1).findIndex((row: any[]) => row[idIdx]?.trim() === id);
           const projRow = projRowIndex > -1 ? projRes.values.slice(1)[projRowIndex] : null;
           if (projRowIndex > -1 && projRow) {
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

              const archivedVal = archivedIdx > -1 && projRow[archivedIdx] ? projRow[archivedIdx].trim().toUpperCase() : 'FALSE';

              setProject({
                id: id,
                name: nameIdx > -1 ? (projRow[nameIdx] || id) : id,
                description: descIdx > -1 ? projRow[descIdx] : 'No description available.',
                status: statusIdx > -1 ? (projRow[statusIdx] || 'Unknown') : 'Unknown',
                totalTasks,
                completedTasks,
                expenses: totalTaskExpenses,
                unit: unitInfo,
                unitId: uId,
                startDate: startIdx > -1 && projRow[startIdx] ? projRow[startIdx] : new Date().toISOString(),
                endDate: endIdx > -1 && projRow[endIdx] ? projRow[endIdx] : new Date().toISOString(),
                attendants: attendants,
                tasks: tasksList,
                rowNumber: projRowIndex + 2,
                statusColLetter: statusIdx > -1 ? getColumnLetter(statusIdx) : 'D',
                archived: archivedVal === 'TRUE',
                archivedColLetter: archivedIdx > -1 ? getColumnLetter(archivedIdx) : getColumnLetter(headers.length)
              });
           }
        }
      }
    } catch (error) {
      console.error("Failed fetching detail data", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const handleSync = () => fetchData(false);
    window.addEventListener('appDataSyncRequest', handleSync);
    return () => {
      window.removeEventListener('appDataSyncRequest', handleSync);
    };
  }, [id]);

  const handleOpenAddTask = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setNewTaskId(`Task-${randomSuffix}`);
    setNewTaskName('');
    setNewTaskInstruction('');
    setNewTaskPriority('low');
    setNewTaskAssignDate(getTodayDateMMDDYYYY());
    setNewTaskDueDate('');
    setNewTaskUser('');
    setShowUserDropdown(false);
    setShowAddTask(true);
  };

  const getPointsForPriority = (priority: 'low' | 'med' | 'high') => {
    if (priority === 'low') return 20;
    if (priority === 'med') return 40;
    if (priority === 'high') return 60;
    return 20;
  };

  const calculatedPoints = getPointsForPriority(newTaskPriority);

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) {
      setErrorToast('Task Name is required');
      setTimeout(() => setErrorToast(null), 3000);
      return;
    }
    if (!newTaskDueDate) {
      setErrorToast('Task Due Date is required');
      setTimeout(() => setErrorToast(null), 3000);
      return;
    }
    if (!newTaskUser) {
      setErrorToast('Please assign a user');
      setTimeout(() => setErrorToast(null), 3000);
      return;
    }

    try {
      setIsSavingTask(true);
      
      let formattedDueDate = newTaskDueDate;
      const parts = newTaskDueDate.split('-');
      if (parts.length === 3) {
        formattedDueDate = `${parts[1]}/${parts[2]}/${parts[0]}`;
      }

      const assignDate = newTaskAssignDate || getTodayDateMMDDYYYY();
      const formattedPriority = newTaskPriority.charAt(0).toUpperCase() + newTaskPriority.slice(1);

      const findHeaderIndex = (headers: string[], names: string[]) => {
        return headers.findIndex(h => {
          const clean = h?.trim().toUpperCase() || '';
          return names.some(n => clean === n.toUpperCase());
        });
      };

      const newRow = new Array(taskHeaders.length > 0 ? taskHeaders.length : 13).fill('');
      
      const mappings = [
        { names: ['TASK ID', 'ID', 'ID TASK', 'TASK_ID'], val: newTaskId },
        { names: ['TASK NAME', 'TASK TITLE', 'TITLE', 'TASK'], val: newTaskName },
        { names: ['TASK INSTRUCTION', 'INSTRUCTION', 'TASK_INSTRUCTION'], val: newTaskInstruction },
        { names: ['TASK PRIORITY', 'PRIORITY', 'TASK_PRIORITY'], val: formattedPriority },
        { names: ['PROJECT ID', 'PROJECT', 'ID PROJECT', 'PROJECT_ID'], val: project.id },
        { names: ['UNIT', 'UNIT ID', 'ID UNIT', 'UNIT_ID'], val: project.unitId || '' },
        { names: ['TASK ASSIGN DATE', 'ASSIGN DATE', 'DATE ASSIGN', 'TASK_ASSIGN_DATE'], val: assignDate },
        { names: ['TASK DUE DATE', 'DUE DATE', 'DATE DUE', 'TASK_DUE_DATE'], val: formattedDueDate },
        { names: ['USER', 'EMAIL', 'ASSIGNED TO'], val: newTaskUser },
        { names: ['STATUS'], val: 'To do' },
        { names: ['TASK POIN', 'TASK POINT', 'POINTS', 'POIN', 'POINT', 'TASK_POIN', 'TASK_POINT'], val: calculatedPoints },
        { names: ['TASK READ', 'READ', 'TASK_READ'], val: 'FALSE' },
        { names: ['TASK REPORTED', 'REPORTED', 'TASK_REPORTED'], val: 'FALSE' }
      ];

      if (taskHeaders.length > 0) {
        mappings.forEach(m => {
          const idx = findHeaderIndex(taskHeaders, m.names);
          if (idx > -1) {
            newRow[idx] = m.val;
          }
        });
      } else {
        newRow[0] = newTaskId;
        newRow[1] = newTaskName;
        newRow[2] = newTaskInstruction;
        newRow[3] = formattedPriority;
        newRow[4] = project.id;
        newRow[5] = project.unitId || '';
        newRow[6] = assignDate;
        newRow[7] = formattedDueDate;
        newRow[8] = newTaskUser;
        newRow[9] = 'To do';
        newRow[10] = calculatedPoints;
        newRow[11] = 'FALSE';
        newRow[12] = 'FALSE';
      }

      await appendSheetData('Task!A1:Z', [newRow]);
      
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3000);
      setShowAddTask(false);
      
      await fetchData(false);
    } catch (err: any) {
      console.error(err);
      setErrorToast(err?.message || 'Failed to save task. Try again.');
      setTimeout(() => setErrorToast(null), 4000);
    } finally {
      setIsSavingTask(false);
    }
  };

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const handleArchiveProject = async () => {
    if (!project || !project.rowNumber || !project.archivedColLetter) {
      setErrorToast('Project row or archived column not found.');
      setTimeout(() => setErrorToast(null), 3050);
      return;
    }

    setIsArchiving(true);
    try {
      const range = `Project!${project.archivedColLetter}${project.rowNumber}`;
      await updateSheetData(range, [['TRUE']]);
      
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3050);
      
      // Navigate back or refresh
      setTimeout(() => {
        navigate(-1);
      }, 1500);
    } catch (err: any) {
      console.error('Failed to archive project', err);
      setErrorToast(err?.message || 'Gagal mengarsipkan project.');
      setTimeout(() => setErrorToast(null), 4050);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!project || !project.rowNumber || !project.statusColLetter) {
      setErrorToast('Project row or status column not found.');
      setTimeout(() => setErrorToast(null), 3050);
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const range = `Project!${project.statusColLetter}${project.rowNumber}`;
      await updateSheetData(range, [[newStatus]]);
      
      // Update local state instantly so standard view reflects the exact change
      setProject((prev: any) => prev ? { ...prev, status: newStatus } : null);
      
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3050);
      
      // Dynamic full re-fetch to ensure all task associations remain integrated
      await fetchData(false);
    } catch (err: any) {
      console.error('Failed to update status', err);
      setErrorToast(err?.message || 'Gagal memperbarui status project.');
      setTimeout(() => setErrorToast(null), 4050);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

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
  const projectDueInfo = getDueDaysLeft(project.endDate);

  const currentStatusClean = (project.status || '').toLowerCase().trim();
  const isNotStarted = currentStatusClean === 'not started' || currentStatusClean === 'not strarted' || currentStatusClean === 'belum mulai';
  const isGoing = currentStatusClean === 'on going' || currentStatusClean === 'on-going' || currentStatusClean === 'in progress';
  const isComplete = currentStatusClean === 'complete' || currentStatusClean === 'selesai' || currentStatusClean === 'done';
  const isArchived = project.archived;

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
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Period</p>
                <p className="text-xs font-bold text-gray-900 leading-none mb-1">
                  {formatDateMMDDYY(project.startDate)}
                </p>
                <div className="text-[10px] text-gray-400 italic mb-1 flex flex-col leading-tight">
                  <span className="mb-0.5">Until <span className="font-bold text-gray-600">{formatDateMMDDYY(project.endDate)}</span></span>
                  <span className="font-medium text-gray-500">{getFormattedDuration(project.startDate, project.endDate)}</span>
                </div>
              </div>
            </div>

            {/* Attendant */}
            <div onClick={() => setShowAttendantPopup(true)} className="flex justify-end items-center mr-2 cursor-pointer">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {project.attendants.slice(0, 3).map((att: any, i: number) => (
                    <img key={i} src={att.avatar || undefined} alt="attendant" className="w-6 h-6 rounded-full border border-white object-cover" />
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
                  {project.tasks.map((task: any) => {
                    const isDone = task.status === 'Done';
                    const isTodo = task.status === 'Todo';
                    const bgClass = isDone 
                      ? "bg-emerald-50/20 border-emerald-100/50 hover:bg-emerald-50/40" 
                      : isTodo 
                        ? "bg-amber-50/25 border-amber-100/60 hover:bg-amber-50/45" 
                        : "bg-gray-50 border-gray-100 hover:bg-gray-100";

                    return (
                      <div 
                        key={task.id} 
                        onClick={() => navigate(`/tasks/${task.id}`)}
                        className={cn("flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors", bgClass)}
                      >
                        <div className="mt-0.5">
                          {isDone ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-300 shrink-0" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pr-2">
                          <p className={cn("text-sm font-medium break-words leading-tight", isDone ? "text-gray-400 line-through" : "text-gray-900")}>
                            {task.title}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-1.5 font-medium">{formatIDR(task.expense || 0)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0 mt-0.5">
                          {task.avatar && <img src={task.avatar || undefined} alt="avatar" className="w-6 h-6 rounded-full border border-gray-200 object-cover" />}
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1 flex-wrap justify-end">
                              {task.dueDate && <span className="text-[9px] bg-white/85 px-1.5 py-0.5 rounded border border-gray-200 whitespace-nowrap text-gray-600 font-medium">{new Date(task.dueDate).toLocaleDateString('id-ID')}</span>}
                              {isDone ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap bg-emerald-50 text-emerald-600 border-emerald-100">
                                  Done @ {formatToMMDDYYYY(task.completeDate) || '-'}
                                </span>
                              ) : (
                                task.dueDate && (() => {
                                  const dueInfo = getDueDaysLeft(task.dueDate);
                                  return (
                                    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap", dueInfo.isOverdue ? "bg-red-50 text-red-600 border-red-100" : "bg-green-50 text-green-600 border-green-100")}>
                                      {dueInfo.days} {dueInfo.label}
                                    </span>
                                  );
                                })()
                              )}
                            </div>
                            {isDone && task.assignDate && task.completeDate && (
                              <span className="text-[9px] text-gray-400 font-mono tracking-tight whitespace-nowrap">
                                {getDuration(task.assignDate, task.completeDate)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Card 4: Action Buttons */}
        {(isNotStarted || isGoing || (isComplete && !isArchived) || isUpdatingStatus || isArchiving) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex gap-3">
            {isUpdatingStatus || isArchiving ? (
              <div className="flex-1 flex justify-center items-center py-2.5">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin mr-2" />
                <span className="text-sm font-semibold text-gray-500">
                  {isArchiving ? 'Mengarsipkan project...' : 'Memperbarui status...'}
                </span>
              </div>
            ) : (
              <>
                {isNotStarted && (
                  <button
                    onClick={() => handleUpdateStatus('On Going')}
                    className="flex-1 bg-blue-600 text-white rounded-xl py-3 font-semibold text-sm shadow-sm hover:bg-blue-700 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    START
                  </button>
                )}
                {isGoing && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus('Complete')}
                      className="flex-1 bg-green-600 text-white rounded-xl py-3 font-semibold text-sm shadow-sm hover:bg-green-700 active:scale-98 transition flex items-center justify-center cursor-pointer"
                    >
                      Complete
                    </button>
                    <button
                      onClick={() => handleUpdateStatus('Cancelled')}
                      className="flex-1 bg-red-50 text-red-600 border border-red-100 rounded-xl py-3 font-semibold text-sm shadow-sm hover:bg-red-100 active:scale-98 transition flex items-center justify-center cursor-pointer"
                    >
                      Cancelled
                    </button>
                  </>
                )}
                {isComplete && !isArchived && (
                  <button
                    onClick={handleArchiveProject}
                    className="flex-1 bg-[#429dbb] text-white rounded-xl py-3 font-bold text-sm shadow-sm hover:bg-[#327a92] active:scale-98 transition flex items-center justify-center cursor-pointer"
                  >
                    Archive
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* FAB Add Task */}
      <button 
        onClick={handleOpenAddTask}
        className="fixed bottom-20 right-5 w-14 h-14 bg-blue-600 rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center text-white hover:bg-blue-700 active:scale-95 transition-all z-20 cursor-pointer"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Slide Up Add Task (Popup Modal) */}
      <AnimatePresence>
        {showAddTask && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddTask(false)}
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
                <h3 className="font-bold text-gray-900 text-lg">Add New Task</h3>
                <button type="button" onClick={() => setShowAddTask(false)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmitTask} className="p-5 space-y-4 overflow-y-auto flex-1">


                {/* Task Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Task Name</label>
                  <input 
                    type="text" 
                    value={newTaskName}
                    onChange={e => setNewTaskName(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                    placeholder="Enter task name" 
                  />
                </div>

                {/* Task Instruction */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Task Instruction</label>
                  <textarea 
                    value={newTaskInstruction}
                    onChange={e => setNewTaskInstruction(e.target.value)}
                    rows={2}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none" 
                    placeholder="Enter task instructions" 
                  />
                </div>

                {/* Custom User Dropdown with Avatar */}
                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">User Assigner</label>
                  <button
                    type="button"
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="w-full flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {newTaskUser ? (
                      (() => {
                        const selectedUser = allUsers.find(u => u.email === newTaskUser);
                        const avatarUrl = selectedUser?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser?.name || newTaskUser)}&background=eff6ff&color=3b82f6`;
                        return (
                          <div className="flex items-center gap-2">
                            <img src={avatarUrl} alt="user avatar" className="w-6 h-6 rounded-full object-cover border border-gray-200" />
                            <span className="font-semibold text-gray-900">{selectedUser?.name || newTaskUser}</span>
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
                                  setNewTaskUser(u.email);
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

                {/* Due Date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Due Date</label>
                  <input 
                    type="date" 
                    value={newTaskDueDate}
                    onChange={e => setNewTaskDueDate(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                  />
                </div>

                {/* Task Priority (Inline low, med, high) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Task Priority</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['low', 'med', 'high'] as const).map((p) => {
                      const isActive = newTaskPriority === p;
                      const label = p.toUpperCase();
                      const activeStyles = {
                        low: 'bg-green-50 border-green-300 text-green-700 ring-2 ring-green-500/20',
                        med: 'bg-yellow-50 border-yellow-300 text-yellow-700 ring-2 ring-yellow-500/20',
                        high: 'bg-red-50 border-red-300 text-red-700 ring-2 ring-red-500/20',
                      }[p];
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setNewTaskPriority(p)}
                          className={cn(
                            "py-2 px-3 border border-gray-200 rounded-xl text-xs font-bold transition-all text-center focus:outline-none",
                            isActive ? activeStyles : "bg-white text-gray-500 hover:bg-gray-50"
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Calculated Points & Task Read, Reported (Hidden or read only label) */}
                <div className="bg-blue-50/50 rounded-xl border border-blue-100/55 p-3 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-semibold text-blue-700">Calculated Points</span>
                    <p className="text-[10px] text-gray-400 mt-0.5">Auto-updated based on priority</p>
                  </div>
                  <span className="text-sm font-extrabold text-blue-800 bg-blue-100 px-3 py-1 rounded-full shrink-0">
                    {calculatedPoints} pts
                  </span>
                </div>
                
                <input type="hidden" name="read" value="FALSE" />
                <input type="hidden" name="reported" value="FALSE" />
                
                <div className="pt-2 shrink-0">
                  <button 
                    type="submit"
                    disabled={isSavingTask}
                    className="w-full py-3 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSavingTask ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving Task...
                      </>
                    ) : 'Create Task'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {successToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-24 left-1/2 z-[150] bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 font-medium text-sm text-center"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Task berhasil ditambahkan!</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {errorToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-24 left-1/2 z-[150] bg-red-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 font-medium text-sm text-center"
          >
            <X className="w-4 h-4 shrink-0" />
            <span>{errorToast}</span>
          </motion.div>
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
