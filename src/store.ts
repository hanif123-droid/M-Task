import { create } from 'zustand';

interface UserProfile {
  name: string;
  fullName: string;
  ktaId: string;
  unitBusiness: string;
  email: string;
  whatsapp: string;
  address: string;
  joinDate: string;
  avatarUrl: string;
}

interface Task {
  id: string;
  title: string;
  status: 'ToDo' | 'Review' | 'Done';
  dueDate: string;
}

interface AppState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
  offline: boolean;
  setOffline: (offline: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  theme: 'light', // explicitly required by user: "dukungan mode Terang"
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  profile: null,
  setProfile: (profile) => set({ profile }),
  offline: !navigator.onLine,
  setOffline: (offline) => set({ offline }),
}));
