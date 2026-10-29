export function getSupabasePublicEnv(): {
  url: string;
  publishableKey: string;
} | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (
    !url ||
    !publishableKey ||
    url.includes('YOUR_PROJECT') ||
    publishableKey.includes('YOUR_SUPABASE_PUBLISHABLE_KEY')
  ) {
    return null;
  }

  return { url, publishableKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabasePublicEnv() !== null;
}
