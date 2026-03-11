'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Share, PlusSquare } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export function PwaPrompt() {
  const [showIosPrompt, setShowIosPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      return;
    }

    const hasDismissed = localStorage.getItem('pwaPromptDismissed');
    if (hasDismissed) {
      setIsDismissed(true);
      return;
    }

    // Android/Chrome Install Prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOS Safari Check
    const isIos = /ipad|iphone|ipod/.test(navigator.userAgent.toLowerCase()) && !(window as any).MSStream;
    const isSafari = /safari/.test(navigator.userAgent.toLowerCase()) && !/chrome|crios/.test(navigator.userAgent.toLowerCase());
    
    // Show iOS prompt slightly delayed if appropriate device and not in standalone
    if (isIos && isSafari && isMobile) {
      const timer = setTimeout(() => {
        setShowIosPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isMobile]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setShowIosPrompt(false);
    localStorage.setItem('pwaPromptDismissed', 'true');
  };

  if (isDismissed) return null;

  // Android Prompt
  if (deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-primary text-primary-foreground p-4 rounded-xl shadow-xl flex items-center justify-between z-50 animate-in slide-in-from-bottom-5">
        <div className="flex-1">
          <p className="font-semibold text-sm">Installera Timelog</p>
          <p className="text-xs opacity-90">Lägg till appen på startskärmen för snabbare åtkomst.</p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Button variant="secondary" size="sm" onClick={handleInstallClick}>
            Installera
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDismiss} className="text-primary-foreground hover:bg-primary-foreground/20">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // iOS Prompt
  if (showIosPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 bg-primary text-primary-foreground p-4 rounded-xl shadow-xl z-50 animate-in slide-in-from-bottom-5">
        <div className="flex justify-between items-start mb-2">
            <p className="font-semibold text-sm">Installera Timelog på iOS</p>
            <Button variant="ghost" size="icon" onClick={handleDismiss} className="h-6 w-6 -mt-1 -mr-1 text-primary-foreground hover:bg-primary-foreground/20">
                <X className="h-4 w-4" />
            </Button>
        </div>
        <p className="text-xs opacity-90 mb-3">Installera webbappen genom att:</p>
        <ol className="text-xs space-y-2 opacity-90">
            <li className="flex items-center gap-2">
                <span className="bg-primary-foreground/20 rounded-full w-5 h-5 flex items-center justify-center font-bold">1</span>
                Tryck på "Dela" <Share className="h-3 w-3 inline" /> i webbläsarens meny längst ner.
            </li>
            <li className="flex items-center gap-2">
                <span className="bg-primary-foreground/20 rounded-full w-5 h-5 flex items-center justify-center font-bold">2</span>
                Välj "Lägg till på hemskärmen" <PlusSquare className="h-3 w-3 inline" /> i listan.
            </li>
        </ol>
      </div>
    );
  }

  return null;
}
