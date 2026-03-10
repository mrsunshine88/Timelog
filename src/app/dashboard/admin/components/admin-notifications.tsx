'use client';

import { useMemo, useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Wrench, Award, UserCheck } from 'lucide-react';
import { useCollection, useFirebase, useMemoFirebase, useUser } from '@/firebase';
import type { UserProfile, FirestoreTimeEntry } from '@/lib/types';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { isBefore, startOfDay, format, addMonths, differenceInMinutes } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function AdminNotifications() {
    const { firestore } = useFirebase();
    const { profile: currentUserProfile, isUserLoading: isAuthLoading } = useUser();

    const usersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'profiles'));
    }, [firestore]);

    const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);

    const [users832Hours, setUsers832Hours] = useState<{ user: UserProfile, totalHours: number }[]>([]);
    const [isLoading832Hours, setIsLoading832Hours] = useState(true);

    const isSuperAdmin = currentUserProfile?.employeeId === '64112';
    const canViewStuckUsers = !isAuthLoading && (isSuperAdmin || currentUserProfile?.permissions?.handleTimeReports);
    const canViewHiringNotices = !isAuthLoading && (isSuperAdmin || currentUserProfile?.permissions?.handleUsers);


    useEffect(() => {
        if (!users || !firestore || !canViewHiringNotices) {
            setIsLoading832Hours(false);
            return;
        }

        const fetchHours = async () => {
            setIsLoading832Hours(true);
            const usersToCheck = users.filter(u => u.employmentType === '832-anställning');
            if (usersToCheck.length === 0) {
                setIsLoading832Hours(false);
                return;
            }
            
            const usersPastThreshold: { user: UserProfile, totalHours: number }[] = [];

            for (const user of usersToCheck) {
                const entriesQuery = query(
                    collection(firestore, 'profiles', user.id, 'timeEntries'),
                    where('status', '==', 'Arbete')
                );
                const snapshot = await getDocs(entriesQuery);
                let totalMinutes = 0;
                snapshot.forEach(doc => {
                    const entry = doc.data() as FirestoreTimeEntry;
                    if (entry.startTime && entry.endTime) {
                        const start = new Date(entry.startTime);
                        const end = new Date(entry.endTime);
                        totalMinutes += differenceInMinutes(end, start);
                    }
                });

                const totalHours = totalMinutes / 60;
                if (totalHours >= 832) {
                    usersPastThreshold.push({ user, totalHours: Math.floor(totalHours) });
                }
            }
            setUsers832Hours(usersPastThreshold);
            setIsLoading832Hours(false);
        };

        fetchHours();

    }, [users, firestore, canViewHiringNotices]);

    const probationEndingUsers = useMemo(() => {
        if (!users || !canViewHiringNotices) return [];
        const now = new Date();
        return users.filter(user => {
            if (user.employmentType === 'Provanställning' && user.startDate) {
                const probationEndDate = addMonths(new Date(user.startDate), 6);
                return isBefore(probationEndDate, now);
            }
            return false;
        });
    }, [users, canViewHiringNotices]);
    
    const stuckUsers = useMemo(() => {
        if (!users || !canViewStuckUsers) return [];
        return users.filter(user =>
            user.isClockedIn &&
            user.shiftStartTime &&
            isBefore(new Date(user.shiftStartTime), startOfDay(new Date()))
        );
    }, [users, canViewStuckUsers]);

    const isLoading = isLoadingUsers || isLoading832Hours;

    if (isLoading || (stuckUsers.length === 0 && probationEndingUsers.length === 0 && users832Hours.length === 0)) {
        return null;
    }

    return (
        <div className="space-y-4">
            {canViewStuckUsers && stuckUsers.map(user => (
                <Alert key={user.id} variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Glömd utstämpling!</AlertTitle>
                    <div className="flex justify-between items-center">
                        <AlertDescription>
                            Användare {user.employeeId} ({user.firstName} {user.lastName}) har inte stämplat ut sedan {format(new Date(user.shiftStartTime!), 'yyyy-MM-dd')}.
                        </AlertDescription>
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/projects?userId=${user.id}`}>
                                <Wrench className="mr-2 h-4 w-4" />
                                Justera tid
                            </Link>
                        </Button>
                    </div>
                </Alert>
            ))}
            {canViewHiringNotices && probationEndingUsers.map(user => (
                 <Alert key={user.id}>
                    <UserCheck className="h-4 w-4" />
                    <AlertTitle>Provanställning löper ut</AlertTitle>
                     <div className="flex justify-between items-center">
                        <AlertDescription>
                           {user.firstName} {user.lastName}'s provanställning på 6 månader (start {format(new Date(user.startDate!), 'yyyy-MM-dd')}) har löpt ut.
                        </AlertDescription>
                         <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/admin/users/${user.id}`}>
                                <Wrench className="mr-2 h-4 w-4" />
                                Hantera anställd
                            </Link>
                        </Button>
                    </div>
                </Alert>
            ))}
            {canViewHiringNotices && users832Hours.map(data => (
                 <Alert key={data.user.id}>
                    <Award className="h-4 w-4" />
                    <AlertTitle>832-timmarsgräns nådd</AlertTitle>
                     <div className="flex justify-between items-center">
                        <AlertDescription>
                           Användare {data.user.employeeId} ({data.user.firstName} {data.user.lastName}) har arbetat {data.totalHours} timmar och nått gränsen.
                        </AlertDescription>
                         <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/admin/users/${data.user.id}`}>
                                <Wrench className="mr-2 h-4 w-4" />
                                Hantera anställd
                            </Link>
                        </Button>
                    </div>
                </Alert>
            ))}
        </div>
    );
}
