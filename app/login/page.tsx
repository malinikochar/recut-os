import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Scissors } from 'lucide-react';
import { AuthForm } from '@/components/domain/auth-form';
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B1013] px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <Link href="/" className="flex items-center gap-2.5 text-lg font-bold text-[#F2F0E9]">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#29B49B]/40 bg-[#29B49B]/15 text-[#29B49B]">
            <Scissors className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>ReCut OS</span>
        </Link>
        <p className="text-xs text-[#A9B4B4]">
          Remnant-first sheet recovery & verified guillotine planning
        </p>
      </div>

      <main id="main-content" className="w-full flex justify-center">
        <AuthForm
          nextPath={params.next}
          supabaseConfigured={configured}
          initialReason={params.reason ?? params.error}
        />
      </main>
    </div>
  );
}
