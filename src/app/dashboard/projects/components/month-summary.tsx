
import type { MonthlySummary, UserProfile } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Stethoscope, PlaneTakeoff, ShieldAlert, Wallet } from 'lucide-react';

interface MonthSummaryProps {
  summary: MonthlySummary;
  profile: UserProfile;
}

export function MonthSummary({ summary, profile }: MonthSummaryProps) {
  const salaryDisplay = profile.salaryValue ? `${profile.salaryValue.toLocaleString('sv-SE')} kr` : '-';
  const salaryType = profile.salaryType ? ` (${profile.salaryType})` : '';
  
  const isNegativeDiff = summary.timeDiff < 0;

  return (
    <div className="p-6 bg-muted/10 border-t">
       <h3 className="font-semibold text-lg mb-4">Månadssammanställning</h3>
       
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         
         {/* Tids-kortet */}
         <Card className="shadow-sm">
            <CardContent className="p-4 pt-6 space-y-4">
               <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-muted-foreground">Arbetad Tid</h4>
                  <Clock className="h-4 w-4 text-primary" />
               </div>
               <div>
                  <div className="text-2xl font-bold">{summary.workedHours.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">/ {summary.monthNorm.toFixed(1)} h</span></div>
                  <p className={`text-xs mt-1 ${isNegativeDiff ? 'text-destructive' : 'text-emerald-500'}`}>
                     {summary.timeDiff > 0 ? '+' : ''}{summary.timeDiff.toFixed(1)} h diff mot normaltid
                  </p>
               </div>
            </CardContent>
         </Card>

         {/* Frånvaro-kortet */}
         <Card className="shadow-sm">
            <CardContent className="p-4 pt-6 space-y-4">
               <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-muted-foreground">Frånvaro</h4>
                  <ShieldAlert className="h-4 w-4 text-orange-500" />
               </div>
               <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                         <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
                         <span>Sjuk</span>
                      </div>
                      <span className="font-medium">{summary.absence.sickHours} h</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                         <PlaneTakeoff className="h-3.5 w-3.5 text-muted-foreground" />
                         <span>Semester</span>
                      </div>
                      <span className="font-medium">{summary.absence.vacationDays} d</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                         <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
                         <span>Övrigt</span>
                      </div>
                      <span className="font-medium">{summary.absence.otherAbsenceHours} h</span>
                  </div>
               </div>
            </CardContent>
         </Card>

         {/* Ekonomi-kortet */}
         <Card className="shadow-sm">
            <CardContent className="p-4 pt-6 space-y-4">
               <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-muted-foreground">Avtalslön</h4>
                  <Wallet className="h-4 w-4 text-emerald-600" />
               </div>
               <div>
                  <div className="text-2xl font-bold">{salaryDisplay}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                     Grundlön
                  </p>
               </div>
            </CardContent>
         </Card>

       </div>
    </div>
  );
}
