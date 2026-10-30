import Link from 'next/link';
import { ArrowLeft, FlaskConical, Scissors } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <main
      id="main-content"
      className="cc-grid-canvas relative flex min-h-screen flex-col items-center justify-center bg-bg-page px-4 text-center text-fg"
    >
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div className="cc-card-raised max-w-md space-y-5 overflow-hidden rounded-xl border border-border-subtle bg-bg-card p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-white shadow-xs">
          <Scissors className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <p className="cc-kicker text-accent-text">HTTP 404 · Route Missing</p>
          <h1 className="text-2xl font-bold tracking-tight">
            Requested Sheet or Route Not Found
          </h1>
          <p className="text-sm text-fg-muted">
            This workshop resource may not exist or belongs to a different
            authenticated account.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Button asChild variant="default">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Home
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/demo">
              <FlaskConical className="h-4 w-4" aria-hidden="true" />
              Open Public Demo
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
