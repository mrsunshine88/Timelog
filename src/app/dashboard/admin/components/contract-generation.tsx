'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CompanySettingsForm } from './company-settings-form';
import { FileDown, Search, User, Building, Loader2, X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useFirebase, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, getDocs, doc } from 'firebase/firestore';
import type { UserProfile, CompanySettings } from '@/lib/types';
import { generateContract } from '@/lib/generate-contract';
import { useToast } from '@/hooks/use-toast';

export function ContractGeneration() {
  const { toast } = useToast();
  const [employeeId, setEmployeeId] = useState('');
  const [searchedUser, setSearchedUser] = useState<UserProfile | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const { firestore } = useFirebase();

  const settingsDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'companySettings', 'main') : null, [firestore]);
  const { data: companySettings, isLoading: isLoadingSettings } = useDoc<CompanySettings>(settingsDocRef);

  const handleSearch = async () => {
    const searchTerm = employeeId.trim();
    if (!searchTerm) {
      setSearchError('Ange ett namn eller anställningsnummer.');
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    setSearchedUser(null);

    try {
      if (!firestore) {
        throw new Error('Firestore not initialized');
      }
      const usersRef = collection(firestore, 'profiles');
      // Fetch all users to be able to search by name on the client side
      const querySnapshot = await getDocs(usersRef);

      const searchTermLower = searchTerm.toLowerCase();

      const results = querySnapshot.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as UserProfile))
        .filter(user => {
            const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
            // Match against employeeId or if the full name includes the search term
            return user.employeeId === searchTerm || fullName.includes(searchTermLower);
        });
      
      if (results.length === 1) {
        setSearchedUser(results[0]);
      } else if (results.length > 1) {
        setSearchError('Flera användare matchar sökningen. Var mer specifik.');
      } else {
        setSearchError(`Ingen användare hittades med söktermen "${employeeId}".`);
      }

    } catch (error) {
      console.error('Error searching for user:', error);
      setSearchError('Ett fel uppstod vid sökningen.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchedUser(null);
    setEmployeeId('');
    setSearchError(null);
  };

  const handleSaveSettings = (values: CompanySettings) => {
    if (!settingsDocRef) return;
    setIsSavingSettings(true);
    setDocumentNonBlocking(settingsDocRef, values, { merge: true });
    toast({ title: 'Sparat!', description: 'Företagsinställningarna har uppdaterats.' });
    setTimeout(() => setIsSavingSettings(false), 1000);
  };

  const handleClearSettings = () => {
    if (!settingsDocRef) return;
    setIsSavingSettings(true);
    const emptySettings: CompanySettings = {
        companyName: '',
        orgNumber: '',
        address: '',
        postalCode: '',
        city: '',
        contactPerson: '',
        companyPhone: '',
        companyEmail: '',
        standardTerms: '',
    };
    setDocumentNonBlocking(settingsDocRef, emptySettings, {});
    toast({ title: 'Rensat!', description: 'Företagsinställningarna har rensats.' });
    setTimeout(() => setIsSavingSettings(false), 1000);
  };

  const handleGenerateContract = async () => {
    if (!searchedUser) {
        toast({
            variant: 'destructive',
            title: 'Anställd saknas',
            description: 'Du måste först söka fram och välja en anställd.',
        });
        return;
    }
    if (!companySettings) {
         toast({
            variant: 'destructive',
            title: 'Företagsuppgifter saknas',
            description: 'Fyll i företagsuppgifterna för att kunna skapa ett avtal.',
        });
        return;
    }
    setIsGenerating(true);
    try {
        await generateContract(searchedUser, companySettings);
    } catch (e) {
        console.error("Failed to generate PDF", e);
        toast({
            variant: 'destructive',
            title: 'Fel vid PDF-generering',
            description: 'Kunde inte skapa PDF-filen. Se konsolen för mer information.',
        });
    } finally {
        setIsGenerating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generera Anställningsavtal</CardTitle>
        <CardDescription>
          Hämta en anställds uppgifter och fyll i företagsinformation för att skapa
          ett nytt anställningsavtal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Search Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Hämta anställd</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Sök på namn eller anställningsnummer för den person du
            vill skapa ett avtal för.
          </p>
          <div className="flex flex-col sm:flex-row w-full max-w-sm sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="employeeId" className="sr-only">
                Namn eller anställningsnummer
              </Label>
              <Input
                id="employeeId"
                placeholder="Namn eller anställningsnummer..."
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                disabled={!!searchedUser}
              />
            </div>
            <Button type="button" onClick={handleSearch} disabled={isSearching || !!searchedUser} className="w-full sm:w-auto">
              {isSearching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Sök
            </Button>
          </div>
          {searchError && (
            <p className="text-sm text-destructive">{searchError}</p>
          )}
          {searchedUser && (
            <Card className="bg-muted/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className="font-medium">
                        {searchedUser.firstName} {searchedUser.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {searchedUser.email}
                    </p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClearSearch} className="text-muted-foreground hover:text-destructive">
                    <X className="h-5 w-5" />
                    <span className='sr-only'>Radera val</span>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <Separator />

        {/* Company Settings Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Företagsuppgifter</h3>
          </div>
          <CompanySettingsForm
             initialData={companySettings}
             isLoading={isLoadingSettings}
             onSave={handleSaveSettings}
             onClear={handleClearSettings}
             isSaving={isSavingSettings}
          />
        </div>

        <Separator />

        {/* Generate Button Section */}
        <div className="flex flex-col items-center gap-4 pt-4">
          <Button type="button" size="lg" disabled={!searchedUser || isGenerating || isLoadingSettings} onClick={handleGenerateContract}>
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            Generera Anställningsavtal
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
