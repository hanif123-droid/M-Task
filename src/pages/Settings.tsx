import { ArrowLeft, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';

export function Settings() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      localStorage.removeItem('mtask_auth_bypass');
      await auth.signOut();
      navigate('/'); // Usually App.tsx automatically handles auth state change
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="pb-24 bg-gray-50 min-h-screen relative font-sans">
      <header className="bg-[#429dbb] text-white px-5 py-4 shadow-md sticky top-0 z-50 w-full mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors shrink-0 cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-xl font-bold tracking-tight drop-shadow-sm truncate">Settings</h1>
      </header>

      <div className="px-4 space-y-4 max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 overflow-hidden">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-4 text-left text-red-600 hover:bg-red-50 transition-colors font-medium rounded-xl"
          >
            <LogOut className="w-5 h-5" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
