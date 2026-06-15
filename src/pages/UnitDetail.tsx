import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Building2, Users, FileText, CheckCircle2, AlertCircle, TrendingUp, DollarSign, Briefcase, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { getSheetData } from '../lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

function formatIDR(amount: number | string) {
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/\D/g, '')) || 0 : amount;
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
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

  // Chart filter
  const [chartFilter, setChartFilter] = useState('Month'); // Year, Month, Day

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

      } catch (error) {
        console.error('Data fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [id]);

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
              <span className="text-lg font-bold text-gray-900">{formatIDR(revenue)}</span>
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
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData}>
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
    </div>
  );
}
