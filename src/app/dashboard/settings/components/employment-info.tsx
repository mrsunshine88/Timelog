'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { UserProfile } from '@/lib/types';

interface EmploymentInfoProps {
  profile: UserProfile;
}

const InfoRow = ({ label, value }: { label: string, value: string | number | undefined | null }) => (
    <div className="flex justify-between py-2 border-b">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value || '-'}</p>
    </div>
);

export function EmploymentInfo({ profile }: EmploymentInfoProps) {
  const employmentPercentage = profile.employmentPercentage ?? (profile.weeklyHours ? Math.round((profile.weeklyHours / 40) * 100) : 100);
  const salaryDisplay = profile.salaryValue ? `${profile.salaryValue.toLocaleString('sv-SE')} kr` : '-';
  const employmentForm = [profile.workHoursType, profile.employmentType].filter(Boolean).join(' / ');


  return (
    <Card>
      <CardHeader>
        <CardTitle>Min Anställning</CardTitle>
        <CardDescription>
          Denna information är skrivskyddad. Kontakta en administratör för att göra ändringar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <InfoRow label="Lön" value={salaryDisplay} />
        <InfoRow label="Sysselsättningsgrad" value={`${employmentPercentage}%`} />
        <InfoRow label="Anställningsform" value={employmentForm} />
      </CardContent>
    </Card>
  );
}
