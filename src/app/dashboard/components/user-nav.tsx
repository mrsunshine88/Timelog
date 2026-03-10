'use client';

import { Button } from '@/components/ui/button';
import { Settings, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';

export function UserNav() {
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/settings">
          <Settings />
          Inställningar
        </Link>
      </Button>
      <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut />
          Logga ut
      </Button>
    </div>
  );
}
