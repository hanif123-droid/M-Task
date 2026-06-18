import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Building2, Users, FileText, CheckCircle2, AlertCircle, TrendingUp, DollarSign, Briefcase, Plus, ChevronDown, ChevronUp, ShoppingBag, Calendar, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { getSheetData } from '../lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

function formatIDR(amount: number | string) {
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/\D/g, '')) || 0 : amount;
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const cleaned = dateStr.trim();
  
  // Try custom regex for DD/MM/YYYY or MM/DD/YYYY or DD-MM-YYYY
  const parts = cleaned.split(/[-/.]/);
  if (parts.length === 3) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const p2 = parseInt(parts[2], 10);
    
    // Check if first part looks like YYYY (4 digits)
    if (parts[0].length === 4 && !isNaN(p0)) {
      return new Date(p0, p1 - 1, p2);
    }
    
    // If third part is 4 digits (e.g. DD/MM/YYYY or MM/DD/YYYY)
    if (parts[2].length === 4 && !isNaN(p2)) {
      if (p1 > 12) {
        // MM/DD/YYYY since p1 is > 12
        return new Date(p2, p0 - 1, p1);
      } else if (p0 > 12) {
        // DD/MM/YYYY since p0 is > 12
        return new Date(p2, p1 - 1, p0);
      } else {
        // Standard default to DD/MM/YYYY for ID locale
        return new Date(p2, p1 - 1, p0);
      }
    }
  }

  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d;

  return null;
}

function getImgUrl(urlStr: string): string {
  if (!urlStr) return '';
  const trimmed = urlStr.trim();
  const gdRegex = /\/file\/d\/([a-zA-Z0-9_-]+)\/view/;
  const match = trimmed.match(gdRegex);
  if (match && match[1]) {
    return `https://docs.google.com/uc?export=view&id=${match[1]}`;
  }
  const gdIdRegex = /[?&]id=([a-zA-Z0-9_-]+)/;
  const matchId = trimmed.match(gdIdRegex);
  if (matchId && matchId[1] && trimmed.includes('drive.google.com')) {
    return `https://docs.google.com/uc?export=view&id=${matchId[1]}`;
  }
  return trimmed;
}

const mockChartData = [
  { name: 'Jan', revenue: 4000, value: 4000 },
  { name: 'Feb', revenue: 3000, value: 3000 },
  { name: 'Mar', revenue: 5000, value: 5000 },
  { name: 'Apr', revenue: 4500, value: 4500 },
  { name: 'May', revenue: 6000, value: 6000 },
  { name: 'Jun', revenue: 5500, value: 5500 },
];

export function UnitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  const [unit, setUnit] = useState<any>(null);
  
  // States for toggle cards
  const [showUsers, setShowUsers] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [showIssues, setShowIssues] = useState(false);

  // Data states
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  
  // Additional stats
  const [expenses, setExpenses] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [chillhubSales, setChillhubSales] = useState<any[]>([]);
  const [lovissaTransactions, setLovissaTransactions] = useState<any[]>([]);
  const [lionParcelTransactions, setLionParcelTransactions] = useState<any[]>([]);
  const [boganathaTransactions, setBoganathaTransactions] = useState<any[]>([]);
  const [occupancyDate, setOccupancyDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  // Chart filter
  const [chartFilter, setChartFilter] = useState('Year'); // Default to Year as per requirement 4
  const [lionParcelSearch, setLionParcelSearch] = useState<string>('');

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        setIsLoading(true);
        const [unitRes, projRes, taskRes, userRes, subRes1, subRes2, issueRes, orderRes1, orderRes2] = await Promise.all([
          getSheetData('Unit!A1:Z500').catch(() => null),
          getSheetData('Project!A1:Z1000').catch(() => null),
          getSheetData('Task!A1:Z2000').catch(() => null),
          getSheetData('User!A1:Z500').catch(() => null),
          getSheetData('Subtask!A1:Z3000').catch(() => null),
          getSheetData('Sub Task!A1:Z3000').catch(() => null),
          getSheetData('Issue!A1:Z1000').catch(() => null),
          getSheetData('Order Budget!A1:Z1000').catch(() => null),
          getSheetData('OrderBudget!A1:Z1000').catch(() => null),
        ]);

        // 1. Find Unit
        if (unitRes?.values?.length > 0) {
          const headers = unitRes.values[0] as string[];
          const idIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ID' || h?.trim().toUpperCase() === 'UNIT ID');
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'UNIT NAME');
          const logoIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'LOGO' || h?.trim().toUpperCase() === 'IMAGE');
          const typeIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TYPE');
          
          if (idIdx > -1) {
            const row = unitRes.values.slice(1).find((r: any[]) => r[idIdx]?.trim() === id);
            if (row) {
              setUnit({
                id,
                name: nameIdx > -1 ? (row[nameIdx] || 'Unknown Unit') : 'Unknown Unit',
                logo: logoIdx > -1 ? (row[logoIdx] || '') : '',
                type: typeIdx > -1 ? (row[typeIdx] || 'General') : 'General',
              });
            }
          }
        }

        // 2. Fetch Users associated with this unit
        let fetchedUsers: any[] = [];
        if (userRes?.values?.length > 0) {
          const headers = userRes.values[0] as string[];
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'NAME');
          const emailIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'EMAIL');
          const unitIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'UNIT ID' || h?.trim().toUpperCase() === 'UNIT');
          const photoIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PHOTO' || h?.trim().toUpperCase() === 'AVATAR');
          
          if (unitIdIdx > -1) {
             fetchedUsers = userRes.values.slice(1).filter((r: any[]) => r[unitIdIdx]?.trim() === id).map((r: any[]) => {
               const n = nameIdx > -1 ? r[nameIdx] : (emailIdx > -1 ? r[emailIdx] : 'Unknown');
               return {
                 id: emailIdx > -1 ? r[emailIdx] : Math.random().toString(),
                 name: n,
                 photo: photoIdx > -1 && r[photoIdx] ? r[photoIdx] : `https://ui-avatars.com/api/?name=${encodeURIComponent(n)}&background=eff6ff&color=3b82f6`
               };
             });
             setUsers(fetchedUsers);
          }
        }

        // 3. Fetch Projects
        let fetchedProjects: any[] = [];
        const projIds = new Set<string>();
        if (projRes?.values?.length > 0) {
          const headers = projRes.values[0] as string[];
          const idIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PROJECT ID');
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PROJECT NAME');
          const unitIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'UNIT' || h?.trim().toUpperCase() === 'UNIT ID' || h?.trim().toUpperCase() === 'ID UNIT');
          
          if (idIdx > -1 && unitIdIdx > -1) {
            fetchedProjects = projRes.values.slice(1).filter((r: any[]) => r[unitIdIdx]?.trim() === id).map((r: any[]) => {
               const pId = r[idIdx]?.trim();
               if(pId) projIds.add(pId);
               return {
                 id: pId,
                 name: nameIdx > -1 ? r[nameIdx] : pId
               };
            });
            setProjects(fetchedProjects);
          }
        }

        // 4. Fetch Tasks
        let fetchedTasks: any[] = [];
        let doneTasksCount = 0;
        const taskIds = new Set<string>();
        if (taskRes?.values?.length > 0) {
          const headers = taskRes.values[0] as string[];
          const taskIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TASK ID');
          const taskNameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TASK NAME' || h?.trim().toUpperCase() === 'TITLE');
          const pIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PROJECT ID' || h?.trim().toUpperCase() === 'PROJECT');
          const statusIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'STATUS');
          
          if (taskIdIdx > -1 && pIdIdx > -1) {
            taskRes.values.slice(1).forEach((r: any[]) => {
               const pId = r[pIdIdx]?.trim();
               if(projIds.has(pId)){
                  const tId = r[taskIdIdx]?.trim();
                  if(tId) taskIds.add(tId);
                  const st = (statusIdx > -1 ? r[statusIdx] : '').toLowerCase();
                  if (st.includes('done') || st.includes('complete') || st.includes('selesai')) {
                    doneTasksCount++;
                  }
                  fetchedTasks.push({
                    id: tId,
                    name: taskNameIdx > -1 ? r[taskNameIdx] : tId,
                    status: statusIdx > -1 ? r[statusIdx] : 'Unknown'
                  });
               }
            });
            setTasks(fetchedTasks);
          }
        }
        
        // 5. Calculate Expenses from subtasks based on taskIds
        let totalExpenses = 0;
        const subRes = subRes1?.values ? subRes1 : subRes2;
        if (subRes?.values?.length > 0) {
          const headers = subRes.values[0] as string[];
          const taskIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TASK ID' || h?.trim().toUpperCase() === 'TASK');
          const expIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'AMOUNT' || h?.trim().toUpperCase() === 'EXPENSES' || h?.trim().toUpperCase() === 'EXPENSE');
          
          if(taskIdIdx > -1 && expIdx > -1) {
             subRes.values.slice(1).forEach((r: any[]) => {
               const tId = r[taskIdIdx]?.trim();
               if (taskIds.has(tId)) {
                 const amt = parseFloat((r[expIdx] || '').replace(/\D/g, '')) || 0;
                 totalExpenses += amt;
               }
             });
          }
        }
        setExpenses(totalExpenses);

        // 6. Fetch Orders (Order Budget)
        let fetchedOrders: any[] = [];
        const orderRes = orderRes1?.values ? orderRes1 : orderRes2;
        if (orderRes?.values?.length > 0) {
          const headers = orderRes.values[0] as string[];
          const idIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ORDER ID' || h?.trim().toUpperCase() === 'ID');
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ORDER NAME' || h?.trim().toUpperCase() === 'TITLE' || h?.trim().toUpperCase() === 'NAME');
          const unitIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'UNIT ID' || h?.trim().toUpperCase() === 'UNIT');
          
          if (idIdx > -1 && unitIdIdx > -1) {
            fetchedOrders = orderRes.values.slice(1).filter((r: any[]) => r[unitIdIdx]?.trim() === id).map((r: any[]) => ({
              id: r[idIdx],
              name: nameIdx > -1 ? r[nameIdx] : r[idIdx]
            }));
            setOrders(fetchedOrders);
          }
        }

        // 7. Fetch Issues
        let fetchedIssues: any[] = [];
        if (issueRes?.values?.length > 0) {
          const headers = issueRes.values[0] as string[];
          const idIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ISSUE ID' || h?.trim().toUpperCase() === 'ID');
          const titleIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TITLE' || h?.trim().toUpperCase() === 'ISSUE NAME');
          const pIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PROJECT ID' || h?.trim().toUpperCase() === 'PROJECT');
          const statusIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'STATUS');
          
          if (idIdx > -1 && pIdIdx > -1) {
             fetchedIssues = issueRes.values.slice(1).filter((r: any[]) => projIds.has(r[pIdIdx]?.trim())).map((r: any[]) => ({
               id: r[idIdx],
               name: titleIdx > -1 ? r[titleIdx] : r[idIdx],
               status: statusIdx > -1 ? r[statusIdx] : 'Unknown'
             }));
             setIssues(fetchedIssues);
          }
        }

        // 8. Fetch Sales data for Chillhub Surabaya (UNT15)
        let salesData: any[] = [];
        if (id?.trim().toUpperCase() === 'UNT15') {
          const salesRes = await getSheetData('Chillhub Surabaya!A1:Z500').catch(() => null);
          if (salesRes && salesRes.values && salesRes.values.length > 0) {
            const headers = salesRes.values[0] as string[];
            const dateIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'DATE');
            const actIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ACTIVITIES' || h?.trim().toUpperCase() === 'ACTIVITY');
            const priceIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PRICE' || h?.trim().toUpperCase() === 'PRICE IDR' || h?.trim().toUpperCase() === 'HARGA');
            
            if (dateIdx > -1 && actIdx > -1 && priceIdx > -1) {
              salesRes.values.slice(1).forEach((row: any[]) => {
                const dateStr = row[dateIdx]?.trim() || '';
                const activityStr = row[actIdx]?.trim() || '';
                const priceStr = row[priceIdx]?.trim() || '';
                
                // Parse Price as a number safely
                const priceNum = parseFloat(priceStr.replace(/[^0-9.-]/g, '')) || 0;
                
                if (dateStr || activityStr || priceNum > 0) {
                  salesData.push({
                    date: dateStr,
                    rawDate: parseDate(dateStr),
                    activity: activityStr || 'Activity',
                    price: priceNum
                  });
                }
              });
            }
          }
        }
        setChillhubSales(salesData);

        // 9. Fetch Transactions for Lovissa Guest House (UNT19)
        let lovissaData: any[] = [];
        if (id?.trim().toUpperCase() === 'UNT19') {
          const lovissaRes = await getSheetData('Lovissa Guest House!A1:Z500').catch(() => null);
          if (lovissaRes && lovissaRes.values && lovissaRes.values.length > 0) {
            const headers = lovissaRes.values[0] as string[];
            const checkInIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'CHECK IN' || h?.trim().toUpperCase() === 'CHECK-IN' || h?.trim().toUpperCase() === 'CHECKIN');
            const checkOutIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'CHECK OUT' || h?.trim().toUpperCase() === 'CHECK-OUT' || h?.trim().toUpperCase() === 'CHECKOUT');
            const durIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'DUR' || h?.trim().toUpperCase() === 'DURATION' || h?.trim().toUpperCase() === 'DURASI');
            const typeIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TYPE' || h?.trim().toUpperCase() === 'TIPE');
            const roomIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ROOM' || h?.trim().toUpperCase() === 'KAMAR');
            const priceIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PRICE' || h?.trim().toUpperCase() === 'HARGA');
            const amountIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'AMOUNT' || h?.trim().toUpperCase() === 'TOTAL' || h?.trim().toUpperCase() === 'JUMLAH');
            const ketIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'KETERANGAN' || h?.trim().toUpperCase() === 'NOTE' || h?.trim().toUpperCase() === 'NOTES');
            const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'NAME' || h?.trim().toUpperCase() === 'NAMA');
            const noIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'NO.ID' || h?.trim().toUpperCase() === 'NO ID' || h?.trim().toUpperCase() === 'NO. ID' || h?.trim().toUpperCase() === 'IDENTITY NO');
            const emailIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'EMAIL');
            const phoneIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PHONE' || h?.trim().toUpperCase() === 'TELEPON' || h?.trim().toUpperCase() === 'NO HP' || h?.trim().toUpperCase() === 'NO. HP');
            const paymentIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PAYMENT' || h?.trim().toUpperCase() === 'PEMBAYARAN' || h?.trim().toUpperCase() === 'PAYMENT METHOD');
            const photoIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PHOTO ID' || h?.trim().toUpperCase() === 'FOTO ID' || h?.trim().toUpperCase() === 'PHOTOID' || h?.trim().toUpperCase() === 'FOTO KTP');
            const buktiIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'BUKTI TRANSFER' || h?.trim().toUpperCase() === 'BUKTI' || h?.trim().toUpperCase() === 'BUKTI BAYAR' || h?.trim().toUpperCase() === 'TRANSFER PROOF');
            
            lovissaRes.values.slice(1).forEach((row: any[]) => {
              const checkInStr = checkInIdx > -1 ? row[checkInIdx]?.trim() || '' : '';
              const checkOutStr = checkOutIdx > -1 ? row[checkOutIdx]?.trim() || '' : '';
              const durStr = durIdx > -1 ? row[durIdx]?.trim() || '' : '';
              const typeStr = typeIdx > -1 ? row[typeIdx]?.trim() || '' : '';
              const roomStr = roomIdx > -1 ? row[roomIdx]?.trim() || '' : '';
              const priceStr = priceIdx > -1 ? row[priceIdx]?.trim() || '' : '';
              const amountStr = amountIdx > -1 ? row[amountIdx]?.trim() || '' : '';
              const ketStr = ketIdx > -1 ? row[ketIdx]?.trim() || '' : '';
              const nameStr = nameIdx > -1 ? row[nameIdx]?.trim() || '' : '';
              const noIdStr = noIdIdx > -1 ? row[noIdIdx]?.trim() || '' : '';
              const emailStr = emailIdx > -1 ? row[emailIdx]?.trim() || '' : '';
              const phoneStr = phoneIdx > -1 ? row[phoneIdx]?.trim() || '' : '';
              const paymentStr = paymentIdx > -1 ? row[paymentIdx]?.trim() || '' : '';
              const photoIdStr = photoIdIdx > -1 ? row[photoIdIdx]?.trim() || '' : '';
              const buktiStr = buktiIdx > -1 ? row[buktiIdx]?.trim() || '' : '';
              
              const priceNum = parseFloat(priceStr.replace(/[^0-9.-]/g, '')) || 0;
              const amountNum = parseFloat(amountStr.replace(/[^0-9.-]/g, '')) || 0;
              
              if (checkInStr || nameStr || amountNum > 0) {
                lovissaData.push({
                  checkIn: checkInStr,
                  checkOut: checkOutStr,
                  rawDate: parseDate(checkInStr),
                  dur: durStr,
                  type: typeStr,
                  room: roomStr,
                  price: priceNum,
                  amount: amountNum,
                  keterangan: ketStr,
                  name: nameStr,
                  noId: noIdStr,
                  email: emailStr,
                  phone: phoneStr,
                  payment: paymentStr,
                  photoId: photoIdStr,
                  buktiTransfer: buktiStr
                });
              }
            });
          }
        }
        setLovissaTransactions(lovissaData);

        // 10. Fetch Transactions for Lion Parcel (UNT12)
        let lionParcelData: any[] = [];
        if (id?.trim().toUpperCase() === 'UNT12') {
          const lionParcelRes = await getSheetData('Lion Parcel!A1:Z500').catch(() => null);
          if (lionParcelRes && lionParcelRes.values && lionParcelRes.values.length > 0) {
            const headers = lionParcelRes.values[0] as string[];
            const dateIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'DATE' || h?.trim().toUpperCase() === 'TANGGAL' || h?.trim().toUpperCase() === 'TGL');
            const noResiIdx = headers.findIndex(h => {
              if (!h) return false;
              const normalized = h.trim().toUpperCase().replace(/[\s._-]+/g, '');
              return normalized === 'NORESI' || normalized === 'RESI';
            });
            const layananIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'LAYANAN');
            const tujuanIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TUJUAN');
            const tarifMasukIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TARIF MASUK' || h?.trim().toUpperCase() === 'TARIF' || h?.trim().toUpperCase() === 'TARIF_MASUK' || h?.trim().toUpperCase() === 'JUMLAH' || h?.trim().toUpperCase() === 'PRICE' || h?.trim().toUpperCase() === 'AMOUNT');
            
            // extra details for popup
            const pengirimIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'NAMA PENGIRIM' || h?.trim().toUpperCase() === 'PENGIRIM' || h?.trim().toUpperCase() === 'SENDER');
            const beratIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'BERAT' || h?.trim().toUpperCase() === 'BERAT (KG)' || h?.trim().toUpperCase() === 'WEIGHT');
            const jenisBarangIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'JENIS BARANG' || h?.trim().toUpperCase() === 'BARANG' || h?.trim().toUpperCase() === 'JENIS');
            const keteranganIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'KETERANGAN' || h?.trim().toUpperCase() === 'NOTE' || h?.trim().toUpperCase() === 'NOTES');
            const buktiBayarIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'BUKTI BAYAR' || h?.trim().toUpperCase() === 'BUKTI' || h?.trim().toUpperCase() === 'BUKTI BAYARAN' || h?.trim().toUpperCase() === 'PAYMENT PROOF' || h?.trim().toUpperCase() === 'FOTO' || h?.trim().toUpperCase() === 'BUKTI TRANSFER');

            lionParcelRes.values.slice(1).forEach((row: any[]) => {
              const dateStr = dateIdx > -1 ? row[dateIdx]?.trim() || '' : '';
              const noResiStr = noResiIdx > -1 ? row[noResiIdx]?.trim() || '' : '';
              const layananStr = layananIdx > -1 ? row[layananIdx]?.trim() || '' : '';
              const tujuanStr = tujuanIdx > -1 ? row[tujuanIdx]?.trim() || '' : '';
              const tarifMasukStr = tarifMasukIdx > -1 ? row[tarifMasukIdx]?.trim() || '' : '';
              const pengirimStr = pengirimIdx > -1 ? row[pengirimIdx]?.trim() || '' : '';
              const beratStr = beratIdx > -1 ? row[beratIdx]?.trim() || '' : '';
              const jenisBarangStr = jenisBarangIdx > -1 ? row[jenisBarangIdx]?.trim() || '' : '';
              const keteranganStr = keteranganIdx > -1 ? row[keteranganIdx]?.trim() || '' : '';
              const buktiBayarStr = buktiBayarIdx > -1 ? row[buktiBayarIdx]?.trim() || '' : '';

              const tarifMasukNum = parseFloat(tarifMasukStr.replace(/[^0-9.-]/g, '')) || 0;

              if (dateStr || noResiStr || tarifMasukNum > 0) {
                lionParcelData.push({
                  date: dateStr,
                  rawDate: parseDate(dateStr),
                  noResi: noResiStr,
                  layanan: layananStr,
                  tujuan: tujuanStr,
                  tarifMasuk: tarifMasukNum,
                  pengirim: pengirimStr,
                  berat: beratStr,
                  jenisBarang: jenisBarangStr,
                  keterangan: keteranganStr,
                  buktiBayar: buktiBayarStr
                });
              }
            });
          }
        }
        setLionParcelTransactions(lionParcelData);

        // 11. Fetch Transactions for Boganatha (UNT09)
        let boganathaData: any[] = [];
        if (id?.trim().toUpperCase() === 'UNT09') {
          const boganathaRes = await getSheetData('Boganatha!A1:Z1000').catch(() => null);
          if (boganathaRes && boganathaRes.values && boganathaRes.values.length > 0) {
            const headers = boganathaRes.values[0] as string[];
            
            const getIndex = (names: string[]) => {
              return headers.findIndex(h => {
                if (!h) return false;
                const normalized = h.trim().toUpperCase().replace(/[\s._-]+/g, '');
                return names.some(n => normalized === n.toUpperCase().replace(/[\s._-]+/g, ''));
              });
            };

            const dateIdx = getIndex(['Date', 'Tanggal', 'Tgl']);
            const notaIdx = getIndex(['Nota', 'No Nota', 'Invoice', 'No Invoice', 'No. Nota', 'No. Invoice']);
            const clientIdx = getIndex(['Client', 'Pelanggan', 'Customer', 'Nama Client']);
            const totalIdx = getIndex(['Total', 'Grand Total', 'Total Harga', 'Jumlah']);
            const statusIdx = getIndex(['Status', 'Keterangan']);
            const itemIdx = getIndex(['Item', 'Barang', 'Produk', 'Nama Item', 'Nama Barang']);
            const qtyIdx = getIndex(['Qty', 'Quantity', 'Jumlah Barang']);
            const uomIdx = getIndex(['Uom', 'Satuan', 'Unit']);
            const priceIdx = getIndex(['Price', 'Harga', 'Harga Satuan']);
            const amountIdx = getIndex(['Amount', 'Subtotal', 'Harga Total']);
            const biayaLainIdx = getIndex(['Biaya Lain', 'Admin', 'Ongkir', 'Admin/Ongkir']);

            const parsedRows: any[] = [];
            boganathaRes.values.slice(1).forEach((row: any[]) => {
              const notaVal = notaIdx > -1 ? row[notaIdx]?.trim() || '' : '';
              if (!notaVal) return; // skip row if no Nota is provided
              
              const dateVal = dateIdx > -1 ? row[dateIdx]?.trim() || '' : '';
              const clientVal = clientIdx > -1 ? row[clientIdx]?.trim() || '' : '';
              const statusVal = statusIdx > -1 ? row[statusIdx]?.trim() || '' : '';
              const itemVal = itemIdx > -1 ? row[itemIdx]?.trim() || '' : '';
              const qtyVal = qtyIdx > -1 ? row[qtyIdx]?.trim() || '' : '';
              const uomVal = uomIdx > -1 ? row[uomIdx]?.trim() || '' : '';
              const priceVal = priceIdx > -1 ? row[priceIdx]?.trim() || '' : '';
              const amountVal = amountIdx > -1 ? row[amountIdx]?.trim() || '' : '';
              const biayaLainVal = biayaLainIdx > -1 ? row[biayaLainIdx]?.trim() || '' : '';
              const totalVal = totalIdx > -1 ? row[totalIdx]?.trim() : '';
              
              const priceNum = parseFloat((priceVal || '').replace(/[^0-9.-]/g, '')) || 0;
              const amountNum = parseFloat((amountVal || '').replace(/[^0-9.-]/g, '')) || 0;
              const totalNum = parseFloat((totalVal || '').replace(/[^0-9.-]/g, '')) || 0;
              const biayaLainNum = parseFloat((biayaLainVal || '').replace(/[^0-9.-]/g, '')) || 0;

              parsedRows.push({
                date: dateVal,
                rawDate: parseDate(dateVal),
                nota: notaVal,
                client: clientVal,
                status: statusVal,
                item: itemVal,
                qty: qtyVal,
                uom: uomVal,
                price: priceNum,
                amount: amountNum,
                biayaLain: biayaLainNum,
                total: totalNum
              });
            });

            // Group parsedRows by "Nota"
            const groupedMap: { [key: string]: any } = {};
            parsedRows.forEach(row => {
              const key = row.nota;
              if (!groupedMap[key]) {
                groupedMap[key] = {
                  nota: row.nota,
                  date: row.date,
                  rawDate: row.rawDate,
                  client: row.client,
                  status: row.status,
                  items: [],
                  totalSum: 0,
                };
              }
              groupedMap[key].items.push({
                item: row.item,
                qty: row.qty,
                uom: row.uom,
                price: row.price,
                amount: row.amount,
                biayaLain: row.biayaLain,
                total: row.total,
              });
              groupedMap[key].totalSum += row.total;
            });

            boganathaData = Object.values(groupedMap);
          }
        }
        setBoganathaTransactions(boganathaData);

      } catch (error) {
        console.error('Data fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const isChillhubSurabaya = id?.trim().toUpperCase() === 'UNT15';
  const isLovissaGuestHouse = id?.trim().toUpperCase() === 'UNT19';
  const isLionParcel = id?.trim().toUpperCase() === 'UNT12';
  const isBoganatha = id?.trim().toUpperCase() === 'UNT09';



  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-gray-500 font-medium">Memuat Unit...</p>
        </div>
      </div>
    );
  }

  if (!unit && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Building2 className="w-12 h-12 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Unit tidak ditemukan</h2>
        <button onClick={() => navigate(-1)} className="text-blue-600 flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>
      </div>
    );
  }

  const doneTasks = tasks.filter(t => {
     const s = (t.status || '').toLowerCase();
     return s.includes('done') || s.includes('complete') || s.includes('selesai');
  }).length;

  const doneIssues = issues.filter(i => {
     const s = (i.status || '').toLowerCase();
     return s.includes('done') || s.includes('complete') || s.includes('selesai') || s.includes('resolved') || s.includes('closed');
  }).length;

  // Find the latest valid sale date or default to local time references (2026-06-15)
  let referenceDate = new Date(2026, 5, 15);
  if (isChillhubSurabaya && chillhubSales.length > 0) {
    const validDates = chillhubSales.map(s => s.rawDate).filter(Boolean) as Date[];
    if (validDates.length > 0) {
      const maxVal = Math.max(...validDates.map(d => d.getTime()));
      referenceDate = new Date(maxVal);
    }
  } else if (isLovissaGuestHouse && lovissaTransactions.length > 0) {
    const validDates = lovissaTransactions.map(t => t.rawDate).filter(Boolean) as Date[];
    if (validDates.length > 0) {
      const maxVal = Math.max(...validDates.map(d => d.getTime()));
      referenceDate = new Date(maxVal);
    }
  } else if (isLionParcel && lionParcelTransactions.length > 0) {
    const validDates = lionParcelTransactions.map(t => t.rawDate).filter(Boolean) as Date[];
    if (validDates.length > 0) {
      const maxVal = Math.max(...validDates.map(d => d.getTime()));
      referenceDate = new Date(maxVal);
    }
  } else if (isBoganatha && boganathaTransactions.length > 0) {
    const validDates = boganathaTransactions.map(t => t.rawDate).filter(Boolean) as Date[];
    if (validDates.length > 0) {
      const maxVal = Math.max(...validDates.map(d => d.getTime()));
      referenceDate = new Date(maxVal);
    }
  }

  // Filter sales list based on selected time interval
  const filteredSales = isChillhubSurabaya
    ? chillhubSales.filter(sale => {
        if (!sale.rawDate) return false;
        const sYear = sale.rawDate.getFullYear();
        const rYear = referenceDate.getFullYear();
        if (chartFilter === 'Year') {
          return sYear === rYear;
        }
        
        const sMonth = sale.rawDate.getMonth();
        const rMonth = referenceDate.getMonth();
        if (chartFilter === 'Month') {
          return sYear === rYear && sMonth === rMonth;
        }
        
        const sDay = sale.rawDate.getDate();
        const rDay = referenceDate.getDate();
        if (chartFilter === 'Day') {
          return sYear === rYear && sMonth === rMonth && sDay === rDay;
        }
        return false;
      })
    : [];

  // Filter Lovissa transactions based on selected time interval
  const filteredLovissaTrans = isLovissaGuestHouse
    ? lovissaTransactions.filter(t => {
        if (!t.rawDate) return false;
        const sYear = t.rawDate.getFullYear();
        const rYear = referenceDate.getFullYear();
        if (chartFilter === 'Year') {
          return sYear === rYear;
        }
        
        const sMonth = t.rawDate.getMonth();
        const rMonth = referenceDate.getMonth();
        if (chartFilter === 'Month') {
          return sYear === rYear && sMonth === rMonth;
        }
        
        const sDay = t.rawDate.getDate();
        const rDay = referenceDate.getDate();
        if (chartFilter === 'Day') {
          return sYear === rYear && sMonth === rMonth && sDay === rDay;
        }
        return false;
      })
    : [];

  // Filter Lion Parcel transactions based on selected time interval and search query
  const filteredLionParcelTrans = isLionParcel
    ? lionParcelTransactions.filter(t => {
        if (lionParcelSearch.trim()) {
          const q = lionParcelSearch.trim().toLowerCase();
          return (
            (t.noResi && t.noResi.toLowerCase().includes(q)) ||
            (t.layanan && t.layanan.toLowerCase().includes(q)) ||
            (t.tujuan && t.tujuan.toLowerCase().includes(q)) ||
            (t.pengirim && t.pengirim.toLowerCase().includes(q)) ||
            (t.jenisBarang && t.jenisBarang.toLowerCase().includes(q)) ||
            (t.date && t.date.toLowerCase().includes(q))
          );
        }

        if (!t.rawDate) return false;
        const sYear = t.rawDate.getFullYear();
        const rYear = referenceDate.getFullYear();
        if (chartFilter === 'Year') {
          return sYear === rYear;
        }
        
        const sMonth = t.rawDate.getMonth();
        const rMonth = referenceDate.getMonth();
        if (chartFilter === 'Month') {
          return sYear === rYear && sMonth === rMonth;
        }
        
        const sDay = t.rawDate.getDate();
        const rDay = referenceDate.getDate();
        if (chartFilter === 'Day') {
          return sYear === rYear && sMonth === rMonth && sDay === rDay;
        }
        return false;
      })
    : [];

  // Filter Boganatha transactions based on selected time interval
  const filteredBoganathaTrans = isBoganatha
    ? boganathaTransactions.filter(t => {
        if (!t.rawDate) return false;
        const sYear = t.rawDate.getFullYear();
        const rYear = referenceDate.getFullYear();
        if (chartFilter === 'Year') {
          return sYear === rYear;
        }
        
        const sMonth = t.rawDate.getMonth();
        const rMonth = referenceDate.getMonth();
        if (chartFilter === 'Month') {
          return sYear === rYear && sMonth === rMonth;
        }
        
        const sDay = t.rawDate.getDate();
        const rDay = referenceDate.getDate();
        if (chartFilter === 'Day') {
          return sYear === rYear && sMonth === rMonth && sDay === rDay;
        }
        return false;
      })
    : [];

  // Sort filteredSales by date descending (newest first)
  const sortedFilteredSales = [...filteredSales].sort((a, b) => {
    const timeA = a.rawDate ? a.rawDate.getTime() : 0;
    const timeB = b.rawDate ? b.rawDate.getTime() : 0;
    return timeB - timeA;
  });

  // Sort Lovissa transactions by check-in date descending (newest first)
  const sortedFilteredLovissaTrans = [...filteredLovissaTrans].sort((a, b) => {
    const timeA = a.rawDate ? a.rawDate.getTime() : 0;
    const timeB = b.rawDate ? b.rawDate.getTime() : 0;
    return timeB - timeA;
  });

  // Sort Lion Parcel transactions by transaction date descending (newest first)
  const sortedFilteredLionParcelTrans = [...filteredLionParcelTrans].sort((a, b) => {
    const timeA = a.rawDate ? a.rawDate.getTime() : 0;
    const timeB = b.rawDate ? b.rawDate.getTime() : 0;
    return timeB - timeA;
  });

  // Sort Boganatha transactions by transaction date descending (newest first)
  const sortedFilteredBoganathaTrans = [...filteredBoganathaTrans].sort((a, b) => {
    const timeA = a.rawDate ? a.rawDate.getTime() : 0;
    const timeB = b.rawDate ? b.rawDate.getTime() : 0;
    return timeB - timeA;
  });

  const displayRevenue = isChillhubSurabaya
    ? filteredSales.reduce((sum, s) => sum + (s.price || 0), 0)
    : isLovissaGuestHouse
    ? filteredLovissaTrans.reduce((sum, t) => sum + (t.amount || 0), 0)
    : isLionParcel
    ? filteredLionParcelTrans.reduce((sum, t) => sum + (t.tarifMasuk || 0), 0)
    : isBoganatha
    ? filteredBoganathaTrans.reduce((sum, t) => sum + (t.totalSum || 0), 0)
    : revenue;

  // Rooms display and checking logic (Exact list of Room 1 to Room 12)
  const roomList: string[] = Array.from({ length: 12 }, (_, i) => `Room ${i + 1}`);

  const checkOccupancy = (roomName: string, dateStr: string) => {
    const targetDate = parseDate(dateStr);
    if (!targetDate) return null;
    const targetTime = new Date(targetDate).setHours(12, 0, 0, 0);
    const found = lovissaTransactions.find(t => {
      if (!t.room) return false;
      const numT = parseInt(t.room.toString().replace(/\D/g, ''), 10);
      const numR = parseInt(roomName.toString().replace(/\D/g, ''), 10);
      if (isNaN(numT) || isNaN(numR) || numT !== numR) return false;
      const start = parseDate(t.checkIn);
      const end = parseDate(t.checkOut);
      if (!start || !end) return false;
      const startTime = new Date(start).setHours(0, 0, 0, 0);
      const endTime = new Date(end).setHours(23, 59, 59, 999);
      return targetTime >= startTime && targetTime <= endTime;
    });
    return found || null;
  };

  // Generate dynamic chart data based on filter selection
  let dynamicChartData = mockChartData;
  if (isChillhubSurabaya && chillhubSales.length > 0) {
    if (chartFilter === 'Year') {
      const monthsNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      dynamicChartData = monthsNames.map((monthName, index) => {
        const monthlySum = chillhubSales
          .filter(sale => sale.rawDate && sale.rawDate.getFullYear() === referenceDate.getFullYear() && sale.rawDate.getMonth() === index)
          .reduce((sum, s) => sum + s.price, 0);
        return {
          name: monthName,
          revenue: monthlySum,
          value: monthlySum,
        };
      });
    } else if (chartFilter === 'Month') {
      const lastDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0).getDate();
      dynamicChartData = Array.from({ length: lastDay }, (_, i) => {
        const dayNum = i + 1;
        const dailySum = chillhubSales
          .filter(sale => sale.rawDate && 
                          sale.rawDate.getFullYear() === referenceDate.getFullYear() && 
                          sale.rawDate.getMonth() === referenceDate.getMonth() &&
                          sale.rawDate.getDate() === dayNum)
          .reduce((sum, s) => sum + s.price, 0);
        return {
          name: `${dayNum}`,
          revenue: dailySum,
          value: dailySum,
        };
      });
    } else if (chartFilter === 'Day') {
      const daySales = chillhubSales.filter(sale => sale.rawDate && 
                          sale.rawDate.getFullYear() === referenceDate.getFullYear() && 
                          sale.rawDate.getMonth() === referenceDate.getMonth() &&
                          sale.rawDate.getDate() === referenceDate.getDate());
      if (daySales.length > 0) {
        dynamicChartData = daySales.map((s) => ({
          name: s.activity,
          revenue: s.price,
          value: s.price,
        }));
      } else {
        dynamicChartData = [{ name: 'No Sales', revenue: 0, value: 0 }];
      }
    }
  } else if (isLovissaGuestHouse && lovissaTransactions.length > 0) {
    if (chartFilter === 'Year') {
      const monthsNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      dynamicChartData = monthsNames.map((monthName, index) => {
        const monthlySum = lovissaTransactions
          .filter(t => t.rawDate && t.rawDate.getFullYear() === referenceDate.getFullYear() && t.rawDate.getMonth() === index)
          .reduce((sum, t) => sum + t.amount, 0);
        return {
          name: monthName,
          revenue: monthlySum,
          value: monthlySum,
        };
      });
    } else if (chartFilter === 'Month') {
      const lastDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0).getDate();
      dynamicChartData = Array.from({ length: lastDay }, (_, i) => {
        const dayNum = i + 1;
        const dailySum = lovissaTransactions
          .filter(t => t.rawDate && 
                       t.rawDate.getFullYear() === referenceDate.getFullYear() && 
                       t.rawDate.getMonth() === referenceDate.getMonth() &&
                       t.rawDate.getDate() === dayNum)
          .reduce((sum, t) => sum + t.amount, 0);
        return {
          name: `${dayNum}`,
          revenue: dailySum,
          value: dailySum,
        };
      });
    } else if (chartFilter === 'Day') {
      const dayTrans = lovissaTransactions.filter(t => t.rawDate && 
                          t.rawDate.getFullYear() === referenceDate.getFullYear() && 
                          t.rawDate.getMonth() === referenceDate.getMonth() &&
                          t.rawDate.getDate() === referenceDate.getDate());
      if (dayTrans.length > 0) {
        dynamicChartData = dayTrans.map((t) => ({
          name: `Room ${t.room || '?'}-${t.type || 'Type'}`,
          revenue: t.amount,
          value: t.amount,
        }));
      } else {
        dynamicChartData = [{ name: 'No Transactions', revenue: 0, value: 0 }];
      }
    }
  } else if (isLionParcel && lionParcelTransactions.length > 0) {
    if (chartFilter === 'Year') {
      const monthsNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      dynamicChartData = monthsNames.map((monthName, index) => {
        const monthlySum = lionParcelTransactions
          .filter(t => t.rawDate && t.rawDate.getFullYear() === referenceDate.getFullYear() && t.rawDate.getMonth() === index)
          .reduce((sum, t) => sum + t.tarifMasuk, 0);
        return {
          name: monthName,
          revenue: monthlySum,
          value: monthlySum,
        };
      });
    } else if (chartFilter === 'Month') {
      const lastDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0).getDate();
      dynamicChartData = Array.from({ length: lastDay }, (_, i) => {
        const dayNum = i + 1;
        const dailySum = lionParcelTransactions
          .filter(t => t.rawDate && 
                       t.rawDate.getFullYear() === referenceDate.getFullYear() && 
                       t.rawDate.getMonth() === referenceDate.getMonth() &&
                       t.rawDate.getDate() === dayNum)
          .reduce((sum, t) => sum + t.tarifMasuk, 0);
        return {
          name: `${dayNum}`,
          revenue: dailySum,
          value: dailySum,
        };
      });
    } else if (chartFilter === 'Day') {
      const dayTrans = lionParcelTransactions.filter(t => t.rawDate && 
                          t.rawDate.getFullYear() === referenceDate.getFullYear() && 
                          t.rawDate.getMonth() === referenceDate.getMonth() &&
                          t.rawDate.getDate() === referenceDate.getDate());
      if (dayTrans.length > 0) {
        dynamicChartData = dayTrans.map((t) => ({
          name: t.noResi || 'No Resi',
          revenue: t.tarifMasuk,
          value: t.tarifMasuk,
        }));
      } else {
        dynamicChartData = [{ name: 'No Transactions', revenue: 0, value: 0 }];
      }
    }
  } else if (isBoganatha && boganathaTransactions.length > 0) {
    if (chartFilter === 'Year') {
      const monthsNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      dynamicChartData = monthsNames.map((monthName, index) => {
        const monthlySum = boganathaTransactions
          .filter(t => t.rawDate && t.rawDate.getFullYear() === referenceDate.getFullYear() && t.rawDate.getMonth() === index)
          .reduce((sum, t) => sum + t.totalSum, 0);
        return {
          name: monthName,
          revenue: monthlySum,
          value: monthlySum,
        };
      });
    } else if (chartFilter === 'Month') {
      const lastDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0).getDate();
      dynamicChartData = Array.from({ length: lastDay }, (_, i) => {
        const dayNum = i + 1;
        const dailySum = boganathaTransactions
          .filter(t => t.rawDate && 
                       t.rawDate.getFullYear() === referenceDate.getFullYear() && 
                       t.rawDate.getMonth() === referenceDate.getMonth() &&
                       t.rawDate.getDate() === dayNum)
          .reduce((sum, t) => sum + t.totalSum, 0);
        return {
          name: `${dayNum}`,
          revenue: dailySum,
          value: dailySum,
        };
      });
    } else if (chartFilter === 'Day') {
      const dayTrans = boganathaTransactions.filter(t => t.rawDate && 
                          t.rawDate.getFullYear() === referenceDate.getFullYear() && 
                          t.rawDate.getMonth() === referenceDate.getMonth() &&
                          t.rawDate.getDate() === referenceDate.getDate());
      if (dayTrans.length > 0) {
        dynamicChartData = dayTrans.map((t) => ({
          name: t.nota || 'No Nota',
          revenue: t.totalSum,
          value: t.totalSum,
        }));
      } else {
        dynamicChartData = [{ name: 'No Transactions', revenue: 0, value: 0 }];
      }
    }
  }

  return (
    <div className="pb-24 bg-gray-50 min-h-screen">
      <header className="bg-[#429dbb] text-white px-5 py-4 shadow-md sticky top-0 z-50 w-full flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors shrink-0">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-xl font-bold tracking-tight drop-shadow-sm truncate">Detail Unit</h1>
      </header>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        
        {/* Card 1: Logo, Nama, Type */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col md:flex-row items-center md:items-start gap-4">
          <div className="w-20 h-20 bg-gray-50 shadow-inner rounded-2xl border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
             {unit?.logo ? (
               <img src={unit.logo || undefined} alt={unit.name} className="w-full h-full object-cover" />
             ) : (
               <Building2 className="w-8 h-8 text-gray-300 flex-shrink-0" />
             )}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-1">{unit?.name}</h2>
            <span className="inline-block bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              {unit?.type}
            </span>
          </div>
        </div>

        {/* Card 2: Overview Statistics */}
        <div className="grid grid-cols-2 gap-3">
           <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                 <DollarSign className="w-4 h-4 text-emerald-500" />
                 <span className="text-xs font-semibold uppercase tracking-wider">Revenue</span>
              </div>
              <span className="text-lg font-bold text-gray-900">{formatIDR(displayRevenue)}</span>
           </div>
           <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                 <AlertCircle className="w-4 h-4 text-red-500" />
                 <span className="text-xs font-semibold uppercase tracking-wider">Expenses</span>
              </div>
              <span className="text-lg font-bold text-gray-900">{formatIDR(expenses)}</span>
           </div>
           <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-1 items-center justify-center text-center">
              <span className="text-2xl font-black text-blue-600">{projects.length}</span>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Projects</span>
           </div>
           <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-1 items-center justify-center text-center">
              <span className="text-2xl font-black text-indigo-600">{tasks.length}</span>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tasks</span>
           </div>
        </div>

        {/* Card 3: Revenue Growth Trends */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
               <TrendingUp className="w-5 h-5 text-emerald-500" />
               Revenue Growth
            </h3>
            <div className="bg-gray-100 p-1 rounded-lg flex text-xs font-medium">
               {['Year', 'Month', 'Day'].map(t => (
                 <button 
                   key={t}
                   onClick={() => setChartFilter(t)}
                   className={cn("px-2.5 py-1 rounded-md transition-colors", chartFilter === t ? "bg-white shadow-sm text-gray-900" : "text-gray-500")}
                 >
                   {t}
                 </button>
               ))}
            </div>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height={192}>
              <AreaChart data={dynamicChartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} dy={10} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: any) => [formatIDR(val), "Revenue"]}
                />
                <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card: Transaksi (Only for Boganatha UNT09) */}
        {isBoganatha && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-blue-500" />
                Daftar Transaksi ({filteredBoganathaTrans.length})
              </h3>
              <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
                Filter: {chartFilter}
              </span>
            </div>
            
            <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto pr-1">
              {sortedFilteredBoganathaTrans.length === 0 ? (
                <div className="py-8 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-150">
                  <p className="text-sm text-gray-400 italic">Tidak ada transaksi untuk filter ini.</p>
                </div>
              ) : (
                sortedFilteredBoganathaTrans.map((trans, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedTransaction({ ...trans, isBoganathaTx: true })}
                    className="py-3 flex flex-col justify-between gap-1.5 cursor-pointer hover:bg-slate-50/70 p-2.5 rounded-xl transition-all duration-200 pr-1 group"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">
                            {trans.nota}
                          </span>
                          {(() => {
                            const isPaid = trans.status?.trim().toLowerCase() === 'paid' || 
                                           trans.status?.trim().toLowerCase() === 'lunas' || 
                                           trans.status?.trim().toLowerCase() === 'done' || 
                                           trans.status?.trim().toLowerCase() === 'selesai';
                            return (
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border",
                                isPaid
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                  : "bg-rose-50 text-rose-700 border-rose-100"
                              )}>
                                {isPaid ? 'Paid' : 'Unpaid'}
                              </span>
                            );
                          })()}
                        </div>
                        <p className="text-sm font-bold text-gray-900 mt-2 group-hover:text-blue-600 transition-colors truncate">
                          Client: {trans.client || 'Unknown'}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-blue-600">{formatIDR(trans.totalSum)}</p>
                        <p className="text-[9px] text-gray-400 mt-1 font-medium">{trans.date}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Card: Transaksi (Only for Lion Parcel UNT12) */}
        {isLionParcel && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-500" />
                Daftar Transaksi ({filteredLionParcelTrans.length})
              </h3>
              <div className="relative w-full sm:w-48">
                <input
                  type="text"
                  placeholder="Cari No. Resi, Tujuan, dll..."
                  value={lionParcelSearch}
                  onChange={(e) => setLionParcelSearch(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-gray-700 placeholder-gray-400 bg-gray-50/50"
                  id="lion-parcel-search-input"
                />
              </div>
            </div>
            
            <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto pr-1">
              {sortedFilteredLionParcelTrans.length === 0 ? (
                <div className="py-8 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-150">
                  <p className="text-sm text-gray-400 italic">Tidak ada transaksi yang cocok.</p>
                </div>
              ) : (
                sortedFilteredLionParcelTrans.map((trans, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedTransaction({ ...trans, isLionParcelTx: true })}
                    className="py-3 flex flex-col justify-between gap-1 cursor-pointer hover:bg-slate-50/70 p-2.5 rounded-xl transition-all duration-200 pr-1 group"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">
                            {trans.layanan || 'REG'}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">
                            {trans.noResi}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-gray-900 mt-1 group-hover:text-emerald-600 transition-colors truncate">
                          Tujuan: {trans.tujuan || 'Unknown'}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-emerald-600">{formatIDR(trans.tarifMasuk)}</p>
                        <p className="text-[9px] text-gray-400 mt-0.5 font-medium">{trans.date}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Card: Penjualan (Only for Chillhub Surabaya UNT15) */}
        {isChillhubSurabaya && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-blue-500" />
                Daftar Penjualan ({filteredSales.length})
              </h3>
              <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
                Filter: {chartFilter}
              </span>
            </div>
            
            <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto pr-1">
              {sortedFilteredSales.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-gray-400 italic">Tidak ada transaksi penjualan untuk filter ini.</p>
                </div>
              ) : (
                sortedFilteredSales.map((sale, idx) => (
                  <div key={idx} className="py-3 flex justify-between items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900 truncate">{sale.activity}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{sale.date}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-gray-900">{formatIDR(sale.price)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Card: Transaksi (Only for Lovissa Guest House UNT19) */}
        {isLovissaGuestHouse && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-500" />
                Daftar Transaksi ({filteredLovissaTrans.length})
              </h3>
              <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
                Filter: {chartFilter}
              </span>
            </div>
            
            <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto pr-1">
              {sortedFilteredLovissaTrans.length === 0 ? (
                <div className="py-8 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-150">
                  <p className="text-sm text-gray-400 italic">Tidak ada transaksi untuk filter ini.</p>
                </div>
              ) : (
                sortedFilteredLovissaTrans.map((trans, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedTransaction(trans)}
                    className="py-3 flex flex-col justify-between gap-1 cursor-pointer hover:bg-slate-50/70 p-2.5 rounded-xl transition-all duration-200 pr-1 group"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase col-span-2">
                            {trans.room}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            {trans.type}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-gray-900 mt-1 group-hover:text-indigo-600 transition-colors truncate">
                          {trans.name || 'Anonymous Guest'}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-gray-900">{formatIDR(trans.amount)}</p>
                        <p className="text-[9px] text-gray-400 mt-0.5">{trans.dur ? `${trans.dur} Malam` : ''}</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs mt-1.5 pt-1.5 border-t border-gray-100/50 text-gray-400">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-gray-700">{trans.checkIn}</span>
                        <span>→</span>
                        <span className="font-semibold text-gray-700">{trans.checkOut}</span>
                      </div>
                      {trans.keterangan && (
                        <span className="truncate max-w-[150px] italic text-[10px] text-gray-400">
                          {trans.keterangan}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Card: Status Okupansi (Lovissa Guest House UNT19 only) */}
        {isLovissaGuestHouse && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-500" />
                  Status Okupansi
                </h3>
                <div className="flex items-center gap-1 bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-1 rounded-full text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                  Live Map
                </div>
              </div>
              
              {/* Date Filter & Info */}
              <div className="flex items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-gray-100 mt-1">
                <span className="text-xs text-gray-500 font-medium">Pilih Tanggal:</span>
                <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-gray-200">
                  <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                  <input 
                    type="date" 
                    value={occupancyDate} 
                    onChange={(e) => setOccupancyDate(e.target.value)} 
                    className="text-xs font-bold text-gray-700 bg-transparent focus:outline-none border-none p-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Rooms Grid */}
            <div className="grid grid-cols-4 gap-2.5 pt-1">
              {roomList.map((roomName, index) => {
                const activeTx = checkOccupancy(roomName, occupancyDate);
                const isOccupied = !!activeTx;
                
                return (
                  <div 
                    key={index}
                    onClick={() => {
                      if (activeTx) {
                        setSelectedTransaction(activeTx);
                      }
                    }}
                    className={cn(
                      "aspect-square rounded-xl border flex flex-col items-center justify-center p-2 text-center transition-all duration-200 select-none relative group",
                      isOccupied 
                        ? "bg-sky-100 text-sky-950 border-sky-300 hover:bg-sky-200 hover:border-sky-400 cursor-pointer" 
                        : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <span className="text-xs font-black tracking-normal truncate w-full">
                      {roomName.replace(/Room\s+/gi, '')}
                    </span>
                    <span className="text-[9px] font-semibold mt-1 uppercase tracking-wider block">
                      {isOccupied ? 'Isi' : 'Kosong'}
                    </span>
                    
                    {/* Legend marker */}
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full absolute top-1.5 right-1.5",
                      isOccupied ? "bg-sky-500" : "bg-gray-300"
                    )} />
                    
                    {/* Hover details if occupied */}
                    {isOccupied && (
                      <div className="pointer-events-none absolute bottom-full mb-2 bg-gray-900 text-white text-[10px] rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg font-sans">
                        {activeTx.name || 'Anonymous'} ({activeTx.type})
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend for occupancy status */}
            <div className="flex items-center gap-4 text-xs pt-1 text-gray-500 justify-center">
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded border border-sky-300 bg-sky-100" />
                <span>Terisi (Biru Muda)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded border border-gray-200 bg-white" />
                <span>Kosong (Putih)</span>
              </div>
            </div>
          </div>
        )}

        {/* Card 4: Daftar User */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button 
            onClick={() => setShowUsers(!showUsers)}
            className="w-full flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2 font-semibold text-gray-900">
               <Users className="w-5 h-5 text-blue-500" />
               User ({users.length})
            </div>
            {showUsers ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          <AnimatePresence>
            {showUsers && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-gray-100">
                <div className="p-4 space-y-3">
                   {users.length === 0 ? <p className="text-sm text-gray-500 italic text-center">Tidak ada user.</p> : users.map((u, i) => (
                     <div key={i} className="flex items-center gap-3">
                       <img src={u.photo} alt={u.name} className="w-8 h-8 rounded-full border border-gray-200" />
                       <span className="text-sm font-medium text-gray-900">{u.name}</span>
                     </div>
                   ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Card 5: Daftar Order Budget Review */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button 
            onClick={() => setShowOrders(!showOrders)}
            className="w-full flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2 font-semibold text-gray-900">
               <FileText className="w-5 h-5 text-yellow-500" />
               Order Budget Review ({orders.length})
            </div>
            {showOrders ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          <AnimatePresence>
            {showOrders && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-gray-100">
                <div className="p-4 space-y-2">
                   {orders.length === 0 ? <p className="text-sm text-gray-500 italic text-center">Tidak ada order.</p> : orders.map((o, i) => (
                     <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                       <div className="w-2 h-2 rounded-full bg-yellow-500" />
                       <span className="text-sm font-medium text-gray-900 truncate">{o.name}</span>
                     </div>
                   ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Card 6: Daftar Project */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button 
            onClick={() => setShowProjects(!showProjects)}
            className="w-full flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2 font-semibold text-gray-900">
               <Briefcase className="w-5 h-5 text-indigo-500" />
               Project ({projects.length})
            </div>
            {showProjects ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          <AnimatePresence>
            {showProjects && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-gray-100">
                <div className="p-4 space-y-2">
                   {projects.length === 0 ? <p className="text-sm text-gray-500 italic text-center">Tidak ada project.</p> : projects.map((p, i) => (
                     <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100" onClick={() => navigate(`/projects/${p.id}`)}>
                       <div className="w-2 h-2 rounded-full bg-indigo-500" />
                       <span className="text-sm font-medium text-gray-900 truncate flex-1">{p.name}</span>
                     </div>
                   ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Card 7: Daftar Task */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button 
            onClick={() => setShowTasks(!showTasks)}
            className="w-full flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2 font-semibold text-gray-900">
               <CheckCircle2 className="w-5 h-5 text-emerald-500" />
               Task ({doneTasks}/{tasks.length} Done)
            </div>
            {showTasks ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          <AnimatePresence>
            {showTasks && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-gray-100">
                <div className="p-4 space-y-2">
                   {tasks.length === 0 ? <p className="text-sm text-gray-500 italic text-center">Tidak ada task.</p> : tasks.map((t, i) => (
                     <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100" onClick={() => navigate(`/tasks/${t.id}`)}>
                       <div className={cn("w-2 h-2 rounded-full", t.status.toLowerCase().includes('done') ? 'bg-emerald-500' : 'bg-gray-300')} />
                       <span className="text-sm font-medium text-gray-900 truncate flex-1">{t.name}</span>
                       <span className="text-[10px] font-bold text-gray-500 uppercase">{t.status}</span>
                     </div>
                   ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Card 8: Daftar Issue */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button 
            onClick={() => setShowIssues(!showIssues)}
            className="w-full flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2 font-semibold text-gray-900">
               <AlertCircle className="w-5 h-5 text-red-500" />
               Issue ({doneIssues}/{issues.length} Done)
            </div>
            {showIssues ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          <AnimatePresence>
            {showIssues && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-gray-100">
                <div className="p-4 space-y-2">
                   {issues.length === 0 ? <p className="text-sm text-gray-500 italic text-center">Tidak ada issue.</p> : issues.map((iss, i) => (
                     <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                       <div className={cn("w-2 h-2 rounded-full", iss.status.toLowerCase().includes('done') || iss.status.toLowerCase().includes('closed') ? 'bg-emerald-500' : 'bg-red-500')} />
                       <span className="text-sm font-medium text-gray-900 truncate flex-1">{iss.name}</span>
                       <span className="text-[10px] font-bold text-gray-500 uppercase">{iss.status}</span>
                     </div>
                   ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
      </div>

      {/* Transaction Details Modal */}
      <AnimatePresence>
        {selectedTransaction && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 font-sans"
            >
              <button 
                onClick={() => setSelectedTransaction(null)}
                className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-2">
                <div className={cn("p-2.5 rounded-xl", selectedTransaction.isLionParcelTx ? "bg-emerald-50 text-emerald-600" : selectedTransaction.isBoganathaTx ? "bg-blue-50 text-blue-600" : "bg-indigo-50 text-indigo-600")}>
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">Detail Transaksi</h4>
                  <p className="text-xs text-gray-400">
                    {selectedTransaction.isBoganathaTx
                      ? `Boganatha - Nota: ${selectedTransaction.nota}`
                      : selectedTransaction.isLionParcelTx
                      ? `Lion Parcel - No. Resi: ${selectedTransaction.noResi}`
                      : `${selectedTransaction.room} - ${selectedTransaction.type}`
                    }
                  </p>
                </div>
              </div>

              {selectedTransaction.isBoganathaTx ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div>
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-0.5">No. Nota / Invoice</p>
                      <p className="font-extrabold text-blue-600 font-mono text-base">{selectedTransaction.nota}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Tanggal</p>
                      <p className="font-bold text-gray-800">{selectedTransaction.date}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Client</p>
                      <p className="font-bold text-gray-800">{selectedTransaction.client || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Status</p>
                      {(() => {
                        const isPaid = selectedTransaction.status?.trim().toLowerCase() === 'paid' || 
                                       selectedTransaction.status?.trim().toLowerCase() === 'lunas' || 
                                       selectedTransaction.status?.trim().toLowerCase() === 'done' || 
                                       selectedTransaction.status?.trim().toLowerCase() === 'selesai';
                        const displayStatus = isPaid ? 'Paid' : 'Unpaid';
                        return (
                          <span className={cn(
                            "inline-block text-xs font-black px-2.5 py-0.5 rounded-full uppercase border",
                            isPaid
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          )}>
                            {displayStatus}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Invoice Items Table/List with horizontal swipe/scroll and small typography */}
                  <div className="border border-gray-150 rounded-xl overflow-hidden bg-white shadow-inner">
                    <div className="overflow-x-auto scrollbar-thin max-h-72">
                      <table className="w-full text-left border-collapse min-w-[520px]">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">item</th>
                            <th className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">qty</th>
                            <th className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">price</th>
                            <th className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Other</th>
                            <th className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {selectedTransaction.items.map((item: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50/55 transition-colors">
                              <td className="px-3 py-2.5 text-[10px] font-bold text-gray-900 truncate max-w-[140px]" title={item.item}>
                                {item.item || '-'}
                              </td>
                              <td className="px-3 py-2.5 text-[10px] font-medium text-gray-600 text-right whitespace-nowrap">
                                {item.qty} {item.uom ? `${item.uom}` : ''}
                              </td>
                              <td className="px-3 py-2.5 text-[10px] font-mono text-gray-600 text-right whitespace-nowrap">
                                {formatIDR(item.price)}
                              </td>
                              <td className="px-3 py-2.5 text-[10px] font-mono text-gray-500 text-right whitespace-nowrap">
                                {item.biayaLain > 0 ? `${formatIDR(item.biayaLain)} admin/ongkir` : '-'}
                              </td>
                              <td className="px-3 py-2.5 text-[10px] font-mono text-blue-600 font-extrabold text-right whitespace-nowrap">
                                {formatIDR(item.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Grand Total Footer */}
                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-blue-700 font-bold uppercase tracking-wider">Total Pembayaran</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Kumulatif seluruh item nota ini</p>
                    </div>
                    <p className="font-extrabold text-blue-600 text-xl">{formatIDR(selectedTransaction.totalSum)}</p>
                  </div>
                </div>
              ) : selectedTransaction.isLionParcelTx ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div className="col-span-2 bg-gray-50 p-3 rounded-xl space-y-1 border border-gray-100">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Nama Pengirim</p>
                    <p className="font-bold text-gray-900 text-base">{selectedTransaction.pengirim || '-'}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">No. Resi</p>
                    <p className="font-semibold text-gray-800 font-mono">{selectedTransaction.noResi || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Layanan</p>
                    <p className="font-semibold text-gray-800">{selectedTransaction.layanan || '-'}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Tujuan</p>
                    <p className="font-semibold text-gray-800">{selectedTransaction.tujuan || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Tanggal (Date)</p>
                    <p className="font-medium text-gray-800">{selectedTransaction.date || '-'}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Berat</p>
                    <p className="font-semibold text-gray-800">
                      {selectedTransaction.berat ? `${selectedTransaction.berat} kg` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Jenis Barang</p>
                    <p className="font-medium text-gray-800">{selectedTransaction.jenisBarang || '-'}</p>
                  </div>

                  <div className="col-span-2 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                    <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">Tarif Masuk</p>
                    <p className="font-extrabold text-emerald-600 text-lg">{formatIDR(selectedTransaction.tarifMasuk)}</p>
                  </div>

                  {selectedTransaction.keterangan && (
                    <div className="col-span-2 border-t border-gray-100 pt-3">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Keterangan</p>
                      <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-dashed border-gray-200 leading-relaxed">
                        {selectedTransaction.keterangan}
                      </p>
                    </div>
                  )}

                  {/* Bukti Bayar View */}
                  {selectedTransaction.buktiBayar && (
                    <div className="col-span-2 border-t border-gray-100 pt-3 space-y-2">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Bukti Bayar</p>
                      <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                        <img 
                          src={getImgUrl(selectedTransaction.buktiBayar)} 
                          alt="Bukti Bayar" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as any).src = 'https://placehold.co/400x300?text=Bukti+Bayar';
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div className="col-span-2 bg-gray-50 p-3 rounded-xl space-y-1 border border-gray-100">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Nama Tamu</p>
                    <p className="font-bold text-gray-900 text-base">{selectedTransaction.name || '-'}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">No. ID / ID Card</p>
                    <p className="font-semibold text-gray-800">{selectedTransaction.noId || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Payment Method</p>
                    <p className="font-semibold text-gray-800">{selectedTransaction.payment || '-'}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Check In</p>
                    <p className="font-medium text-gray-800">{selectedTransaction.checkIn || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Check Out</p>
                    <p className="font-medium text-gray-800">{selectedTransaction.checkOut || '-'}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Kamar / Room</p>
                    <p className="font-semibold text-gray-800">Room {selectedTransaction.room || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Durasi</p>
                    <p className="font-medium text-gray-800">{selectedTransaction.dur || '-'} Malam</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Email</p>
                    <p className="font-medium text-gray-800 truncate" title={selectedTransaction.email}>{selectedTransaction.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Phone</p>
                    <p className="font-medium text-gray-800">{selectedTransaction.phone || '-'}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Price/Night</p>
                    <p className="font-semibold text-gray-950">{formatIDR(selectedTransaction.price)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Total Amount</p>
                    <p className="font-bold text-emerald-600 text-base">{formatIDR(selectedTransaction.amount)}</p>
                  </div>

                  <div className="col-span-2 border-t border-gray-100 pt-3">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Keterangan</p>
                    <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-dashed border-gray-200 leading-relaxed">
                      {selectedTransaction.keterangan || 'Tidak ada keterangan tambahan.'}
                    </p>
                  </div>

                  {/* Photographic Identification View */}
                  <div className="col-span-2 border-t border-gray-100 pt-3 space-y-2">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Photo ID</p>
                    {selectedTransaction.photoId ? (
                      <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                        <img 
                          src={getImgUrl(selectedTransaction.photoId)} 
                          alt="Photo ID" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as any).src = 'https://placehold.co/400x300?text=Photo+ID+Preview';
                          }}
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">Tidak ada Photo ID dilampirkan.</p>
                    )}
                  </div>

                  {/* Transfer Payment View */}
                  {selectedTransaction.buktiTransfer && (
                    <div className="col-span-2 border-t border-gray-100 pt-3 space-y-2">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Bukti Transfer</p>
                      <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                        <img 
                          src={getImgUrl(selectedTransaction.buktiTransfer)} 
                          alt="Bukti Transfer" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as any).src = 'https://placehold.co/400x300?text=Bukti+Transfer';
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setSelectedTransaction(null)}
                  className={cn("text-white rounded-xl px-5 py-2 text-sm font-semibold transition-colors shadow-sm", selectedTransaction.isLionParcelTx ? "bg-emerald-600 hover:bg-emerald-700" : selectedTransaction.isBoganathaTx ? "bg-blue-600 hover:bg-blue-700" : "bg-indigo-600 hover:bg-indigo-700")}
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
