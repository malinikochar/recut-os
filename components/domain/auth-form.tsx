'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, FlaskConical, Loader2 } from 'lucide-react';
import { signInAction, signUpAction } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';

export function AuthForm({
  nextPath,
  supabaseConfigured,
  initialReason,
}: {
  nextPath?: string;
  supabaseConfigured: boolean;
  initialReason?: string;
}) {
  const [mode, setMode] = React.useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(
    initialReason === 'supabase_unconfigured'
      ? 'Supabase public credentials are not configured in this environment. You can still explore the full interactive /demo.'
      : null
  );
  const [notice, setNotice] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    startTransition(async () => {
      const action = mode === 'signin' ? signInAction : signUpAction;
      const result = await action({ email, password, nextPath });
      if (!result.ok && result.error) {
        setError(result.error);
      } else if (result.notice) {
        setNotice(result.notice);
      }
    });
  };

  return (
    <Card className="w-full max-w-md border-[#394950]">
      <CardHeader className="space-y-3">
        <div
          role="tablist"
          aria-label="Authentication mode"
          className="grid grid-cols-2 rounded-lg border border-[#2A363C] bg-[#0B1013] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signin'}
            onClick={() => {
              setMode('signin');
              setError(null);
              setNotice(null);
            }}
            className={`rounded-md py-2 text-xs font-semibold transition-colors cursor-pointer ${
              mode === 'signin'
                ? 'bg-[#29B49B] text-[#0B1013]'
                : 'text-[#A9B4B4] hover:text-[#F2F0E9]'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            onClick={() => {
              setMode('signup');
              setError(null);
              setNotice(null);
            }}
            className={`rounded-md py-2 text-xs font-semibold transition-colors cursor-pointer ${
              mode === 'signup'
                ? 'bg-[#29B49B] text-[#0B1013]'
                : 'text-[#A9B4B4] hover:text-[#F2F0E9]'
            }`}
          >
            Create account
          </button>
        </div>

        <div>
          <CardTitle>
            {mode === 'signin'
              ? 'Sign in to your workshop'
              : 'Create a private workshop account'}
          </CardTitle>
          <CardDescription>
            {mode === 'signin'
              ? 'Access your owner-isolated material catalog, physical remnant inventory, and saved cutting plans.'
              : 'Every table is protected by Supabase Row Level Security so your inventory belongs exclusively to your account.'}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-[#E05A5A]/50 bg-[#E05A5A]/15 p-3 text-xs text-[#FF9999]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-lg border border-[#29B49B]/40 bg-[#29B49B]/15 p-3 text-xs text-[#5CE1C9]"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{notice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="auth-email">Workshop Email</Label>
            <Input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="planner@workshop.example"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!supabaseConfigured || pending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="auth-password">Password (minimum 8 characters)</Label>
            <Input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={
                mode === 'signin' ? 'current-password' : 'new-password'
              }
              required
              minLength={8}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!supabaseConfigured || pending}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!supabaseConfigured || pending}
          >
            {pending && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            {mode === 'signin' ? 'Sign in to workspace' : 'Create workshop account'}
          </Button>
        </form>

        <div className="border-t border-[#2A363C] pt-4 text-center">
          <Link
            href="/demo"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5CE1C9] hover:underline"
          >
            <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
            Evaluating for Arbiter Hacks? Explore the 1-click public /demo without
            signing in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
