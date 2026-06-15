import { 
  Home, 
  CheckSquare, 
  User as UserIcon 
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../lib/utils';

export function Footer() {
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
          <Home className="w-6 h-6" />
          <span>Dashboard</span>
        </NavLink>
        
        <NavLink 
          to="/tasks" 
          className={({ isActive }) => 
            cn("flex flex-col items-center justify-center w-full h-full text-xs font-medium space-y-1 transition-colors", 
            isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-900")
          }
        >
          <CheckSquare className="w-6 h-6" />
          <span>My Task</span>
        </NavLink>
        
        <NavLink 
          to="/profile" 
          className={({ isActive }) => 
            cn("flex flex-col items-center justify-center w-full h-full text-xs font-medium space-y-1 transition-colors", 
            isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-900")
          }
        >
          <UserIcon className="w-6 h-6" />
          <span>My Profile</span>
        </NavLink>
      </div>
    </div>
  );
}
