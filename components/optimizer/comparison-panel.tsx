'use client';

import * as React from 'react';
import { AlertTriangle, Info, Scale } from 'lucide-react';
import { CuttingPlanViewer } from '@/components/optimizer/cutting-plan-viewer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { ComparisonSummary, PlanResult } from '@/lib/domain/types';
import { formatAreaM2, formatMinorCurrency } from '@/lib/utils';

interface PlanComparisonWorkspaceProps {
  baseline: PlanResult;
  optimized: PlanResult;
  comparison: ComparisonSummary | null;
  currencyCode: string;
}

export function PlanComparisonWorkspace({
  baseline,
  optimized,
  comparison,
  currencyCode,
}: PlanComparisonWorkspaceProps) {
  const [activeMode, setActiveMode] = React.useState<'recut' | 'baseline'>(
    'recut'
  );

  const costDelta = comparison?.costDeltaMinor ?? 0;
  const sheetsDelta = comparison?.newSheetsDelta ?? 0;
  const pctLabel =
    comparison && comparison.purchaseReductionPct !== null
      ? `${comparison.purchaseReductionPct > 0 ? '-' : ''}${Math.abs(
          comparison.purchaseReductionPct
        ).toFixed(1)}%`
      : 'N/A';

  return (
    <div className="space-y-6">
      {/* Honest impact qualifier banner required by PRD */}
      <div
        role="note"
        aria-label="Impact accounting disclaimer"
        className="flex items-start gap-3 rounded-xl border border-border-strong bg-bg-subtle p-4 text-xs text-fg-muted"
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-medium text-fg">
            Estimated from these inputs. No physical material has been verified as
            saved.
          </p>
          <p>
            New-sheet spend deltas compare ReCut OS against a deterministic
            new-sheet-only First-Fit Decreasing (FFD) guillotine baseline using
            identical part quantities, rotation permissions, grain constraints, and
            saw kerf. Existing workshop remnants carry sunk acquisition cost (0 new
            purchase spend).
          </p>
        </div>
      </div>

      {optimized.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-border bg-amber-soft p-4 text-xs text-amber-text">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <span>Planner notices</span>
          </div>
          <ul className="mt-1.5 list-disc space-y-1 pl-5">
            {optimized.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* High-level metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="space-y-1 p-5">
            <span className="text-xs font-medium text-fg-muted">
              New Sheets Purchased
            </span>
            <div className="flex items-baseline gap-2.5 tabular-nums">
              <span className="text-2xl font-bold text-fg">
                {optimized.metrics.newSheetCount}
              </span>
              <span className="text-xs text-fg-muted">
                vs {baseline.metrics.newSheetCount} baseline
              </span>
            </div>
            <p className="text-xs tabular-nums text-accent-text">
              {sheetsDelta > 0
                ? `${sheetsDelta} fewer new standard ${
                    sheetsDelta === 1 ? 'sheet' : 'sheets'
                  } ordered`
                : sheetsDelta === 0
                  ? 'Same new-sheet count as baseline'
                  : `${Math.abs(sheetsDelta)} more new sheets than baseline`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-1 p-5">
            <span className="text-xs font-medium text-fg-muted">
              Modeled New Purchase Spend
            </span>
            <div className="flex items-baseline gap-2.5 tabular-nums">
              <span className="text-2xl font-bold text-fg">
                {formatMinorCurrency(
                  optimized.metrics.newSheetPurchaseCostMinor,
                  currencyCode
                )}
              </span>
              <Badge
                variant={
                  costDelta > 0 ? 'default' : costDelta < 0 ? 'error' : 'muted'
                }
              >
                {costDelta === 0 ? '0% delta' : pctLabel}
              </Badge>
            </div>
            <p className="text-xs tabular-nums text-fg-muted">
              Baseline:{' '}
              {formatMinorCurrency(
                baseline.metrics.newSheetPurchaseCostMinor,
                currencyCode
              )}{' '}
              (Delta: {costDelta >= 0 ? '-' : '+'}
              {formatMinorCurrency(Math.abs(costDelta), currencyCode)})
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-1 p-5">
            <span className="text-xs font-medium text-fg-muted">
              Owned Stock Allocated
            </span>
            <div className="flex items-baseline gap-2.5 tabular-nums">
              <span className="text-2xl font-bold text-fg">
                {optimized.metrics.availableRemnantUnitsUsed +
                  optimized.metrics.availableFullSheetUnitsUsed}
              </span>
              <span className="text-xs text-fg-muted">
                ({optimized.metrics.availableRemnantUnitsUsed} remnants)
              </span>
            </div>
            <p className="text-xs tabular-nums text-fg-muted">
              {formatAreaM2(
                optimized.metrics.availableRemnantAreaUsedMm2 +
                  optimized.metrics.availableFullSheetAreaUsedMm2
              )}{' '}
              drawn from shop rack
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-1 p-5">
            <span className="text-xs font-medium text-fg-muted">
              Recoverable Leftovers vs True Loss
            </span>
            <div className="flex items-baseline gap-2 tabular-nums">
              <span className="text-2xl font-bold text-fg">
                {formatAreaM2(optimized.metrics.recoverableRemnantAreaMm2)}
              </span>
              <span className="text-xs text-fg-muted">
                ({optimized.metrics.recoverableRemnantCount} pending)
              </span>
            </div>
            <p className="text-xs tabular-nums text-amber-text">
              Scrap {formatAreaM2(optimized.metrics.unusableScrapAreaMm2)} + Kerf{' '}
              {formatAreaM2(optimized.metrics.kerfLossAreaMm2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Interactive plan switcher: ReCut OS vs Baseline SVG */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-bg-shell p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-fg">
            <Scale className="h-4 w-4 text-accent-text" aria-hidden="true" />
            <span>Inspect Cutting Layouts:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={activeMode === 'recut' ? 'default' : 'secondary'}
              onClick={() => setActiveMode('recut')}
            >
              ReCut OS Plan ({optimized.sheets.length}{' '}
              {optimized.sheets.length === 1 ? 'sheet' : 'sheets'})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeMode === 'baseline' ? 'default' : 'secondary'}
              onClick={() => setActiveMode('baseline')}
            >
              Compare New-Sheet Baseline ({baseline.sheets.length}{' '}
              {baseline.sheets.length === 1 ? 'sheet' : 'sheets'})
            </Button>
          </div>
        </div>

        <CuttingPlanViewer
          key={activeMode}
          plan={activeMode === 'recut' ? optimized : baseline}
          currencyCode={currencyCode}
          planTitle={
            activeMode === 'recut'
              ? optimized.algorithmVersion
              : baseline.algorithmVersion
          }
        />
      </div>

      {/* Full side-by-side accounting ledger & assumptions */}
      <Card>
        <CardHeader>
          <CardTitle>Transparent Baseline vs ReCut OS Ledger</CardTitle>
          <CardDescription>
            Complete conservation breakdown across identical demand (
            {optimized.metrics.partCount} expanded part pieces,{' '}
            {formatAreaM2(optimized.metrics.partAreaMm2)} net part area).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <caption className="sr-only">
                Side-by-side metric comparison between new-sheet baseline and ReCut OS
              </caption>
              <thead>
                <tr className="border-b border-border-subtle text-fg-muted">
                  <th scope="col" className="py-2.5 pr-4 font-medium">
                    Accounting Metric
                  </th>
                  <th scope="col" className="py-2.5 pr-4 font-medium">
                    New-Sheet-Only Baseline
                  </th>
                  <th scope="col" className="py-2.5 pr-4 font-medium">
                    ReCut OS Plan
                  </th>
                  <th scope="col" className="py-2.5 font-medium">
                    Difference
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/70 tabular-nums">
                <tr>
                  <td className="py-2.5 pr-4 font-medium text-fg">
                    New standard sheets purchased
                  </td>
                  <td className="py-2.5 pr-4 font-mono">
                    {baseline.metrics.newSheetCount}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-accent-text">
                    {optimized.metrics.newSheetCount}
                  </td>
                  <td className="py-2.5 font-mono">
                    {sheetsDelta > 0
                      ? `-${sheetsDelta} sheets`
                      : sheetsDelta < 0
                        ? `+${Math.abs(sheetsDelta)} sheets`
                        : '0'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium text-fg">
                    New sheet purchase spend
                  </td>
                  <td className="py-2.5 pr-4 font-mono">
                    {formatMinorCurrency(
                      baseline.metrics.newSheetPurchaseCostMinor,
                      currencyCode
                    )}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-accent-text">
                    {formatMinorCurrency(
                      optimized.metrics.newSheetPurchaseCostMinor,
                      currencyCode
                    )}
                  </td>
                  <td className="py-2.5 font-mono">
                    {costDelta > 0
                      ? `-${formatMinorCurrency(costDelta, currencyCode)} (${pctLabel})`
                      : costDelta < 0
                        ? `+${formatMinorCurrency(Math.abs(costDelta), currencyCode)}`
                        : formatMinorCurrency(0, currencyCode)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium text-fg">
                    Owned remnants consumed
                  </td>
                  <td className="py-2.5 pr-4 font-mono">0 (0.000 m²)</td>
                  <td className="py-2.5 pr-4 font-mono">
                    {optimized.metrics.availableRemnantUnitsUsed} (
                    {formatAreaM2(optimized.metrics.availableRemnantAreaUsedMm2)})
                  </td>
                  <td className="py-2.5 font-mono text-fg-muted">
                    {optimized.metrics.availableRemnantUnitsUsed} offcuts reused
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium text-fg">
                    Total opened stock area
                  </td>
                  <td className="py-2.5 pr-4 font-mono">
                    {formatAreaM2(baseline.metrics.openedStockAreaMm2)}
                  </td>
                  <td className="py-2.5 pr-4 font-mono">
                    {formatAreaM2(optimized.metrics.openedStockAreaMm2)}
                  </td>
                  <td className="py-2.5 font-mono text-fg-muted">
                    Util: {baseline.metrics.usedMaterialUtilizationPct}% vs{' '}
                    {optimized.metrics.usedMaterialUtilizationPct}%
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium text-fg">
                    Recoverable residual area (pending confirmation)
                  </td>
                  <td className="py-2.5 pr-4 font-mono">
                    {formatAreaM2(baseline.metrics.recoverableRemnantAreaMm2)} (
                    {baseline.metrics.recoverableRemnantCount})
                  </td>
                  <td className="py-2.5 pr-4 font-mono">
                    {formatAreaM2(optimized.metrics.recoverableRemnantAreaMm2)} (
                    {optimized.metrics.recoverableRemnantCount})
                  </td>
                  <td className="py-2.5 font-mono text-fg-muted">
                    Requires shop verification
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium text-fg">
                    Unusable below-threshold scrap
                  </td>
                  <td className="py-2.5 pr-4 font-mono">
                    {formatAreaM2(baseline.metrics.unusableScrapAreaMm2)}
                  </td>
                  <td className="py-2.5 pr-4 font-mono">
                    {formatAreaM2(optimized.metrics.unusableScrapAreaMm2)}
                  </td>
                  <td className="py-2.5 font-mono text-fg-muted">
                    Non-recoverable offcut area
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium text-fg">
                    Saw kerf loss & cut operations
                  </td>
                  <td className="py-2.5 pr-4 font-mono">
                    {formatAreaM2(baseline.metrics.kerfLossAreaMm2)} (
                    {baseline.metrics.totalCutCount} cuts)
                  </td>
                  <td className="py-2.5 pr-4 font-mono">
                    {formatAreaM2(optimized.metrics.kerfLossAreaMm2)} (
                    {optimized.metrics.totalCutCount} cuts)
                  </td>
                  <td className="py-2.5 font-mono text-fg-muted">
                    Exact strip geometry
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {comparison && (
            <div className="rounded-lg border border-border-subtle bg-bg-subtle p-4 text-xs text-fg-muted">
              <p className="font-semibold text-fg">
                Model Assumptions & Limitations
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {comparison.assumptions.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
