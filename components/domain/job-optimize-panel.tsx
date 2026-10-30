'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Loader2,
  Play,
  Trash2,
} from 'lucide-react';
import {
  deleteJobAction,
  generateAndSavePlanAction,
} from '@/lib/actions/workshop';
import type { OptimizationEvaluation } from '@/lib/domain/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface JobOptimizePanelProps {
  jobId: string;
  jobStatus: 'draft' | 'planned' | 'committed';
  availableOwnedStockCount: number;
  pendingStockCount: number;
}

export function JobOptimizePanel({
  jobId,
  jobStatus,
  availableOwnedStockCount,
  pendingStockCount,
}: JobOptimizePanelProps) {
  const router = useRouter();
  const [optimizing, setOptimizing] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [infeasibleEval, setInfeasibleEval] =
    React.useState<OptimizationEvaluation | null>(null);

  async function handleOptimize() {
    setOptimizing(true);
    setError(null);
    setInfeasibleEval(null);
    try {
      const res = await generateAndSavePlanAction({ jobId, seed: 42 });
      if (!res.ok) {
        setError(res.error ?? 'Could not generate cutting plan.');
        if (res.data?.evaluation) {
          setInfeasibleEval(res.data.evaluation);
        }
        setOptimizing(false);
        return;
      }

      if (res.data?.planId) {
        router.push(`/app/plans/${res.data.planId}`);
        return;
      }
      router.refresh();
      setOptimizing(false);
    } catch {
      setError('Network error while running cutting optimizer.');
      setOptimizing(false);
    }
  }

  async function handleDeleteJob() {
    setDeleting(true);
    setError(null);
    try {
      const res = await deleteJobAction(jobId);
      if (!res.ok) {
        setError(res.error ?? 'Could not delete job.');
        setDeleting(false);
        return;
      }
      router.push('/app/jobs');
    } catch {
      setError('Network error while deleting job.');
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-accent-border bg-bg-subtle">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>Remnant-First Guillotine Planner</CardTitle>
                <Badge
                  variant={
                    jobStatus === 'committed'
                      ? 'default'
                      : jobStatus === 'planned'
                        ? 'amber'
                        : 'muted'
                  }
                >
                  Job {jobStatus}
                </Badge>
              </div>
              <CardDescription>
                Evaluates{' '}
                <span className="font-mono text-fg">
                  {availableOwnedStockCount}
                </span>{' '}
                available owned stock{' '}
                {availableOwnedStockCount === 1 ? 'rectangle' : 'rectangles'}{' '}
                before opening new standard sheets, verifies every cut tree
                independently, and saves an auditable draft plan.
                {pendingStockCount > 0 && (
                  <span className="ml-1 text-amber-text">
                    ({pendingStockCount} pending-confirmation{' '}
                    {pendingStockCount === 1 ? 'remnant is' : 'remnants are'}{' '}
                    withheld until shop measurement.)
                  </span>
                )}
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {jobStatus !== 'committed' && (
                <>
                  <Button
                    type="button"
                    onClick={handleOptimize}
                    disabled={optimizing || deleting}
                  >
                    {optimizing ? (
                      <>
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                        Computing & Verifying Cut Tree...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" aria-hidden="true" />
                        Generate Cutting Plan
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={optimizing || deleting}
                    onClick={handleDeleteJob}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Delete Job
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        {error && (
          <CardContent className="pt-0">
            <div
              role="alert"
              className="space-y-3 rounded-xl border border-danger-border bg-danger-soft p-4 text-xs text-danger-text"
            >
              <div className="flex items-center gap-2 font-semibold text-fg">
                <AlertTriangle
                  className="h-4 w-4 text-danger-text"
                  aria-hidden="true"
                />
                <span>Plan Generation Blocked — Infeasible or Invalid Input</span>
              </div>
              <p>{error}</p>

              {infeasibleEval &&
                infeasibleEval.optimized.diagnostics.length > 0 && (
                  <div className="space-y-1.5 border-t border-danger-border pt-2.5">
                    <p className="font-medium text-fg">
                      Constraint Diagnostics (
                      {infeasibleEval.optimized.diagnostics.length}):
                    </p>
                    <ul className="list-disc space-y-1 pl-5 text-fg">
                      {infeasibleEval.optimized.diagnostics.map((d, idx) => (
                        <li key={idx}>
                          <span className="font-mono font-semibold uppercase">
                            [{d.code}]
                          </span>{' '}
                          {d.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
