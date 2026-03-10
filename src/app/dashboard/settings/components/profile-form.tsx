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
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const profileSchema = z.object({
  email: z.string().email('Ogiltig e-postadress.'),
  phone: z.string().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  initialData: UserProfile;
  userId: string;
}

export function ProfileForm({ initialData, userId }: ProfileFormProps) {
  const { toast } = useToast();
  const { firestore } = useFirebase();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: '',
      phone: '',
      address: '',
      postalCode: '',
      city: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        email: initialData.email || '',
        phone: initialData.phone || '',
        address: initialData.address || '',
        postalCode: initialData.postalCode || '',
        city: initialData.city || '',
      });
    }
  }, [initialData, form]);

  const onSubmit = (values: ProfileFormValues) => {
    const docRef = doc(firestore, 'profiles', userId);
    updateDocumentNonBlocking(docRef, values);
    toast({
      title: 'Sparat!',
      description: 'Dina kontaktuppgifter har uppdaterats.',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mina Kontaktuppgifter</CardTitle>
        <CardDescription>Håll din information uppdaterad. Ändringar här uppdaterar din profil omedelbart.</CardDescription>
      </CardHeader>
      <CardContent>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                    <FormLabel>E-post</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                    <FormLabel>Telefonnummer</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )} />
            </div>
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem>
                <FormLabel>Gatuadress</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="postalCode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Postnummer</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem>
                  <FormLabel>Ort</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Spara ändringar
              </Button>
            </div>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}
