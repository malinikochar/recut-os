'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

const authCredentialsSchema = z.object({
  email: z.string().trim().email('Enter a valid workshop email address.').max(160),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long.')
    .max(128, 'Password cannot exceed 128 characters.'),
  nextPath: z.string().optional(),
});

export interface AuthActionResult {
  ok: boolean;
  error?: string;
  notice?: string;
}

function getSafeRedirectPath(candidate?: string): string {
  if (candidate && candidate.startsWith('/app') && !candidate.startsWith('//')) {
    return candidate;
  }
  return '/app';
}

export async function signInAction(input: {
  email: string;
  password: string;
  nextPath?: string;
}): Promise<AuthActionResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error:
        'Supabase environment variables are not configured on this deployment.',
    };
  }

  const parsed = authCredentialsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid sign-in credentials.',
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      ok: false,
      error: error.message,
    };
  }

  redirect(getSafeRedirectPath(parsed.data.nextPath));
}

export async function signUpAction(input: {
  email: string;
  password: string;
  nextPath?: string;
}): Promise<AuthActionResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error:
        'Supabase environment variables are not configured on this deployment.',
    };
  }

  const parsed = authCredentialsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid sign-up details.',
    };
  }

  const supabase = await createClient();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'http://localhost:3000';

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) {
    return {
      ok: false,
      error: error.message,
    };
  }

  if (data.session) {
    redirect(getSafeRedirectPath(parsed.data.nextPath));
  }

  return {
    ok: true,
    notice:
      'Account created. Check your email inbox to confirm your address before signing in.',
  };
}

export async function signOutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect('/login');
}
