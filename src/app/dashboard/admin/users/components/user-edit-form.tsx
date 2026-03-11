


'use client';

import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useDoc, useFirebase, useUser, useMemoFirebase } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { doc, serverTimestamp, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { Textarea } from '@/components/ui/textarea';
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, deleteApp } from 'firebase/app';
import { useToast } from '@/hooks/use-toast';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';


const permissionsList = [
    { id: 'viewLiveCost', label: 'Visa LIVE-kostnad', description: 'Ger admin rätt att se totalsumman för dagskostnad och individkostnad på LIVE-sidan.' },
    { id: 'viewAbsence', label: 'Visa Frånvaro', description: 'Ger admin rätt att se den dedikerade rutan för frånvaro (Sjuk, VAB, Semester) på LIVE-sidan.' },
    { id: 'handleTimeReports', label: 'Hantera Tidrapporter', description: 'Ger admin rätt att korrigera arbetstider direkt på en anställds "Mina sidor".' },
    { id: 'handleAbsence', label: 'Hantera Frånvaro', description: 'Ger admin rätt att registrera och ändra frånvarotyper i systemet.' },
    { id: 'handleUsers', label: 'Hantera Användare', description: 'Ger admin rätt att skapa nya användarkonton och redigera personuppgifter/anställningsvillkor.' },
    { id: 'generateContracts', label: 'Generera anställningsavtal', description: 'Ger admin rätt att skapa och ladda ner PDF-anställningsavtal.' },
    { id: 'approvePayroll', label: 'Godkänna löner', description: 'Högsta ekonomiska behörighet för att granska och godkänna löner för utbetalning.' },
    { id: 'handlePermissions', label: 'Hantera Behörigheter', description: 'Högsta nivån. Tillåter en admin att ändra behörigheter för andra administratörer.' },
    { id: 'handleSchema', label: 'Hantera Schema', description: 'Ger admin rätt att skapa och redigera scheman för alla anställda.' },
    { id: 'editOwnTimes', label: 'Redigera egna tider', description: 'Tillåter en användare (även icke-admin) att redigera sina egna tidrapporter. Om ej ibockad blir egna tider skrivskyddade.' },
] as const;

const profileSchema = z.object({
  // System
  employeeId: z.string().regex(/^\d{5}$/, 'Anställningsnummer måste vara 5 siffror.'),
  email: z.preprocess((val) => val === "" ? null : val, z.string().email('Ogiltig e-postadress.').nullable().optional()),
  password: z.string().optional(),
  
  // Anställning
  title: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  employmentType: z.string().nullable(),
  workHoursType: z.string().nullable(),
  weeklyHours: z.preprocess((val) => (val === "" || val === null || val === undefined) ? null : Number(val), z.number().nullable().optional()),
  employmentPercentage: z.preprocess((val) => (val === "" || val === null || val === undefined) ? null : Number(val), z.number().nullable().optional()),
  startDate: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  endDate: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  noticePeriod: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  workplace: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  
  // Lön & Förmåner
  salaryType: z.string().nullable(),
  salaryValue: z.preprocess((val) => (val === "" || val === null || val === undefined) ? null : Number(val), z.number().nullable().optional()),
  benefits: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  vacationDays: z.preprocess((val) => (val === "" || val === null || val === undefined) ? null : Number(val), z.number().nullable().optional()),
  collectiveAgreement: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  insurances: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  otherInfo: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),

  // Personuppgifter
  firstName: z.string().min(1, 'Förnamn är obligatoriskt.'),
  lastName: z.string().min(1, 'Efternamn är obligatoriskt.'),
  ssn: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  phone: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  address: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  postalCode: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  city: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),

  // Behörigheter
  permissions: z.object({
    viewLiveCost: z.boolean().default(false),
    viewAbsence: z.boolean().default(false),
    handleTimeReports: z.boolean().default(false),
    handleAbsence: z.boolean().default(false),
    handleUsers: z.boolean().default(false),
    approvePayroll: z.boolean().default(false),
    generateContracts: z.boolean().default(false),
    handlePermissions: z.boolean().default(false),
    handleSchema: z.boolean().default(false),
    editOwnTimes: z.boolean().default(false),
  }).default({}),
});


// Inner component that renders the form. It assumes data is fully loaded.
function UserEditFormInner({ userProfile, userId, isNewUser }: { userProfile: UserProfile | null, userId?: string, isNewUser: boolean }) {
  const router = useRouter();
  const { firestore } = useFirebase();
  const { profile: loggedInUserProfile } = useUser();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: isNewUser ? {
      firstName: '',
      lastName: '',
      ssn: '',
      phone: '',
      address: '',
      postalCode: '',
      city: '',
      employeeId: '',
      email: '',
      password: '',
      title: '',
      employmentType: null,
      workHoursType: null,
      weeklyHours: 40,
      employmentPercentage: 100,
      startDate: '',
      endDate: '',
      noticePeriod: '',
      workplace: '',
      salaryType: null,
      salaryValue: null,
      vacationDays: 25,
      collectiveAgreement: '',
      insurances: '',
      otherInfo: '',
      permissions: {
        viewLiveCost: false,
        viewAbsence: false,
        handleTimeReports: false,
        handleAbsence: false,
        handleUsers: false,
        approvePayroll: false,
        generateContracts: false,
        handlePermissions: false,
        handleSchema: false,
        editOwnTimes: false,
      },
    } : userProfile ?? undefined, // Use fetched profile as default values
  });
  
  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    const dataToSave: Record<string, any> = { ...values };
    // Sanitize data for Firestore by converting `undefined` to `null`.
    Object.keys(dataToSave).forEach(keyStr => {
        const key = keyStr as keyof typeof dataToSave;
        if (dataToSave[key] === undefined) {
          dataToSave[key] = null;
        }
    });

    if (isNewUser) {
        const authEmail = `${values.employeeId}@timelog.app`;
        
        if (!values.password || values.password.length < 6) {
            form.setError('password', { message: 'Lösenord måste vara minst 6 tecken.' });
            return;
        }

        const secondaryAppName = `createUser-${Date.now()}`;
        const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
        const secondaryAuth = getAuth(secondaryApp);
        
        try {
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, authEmail, values.password);
            const newUserId = userCredential.user.uid;

            const profileData = {
                ...dataToSave,
                id: newUserId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };
            delete (profileData as any).password;
            
            const newDocRef = doc(firestore, 'profiles', newUserId);
            await setDoc(newDocRef, profileData, { merge: true });
            
            toast({ title: "Användare skapad", description: "Det nya kontot har skapats." });
            router.push('/dashboard/admin');
            router.refresh();

        } catch (error: any) {
            console.error("Error creating user in secondary app:", error);
            if (error.code === 'auth/email-already-in-use') {
                form.setError('employeeId', { message: 'Användarnumret är redan upptaget av ett befintligt inloggningskonto. Radera det gamla kontot helt från systemet för att kunna återanvända numret.' });
            } else {
                form.setError('employeeId', { message: `Ett fel uppstod: ${error.message}`});
            }
        } finally {
            await deleteApp(secondaryApp);
        }

    } else { // Editing existing user
        if (!userId) return;

        if (userProfile?.status === 'Inactive' && (!values.password || values.password.length < 6)) {
            form.setError('password', { message: 'Du måste sätta ett nytt lösenord (minst 6 tecken) för att aktivera det lediga kontot.' });
            return;
        }

        const profileData = { ...dataToSave, updatedAt: serverTimestamp(), status: 'Active' };
        delete (profileData as any).password;
        
        try {
            if (values.password) {
                const patchRes = await fetch(`/api/admin/users/${userId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: values.password }),
                });
                if (!patchRes.ok) {
                    throw new Error("Kunde inte uppdatera lösenordet i inloggningssystemet.");
                }
            }

            const docRef = doc(firestore, 'profiles', userId);
            await updateDoc(docRef, profileData);
            
            toast({ title: userProfile?.status === 'Inactive' ? "Konto aktiverat" : "Profil uppdaterad", description: "Ändringarna har sparats." });
            router.push('/dashboard/admin');
            router.refresh();
        } catch (error: any) {
            console.error("Error updating user:", error);
            toast({ variant: "destructive", title: "Fel", description: error.message || "Kunde inte spara ändringarna." });
        }
    }
  };
  
  const handleDelete = async () => {
    if (!userId || !userProfile) return;
    setIsDeleting(true);

    try {
        let authDeleteSuccess = true;
        
        // 1. Try to lock the user out from Firebase Authentication (scrambling password)
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                authDeleteSuccess = false;
                console.warn("Could not scramble Firebase Auth password, proceeding to update profile anyway...");
            }
        } catch (e) {
            authDeleteSuccess = false;
            console.warn("Network error reaching Auth delete endpoint:", e);
        }

        // 2. Soft delete the user's profile from Firestore (This frees the Employee ID)
        const docRef = doc(firestore, 'profiles', userId);
        const inactiveData = {
            status: 'Inactive',
            firstName: '',
            lastName: 'Ledigt',
            email: null,
            phone: null,
            ssn: null,
            address: null,
            postalCode: null,
            city: null,
            salaryValue: null,
            employmentType: null,
            workHoursType: null,
            title: null,
            updatedAt: serverTimestamp()
        };
        await updateDoc(docRef, inactiveData);

        if (authDeleteSuccess) {
            toast({
                title: "Konto Inaktiverat & Rensat",
                description: `Personuppgifterna har raderats och anställningsnumret är nu ledigt för återanvändning. Den gamla användaren kan inte längre logga in.`,
            });
        } else {
            toast({
                title: "Profil rensad (Lokal miljö)",
                description: `Profilen rensades och numret blev ledigt! (E-posten är dock kvar med sitt gamla lösenord för tillfället då du testar lokalt)`,
            });
        }
        
        router.push('/dashboard/admin');
        router.refresh();

    } catch (error: any) {
        console.error("Error during profile soft-delete:", error);
        toast({
            variant: "destructive",
            title: "Fel vid rensning av profil",
            description: error.message || "Kunde inte uppdatera profil-dokumentet. Se konsolen för mer info."
        });
    } finally {
        setIsDeleting(false);
    }
  };

  const isSuperAdmin = loggedInUserProfile?.employeeId === '64112';
  const canHandlePermissions = isSuperAdmin || !!loggedInUserProfile?.permissions?.handlePermissions;
  const canHandleUsers = isSuperAdmin || !!loggedInUserProfile?.permissions?.handleUsers;
  
  // Decide which tab to show by default
  const defaultTab = canHandleUsers ? "employment" : (canHandlePermissions ? "permissions" : "employment");

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList>
            {canHandleUsers && <TabsTrigger value="employment">System & Anställning</TabsTrigger>}
            {canHandleUsers && <TabsTrigger value="personal">Personuppgifter</TabsTrigger>}
            {canHandlePermissions && <TabsTrigger value="permissions">Behörigheter</TabsTrigger>}
          </TabsList>
          
          
          {canHandleUsers && (
          <TabsContent value="employment">
            <Card>
                <CardHeader>
                    <CardTitle>Identitet & Konto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="employeeId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Användarnamn (Anställningsnummer)</FormLabel>
                                <FormControl><Input placeholder="12345" {...field} disabled={!isNewUser} value={field.value ?? ''} /></FormControl>
                                <FormDescription>Används för inloggning. Kan inte ändras.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="password" render={({ field }) => (
                            <FormItem>
                                <FormLabel>{isNewUser || userProfile?.status === 'Inactive' ? 'Lösenord' : 'Nytt lösenord'}</FormLabel>
                                <FormControl><Input type="password" {...field} value={field.value ?? ''} /></FormControl>
                                <FormDescription>
                                    {isNewUser ? 'Minst 6 tecken.' : userProfile?.status === 'Inactive' ? 'Krävs för att återaktivera. Minst 6 tecken.' : 'Lämna tomt för att behålla befintligt lösenord.'}
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Anställningsform & Arbetstid</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                 <div className="grid md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="employmentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Anställningsform</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? ''}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Välj..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Tillsvidare">Tillsvidare</SelectItem>
                              <SelectItem value="Provanställning">Provanställning</SelectItem>
                              <SelectItem value="Visstidsanställning">Visstidsanställning</SelectItem>
                              <SelectItem value="832-anställning">832-anställning</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="workHoursType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Arbetstid</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? ''}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Välj..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Heltid">Heltid</SelectItem>
                              <SelectItem value="Deltid">Deltid</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="weeklyHours" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Antal timmar/vecka</FormLabel>
                            <FormControl><Input type="number" placeholder="40" {...field} value={field.value ?? ''} /></FormControl>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="employmentPercentage" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Sysselsättningsgrad (%)</FormLabel>
                            <FormControl><Input type="number" placeholder="100" {...field} value={field.value ?? ''} /></FormControl>
                        </FormItem>
                    )} />
                </div>
              </CardContent>
            </Card>
             <Card>
                <CardHeader><CardTitle>Tjänstespecifikation</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Yrkestitel</FormLabel>
                            <FormControl><Input placeholder="T.ex. Saneringstekniker" {...field} value={field.value ?? ''} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <div className="grid md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="startDate" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tillträdesdag</FormLabel>
                                <FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl>
                            </FormItem>
                        )} />
                         <FormField control={form.control} name="endDate" render={({ field }) => (
                            <FormItem>
                                <FormLabel>T.o.m-datum (vid visstid)</FormLabel>
                                <FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl>
                            </FormItem>
                        )} />
                    </div>
                     <div className="grid md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="workplace" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Arbetsplats</FormLabel>
                                <FormControl><Input placeholder="Stad eller kontor" {...field} value={field.value ?? ''} /></FormControl>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="noticePeriod" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Uppsägningstid (månader)</FormLabel>
                                <FormControl><Input type="number" placeholder="2" {...field} value={field.value ?? ''} /></FormControl>
                                <FormDescription>Ange antal månader. Ordet "månader" läggs till automatiskt i avtalet.</FormDescription>
                            </FormItem>
                        )} />
                     </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Lön & Villkor</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="salaryType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Lönetyp</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Välj..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Fast">Fast månadslön</SelectItem>
                                  <SelectItem value="Timlön">Timlön</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField control={form.control} name="salaryValue" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Lön (SEK)</FormLabel>
                                <FormControl><Input type="number" placeholder="Ange belopp" {...field} value={field.value ?? ''} /></FormControl>
                            </FormItem>
                        )} />
                    </div>
                     <div className="grid md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="vacationDays" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Semesterdagar (per år)</FormLabel>
                                <FormControl><Input type="number" placeholder="25" {...field} value={field.value ?? ''} /></FormControl>
                            </FormItem>
                        )} />
                         <FormField control={form.control} name="collectiveAgreement" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tillämpat kollektivavtal</FormLabel>
                                <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                            </FormItem>
                        )} />
                     </div>
                    <FormField control={form.control} name="insurances" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Försäkringar</FormLabel>
                            <FormControl><Input placeholder="T.ex. FORA" {...field} value={field.value ?? ''} /></FormControl>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="benefits" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Förmåner</FormLabel>
                            <FormControl><Textarea placeholder="Beskriv eventuella förmåner..." {...field} value={field.value ?? ''} /></FormControl>
                        </FormItem>
                    )} />
                     <FormField control={form.control} name="otherInfo" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Övriga uppgifter (för avtal)</FormLabel>
                            <FormControl><Textarea placeholder="Annan specifik information för avtalet..." {...field} value={field.value ?? ''} /></FormControl>
                        </FormItem>
                    )} />
                </CardContent>
            </Card>
          </TabsContent>
          )}
          {canHandleUsers && (
          <TabsContent value="personal">
            <Card>
              <CardHeader><CardTitle>Personuppgifter</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                 <div className="grid md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="firstName" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Förnamn</FormLabel>
                            <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="lastName" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Efternamn</FormLabel>
                            <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                 </div>
                 <div className="grid md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="ssn" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Personnummer</FormLabel>
                            <FormControl><Input placeholder="YYYYMMDD-XXXX" {...field} value={field.value ?? ''} /></FormControl>
                        </FormItem>
                    )} />
                     <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Telefonnummer</FormLabel>
                            <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                        </FormItem>
                    )} />
                </div>
                <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                        <FormLabel>E-post (Kontakt)</FormLabel>
                        <FormControl><Input placeholder="personal.email@example.com" {...field} value={field.value ?? ''} /></FormControl>
                        <FormDescription>Frivillig kontakt-e-post. Används inte för inloggning.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Gatuadress</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                    </FormItem>
                )} />
                <div className="grid md:grid-cols-2 gap-6">
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {canHandlePermissions && (
          <TabsContent value="permissions">
            <Card>
                <CardHeader><CardTitle>Behörigheter</CardTitle><CardDescription>Styr vad användaren kan se och göra i systemet.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                    {permissionsList.map((item) => (
                    <FormField
                        key={item.id}
                        control={form.control}
                        name={`permissions.${item.id}`}
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                            <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={!isSuperAdmin && (item.id === 'handlePermissions' || !loggedInUserProfile?.permissions.handlePermissions)}
                            />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                            <FormLabel>
                                {item.label}
                            </FormLabel>
                            <FormDescription>
                                {item.description}
                            </FormDescription>
                            </div>
                        </FormItem>
                        )}
                    />
                    ))}
                </CardContent>
            </Card>
          </TabsContent>
          )}
        </Tabs>

        <div className="flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                {isNewUser ? 'Skapa användare' : 'Spara ändringar'}
            </Button>
        </div>

        {!isNewUser && userProfile?.status !== 'Inactive' && (
            <Card className="border-destructive mt-8">
                <CardHeader>
                    <CardTitle className="text-destructive">Frigör Anställningsnummer</CardTitle>
                    <CardDescription>Rensar personuppgifter och inaktiverar kontot. Anställningsnumret blir ledigt för en ny medarbetare.</CardDescription>
                </CardHeader>
                <CardContent>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={userProfile?.employeeId === '64112' || form.formState.isSubmitting || isDeleting}>
                                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                Rensa & Inaktivera
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Är du helt säker?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Du är på väg att rensa all data och spärra inloggningen för detta konto.
                                    <br/><br/>
                                    <span className='font-bold text-destructive'>Användarens uppgifter raderas och lösenordet scrambleas. Anställningsnumret hamnar under &quot;Inaktiva konton&quot; redo att tilldelas en ny person.</span>
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Ja, rensa och inaktivera</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    {userProfile?.employeeId === '64112' && (
                        <p className="text-sm text-muted-foreground mt-2">Super-admin kontot kan inte inaktiveras.</p>
                    )}
                </CardContent>
            </Card>
        )}
      </form>
    </FormProvider>
  );
}


// This is the main component exported from the file. It handles data fetching and loading states.
export function UserEditForm({ userId }: { userId?: string }) {
  const isNewUser = !userId;
  const { firestore } = useFirebase();

  // Memoize the document reference
  const userDocRef = useMemoFirebase(() => {
    if (isNewUser || !firestore) return null;
    return doc(firestore, 'profiles', userId);
  }, [userId, isNewUser, firestore]);
  
  // Fetch user data. This hook handles real-time updates.
  const { data: userProfile, isLoading } = useDoc<UserProfile>(userDocRef);

  // For a new user, we don't need to load anything, just render the form immediately.
  if (isNewUser) {
    return <UserEditFormInner userProfile={null} userId={undefined} isNewUser={true} />;
  }

  // For an existing user, show a loading state until their profile is fetched.
  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  // If loading is finished but no profile was found (e.g., invalid ID).
  if (!userProfile) {
      return (
          <div className="flex justify-center p-8">
              <p>Kunde inte hitta användaren.</p>
          </div>
      );
  }
  
  // Once data is loaded, render the form with the fetched data.
  return <UserEditFormInner userProfile={userProfile} userId={userId} isNewUser={false} />;
}
    
