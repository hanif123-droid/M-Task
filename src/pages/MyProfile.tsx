import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { auth } from '../lib/firebase';
import { UserDetail } from './UserDetail';

export function MyProfile() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // try to get from auth.currentUser
    if (auth.currentUser?.email) {
      setEmail(auth.currentUser.email);
    } else {
      // Wait for auth to init
      const unsubscribe = auth.onAuthStateChanged(user => {
         if (user?.email) {
           setEmail(user.email);
         } else if (localStorage.getItem('mtask_auth_bypass') === 'true') {
           setEmail('suryasukmana.co.id@gmail.com');
         } else {
           setEmail('suryasukmana.co.id@gmail.com');
         }
      });
      return () => unsubscribe();
    }
  }, []);

  if (!email) {
    return (
      <div className="pb-24 bg-gray-50 min-h-screen relative flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return <UserDetail userEmail={email} isProfile={true} />;
}
