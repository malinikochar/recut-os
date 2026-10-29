'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Boxes,
  ClipboardList,
  FlaskConical,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  Scissors,
  X,
} from 'lucide-react';
import { signOutAction } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/app', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/app/materials', label: 'Material Catalog', icon: Layers, exact: false },
  { href: '/app/inventory', label: 'Sheet & Remnant Stock', icon: Boxes, exact: false },
  { href: '/app/jobs', label: 'Cutting Jobs', icon: ClipboardList, exact: false },
];

export function AppShell({
  userEmail,
  children,
}: {
  userEmail: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const renderLinks = (onNavigate?: () => void) => (
    <nav aria-label="Workspace navigation" className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-[#29B49B]/15 text-[#5CE1C9] border border-[#29B49B]/35'
                : 'text-[#A9B4B4] hover:bg-[#1C2529] hover:text-[#F2F0E9]'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-[#0B1013] text-[#F2F0E9]">
      {/* Desktop 240px navigation rail */}
      <aside className="no-print hidden w-60 shrink-0 flex-col justify-between border-r border-[#2A363C] bg-[#11171B] p-4 lg:flex">
        <div className="space-y-6">
          <Link
            href="/app"
            className="flex items-center gap-2.5 px-2 py-1 text-base font-bold tracking-tight text-[#F2F0E9]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#29B49B]/15 text-[#29B49B] border border-[#29B49B]/40">
              <Scissors className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>ReCut OS</span>
          </Link>

          {renderLinks()}
        </div>

        <div className="space-y-3 border-t border-[#2A363C] pt-4">
          <Link
            href="/demo"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-[#A9B4B4] hover:bg-[#1C2529] hover:text-[#F2F0E9]"
          >
            <FlaskConical className="h-3.5 w-3.5 text-[#29B49B]" aria-hidden="true" />
            <span>Public Demo Fixture</span>
          </Link>

          <div className="rounded-lg border border-[#2A363C] bg-[#0B1013] px-3 py-2.5">
            <p className="truncate text-xs font-medium text-[#F2F0E9]">
              {userEmail ?? 'Authenticated Workshop'}
            </p>
            <form action={signOutAction} className="mt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 text-xs text-[#A9B4B4] hover:text-[#F2F0E9] cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="no-print flex items-center justify-between border-b border-[#2A363C] bg-[#11171B] px-4 py-3 lg:hidden">
          <Link
            href="/app"
            className="flex items-center gap-2 text-sm font-bold text-[#F2F0E9]"
          >
            <Scissors className="h-4 w-4 text-[#29B49B]" aria-hidden="true" />
            <span>ReCut OS</span>
          </Link>

          <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
            <Dialog.Trigger asChild>
              <Button variant="outline" size="icon" aria-label="Open navigation menu">
                <Menu className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70" />
              <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col justify-between border-r border-[#2A363C] bg-[#11171B] p-4 focus:outline-none">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <Dialog.Title className="text-base font-bold text-[#F2F0E9]">
                      ReCut OS Workspace
                    </Dialog.Title>
                    <Dialog.Close asChild>
                      <Button variant="ghost" size="icon" aria-label="Close navigation menu">
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </Dialog.Close>
                  </div>
                  {renderLinks(() => setMobileOpen(false))}
                </div>

                <div className="space-y-3 border-t border-[#2A363C] pt-4">
                  <p className="truncate text-xs text-[#A9B4B4]">{userEmail}</p>
                  <form action={signOutAction}>
                    <Button type="submit" variant="outline" size="sm" className="w-full">
                      <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                      Sign out
                    </Button>
                  </form>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </header>

        <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
