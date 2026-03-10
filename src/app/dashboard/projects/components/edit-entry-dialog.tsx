'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { TimeEntry, TimeEntryStatus, FirestoreTimeEntry } from '@/lib/types';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';

interface EditEntryDialogProps {
  entry: TimeEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedEntry: Partial<FirestoreTimeEntry>) => void;
}

const statusOptions: TimeEntryStatus[] = [
  'Arbete',
  'Sjuk',
  'Sjukskriven',
  'VAB',
  'Semester',
  'Permission',
  'Tjänstledig',
  'Övrig frånvaro',
  'Ledig',
  'Tom',
];

export function EditEntryDialog({
  entry,
  isOpen,
  onClose,
  onSave,
}: EditEntryDialogProps) {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [status, setStatus] = useState<TimeEntryStatus>('Tom');
  const [projectName, setProjectName] = useState('');
  const [notes, setNotes] = useState('');
  const [isOpenShift, setIsOpenShift] = useState(false);


  useEffect(() => {
    if (entry) {
      setStartTime(entry.startTime);
      setEndTime(entry.endTime);
      setStatus(entry.status);
      setProjectName(entry.project || '');
      setNotes(entry.notes || '');
      // If it's a placeholder entry, default to a closed shift.
      // Otherwise, reflect the actual state of the existing entry.
      if (entry.status === 'Tom' || entry.status === 'Ledig') {
        setIsOpenShift(false);
      } else {
        setIsOpenShift(!entry.endTime);
      }
    }
  }, [entry]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entry) return;

    const entryDate = entry.date || format(new Date(), 'yyyy-MM-dd');
    
    // Construct ISO strings for saving. Use time if available, otherwise just the date for startTime.
    const startISO = startTime
        ? new Date(`${entryDate}T${startTime}`).toISOString() 
        : new Date(entryDate).toISOString();

    const endISO = !isOpenShift && endTime 
        ? new Date(`${entryDate}T${endTime}`).toISOString() 
        : null;

    const dataToSave: Partial<FirestoreTimeEntry> = {
      startTime: startISO,
      endTime: endISO,
      status,
      projectName,
      notes,
    };

    onSave(dataToSave);
    onClose();
  };
  
  if (!isOpen || !entry) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Redigera tidspost</DialogTitle>
          <DialogDescription>
            Ändra detaljerna för den valda dagen. Klicka på spara när du är klar.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              Datum
            </Label>
            <Input
              id="date"
              defaultValue={new Date(entry.date).toLocaleDateString('sv-SE')}
              className="col-span-3"
              disabled
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Typ
            </Label>
            <Select value={status} onValueChange={(value) => setStatus(value as TimeEntryStatus)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Välj typ" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="start-time" className="text-right">
              Kom
            </Label>
            <Input id="start-time" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="end-time" className="text-right">
              Gick
            </Label>
            <Input id="end-time" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="col-span-3" disabled={isOpenShift} />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <div /> {/* Empty cell for alignment */}
            <div className="col-span-3 flex items-center space-x-2">
                <Checkbox
                    id="open-shift"
                    checked={isOpenShift}
                    onCheckedChange={(checked) => {
                        const isOpen = !!checked;
                        setIsOpenShift(isOpen);
                        if (isOpen) {
                            setEndTime('');
                        }
                    }}
                />
                <Label htmlFor="open-shift" className="text-sm font-normal cursor-pointer">
                    Öppet pass (ingen sluttid)
                </Label>
            </div>
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="project-name" className="text-right">
              Projekt
            </Label>
            <Input id="project-name" value={projectName} onChange={e => setProjectName(e.target.value)} className="col-span-3" />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">
              Notering
            </Label>
            <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} className="col-span-3" />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Avbryt</Button>
          <Button type="submit" onClick={handleSubmit}>Spara ändringar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
