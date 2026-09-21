import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { UserDetail } from './UserDetail';

export function MyProfile() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const savedEmail = localStorage.getItem('mtask_user_email');
    if (savedEmail) {
      setEmail(savedEmail);
    } else {
      // Fallback
      setEmail('designify.creative7@gmail.com');
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
