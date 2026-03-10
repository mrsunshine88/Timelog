'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/firebase';
import { signInWithEmailAndPassword, AuthErrorCodes } from 'firebase/auth';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const auth = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!/^\d{5}$/.test(username)) {
      setError('Användarnamnet måste vara 5 siffror.');
      setIsLoading(false);
      return;
    }

    const email = `${username}@timelog.app`;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard/reports');
    } catch (error: any) {
        if (error.code === 'auth/invalid-credential' || 
            error.code === 'auth/user-not-found' || 
            error.code === 'auth/wrong-password' ||
            error.code === AuthErrorCodes.INVALID_PASSWORD) {
          setError('Felaktigt användarnamn eller lösenord.');
        } else {
          setError('Ett oväntat fel uppstod. Försök igen.');
          console.error("Login Error:", error);
        }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full items-center justify-center bg-background p-4">
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm text-center">
            {/* Top: Logo and headlines */}
            <div className="mb-8">
                <div className="flex items-center justify-center gap-4 mb-4">
                    <Logo className="h-12 w-12 text-primary" />
                    <h1 className="text-5xl font-bold tracking-tight">Timelog</h1>
                </div>
                <h2 className="text-xl font-semibold tracking-tight text-gray-800">
                    Din digitala partner för personaladministration
                </h2>
            </div>
            
            {/* Middle: Login card */}
            <Card className="w-full">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Välkommen</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="grid gap-4">
                    {error && (
                        <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Fel</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    <div className="grid gap-2 text-left">
                        <Label htmlFor="username">Användarnamn (5 siffror)</Label>
                        <Input
                        id="username"
                        type="text"
                        placeholder=""
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        maxLength={5}
                        />
                    </div>
                    <div className="grid gap-2 text-left">
                        <Label htmlFor="password">Lösenord</Label>
                        <Input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Logga in
                    </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
        
        {/* Bottom: Footer text */}
        <footer className="w-full max-w-2xl text-center py-8">
             <div className="border-t w-full max-w-lg mx-auto mb-6"></div>
            <p className="text-sm text-gray-700 dark:text-gray-400 leading-relaxed px-4">
                Timelog – Centraliserad personaladministration för moderna verksamheter. Plattformen optimerar tidsrapportering, anställningsflöden och löneunderlag med hög precision och säkerhet.
            </p>
        </footer>
    </div>
  );
}
