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
import { Issues } from './pages/Issues';
import { LghForm } from './pages/LghForm';
import BoganathaTransactions from './pages/BoganathaTransactions';
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
        <Route path="/issues" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><Issues /></motion.div>} />
        <Route path="/lgh-form" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><LghForm /></motion.div>} />
        <Route path="/boganatha-transactions" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}><BoganathaTransactions /></motion.div>} />
      </Routes>
    </AnimatePresence>
  );
}

import { getSheetDataAnonymously } from './lib/api';

export default function App() {
  interface UserFromSheet {
    email: string;
    password?: string;
  }

  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [usersFromSheet, setUsersFromSheet] = useState<UserFromSheet[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Load all user options from the User Google Sheet
  useEffect(() => {
    let active = true;
    async function loadUsers() {
      setIsLoadingUsers(true);
      try {
        const res = await getSheetDataAnonymously('User!A1:Z1000').catch(() => null);
        if (res?.values?.length > 0 && active) {
          const headers = res.values[0] as string[];
          const emailIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'EMAIL');
          const passIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PASSWORD' || h?.trim().toUpperCase() === 'PASS');
          
          if (emailIdx > -1 && passIdx > -1) {
            const list: UserFromSheet[] = [];
            res.values.slice(1).forEach((row: any[]) => {
              const email = row[emailIdx]?.trim() || '';
              const password = row[passIdx]?.trim() || '';
              if (email) {
                list.push({ email, password });
              }
            });
            setUsersFromSheet(list);
          }
        }
      } catch (err) {
        console.error('Failed to load user options', err);
      } finally {
        if (active) setIsLoadingUsers(false);
      }
    }

    loadUsers();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const isBypassed = localStorage.getItem('mtask_auth_bypass') === 'true';
    const unsub = initAuth(
      (user) => { 
        if (user?.email) {
          localStorage.setItem('mtask_user_email', user.email);
        }
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

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const res = await googleSignIn();
      if (res && res.user?.email) {
        localStorage.setItem('mtask_user_email', res.user.email);
        setNeedsAuth(false);
      }
    } catch(e) {
      console.error(e);
      setLoginError('Google Sign-In failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzErkVjCuNiLOyTt8JMe0EecsBA-ukzS47n01U5w18C8NwHVN45njADa52G1brHXv0P/exec";

  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpEmail || !signUpPassword) {
      setLoginError('Email dan Password wajib diisi.');
      return;
    }
    if (signUpPassword.length < 6) {
      setLoginError('Password minimal 6 karakter.');
      return;
    }
    
    setIsLoggingIn(true);
    setLoginError('');
    setAuthSuccess('');
    
    try {
      const formParams = new URLSearchParams();
      formParams.append("action", "signup");
      formParams.append("email", signUpEmail);
      formParams.append("password", signUpPassword);

      const res = await fetch(SCRIPT_URL, {
        method: "POST",
        body: formParams,
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });
      
      const data = await res.json();
      if (data.success) {
        setAuthSuccess('Pendaftaran berhasil! Silakan Sign In.');
        setEmailInput(signUpEmail);
        setPasswordInput('');
        setTimeout(() => {
          setActiveTab('signin');
          setAuthSuccess('');
        }, 2000);
      } else {
        setLoginError(data.message || 'Pendaftaran gagal.');
      }
    } catch (err) {
      setLoginError('Koneksi ke Apps Script gagal. Pastikan fungsi doPost telah ditambahkan dan di-deploy ulang.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      setLoginError('Email dan Password wajib diisi.');
      return;
    }
    
    setIsLoggingIn(true);
    setLoginError('');
    setAuthSuccess('');
    try {
      // Prioritize the Apps Script API if available
      try {
        const formParams = new URLSearchParams();
        formParams.append("action", "login");
        formParams.append("email", emailInput);
        formParams.append("password", passwordInput);

        const res = await fetch(SCRIPT_URL, {
          method: "POST",
          body: formParams,
          headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });
        
        const data = await res.json();
        if (data.success) {
          localStorage.setItem('mtask_auth_bypass', 'true');
          localStorage.setItem('mtask_user_email', data.user.email);
          setNeedsAuth(false);
          return;
        } else {
          setLoginError(data.message || 'Email atau password salah.');
          setIsLoggingIn(false);
          return;
        }
      } catch (scriptErr) {
         // Fallback to local sheets fetch if Apps script POST fails (e.g. they haven't added doPost yet)
         console.warn("Apps Script POST failed, falling back to local sheet fetch", scriptErr);
      }

      // 1. Try matching with preloaded usersFromSheet first for high performance
      if (usersFromSheet.length > 0) {
        const localMatched = usersFromSheet.find(u => u.email.trim().toLowerCase() === emailInput.trim().toLowerCase());
        if (localMatched) {
          if (localMatched.password?.trim() === passwordInput.trim()) {
            localStorage.setItem('mtask_auth_bypass', 'true');
            localStorage.setItem('mtask_user_email', localMatched.email.trim());
            setNeedsAuth(false);
            return;
          } else {
            setLoginError('Email atau password salah.');
            return;
          }
        }
      }

      // 2. Fetch live data if not found in preloaded or preloaded was empty
      const res = await getSheetDataAnonymously('User!A1:Z1000').catch(() => null);
      if (res?.values?.length > 0) {
        const headers = res.values[0] as string[];
        const emailIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'EMAIL');
        const passIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'PASSWORD' || h?.trim().toUpperCase() === 'PASS');

        if (emailIdx === -1 || passIdx === -1) {
          setLoginError('Format tabel User tidak sesuai (butuh kolom Email & Password).');
          return;
        }

        const userRow = res.values.slice(1).find((row: any[]) => row[emailIdx]?.trim()?.toLowerCase() === emailInput.trim().toLowerCase());
        
        if (userRow) {
          if (userRow[passIdx]?.trim() === passwordInput.trim()) {
            localStorage.setItem('mtask_auth_bypass', 'true');
            localStorage.setItem('mtask_user_email', userRow[emailIdx].trim());
            setNeedsAuth(false);
          } else {
            setLoginError('Email atau password salah.');
          }
        } else {
          setLoginError('Email tidak ditemukan.');
        }
      } else {
        setLoginError('Gagal memproses login karena data pengguna tidak tersedia.');
      }
    } catch (err) {
      setLoginError('Gagal melakukan login. Periksa koneksi atau hubungi admin.');
      console.error(err);
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
        <p className="text-gray-500 mb-8 text-sm max-w-xs mx-auto">Sign in to access your dashboard, tasks, and projects.</p>
        
        <div className="w-full max-w-sm">
          <div className="flex p-1 bg-gray-200/50 rounded-2xl mb-6">
            <button 
              onClick={() => setActiveTab('signin')} 
              className={cn("flex-1 py-2 text-sm font-semibold rounded-xl transition-all", activeTab === 'signin' ? "bg-white text-[#429dbb] shadow-sm" : "text-gray-500 hover:text-gray-900")}
            >
              Sign In
            </button>
            <button 
              onClick={() => setActiveTab('signup')} 
              className={cn("flex-1 py-2 text-sm font-semibold rounded-xl transition-all", activeTab === 'signup' ? "bg-white text-[#2a9d8f] shadow-sm" : "text-gray-500 hover:text-gray-900")}
            >
              Sign Up
            </button>
          </div>

          {authSuccess && (
             <div className="p-3 bg-green-50 border border-green-100 text-green-700 text-sm rounded-xl mb-4 text-left flex items-start gap-2">
               <CheckSquare className="w-4 h-4 mt-0.5" />
               <p>{authSuccess}</p>
             </div>
          )}
          {loginError && (
             <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl mb-4 text-left">
               {loginError}
             </div>
          )}

          {activeTab === 'signin' ? (
            <form onSubmit={handleEmailLogin} className="space-y-4 mb-6 text-left">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Email</label>
                <input 
                  type="email" 
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  placeholder="Masukkan email Anda" 
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#429dbb] focus:border-[#429dbb] outline-none text-sm bg-white text-gray-800 font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Password</label>
                <input 
                  type="password" 
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full border border-gray-300 bg-white text-gray-800 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#429dbb] focus:border-[#429dbb] outline-none text-sm font-medium"
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-[#429dbb] hover:bg-[#36829c] text-white font-semibold rounded-xl py-3 transition-colors disabled:opacity-50 mt-2"
              >
                {isLoggingIn ? 'Memproses...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4 mb-6 text-left">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">New Email</label>
                <input 
                  type="email" 
                  value={signUpEmail}
                  onChange={e => setSignUpEmail(e.target.value)}
                  placeholder="Masukkan email baru" 
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#2a9d8f] focus:border-[#2a9d8f] outline-none text-sm bg-white text-gray-800 font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Create Password</label>
                <input 
                  type="password" 
                  value={signUpPassword}
                  onChange={e => setSignUpPassword(e.target.value)}
                  placeholder="Minimal 6 karakter" 
                  minLength={6}
                  className="w-full border border-gray-300 bg-white text-gray-800 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#2a9d8f] focus:border-[#2a9d8f] outline-none text-sm font-medium"
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-[#2a9d8f] hover:bg-[#21867a] text-white font-semibold rounded-xl py-3 transition-colors disabled:opacity-50 mt-2"
              >
                {isLoggingIn ? 'Mendaftarkan...' : 'Sign Up Akun Baru'}
              </button>
            </form>
          )}

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">Or continue with</span>
            </div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
            className="w-full bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium shadow-sm flex items-center justify-center gap-3 transition-active hover:bg-gray-50 touch-manipulation disabled:opacity-50"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Sign in with Google
          </button>
        </div>
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
