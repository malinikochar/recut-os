import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Scissors } from 'lucide-react';
import { AuthForm } from '@/components/domain/auth-form';
import { ThemeToggle } from '@/components/theme/theme-toggle';
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
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-bg-page px-4 py-12 text-fg">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <Link href="/" className="flex items-center gap-2.5 text-lg font-bold text-fg">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent-border bg-accent-soft text-accent-text">
            <Scissors className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>ReCut OS</span>
        </Link>
        <p className="text-xs text-fg-muted">
          Remnant-first sheet recovery & verified guillotine planning
        </p>
      </div>

      <main id="main-content" className="flex w-full justify-center">
        <AuthForm
          nextPath={params.next}
          supabaseConfigured={configured}
          initialReason={params.reason ?? params.error}
        />
      </main>
    </div>
  );
}
