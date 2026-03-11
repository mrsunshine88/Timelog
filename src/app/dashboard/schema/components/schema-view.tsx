'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirebase, useMemoFirebase, setDocumentNonBlocking, useCollection } from '@/firebase';
import type { UserProfile, Schedule, FirestoreTimeEntry, TimeEntryStatus } from '@/lib/types';
import {
  collection,
  query,
  doc,
  where,
  getDocs,
  getDoc,
} from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  addWeeks,
  subWeeks,
  startOfWeek,
  endOfWeek,
  format,
  getWeek,
  eachDayOfInterval,
  getDay,
  isToday,
  addDays,
} from 'date-fns';
import { sv } from 'date-fns/locale/sv';
import { ChevronLeft, ChevronRight, Loader2, User, CalendarClock } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';


const statusColorMap: { [key in TimeEntryStatus]?: string } = {
    'Sjuk': '#FFC7CE',          // Röd
    'Sjukskriven': '#FFC7CE',   // Röd
    'Semester': '#C6EFCE',      // Grön
    'VAB': '#FFEB9C',           // Gul/Orange
    'Permission': '#E2E2E2',    // Grå
    'Tjänstledig': '#E2E2E2',   // Grå
    'Övrig frånvaro': '#E2E2E2' // Grå
};

const getColorForStatus = (status: TimeEntryStatus): string | undefined => {
    return statusColorMap[status];
};


export function SchemaView() {
  const { profile: currentUserProfile, isUserLoading: isAuthLoading } = useUser();
  const { firestore } = useFirebase();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [timeEntries, setTimeEntries] = useState<FirestoreTimeEntry[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(true);

  const { toast } = useToast();
  const isMobile = useIsMobile();

  const canHandleSchema = currentUserProfile?.permissions?.handleSchema ?? false;

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || isAuthLoading) return null;
    if (canHandleSchema) {
      return query(collection(firestore, 'profiles'));
    }
    if (currentUserProfile) {
      return query(collection(firestore, 'profiles'), where('__name__', '==', currentUserProfile.id));
    }
    return null;
  }, [firestore, canHandleSchema, currentUserProfile, isAuthLoading]);

  const { data: usersData, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);

  const users = useMemo(() => {
    if (!usersData) return null;
    return [...usersData]
        .filter(u => u.status !== 'Inactive')
        .sort((a, b) => 
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
    );
  }, [usersData]);


  const weekId = useMemo(() => {
    return `${format(currentDate, 'yyyy')}-${getWeek(currentDate, { weekStartsOn: 1 })}`;
  }, [currentDate]);

  useEffect(() => {
    if (!users || users.length === 0 || !firestore) {
      setIsLoadingSchedules(false);
      setSchedules([]);
      setTimeEntries([]);
      return;
    }

    setIsLoadingSchedules(true);
    const start = startOfWeek(currentDate, { locale: sv });
    const end = endOfWeek(currentDate, { locale: sv });

    const fetchSchedulesAndEntries = async () => {
      try {
        // Fetch schedules
        const schedulePromises = users.map(user => {
          const scheduleDocRef = doc(firestore, 'profiles', user.id, 'schedules', weekId);
          return getDoc(scheduleDocRef);
        });

        // Fetch time entries
        const entryPromises = users.map(user => {
            const entriesQuery = query(
                collection(firestore, 'profiles', user.id, 'timeEntries'),
                where('startTime', '>=', start.toISOString()),
                where('startTime', '<=', end.toISOString())
            );
            return getDocs(entriesQuery);
        });

        const [scheduleSnapshots, entrySnapshots] = await Promise.all([Promise.all(schedulePromises), Promise.all(entryPromises)]);
        
        const allSchedules: Schedule[] = scheduleSnapshots.map((snap, index) => {
            const user = users[index];
            if (snap.exists()) {
                return snap.data() as Schedule;
            }
            return { id: weekId, year: parseInt(weekId.split('-')[0]), week: parseInt(weekId.split('-')[1]), days: {}, profileId: user.id };
        });
        setSchedules(allSchedules);

        const allEntries: FirestoreTimeEntry[] = [];
        entrySnapshots.forEach(snapshot => {
            snapshot.docs.forEach(doc => {
                allEntries.push({ ...doc.data(), id: doc.id } as FirestoreTimeEntry);
            });
        });
        setTimeEntries(allEntries);

      } catch (error) {
        console.error("Error fetching schedules or entries: ", error);
        setSchedules(users.map(user => ({ id: weekId, year: parseInt(weekId.split('-')[0]), week: parseInt(weekId.split('-')[1]), days: {}, profileId: user.id })));
        setTimeEntries([]);
      } finally {
        setIsLoadingSchedules(false);
      }
    };
    fetchSchedulesAndEntries();
  }, [users, weekId, firestore, currentDate]);


  const handleTimeChange = (userId: string, day: number, value: string) => {
    if (!canHandleSchema || !firestore) return;
    setSchedules(prev =>
      prev.map(schedule =>
        schedule.profileId === userId ? { ...schedule, days: { ...schedule.days, [day]: value } } : schedule
      )
    );
  }

  const handleTimeSave = (userId: string, day: number, value: string) => {
    if (!canHandleSchema || !firestore) return;
    const scheduleId = weekId;
    const docRef = doc(firestore, 'profiles', userId, 'schedules', scheduleId);
    const scheduleToUpdate = schedules.find(s => s.profileId === userId);
    const newDays = { ...scheduleToUpdate?.days, [day]: value };
    const dataToSave: Schedule = { id: scheduleId, year: parseInt(scheduleId.split('-')[0]), week: parseInt(scheduleId.split('-')[1]), days: newDays, profileId: userId };
    setDocumentNonBlocking(docRef, dataToSave, { merge: true });
  }

  const handlePrevWeek = () => setCurrentDate(current => subWeeks(current, 1));
  const handleNextWeek = () => setCurrentDate(current => addWeeks(current, 1));

  const start = startOfWeek(currentDate, { locale: sv });
  const end = endOfWeek(currentDate, { locale: sv });
  const weekDaysHeaders = eachDayOfInterval({ start, end }).map(day => ({
    label: format(day, 'EEE', { locale: sv }),
    date: format(day, 'd'),
    fullDate: day,
    dayIndex: getDay(day) === 0 ? 7 : getDay(day),
    isToday: isToday(day),
  }));

  const isLoading = isAuthLoading || isLoadingUsers || isLoadingSchedules;

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2 py-4">
        <h2 className="text-3xl font-bold tracking-tight">Schema</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevWeek} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-semibold w-40 text-center capitalize">
            {`Vecka ${getWeek(currentDate, { weekStartsOn: 1 })}`}
          </span>
          <Button variant="outline" size="icon" onClick={handleNextWeek} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {canHandleSchema && (
        <div className="text-sm text-muted-foreground mb-2">
          Fyll i tider (t.ex. 08-16) och klicka utanför fältet för att spara. Ändringar sparas automatiskt.
        </div>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Anställd</TableHead>
              {weekDaysHeaders.map(day => (
                <TableHead key={day.dayIndex} className="text-center">
                    {day.label}{' '}
                    <span className={cn('px-2 py-1 rounded-full', day.isToday && 'bg-primary text-primary-foreground')}>
                        {day.date}
                    </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users && schedules.length > 0 && users.map(user => {
              const userSchedule = schedules.find(s => s.profileId === user.id);
              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span>{user.firstName} {user.lastName}</span>
                      {canHandleSchema && (
                        <div className="flex items-center gap-1 opacity-50 hover:opacity-100">
                           <Button asChild variant="ghost" size="icon" className="h-7 w-7">
                              <Link href={`/dashboard/projects?userId=${user.id}`}>
                                <CalendarClock className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button asChild variant="ghost" size="icon" className="h-7 w-7">
                              <Link href={`/dashboard/admin/users/${user.id}`}>
                                <User className="h-4 w-4" />
                              </Link>
                            </Button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  {weekDaysHeaders.map(day => {
                    const dayDateStr = format(day.fullDate, 'yyyy-MM-dd');
                    const absenceEntry = timeEntries.find(entry =>
                      entry.profileId === user.id &&
                      entry.startTime &&
                      format(new Date(entry.startTime), 'yyyy-MM-dd') === dayDateStr &&
                      statusColorMap[entry.status]
                    );
                    const scheduleValue = userSchedule?.days[day.dayIndex] || '';

                    if (absenceEntry) {
                      const cellStyle = { backgroundColor: getColorForStatus(absenceEntry.status) };
                      const absenceContent = (
                        <div className="text-center w-full h-full flex items-center justify-center font-semibold text-sm text-black/70 px-1 truncate">
                          {absenceEntry.status}
                        </div>
                      );

                      const handleCellClick = () => {
                        if (isMobile) {
                          toast({
                            description: `Frånvaro: ${absenceEntry.status}`,
                            duration: 3000,
                          });
                        }
                      };

                      const Wrapper = canHandleSchema ? Link : 'div';
                      const wrapperProps: any = canHandleSchema
                        ? { href: `/dashboard/projects?userId=${user.id}`, className: "block w-full h-10 flex items-center justify-center" }
                        : { className: "w-full h-10 flex items-center justify-center cursor-default", onClick: handleCellClick };

                      return (
                        <TableCell key={day.dayIndex} style={cellStyle} className="p-0 transition-colors">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Wrapper {...wrapperProps}>
                                  {absenceContent}
                                </Wrapper>
                              </TooltipTrigger>
                              {!isMobile && (
                                <TooltipContent>
                                  <p>Frånvaro: {absenceEntry.status}</p>
                                  {canHandleSchema && <p className="text-xs text-muted-foreground">Klicka för att redigera på Mina Sidor</p>}
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      );
                    } else {
                      return (
                        <TableCell key={day.dayIndex} className={cn(day.isToday && "bg-muted/30")}>
                          {canHandleSchema ? (
                            <div className="relative w-[120px] mx-auto">
                              <Input
                                type="text"
                                placeholder="--:-- - --:--"
                                defaultValue={scheduleValue}
                                onChange={(e) => handleTimeChange(user.id, day.dayIndex, e.target.value)}
                                onBlur={(e) => handleTimeSave(user.id, day.dayIndex, e.target.value)}
                                disabled={!canHandleSchema}
                                className="text-center"
                              />
                            </div>
                          ) : (
                            <div className="text-center w-[120px] mx-auto">
                              {scheduleValue}
                            </div>
                          )}
                        </TableCell>
                      );
                    }
                  })}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
