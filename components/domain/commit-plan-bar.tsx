'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  commitSavedPlanAction,
  deleteDraftPlanAction,
} from '@/lib/actions/workshop';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface CommitPlanBarProps {
  planId: string;
  jobId: string;
  jobTitle: string;
  status: 'draft' | 'committed';
  committedAt: string | null;
  ownedStockCount: number;
  newSheetCount: number;
  recoverableRemnantCount: number;
}

export function CommitPlanBar({
  planId,
  jobId,
  jobTitle,
  status,
  committedAt,
  ownedStockCount,
  newSheetCount,
  recoverableRemnantCount,
}: CommitPlanBarProps) {
  const router = useRouter();
  const [committing, setCommitting] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isConflict, setIsConflict] = React.useState(false);
  const [commitReceipt, setCommitReceipt] = React.useState<{
    consumedStockCount: number;
    pendingRemnantsCreated: number;
  } | null>(null);

  async function handleCommit() {
    if (committing) return;
    setCommitting(true);
    setError(null);
    setIsConflict(false);
    try {
      const res = await commitSavedPlanAction(planId);
      if (!res.ok) {
        setError(res.error ?? 'Could not commit cutting plan.');
        setIsConflict(Boolean(res.conflict));
        setCommitting(false);
        return;
      }
      if (res.data) {
        setCommitReceipt({
          consumedStockCount: res.data.consumedStockCount,
          pendingRemnantsCreated: res.data.pendingRemnantsCreated,
        });
      }
      router.refresh();
      setCommitting(false);
    } catch {
      setError('Network error while committing plan transaction.');
      setCommitting(false);
    }
  }

  async function handleDeleteDraft() {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await deleteDraftPlanAction(planId);
      if (!res.ok) {
        setError(res.error ?? 'Could not delete draft plan.');
        setDeleting(false);
        return;
      }
      router.push(`/app/jobs/${jobId}`);
    } catch {
      setError('Network error while deleting draft plan.');
      setDeleting(false);
    }
  }

  const effectiveCommitted = status === 'committed' || commitReceipt !== null;

  return (
    <div className="space-y-4">
      <Card
        className={
          effectiveCommitted
            ? 'relative overflow-hidden border-[color:var(--status-prod-border)]'
            : 'relative overflow-hidden border-amber-border'
        }
      >
        <div
          className={
            effectiveCommitted
              ? 'h-1 w-full bg-[#00c758]'
              : 'h-1 w-full bg-accent'
          }
          aria-hidden="true"
        />
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>
                  {effectiveCommitted
                    ? 'Committed Production Plan'
                    : 'Draft Cutting Plan — Ready for Shop Commit'}
                </CardTitle>
                <Badge variant={effectiveCommitted ? 'production' : 'amber'}>
                  {effectiveCommitted ? 'committed' : 'draft'}
                </Badge>
              </div>
              <CardDescription>
                {effectiveCommitted ? (
                  <>
                    Inventory transaction executed for{' '}
                    <span className="font-semibold text-fg">{jobTitle}</span>
                    {committedAt && (
                      <>
                        {' '}
                        on{' '}
                        {new Date(committedAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'UTC',
                        })}{' '}
                        UTC
                      </>
                    )}
                    . Allocated owned stock is marked `consumed` and qualifying
                    residual offcuts are queued as `pending_confirmation`.
                  </>
                ) : (
                  <>
                    Committing executes an atomic row-locked transaction: marks{' '}
                    <span className="font-mono font-semibold text-fg">
                      {ownedStockCount}
                    </span>{' '}
                    allocated owned stock{' '}
                    {ownedStockCount === 1 ? 'unit' : 'units'} as `consumed`
                    {newSheetCount > 0 && (
                      <>
                        , logs{' '}
                        <span className="font-mono font-semibold text-fg">
                          {newSheetCount}
                        </span>{' '}
                        modeled new standard{' '}
                        {newSheetCount === 1 ? 'sheet' : 'sheets'}
                      </>
                    )}
                    , and creates{' '}
                    <span className="font-mono font-semibold text-fg">
                      {recoverableRemnantCount}
                    </span>{' '}
                    `pending_confirmation` offcut{' '}
                    {recoverableRemnantCount === 1 ? 'record' : 'records'}.
                  </>
                )}
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!effectiveCommitted ? (
                <>
                  <Button
                    type="button"
                    onClick={handleCommit}
                    disabled={committing || deleting}
                  >
                    {committing ? (
                      <>
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                        Locking Stock & Committing...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                        Commit Cutting Plan
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={committing || deleting}
                    onClick={handleDeleteDraft}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Delete Draft
                  </Button>
                </>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--status-prod-border)] bg-[color:var(--status-prod-bg)] px-3 py-1 text-xs font-semibold text-[color:var(--status-prod-fg)]">
                    <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                    Audit Locked
                  </span>
                  {recoverableRemnantCount > 0 && (
                    <Button asChild variant="amber" size="sm">
                      <Link href="/app/inventory?state=pending_confirmation">
                        <Boxes className="h-3.5 w-3.5" aria-hidden="true" />
                        Verify {recoverableRemnantCount} Pending{' '}
                        {recoverableRemnantCount === 1 ? 'Remnant' : 'Remnants'}
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        {(commitReceipt || error) && (
          <CardContent className="pt-0">
            {commitReceipt && (
              <div
                role="status"
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--status-prod-border)] bg-[color:var(--status-prod-bg)] p-3.5 text-xs font-medium text-[color:var(--status-prod-fg)]"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>
                    Committed atomically: {commitReceipt.consumedStockCount}{' '}
                    owned stock{' '}
                    {commitReceipt.consumedStockCount === 1 ? 'item' : 'items'}{' '}
                    consumed; {commitReceipt.pendingRemnantsCreated}{' '}
                    `pending_confirmation`{' '}
                    {commitReceipt.pendingRemnantsCreated === 1
                      ? 'remnant'
                      : 'remnants'}{' '}
                    staged for shop measurement.
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="space-y-3 rounded-xl border border-danger-border bg-danger-soft p-4 text-xs text-danger-text"
              >
                <div className="flex items-center gap-2 font-bold text-fg">
                  <AlertTriangle
                    className="h-4 w-4 text-danger-text"
                    aria-hidden="true"
                  />
                  <span>
                    {isConflict
                      ? 'Inventory Conflict — Stale Plan Blocked'
                      : 'Plan Commit Error'}
                  </span>
                </div>
                <p>{error}</p>
                {isConflict && (
                  <div>
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/app/jobs/${jobId}`}>
                        <RefreshCw
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                        Return to Job & Generate Fresh Plan
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
