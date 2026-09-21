import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Calendar, User as UserIcon, FileText, 
  MapPin, Loader2, Image as ImageIcon, Send, X, Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatImageUrl } from '../lib/utils';
import { getSheetData, updateSheetData } from '../lib/api';
import { logActivity } from '../lib/activityLogger';

function colLetter(index: number) {
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export function IssueDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [sheetName, setSheetName] = useState('ISSUE');
  const [headers, setHeaders] = useState<string[]>([]);
  const [currentRow, setCurrentRow] = useState<any[]>([]);
  const [rowIndex, setRowIndex] = useState<number>(-1);

  // Mapped Data state
  const [issueId, setIssueId] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [unitName, setUnitName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [status, setStatus] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [lampiran, setLampiran] = useState('');
  const [catatan, setCatatan] = useState('');
  const [lampiran2, setLampiran2] = useState('');
  const [catatan2, setCatatan2] = useState('');
  const [solusi, setSolusi] = useState('');
  const [showMapPopup, setShowMapPopup] = useState(false);
  const [showDataConfirmPopup, setShowDataConfirmPopup] = useState(false);

  // Editing states
  const [newCatatan, setNewCatatan] = useState('');

  // Auxiliary data dictionaries
  const [unitMap, setUnitMap] = useState<Map<string, { name: string; logo: string }>>(new Map());
  const [userMap, setUserMap] = useState<Map<string, { name: string; photo: string; role?: string }>>(new Map());

  // Fetch all necessary data
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);

        let issueRes = await getSheetData('ISSUE!A1:Z1000').catch(() => null);
        let resolvedName = 'ISSUE';
        if (!issueRes) {
          issueRes = await getSheetData('Issue!A1:Z1000').catch(() => null);
          resolvedName = 'Issue';
        }
        setSheetName(resolvedName);

        // Fetch other reference data
        const [unitRes, userRes] = await Promise.all([
          getSheetData('Unit!A1:Z500').catch(() => null),
          getSheetData('User!A1:Z500').catch(() => null)
        ]);

        // Process Unit Map
        const units = new Map<string, { name: string; logo: string }>();
        if (unitRes?.values?.length > 0) {
          const uH = unitRes.values[0] as string[];
          const idIdx = uH.findIndex(h => h?.trim().toUpperCase() === 'ID' || h?.trim().toUpperCase() === 'UNIT ID');
          const nameIdx = uH.findIndex(h => h?.trim().toUpperCase() === 'UNIT NAME');
          const logoIdx = uH.findIndex(h => h?.trim().toUpperCase() === 'IMAGE' || h?.trim().toUpperCase() === 'LOGO' || h?.trim().toUpperCase() === 'AVATAR');
          unitRes.values.slice(1).forEach((r: any[]) => {
            const uid = idIdx > -1 ? r[idIdx]?.trim() : '';
            const uname = nameIdx > -1 ? r[nameIdx]?.trim() : uid;
            const ulogo = logoIdx > -1 ? r[logoIdx]?.trim() : '';
            if (uid) {
              const uInfo = { name: uname, logo: formatImageUrl(ulogo) };
              units.set(uid, uInfo);
              units.set(uname, uInfo);
            }
          });
        }
        setUnitMap(units);

        // Process User Map
        const users = new Map<string, { name: string; photo: string; role?: string }>();
        if (userRes?.values?.length > 0) {
          const userH = userRes.values[0] as string[];
          const eIdx = userH.findIndex(h => h?.trim().toUpperCase() === 'EMAIL');
          const nIdx = userH.findIndex(h => h?.trim().toUpperCase() === 'NAME');
          const pIdx = userH.findIndex(h => h?.trim().toUpperCase() === 'AVATAR' || h?.trim().toUpperCase() === 'PHOTO');
          const roleIdx = userH.findIndex(h => h?.trim().toUpperCase() === 'ROLE');
          userRes.values.slice(1).forEach((r: any[]) => {
            const eml = eIdx > -1 ? r[eIdx]?.trim() : '';
            const unm = nIdx > -1 ? r[nIdx]?.trim() : '';
            const pho = pIdx > -1 ? (r[pIdx] || '') : '';
            const rol = roleIdx > -1 ? (r[roleIdx] || '') : '';
            if (eml) {
              users.set(eml.toLowerCase(), { name: unm, photo: formatImageUrl(pho), role: rol });
            }
          });
        }
        setUserMap(users);

        // Process Issue Data
        if (issueRes?.values?.length > 0) {
          const hdrs = issueRes.values[0] as string[];
          setHeaders(hdrs);

          const getColIndex = (headerName: string) => {
            const normName = headerName.trim().toUpperCase().replace(/[\s._-]+/g, '');
            return hdrs.findIndex(h => {
              if (!h) return false;
              const normH = h.trim().toUpperCase().replace(/[\s._-]+/g, '');
              if (normH === normName) return true;
              if (normName === 'ISSUEID' && (normH === 'ISSUEID' || normH === 'ISSUE_ID' || normH === 'ID')) return true;
              if (normName === 'TIMESTAMP' && (normH === 'TIMESTAMP' || normH === 'TIME')) return true;
              if (normName === 'USER' && (normH === 'USER' || normH === 'EMAIL' || normH === 'PELAPOR')) return true;
              if (normName === 'UNIT' && (normH === 'UNIT' || normH === 'UNIT_NAME' || normH === 'UNITNAME')) return true;
              if (normName === 'KETERANGAN' && (normH === 'KETERANGAN' || normH === 'ISSUE' || normH === 'DETAIL' || normH === 'NOTE' || normH === 'INFO')) return true;
              if (normName === 'STATUS' && (normH === 'STATUS')) return true;
              if (normName === 'LAMPIRAN' && (normH === 'LAMPIRAN' || normH === 'TIPE' || normH === 'ATTACHMENT')) return true;
              if (normName === 'CATATAN' && (normH === 'CATATAN' || normH === 'VALUE' || normH === 'ATTACHMENT_VALUE')) return true;
              if (normName === 'LAMPIRAN2' && (normH === 'LAMPIRAN2' || normH === 'LAMPIRAN_2' || normH === 'TIPE2')) return true;
              if (normName === 'CATATAN2' && (normH === 'CATATAN2' || normH === 'CATATAN_2' || normH === 'VALUE2')) return true;
              if (normName === 'LOKASI' && (normH === 'LOKASI' || normH === 'LOCATION' || normH === 'COORDINATES')) return true;
              if (normName === 'SOLUSI' && (normH === 'SOLUSI' || normH === 'SOLUTION')) return true;
              return false;
            });
          };

          const idIdx = getColIndex('issue_id');
          
          let foundRowIndex = -1;
          let rowData: any[] = [];
          const cleanId = id?.trim().toLowerCase() || '';
          const ketColIdx = getColIndex('keterangan');
          
          for (let i = 1; i < issueRes.values.length; i++) {
            const row = issueRes.values[i];
            const currentId = idIdx > -1 ? (row[idIdx]?.trim() || '') : `ISS-${1000 + i - 1}`;
            const rowDesc = ketColIdx > -1 ? (row[ketColIdx]?.trim() || '') : '';
            
            if (
              currentId.toLowerCase() === cleanId ||
              currentId.replace(/[^a-z0-9]/g, '') === cleanId.replace(/[^a-z0-9]/g, '') ||
              (rowDesc && rowDesc.toLowerCase() === cleanId)
            ) {
              foundRowIndex = i;
              rowData = row;
              break;
            }
          }

          if (foundRowIndex > -1) {
            setRowIndex(foundRowIndex);
            setCurrentRow(rowData);

            const getVal = (idx: number) => idx > -1 && idx < rowData.length ? rowData[idx]?.trim() || '' : '';
            
            setIssueId(id!);
            setTimestamp(getVal(getColIndex('Timestamp')));
            setKeterangan(getVal(getColIndex('keterangan')));
            setUnitName(getVal(getColIndex('Unit')));
            setUserEmail(getVal(getColIndex('user')));
            setStatus(getVal(getColIndex('Status')) || 'SEND');
            setLokasi(getVal(getColIndex('Lokasi')));
            setLampiran(getVal(getColIndex('Lampiran')));
            setCatatan(getVal(getColIndex('Catatan')));
            setLampiran2(getVal(getColIndex('Lampiran2')));
            setCatatan2(getVal(getColIndex('Catatan2')));
            setSolusi(getVal(getColIndex('Solusi')));
          }
        }
      } catch (error) {
        console.error("Error loading issue data", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [id]);

    const currentUserEmail = localStorage.getItem('mtask_user_email') || '';
  const currentUserObj = userMap.get(currentUserEmail.toLowerCase());
  const currentUserFullName = currentUserObj?.name || (currentUserEmail.split('@')[0] || 'User');
  const currentUserRole = currentUserObj?.role?.toUpperCase() || '';

  
  const handleUpdateStatusWithData = async (newStatus: string, saveData: boolean) => {
    if (rowIndex === -1) return;
    setIsSaving(true);
    try {
      const getColIndex = (headerName: string) => {
        const normName = headerName.trim().toUpperCase().replace(/[\s._-]+/g, '');
        return headers.findIndex(h => {
          if (!h) return false;
          const normH = h.trim().toUpperCase().replace(/[\s._-]+/g, '');
          if (normH === normName) return true;
          return false;
        });
      };
      
      let statusIdx = getColIndex('Status');
      if (statusIdx === -1) {
        statusIdx = headers.length;
      }
      
      const colLStatus = colLetter(statusIdx);
      const rowNum = rowIndex + 1;
      
      // Update status in sheet
      await updateSheetData(`${sheetName}!${colLStatus}${rowNum}`, [[newStatus]]);
      
      if (saveData) {
        let dataIdx = getColIndex('Data');
        if (dataIdx === -1) {
          dataIdx = headers.length === statusIdx ? headers.length + 1 : headers.length;
          const headerColL = colLetter(dataIdx);
          await updateSheetData(`${sheetName}!${headerColL}1`, [["Data"]]).catch(() => null);
          const updatedHeaders = [...headers];
          updatedHeaders[dataIdx] = "Data";
          setHeaders(updatedHeaders);
        }
        const colLData = colLetter(dataIdx);
        await updateSheetData(`${sheetName}!${colLData}${rowNum}`, [["TRUE"]]);
      } else {
        let dataIdx = getColIndex('Data');
        if (dataIdx > -1) {
          const colLData = colLetter(dataIdx);
          await updateSheetData(`${sheetName}!${colLData}${rowNum}`, [["FALSE"]]);
        }
      }
      
      setStatus(newStatus);
      const issueName = keterangan || issueId || 'issue';
      logActivity('Form', 'Dashboard', `${currentUserFullName} mengupdate issue "${issueName}" [${issueId || id}] | ${newStatus}${saveData ? ' | Simpan sebagai data' : ''}`);
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Gagal mengupdate status");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    await handleUpdateStatusWithData(newStatus, false);
  };

  const handleUpdateSolusi = async () => {
    if (!newCatatan.trim()) return;
    if (rowIndex === -1) return;
    
    setIsSaving(true);
    try {
      const getColIndex = (headerName: string) => {
        const normName = headerName.trim().toUpperCase().replace(/[\s._-]+/g, '');
        return headers.findIndex(h => {
          if (!h) return false;
          const normH = h.trim().toUpperCase().replace(/[\s._-]+/g, '');
          if (normH === normName) return true;
          if (normName === 'SOLUSI' && (normH === 'SOLUSI' || normH === 'SOLUTION')) return true;
          return false;
        });
      };
      
      let solIdx = getColIndex('Solusi');
      
      if (solIdx === -1) {
        solIdx = headers.length;
      }
      
      const colL = colLetter(solIdx);
      const rowNum = rowIndex + 1;
      
      const sender = currentUserFullName;
      const newEntry = `${sender}: ${newCatatan.trim()}`;
      const updatedSolusi = solusi ? `${solusi}\n${newEntry}` : newEntry;

      await updateSheetData(`${sheetName}!${colL}${rowNum}`, [[updatedSolusi]]);
      
      setSolusi(updatedSolusi);
      setNewCatatan('');
      
    } catch (error) {
      console.error("Error updating solusi:", error);
      alert("Gagal menyimpan solusi");
    } finally {
      setIsSaving(false);
    }
  };

  const parseSolusi = (text: string) => {
    if (!text) return [];
    return text.split('\n').map(line => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx > -1) {
        const sender = trimmed.substring(0, colonIdx).trim();
        const message = trimmed.substring(colonIdx + 1).trim();
        return { sender, message, raw: trimmed };
      }
      return { sender: 'System', message: trimmed, raw: trimmed };
    }).filter(Boolean) as { sender: string; message: string; raw: string }[];
  };

  const chatMessages = parseSolusi(solusi);



  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50/50">
        <Loader2 className="w-10 h-10 text-[#429dbb] animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Memuat data Issue...</p>
      </div>
    );
  }

  if (rowIndex === -1) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-gray-50/50">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center max-w-sm mx-4 text-center">
          <FileText className="w-16 h-16 text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Issue Tidak Ditemukan</h2>
          <p className="text-gray-500 text-sm mb-6">Maaf, issue yang Anda cari tidak dapat ditemukan atau telah dihapus.</p>
          <button 
            onClick={() => navigate(-1)}
            className="w-full bg-[#429dbb] text-white py-3 rounded-xl font-bold hover:bg-[#3788a3] transition-colors"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const matchedUser = userMap.get(userEmail.toLowerCase()) || { name: userEmail || 'Unknown User', photo: '' };
  const matchedUnit = unitMap.get(unitName) || { name: unitName || 'Unknown Unit', logo: '' };

  const isResolved = status.toUpperCase() === 'RESOLVED';
  const isInProgress = status.toUpperCase() === 'IN_PROGRESS';

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 pt-safe">
        <div className="px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-gray-50 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="font-bold text-gray-900 truncate flex-1 text-center pr-8">
            Issue Detail
          </h1>
        </div>
      </header>
      <div className="p-4 max-w-2xl mx-auto space-y-6">
        
        {/* Basic Info Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="p-5 border-b border-gray-50">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1 pr-4">
                <h2 className="text-lg font-black text-gray-900 tracking-tight leading-tight">{keterangan}</h2>
              </div>
              <div className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold border shadow-sm shrink-0",
                isResolved ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                isInProgress ? "bg-amber-50 text-amber-700 border-amber-200" :
                "bg-blue-50 text-blue-700 border-blue-200"
              )}>
                {status}
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-medium mb-0.5">Waktu Laporan</p>
                <p className="text-sm font-bold text-gray-900 truncate">{timestamp}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center shrink-0 border border-gray-100 overflow-hidden">
                {matchedUnit.logo ? (
                  <img src={matchedUnit.logo} alt={matchedUnit.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center font-bold text-gray-400 text-xs">
                    {matchedUnit.name.substring(0,2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-medium mb-0.5">Unit</p>
                <p className="text-sm font-bold text-gray-900 truncate">{matchedUnit.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full shrink-0 border border-gray-100 overflow-hidden">
                <img 
                  src={matchedUser.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(matchedUser.name)}&background=eff6ff&color=3b82f6`} 
                  alt={matchedUser.name} 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-medium mb-0.5">Pelapor</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-gray-900 truncate">{matchedUser.name}</p>
                </div>
                <p className="text-xs text-gray-500 truncate">{userEmail}</p>
              </div>
              {lokasi && (currentUserRole === 'RL01' || currentUserRole === 'RL02') && (
                <button 
                  onClick={() => setShowMapPopup(true)}
                  className="text-red-500 hover:text-red-600 transition-colors p-2 shrink-0 cursor-pointer"
                  title="Lihat Lokasi"
                >
                  <MapPin className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </motion.div>

        
        {/* Card 2: Lampiran/Preview */}
        {(catatan || catatan2) && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-5"
          >
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-indigo-500" />
              Preview Lampiran
            </h3>
            
            <div className="space-y-4">
              {catatan && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-500 mb-2">LAMPIRAN 1</p>
                  {(catatan.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) || catatan.startsWith('data:image') || catatan.startsWith('blob:')) ? (
                    <img src={formatImageUrl(catatan)} alt="Lampiran 1" className="w-full h-auto max-h-64 object-contain rounded-lg border border-gray-200" />
                  ) : catatan.startsWith('http://') || catatan.startsWith('https://') ? (
                    <a 
                      href={catatan} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-[#429dbb] font-bold text-sm hover:underline inline-flex items-center gap-1 break-all"
                    >
                      Buka Lampiran ↗
                    </a>
                  ) : (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{catatan}</p>
                  )}
                </div>
              )}

              {catatan2 && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-500 mb-2">LAMPIRAN 2</p>
                  {(catatan2.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) || catatan2.startsWith('data:image') || catatan2.startsWith('blob:')) ? (
                    <img src={formatImageUrl(catatan2)} alt="Lampiran 2" className="w-full h-auto max-h-64 object-contain rounded-lg border border-gray-200" />
                  ) : catatan2.startsWith('http://') || catatan2.startsWith('https://') ? (
                    <a 
                      href={catatan2} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-[#429dbb] font-bold text-sm hover:underline inline-flex items-center gap-1 break-all"
                    >
                      Buka Lampiran 2 ↗
                    </a>
                  ) : (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{catatan2}</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
        
        {/* Card 3: Kolom Solusi */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[500px]"
        >
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 bg-[#429dbb] rounded-full" />
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Kolom Solusi</h3>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30 space-y-4">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <FileText className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-gray-400 text-xs font-medium">Belum ada solusi atau komentar.</p>
              </div>
            ) : (
              chatMessages.map((msg, i) => {
                const isSystem = msg.sender === 'System';
                const senderNameLower = msg.sender.toLowerCase();
                const currentUserNameLower = currentUserFullName.toLowerCase();
                const isMe = senderNameLower === currentUserNameLower || 
                             senderNameLower === (currentUserEmail.split('@')[0] || '').toLowerCase() || 
                             (currentUserEmail && senderNameLower === currentUserEmail.toLowerCase());

                if (isSystem) {
                  return (
                    <div key={`msg-${i}`} className="flex justify-center my-4">
                      <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-3 py-1 rounded-full border border-gray-200">
                        {msg.message}
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={`msg-${i}`} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2 shadow-sm border relative group",
                      isMe 
                        ? "bg-[#429dbb] text-white border-[#3b8db0] rounded-tr-sm" 
                        : "bg-white text-gray-800 border-gray-200 rounded-tl-sm"
                    )}>
                      {!isMe && (
                        <p className="text-[10px] font-bold mb-1 opacity-60 uppercase tracking-wider">
                          {msg.sender}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 bg-white border-t border-gray-100 shrink-0">
            <span className="text-[10px] uppercase font-extrabold text-gray-400 block tracking-wider mb-2">Tulis Solusi Sebagai <span className="text-[#429dbb]">{currentUserFullName}</span></span>
            <div className="flex items-end gap-2">
              <input
                type="text"
                value={newCatatan}
                onChange={(e) => setNewCatatan(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdateSolusi();
                }}
                placeholder="Tulis solusi di sini..."
                className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#429dbb] shadow-sm"
              />
              <button
                onClick={handleUpdateSolusi}
                disabled={isSaving || !newCatatan.trim()}
                className="w-10 h-10 rounded-2xl bg-[#429dbb] text-white flex items-center justify-center shrink-0 hover:scale-[1.03] active:scale-[0.97] transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 ml-0.5" />
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <div className="pt-4 flex gap-3">
          {status?.toUpperCase() !== 'PROCESS' && status?.toUpperCase() !== 'DONE' && (
            <button
              onClick={() => handleUpdateStatus('PROCESS')}
              disabled={isSaving}
              className="flex-1 py-3.5 bg-blue-50 text-blue-700 font-bold rounded-xl text-sm border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-50 cursor-pointer"
            >
              PROCESS
            </button>
          )}
          {status?.toUpperCase() !== 'DONE' && (
            <button
              onClick={() => {
                if (status?.toUpperCase() === 'PROCESS') {
                  setShowDataConfirmPopup(true);
                } else {
                  handleUpdateStatus('DONE');
                }
              }}
              disabled={isSaving}
              className="flex-1 py-3.5 bg-emerald-50 text-emerald-700 font-bold rounded-xl text-sm border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50 cursor-pointer"
            >
              DONE
            </button>
          )}
        </div>
      </div>
      {/* Map Popup */}
      <AnimatePresence>
        {showMapPopup && lokasi && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-red-500" />
                  <h3 className="font-bold text-gray-900">Lokasi Issue</h3>
                </div>
                <button 
                  onClick={() => setShowMapPopup(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-4 font-mono bg-gray-50 p-2 rounded-lg border border-gray-100">{lokasi}</p>
                <div className="w-full h-64 rounded-xl overflow-hidden border border-gray-200">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    frameBorder="0" 
                    scrolling="no" 
                    marginHeight={0} 
                    marginWidth={0} 
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(lokasi)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                  ></iframe>
                </div>
                <div className="mt-4 flex justify-end">
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lokasi)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#429dbb] text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-[#3788a3] transition-colors"
                  >
                    Buka di Google Maps
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save as Data Confirmation Popup */}
      <AnimatePresence>
        {showDataConfirmPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md p-6 overflow-hidden shadow-2xl border border-gray-100 flex flex-col items-center text-center gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-2">
                <Database className="w-6 h-6" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900">Simpan sebagai data?</h3>
              <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
                Apakah Anda ingin menyimpan informasi issue ini sebagai dokumen data pada unit terkait?
              </p>

              <div className="w-full flex gap-3 mt-4">
                <button
                  onClick={async () => {
                    setShowDataConfirmPopup(false);
                    await handleUpdateStatusWithData('DONE', true);
                  }}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                >
                  Iya
                </button>
                <button
                  onClick={async () => {
                    setShowDataConfirmPopup(false);
                    await handleUpdateStatusWithData('DONE', false);
                  }}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-all active:scale-[0.98] cursor-pointer"
                >
                  Tidak
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
