'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';
import type { Permissions } from '@/lib/types';

const defaultLinks = [
  { href: '/dashboard/reports', label: 'Rapportera tid' },
  { href: '/dashboard/projects', label: 'Mina sidor' },
  { href: '/dashboard/schema', label: 'Schema' },
  { href: '/dashboard/live', label: 'Live' },
];

const adminLink = { href: '/dashboard/admin', label: 'Admin' };

export function MainNav() {
  const pathname = usePathname();
  const { profile, isUserLoading } = useUser();

  if (isUserLoading) {
    // Render a skeleton or placeholder while user data is loading
    return <nav className="hidden md:flex md:items-center md:gap-5 lg:gap-6 text-sm font-medium h-6 w-96 bg-muted/50 rounded animate-pulse" />;
  }
  
  const isSuperAdmin = profile?.employeeId === '64112';
  const adminPermissions: (keyof Permissions)[] = ['handleUsers', 'generateContracts', 'approvePayroll', 'handlePermissions'];
  const hasAdminAccess = isSuperAdmin || (profile?.permissions && adminPermissions.some(p => !!profile.permissions[p]));
  
  const links = hasAdminAccess ? [...defaultLinks, adminLink] : defaultLinks;

  return (
    <nav
      className="hidden md:flex md:items-center md:gap-5 lg:gap-6 text-sm font-medium"
    >
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
  );
}
