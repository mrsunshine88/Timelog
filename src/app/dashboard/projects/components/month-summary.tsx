
import type { MonthlySummary, UserProfile } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

interface MonthSummaryProps {
  summary: MonthlySummary;
  profile: UserProfile;
}

const SummaryItem = ({ label, value }: { label: string; value: string | number }) => (
    <div className="flex justify-between text-sm">
        <p className="text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
    </div>
)

export function MonthSummary({ summary, profile }: MonthSummaryProps) {
  const salaryDisplay = profile.salaryValue ? `${profile.salaryValue.toLocaleString('sv-SE')} kr (${profile.salaryType || ''})` : '-';
  
  return (
    <div className="p-6 bg-muted/30 border-t">
       <div className="space-y-2">
            <h3 className="font-semibold text-lg">Tidssammanställning</h3>
            <Separator />
            <div className="space-y-1 pt-2">
                <SummaryItem label="Normaltid för månaden:" value={`${summary.monthNorm.toFixed(2)} timmar`} />
                <SummaryItem label="Arbetad tid:" value={`${summary.workedHours.toFixed(2)} timmar`} />
                <SummaryItem label="Diff mot normaltid:" value={`${summary.timeDiff.toFixed(2)} timmar`} />
                <Separator className="my-2" />
                <SummaryItem label="Sjukfrånvaro:" value={`${summary.absence.sickHours} timmar`} />
                <SummaryItem label="Semester:" value={`${summary.absence.vacationDays} dagar`} />
                <SummaryItem label="Övrig frånvaro:" value={`${summary.absence.otherAbsenceHours} timmar`} />
                <Separator className="my-2" />
                <SummaryItem label="Grundlön:" value={salaryDisplay} />
            </div>
        </div>
    </div>
  );
}
