'use client';
import { MonthOverviewTable } from './components/month-overview-table';
import { MonthSummary } from './components/month-summary';
import { useState, useMemo, useEffect } from 'react';
import type { MonthlyData, TimeEntry as UITimeEntry, FirestoreTimeEntry, UserProfile } from '@/lib/types';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from '@/firebase';
import { collection, query, where, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getISOWeek, eachDayOfInterval, format, getDay, isWeekend, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { sv } from 'date-fns/locale/sv';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { EditEntryDialog } from './components/edit-entry-dialog';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { User } from 'lucide-react';

function calculateHours(start: string, end: string | null): number {
    if (!start || !end) return 0;
    try {
        const totalMinutes = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60);
        if (isNaN(totalMinutes) || totalMinutes < 0) return 0;
        return Math.round((totalMinutes / 60) * 100) / 100;
    } catch (e) {
        return 0;
    }
}

const getWorkdaysInMonth = (date: Date): number => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    let count = 0;
    let currentDate = new Date(start);
    while (currentDate <= end) {
      if (!isWeekend(currentDate)) {
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return count;
  };

export default function MinaSidorPage() {
  const { user: loggedInUser, profile: loggedInUserProfile, firestore } = useFirebase();
  const searchParams = useSearchParams();
  const adminViewingUserId = searchParams.get('userId');
  
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [targetUserProfile, setTargetUserProfile] = useState<UserProfile | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<UITimeEntry | null>(null);

  const canAdminEditOthers = loggedInUserProfile?.permissions?.handleTimeReports ?? false;

  useEffect(() => {
    if (adminViewingUserId) {
      if (canAdminEditOthers) {
        setTargetUserId(adminViewingUserId);
        // Fetch the profile of the user being viewed by the admin
        const profileDocRef = doc(firestore, 'profiles', adminViewingUserId);
        getDoc(profileDocRef).then(docSnap => {
            if (docSnap.exists()) {
                setTargetUserProfile(docSnap.data() as UserProfile);
            } else {
                setViewError("Kunde inte hitta profilen för den valda användaren.");
            }
        });
      } else {
        setViewError("Du har inte behörighet att se andras tidrapporter.");
        setTargetUserId(null);
      }
    } else if (loggedInUser) {
      setTargetUserId(loggedInUser.uid);
      setTargetUserProfile(loggedInUserProfile);
      setViewError(null);
    }
  }, [adminViewingUserId, loggedInUser, loggedInUserProfile, canAdminEditOthers, firestore]);

  const isEditable = useMemo(() => {
    if (!loggedInUserProfile || !loggedInUser) return false;

    // An admin viewing another user's page. Editability is controlled by 'handleTimeReports'.
    if (adminViewingUserId && adminViewingUserId !== loggedInUser.uid) {
        return canAdminEditOthers;
    }
    
    // Any user (admin or not) viewing their own page. Editability is controlled by 'editOwnTimes'.
    return loggedInUserProfile.permissions?.editOwnTimes ?? false;

  }, [adminViewingUserId, loggedInUser, loggedInUserProfile, canAdminEditOthers]);

  const handlePrevMonth = () => setCurrentDate(current => subMonths(current, 1));
  const handleNextMonth = () => setCurrentDate(current => addMonths(current, 1));

  const timeEntriesQuery = useMemoFirebase(() => {
    if (!targetUserId || !firestore) return null;
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return query(
        collection(firestore, 'profiles', targetUserId, 'timeEntries'),
        where('startTime', '>=', start.toISOString()),
        where('startTime', '<=', end.toISOString())
    );
  }, [firestore, targetUserId, currentDate]);

  const { data: firestoreEntries, isLoading } = useCollection<FirestoreTimeEntry>(timeEntriesQuery);

  const handleEditClick = (entry: UITimeEntry) => {
    setSelectedEntry(entry);
    setIsEditDialogOpen(true);
  };

  const handleSaveEntry = async (updatedData: Partial<FirestoreTimeEntry>) => {
    if (!targetUserId || !selectedEntry || !firestore) return;
    const collectionRef = collection(firestore, 'profiles', targetUserId, 'timeEntries');
    
    const existsInFirestore = firestoreEntries?.some(e => e.id === selectedEntry.id);

    let finalEntryId = selectedEntry.id;
  
    if (existsInFirestore) {
        const docRef = doc(collectionRef, selectedEntry.id);
        updateDocumentNonBlocking(docRef, updatedData);
    } else {
        const dataToSave = {
            ...updatedData,
            profileId: targetUserId,
        };
        // Await the non-blocking function to get the ref and its ID
        const newDocRef = await addDocumentNonBlocking(collectionRef, dataToSave);
        if (newDocRef) {
          finalEntryId = newDocRef.id;
        }
    }

    const profileRef = doc(firestore, 'profiles', targetUserId);

    // Scenario 1: A shift is made/kept open (new or existing)
    if (updatedData.endTime === null && updatedData.startTime) {
      updateDocumentNonBlocking(profileRef, {
          isClockedIn: true,
          shiftStartTime: updatedData.startTime,
          activeTimeEntryId: finalEntryId, // Use the correct ID
          lastActivity: serverTimestamp(),
      });
    } 
    // Scenario 2: A previously active shift is being closed
    else if (updatedData.endTime && selectedEntry?.id === targetUserProfile?.activeTimeEntryId) {
      updateDocumentNonBlocking(profileRef, {
          isClockedIn: false,
          shiftStartTime: null,
          activeTimeEntryId: null,
          lastActivity: serverTimestamp(),
      });
    }

    setIsEditDialogOpen(false);
    setSelectedEntry(null);
  };

  const handleDeleteEntry = (entryId: string) => {
    if (!targetUserId || !targetUserProfile) return;
    const existsInFirestore = firestoreEntries?.some(e => e.id === entryId);
    if (!existsInFirestore) return;

    const docRef = doc(firestore, 'profiles', targetUserId, 'timeEntries', entryId);
    deleteDocumentNonBlocking(docRef);

    // If the deleted entry was the active shift, update the user's main profile
    if (targetUserProfile.isClockedIn && targetUserProfile.activeTimeEntryId === entryId) {
        const profileRef = doc(firestore, 'profiles', targetUserId);
        updateDocumentNonBlocking(profileRef, {
            isClockedIn: false,
            shiftStartTime: null,
            activeTimeEntryId: null,
            lastActivity: serverTimestamp(),
        });
    }
  };

  const monthlyData: MonthlyData | null = useMemo(() => {
    if (isLoading || !firestoreEntries || !targetUserProfile) return null;

    const startDate = startOfMonth(currentDate);
    const endDate = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });

    let workedHours = 0;
    let sickHours = 0;
    let vacationDays = 0;
    let otherAbsenceHours = 0;

    // Calculate summary totals by iterating all entries for the month
    firestoreEntries.forEach(entry => {
        const totalHours = calculateHours(entry.startTime, entry.endTime);
        switch (entry.status) {
            case 'Arbete':
                workedHours += totalHours;
                break;
            case 'Semester':
                vacationDays++;
                break;
            case 'Sjuk':
            case 'VAB':
                sickHours += totalHours > 0 ? totalHours : 8;
                break;
            case 'Tjänstledig':
            case 'Permission':
            case 'Övrig frånvaro':
                otherAbsenceHours += totalHours > 0 ? totalHours : 8;
                break;
        }
    });

    const dayNames = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];
    
    // Generate table rows for display
    const tableRows: UITimeEntry[] = [];
    daysInMonth.forEach((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayIndex = getDay(day);
        const isDayWeekend = isWeekend(day);
        
        const entriesForDay = firestoreEntries
            .filter(e => e.startTime && format(new Date(e.startTime), 'yyyy-MM-dd') === dateStr)
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        if (entriesForDay.length > 0) {
            entriesForDay.forEach((entry) => {
                tableRows.push({
                    id: entry.id,
                    date: dateStr,
                    dayName: `${dayNames[dayIndex]} ${format(day, 'd')}`,
                    weekNumber: getISOWeek(day),
                    isWeekend: isDayWeekend,
                    startTime: entry.startTime ? format(new Date(entry.startTime), 'HH:mm') : '',
                    endTime: entry.endTime ? format(new Date(entry.endTime), 'HH:mm') : '',
                    totalHours: calculateHours(entry.startTime, entry.endTime),
                    status: entry.status,
                    project: entry.projectName || '',
                    notes: entry.notes || '',
                    profileId: targetUserId || '',
                });
            });
        } else {
            tableRows.push({
                id: `${dateStr}-${targetUserId}`,
                date: dateStr,
                dayName: `${dayNames[dayIndex]} ${format(day, 'd')}`,
                weekNumber: getISOWeek(day),
                isWeekend: isDayWeekend,
                startTime: '',
                endTime: '',
                totalHours: 0,
                status: 'Tom',
                project: '',
                notes: '',
                profileId: targetUserId || '',
            });
        }
    });
    
    const employmentPercentage = targetUserProfile?.employmentPercentage ?? 100;
    const workdaysInMonth = getWorkdaysInMonth(currentDate);
    const monthNorm = workdaysInMonth * 8 * (employmentPercentage / 100);

    const summary = {
        workedHours,
        monthNorm,
        timeDiff: workedHours - monthNorm,
        absence: {
            sickHours,
            vacationDays,
            otherAbsenceHours,
        }
    };

    return { tableRows, summary };
  }, [firestoreEntries, currentDate, targetUserId, targetUserProfile, isLoading]);


  if (isLoading || !monthlyData || !targetUserProfile) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-4xl mx-auto flex justify-center items-center">
         <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
   if (viewError) {
    return (
        <div className="flex-1 max-w-4xl mx-auto w-full p-4">
            <Alert variant="destructive">
                <AlertTitle>Behörighet saknas</AlertTitle>
                <AlertDescription>{viewError}</AlertDescription>
            </Alert>
        </div>
    );
  }

  const { tableRows, summary } = monthlyData;
  const pageTitle = adminViewingUserId ? `${targetUserProfile.firstName} ${targetUserProfile.lastName}'s Sidor` : 'Mina sidor';

  return (
    <div className="flex-1 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          {adminViewingUserId && <User className="h-8 w-8 text-muted-foreground" />}
          <h2 className="text-3xl font-bold tracking-tight">
            {pageTitle}
          </h2>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevMonth} className='h-8 w-8' disabled={isLoading}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-semibold w-40 text-center capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: sv })}
            </span>
            <Button variant="outline" size="icon" onClick={handleNextMonth} className='h-8 w-8' disabled={isLoading}>
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
      </div>
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
        <MonthOverviewTable rows={tableRows} isEditable={isEditable} onEdit={handleEditClick} onDelete={handleDeleteEntry} />
        {summary && <MonthSummary summary={summary} profile={targetUserProfile} />}
      </div>
      <EditEntryDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
            setIsEditDialogOpen(false);
            setSelectedEntry(null);
        }}
        entry={selectedEntry}
        onSave={handleSaveEntry}
      />
    </div>
  );
}
