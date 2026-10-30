import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Cpu } from 'lucide-react';
import { CommitPlanBar } from '@/components/domain/commit-plan-bar';
import { PlanComparisonWorkspace } from '@/components/optimizer/comparison-panel';
import { Badge } from '@/components/ui/badge';
import type {
  ComparisonSummary,
  CutNode,
  CutStepSummary,
  PlacedPartSummary,
  PlanMetrics,
  PlanResult,
  PlanSolveStatus,
  ResidualRegionSummary,
  SheetMetrics,
  SheetPlan,
} from '@/lib/domain/types';
import { createClient, getAuthenticatedIdentity } from '@/lib/supabase/server';

export const metadata = {
  title: 'Cutting Plan Detail — ReCut OS',
};

interface ConstraintsSnapshotShape {
  materials?: Array<{
    id: string;
    name: string;
    kerfMm: number;
    grainAxis: string;
    minReusableWidthMm: number;
    minReusableHeightMm: number;
  }>;
  inputHash?: string;
}

export default async function PlanDetailPage({
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

  const { data: planRow } = await supabase
    .from('plans')
    .select('*')
    .eq('id', id)
    .eq('user_id', identity.userId)
    .single();

  if (!planRow) {
    notFound();
  }

  const [sheetsRes, jobRes] = await Promise.all([
    supabase
      .from('plan_sheets')
      .select('*')
      .eq('plan_id', planRow.id)
      .eq('user_id', identity.userId)
      .order('sheet_index', { ascending: true }),
    supabase
      .from('jobs')
      .select('id, title')
      .eq('id', planRow.job_id)
      .eq('user_id', identity.userId)
      .single(),
  ]);

  const sheetRows = sheetsRes.data ?? [];
  const jobTitle = jobRes.data?.title ?? 'Cutting Job';

  const constraints = (planRow.constraints_snapshot ??
    {}) as ConstraintsSnapshotShape;
  const materialNameById = new Map(
    (constraints.materials ?? []).map((m) => [m.id, m.name])
  );

  const sheets: SheetPlan[] = sheetRows.map((row) => ({
    sheetIndex: row.sheet_index,
    sheetKey: row.id,
    materialId: row.material_id,
    materialName: materialNameById.get(row.material_id) ?? 'Sheet Material',
    sourceStockId: row.source_stock_id ?? undefined,
    sourceLabel: row.source_label,
    sourceType: row.source_type,
    widthMm: row.width_mm,
    heightMm: row.height_mm,
    kerfMm: row.kerf_mm,
    placements: (row.placements ?? []) as unknown as PlacedPartSummary[],
    cutTree: row.cut_tree as unknown as CutNode,
    cuts: (row.cuts ?? []) as unknown as CutStepSummary[],
    residuals: (row.unallocated_regions ??
      []) as unknown as ResidualRegionSummary[],
    sheetMetrics: row.sheet_metrics as unknown as SheetMetrics,
    estimatedNewSheetCostMinor: Number(row.estimated_new_sheet_cost_minor),
  }));

  const optSummary = (planRow.optimized_summary ?? {}) as unknown as {
    status?: PlanSolveStatus;
    strategyLabel?: string;
    explanation?: string;
    metrics: PlanMetrics;
    warnings?: string[];
    durationMs?: number;
  };

  const optimized: PlanResult = {
    status: optSummary.status ?? 'feasible',
    algorithmVersion: planRow.algorithm_version,
    seed: planRow.algorithm_seed,
    strategyLabel: optSummary.strategyLabel ?? 'recut-guillotine',
    explanation: optSummary.explanation,
    sheets,
    diagnostics: [],
    metrics: optSummary.metrics,
    warnings: optSummary.warnings ?? [],
    durationMs: optSummary.durationMs ?? 0,
  };

  const baseline = planRow.baseline_result as unknown as PlanResult;
  const comparison =
    (planRow.comparison_summary as unknown as ComparisonSummary | null) ?? null;

  const ownedStockCount =
    optimized.metrics.availableRemnantUnitsUsed +
    optimized.metrics.availableFullSheetUnitsUsed;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-fg-muted">
          <Link
            href={`/app/jobs/${planRow.job_id}`}
            className="inline-flex items-center gap-1.5 hover:text-fg"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to {jobTitle}
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="cc-kicker text-accent-text">
              Verified Guillotine Saw Layout
            </p>
            <h1 className="text-2xl font-bold leading-8 tracking-tight text-fg">
              Cutting Plan — {jobTitle}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 font-mono text-xs text-fg-muted">
              <Cpu
                className="h-3.5 w-3.5 text-accent-text"
                aria-hidden="true"
              />
              <span>Plan {planRow.id.slice(0, 8)}</span>
              <span>·</span>
              <span>{planRow.algorithm_version}</span>
              <span>·</span>
              <span>Seed {planRow.algorithm_seed}</span>
              {constraints.inputHash && (
                <>
                  <span>·</span>
                  <span>Hash {constraints.inputHash}</span>
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(constraints.materials ?? []).map((m) => (
              <Badge key={m.id} variant="neutral">
                {m.name}: {m.kerfMm}mm kerf · min {m.minReusableWidthMm}×
                {m.minReusableHeightMm}mm
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <CommitPlanBar
        planId={planRow.id}
        jobId={planRow.job_id}
        jobTitle={jobTitle}
        status={planRow.status}
        committedAt={planRow.committed_at}
        ownedStockCount={ownedStockCount}
        newSheetCount={optimized.metrics.newSheetCount}
        recoverableRemnantCount={optimized.metrics.recoverableRemnantCount}
      />

      <PlanComparisonWorkspace
        baseline={baseline}
        optimized={optimized}
        comparison={comparison}
        currencyCode={planRow.currency_code}
      />
    </div>
  );
}
