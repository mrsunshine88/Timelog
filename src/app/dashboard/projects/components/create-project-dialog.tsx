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
import type { TimeEntry, TimeEntryStatus } from '@/lib/types';

interface EditEntryDialogProps {
  entry: TimeEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedEntry: TimeEntry) => void;
}

const statusOptions: TimeEntryStatus[] = [
  'Arbete',
  'Sjuk',
  'Sjukskriven',
  'VAB',
  'Semester',
  'Permission',
  'Tjänstledig',
  'Ledig',
];

export function EditEntryDialog({
  entry,
  isOpen,
  onClose,
}: EditEntryDialogProps) {
  if (!isOpen || !entry) {
    return null;
  }

  // This is a placeholder for form state management
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onClose();
  };

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
            <Label htmlFor="start-time" className="text-right">
              Kom
            </Label>
            <Input id="start-time" defaultValue={entry.startTime} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="end-time" className="text-right">
              Gick
            </Label>
            <Input id="end-time" defaultValue={entry.endTime} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Typ
            </Label>
            <Select>
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
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Avbryt
          </Button>
          <Button type="submit" onClick={handleSubmit}>Spara ändringar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
