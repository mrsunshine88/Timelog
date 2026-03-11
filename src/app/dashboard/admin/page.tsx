'use client';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { UserManagement } from './components/user-management';
import { PayrollManagement } from './components/payroll-management';
import { ContractGeneration } from './components/contract-generation';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { AdminNotifications } from './components/admin-notifications';

export default function AdminPage() {
  const { user, profile, isUserLoading } = useUser();
  const router = useRouter();

  const isSuperAdmin = profile?.employeeId === '64112';
  const hasGenericAdminAccess = profile && Object.values(profile.permissions ?? {}).some(p => p === true);
  const hasAdminAccess = isSuperAdmin || hasGenericAdminAccess;

  // Redirect if user is not authenticated or not an admin
  useEffect(() => {
    if (!isUserLoading && (!user || !hasAdminAccess)) {
      router.push('/dashboard/reports');
    }
  }, [user, profile, isUserLoading, router, hasAdminAccess]);


  if (isUserLoading || !user || !hasAdminAccess) {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    );
  }

  const canHandleUsers = isSuperAdmin || profile?.permissions?.handleUsers;
  const canApprovePayroll = isSuperAdmin || profile?.permissions?.approvePayroll;
  const canGenerateContracts = isSuperAdmin || profile?.permissions?.generateContracts;
  
  const defaultTab = canHandleUsers ? "users" : (canApprovePayroll ? "payroll" : (canGenerateContracts ? "contracts" : undefined));

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Adminpanel</h2>
      </div>
      <AdminNotifications />
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="flex-wrap h-auto justify-start">
          {canHandleUsers && <TabsTrigger value="users">Användarhantering</TabsTrigger>}
          {canApprovePayroll && <TabsTrigger value="payroll">Lönehantering</TabsTrigger>}
          {canGenerateContracts && <TabsTrigger value="contracts">Generera Avtal</TabsTrigger>}
        </TabsList>
        {canHandleUsers && <TabsContent value="users" className="space-y-4">
          <UserManagement />
        </TabsContent>}
        {canApprovePayroll && <TabsContent value="payroll">
          <PayrollManagement />
        </TabsContent>}
        {canGenerateContracts && <TabsContent value="contracts">
          <ContractGeneration />
        </TabsContent>}
      </Tabs>
    </div>
  );
}
