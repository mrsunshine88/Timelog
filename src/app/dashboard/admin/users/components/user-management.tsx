'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, UserPlus, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirebase, useMemoFirebase, useUser } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { collection, query } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useMemo } from 'react';


export function UserManagement() {
  const { firestore } = useFirebase();
  const { profile: userProfile, isUserLoading: isAuthLoading } = useUser();

  const isSuperAdmin = userProfile?.employeeId === '64112';
  const hasPermission = isSuperAdmin || userProfile?.permissions?.handleUsers;

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !hasPermission) return null;
    return query(collection(firestore, 'profiles'));
  }, [firestore, hasPermission]);

  const { data: users, isLoading: isLoadingUsers, error: usersError } = useCollection<UserProfile>(usersQuery);

    const sortedUsers = useMemo(() => {
        if (!users) {
            return [];
        }
        return [...users].sort((a, b) => (a.firstName + a.lastName).localeCompare(b.firstName + b.lastName));
    }, [users]);


  if (isAuthLoading) {
    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </CardContent>
        </Card>
    );
  }

  if (!hasPermission) {
      return (
          <Card>
              <CardHeader>
                  <CardTitle>Användare</CardTitle>
              </CardHeader>
              <CardContent>
                  <p className='text-muted-foreground'>Du har inte behörighet att hantera användare.</p>
              </CardContent>
          </Card>
      )
  }

  if (usersError) {
    return (
        <Card>
            <CardHeader>
              <CardTitle>Användare</CardTitle>
            </CardHeader>
            <CardContent>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Fel vid hämtning av användare</AlertTitle>
                    <AlertDescription>
                        Kunde inte ladda användarlistan. Detta beror troligen på ett behörighetsproblem. Säkerställ att dina Firestore-regler tillåter administratörer att lista användarprofiler.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    )
  }

  return (
    <div className="space-y-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1.5">
              <CardTitle>Användare</CardTitle>
              <CardDescription>
                Hantera alla användarkonton i systemet.
              </CardDescription>
            </div>
            <Button asChild>
              <Link href="/dashboard/admin/users/new">
                <UserPlus className="mr-2 h-4 w-4" />
                Skapa ny användare
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingUsers && !users ? (
                <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : sortedUsers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Namn</TableHead>
                    <TableHead>Användar-ID</TableHead>
                    <TableHead>Roll</TableHead>
                    <TableHead className="text-right">Åtgärder</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell>{user.employeeId}</TableCell>
                      <TableCell>
                        <Badge variant={Object.values(user.permissions || {}).some(p => p) || user.employeeId === '64112' ? 'default' : 'secondary'}>
                          {Object.values(user.permissions || {}).some(p => p) || user.employeeId === '64112' ? 'Admin' : 'User'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href={`/dashboard/admin/users/${user.id}`}>
                                <Pencil className="h-4 w-4" />
                            </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
                <div className="p-4 text-center text-sm text-muted-foreground border-dashed border-2 rounded-md">
                    Inga användare har skapats ännu.
                </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
