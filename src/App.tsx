import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { Dashboard } from './pages/Dashboard';
import { AllTasks } from './pages/AllTasks';
import { MyTask } from './pages/MyTask';
import { MyProfile } from './pages/MyProfile';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { TaskDetail } from './pages/TaskDetail';
import { ActivityDetail } from './pages/ActivityDetail';
import { Activities } from './pages/Activities';
import { Units } from './pages/Units';
import { UnitDetail } from './pages/UnitDetail';
import { Contacts } from './pages/Contacts';
import { Orders } from './pages/Orders';
import { OrderDetail } from './pages/OrderDetail';
import { UsersList } from './pages/Users';
import { UserDetail } from './pages/UserDetail';
import { Settings } from './pages/Settings';
import { Issues } from './pages/Issues';
import { IssueDetail } from './pages/IssueDetail';
import BoganathaTransactions from './pages/BoganathaTransactions';
import { DaftarBelanja } from './pages/DaftarBelanja';
import { DaftarDailyReport } from './pages/DaftarDailyReport';
import { DailyReportDetail } from './pages/DailyReportDetail';
import { LghDailyReport } from './pages/LghDailyReport';
import { LghForm } from './pages/LghForm';
import { Footer } from './components/Footer';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerClickFeedback, triggerNotificationFeedback, requestNotificationPermission, sendDeviceNotification } from './utils/feedback';
import { Bell, X, Check, Volume2, AlertCircle } from 'lucide-react';
import { getSheetData } from './lib/api';
import { LghGlobalNotification } from './components/LghGlobalNotification';

function TaskReviewNotification() {
  const [reviewTask, setReviewTask] = useState<any | null>(null);
  const navigate = useNavigate();

  const getShownNotifs = (): string[] => {
    try {
      const item = localStorage.getItem('mtask_shown_review_notifs');
      return item ? JSON.parse(item) : [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    const checkTasks = async () => {
      const email = (localStorage.getItem('mtask_user_email') || '').trim().toLowerCase();
      if (email !== 'adi.grinder.9@gmail.com') return;

      try {
        const res = await getSheetData('Task!A1:Z2000');
        if (res?.values?.length > 0) {
          const headers = res.values[0] as string[];
          const idIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TASK_ID' || h?.trim().toUpperCase() === 'ID');
          const titleIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TASK_NAME' || h?.trim().toUpperCase() === 'TASK NAME');
          const statusIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'STATUS');

          if (statusIdx > -1 && idIdx > -1) {
            // Find the most recent task with 'Review' status
            const reviewTasks = res.values.slice(1).map((row: any[]) => ({
              id: row[idIdx],
              title: titleIdx > -1 ? row[titleIdx] : 'Unknown Task',
              status: row[statusIdx]
            })).filter((t: any) => t.status?.trim().toLowerCase() === 'review' && t.id);

            if (reviewTasks.length > 0) {
              const latestTask = reviewTasks[reviewTasks.length - 1]; // Assume appended to end
              
              const shownNotifications = getShownNotifs();
              if (!shownNotifications.includes(latestTask.id)) {
                setReviewTask(latestTask);
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch tasks for notification', err);
      }
    };

    checkTasks();
    const interval = setInterval(checkTasks, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (reviewTask) {
      const shownNotifications = getShownNotifs();
      localStorage.setItem('mtask_shown_review_notifs', JSON.stringify([...shownNotifications, reviewTask.id]));
      setReviewTask(null);
    }
  };

  const handleClick = () => {
    if (reviewTask) {
      const shownNotifications = getShownNotifs();
      localStorage.setItem('mtask_shown_review_notifs', JSON.stringify([...shownNotifications, reviewTask.id]));
      navigate(`/tasks/${reviewTask.id}`);
      setReviewTask(null);
    }
  };

  return (
    <AnimatePresence>
      {reviewTask && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="absolute top-16 left-4 right-4 bg-yellow-50 rounded-2xl shadow-xl border border-yellow-200 p-4 z-[60] cursor-pointer"
          onClick={handleClick}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-gray-900">New Task To Review</h4>
              <p className="text-xs text-gray-600 mt-0.5 truncate">{reviewTask.title}</p>
            </div>
            <button
              onClick={handleDismiss}
              className="p-2 -mr-2 -mt-2 text-gray-400 hover:text-gray-600 hover:bg-yellow-100 rounded-full transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Pull-to-refresh & Swipe-to-go-back Wrapper
function AppLayout({ children }: { children: React.ReactNode }) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullY, setPullY] = useState(0);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  
  // Notification states
  const [hasPrompt, setHasPrompt] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  useEffect(() => {
    // Check if browser/device supports notifications and has defaulted permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const isDefault = Notification.permission === 'default';
      const userDismissed = sessionStorage.getItem('notif-prompt-dismissed') === 'true';
      if (isDefault && !userDismissed) {
        // Slightly delay the prompt for organic feel
        const timeout = setTimeout(() => {
          setHasPrompt(true);
        }, 1500);
        return () => clearTimeout(timeout);
      }
    }
  }, []);

  const handleEnableNotifications = async () => {
    const success = await requestNotificationPermission();
    if (success) {
      setHasPrompt(false);
      setTestSuccess(true);
      setTimeout(() => setTestSuccess(false), 4000);
    } else {
      // Permission might be denied or closed
      setHasPrompt(false);
    }
  };

  const handleDismissPrompt = () => {
    setHasPrompt(false);
    sessionStorage.setItem('notif-prompt-dismissed', 'true');
  };

  const navigate = useNavigate();

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const y = e.touches[0].clientY;
    const x = e.touches[0].clientX;
    const deltaY = y - touchStartY.current;
    const deltaX = x - touchStartX.current;

    // Pull to refresh (if at top)
    const scrollContainer = document.getElementById('scrollable-content');
    const scrollTop = scrollContainer ? scrollContainer.scrollTop : window.scrollY;
    
    if (scrollTop === 0 && deltaY > 0 && Math.abs(deltaY) > Math.abs(deltaX)) {
      setPullY(Math.min(deltaY * 0.4, 60)); // dampen and cap at 60px
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (pullY > 50) {
      setRefreshing(true);
      // Emit a custom root sync event that components can listen to
      window.dispatchEvent(new Event('appDataSyncRequest'));
      setTimeout(() => {
        setRefreshing(false);
        setPullY(0);
      }, 1000);
    } else {
      setPullY(0);
    }
  };

  return (
    <div 
      className="max-w-md mx-auto relative bg-white h-[100dvh] shadow-2xl overflow-hidden flex flex-col" 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <TaskReviewNotification />
      {/* 1. Device Notification Invitation Banner */}
      <AnimatePresence>
        {hasPrompt && (
          <motion.div 
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="absolute top-3 left-3 right-3 bg-gradient-to-r from-[#429dbb] via-blue-600 to-indigo-600 rounded-2xl shadow-xl z-50 p-4 border border-white/10 text-white"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center shrink-0 shadow-inner">
                <Bell className="w-5 h-5 text-white animate-bounce" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold tracking-tight">Aktifkan Notifikasi HP 📱</h4>
                <p className="text-[11px] text-blue-100 leading-normal mt-0.5">
                  Izinkan aplikasi ini mengirim suara ringtone, haptic getar, & push info langsung ke smartphone Anda!
                </p>
                <div className="flex items-center gap-1.5 mt-3">
                  <button 
                    onClick={handleEnableNotifications}
                    className="bg-white text-blue-600 font-bold text-[11px] px-3.5 py-1.5 rounded-lg active:scale-95 shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3px]" />
                    Ya, Aktifkan
                  </button>
                  <button 
                    onClick={handleDismissPrompt}
                    className="bg-black/20 text-white font-medium text-[11px] px-3 py-1.5 rounded-lg active:scale-95 border border-white/10 hover:bg-black/30 transition-all cursor-pointer"
                  >
                    Nanti Saja
                  </button>
                </div>
              </div>
              <button 
                onClick={handleDismissPrompt}
                className="text-white/75 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Success Test Notification Feedback Banner */}
      <AnimatePresence>
        {testSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-3 left-3 right-3 bg-emerald-600 rounded-2xl shadow-lg z-50 p-3 px-3.5 flex items-center gap-3 border border-emerald-500/20 text-white"
          >
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
              <Volume2 className="w-4 h-4 text-white" />
            </div>
            <p className="flex-1 leading-snug text-[10.5px]">
              Notifikasi & Suara Getar aktif! Klik tombol di samping untuk coba tes native push.
            </p>
            <button 
              onClick={() => {
                sendDeviceNotification('Notifikasi Lovissa Group 🔔', 'Hebat! Ini adalah simulasi push notification langsung di hp Anda.');
              }}
              className="bg-white text-emerald-600 text-[10.5px] font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-50 active:scale-95 transition-all text-center shrink-0 cursor-pointer shadow-sm"
            >
              Tes Kirim
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div 
        className="absolute top-0 left-0 right-0 flex justify-center items-center overflow-hidden transition-all duration-200 z-50"
        style={{ height: pullY, opacity: pullY / 60 }}
      >
        <RefreshCw className={cn("text-blue-500 w-5 h-5", refreshing && "animate-spin")} />
      </div>
      
      <div 
        className="flex-1 overflow-y-auto"
        id="scrollable-content"
        style={{ 
          transform: (refreshing || pullY > 0) ? `translateY(${refreshing ? 60 : pullY}px)` : 'none', 
          transition: refreshing ? 'transform 0.3s' : 'none' 
        }}
      >
        {children}
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component<any, any> {
  state: any;
  props: any;

  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-red-100 p-6 text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Aplikasi Mengalami Masalah</h2>
            <p className="text-xs text-gray-600 mb-4">
              Terjadi kesalahan rendering. Silakan muat ulang halaman ini atau kembali ke Dashboard.
            </p>
            <div className="bg-red-50 rounded-xl p-3 text-left mb-4 max-h-48 overflow-y-auto border border-red-100">
              <p className="text-xs font-mono text-red-700 whitespace-pre-wrap font-semibold">
                {this.state.error?.message || "Kesalahan tidak diketahui"}
              </p>
              {this.state.error?.stack && (
                <p className="text-[10px] font-mono text-red-500 mt-2 whitespace-pre-wrap opacity-80 leading-relaxed">
                  {this.state.error.stack}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = "/";
                }}
                className="flex-1 bg-gray-100 text-gray-700 font-semibold text-xs py-2.5 rounded-xl hover:bg-gray-200 transition-all"
              >
                Reset Cache & Home
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-blue-600 text-white font-semibold text-xs py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-500/10"
              >
                Muat Ulang
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function PageTransitions() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      {/* @ts-ignore */}
      <Routes location={location} key={location.pathname || 'root'}>
        <Route path="/" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><Dashboard /></motion.div>} />
        <Route path="/all-tasks" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><AllTasks /></motion.div>} />
        <Route path="/tasks" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><MyTask /></motion.div>} />
        <Route path="/profile" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><MyProfile /></motion.div>} />
        <Route path="/settings" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><Settings /></motion.div>} />
        <Route path="/projects" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><Projects /></motion.div>} />
        <Route path="/projects/:id" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><ProjectDetail /></motion.div>} />
        <Route path="/tasks/:id" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><TaskDetail /></motion.div>} />
        <Route path="/activities" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><Activities /></motion.div>} />
        <Route path="/activities/:id" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><ActivityDetail /></motion.div>} />
        <Route path="/units" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><Units /></motion.div>} />
        <Route path="/units/:id" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><UnitDetail /></motion.div>} />
        <Route path="/contacts" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><Contacts /></motion.div>} />
        <Route path="/orders" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><Orders /></motion.div>} />
        <Route path="/orders/:id" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><OrderDetail /></motion.div>} />
        <Route path="/users" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><UsersList /></motion.div>} />
        <Route path="/users/:id" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><UserDetail /></motion.div>} />
        <Route path="/issues" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><Issues /></motion.div>} />
        <Route path="/issues/:id" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><IssueDetail /></motion.div>} />
        <Route path="/boganatha-transactions" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><BoganathaTransactions /></motion.div>} />
        <Route path="/daftar-belanja" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><DaftarBelanja /></motion.div>} />
        <Route path="/daftar-daily-report" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><DaftarDailyReport /></motion.div>} />
        <Route path="/daily-report/:id" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><DailyReportDetail /></motion.div>} />
        <Route path="/lgh-daily-report" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><LghDailyReport /></motion.div>} />
        <Route path="/lgh-form" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><LghForm /></motion.div>} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  useEffect(() => {
    // 1. Global Interceptor for click sound and vibration
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // Find if clicking an interactive element
      const interactive = target.closest('button, a, input, select, textarea, [role="button"], .cursor-pointer, .clickable');
      if (interactive) {
        triggerClickFeedback();
      }
    };

    // 2. Wrap window.alert to automatically play notification feedback
    const originalAlert = window.alert;
    window.alert = function (message) {
      triggerNotificationFeedback();
      originalAlert(message);
    };

    window.addEventListener('click', handleGlobalClick, { capture: true, passive: true });
    
    return () => {
      window.removeEventListener('click', handleGlobalClick, { capture: true });
      window.alert = originalAlert; // Restore on unmount
    };
  }, []);

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AppLayout>
          <PageTransitions />
          <LghGlobalNotification />
        </AppLayout>
        <Footer />
      </ErrorBoundary>
    </BrowserRouter>
  );
}
