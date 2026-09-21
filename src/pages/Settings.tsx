import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Settings() {
  const navigate = useNavigate();

  return (
    <div className="pb-24 bg-gray-50 min-h-screen relative font-sans">
      <header className="bg-[#429dbb] text-white px-5 py-4 shadow-md sticky top-0 z-50 w-full mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors shrink-0 cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-xl font-bold tracking-tight drop-shadow-sm truncate">Settings</h1>
      </header>

      <div className="px-4 space-y-4 max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center text-gray-500">
           Tidak ada pengaturan tersedia saat ini.
        </div>
      </div>
    </div>
  );
}
