'use client';

import * as React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl py-12">
      <Card className="border-[#E05A5A]/45">
        <CardHeader>
          <div className="flex items-center gap-2 text-[#FF9999]">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            <CardTitle>Workspace Operation Interrupted</CardTitle>
          </div>
          <CardDescription>
            The requested workshop view encountered an unexpected error. Your
            committed inventory records remain intact.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="rounded-lg border border-[#2A363C] bg-[#0B1013] p-3 font-mono text-xs text-[#A9B4B4]">
            {error.message || 'Unexpected workspace runtime error.'}
          </p>
          <Button type="button" onClick={reset}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Retry View
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
