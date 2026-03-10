'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { TimeEntry } from '@/lib/types';


export function RecentEntries() {
  const { firestore, user } = useFirebase();

  const entriesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
        collection(firestore, 'profiles', user.uid, 'timeEntries'),
        orderBy('startTime', 'desc'),
        limit(5)
    );
  }, [firestore, user]);

  const { data: recentEntries, isLoading } = useCollection<TimeEntry>(entriesQuery);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Entries</CardTitle>
        <CardDescription>
          A log of your 5 most recent time entries.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <p className="text-sm text-muted-foreground">Loading entries...</p>}
        {!isLoading && (!recentEntries || recentEntries.length === 0) ? (
          <p className="text-sm text-muted-foreground">No entries yet.</p>
        ) : (
            recentEntries && recentEntries.map((entry) => {
            const duration = entry.endTime && entry.startTime ? Math.round((new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / 60000) : 0;
            return (
              <div key={entry.id} className="flex items-center">
                <div className="flex-grow space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {entry.taskName || 'No task'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {entry.projectName || 'No project'}
                  </p>
                </div>
                <div className='flex flex-col items-end'>
                  <Badge variant="outline">{duration} min</Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(entry.startTime), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
