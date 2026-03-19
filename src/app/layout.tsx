import type {Metadata} from 'next';
import './globals.css';
import {Toaster} from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { PwaPrompt } from '@/components/pwa-prompt';

export const metadata: Metadata = {
  title: 'Timelog',
  description: 'Effortless Time Tracking and Project Management',
  manifest: '/manifest.json',
  appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'Timelog',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
            {children}
            <PwaPrompt />
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
