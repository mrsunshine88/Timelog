'use client';

import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { ChangePasswordForm } from './components/change-password-form';
import { ProfileForm } from './components/profile-form';
import { EmploymentInfo } from './components/employment-info';

export default function SettingsPage() {
  const { user, profile, isUserLoading } = useUser();

  if (isUserLoading || !profile || !user) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Inställningar</h2>
      </div>
      <div className="grid gap-8">
        <ChangePasswordForm />
        <ProfileForm initialData={profile} userId={user.uid} />
        <EmploymentInfo profile={profile} />
      </div>
    </div>
  );
}
