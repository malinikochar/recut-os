import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { getAuthenticatedIdentity } from '@/lib/supabase/server';

export default async function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const identity = await getAuthenticatedIdentity();
  if (!identity) {
    redirect('/login');
  }

  return <AppShell userEmail={identity.email}>{children}</AppShell>;
}
