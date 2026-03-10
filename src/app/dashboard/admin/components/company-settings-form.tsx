'use client';

import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import type { CompanySettings } from '@/lib/types';
import { useEffect } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

const companySettingsSchema = z.object({
  companyName: z.string().optional(),
  orgNumber: z.string().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  contactPerson: z.string().optional(),
  companyPhone: z.string().optional(),
  companyEmail: z.string().email('Ogiltig e-postadress.').optional().or(z.literal('')),
  standardTerms: z.string().optional(),
});

interface CompanySettingsFormProps {
    initialData: CompanySettings | null;
    isLoading: boolean;
    onSave: (values: z.infer<typeof companySettingsSchema>) => void;
    onClear: () => void;
    isSaving: boolean;
}

export function CompanySettingsForm({ initialData, isLoading, onSave, onClear, isSaving }: CompanySettingsFormProps) {
  const form = useForm<z.infer<typeof companySettingsSchema>>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      companyName: '',
      orgNumber: '',
      address: '',
      postalCode: '',
      city: '',
      contactPerson: '',
      companyPhone: '',
      companyEmail: '',
      standardTerms: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    }
  }, [initialData, form]);

  const onSubmit = (values: z.infer<typeof companySettingsSchema>) => {
    onSave(values);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormDescription>
            Dessa uppgifter används för att automatiskt fylla i företagsinformation när du genererar anställningsavtal.
        </FormDescription>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="companyName" render={({ field }) => (
                <FormItem>
                    <FormLabel>Företagsnamn</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                </FormItem>
            )} />
            <FormField control={form.control} name="orgNumber" render={({ field }) => (
                <FormItem>
                    <FormLabel>Organisationsnummer</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                </FormItem>
            )} />
            <div className="md:col-span-2">
                <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Gatuadress</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                    </FormItem>
                )} />
            </div>
            <FormField control={form.control} name="postalCode" render={({ field }) => (
                <FormItem>
                    <FormLabel>Postnummer</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                </FormItem>
            )} />
            <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem>
                    <FormLabel>Ort</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                </FormItem>
            )} />
            <div className="md:col-span-2">
                <FormField control={form.control} name="contactPerson" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Kontaktperson / Firmatecknare</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                    </FormItem>
                )} />
            </div>
            <FormField control={form.control} name="companyPhone" render={({ field }) => (
                <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                </FormItem>
            )} />
            <FormField control={form.control} name="companyEmail" render={({ field }) => (
                <FormItem>
                    <FormLabel>E-post</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                </FormItem>
            )} />
        </div>
        <FormField control={form.control} name="standardTerms" render={({ field }) => (
            <FormItem>
                <FormLabel>Standardvillkor för avtal</FormLabel>
                <FormControl><Textarea rows={5} {...field} value={field.value ?? ''} /></FormControl>
                <FormDescription>Denna text infogas i fältet "Övriga uppgifter" i anställningsavtalet.</FormDescription>
            </FormItem>
        )} />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClear} disabled={isSaving}>
            <Trash2 className="mr-2 h-4 w-4" />
            Rensa
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Spara inställningar
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
