import Link from 'next/link';
import { ArrowLeft, FlaskConical, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center bg-[#0B1013] px-4 text-center text-[#F2F0E9]"
    >
      <div className="max-w-md space-y-5 rounded-2xl border border-[#2A363C] bg-[#141B1F] p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[#29B49B]/40 bg-[#29B49B]/15 text-[#29B49B]">
          <Scissors className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-wider text-[#29B49B]">
            HTTP 404
          </p>
          <h1 className="text-2xl font-bold tracking-tight">
            Requested Sheet or Route Not Found
          </h1>
          <p className="text-sm text-[#A9B4B4]">
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
