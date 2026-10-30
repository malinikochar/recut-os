'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Activity,
  Boxes,
  ChevronRight,
  ClipboardList,
  FlaskConical,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  Scissors,
  ShieldCheck,
  X,
} from 'lucide-react';
import { signOutAction } from '@/lib/actions/auth';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navGroups = [
  {
    groupLabel: 'Operations',
    items: [
      { href: '/app', label: 'Overview', icon: LayoutDashboard, exact: true },
      { href: '/app/jobs', label: 'Cutting Jobs', icon: ClipboardList, exact: false },
    ],
  },
  {
    groupLabel: 'Inventory & Specs',
    items: [
      {
        href: '/app/inventory',
        label: 'Sheet & Remnant Stock',
        icon: Boxes,
        exact: false,
      },
      {
        href: '/app/materials',
        label: 'Material Catalog',
        icon: Layers,
        exact: false,
      },
    ],
  },
];

function resolveSectionTitle(pathname: string): string {
  if (pathname === '/app') return 'Workshop Overview';
  if (pathname.startsWith('/app/materials')) return 'Material Catalog';
  if (pathname.startsWith('/app/inventory')) return 'Sheet & Remnant Stock';
  if (pathname === '/app/jobs/new') return 'New Cutting Job';
  if (pathname.startsWith('/app/jobs/')) return 'Job Specification & Optimizer';
  if (pathname.startsWith('/app/jobs')) return 'Cutting Jobs';
  if (pathname.startsWith('/app/plans/')) return 'Verified Cutting Plan';
  return 'Command Console';
}

export function AppShell({
  userEmail,
  children,
}: {
  userEmail: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const currentSection = resolveSectionTitle(pathname);

  const renderLinks = (onNavigate?: () => void) => (
    <nav aria-label="Workspace navigation" className="space-y-5">
      {navGroups.map((group) => (
        <div key={group.groupLabel} className="space-y-1.5">
          <p className="px-3 text-[11px] font-semibold tracking-[0.08em] uppercase text-white/45">
            {group.groupLabel}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => {
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
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-bold leading-4 transition-colors duration-150',
                    active
                      ? 'bg-accent text-white shadow-xs'
                      : 'text-white/72 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      active ? 'text-white' : 'text-white/65'
                    )}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-bg-page text-fg">
      {/* Desktop 256px dark frosted command rail (DESIGN.md shell-sidebar) */}
      <aside className="no-print cc-shell-glass sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between border-r lg:flex">
        <div className="space-y-6 p-4">
          <div className="flex h-10 items-center justify-between border-b border-white/10 pb-3">
            <Link
              href="/app"
              className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white shadow-xs">
                <Scissors className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="leading-tight">
                <span className="block text-sm font-bold">ReCut OS</span>
                <span className="block font-mono text-[10px] tracking-[0.08em] uppercase text-accent-warm">
                  Command Center
                </span>
              </div>
            </Link>
          </div>

          {renderLinks()}
        </div>

        <div className="space-y-3 border-t border-white/10 p-4">
          <div className="rounded-lg border border-white/10 bg-white/6 p-3 text-[11px] text-white/75">
            <div className="flex items-center gap-1.5 font-semibold tracking-[0.04em] uppercase text-accent-warm">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Engine Guardrails</span>
            </div>
            <p className="mt-1 font-mono text-[10px] leading-relaxed text-white/65">
              INTEGER MM · KERF VERIFIED
              <br />
              FORCED RLS · ROW-LOCKED RPC
            </p>
          </div>

          <Link
            href="/demo"
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 transition-colors hover:border-accent hover:bg-accent/20 hover:text-white"
          >
            <span className="flex items-center gap-2">
              <FlaskConical className="h-3.5 w-3.5 text-accent-warm" aria-hidden="true" />
              <span>Public Demo Fixture</span>
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-white/50" aria-hidden="true" />
          </Link>

          <div className="rounded-lg border border-white/12 bg-white/8 px-3 py-2.5">
            <p className="truncate text-xs font-semibold text-white">
              {userEmail ?? 'Authenticated Workshop'}
            </p>
            <form action={signOutAction} className="mt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-white/70 transition-colors hover:text-accent-warm cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main workspace column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sticky 64px dark frosted command top bar (DESIGN.md shell-header) */}
        <header className="no-print cc-shell-glass sticky top-0 z-30 flex h-16 items-center justify-between border-b px-4 sm:px-6 lg:px-8">
          {/* Mobile left: Menu trigger + Brand */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
              <Dialog.Trigger asChild>
                <Button
                  variant="shell"
                  size="icon"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-40 bg-black/65 backdrop-blur-xs" />
                <Dialog.Content className="cc-shell-drawer fixed inset-y-0 left-0 z-50 flex w-72 flex-col justify-between border-r p-4 focus:outline-none">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <Dialog.Title className="flex items-center gap-2 text-sm font-bold text-white">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-white">
                          <Scissors className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        <span>ReCut OS Workspace</span>
                      </Dialog.Title>
                      <Dialog.Close asChild>
                        <Button
                          variant="shellGhost"
                          size="icon"
                          aria-label="Close navigation menu"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </Dialog.Close>
                    </div>
                    {renderLinks(() => setMobileOpen(false))}
                  </div>

                  <div className="space-y-3 border-t border-white/10 pt-4">
                    <Link
                      href="/demo"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/6 px-3 py-2 text-xs text-white/80 hover:text-white"
                    >
                      <FlaskConical
                        className="h-3.5 w-3.5 text-accent-warm"
                        aria-hidden="true"
                      />
                      <span>Public Demo Fixture</span>
                    </Link>
                    <p className="truncate text-xs text-white/70">{userEmail}</p>
                    <form action={signOutAction}>
                      <Button
                        type="submit"
                        variant="shell"
                        size="sm"
                        className="w-full"
                      >
                        <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                        Sign out
                      </Button>
                    </form>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>

            <Link
              href="/app"
              className="flex items-center gap-2 text-sm font-bold text-white"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-white">
                <Scissors className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span>ReCut OS</span>
            </Link>
          </div>

          {/* Desktop left: Command Center breadcrumb */}
          <div className="hidden items-center gap-2.5 text-xs lg:flex">
            <span className="font-mono text-[11px] font-semibold tracking-[0.06em] uppercase text-white/55">
              Workshop Shell
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-white/35" aria-hidden="true" />
            <span className="font-semibold text-white">{currentSection}</span>
          </div>

          {/* Right telemetry & single global ThemeToggle */}
          <div className="flex items-center gap-2.5">
            <div className="hidden items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[11px] font-medium text-white/85 sm:inline-flex">
              <span
                className="h-2 w-2 rounded-full bg-[#00c758]"
                aria-hidden="true"
              />
              <Activity className="h-3 w-3 text-accent-warm" aria-hidden="true" />
              <span className="font-mono">GUILLOTINE v1 · RLS</span>
            </div>

            <ThemeToggle variant="shell" />
          </div>
        </header>

        <main
          id="main-content"
          className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
