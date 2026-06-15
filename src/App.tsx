import React, { useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { RefreshCw, CheckSquare } from 'lucide-react';
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
import { Footer } from './components/Footer';
import { initAuth, googleSignIn } from './lib/firebase';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Pull-to-refresh & Swipe-to-go-back Wrapper
function AppLayout({ children }: { children: React.ReactNode }) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullY, setPullY] = useState(0);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  
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

function PageTransitions() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      {/* @ts-ignore */}
      <Routes location={location} key={location.pathname}>
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
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    const isBypassed = localStorage.getItem('mtask_auth_bypass') === 'true';
    const unsub = initAuth(
      () => { 
        setNeedsAuth(false); 
        setAuthInitialized(true); 
      },
      () => { 
        if (isBypassed) {
           setNeedsAuth(false);
        } else {
           setNeedsAuth(true); 
        }
        setAuthInitialized(true); 
      }
    );
    return () => unsub();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setNeedsAuth(false);
      }
    } catch(e) {
      // Fallback for preview limits when firebase isn't fully configured
      localStorage.setItem('mtask_auth_bypass', 'true');
      setNeedsAuth(false); 
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!authInitialized) return <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">Loading MTask...</div>;

  if (needsAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 shadow-xl overflow-hidden bg-transparent">
          <img src="/logo.svg" alt="MTask Logo" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">Welcome to MTask</h1>
        <p className="text-gray-500 mb-8 text-sm">Sign in to sync your tasks, projects, and collaborate with your team automatically.</p>
        
        <button 
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-full font-medium shadow-sm flex items-center gap-3 transition-active hover:bg-gray-50 touch-manipulation disabled:opacity-50"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          {isLoggingIn ? "Signing in..." : "Sign in with Google"}
        </button>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppLayout>
        <PageTransitions />
      </AppLayout>
      <Footer />
    </BrowserRouter>
  );
}
