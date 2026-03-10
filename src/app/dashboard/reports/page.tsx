'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { isBefore, startOfDay, format, parse } from 'date-fns';
import type { AdjustmentLog } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export default function ReportsPage() {
  const { user, profile, firestore, isUserLoading } = useFirebase();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hasUnclosedShift, setHasUnclosedShift] = useState(false);
  
  const [isManualAdjustment, setIsManualAdjustment] = useState(false);
  const [manualTime, setManualTime] = useState('');

  const canAdjustTime = profile?.permissions?.editOwnTimes ?? false;
  const isClockedIn = profile?.isClockedIn ?? false;
  const activeEntryId = profile?.activeTimeEntryId ?? null;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    // Set initial time for manual input
    setManualTime(format(new Date(), 'HH:mm'));
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (profile?.isClockedIn && profile.shiftStartTime) {
        if (isBefore(new Date(profile.shiftStartTime), startOfDay(new Date()))) {
            setHasUnclosedShift(true);
        } else {
            setHasUnclosedShift(false);
        }
    } else {
        setHasUnclosedShift(false);
    }
  }, [profile]);

  const logAdjustment = (action: string, originalTime: Date, adjustedTime: Date) => {
    if (!user || !profile || !firestore) return;
    const logCollectionRef = collection(firestore, 'adjustment_logs');
    const logEntry: Omit<AdjustmentLog, 'id'> = {
      adjustingUserId: user.uid,
      adjustingUserName: `${profile.firstName} ${profile.lastName}`,
      action: `${action} justerad till ${format(adjustedTime, 'HH:mm:ss')}`,
      originalTime: originalTime.toISOString(),
      adjustedTime: adjustedTime.toISOString(),
      createdAt: serverTimestamp(),
    };
    addDocumentNonBlocking(logCollectionRef, logEntry);
  };

  const handleClockAction = async (action: 'in' | 'out') => {
    if (!user || !firestore) return;
    if (action === 'out' && !activeEntryId) return;

    const originalTime = new Date();
    let effectiveTime = originalTime;

    if (canAdjustTime && isManualAdjustment && manualTime) {
      effectiveTime = parse(manualTime, 'HH:mm', originalTime);
      logAdjustment(action === 'in' ? 'Instämpling' : 'Utstämpling', originalTime, effectiveTime);
    }
    
    const effectiveTimeISO = effectiveTime.toISOString();

    if (action === 'in') {
      const newEntry = {
        startTime: effectiveTimeISO,
        endTime: null,
        status: 'Arbete' as const,
        profileId: user.uid,
        projectName: 'Allmänt arbete',
      };
      const collectionRef = collection(firestore, 'profiles', user.uid, 'timeEntries');
      
      try {
          const docRef = await addDocumentNonBlocking(collectionRef, newEntry);
          if(docRef) {
              const profileRef = doc(firestore, 'profiles', user.uid);
              updateDocumentNonBlocking(profileRef, {
                  isClockedIn: true,
                  shiftStartTime: effectiveTimeISO,
                  activeTimeEntryId: docRef.id,
                  lastActivity: serverTimestamp(),
              });
          }
      } catch(e) {
          console.error("Error clocking in:", e);
      }
    } else { // action === 'out'
      const timeEntryRef = doc(firestore, 'profiles', user.uid, 'timeEntries', activeEntryId!);
      updateDocumentNonBlocking(timeEntryRef, { endTime: effectiveTimeISO });

      const profileRef = doc(firestore, 'profiles', user.uid);
      updateDocumentNonBlocking(profileRef, {
        isClockedIn: false,
        shiftStartTime: null,
        activeTimeEntryId: null,
        lastActivity: serverTimestamp(),
      });
    }
  };


  const formattedDate = currentTime.toLocaleDateString('sv-SE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-sm p-8">
          <div className="flex flex-col items-center justify-center space-y-8">
            <div className='space-y-2'>
              <p className="text-2xl text-muted-foreground">{formattedDate}</p>
              <p className="text-5xl font-bold text-foreground tabular-nums tracking-tighter">
                {formattedTime}
              </p>
            </div>
            
            <div className="w-full">
              {isUserLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                  </div>
              ) : hasUnclosedShift ? (
                  <div className="flex flex-col items-center justify-center gap-2 h-32">
                      <p className="text-destructive font-semibold">Passet kunde inte avslutas korrekt.</p>
                      <p className="text-sm text-muted-foreground">Kontakta en administratör för att justera tiden.</p>
                  </div>
              ) : (
                <div className="space-y-4">
                   {canAdjustTime && (
                    <div className="space-y-3 pt-4">
                        <div className="flex items-center justify-center space-x-2">
                            <Checkbox 
                                id="manual-adjustment"
                                checked={isManualAdjustment}
                                onCheckedChange={(checked) => setIsManualAdjustment(!!checked)}
                            />
                            <Label htmlFor="manual-adjustment" className="cursor-pointer">
                                Justera tid manuellt
                            </Label>
                        </div>
                        <div className="w-40 mx-auto">
                            <Input
                                id="manual-time"
                                type="time"
                                value={manualTime}
                                onChange={(e) => setManualTime(e.target.value)}
                                disabled={!isManualAdjustment}
                            />
                        </div>
                    </div>
                  )}

                  {!isClockedIn ? (
                    <Button size="lg" className="h-16 w-full text-xl" onClick={() => handleClockAction('in')}>
                      Starta pass
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      variant="destructive"
                      className="h-16 w-full text-xl"
                      onClick={() => handleClockAction('out')}
                    >
                      Avsluta pass
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
  );
}
