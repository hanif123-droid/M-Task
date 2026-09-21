import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Clock, ChevronRight, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn, formatImageUrl } from '../lib/utils';
import { supabase } from '../lib/supabaseAuth';
import { getSheetData } from '../lib/api';
import { resolveActivityTarget } from '../lib/activityNavigator';

export function Activities() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<any[]>([]);
  const [userMap, setUserMap] = useState<Map<string, { name: string; avatar: string }>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [actRes, userRes] = await Promise.all([
          supabase
            .from('app_activities')
            .select('*')
            .order('created_at', { ascending: false }),
          getSheetData('User!A1:Z1000').catch(() => null)
        ]);

        if (actRes.error) {
          console.error("Error fetching activities:", actRes.error);
        } else {
          setActivities(actRes.data || []);
        }

        if (userRes?.values && userRes.values.length > 0) {
          const headers = userRes.values[0] as string[];
          const emailIdx = headers.findIndex((h) => (h || '').trim().toUpperCase() === 'EMAIL');
          const nameIdx = headers.findIndex((h) => (h || '').trim().toUpperCase() === 'NAME');
          const avatarIdx = headers.findIndex(
            (h) => (h || '').trim().toUpperCase() === 'AVATAR' || (h || '').trim().toUpperCase() === 'PHOTO'
          );

          const map = new Map<string, { name: string; avatar: string }>();
          if (emailIdx > -1 && nameIdx > -1) {
            userRes.values.slice(1).forEach((row: any[]) => {
              const email = row[emailIdx]?.toString().trim().toLowerCase() || '';
              const name = row[nameIdx]?.toString().trim() || '';
              const avatar = avatarIdx > -1 ? formatImageUrl(row[avatarIdx]?.toString().trim() || '') : '';
              if (email && name) {
                map.set(email, { name, avatar });
                // Also map prefix e.g. abdhan1000 -> name
                if (email.includes('@')) {
                  map.set(email.split('@')[0], { name, avatar });
                }
              }
            });
          }
          setUserMap(map);
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();

    // Supabase Realtime Listener
    const channel = supabase
      .channel('public:app_activities')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'app_activities' }, 
        (payload) => {
          console.log('New activity received!', payload);
          setActivities((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getUserInfo = (emailStr: string) => {
    if (!emailStr) return { displayName: 'User', avatarUrl: `https://ui-avatars.com/api/?name=User&background=eff6ff&color=3b82f6` };
    const clean = emailStr.trim().toLowerCase();
    
    let matched = userMap.get(clean);
    if (!matched && clean.includes('@')) {
      matched = userMap.get(clean.split('@')[0]);
    }
    
    const displayName = matched?.name || (emailStr.includes('@') ? emailStr.split('@')[0] : emailStr);
    const avatarUrl = matched?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=eff6ff&color=3b82f6`;
    return { displayName, avatarUrl };
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-24 relative">
      <header className="bg-white px-5 py-4 sticky top-0 z-30 flex items-center justify-between border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">Activities</h1>
            <p className="text-xs text-gray-500 font-medium tracking-wide">Live Feed</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-sm">
            Belum ada aktivitas terekam.
          </div>
        ) : (
          activities.map((act) => {
            const { displayName, avatarUrl } = getUserInfo(act.user_email);
            const target = resolveActivityTarget(act);
            return (
              <motion.div 
                key={act.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate(target.path)}
                className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100/90 flex flex-col gap-3 transition-all hover:border-indigo-200 hover:shadow-md active:scale-[0.99] cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <img 
                      src={avatarUrl} 
                      alt={displayName} 
                      className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-xs shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm truncate group-hover:text-indigo-600 transition-colors">
                        {displayName}
                      </h3>
                      <p className="text-xs font-medium text-indigo-600 truncate">{act.module} • {act.action_type}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 bg-indigo-50/80 group-hover:bg-indigo-600 text-indigo-600 group-hover:text-white px-2.5 py-1 rounded-xl text-xs font-semibold transition-all">
                    <span>{target.badge || 'Lihat'}</span>
                    <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
                
                <div className="bg-gray-50/80 group-hover:bg-indigo-50/20 p-3 rounded-xl border border-gray-100/80 group-hover:border-indigo-100 text-sm text-gray-700 transition-colors">
                  {act.details}
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-400 font-medium pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>{new Date(act.created_at).toLocaleString('id-ID')}</span>
                  </div>
                  <span className="text-[11px] text-indigo-500 font-semibold group-hover:underline flex items-center gap-0.5">
                    Buka {target.label} →
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
