'use client';

import { useState, useEffect, useMemo } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { UserX, DollarSign, Loader2, CalendarClock, User } from 'lucide-react';
import { format, differenceInMinutes, startOfDay, endOfDay, isToday, isEqual, startOfMonth } from 'date-fns';
import { sv } from 'date-fns/locale/sv';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import type { UserProfile, FirestoreTimeEntry } from '@/lib/types';
import { collection, query, getDocs, where } from 'firebase/firestore';
import Link from 'next/link';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';


const calculateHourlyRate = (user: UserProfile, monthlyWorkHours: number): number => {
    if (!user.salaryValue || user.salaryValue <= 0) return 0;
    if (user.salaryType === 'Timlön') {
        return user.salaryValue;
    }
    if (user.salaryType === 'Fast') {
        const hours = monthlyWorkHours > 0 ? monthlyWorkHours : (21.67 * 8); 
        return user.salaryValue / hours;
    }
    return 0;
};


export default function LivePage() {
    const { firestore, isUserLoading: isAuthLoading, profile: currentUserProfile } = useFirebase();
    const [date, setDate] = useState<DateRange | undefined>({
        from: startOfDay(new Date()),
        to: endOfDay(new Date()),
    });
    const [tick, setTick] = useState(0); // Forces re-calculation for live data

    const profilesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'profiles'));
    }, [firestore]);
    const { data: allUsers, isLoading: isLoadingProfiles } = useCollection<UserProfile>(profilesQuery);

    const [timeEntriesForRange, setTimeEntriesForRange] = useState<FirestoreTimeEntry[]>([]);
    const [isLoadingEntries, setIsLoadingEntries] = useState(true);
    
    const [monthlyCost, setMonthlyCost] = useState(0);
    const [isLoadingMonthlyCost, setIsLoadingMonthlyCost] = useState(true);

    const isSuperAdmin = currentUserProfile?.employeeId === '64112';
    // An admin has at least one permission that is not the user-level 'editOwnTimes' permission.
    const hasGenericAdminAccess = currentUserProfile && Object.entries(currentUserProfile.permissions ?? {}).some(([key, value]) => key !== 'editOwnTimes' && value === true);
    const hasAdminAccess = isSuperAdmin || hasGenericAdminAccess;


    useEffect(() => {
        if (!allUsers || !firestore) return;

        setIsLoadingMonthlyCost(true);
        const monthStart = startOfMonth(new Date());
        const now = new Date();

        const fetchMonthlyEntries = async () => {
            let totalCost = 0;
            const monthlyWorkHours = 21.67 * 8; // Average for rate calculation

            const promises = allUsers.map(async (user) => {
                const entriesQuery = query(
                    collection(firestore, 'profiles', user.id, 'timeEntries'),
                    where('startTime', '>=', monthStart.toISOString()),
                    where('startTime', '<=', now.toISOString())
                );
                const snapshot = await getDocs(entriesQuery);
                let userTotalMinutes = 0;
                snapshot.forEach(doc => {
                    const entry = doc.data() as FirestoreTimeEntry;
                    // Filter on the client-side to avoid needing a composite index for now
                    if (entry.status !== 'Arbete') return;
                    
                    const start = new Date(entry.startTime);
                    const end = entry.endTime ? new Date(entry.endTime) : (user.isClockedIn && doc.id === user.activeTimeEntryId ? new Date() : start);
                    const diff = differenceInMinutes(end, start);
                    if (diff > 0) {
                        userTotalMinutes += diff;
                    }
                });

                if (userTotalMinutes > 0) {
                    const hourlyRate = calculateHourlyRate(user, monthlyWorkHours);
                    const totalHours = userTotalMinutes / 60;
                    totalCost += totalHours * hourlyRate;
                }
            });

            await Promise.all(promises);
            setMonthlyCost(totalCost);
            setIsLoadingMonthlyCost(false);
        };

        fetchMonthlyEntries().catch(err => {
            console.error("Error fetching monthly cost entries:", err);
            setIsLoadingMonthlyCost(false);
        });

    }, [allUsers, firestore, tick]);


    useEffect(() => {
        if (!allUsers || !firestore || !date?.from) return;

        setIsLoadingEntries(true);
        const normalizedStart = startOfDay(date.from);
        const normalizedEnd = endOfDay(date.to || date.from);

        const fetchAllEntries = async () => {
            const allEntries: FirestoreTimeEntry[] = [];
            const promises = allUsers.map(user => {
                const entriesQuery = query(
                    collection(firestore, 'profiles', user.id, 'timeEntries'),
                    where('startTime', '>=', normalizedStart.toISOString()),
                    where('startTime', '<=', normalizedEnd.toISOString())
                );
                return getDocs(entriesQuery).then(snapshot => {
                    snapshot.forEach(doc => {
                        allEntries.push({ ...doc.data(), id: doc.id } as FirestoreTimeEntry);
                    });
                });
            });

            await Promise.all(promises);
            setTimeEntriesForRange(allEntries);
            setIsLoadingEntries(false);
        };

        fetchAllEntries().catch(err => {
             console.error("Error fetching time entries:", err);
             setIsLoadingEntries(false);
        });

    }, [allUsers, date, firestore]);

    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 30000);
        return () => clearInterval(interval);
    }, []);

     const { periodUsers, totalCostForRange, absentUsers } = useMemo(() => {
        if (!allUsers || !timeEntriesForRange || !date?.from) {
            return { periodUsers: [], totalCostForRange: 0, absentUsers: [] };
        }
    
        const workdays = 21.67; // Average workdays in a month
        const monthlyWorkHours = workdays * 8;
        const now = new Date();

        const userSummaries = new Map<string, { user: UserProfile, totalMinutes: number }>();

        // Aggregate time for each user within the date range
        timeEntriesForRange.forEach(entry => {
            if (entry.status !== 'Arbete' || !entry.startTime) return;
            
            if (!userSummaries.has(entry.profileId)) {
                const user = allUsers.find(u => u.id === entry.profileId);
                if (user) {
                    userSummaries.set(entry.profileId, { user, totalMinutes: 0 });
                }
            }

            const summary = userSummaries.get(entry.profileId);
            if (summary) {
                const start = new Date(entry.startTime);
                const isOngoing = summary.user.isClockedIn && entry.id === summary.user.activeTimeEntryId;
                let end = start;
                if (entry.endTime) {
                    end = new Date(entry.endTime);
                } else if (isOngoing) {
                    end = (date.to && date.to < now) ? date.to : now;
                }
                const diff = differenceInMinutes(end, start);
                if (diff > 0) {
                    summary.totalMinutes += diff;
                }
            }
        });
        
        const periodUsers = Array.from(userSummaries.values()).map(summary => {
            const hourlyRate = calculateHourlyRate(summary.user, monthlyWorkHours);
            const totalHoursInRange = summary.totalMinutes / 60;
            const costInRange = totalHoursInRange * hourlyRate;
            return {
                ...summary.user,
                totalHoursInRange,
                costInRange
            };
        }).sort((a, b) => (a.firstName + a.lastName).localeCompare(b.firstName + b.lastName));


        const totalCostForRange = periodUsers.reduce((acc, user) => acc + user.costInRange, 0);
        
        // --- Absenteeism (only for single day view) ---
        let absentUsers: {id: string, firstName: string, lastName: string, absenceStatus: string}[] = [];
        const isSingleDayView = isEqual(startOfDay(date.from), startOfDay(date.to || date.from));
        
        if (isSingleDayView) {
            const todayStr = format(date.from, 'yyyy-MM-dd');
            allUsers.forEach(user => {
                const entriesToday = timeEntriesForRange.filter(e => e.profileId === user.id && e.startTime && format(new Date(e.startTime), 'yyyy-MM-dd') === todayStr);
                const workEntryExists = entriesToday.some(e => e.status === 'Arbete');
                
                if (!workEntryExists) {
                    const absenceEntry = entriesToday.find(e => e.status !== 'Tom' && e.status !== 'Ledig');
                    if (absenceEntry) {
                        absentUsers.push({
                            id: user.id,
                            firstName: user.firstName,
                            lastName: user.lastName,
                            absenceStatus: absenceEntry.status,
                        });
                    }
                }
            });
        }


        return { periodUsers, totalCostForRange, absentUsers };

    }, [allUsers, timeEntriesForRange, date, tick]);


    const canViewCost = currentUserProfile?.employeeId === '64112' || currentUserProfile?.permissions?.viewLiveCost;
    const canViewAbsence = currentUserProfile?.employeeId === '64112' || currentUserProfile?.permissions?.viewAbsence;
    const canHandleTimeReports = currentUserProfile?.employeeId === '64112' || currentUserProfile?.permissions?.handleTimeReports;
    const canHandleUsers = currentUserProfile?.employeeId === '64112' || currentUserProfile?.permissions?.handleUsers;
    
    const showLoading = isLoadingProfiles || isAuthLoading || isLoadingEntries;
    const isSingleDay = date?.from && date?.to ? isEqual(startOfDay(date.from), startOfDay(date.to)) : false;


    return (
        <div className="flex-1 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{canViewCost ? 'Rapportcentral' : 'Live-vy'}</h2>
                    <p className="text-muted-foreground">
                        {canViewCost
                            ? 'Välj ett datumintervall för att se aktivitet och kostnader.'
                            : 'Visar dagens aktivitet i realtid.'
                        }
                    </p>
                </div>
                {canViewCost && <DatePickerWithRange date={date} setDate={setDate} />}
            </div>
            {showLoading ? (
                <div className="flex justify-center items-center py-16">
                    <Loader2 className="h-12 w-12 animate-spin text-muted-foreground"/>
                </div>
            ) : (
            <div className="grid gap-8 md:grid-cols-3">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Aktivitet & Kostnad</CardTitle>
                        <CardDescription>
                             {canViewCost
                                ? 'Personal som har arbetat inom det valda intervallet.'
                                : 'Personal som är aktiv idag.'
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {periodUsers.length > 0 ? (
                            periodUsers.map(user => (
                                <TooltipProvider key={user.id} delayDuration={100}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-default">
                                                <div className="flex items-center gap-4">
                                                     {(canHandleTimeReports || canHandleUsers) && (
                                                        <div className="flex items-center gap-1">
                                                            {canHandleTimeReports && (
                                                                <Button asChild variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                                                    <Link href={`/dashboard/projects?userId=${user.id}`} onClick={(e) => e.stopPropagation()}>
                                                                        <CalendarClock className="h-4 w-4" />
                                                                        <span className="sr-only">Justera tid</span>
                                                                    </Link>
                                                                </Button>
                                                            )}
                                                            {canHandleUsers && (
                                                                <Button asChild variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                                                    <Link href={`/dashboard/admin/users/${user.id}`} onClick={(e) => e.stopPropagation()}>
                                                                        <User className="h-4 w-4" />
                                                                        <span className="sr-only">Redigera användare</span>
                                                                    </Link>
                                                                </Button>
                                                            )}
                                                        </div>
                                                    )}
                                                    <Avatar className="h-9 w-9">
                                                        <AvatarFallback>{`${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <p className="font-medium">{user.firstName} {user.lastName}</p>
                                                </div>
                                            </div>
                                        </TooltipTrigger>
                                        {canViewCost && (
                                            <TooltipContent>
                                                <PeriodUserTooltipContent 
                                                    totalHours={user.totalHoursInRange}
                                                    totalCost={user.costInRange}
                                                />
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                </TooltipProvider>
                            ))
                        ) : (
                            <p className="text-muted-foreground p-2">Ingen aktivitet i det valda intervallet.</p>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    {canViewCost && (
                        <>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Periodens kostnad</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                <div className="text-2xl font-bold">{totalCostForRange.toLocaleString('sv-SE', { style: 'currency', currency: 'SEK' })}</div>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Månadskostnad (Hittills)</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                {isLoadingMonthlyCost ? (
                                    <Loader2 className="h-6 w-6 animate-spin mt-2" />
                                ) : (
                                    <div className="text-2xl font-bold">{monthlyCost.toLocaleString('sv-SE', { style: 'currency', currency: 'SEK' })}</div>
                                )}
                                </CardContent>
                            </Card>
                        </>
                    )}
                    {canViewAbsence && isSingleDay && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Frånvaro Idag</CardTitle>
                                <UserX className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent className="space-y-2 pt-2">
                                {absentUsers.length > 0 ? (
                                    absentUsers.map(user => (
                                        <div key={user.id} className="flex items-center justify-between text-sm">
                                            <span>{user.firstName} {user.lastName}</span>
                                            <span className="text-muted-foreground">{user.absenceStatus}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">Ingen frånvaro idag.</p>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
            )}
        </div>
    );
}

function PeriodUserTooltipContent({ totalHours, totalCost }: { totalHours: number, totalCost: number }) {
    return (
        <div className="space-y-1 p-1">
            <p className="text-sm">Arbetade timmar i perioden: <span className="font-bold">{totalHours.toFixed(2)}h</span></p>
            <p className="text-sm">Kostnad i perioden: <span className="font-bold">{totalCost.toLocaleString('sv-SE', { style: 'currency', currency: 'SEK' })}</span></p>
        </div>
    );
}
