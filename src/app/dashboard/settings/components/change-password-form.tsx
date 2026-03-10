'use client';

import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useAuth, useUser } from '@/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Nuvarande lösenord krävs.'),
  newPassword: z.string().min(6, 'Nytt lösenord måste vara minst 6 tecken.'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Lösenorden matchar inte.",
  path: ["confirmPassword"],
});

export function ChangePasswordForm() {
  const { toast } = useToast();
  const auth = useAuth();
  const { user } = useUser();

  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof passwordSchema>) => {
    if (!user || !user.email) return;

    const credential = EmailAuthProvider.credential(user.email, values.currentPassword);

    try {
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, values.newPassword);
      toast({
        title: 'Lösenord uppdaterat!',
        description: 'Ditt lösenord har ändrats.',
      });
      form.reset();
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') {
        form.setError('currentPassword', { message: 'Felaktigt nuvarande lösenord.' });
      } else {
        toast({
          variant: 'destructive',
          title: 'Något gick fel',
          description: 'Kunde inte uppdatera lösenordet. Försök igen.',
        });
      }
      console.error(error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Säkerhet (Ändra lösenord)</CardTitle>
        <CardDescription>Här kan du ändra ditt lösenord för att skydda ditt konto.</CardDescription>
      </CardHeader>
      <CardContent>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="currentPassword" render={({ field }) => (
              <FormItem>
                <FormLabel>Nuvarande lösenord</FormLabel>
                <FormControl><Input type="password" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="newPassword" render={({ field }) => (
              <FormItem>
                <FormLabel>Nytt lösenord</FormLabel>
                <FormControl><Input type="password" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="confirmPassword" render={({ field }) => (
              <FormItem>
                <FormLabel>Bekräfta nytt lösenord</FormLabel>
                <FormControl><Input type="password" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Uppdatera lösenord
              </Button>
            </div>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}
