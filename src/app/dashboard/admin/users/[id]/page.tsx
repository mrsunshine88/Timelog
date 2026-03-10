import { UserEditForm } from '@/app/dashboard/admin/users/components/user-edit-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function EditUserPage({ params }: { params: { id: string } }) {
  const isNew = params.id === 'new';

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-4xl mx-auto">
       <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                <Link href="/dashboard/admin">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Tillbaka</span>
                </Link>
            </Button>
            <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">
                    {isNew ? 'Skapa ny användare' : 'Redigera användare'}
                </h2>
                <p className="text-muted-foreground">
                    {isNew ? 'Fyll i informationen nedan för att skapa ett nytt konto.' : 'Uppdatera information och behörigheter för användaren.'}
                </p>
            </div>
        </div>
      <UserEditForm userId={isNew ? undefined : params.id} />
    </div>
  );
}
