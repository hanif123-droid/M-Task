import React, { useState, useEffect } from 'react';
import { ArrowLeft, Filter, Search, X, Plus, Loader2, Clock, FileText, MessageCircle, Check, ZoomIn, ZoomOut, Send, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatImageUrl } from '../lib/utils';
import { getSheetData, updateSheetData } from '../lib/api';
import { logActivity } from '../lib/activityLogger';

function getMediaUrl(urlStr: any): string {
  if (!urlStr) return "";
  const str = typeof urlStr === 'string' ? urlStr : (urlStr.url || urlStr.toString?.() || "");
  const trimmed = typeof str === 'string' ? str.trim() : "";
  if (!trimmed) return "";
  const gdRegex = /\/file\/d\/([a-zA-Z0-9_-]+)/;
  const match = trimmed.match(gdRegex);
  if (match && match[1]) {
    return `https://docs.google.com/uc?export=view&id=${match[1]}`;
  }
  const gdIdRegex = /[?&]id=([a-zA-Z0-9_-]+)/;
  const matchId = trimmed.match(gdIdRegex);
  if (matchId && matchId[1] && trimmed.includes("drive.google.com")) {
    return `https://docs.google.com/uc?export=view&id=${matchId[1]}`;
  }
  return trimmed;
}

function getDrivePreviewUrl(urlStr: any): string | null {
  if (!urlStr) return null;
  const str = typeof urlStr === 'string' ? urlStr : (urlStr.url || urlStr.toString?.() || "");
  const trimmed = typeof str === 'string' ? str.trim() : "";
  if (!trimmed) return null;
  const gdRegex = /\/file\/d\/([a-zA-Z0-9_-]+)/;
  const match = trimmed.match(gdRegex);
  if (match && match[1]) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  const gdIdRegex = /[?&]id=([a-zA-Z0-9_-]+)/;
  const matchId = trimmed.match(gdIdRegex);
  if (matchId && matchId[1] && trimmed.includes("drive.google.com")) {
    return `https://drive.google.com/file/d/${matchId[1]}/preview`;
  }
  return null;
}

function isVideoUrl(url: any): boolean {
  if (!url) return false;
  const str = typeof url === 'string' ? url : (url?.url || '');
  const clean = str.toLowerCase().split('?')[0];
  if (/\.(mp4|webm|ogg|mov|m4v|3gp|mkv)$/i.test(clean)) return true;
  if (str.includes('/video/') || str.includes('video/mp4') || str.includes('type=video')) return true;
  return false;
}

function parseMediaUrls(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.flatMap(item => parseMediaUrls(item));
  }
  const str = String(val).trim();
  if (!str) return [];

  if (str.startsWith('[') && str.endsWith(']')) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        return parsed.flatMap(item => parseMediaUrls(typeof item === 'string' ? item : item?.url || ''));
      }
    } catch (e) {}
  }

  const urlRegex = /(https?:\/\/[^\s,]+)/g;
  const matches = str.match(urlRegex);
  if (matches && matches.length > 0) {
    return matches.map(m => m.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  }

  return str.split(/[\s,\n\r]+/).map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
}

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
  
  const [selectedLghReport, setSelectedLghReport] = useState<any>(null);
  const [lghChatInput, setLghChatInput] = useState("");
  const [isLghUpdating, setIsLghUpdating] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  
  const [systemUsers, setSystemUsers] = useState<any[]>([]);

  const currentUserEmail = localStorage.getItem('mtask_user_email') || 'unknown';
  const isPrawinaActive = currentUserEmail.toLowerCase() === 'prawinaputu@gmail.com';

  const getSystemUserByEmail = (emailStr: string) => {
    if (!emailStr) {
      return {
        name: "User",
        avatar: `https://ui-avatars.com/api/?name=User&background=eff6ff&color=3b82f6`,
      };
    }
    const email = emailStr.trim().toLowerCase();
    const prefix = email.includes("@") ? email.split("@")[0] : email;

    const found = systemUsers.find((u) => {
      const uEmail = (u.email || "").trim().toLowerCase();
      const uPrefix = uEmail.includes("@") ? uEmail.split("@")[0] : uEmail;
      return (
        uEmail === email ||
        uPrefix === prefix ||
        (u.name && u.name.trim().toLowerCase() === email)
      );
    });

    if (found) {
      return {
        name: found.name || prefix,
        avatar: found.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(found.name || prefix)}&background=eff6ff&color=3b82f6`
      };
    }

    return {
      name: prefix,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(prefix)}&background=eff6ff&color=3b82f6`
    };
  };

  const handleLghChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lghChatInput.trim() || !selectedLghReport) return;
    
    setIsLghUpdating(true);
    try {
      const now = new Date();
      const timestamp = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      
      const newChat = {
        email: currentUserEmail,
        message: lghChatInput.trim(),
        timestamp
      };
      
      const currentChat = selectedLghReport.lghData.chat || [];
      const updatedChat = [...currentChat, newChat];
      const chatJson = JSON.stringify(updatedChat);
      
      await updateSheetData(`lgh daily report!F${selectedLghReport.lghData.rowIdx}`, [[chatJson]]);
      
      const updatedReport = { ...selectedLghReport };
      updatedReport.lghData.chat = updatedChat;
      setSelectedLghReport(updatedReport);
      
      setTasks((prev) =>
        prev.map((r) => (r.id === updatedReport.id ? updatedReport : r))
      );
      setLghChatInput("");
    } catch (err) {
      console.error(err);
      alert("Gagal mengirim pesan.");
    } finally {
      setIsLghUpdating(false);
    }
  };

  const handleLghDone = async () => {
    if (!selectedLghReport) return;
    setIsLghUpdating(true);
    try {
      await updateSheetData(`lgh daily report!E${selectedLghReport.lghData.rowIdx}`, [["Done"]]);
      const updatedReport = { ...selectedLghReport, status: "Done" };
      updatedReport.lghData.status = "Done";
      setSelectedLghReport(updatedReport);
      
      setTasks((prev) =>
        prev.map((r) => (r.id === updatedReport.id ? updatedReport : r))
      );

      // Write to newsfeed (Aktivitas)
      const userObj = getSystemUserByEmail(selectedLghReport.lghData?.email || selectedLghReport.userEmail);
      let userName = userObj?.name;
      if (!userName || userName === "User" || userName.includes("@")) {
        const currentObj = getSystemUserByEmail(currentUserEmail);
        userName = currentObj?.name;
      }
      if (!userName || userName === "User" || userName.includes("@")) {
        const emailToUse = selectedLghReport.lghData?.email || selectedLghReport.userEmail || currentUserEmail || "";
        const prefix = emailToUse.includes("@") ? emailToUse.split("@")[0] : emailToUse;
        if (prefix.toLowerCase().includes("putu") || prefix.toLowerCase().includes("prawina")) {
          userName = "Putu";
        } else if (prefix.toLowerCase().includes("hanif") || prefix.toLowerCase().includes("abdhan")) {
          userName = "Hanif";
        } else if (prefix) {
          userName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
        } else {
          userName = "User";
        }
      }

      const areaKolomB = selectedLghReport.lghData?.area || selectedLghReport.title?.replace(/^LGH Report:\s*/i, '') || "";

      await logActivity(
        "Status Update",
        "LGH Daily Report",
        `Request cleaning "${areaKolomB}" | ${userName} | Done`
      );
    } catch (err) {
      console.error(err);
      alert("Gagal merubah status.");
    } finally {
      setIsLghUpdating(false);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const [unitRes, projRes, taskRes, userRes, subtaskRes1, subtaskRes2] = await Promise.all([
          getSheetData('Unit!A1:Z500').catch(() => null),
          getSheetData('Project!A1:Z1000').catch(() => null),
          getSheetData('Task!A1:Z2000').catch(() => null),
          getSheetData('User!A1:Z500').catch(() => null),
          getSheetData('Subtask!A1:Z3000').catch(() => null),
          getSheetData('Sub Task!A1:Z3000').catch(() => null)
        ]);

        const userMap = new Map<string, {name: string, photo: string}>();
        const usersList: any[] = [];
        if (userRes?.values?.length > 0) {
          const headers = userRes.values[0] as string[];
          const emailIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'EMAIL');
          const nameIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'NAME');
          const photoIdx = headers.findIndex((h: string) => h?.trim().toUpperCase() === 'PHOTO' || h?.trim().toUpperCase() === 'AVATAR');
          if (emailIdx > -1) {
            userRes.values.slice(1).forEach((row: any[]) => {
              const email = row[emailIdx]?.trim();
              if (email) {
                const name = (nameIdx > -1 && row[nameIdx]) ? row[nameIdx] : email.split('@')[0];
                const photo = (photoIdx > -1 && row[photoIdx]) ? row[photoIdx] : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=eff6ff&color=3b82f6`;
                userMap.set(email, { name, photo });
                usersList.push({ email, name, photo });
              }
            });
          }
        }
        setSystemUsers(usersList);

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

        const projMap = new Map<string, {name: string, unitId: string, status: string}>();
        const hiddenProjectIds = new Set<string>();

        if (projRes?.values?.length > 0) {
          const headers = projRes.values[0] as string[];
          const idIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PROJECT ID');
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PROJECT NAME');
          const statusIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'STATUS' || h?.trim().toUpperCase() === 'PROJECT STATUS');
          const possibleUnitIdx = headers.findIndex(h => {
             const key = h?.trim().toUpperCase();
             return key === 'UNIT' || key === 'UNIT ID' || key === 'ID UNIT' || key === 'UNIT_ID';
          });
          if (idIdx > -1) {
            projRes.values.slice(1).forEach((row: any[]) => {
              const id = row[idIdx]?.trim() || '';
              if (id) {
                const rawStatus = statusIdx > -1 ? (row[statusIdx] || '').trim() : '';
                const normStatus = rawStatus.toLowerCase().replace(/[\s_-]+/g, '');
                const isNotStarted = normStatus === 'notstarted' || rawStatus.toLowerCase() === 'not started' || normStatus === 'canceled' || normStatus === 'cancelled' || normStatus === 'cancel';
                if (isNotStarted) {
                  hiddenProjectIds.add(id);
                }
                projMap.set(id, {
                  name: nameIdx > -1 ? (row[nameIdx] || id) : id,
                  unitId: possibleUnitIdx > -1 ? row[possibleUnitIdx]?.trim() : '',
                  status: rawStatus
                });
              }
            });
          }
        }

        let fetchedTasks: any[] = [];
        const taskLookupMap = new Map<string, string>();
        const hiddenTaskIds = new Set<string>();

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
            fetchedTasks = taskRes.values.slice(1).map((row: any[]) => {
              const id = row[taskIdIdx]?.trim() || '';
              const pId = projIdIdx > -1 ? row[projIdIdx]?.trim() : '';
              const uEmail = userIdx > -1 ? row[userIdx]?.trim() : '';
              const title = taskNameIdx > -1 ? (row[taskNameIdx] || 'No Title') : 'No Title';
              
              if (id && title) taskLookupMap.set(id, title);

              // Hide task if parent project status is Not Started or Canceled
              if (pId && hiddenProjectIds.has(pId)) {
                if (id) hiddenTaskIds.add(id);
                return null;
              }
              
              const projInfo = projMap.get(pId) || { name: 'Unknown Project', unitId: '', status: '' };
              const unitName = unitMap.has(projInfo.unitId) ? unitMap.get(projInfo.unitId) : (projInfo.unitId || 'Unknown Unit');
              const userInfo = userMap.get(uEmail) || { name: uEmail || 'Unknown User', photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(uEmail || 'U')}&background=eff6ff&color=3b82f6` };

              return {
                id,
                title,
                project: projInfo.name,
                unit: unitName,
                status: statusIdx > -1 ? (row[statusIdx] || 'Unknown') : 'Unknown',
                priority: pioIdx > -1 ? (row[pioIdx] || 'Normal') : 'Normal',
                dueDate: dueIdx > -1 ? (row[dueIdx] || '') : '',
                userName: userInfo.name,
                userPhoto: userInfo.photo,
                userEmail: uEmail,
                assignDate: (assignIdx > -1 && row[assignIdx]) ? String(row[assignIdx]).trim() : '',
                completeDate: (completeIdx > -1 && row[completeIdx]) ? String(row[completeIdx]).trim() : '',
                isSubtask: false
              };
            }).filter((t: any) => t && t.id);
          }
        }

        // Process Subtasks from both potential sheet names
        const subtasks: any[] = [];
        const processSubRes = (res: any) => {
          if (res?.values?.length > 1) {
            const sHeaders = res.values[0] as string[];
            const sIdIdx = sHeaders.findIndex(h => h?.trim().toUpperCase() === 'SUBTASK ID' || h?.trim().toUpperCase() === 'ID');
            const sTitleIdx = sHeaders.findIndex(h => h?.trim().toUpperCase() === 'TITLE' || h?.trim().toUpperCase() === 'SUBTASK NAME');
            const sParentIdIdx = sHeaders.findIndex(h => h?.trim().toUpperCase() === 'TASK ID' || h?.trim().toUpperCase() === 'TASK_ID');
            const sUserIdx = sHeaders.findIndex(h => h?.trim().toUpperCase() === 'USER' || h?.trim().toUpperCase() === 'EMAIL');
            const sStatusIdx = sHeaders.findIndex(h => h?.trim().toUpperCase() === 'STATUS');
            const sDueIdx = sHeaders.findIndex(h => h?.trim().toUpperCase() === 'DUE DATE' || h?.trim().toUpperCase() === 'SUBTASK DUE DATE');
            const sPioIdx = sHeaders.findIndex(h => h?.trim().toUpperCase() === 'PRIORITY');
            
            // New columns requested
            const sTaskNameIdx = sHeaders.findIndex(h => h?.trim().toUpperCase() === 'TASK');
            const sUnitIdx = sHeaders.findIndex(h => h?.trim().toUpperCase() === 'UNIT');
            const sAssignDateIdx = sHeaders.findIndex(h => h?.trim().toUpperCase() === 'SUBTASK ASSIGN DATE');
            const sCompleteDateIdx = sHeaders.findIndex(h => h?.trim().toUpperCase() === 'SUBTASK COMPLETE DATE' || h?.trim().toUpperCase() === 'COMPLETE DATE' || h?.trim().toUpperCase() === 'SUBTASK COMPLETED DATE' || h?.trim().toUpperCase() === 'COMPLETED DATE');

            if (sIdIdx > -1) {
              res.values.slice(1).forEach((row: any[]) => {
                const sId = row[sIdIdx]?.trim() || '';
                if (!sId) return;

                const parentId = sParentIdIdx > -1 ? row[sParentIdIdx]?.trim() : '';
                const taskKey = sTaskNameIdx > -1 ? row[sTaskNameIdx]?.trim() : '';

                // Hide subtask if its parent task belongs to a Not Started project
                if ((parentId && hiddenTaskIds.has(parentId)) || (taskKey && hiddenTaskIds.has(taskKey))) {
                  return;
                }

                const sEmail = sUserIdx > -1 ? row[sUserIdx]?.trim() : '';
                
                // Find parent task for context if needed (fallback)
                const parentTask = fetchedTasks.find(t => t.id === parentId || t.id === taskKey);
                const userInfo = userMap.get(sEmail) || { name: sEmail || 'Unknown User', photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(sEmail || 'U')}&background=eff6ff&color=3b82f6` };

                // Get Unit Name
                const unitId = sUnitIdx > -1 ? row[sUnitIdx]?.trim() : '';
                const unitName = unitMap.get(unitId) || unitId || parentTask?.unit || 'Unknown Unit';

                // Get Task Name - use the Task key from column "Task" to lookup from taskLookupMap
                const taskName = taskLookupMap.get(taskKey) || taskLookupMap.get(parentId) || parentTask?.title || 'Unknown Task';

                // Get Date
                const dueDateVal = sDueIdx > -1 ? row[sDueIdx]?.trim() : '';
                const assignDate = sAssignDateIdx > -1 ? row[sAssignDateIdx]?.trim() : '';
                const completeDate = sCompleteDateIdx > -1 ? row[sCompleteDateIdx]?.trim() : '';

                subtasks.push({
                  id: sId,
                  title: sTitleIdx > -1 ? (row[sTitleIdx] || 'No Title') : 'No Title',
                  project: taskName, // "Project" field will show the Task Name for subtasks
                  unit: unitName,
                  status: sStatusIdx > -1 ? (row[sStatusIdx] || 'Unknown') : 'Unknown',
                  priority: sPioIdx > -1 ? (row[sPioIdx] || 'Normal') : 'Normal',
                  dueDate: dueDateVal, // Use due date for the indicator as requested
                  userName: userInfo.name,
                  userPhoto: userInfo.photo,
                  userEmail: sEmail,
                  assignDate: assignDate,
                  completeDate: completeDate,
                  isSubtask: true,
                  parentId
                });
              });
            }
          }
        };

        processSubRes(subtaskRes1);
        processSubRes(subtaskRes2);

        let lghReports: any[] = [];
        const userEmail = localStorage.getItem('mtask_user_email');
        const isPrawina = userEmail && userEmail.toLowerCase() === 'prawinaputu@gmail.com';

        if (isPrawina) {
          try {
            const lghRes = await getSheetData("lgh daily report!A1:Z500").catch(() => null);
            if (lghRes?.values?.length > 1) {
              const headerRow = (lghRes.values[0] || []).map((h: any) => String(h || '').trim());
              const findHeaderIdx = (...names: string[]) => {
                return headerRow.findIndex((h: string) => {
                  const hLower = h.toLowerCase();
                  return names.some(n => hLower === n.toLowerCase() || hLower.includes(n.toLowerCase()));
                });
              };

              const mediaHeaderIdx = findHeaderIdx('media', 'foto', 'video', 'lampiran', 'file', 'image', 'bukti');
              const idHeaderIdx = findHeaderIdx('id');
              const areaHeaderIdx = findHeaderIdx('area', 'deskripsi');
              const timeHeaderIdx = findHeaderIdx('tanggal', 'timestamp', 'waktu', 'date');
              const userHeaderIdx = findHeaderIdx('user', 'email', 'pelapor', 'oleh');
              const statusHeaderIdx = findHeaderIdx('status');
              const descHeaderIdx = findHeaderIdx('keterangan', 'chat', 'catatan');

              const rows = lghRes.values.slice(1);
              lghReports = rows.map((row: any[], index: number) => {
                const idVal = (idHeaderIdx > -1 ? row[idHeaderIdx] : row[0]) || `lgh-${index}`;
                const areaVal = (areaHeaderIdx > -1 ? row[areaHeaderIdx] : row[1]) || '';
                const timeVal = (timeHeaderIdx > -1 ? row[timeHeaderIdx] : row[2]) || '';
                const uEmail = (userHeaderIdx > -1 ? row[userHeaderIdx] : row[3]) || '';
                const status = (statusHeaderIdx > -1 ? row[statusHeaderIdx] : row[4]) || 'Process';
                
                let chat = [];
                let description = (descHeaderIdx > -1 ? row[descHeaderIdx] : row[5]) || '';
                try {
                  if (description.trim().startsWith('[') && description.trim().endsWith(']')) {
                    chat = JSON.parse(description);
                    description = '';
                  }
                } catch(e) {}

                // Extract Media from Media column (or fallback to column H / G)
                let mediaRaw = '';
                if (mediaHeaderIdx > -1) {
                  mediaRaw = row[mediaHeaderIdx] || '';
                } else if (row[7] && String(row[7]).includes('http')) {
                  mediaRaw = row[7];
                } else if (row[6] && String(row[6]).includes('http')) {
                  mediaRaw = row[6];
                }

                const files = parseMediaUrls(mediaRaw);

                const uInfo = userMap.get(uEmail.toLowerCase()) || { 
                  name: uEmail.split('@')[0] || 'Unknown User', 
                  photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(uEmail || 'U')}&background=eff6ff&color=3b82f6` 
                };
                const lghUnitName = unitMap.get('UNT19') || 'Lovissa Guest House';

                return {
                  id: idVal,
                  title: `LGH Report: ${areaVal}`, // Area
                  project: 'Lovissa Guest House',
                  unit: lghUnitName,
                  status: status, // Process or Review
                  priority: 'Medium',
                  dueDate: timeVal, // Timestamp
                  userName: uInfo.name, // Email/Oleh
                  userPhoto: uInfo.photo,
                  userEmail: uEmail,
                  assignDate: timeVal,
                  completeDate: '',
                  isSubtask: false,
                  isLghReport: true,
                  columnH: row[7] || '',
                  lghData: {
                    rowIdx: index + 2,
                    area: areaVal,
                    timestamp: timeVal,
                    description: description,
                    email: uEmail,
                    id: idVal,
                    status: status,
                    columnG: row[6] || '',
                    columnH: row[7] || '',
                    mediaRaw: mediaRaw,
                    chat: chat,
                    files: files
                  }
                };
              });
            }
          } catch (e) {
            console.error('Failed to fetch LGH reports for MyTask', e);
          }
        }

        setTasks([...fetchedTasks, ...subtasks, ...lghReports]);
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
    const userEmail = localStorage.getItem('mtask_user_email');
    
    // Exception for LGH reports: they are always visible if they reach here (since we only fetch them for prawina)
    if (t.isLghReport) {
      // Just apply inline filters for LGH reports
    } else {
      const isActiveUserTask = t.userEmail && userEmail 
        ? t.userEmail.toLowerCase() === userEmail.toLowerCase() 
        : false;
        
      if (!isActiveUserTask) return false;
    }

    // Inline Filter Logic
    // Adjust based on typical status values or literal matching
    const s = (t.status || '').toLowerCase().trim();
    let matchesInline = false;
    
    if (inlineFilter === 'To Do') {
      // "To Do" includes literal "to do", "not started", "belum mulai", and "on going"
      matchesInline = s === 'to do' || s.includes('not started') || s.includes('belum mulai') || s.includes('on going') || s.includes('ongoing');
    } else if (inlineFilter === 'Review') {
      matchesInline = s === 'review' || s.includes('review') || s.includes('menunggu');
    } else if (inlineFilter === 'Done') {
      matchesInline = s === 'done' || s.includes('complete') || s.includes('selesai');
    }

    return matchesInline;
  });

  const getStatusPriority = (status?: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s.includes('not started') || s.includes('belum mulai')) return 1;
    if (s.includes('on going') || s.includes('ongoing')) return 2;
    if (s.includes('complete') || s.includes('done') || s.includes('selesai')) return 3;
    if (s.includes('cancel') || s.includes('batal')) return 4;
    return 5;
  };

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    return getStatusPriority(a.status) - getStatusPriority(b.status);
  });

  if (selectedLghReport) {
    return (
      <div className="pb-24 bg-gray-50 min-h-screen relative font-sans">
        <header className="bg-[#429dbb] text-white px-5 py-4 shadow-md sticky top-0 z-50 w-full mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedLghReport(null)}
              className="p-1.5 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold tracking-tight drop-shadow-sm leading-tight flex items-center gap-2">
                Detail Laporan LGH
              </h1>
              <p className="text-xs text-white/80 font-normal">#{selectedLghReport.id}</p>
            </div>
          </div>
        </header>

        <div className="px-4 max-w-4xl mx-auto space-y-4">
          {/* Card Info Utama (Kotak 1) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 space-y-4">
            <div className="flex justify-between items-start border-b border-gray-100 pb-3.5">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Status</p>
                <span
                  className={cn(
                    "px-3 py-1 text-xs font-bold rounded-full inline-block",
                    selectedLghReport.status === "Done"
                      ? "bg-green-100 text-green-700"
                      : "bg-orange-100 text-orange-700"
                  )}
                >
                  {selectedLghReport.status}
                </span>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tanggal</p>
                <div className="flex items-center justify-end gap-1.5 text-xs font-semibold text-gray-800">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  {selectedLghReport.lghData.timestamp}
                </div>
              </div>
            </div>

            {/* Area Laporan */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Area Laporan</p>
              <p className="text-sm font-bold text-gray-900">{selectedLghReport.lghData.area || selectedLghReport.title}</p>
            </div>

            {/* Pelapor */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Pelapor</p>
              <div className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <img 
                  src={selectedLghReport.userPhoto} 
                  alt={selectedLghReport.userName} 
                  className="w-9 h-9 rounded-full object-cover border border-gray-200 shadow-xs" 
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 leading-tight truncate">{selectedLghReport.userName}</p>
                  <p className="text-[11px] text-gray-400 font-normal truncate">{selectedLghReport.userEmail}</p>
                </div>
              </div>
            </div>

            {/* Deskripsi */}
            {selectedLghReport.lghData.description && selectedLghReport.lghData.description !== 'Tidak ada deskripsi tambahan.' && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Deskripsi Laporan</p>
                <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-normal">{selectedLghReport.lghData.description}</p>
                </div>
              </div>
            )}

            {/* Lampiran */}
            {selectedLghReport.lghData.files && selectedLghReport.lghData.files.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Lampiran ({selectedLghReport.lghData.files.length})</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {selectedLghReport.lghData.files.map((file: any, idx: number) => {
                    const fileStr = typeof file === 'string' ? file : (file?.url || '');
                    const isVideo = isVideoUrl(fileStr);
                    const formattedUrl = getMediaUrl(fileStr);
                    return (
                      <div 
                        key={idx} 
                        onClick={() => {
                          setZoomedImage(fileStr);
                        }}
                        className="aspect-square bg-gray-900/5 rounded-xl border border-gray-200 overflow-hidden cursor-zoom-in relative group"
                      >
                        {isVideo ? (
                          <div className="w-full h-full relative flex items-center justify-center bg-gray-900">
                            <video 
                              src={formattedUrl} 
                              className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity" 
                              preload="metadata"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/35 transition-colors">
                              <div className="w-9 h-9 rounded-full bg-white/90 text-gray-900 flex items-center justify-center shadow-md transform group-hover:scale-110 transition-transform">
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <img 
                            src={formattedUrl} 
                            alt={`Lampiran ${idx + 1}`} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" 
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://placehold.co/400x400?text=Media+${idx + 1}`;
                            }}
                          />
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 flex items-center justify-center transition-colors pointer-events-none">
                          <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Box Diskusi Laporan */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <p className="text-xs font-bold text-gray-800 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-indigo-500" />
                Diskusi Laporan
              </p>
              <span className="text-xs text-gray-400 font-medium">
                {(selectedLghReport.lghData.chat || []).length} pesan
              </span>
            </div>
            
            <div className="h-[360px] overflow-y-auto p-4 space-y-3.5 custom-scrollbar bg-white">
              {selectedLghReport.lghData.chat && selectedLghReport.lghData.chat.length > 0 ? (
                selectedLghReport.lghData.chat.map((msg: any, idx: number) => {
                  const isMe = msg.email === currentUserEmail;
                  const msgUser = getSystemUserByEmail(msg.email);
                  const senderName = isMe ? "Anda" : (msgUser?.name || msg.email);
                  return (
                    <div key={idx} className={cn("flex flex-col max-w-[85%] sm:max-w-[75%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                      <div className={cn(
                        "px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                        isMe ? "bg-indigo-600 text-white rounded-tr-xs" : "bg-gray-100 text-gray-800 rounded-tl-xs"
                      )}>
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                      </div>
                      <span className="text-[9px] text-gray-400 mt-1 font-medium px-1 flex items-center gap-1">
                        {senderName} • {msg.timestamp}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-2">
                  <MessageCircle className="w-8 h-8 opacity-20" />
                  <p className="text-xs font-medium">Belum ada diskusi untuk laporan ini.</p>
                </div>
              )}
            </div>
            
            <form onSubmit={handleLghChatSubmit} className="p-3 border-t border-gray-100 bg-gray-50 flex items-center gap-2">
              <input
                type="text"
                placeholder="Ketik pesan balasan..."
                value={lghChatInput}
                onChange={(e) => setLghChatInput(e.target.value)}
                className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                disabled={isLghUpdating}
              />
              <button
                type="submit"
                disabled={isLghUpdating || !lghChatInput.trim()}
                className="w-10 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center disabled:opacity-50 transition-colors shadow-sm cursor-pointer shrink-0"
              >
                {isLghUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
              </button>
            </form>
          </div>

          {/* Button Tandai Selesai */}
          {selectedLghReport.status !== "Done" && !isPrawinaActive && (
            <div className="pt-2">
              <button
                onClick={handleLghDone}
                disabled={isLghUpdating}
                className="w-full py-3.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                {isLghUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Tandai Selesai (Done)
              </button>
            </div>
          )}
        </div>

        {/* Zoomed Image popup modal */}
        <AnimatePresence>
          {zoomedImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setZoomedImage(null)}
              className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center cursor-zoom-out"
            >
              <div className="absolute top-4 right-4 flex gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomedImage(null);
                  }}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-sm transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {(() => {
                const drivePreviewUrl = getDrivePreviewUrl(zoomedImage);
                if (drivePreviewUrl) {
                  return (
                    <iframe
                      src={drivePreviewUrl}
                      className="w-[90vw] h-[85vh] rounded-xl shadow-2xl bg-black"
                      allow="autoplay"
                    />
                  );
                }
                if (zoomedImage.match(/\.(mp4|webm|ogg|mov)$/i)) {
                  return (
                    <video 
                      src={zoomedImage} 
                      controls 
                      autoPlay
                      className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl ring-1 ring-white/20"
                      onClick={(e) => e.stopPropagation()}
                    />
                  );
                }
                return (
                  <img 
                    src={zoomedImage} 
                    alt="Zoomed" 
                    className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl ring-1 ring-white/20" 
                  />
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

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
        {!isLoading && sortedTasks.map((task, idx) => {
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
              key={`${task.id}-${idx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => {
                if (task.isLghReport) {
                  const statusUpper = (task.status || '').trim().toUpperCase();
                  if (statusUpper === "REVIEW" || statusUpper === "DONE") {
                    setSelectedLghReport(task);
                  } else {
                    navigate("/lgh-daily-report", {
                      state: {
                        rowIdx: task.lghData.rowIdx,
                        area: task.lghData.area,
                        timestamp: task.lghData.timestamp,
                        description: task.lghData.description,
                        email: task.lghData.email,
                        id: task.lghData.id,
                        isFromNotification: true,
                      },
                    });
                  }
                } else if (task.isSubtask) {
                  navigate(`/activities/${task.id}`);
                } else {
                  navigate(`/tasks/${task.id}`);
                }
              }}
              className={cn("rounded-xl shadow-sm border p-4 cursor-pointer active:scale-[0.98] transition-transform", cardBg)}
            >
              <div className="flex justify-between items-start mb-2 gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 leading-tight truncate">{task.title}</h3>
                    {task.isSubtask && (
                      <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 border border-blue-100">
                        Subtask
                      </span>
                    )}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {!task.isLghReport && (
                      <p 
                        className={cn(
                          "text-xs text-gray-600 truncate transition-colors",
                          task.isSubtask && "hover:text-blue-600 active:text-blue-800"
                        )}
                        onClick={(e) => {
                          if (task.isSubtask && task.parentId) {
                            e.stopPropagation();
                            navigate(`/tasks/${task.parentId}`);
                          }
                        }}
                      >
                        <span className="text-gray-400 font-medium">{task.isSubtask ? "Task:" : "Project:"}</span> {task.project}
                      </p>
                    )}
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
                  {!task.isLghReport && (
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap", pioClass)}>
                      {task.priority || 'Normal'}
                    </span>
                  )}
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

      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomedImage(null)}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center cursor-zoom-out"
          >
            <div className="absolute top-4 right-4 flex gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomedImage(null);
                }}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-sm transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {(() => {
              const drivePreviewUrl = getDrivePreviewUrl(zoomedImage);
              if (drivePreviewUrl) {
                return (
                  <iframe
                    src={drivePreviewUrl}
                    className="w-[90vw] h-[85vh] rounded-xl shadow-2xl bg-black"
                    allow="autoplay"
                  />
                );
              }
              if (isVideoUrl(zoomedImage)) {
                return (
                  <video 
                    src={getMediaUrl(zoomedImage)} 
                    controls 
                    autoPlay
                    className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl ring-1 ring-white/20"
                    onClick={(e) => e.stopPropagation()}
                  />
                );
              }
              return (
                <img
                  src={getMediaUrl(zoomedImage)}
                  alt="Zoomed"
                  className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl ring-1 ring-white/20"
                  referrerPolicy="no-referrer"
                  onClick={(e) => e.stopPropagation()}
                />
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

