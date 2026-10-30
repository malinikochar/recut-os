'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import { seedStarterWorkshopAction } from '@/lib/actions/workshop';
import { Button } from '@/components/ui/button';

export function SeedWorkshopButton({
  redirectToJob = true,
}: {
  redirectToJob?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSeed() {
    setPending(true);
    setError(null);
    try {
      const res = await seedStarterWorkshopAction();
      if (!res.ok) {
        setError(res.error ?? 'Failed to seed starter workshop data.');
        setPending(false);
        return;
      }
      if (redirectToJob && res.data?.jobId) {
        router.push(`/app/jobs/${res.data.jobId}`);
      } else {
        router.refresh();
        setPending(false);
      }
    } catch {
      setError('Network error while seeding starter workshop data.');
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={handleSeed}
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Seeding starter catalog, remnants & job...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Load Starter Workshop Data
          </>
        )}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}
