import React, { useState, useEffect } from 'react';
import { ArrowLeft, DollarSign, Calendar, Users, X, Plus, CheckCircle2, Circle, Loader2, Building, Folder, Clock, ChevronUp, ChevronDown, UserPlus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatImageUrl } from '../lib/utils';
import { getSheetData, appendSheetData } from '../lib/api';
import { triggerNotificationFeedback } from '../utils/feedback';
import { logActivity } from '../lib/activityLogger';

// Helper to compute next unique Subtask ID continuing the highest existing value (format SUB-xxxxxxxx e.g. SUB-90122238 -> SUB-90122239)
function computeNextSubtaskId(subResValues: any[][]): string {
  let maxNum = 0;

  if (subResValues && subResValues.length > 1) {
    const headers = subResValues[0] as string[];
    const idColIdx = headers.findIndex(h => {
      const norm = (h || '').trim().toUpperCase().replace(/[\s_-]+/g, '');
      return norm === 'SUBTASKID' || norm === 'ID' || norm === 'SUBTASK' || norm === 'IDTASK' || norm === 'ACTIVITYID';
    });

    for (let i = 1; i < subResValues.length; i++) {
      const row = subResValues[i];
      if (!row) continue;

      let candidateIds: string[] = [];
      if (idColIdx > -1 && row[idColIdx]) {
        candidateIds.push(String(row[idColIdx]).trim());
      } else {
        row.forEach(cell => {
          if (typeof cell === 'string' && (cell.toUpperCase().startsWith('SUB-') || cell.toUpperCase().startsWith('SUB') || cell.toUpperCase().startsWith('ST-'))) {
            candidateIds.push(cell.trim());
          }
        });
      }

      for (const rawId of candidateIds) {
        if (!rawId) continue;
        const match = rawId.match(/(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    }
  }

  const nextNum = maxNum > 0 ? maxNum + 1 : 90122239;
  const numStr = String(nextNum).padStart(8, '0');
  return `SUB-${numStr}`;
}

// Format currency
function formatIDR(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

function formatDateMMDDYY(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function formatToMMDDYYYY(dateStr: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;

  const ymdMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${month}/${day}/${year}`;
  }

  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return trimmed;
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

export function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [task, setTask] = useState<any>(null);
  const [expandActivities, setExpandActivities] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      triggerNotificationFeedback();
    }
  }, [toastMessage]);
  const [completingSubTaskId, setCompletingSubTaskId] = useState<string | null>(null);
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [isSettingDone, setIsSettingDone] = useState(false);
  const [isSavingSubtask, setIsSavingSubtask] = useState(false);
  const [users, setUsers] = useState<{ email: string, name: string, photo: string, id?: string }[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  
  // Meeting integration states
  const [isMeeting, setIsMeeting] = useState(false);
  const [meetingPlatform, setMeetingPlatform] = useState<'google' | 'discord' | 'zoom'>('google');
  const [meetingStartTime, setMeetingStartTime] = useState('09:00');
  const [meetingEndTime, setMeetingEndTime] = useState('10:00');
  const [meetingCustomLink, setMeetingCustomLink] = useState('https://meet.google.com');
  const [meetingGuests, setMeetingGuests] = useState<string[]>([]);
  const [guestInput, setGuestInput] = useState('');
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);

  const getGoogleCalendarLink = () => {
    if (!newSubtaskForm.dueDate) return '#';
    const dateClean = newSubtaskForm.dueDate.replace(/-/g, ''); // e.g., '20260712'
    const startClean = meetingStartTime.replace(/:/g, '') + '00'; // e.g., '090000'
    const endClean = meetingEndTime.replace(/:/g, '') + '00'; // e.g., '100000'
    
    const text = encodeURIComponent(newSubtaskForm.name || 'Activity Meeting');
    const detailsText = (newSubtaskForm.instruction ? newSubtaskForm.instruction + '\n\n' : '') +
      (meetingGuests.length > 0 ? `Daftar Tamu: ${meetingGuests.join(', ')}` : '');
    const details = encodeURIComponent(detailsText);
    const location = encodeURIComponent(meetingCustomLink || 'Google Meet');
    const addGuestsParam = meetingGuests.length > 0 ? `&add=${meetingGuests.map(g => encodeURIComponent(g)).join(',')}` : '';
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dateClean}T${startClean}/${dateClean}T${endClean}&details=${details}&location=${location}${addGuestsParam}`;
  };
  
  const [showAddSubtaskModal, setShowAddSubtaskModal] = useState(false);
  const [subtaskRawValues, setSubtaskRawValues] = useState<any[][]>([]);
  const [subtaskHeaders, setSubtaskHeaders] = useState<string[]>([]);
  const [newSubtaskForm, setNewSubtaskForm] = useState({
    id: '',
    name: '',
    instruction: '',
    task: '',
    unit: '',
    amount: '',
    assignDate: '',
    dueDate: '',
    user: '',
    status: '',
    completeDate: ''
  });

  const handleOpenAddSubtask = () => {
    const nextId = computeNextSubtaskId(subtaskRawValues);

    setIsMeeting(false);
    setMeetingPlatform('google');
    setMeetingStartTime('09:00');
    setMeetingEndTime('10:00');
    setMeetingCustomLink('https://meet.google.com');
    setMeetingGuests([]);
    setGuestInput('');
    setShowGuestDropdown(false);

    setNewSubtaskForm({
      id: nextId,
      name: '',
      instruction: '',
      task: task?.id || '',
      unit: task?.project?.unit?.id || '',
      amount: '',
      assignDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      user: localStorage.getItem('mtask_user_email') || task?.assignedTo?.email || '',
      status: 'ToDo',
      completeDate: ''
    });
    setShowAddSubtaskModal(true);
  };

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

        const userMap = new Map<string, { photo: string, name: string, id: string }>();
        const usersList: { email: string, name: string, photo: string, id: string }[] = [];
        if (userRes?.values?.length > 0) {
          const headers = userRes.values[0] as string[];
          const emailIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'EMAIL');
          const photoIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PHOTO' || h?.trim().toUpperCase() === 'AVATAR');
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'NAME');
          const idIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ID' || h?.trim().toUpperCase() === 'USER ID');
          if (emailIdx > -1) {
            userRes.values.slice(1).forEach((row: any[]) => {
              const email = row[emailIdx]?.trim();
              if (email) {
                const userId = idIdx > -1 && row[idIdx] ? String(row[idIdx]).trim() : '';
                const userInfo = {
                  photo: (photoIdx > -1 && row[photoIdx]) ? row[photoIdx] : `https://ui-avatars.com/api/?name=${encodeURIComponent(row[nameIdx] || email)}&background=eff6ff&color=3b82f6`,
                  name: (nameIdx > -1 && row[nameIdx]) ? row[nameIdx] : email.split('@')[0],
                  id: userId
                };
                userMap.set(email, userInfo);
                if (userId.toUpperCase() !== 'XXX') {
                  usersList.push({ email, ...userInfo });
                }
              }
            });
          }
        }
        setUsers(usersList);

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
                  id: uId,
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
                 let uInfo = { id: uId, name: uId || 'Unknown', logo: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=100&q=80', type: ''};
                 if (unitMap.has(uId)) {
                   uInfo = unitMap.get(uId);
                 }
                 projectMap.set(pId, {
                   id: pId,
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
          setSubtaskRawValues(subRes.values);
          const headers = subRes.values[0] as string[];
          setSubtaskHeaders(headers);
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
          const assignIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'TASK ASSIGN DATE' || h?.trim().toUpperCase() === 'ASSIGN DATE' || h?.trim().toUpperCase() === 'DATE ASSIGN' || h?.trim().toUpperCase() === 'TASK_ASSIGN_DATE');
          const completeIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'TASK COMPLETE DATE' || h?.trim().toUpperCase() === 'COMPLETE DATE' || h?.trim().toUpperCase() === 'TASK COMPLETE_DATE' || h?.trim().toUpperCase() === 'TASK COMPLETE DATE');
          
          if (taskIdIdx > -1) {
            const cleanId = id.trim().toLowerCase();
            const row = taskRes.values.slice(1).find((r: any[]) => {
              const rowTaskId = (r[taskIdIdx] || '').trim().toLowerCase();
              const rowTaskName = (taskNameIdx > -1 && r[taskNameIdx]) ? r[taskNameIdx].trim().toLowerCase() : '';
              return rowTaskId === cleanId || 
                     rowTaskId.replace(/[^a-z0-9]/g, '') === cleanId.replace(/[^a-z0-9]/g, '') ||
                     (rowTaskName && rowTaskName === cleanId);
            });
            if (row) {
              const actualTaskId = row[taskIdIdx]?.trim() || id;
              const pId = projIdIdx > -1 ? row[projIdIdx]?.trim() : '';
              const projInfo = projectMap.get(pId) || { id: pId, name: pId || 'Unknown Project', unit: { id: '', name: 'Unknown Unit', logo: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=100&q=80' } };
              
              const userEmail = userIdx > -1 ? row[userIdx]?.trim() : '';
              const userInfoFromMap = userMap.get(userEmail);
              const userInfo = userInfoFromMap ? { ...userInfoFromMap, email: userEmail } : { email: userEmail, name: userEmail || 'Unknown User', photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(userEmail || 'U')}&background=eff6ff&color=3b82f6` };

              setTask({
                id: actualTaskId,
                title: taskNameIdx > -1 ? row[taskNameIdx] : actualTaskId,
                instruction: instIdx > -1 ? row[instIdx] : '',
                status: statusIdx > -1 ? (row[statusIdx] || 'Unknown') : 'Unknown',
                priority: pioIdx > -1 ? (row[pioIdx] || 'Medium') : 'Medium',
                dueDate: dueIdx > -1 ? (row[dueIdx] || new Date().toISOString()) : new Date().toISOString(),
                project: projInfo,
                assignedTo: userInfo,
                totalSubtasks,
                completedSubtasks,
                expenses: totalExpenses,
                activities: subtaskList,
                assignDate: (assignIdx > -1 && row[assignIdx]) ? String(row[assignIdx]).trim() : '',
                completeDate: (completeIdx > -1 && row[completeIdx]) ? String(row[completeIdx]).trim() : ''
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

  const handleSaveSubtask = async () => {
    if (!newSubtaskForm.name || !newSubtaskForm.user || !newSubtaskForm.dueDate) {
      setToastMessage('Harap lengkapi SubTask Name, User, dan Due Date');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    let finalName = newSubtaskForm.name;
    let finalInstruction = newSubtaskForm.instruction;

    if (isMeeting) {
      if (!finalName.toUpperCase().includes('MEETING')) {
        finalName = `[Meeting] ${finalName}`;
      }
      const platformLabel = meetingPlatform === 'google' ? 'Google Calendar 📅' : meetingPlatform === 'discord' ? 'Discord Event 💬' : 'Zoom Meeting 📹';
      const linkToUse = meetingCustomLink || (meetingPlatform === 'zoom' ? 'https://zoom.us/j/1234567890' : meetingPlatform === 'discord' ? 'https://discord.gg/invite' : 'https://meet.google.com');
      const guestsStr = meetingGuests.length > 0 ? `\nTamu/Guests: ${meetingGuests.join(', ')}` : '';
      const meetingBlock = `\n\n--- DETAIL MEETING ---\nPlatform: ${platformLabel}\nWaktu: ${newSubtaskForm.dueDate} @ ${meetingStartTime} - ${meetingEndTime}${guestsStr}\nLink Join: ${linkToUse}\n-----------------------`;
      finalInstruction = finalInstruction ? `${finalInstruction}${meetingBlock}` : meetingBlock.trim();
    }

    try {
      setIsSavingSubtask(true);

      // Trigger direct Google Calendar event save/opening when Google Calendar platform is selected
      if (isMeeting && meetingPlatform === 'google') {
        try {
          const calUrl = getGoogleCalendarLink();
          if (calUrl && calUrl !== '#') {
            window.open(calUrl, '_blank');
          }
        } catch (calErr) {
          console.warn('Google Calendar auto sync warning:', calErr);
        }
      }

      // Calculate next unique ID continuing the highest existing value (format SUB-xxxxxxxx)
      const finalSubtaskId = newSubtaskForm.id && !newSubtaskForm.id.startsWith('ST-')
        ? newSubtaskForm.id
        : computeNextSubtaskId(subtaskRawValues);

      const taskIdToUse = task?.id || id || newSubtaskForm.task || '';
      const formattedAssignDate = formatToMMDDYYYY(newSubtaskForm.assignDate || new Date().toISOString().split('T')[0]);
      const formattedDueDate = formatToMMDDYYYY(newSubtaskForm.dueDate);
      const formattedCompleteDate = newSubtaskForm.completeDate ? formatToMMDDYYYY(newSubtaskForm.completeDate) : '';

      const findSubHeaderIndex = (headers: string[], names: string[]) => {
        return headers.findIndex(h => {
          const clean = (h || '').trim().toUpperCase().replace(/[\s_-]+/g, '');
          return names.some(n => clean === n.toUpperCase().replace(/[\s_-]+/g, ''));
        });
      };

      const headersToUse = subtaskHeaders.length > 0 ? subtaskHeaders : [];
      const newRow = new Array(headersToUse.length > 0 ? headersToUse.length : 12).fill('');

      const mappings = [
        { names: ['SUBTASK ID', 'ID', 'SUBTASK_ID', 'SUB TASK ID', 'ACTIVITY ID'], val: finalSubtaskId },
        { names: ['SUBTASK NAME', 'SUBTASK', 'TITLE', 'NAME', 'SUBTASK_NAME'], val: finalName },
        { names: ['SUBTASK INSTRUCTION', 'INSTRUCTION', 'TASK INSTRUCTION', 'SUBTASK_INSTRUCTION'], val: finalInstruction },
        { names: ['AMOUNT', 'EXPENSES', 'EXPENSE'], val: newSubtaskForm.amount },
        { names: ['SUBTASK DUE DATE', 'DUE DATE', 'DATE DUE'], val: formattedDueDate },
        { names: ['USER', 'EMAIL', 'ASSIGNED TO'], val: newSubtaskForm.user },
        { names: ['STATUS'], val: newSubtaskForm.status || 'ToDo' },
        { names: ['TASK ID', 'TASK_ID', 'ID TASK', 'ID_TASK'], val: taskIdToUse },
        { names: ['UNIT ID', 'UNIT', 'ID UNIT'], val: newSubtaskForm.unit || (task?.project?.unit?.id || '') },
        { names: ['SUBTASK ASSIGN DATE', 'ASSIGN DATE', 'DATE ASSIGN'], val: formattedAssignDate },
        { names: ['SUBTASK COMPLETE DATE', 'COMPLETE DATE'], val: formattedCompleteDate },
        { names: ['TASK', 'TASK NAME', 'TASK_NAME'], val: taskIdToUse }
      ];

      if (headersToUse.length > 0) {
        mappings.forEach(m => {
          const idx = findSubHeaderIndex(headersToUse, m.names);
          if (idx > -1) {
            newRow[idx] = m.val;
          }
        });
      } else {
        newRow[0] = finalSubtaskId;
        newRow[1] = finalName;
        newRow[2] = finalInstruction;
        newRow[3] = newSubtaskForm.amount;
        newRow[4] = formattedDueDate;
        newRow[5] = newSubtaskForm.user;
        newRow[6] = newSubtaskForm.status || 'ToDo';
        newRow[7] = taskIdToUse;
        newRow[8] = newSubtaskForm.unit || (task?.project?.unit?.id || '');
        newRow[9] = formattedAssignDate;
        newRow[10] = formattedCompleteDate;
        newRow[11] = taskIdToUse;
      }

      // Write exactly 1 row to Google Sheets
      try {
        await appendSheetData('Sub Task!A1:Z', [newRow]);
      } catch (appendErr) {
        console.warn('Direct appendSheetData to Sub Task failed, trying Subtask range:', appendErr);
        await appendSheetData('Subtask!A1:Z', [newRow]).catch(e => console.warn(e));
      }
      
      setSubtaskRawValues(prev => [...prev, newRow]);

      const userObj = users.find(u => u.email === newSubtaskForm.user) || { email: newSubtaskForm.user, name: newSubtaskForm.user, photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(newSubtaskForm.user)}&background=eff6ff&color=3b82f6` };
      
      const newActivity = {
        id: finalSubtaskId,
        title: finalName,
        instruction: finalInstruction,
        status: newSubtaskForm.status,
        user: userObj,
        expense: parseInt(newSubtaskForm.amount) || 0,
        dueDate: formattedDueDate
      };
      
      if (task) {
        setTask({
          ...task,
          totalSubtasks: task.totalSubtasks + 1,
          completedSubtasks: newSubtaskForm.status === 'Done' ? task.completedSubtasks + 1 : task.completedSubtasks,
          activities: [...task.activities, newActivity]
        });
      }

      const assignedUser = userObj?.name || (newSubtaskForm.user?.includes('@') ? newSubtaskForm.user.split('@')[0] : newSubtaskForm.user) || 'User';
      const currentUserEmail = localStorage.getItem('mtask_user_email') || '';
      const matchedCreator = users.find(u => u.email?.trim().toLowerCase() === currentUserEmail.trim().toLowerCase());
      const creatorName = matchedCreator?.name || localStorage.getItem("mtask_user_name") || (currentUserEmail.includes('@') ? currentUserEmail.split('@')[0] : currentUserEmail) || 'User';
      logActivity('subTask', 'subTask Detail', `${assignedUser} mendapat subtask "${finalName}" pada task "${task?.title || task?.name || ''}" dari ${creatorName}`);

      setToastMessage(isMeeting && meetingPlatform === 'google' ? 'Activity & Jadwal Google Calendar berhasil disimpan!' : 'Subtask berhasil ditambahkan!');
      setTimeout(() => setToastMessage(null), 3000);
      setShowAddSubtaskModal(false);
    } catch (error: any) {
      alert('Gagal menyimpan SubTask: ' + error.message);
    } finally {
      setIsSavingSubtask(false);
    }
  };

  const handleSubTaskDone = async (e: React.MouseEvent, subTaskId: string) => {
    e.stopPropagation();
    try {
      setCompletingSubTaskId(subTaskId);
      const payload = {
        action: "UPDATE_STATUS_DONE",
        sub_task_id: subTaskId
      };

      try {
        await fetch('https://script.google.com/macros/s/AKfycbxSGA6ad3nKy7Gfh_vrWuf4kP7xIBvzOIc9BTSqeJ9-eM8QxQRbmuUED0PEU3oDSz_R7A/exec', {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload)
        });
      } catch (fetchErr) {
        console.warn('Network or CORS error updating subtask status, proceeding with local fallback:', fetchErr);
      }

      setToastMessage('Status Berhasil Diperbarui ke Done');
      setTimeout(() => setToastMessage(null), 3000);

      // Update local state
      if (task) {
        const updatedActivities = task.activities.map((act: any) => 
          act.id === subTaskId ? { ...act, status: 'Done' } : act
        );
        const newCompleted = updatedActivities.filter((act: any) => 
          act.status === 'Done' || act.status === 'Selesai' || act.status === 'Complete'
        ).length;
        setTask({ ...task, activities: updatedActivities, completedSubtasks: newCompleted });

        const subtaskObj = task.activities.find((a: any) => a.id === subTaskId);
        const subtaskName = subtaskObj?.title || 'subtask';
        const completerName = localStorage.getItem("mtask_user_name") || "User";
        logActivity('subTask', 'subtask Detail', `${completerName} menyelesaikan subTask ${subtaskName} pada task "${task.name || task.title || ''}" [${task.id || id}]`);
      }
    } catch (err: any) {
      alert('Gagal menyelesaikan activity: ' + err.message);
    } finally {
      setCompletingSubTaskId(null);
    }
  };

  const handleSendReport = async () => {
    if (!id || !task) return;
    try {
      setIsSendingReport(true);
      try {
        await fetch('https://script.google.com/macros/s/AKfycbx-j6lV34wC8i7Xc23NA2xNT6orsaXyWoarCVWl_WE4LYOAdpuq-CZY5d5HiXELAU5qjA/exec', {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: JSON.stringify({
            action: 'TASK_SEND_REPORT',
            task_id: id
          })
        });
      } catch (fetchErr) {
        console.warn('Network or CORS error sending task report, proceeding with local fallback:', fetchErr);
      }
      setTask({ ...task, status: 'Review' });
      const reporterName = localStorage.getItem("mtask_user_name") || "User";
      logActivity('Task', 'Project Detail', `${reporterName} mengirim laporan task "${task.name || task.title || ''}" [${task.id || id}] pada project "${task.project?.name || ''}" | Review`);
      setToastMessage('Laporan tugas berhasil dikirim untuk di-review');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (error: any) {
      alert('Gagal memperbarui status: ' + error.message);
    } finally {
      setIsSendingReport(false);
    }
  };

  const handleTaskDone = async () => {
    if (!id || !task) return;
    try {
      setIsSettingDone(true);
      try {
        await fetch('https://script.google.com/macros/s/AKfycbx-j6lV34wC8i7Xc23NA2xNT6orsaXyWoarCVWl_WE4LYOAdpuq-CZY5d5HiXELAU5qjA/exec', {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: JSON.stringify({
            action: 'TASK_MARK_DONE',
            task_id: id
          })
        });
      } catch (fetchErr) {
        console.warn('Network or CORS error completing task, proceeding with local fallback:', fetchErr);
      }
      setTask({ ...task, status: 'Done' });
      const approverName = localStorage.getItem("mtask_user_name") || "User";
      logActivity('Task', 'Project Detail', `${approverName} menyetujui (Done) Task "${task.name || task.title || ''}" [${task.id || id}] pada project "${task.project?.name || ''}"`);
      setToastMessage('Tugas berhasil diselesaikan!');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (error: any) {
      alert('Gagal menyelesaikan task: ' + error.message);
    } finally {
      setIsSettingDone(false);
    }
  };

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
             {(() => {
               const isTaskDone = (task.status || '').trim().toUpperCase() === 'DONE' || (task.status || '').trim().toUpperCase() === 'COMPLETE' || (task.status || '').trim().toUpperCase() === 'SELESAI';
               if (isTaskDone) {
                 return (
                   <div className="flex flex-col">
                     <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 inline-block w-fit">
                       Done @ {formatToMMDDYYYY(task.completeDate)}
                     </span>
                     {task.assignDate && task.completeDate ? (
                       <span className="text-[10px] text-gray-500 mt-1 block font-mono">
                         {getDuration(task.assignDate, task.completeDate)}
                       </span>
                     ) : null}
                   </div>
                 );
               } else {
                 return (
                   <div className={cn("text-xs font-semibold inline-block px-2 py-0.5 rounded", dueInfo.isOverdue ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600")}>
                     {dueInfo.days} {dueInfo.label}
                   </div>
                 );
               }
             })()}
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
          <img src={formatImageUrl(task.assignedTo.photo) || undefined} alt="Assigned User" className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0" />
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
                   {task.activities.map((act: any, idx: number) => (
                      <div 
                        key={`${act.id}-${idx}`} 
                        className="flex flex-col p-3 bg-white rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => navigate(`/activities/${act.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <button 
                            className="p-1 rounded-full hover:bg-gray-100 transition-colors shrink-0 disabled:opacity-50"
                            onClick={(e) => act.status !== 'Done' ? handleSubTaskDone(e, act.id) : e.stopPropagation()}
                            disabled={completingSubTaskId === act.id}
                          >
                            {completingSubTaskId === act.id ? (
                              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                            ) : act.status === 'Done' ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-300" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-sm font-medium truncate", act.status === 'Done' ? "text-gray-500 line-through" : "text-gray-900")}>
                              {act.title}
                            </p>
                            {act.expense > 0 && (
                               <p className="text-[10px] text-gray-500 mt-0.5 font-medium">{formatIDR(act.expense)}</p>
                            )}
                          </div>
                          {act.user?.photo && (
                            <img src={formatImageUrl(act.user.photo) || undefined} alt={act.user.name} className="w-7 h-7 rounded-full ml-auto shrink-0 border border-gray-200 object-cover" />
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
        {!(task?.status?.toUpperCase() === 'DONE' || task?.status?.toUpperCase() === 'COMPLETE' || task?.status?.toUpperCase() === 'SELESAI') && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
            {task?.status !== 'Review' && (
              <button 
                onClick={handleSendReport}
                disabled={isSendingReport}
                className="flex-1 px-4 py-3 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all text-center shadow-sm border border-blue-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSendingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Send Report
              </button>
            )}
            {task?.status === 'Review' && (localStorage.getItem('mtask_user_email') || '').toLowerCase() === 'adi.grinder.9@gmail.com' && (
              <button 
                onClick={handleTaskDone}
                disabled={isSettingDone}
                className="flex-1 px-4 py-3 text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all text-center shadow-sm border border-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSettingDone ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Done
              </button>
            )}
          </div>
        )}

      </div>
      {/* FAB Add Activity */}
      {(task?.status || '').toLowerCase().replace(/\s/g, '') === 'todo' && 
       ((localStorage.getItem('mtask_user_email') || '').trim().toLowerCase() === 'adi.grinder.9@gmail.com' || 
        (task?.assignedTo?.email && (localStorage.getItem('mtask_user_email') || '').trim().toLowerCase() === task.assignedTo.email.toLowerCase())) && (
        <button 
          className="fixed bottom-24 right-5 w-14 h-14 bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30 border border-blue-500 z-40 group"
          onClick={handleOpenAddSubtask}
        >
          <Plus className="w-7 h-7 group-hover:rotate-90 transition-transform duration-300" strokeWidth={2.5} />
        </button>
      )}
      {/* Add Subtask Modal */}
      <AnimatePresence>
        {showAddSubtaskModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[90vh]"
            >
              <div className="p-4 border-b flex items-center justify-between shrink-0">
                <h3 className="text-lg font-bold text-gray-900">Add Activity</h3>
                <button onClick={() => setShowAddSubtaskModal(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-4 overflow-y-auto flex-1 space-y-4">
                {/* Managed fields hidden from UI: id, task, unit, assignDate, status, completeDate */}
                
                {/* Meeting Integration Panel */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 space-y-3.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="p-2 bg-blue-600/10 rounded-xl text-blue-600">
                        <Calendar className="w-4 h-4" />
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900">Integrasikan Jadwal Meeting?</h4>
                        <p className="text-[10px] text-gray-500">Buat jadwal di Google Calendar, Discord, atau Zoom</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMeeting(!isMeeting)}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                        isMeeting ? "bg-blue-600" : "bg-gray-200"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          isMeeting ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>

                  {isMeeting && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-3.5 pt-3.5 border-t border-blue-100/60 overflow-hidden"
                    >
                      {/* Platform Selection */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Pilih Platform Meeting</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'google', label: 'Google Cal 📅', color: 'hover:bg-blue-100/50 hover:border-blue-300' },
                            { id: 'discord', label: 'Discord 💬', color: 'hover:bg-indigo-100/50 hover:border-indigo-300' },
                            { id: 'zoom', label: 'Zoom 📹', color: 'hover:bg-sky-100/50 hover:border-sky-300' }
                          ].map((platform) => (
                            <button
                              key={platform.id}
                              type="button"
                              onClick={() => {
                                setMeetingPlatform(platform.id as any);
                                if (platform.id === 'zoom' && (meetingCustomLink === 'https://meet.google.com' || !meetingCustomLink)) {
                                  setMeetingCustomLink('https://zoom.us/j/1234567890');
                                } else if (platform.id === 'google' && (meetingCustomLink === 'https://zoom.us/j/1234567890' || !meetingCustomLink)) {
                                  setMeetingCustomLink('https://meet.google.com');
                                } else if (platform.id === 'discord' && !meetingCustomLink) {
                                  setMeetingCustomLink('https://discord.gg/invite');
                                }
                              }}
                              className={cn(
                                "py-2 px-1 text-center text-xs font-bold border rounded-lg transition-all focus:outline-none cursor-pointer",
                                meetingPlatform === platform.id
                                  ? "bg-white border-blue-600 text-blue-700 shadow-sm ring-1 ring-blue-600"
                                  : "bg-white/80 border-gray-200/80 text-gray-600 " + platform.color
                              )}
                            >
                              {platform.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Time Pickers */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Jam Mulai</label>
                          <input
                            type="time"
                            value={meetingStartTime}
                            onChange={(e) => setMeetingStartTime(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Jam Selesai</label>
                          <input
                            type="time"
                            value={meetingEndTime}
                            onChange={(e) => setMeetingEndTime(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                      </div>

                      {/* Custom Join Link input */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Link Meeting / Invitation Link</label>
                        <input
                          type="url"
                          value={meetingCustomLink}
                          onChange={(e) => setMeetingCustomLink(e.target.value)}
                          placeholder="e.g. https://zoom.us/j/... atau https://meet.google.com/..."
                          className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>

                      {/* Add Guest / Tamu Section */}
                      <div className="space-y-2 pt-1 border-t border-blue-100/60">
                        <div className="flex items-center justify-between">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            Add Guest / Undangan Meeting (Google Calendar)
                          </label>
                          <span className="text-[10px] text-gray-400 font-medium">
                            {meetingGuests.length} Tamu
                          </span>
                        </div>

                        {/* Selected Guest Chips */}
                        {meetingGuests.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 p-2 bg-white/80 rounded-xl border border-blue-100 max-h-24 overflow-y-auto">
                            {meetingGuests.map((guestEmail) => {
                              const matchedUser = users.find(u => u.email.toLowerCase() === guestEmail.toLowerCase());
                              const displayName = matchedUser?.name || guestEmail;
                              const avatarUrl = matchedUser?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=eff6ff&color=3b82f6`;

                              return (
                                <span
                                  key={guestEmail}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-full text-xs font-medium shadow-xs"
                                >
                                  <img src={avatarUrl} alt="avatar" className="w-4 h-4 rounded-full object-cover shrink-0" />
                                  <span className="truncate max-w-[130px]" title={guestEmail}>{displayName}</span>
                                  <button
                                    type="button"
                                    onClick={() => setMeetingGuests(prev => prev.filter(g => g !== guestEmail))}
                                    className="text-blue-400 hover:text-blue-700 p-0.5 rounded-full hover:bg-blue-100 transition-colors cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* Input field + Dropdown trigger */}
                        <div className="relative">
                          <div className="flex gap-1.5">
                            <div className="relative flex-1">
                              <input
                                type="email"
                                value={guestInput}
                                onChange={(e) => {
                                  setGuestInput(e.target.value);
                                  setShowGuestDropdown(true);
                                }}
                                onFocus={() => setShowGuestDropdown(true)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (guestInput.trim() && guestInput.includes('@')) {
                                      const emailToAdd = guestInput.trim().toLowerCase();
                                      if (!meetingGuests.includes(emailToAdd)) {
                                        setMeetingGuests(prev => [...prev, emailToAdd]);
                                      }
                                      setGuestInput('');
                                      setShowGuestDropdown(false);
                                    }
                                  }
                                }}
                                placeholder="Ketik email atau pilih dari daftar User..."
                                className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                              />
                              <UserPlus className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (guestInput.trim() && guestInput.includes('@')) {
                                  const emailToAdd = guestInput.trim().toLowerCase();
                                  if (!meetingGuests.includes(emailToAdd)) {
                                    setMeetingGuests(prev => [...prev, emailToAdd]);
                                  }
                                  setGuestInput('');
                                  setShowGuestDropdown(false);
                                } else {
                                  setShowGuestDropdown(!showGuestDropdown);
                                }
                              }}
                              className="px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Tambah</span>
                            </button>
                          </div>

                          {/* Dropdown User List */}
                          <AnimatePresence>
                            {showGuestDropdown && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setShowGuestDropdown(false)}
                                />
                                <motion.div
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 5 }}
                                  className="absolute left-0 right-0 top-full mt-1 max-h-48 bg-white border border-gray-200 rounded-xl shadow-xl overflow-y-auto z-20 divide-y divide-gray-50"
                                >
                                  <div className="p-1.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-[10px] text-gray-500 font-semibold px-3">
                                    <span>Pilih User dari Table User</span>
                                    <button
                                      type="button"
                                      onClick={() => setShowGuestDropdown(false)}
                                      className="text-gray-400 hover:text-gray-600"
                                    >
                                      Tutup
                                    </button>
                                  </div>
                                  {users
                                    .filter(u => {
                                      if (!guestInput.trim()) return true;
                                      const q = guestInput.trim().toLowerCase();
                                      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
                                    })
                                    .map((u) => {
                                      const isSelected = meetingGuests.includes(u.email.toLowerCase());
                                      const avatarUrl = u.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || u.email)}&background=eff6ff&color=3b82f6`;

                                      return (
                                        <button
                                          key={u.email}
                                          type="button"
                                          onClick={() => {
                                            const emailToAdd = u.email.toLowerCase();
                                            if (isSelected) {
                                              setMeetingGuests(prev => prev.filter(g => g !== emailToAdd));
                                            } else {
                                              setMeetingGuests(prev => [...prev, emailToAdd]);
                                            }
                                            setGuestInput('');
                                          }}
                                          className={cn(
                                            "w-full px-3 py-2 text-left flex items-center justify-between gap-2.5 hover:bg-blue-50/60 transition-colors cursor-pointer",
                                            isSelected && "bg-blue-50/80 font-semibold"
                                          )}
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            <img src={avatarUrl} alt="avatar" className="w-6 h-6 rounded-full object-cover border border-gray-200 shrink-0" />
                                            <div className="min-w-0">
                                              <p className="text-xs font-semibold text-gray-900 truncate">{u.name}</p>
                                              <p className="text-[10px] text-gray-500 truncate">{u.email}</p>
                                            </div>
                                          </div>
                                          {isSelected ? (
                                            <span className="text-xs text-blue-600 font-bold bg-blue-100 px-2 py-0.5 rounded-md">Dipilih</span>
                                          ) : (
                                            <Plus className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                          )}
                                        </button>
                                      );
                                    })}
                                  {users.length === 0 && (
                                    <div className="p-3 text-center text-xs text-gray-400">Tidak ada user terdaftar</div>
                                  )}
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Interactive Trigger Buttons */}
                      <div className="pt-2 flex flex-col gap-2">
                        {meetingPlatform === 'zoom' && (
                          <div className="flex gap-2">
                            <a
                              href="https://zoom.us/meeting/schedule"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 py-2 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                            >
                              📹 Buka Zoom Scheduler
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                const inviteText = `📅 ZOOM MEETING SCHEDULED\nTopic: ${newSubtaskForm.name || 'Activity'}\nTime: ${newSubtaskForm.dueDate || 'Hari ini'} @ ${meetingStartTime} - ${meetingEndTime}\nJoin Zoom: ${meetingCustomLink || 'https://zoom.us/j/1234567890'}`;
                                navigator.clipboard.writeText(inviteText);
                                alert('Undangan Zoom berhasil disalin ke clipboard!');
                              }}
                              className="px-3 bg-sky-50 hover:bg-sky-100 text-sky-700 py-2 rounded-lg text-xs font-bold border border-sky-200 transition-all cursor-pointer"
                            >
                              Salin Undangan
                            </button>
                          </div>
                        )}

                        {meetingPlatform === 'discord' && (
                          <div className="flex gap-2">
                            <a
                              href="https://discord.com/channels/@me"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 py-2 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                            >
                              💬 Buka Discord App
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                const inviteText = `**📅 DISCORD MEETING SCHEDULED**\n**Topic:** ${newSubtaskForm.name || 'Activity'}\n**Time:** ${newSubtaskForm.dueDate || 'Hari ini'} @ ${meetingStartTime} - ${meetingEndTime}\n**Platform:** Discord Voice/Stage Channel\n**Join Link:** ${meetingCustomLink || 'https://discord.gg/invite'}`;
                                navigator.clipboard.writeText(inviteText);
                                alert('Undangan Discord Markdown berhasil disalin!');
                              }}
                              className="px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 rounded-lg text-xs font-bold border border-indigo-200 transition-all cursor-pointer"
                            >
                              Salin Markdown
                            </button>
                          </div>
                        )}
                        <p className="text-[9px] text-gray-400 text-center italic">Undangan & detail jadwal akan otomatis ditambahkan ke Description aktivitas ini saat di-Save.</p>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Activity Name</label>
                  <input type="text" value={newSubtaskForm.name} onChange={e => setNewSubtaskForm({...newSubtaskForm, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Enter Activity Name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
                  <textarea value={newSubtaskForm.instruction} onChange={e => setNewSubtaskForm({...newSubtaskForm, instruction: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm min-h-[80px]" placeholder="Enter description..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Amount</label>
                    <input type="number" value={newSubtaskForm.amount} onChange={e => setNewSubtaskForm({...newSubtaskForm, amount: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Amount (e.g. 50000)" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Due Date</label>
                    <input type="date" value={newSubtaskForm.dueDate} onChange={e => setNewSubtaskForm({...newSubtaskForm, dueDate: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                  </div>
                </div>
                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">User</label>
                  <div
                    type="button"
                    onClick={() => !isSavingSubtask && setShowUserDropdown(!showUserDropdown)}
                    disabled={isSavingSubtask}
                    className="w-full flex items-center justify-between px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white outline-none text-sm text-left focus:border-blue-500 disabled:opacity-50 cursor-pointer"
                    role="button"
                    tabIndex={0}>
                    {newSubtaskForm.user ? (
                      (() => {
                        const selectedUser = users.find(u => u.email === newSubtaskForm.user);
                        const avatarUrl = selectedUser?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser?.name || newSubtaskForm.user)}&background=eff6ff&color=3b82f6`;
                        return (
                          <div className="flex items-center gap-2">
                            <img src={avatarUrl} alt="user avatar" className="w-6 h-6 rounded-full object-cover border border-gray-200" referrerPolicy="no-referrer" />
                            <span className="font-semibold text-gray-900">{selectedUser?.name || newSubtaskForm.user}</span>
                          </div>
                        );
                      })()
                    ) : (
                      <span className="text-gray-400">Select User...</span>
                    )}
                    <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                  </div>
                  
                  <AnimatePresence>
                    {showUserDropdown && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowUserDropdown(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute left-0 right-0 bottom-full mb-1 max-h-48 bg-white border border-gray-200 rounded-lg shadow-xl overflow-y-auto z-20 divide-y divide-gray-50"
                        >
                          {users.map((u, index) => {
                            const avatarUrl = u.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || u.email)}&background=eff6ff&color=3b82f6`;
                            return (
                              <div
                                key={`${u.email}-${index}`}
                                type="button"
                                onClick={() => {
                                  setNewSubtaskForm({ ...newSubtaskForm, user: u.email });
                                  setShowUserDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors focus:outline-none hover:bg-gray-50"
                                role="button"
                                tabIndex={0}>
                                <img src={avatarUrl} alt={u.name} className="w-7 h-7 rounded-full object-cover border border-gray-200 shrink-0" referrerPolicy="no-referrer" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-gray-900 truncate leading-tight">{u.name}</p>
                                  <p className="text-[10px] text-gray-400 truncate mt-0.5">{u.email}</p>
                                </div>
                              </div>
                            );
                          })}
                          {users.length === 0 && (
                            <div className="p-3 text-center text-xs text-gray-400">No users found</div>
                          )}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              
              <div className="p-4 border-t flex gap-3 shrink-0">
                <button 
                  onClick={() => setShowAddSubtaskModal(false)}
                  className="flex-1 px-4 py-2 font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveSubtask}
                  disabled={isSavingSubtask}
                  className="flex-1 px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  {isSavingSubtask ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-gray-800 text-white px-6 py-3 rounded-xl shadow-lg font-medium text-sm whitespace-nowrap"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
