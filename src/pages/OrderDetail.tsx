import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

export function OrderDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  return (
    <div className="pb-24 bg-gray-50 min-h-screen">
      <header className="bg-[#429dbb] text-white px-5 py-4 shadow-md sticky top-0 z-50 w-full flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors shrink-0">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-xl font-bold tracking-tight drop-shadow-sm truncate">Detail Order</h1>
      </header>
      <div className="p-4 flex flex-col items-center justify-center mt-10">
        <p className="text-gray-500 font-medium">Order Detail for ID: {id}</p>
        <p className="text-gray-400 text-sm mt-2">Halaman sedang dalam pengembangan</p>
      </div>
    </div>
  );
}
