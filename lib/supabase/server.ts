import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './database.types';
import { getSupabasePublicEnv } from './env';

export async function createClient() {
  const env = getSupabasePublicEnv();
  if (!env) {
    throw new Error(
      'Supabase environment variables are not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component; session refresh is handled by proxy.ts
        }
      },
    },
  });
}

export async function getAuthenticatedIdentity(): Promise<{
  userId: string;
  email: string | null;
} | null> {
  const env = getSupabasePublicEnv();
  if (!env) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }

  return {
    userId: data.user.id,
    email: data.user.email ?? null,
  };
}
