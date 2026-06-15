import { useState, useEffect } from 'react';
import { ArrowLeft, Filter, Search, X, Plus, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { getSheetData } from '../lib/api';

const MOCK_PROJECTS = [
  { id: '1', title: 'Website Revamp HQ', unit: 'HQ', status: 'On going', totalTasks: 10, completedTasks: 4 },
  { id: '2', title: 'Mobile App V2', unit: 'Branch A', status: 'Complete', totalTasks: 8, completedTasks: 8 },
  { id: '3', title: 'Marketing Campaign Q3', unit: 'HQ', status: 'On going', totalTasks: 5, completedTasks: 4 },
  { id: '4', title: 'System Upgrade', unit: 'IT Dept', status: 'On going', totalTasks: 20, completedTasks: 2 },
];

export function Projects() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [projects, setProjects] = useState<any[]>(MOCK_PROJECTS);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [unitFilter, setUnitFilter] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const unitRes = await getSheetData('Unit!A1:Z500').catch(() => null);
        const unitMap = new Map<string, string>();
        
        if (unitRes && unitRes.values && unitRes.values.length > 0) {
          const headers = unitRes.values[0] as string[];
          const idIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'ID');
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'UNIT NAME');
          
          if (idIdx > -1 && nameIdx > -1) {
            unitRes.values.slice(1).forEach((row: any[]) => {
              unitMap.set(row[idIdx]?.trim() || '', row[nameIdx]?.trim() || '');
            });
          }
        }

        const projRes = await getSheetData('Project!A1:Z1000').catch(() => null);
        const taskRes = await getSheetData('Task!A1:Z2000').catch(() => null);

        let taskMap = new Map<string, { total: number, done: number }>();
        if (taskRes && taskRes.values && taskRes.values.length > 0) {
          const headers = taskRes.values[0] as string[];
          const taskIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TASK ID');
          const projIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PROJECT' || h?.trim().toUpperCase() === 'PROJECT ID' || h?.trim().toUpperCase() === 'ID PROJECT');
          const statusIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'STATUS');
          
          if (projIdIdx > -1 && statusIdx > -1) {
            taskRes.values.slice(1).forEach((row: any[]) => {
              // Only count rows that have a Task ID if the column exists
              if (taskIdIdx > -1 && (!row[taskIdIdx] || !row[taskIdIdx].trim())) return;
              
              const pId = row[projIdIdx]?.trim() || '';
              const status = row[statusIdx]?.trim().toUpperCase() || '';
              if (!pId) return;
              
              if (!taskMap.has(pId)) {
                taskMap.set(pId, { total: 0, done: 0 });
              }
              const stats = taskMap.get(pId)!;
              stats.total++;
              if (status === 'DONE' || status === 'SELESAI') {
                stats.done++;
              }
            });
          }
        }

        if (projRes && projRes.values && projRes.values.length > 0) {
          const headers = projRes.values[0] as string[];
          const idIdx = headers.findIndex(h => {
             const key = h?.trim().toUpperCase();
             return key === 'PROJECT ID' || key === 'ID PROJECT' || key === 'ID';
          });
          const nameIdx = headers.findIndex(h => {
             const key = h?.trim().toUpperCase();
             return key === 'PROJECT NAME' || key === 'PROJECT TITLE' || key === 'NAME' || key === 'TITLE';
          });
          const statusIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'STATUS');
          
          const possibleUnitIdx = headers.findIndex(h => {
             const key = h?.trim().toUpperCase();
             return key === 'UNIT' || key === 'UNIT ID' || key === 'ID UNIT' || key === 'UNIT_ID';
          });

          if (idIdx > -1) {
            const fetchedProjects = projRes.values.slice(1).map((row: any[]) => {
              const id = row[idIdx]?.trim() || '';
              const unitId = possibleUnitIdx > -1 ? row[possibleUnitIdx]?.trim() : '';
              const taskStats = taskMap.get(id) || { total: 0, done: 0 };
              
              return {
                id,
                title: nameIdx > -1 ? (row[nameIdx] || id) : id,
                unit: unitMap.has(unitId) ? unitMap.get(unitId) : (unitId || 'Unknown Unit'),
                status: statusIdx > -1 ? (row[statusIdx] || 'Unknown') : 'Unknown',
                totalTasks: taskStats.total,
                completedTasks: taskStats.done
              };
            }).filter((p: any) => p.id);
            setProjects(fetchedProjects);
          } else {
            setProjects([]);
          }
        } else {
          setProjects([]);
        }
      } catch (error) {
        console.error('Failed to fetch data', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const units = Array.from(new Set(projects.map(p => p.unit)));

  const filteredProjects = projects.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter ? p.status === statusFilter : true;
    const matchUnit = unitFilter ? p.unit === unitFilter : true;
    return matchSearch && matchStatus && matchUnit;
  });

  const getStatusPriority = (status: string) => {
    const s = status.toLowerCase().trim();
    if (s.includes('not started') || s.includes('belum mulai')) return 1;
    if (s.includes('on going') || s.includes('ongoing')) return 2;
    if (s.includes('complete') || s.includes('done') || s.includes('selesai')) return 3;
    if (s.includes('cancel') || s.includes('batal')) return 4;
    return 5;
  };

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    return getStatusPriority(a.status) - getStatusPriority(b.status);
  });

  return (
    <div className="pb-24 bg-gray-50 min-h-screen relative">
      <header className="bg-[#429dbb] text-white px-5 py-4 shadow-md sticky top-0 z-50 w-full mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors shrink-0 cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-xl font-bold tracking-tight drop-shadow-sm">Daftar Project</h1>
      </header>

      <div className="px-4 mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="search" 
            placeholder="Cari project..." 
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
        {!isLoading && sortedProjects.map((project) => {
          const completionPercentage = Math.round((project.completedTasks / project.totalTasks) * 100) || 0;
          
          let cardBg = 'bg-white border-gray-100';
          let badgeBg = 'bg-gray-100 text-gray-700';
          let progressBg = 'bg-gray-500';
          
          const s = project.status.toLowerCase().trim();
          if (s.includes('not started') || s.includes('belum mulai')) {
            cardBg = 'bg-slate-50 border-slate-200';
            badgeBg = 'bg-slate-200 text-slate-800';
            progressBg = 'bg-slate-400';
          } else if (s.includes('on going') || s.includes('ongoing')) {
            cardBg = 'bg-blue-50 border-blue-200';
            badgeBg = 'bg-blue-200 text-blue-800';
            progressBg = 'bg-blue-500';
          } else if (s.includes('complete') || s.includes('done') || s.includes('selesai')) {
            cardBg = 'bg-green-50 border-green-200';
            badgeBg = 'bg-green-200 text-green-800';
            progressBg = 'bg-green-500';
          } else if (s.includes('cancel') || s.includes('batal')) {
            cardBg = 'bg-red-50 border-red-200';
            badgeBg = 'bg-red-200 text-red-800';
            progressBg = 'bg-red-500';
          }

          return (
            <motion.div 
              key={project.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate(`/projects/${project.id}`)}
              className={cn("rounded-xl shadow-sm border p-4 cursor-pointer active:scale-[0.98] transition-transform", cardBg)}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-semibold text-gray-900 leading-tight">{project.title}</h3>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 whitespace-nowrap",
                  badgeBg
                )}>
                  {project.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">{project.unit}</p>
              
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500 font-medium">{project.completedTasks}/{project.totalTasks} Tasks selesai</span>
                  <span className="font-bold text-gray-800">{completionPercentage}%</span>
                </div>
                <div className="h-2 w-full bg-gray-200/50 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-500", progressBg)}
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
        {sortedProjects.length === 0 && (
          <div className="text-center py-10">
             <p className="text-gray-500 text-sm">Tidak ada project yang ditemukan.</p>
          </div>
        )}
      </div>

      {/* FAB Add Project */}
      <button 
        onClick={() => setShowAddProject(true)}
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
                <h3 className="font-bold text-gray-900">Filter Project</h3>
                <button onClick={() => setShowFilter(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="p-4 space-y-6 max-h-[60vh] overflow-y-auto">
                {/* Status Filter */}
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

                {/* Unit Filter */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Unit</h4>
                  <div className="flex flex-wrap gap-2">
                    {units.map((unit) => (
                      <button
                        key={unit}
                        onClick={() => setUnitFilter(unitFilter === unit ? null : unit)}
                        className={cn(
                          "px-4 py-2 rounded-full text-sm font-medium border transition-all cursor-pointer",
                          unitFilter === unit 
                            ? "bg-blue-50 border-blue-200 text-blue-700" 
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 bg-white border-t border-gray-100 flex gap-3">
                <button 
                  onClick={() => {
                    setStatusFilter(null);
                    setUnitFilter(null);
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

      {/* Slide Up Add Project (BottomSheet) */}
      <AnimatePresence>
        {showAddProject && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddProject(false)}
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
                <h3 className="font-bold text-gray-900">Add New Project</h3>
                <button onClick={() => setShowAddProject(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Project Name</label>
                  <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter project name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Unit</label>
                  <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>HQ</option>
                    <option>Branch A</option>
                    <option>IT Dept</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
                  <textarea rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Optional description..." />
                </div>
              </div>

              <div className="p-4 bg-white border-t border-gray-100">
                <button 
                  onClick={() => setShowAddProject(false)}
                  className="w-full py-3 px-4 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                >
                  Create Project
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
