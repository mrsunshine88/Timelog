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
import { Checkbox } from '@/components/ui/checkbox';
import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { UserProfile, FirestoreTimeEntry } from '@/lib/types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isWeekend } from 'date-fns';
import { sv } from 'date-fns/locale/sv';
import { ChevronLeft, ChevronRight, Loader2, Download, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

type PayrollSummary = {
  userId: string;
  employeeId: string;
  name: string;
  workdaysInMonth: number;
  monthNorm: number;
  workedHours: number;
  sickHours: number;
  vabHours: number;
  vacationDays: number;
  otherAbsenceHours: number;
  overtime: number;
  totalTime: number;
  isReadyForApproval: boolean;
};

// This function calculates the number of workdays in a given month.
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

const calculatePayrollDataForUser = (user: UserProfile, entries: FirestoreTimeEntry[], month: Date): PayrollSummary => {
  let workedHours = 0;
  let sickHours = 0;
  let vabHours = 0;
  let vacationDays = 0;
  let otherAbsenceHours = 0;

  for (const entry of entries) {
    switch (entry.status) {
      case 'Arbete':
        if (entry.startTime && entry.endTime) {
          const start = new Date(entry.startTime);
          const end = new Date(entry.endTime);
          const diffMs = end.getTime() - start.getTime();
          if (diffMs > 0) {
            let entryHours = diffMs / (1000 * 60 * 60);
            // Automatic lunch deduction for shifts over 5.5 hours
            if (entryHours > 5.5) {
              entryHours -= 0.5;
            }
            workedHours += entryHours;
          }
        }
        break;
      case 'Sjuk':
      case 'Sjukskriven':
        sickHours += 8; // Assuming a full day
        break;
      case 'VAB':
        vabHours += 8;
        break;
      case 'Semester':
        vacationDays += 1;
        break;
      case 'Tjänstledig':
      case 'Permission':
      case 'Övrig frånvaro':
        otherAbsenceHours += 8;
        break;
      default:
        break;
    }
  }

  const workdaysInMonth = getWorkdaysInMonth(month);
  const employmentPercentage = user.employmentPercentage ?? 100;
  const monthNorm = workdaysInMonth * 8 * (employmentPercentage / 100);
  const totalAbsenceHours = sickHours + vabHours + (vacationDays * 8) + otherAbsenceHours;
  const totalAccountedHours = workedHours + totalAbsenceHours;
  const overtime = Math.max(0, workedHours - monthNorm);

  return {
    userId: user.id,
    employeeId: user.employeeId,
    name: `${user.firstName} ${user.lastName}`,
    workdaysInMonth,
    monthNorm,
    workedHours: parseFloat(workedHours.toFixed(2)),
    sickHours,
    vabHours,
    vacationDays,
    otherAbsenceHours,
    overtime: parseFloat(overtime.toFixed(2)),
    totalTime: parseFloat(totalAccountedHours.toFixed(2)),
    isReadyForApproval: totalAccountedHours >= monthNorm,
  };
};

export function PayrollManagement() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const { firestore } = useFirebase();
  const [isLoading, setIsLoading] = useState(true);
  const [payrollData, setPayrollData] = useState<PayrollSummary[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [approvedUserIds, setApprovedUserIds] = useState<Set<string>>(new Set());


  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'profiles'));
  }, [firestore]);

  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);

  useEffect(() => {
    // Reset selections when month changes
    setSelectedUserIds(new Set());
    setApprovedUserIds(new Set());

    if (!users || !firestore) return;

    const fetchAllData = async () => {
      setIsLoading(true);
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);

      const summaries: PayrollSummary[] = await Promise.all(
        users.map(async (user) => {
          const entriesQuery = query(
            collection(firestore, 'profiles', user.id, 'timeEntries'),
            where('startTime', '>=', start.toISOString()),
            where('startTime', '<=', end.toISOString())
          );
          const entriesSnapshot = await getDocs(entriesQuery);
          const entries = entriesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as FirestoreTimeEntry[];
          return calculatePayrollDataForUser(user, entries, currentDate);
        })
      );
      setPayrollData(summaries);
      setIsLoading(false);
    };

    fetchAllData();
  }, [users, currentDate, firestore]);

  const handlePrevMonth = () => setCurrentDate(current => subMonths(current, 1));
  const handleNextMonth = () => setCurrentDate(current => addMonths(current, 1));
  
  const handleSelectUser = (userId: string) => {
    setSelectedUserIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(userId)) {
            newSet.delete(userId);
        } else {
            newSet.add(userId);
        }
        return newSet;
    });
  };

  const approvableUserIds = useMemo(() => 
    payrollData.filter(p => p.isReadyForApproval && !approvedUserIds.has(p.userId)).map(p => p.userId)
  , [payrollData, approvedUserIds]);

  const handleSelectAll = (checked: boolean | string) => {
    if (checked) {
        setSelectedUserIds(new Set(approvableUserIds));
    } else {
        setSelectedUserIds(new Set());
    }
  };

  const handleApproveSelected = () => {
    setApprovedUserIds(prev => new Set([...prev, ...selectedUserIds]));
    setSelectedUserIds(new Set());
    toast({
        title: "Löner Godkända",
        description: `${selectedUserIds.size} löner har låsts och är redo för export.`,
    });
  };

  const handleExport = () => {
    const approvedData = payrollData.filter(p => approvedUserIds.has(p.userId));
    if (approvedData.length === 0) {
        toast({
            variant: "destructive",
            title: "Inga godkända löner",
            description: "Godkänn och lås minst en lön för att exportera."
        });
        return;
    }

    const decimalSeparator = ',';
    const headers = [
        "Anstallningsnummer",
        "Period",
        "Loneart_Kod",
        "Antal_Timmar",
        "Beskrivning"
    ];

    const period = format(currentDate, 'yyyy-MM');
    const monthDescription = format(currentDate, 'MMMM yyyy', { locale: sv });

    const dataRows: string[] = [];

    approvedData.forEach(userSummary => {
        const baseRow = [userSummary.employeeId, period];
        const formatHours = (hours: number) => hours.toFixed(2).replace('.', decimalSeparator);

        const regularHours = userSummary.workedHours - userSummary.overtime;
        if (regularHours > 0) {
            dataRows.push([...baseRow, '10', formatHours(regularHours), `Ordinarie tid ${monthDescription}`].join(';'));
        }
        
        if (userSummary.overtime > 0) {
             dataRows.push([...baseRow, '50', formatHours(userSummary.overtime), `Övertid ${monthDescription}`].join(';'));
        }
        
        if (userSummary.sickHours > 0) {
            dataRows.push([...baseRow, 'SJU', formatHours(userSummary.sickHours), `Sjukfrånvaro ${monthDescription}`].join(';'));
        }
        if (userSummary.vabHours > 0) {
            dataRows.push([...baseRow, 'VAB', formatHours(userSummary.vabHours), `Vård av barn ${monthDescription}`].join(';'));
        }
        if (userSummary.vacationDays > 0) {
            const vacationHours = userSummary.vacationDays * 8;
            dataRows.push([...baseRow, 'SEM', formatHours(vacationHours), `Semester ${monthDescription}`].join(';'));
        }
        if (userSummary.otherAbsenceHours > 0) {
             dataRows.push([...baseRow, 'OVR', formatHours(userSummary.otherAbsenceHours), `Övrig frånvaro ${monthDescription}`].join(';'));
        }
    });

    if (dataRows.length === 0) {
        toast({
            title: "Ingen data att exportera",
            description: "De godkända lönerna har inga timmar att rapportera för den valda perioden."
        });
        return;
    }

    const csvData = headers.join(";") + "\n" + dataRows.join("\n");
    // Prepend BOM for UTF-8 to ensure Excel compatibility with Swedish characters
    const bom = "\uFEFF";
    const csvContent = bom + csvData;
    
    // Create a Blob for better handling of file types and encoding
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `lonefil_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up
    
    toast({
        title: "Export slutförd",
        description: `En lönefil för ${period} har laddats ner.`
    });
  };

  const isAllSelected = approvableUserIds.length > 0 && selectedUserIds.size === approvableUserIds.length;

  const getStatusBadge = (data: PayrollSummary) => {
    if (approvedUserIds.has(data.userId)) {
      return <Badge variant="default">Godkänd & Låst</Badge>;
    }
    if (data.isReadyForApproval) {
      return <Badge variant="secondary">Redo för godkännande</Badge>;
    }
    return <Badge variant="destructive">Granska</Badge>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <CardTitle>Lönehantering</CardTitle>
          <CardDescription>Godkänn och exportera löneunderlag för {format(currentDate, 'MMMM yyyy', { locale: sv })}.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevMonth} className='h-8 w-8'>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-semibold w-40 text-center capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: sv })}
            </span>
            <Button variant="outline" size="icon" onClick={handleNextMonth} className='h-8 w-8'>
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row sm:justify-end items-center gap-2 mb-4">
             <Button onClick={handleApproveSelected} disabled={selectedUserIds.size === 0} className="w-full sm:w-auto"> 
                <Lock className="mr-2 h-4 w-4" />
                Godkänn valda
            </Button>
            <Button onClick={handleExport} disabled={approvedUserIds.size === 0} className="w-full sm:w-auto"> 
                <Download className="mr-2 h-4 w-4" />
                Exportera lönefil (CSV)
            </Button>
        </div>
        <div className="rounded-md border overflow-x-auto">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="w-[50px]">
                    <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        disabled={approvableUserIds.length === 0}
                    />
                </TableHead>
                <TableHead>Anst.nr</TableHead>
                <TableHead>Namn</TableHead>
                <TableHead>Måltal</TableHead>
                <TableHead>Arbetat</TableHead>
                <TableHead>Sjuk</TableHead>
                <TableHead>VAB</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>Övertid</TableHead>
                <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading || isLoadingUsers ? (
                <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                </TableRow>
                ) : payrollData && payrollData.length > 0 ? (
                payrollData.map(data => (
                    <TableRow key={data.userId} data-state={selectedUserIds.has(data.userId) ? 'selected' : ''}>
                        <TableCell>
                            <Checkbox 
                                checked={selectedUserIds.has(data.userId) || approvedUserIds.has(data.userId)}
                                onCheckedChange={() => handleSelectUser(data.userId)}
                                disabled={!data.isReadyForApproval || approvedUserIds.has(data.userId)}
                            />
                        </TableCell>
                        <TableCell>{data.employeeId}</TableCell>
                        <TableCell>{data.name}</TableCell>
                        <TableCell>{data.workdaysInMonth} ({data.monthNorm}h)</TableCell>
                        <TableCell>{data.workedHours}h</TableCell>
                        <TableCell>{data.sickHours}h</TableCell>
                        <TableCell>{data.vabHours}h</TableCell>
                        <TableCell>{data.vacationDays * 8}h</TableCell>
                        <TableCell>{data.overtime}h</TableCell>
                        <TableCell>
                            {getStatusBadge(data)}
                        </TableCell>
                    </TableRow>
                ))
                ) : (
                <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">
                    Inga användare eller data hittades för denna period.
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}
