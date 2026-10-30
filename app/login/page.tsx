import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import {
  ArrowLeft,
  Boxes,
  CheckCircle2,
  FlaskConical,
  Lock,
  Scissors,
  ShieldCheck,
} from 'lucide-react';
import { AuthForm } from '@/components/domain/auth-form';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getAuthenticatedIdentity } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Workshop Sign In',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string; error?: string }>;
}) {
  const params = await searchParams;
  const configured = isSupabaseConfigured();

  if (configured) {
    const identity = await getAuthenticatedIdentity();
    if (identity) {
      redirect('/app');
    }
  }

  return (
    <div className="grid min-h-screen bg-bg-page text-fg lg:grid-cols-2">
      {/* Left Half: Warm Command Visualization Panel (DESIGN.md Onboarding split) */}
      <div className="cc-grid-canvas flex min-w-0 flex-col justify-between border-b border-border-subtle p-6 sm:p-10 lg:border-r lg:border-b-0 lg:p-12">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-base font-bold tracking-tight text-fg"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-white shadow-xs">
              <Scissors className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <span className="block leading-tight">ReCut OS</span>
              <span className="block font-mono text-[10px] tracking-[0.06em] uppercase text-accent-text">
                Command Center
              </span>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted hover:text-fg"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to Home
          </Link>
        </div>

        <div className="my-8 space-y-6 lg:my-0">
          <div className="space-y-3">
            <Badge variant="production">Isolated Tenant Workspace</Badge>
            <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
              Inventory-safe guillotine planning for real shop racks.
            </h1>
            <p className="max-w-lg text-sm leading-relaxed text-fg-muted">
              Sign in to maintain your workshop&apos;s private sheet catalog,
              physical remnant bank, auditable draft layouts, and atomic plan
              commits.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div className="rounded-xl border border-border-subtle bg-bg-card p-4 cc-card">
              <div className="flex items-center gap-2 text-xs font-bold text-fg">
                <ShieldCheck
                  className="h-4 w-4 shrink-0 text-accent-text"
                  aria-hidden="true"
                />
                <span>Forced PostgreSQL RLS</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">
                Every material, stock unit, job, and cut sheet is isolated to
                your authenticated `auth.uid()`.
              </p>
            </div>

            <div className="rounded-xl border border-border-subtle bg-bg-card p-4 cc-card">
              <div className="flex items-center gap-2 text-xs font-bold text-fg">
                <Boxes
                  className="h-4 w-4 shrink-0 text-accent-text"
                  aria-hidden="true"
                />
                <span>1-to-1 Remnant Lineage</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">
                Track exact integer-mm offcuts from parent plan generation to
                measured rack confirmation.
              </p>
            </div>

            <div className="rounded-xl border border-border-subtle bg-bg-card p-4 cc-card">
              <div className="flex items-center gap-2 text-xs font-bold text-fg">
                <Lock
                  className="h-4 w-4 shrink-0 text-accent-text"
                  aria-hidden="true"
                />
                <span>Row-Locked Commits</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">
                Stale plans referencing consumed stock are rejected atomically
                before mutating inventory.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4 text-xs text-fg-muted">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#00c758]" aria-hidden="true" />
            Cookie-backed `@supabase/ssr` session
          </span>
          <Link
            href="/demo"
            className="inline-flex items-center gap-1.5 font-semibold text-accent-text hover:underline"
          >
            <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
            Open read-only `/demo` without login
          </Link>
        </div>
      </div>

      {/* Right Half: Saturated Command Orange Panel framing Login Card (DESIGN.md login-panel + login-card) */}
      <div className="relative flex min-w-0 flex-col items-center justify-center bg-gradient-to-br from-[#fe6e00] via-[#ff6b00] to-[#d95200] px-4 py-12 sm:px-8">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
          <ThemeToggle variant="shell" />
        </div>

        <main id="main-content" className="flex w-full justify-center">
          <AuthForm
            nextPath={params.next}
            supabaseConfigured={configured}
            initialReason={params.reason ?? params.error}
          />
        </main>
      </div>
    </div>
  );
}
