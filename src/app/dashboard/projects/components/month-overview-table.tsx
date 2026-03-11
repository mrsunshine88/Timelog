'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { TimeEntry } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, Fragment } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';


interface MonthOverviewTableProps {
  rows: TimeEntry[];
  isEditable: boolean;
  onEdit: (entry: TimeEntry) => void;
  onDelete: (entryId: string) => void;
}

const StatusBadge = ({ status }: { status: TimeEntry['status'] }) => {
  const colorMap: { [key in TimeEntry['status']]?: string } = {
    Arbete:
      'border-transparent bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    Sjuk: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    VAB: 'border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    Semester:
      'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    Permission:
      'border-transparent bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
    Tjänstledig:
      'border-transparent bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    'Övrig frånvaro':
        'border-transparent bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
    Ledig: 'bg-transparent text-muted-foreground',
    Tom: 'bg-transparent text-muted-foreground',
  };

  return (
    <Badge variant="outline" className={cn('font-normal', colorMap[status])}>
      {status}
    </Badge>
  );
};

export function MonthOverviewTable({ rows, isEditable, onEdit, onDelete }: MonthOverviewTableProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<TimeEntry | null>(null);

  const handleEditClick = (entry: TimeEntry) => {
    if (isEditable) {
      onEdit(entry);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, entry: TimeEntry) => {
    e.stopPropagation();
    if (entry.status !== 'Tom' && entry.status !== 'Ledig') {
        setEntryToDelete(entry);
        setIsDeleteDialogOpen(true);
    }
  };

  const confirmDelete = () => {
    if (entryToDelete) {
      onDelete(entryToDelete.id);
    }
    setIsDeleteDialogOpen(false);
    setEntryToDelete(null);
  };


  let lastWeekNumber = -1;
  let lastDateStr = '';

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Dag</TableHead>
              <TableHead>Detaljer</TableHead>
              {isEditable && (
                <TableHead className="w-[80px] text-right">Åtgärd</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const showWeek = row.weekNumber !== lastWeekNumber;
              lastWeekNumber = row.weekNumber;
              
              const showDay = row.date !== lastDateStr;
              lastDateStr = row.date;

              return (
                <Fragment key={row.id}>
                  {showWeek && (
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableCell
                        colSpan={isEditable ? 3 : 2}
                        className="py-2 font-bold text-muted-foreground"
                      >
                        Vecka {row.weekNumber}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow
                    className={cn(
                      isEditable && 'group cursor-pointer',
                      'hover:bg-muted/30'
                    )}
                    onClick={() => handleEditClick(row)}
                  >
                    <TableCell
                      className={cn(
                        'font-medium w-[80px]',
                        row.isWeekend && 'text-red-600'
                      )}
                    >
                      {showDay ? row.dayName : ''}
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                         {(row.status !== 'Tom' && row.status !== 'Ledig') ? (
                          <>
                            <div className="flex items-center gap-2">
                              {row.startTime && <span className="font-medium">{`${row.startTime} - ${row.endTime}`}</span>}
                              <StatusBadge status={row.status} />
                            </div>
                            {row.project && (
                                <div className="text-xs text-muted-foreground">
                                    {row.project}
                                </div>
                            )}
                          </>
                        ) : (
                          <StatusBadge status={row.status} />
                        )}
                      </div>
                    </TableCell>

                    {isEditable && (
                      <TableCell className="p-1">
                        <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(row);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {(row.status !== 'Tom' && row.status !== 'Ledig') && (
                              <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={(e) => handleDeleteClick(e, row)}
                              >
                              <Trash2 className="h-4 w-4" />
                              </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Är du säker?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the time entry. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Radera</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
