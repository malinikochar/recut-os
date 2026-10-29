import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';
import { getSupabasePublicEnv } from './env';

export function createClient() {
  const env = getSupabasePublicEnv();
  if (!env) {
    throw new Error(
      'Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) are not configured.'
    );
  }
  return createBrowserClient<Database>(env.url, env.publishableKey);
}
