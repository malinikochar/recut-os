import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, ExternalLink, FileSpreadsheet } from 'lucide-react';
import { JobEditorForm } from '@/components/domain/job-editor-form';
import { JobOptimizePanel } from '@/components/domain/job-optimize-panel';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { MaterialSpec, PlanMetrics } from '@/lib/domain/types';
import { createClient, getAuthenticatedIdentity } from '@/lib/supabase/server';
import { formatMinorCurrency } from '@/lib/utils';

export const metadata = {
  title: 'Job Detail — ReCut OS',
};

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const identity = await getAuthenticatedIdentity();
  if (!identity) {
    redirect('/login');
  }

  const { id } = await params;
  const supabase = await createClient();

  const { data: jobRow } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .eq('user_id', identity.userId)
    .single();

  if (!jobRow) {
    notFound();
  }

  const [partsRes, materialsRes, plansRes] = await Promise.all([
    supabase
      .from('job_parts')
      .select('*')
      .eq('job_id', jobRow.id)
      .eq('user_id', identity.userId)
      .order('created_at', { ascending: true }),
    supabase
      .from('materials')
      .select('*')
      .eq('user_id', identity.userId)
      .order('name', { ascending: true }),
    supabase
      .from('plans')
      .select('*')
      .eq('job_id', jobRow.id)
      .eq('user_id', identity.userId)
      .order('created_at', { ascending: false }),
  ]);

  const partRows = partsRes.data ?? [];
  const materialRows = materialsRes.data ?? [];
  const planRows = plansRes.data ?? [];

  const jobMaterialIds = [...new Set(partRows.map((p) => p.material_id))];
  const { data: stockRows } =
    jobMaterialIds.length > 0
      ? await supabase
          .from('stock_items')
          .select('id, state')
          .eq('user_id', identity.userId)
          .in('material_id', jobMaterialIds)
      : { data: [] as Array<{ id: string; state: string }> };

  const availableOwnedStockCount = (stockRows ?? []).filter(
    (s) => s.state === 'available'
  ).length;
  const pendingStockCount = (stockRows ?? []).filter(
    (s) => s.state === 'pending_confirmation'
  ).length;

  const materials: MaterialSpec[] = materialRows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    thicknessMm: row.thickness_mm,
    standardWidthMm: row.standard_width_mm,
    standardHeightMm: row.standard_height_mm,
    pricePerSheetMinor: Number(row.price_per_sheet_minor),
    currencyCode: row.currency_code,
    kerfMm: row.default_kerf_mm,
    grainAxis: row.grain_axis,
    minReusableWidthMm: row.min_reusable_width_mm,
    minReusableHeightMm: row.min_reusable_height_mm,
  }));

  const initialParts = partRows.map((p) => ({
    label: p.label,
    materialId: p.material_id,
    widthMm: p.width_mm,
    heightMm: p.height_mm,
    quantity: p.quantity,
    allowRotation: p.allow_rotation,
    requiredGrainAxis: p.required_grain_axis,
    notes: p.notes,
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/app/jobs"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to Cutting Jobs
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="cc-kicker text-accent-text">
              Job Specification & Optimizer
            </p>
            <h1 className="text-2xl font-bold leading-8 tracking-tight text-fg">
              {jobRow.title}
            </h1>
            {jobRow.notes && (
              <p className="mt-1 text-sm text-fg-muted">{jobRow.notes}</p>
            )}
          </div>
          <Badge
            variant={
              jobRow.status === 'committed'
                ? 'production'
                : jobRow.status === 'planned'
                  ? 'amber'
                  : 'neutral'
            }
          >
            {jobRow.status}
          </Badge>
        </div>
      </div>

      {/* Optimizer action panel */}
      <JobOptimizePanel
        jobId={jobRow.id}
        jobStatus={jobRow.status}
        availableOwnedStockCount={availableOwnedStockCount}
        pendingStockCount={pendingStockCount}
      />

      {/* Saved plans history for this job */}
      {planRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saved Cutting Plans ({planRows.length})</CardTitle>
            <CardDescription>
              Inspect generated guillotine layouts, compare against the
              new-sheet baseline, or commit a draft plan to shop inventory.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-border-subtle">
              <table className="w-full border-collapse text-left text-xs">
                <caption className="sr-only">
                  Saved cutting plans for {jobRow.title}
                </caption>
                <thead>
                  <tr className="cc-table-head h-12 border-b border-border-subtle">
                    <th scope="col" className="cc-kicker px-4">
                      Plan ID
                    </th>
                    <th scope="col" className="cc-kicker px-4">
                      Created
                    </th>
                    <th scope="col" className="cc-kicker px-4">
                      Owned Stock Used
                    </th>
                    <th scope="col" className="cc-kicker px-4">
                      New Sheets / Spend
                    </th>
                    <th scope="col" className="cc-kicker px-4">
                      Status
                    </th>
                    <th scope="col" className="cc-kicker px-4">
                      Inspect
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle tabular-nums">
                  {planRows.map((pl) => {
                    const summaryObj = (pl.optimized_summary ?? {}) as {
                      metrics?: PlanMetrics;
                    };
                    const metrics = summaryObj.metrics;
                    const ownedCount = metrics
                      ? metrics.availableRemnantUnitsUsed +
                        metrics.availableFullSheetUnitsUsed
                      : 0;
                    return (
                      <tr key={pl.id}>
                        <td className="px-4 py-3 font-mono font-semibold text-fg">
                          <div className="flex items-center gap-1.5">
                            <FileSpreadsheet
                              className="h-3.5 w-3.5 text-accent-text"
                              aria-hidden="true"
                            />
                            <span>{pl.id.slice(0, 8)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-fg-muted">
                          {new Date(pl.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'UTC',
                          })}
                        </td>
                        <td className="px-4 py-3 font-mono text-fg">
                          {ownedCount}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-accent-text">
                          {metrics ? (
                            <>
                              {metrics.newSheetCount} (
                              {formatMinorCurrency(
                                metrics.newSheetPurchaseCostMinor,
                                pl.currency_code
                              )}
                              )
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              pl.status === 'committed' ? 'production' : 'amber'
                            }
                          >
                            {pl.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/app/plans/${pl.id}`}
                            className="inline-flex items-center gap-1 font-semibold text-accent-text hover:underline"
                          >
                            <span>
                              {pl.status === 'committed'
                                ? 'View Committed Plan'
                                : 'Inspect & Commit'}
                            </span>
                            <ExternalLink
                              className="h-3 w-3"
                              aria-hidden="true"
                            />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Part editor (editable while not committed) */}
      <JobEditorForm
        mode="edit"
        jobId={jobRow.id}
        initialTitle={jobRow.title}
        initialNotes={jobRow.notes}
        initialParts={initialParts}
        materials={materials}
        readOnly={jobRow.status === 'committed'}
      />
    </div>
  );
}
