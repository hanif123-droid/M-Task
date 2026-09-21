import { useState, useEffect } from 'react';
import { 
  Home, 
  CheckSquare, 
  User as UserIcon 
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn, formatImageUrl } from '../lib/utils';

export function Footer() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => {
    return localStorage.getItem('mtask_user_avatar') ? formatImageUrl(localStorage.getItem('mtask_user_avatar')!) : null;
  });

  useEffect(() => {
    const handleUserChange = () => {
      const storedAvatar = localStorage.getItem('mtask_user_avatar');
      setAvatarUrl(storedAvatar ? formatImageUrl(storedAvatar) : null);
    };

    window.addEventListener('mtask_user_changed', handleUserChange);
    window.addEventListener('storage', handleUserChange);

    return () => {
      window.removeEventListener('mtask_user_changed', handleUserChange);
      window.removeEventListener('storage', handleUserChange);
    };
  }, []);

  return (
    <div className="fixed bottom-0 w-full max-w-md left-1/2 -translate-x-1/2 z-50 bg-white border-t border-gray-200 safe-area-bottom pb-2">
      <div className="flex justify-around items-center h-16">
        <NavLink 
          to="/" 
          className={({ isActive }) => 
            cn("flex flex-col items-center justify-center w-full h-full text-xs font-medium space-y-1 transition-colors", 
            isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-900")
          }
        >
          {({ isActive }) => (
            <>
              <img 
                src="https://unhwnznhwltgpyzdzfah.supabase.co/storage/v1/object/public/Mtask/logo%20icon%26avatar%20user/LOGO%20FORM/LOGO%20dashboard.png" 
                alt="Dashboard" 
                className={cn("w-6 h-6 object-contain", isActive ? "" : "grayscale opacity-70")}
                referrerPolicy="no-referrer"
              />
              <span>Dashboard</span>
            </>
          )}
        </NavLink>
        
        <NavLink 
          to="/tasks" 
          className={({ isActive }) => 
            cn("flex flex-col items-center justify-center w-full h-full text-xs font-medium space-y-1 transition-colors", 
            isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-900")
          }
        >
          {({ isActive }) => (
            <>
              <img 
                src="https://unhwnznhwltgpyzdzfah.supabase.co/storage/v1/object/public/Mtask/logo%20icon%26avatar%20user/LOGO%20FORM/LOGO%20my%20task.png" 
                alt="My Task" 
                className={cn("w-6 h-6 object-contain", isActive ? "" : "grayscale opacity-70")}
                referrerPolicy="no-referrer"
              />
              <span>My Task</span>
            </>
          )}
        </NavLink>
        
        <NavLink 
          to="/profile" 
          className={({ isActive }) => 
            cn("flex flex-col items-center justify-center w-full h-full text-xs font-medium space-y-1 transition-colors", 
            isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-900")
          }
        >
          {({ isActive }) => (
            <>
              {avatarUrl && avatarUrl.trim() !== '' ? (
                <img 
                  referrerPolicy="no-referrer"
                  src={avatarUrl} 
                  alt="My Avatar" 
                  className={cn(
                    "w-6 h-6 rounded-full object-cover border",
                    isActive ? "border-blue-600" : "border-gray-200"
                  )} 
                />
              ) : (
                <UserIcon className="w-6 h-6" />
              )}
              <span>My Profile</span>
            </>
          )}
        </NavLink>
      </div>
    </div>
  );
}
