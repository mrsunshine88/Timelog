'use client';
import { MainNav } from '@/app/dashboard/components/main-nav';
import { UserNav } from '@/app/dashboard/components/user-nav';
import { Logo } from '@/components/logo';
import Link from 'next/link';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import type { Permissions } from '@/lib/types';

const defaultLinks = [
  { href: '/dashboard/reports', label: 'Rapportera tid' },
  { href: '/dashboard/projects', label: 'Mina sidor' },
  { href: '/dashboard/schema', label: 'Schema' },
  { href: '/dashboard/live', label: 'Live' },
];

const adminLink = { href: '/dashboard/admin', label: 'Admin' };

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  // Redirect to login if, after loading, there is no authenticated user.
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [isUserLoading, user, router]);


  // Show a full-page spinner while the initial user/profile state is being determined.
  // This is the absolute gatekeeper for the dashboard.
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Logo className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  // If loading is complete but there's still no user, render nothing and wait for redirect.
  // This prevents any "flash" of dashboard content for unauthorized users.
  if (!user) {
    return null;
  }

  // 3. If the user is valid, render the dashboard.
  const isSuperAdmin = profile?.employeeId === '64112';
  const adminPermissions: (keyof Permissions)[] = ['handleUsers', 'generateContracts', 'approvePayroll', 'handlePermissions'];
  const hasAdminAccess = isSuperAdmin || (profile?.permissions && adminPermissions.some(p => !!profile.permissions[p]));
  
  const links = hasAdminAccess ? [...defaultLinks, adminLink] : defaultLinks;

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-muted px-4 md:px-6">
        <div className="flex items-center gap-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-4">
              <SheetHeader>
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              </SheetHeader>
              <nav className="grid gap-4 text-lg font-medium">
                <Link
                  href="/dashboard/reports"
                  className="flex items-center gap-2 font-semibold mb-4"
                >
                  <Logo className="h-6 w-6" />
                  <span>Timelog</span>
                </Link>
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'transition-colors hover:text-foreground',
                      pathname.startsWith(link.href)
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <Link
            href="/dashboard/reports"
            className="hidden md:flex items-center gap-2 font-semibold"
          >
            <Logo className="h-6 w-6" />
            <span className="text-lg">Timelog</span>
          </Link>
          <MainNav />
        </div>

        <div className="ml-auto">
          <UserNav />
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
