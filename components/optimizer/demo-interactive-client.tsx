'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FlaskConical,
  Play,
  RotateCcw,
  Scissors,
} from 'lucide-react';
import { PlanComparisonWorkspace } from '@/components/optimizer/comparison-panel';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type {
  OptimizationEvaluation,
  OptimizationProblemInput,
} from '@/lib/domain/types';
import { evaluateOptimization } from '@/lib/optimizer';
import { formatDimensionsMm, formatMinorCurrency } from '@/lib/utils';

export interface DemoPreset {
  fixtureId: string;
  title: string;
  note?: string;
  problem: OptimizationProblemInput;
}

export function DemoInteractiveClient({
  presets,
  initialEvaluation,
}: {
  presets: DemoPreset[];
  initialEvaluation: OptimizationEvaluation;
}) {
  const [selectedPresetIdx, setSelectedPresetIdx] = React.useState(0);
  const activePreset = presets[selectedPresetIdx] ?? presets[0]!;

  const [enabledStockIds, setEnabledStockIds] = React.useState<Set<string>>(
    () => new Set(activePreset.problem.stockItems.map((s) => s.id))
  );
  const [kerfOverrideMm, setKerfOverrideMm] = React.useState<number>(
    activePreset.problem.materials[0]?.kerfMm ?? 3
  );
  const [evaluation, setEvaluation] =
    React.useState<OptimizationEvaluation>(initialEvaluation);

  const runPlanner = React.useCallback(
    (
      preset: DemoPreset,
      stockSet: Set<string>,
      kerfMm: number
    ) => {
      const modifiedProblem: OptimizationProblemInput = {
        ...preset.problem,
        materials: preset.problem.materials.map((m, i) =>
          i === 0 ? { ...m, kerfMm } : m
        ),
        stockItems: preset.problem.stockItems.filter((s) => stockSet.has(s.id)),
      };
      setEvaluation(evaluateOptimization(modifiedProblem));
    },
    []
  );

  const handlePresetChange = (idx: number) => {
    const preset = presets[idx];
    if (!preset) return;
    const allIds = new Set(preset.problem.stockItems.map((s) => s.id));
    const defaultKerf = preset.problem.materials[0]?.kerfMm ?? 3;
    setSelectedPresetIdx(idx);
    setEnabledStockIds(allIds);
    setKerfOverrideMm(defaultKerf);
    runPlanner(preset, allIds, defaultKerf);
  };

  const toggleRemnant = (id: string) => {
    const next = new Set(enabledStockIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setEnabledStockIds(next);
    runPlanner(activePreset, next, kerfOverrideMm);
  };

  const resetCurrentPreset = () => {
    handlePresetChange(selectedPresetIdx);
  };

  const primaryMaterial = activePreset.problem.materials[0]!;

  return (
    <div className="min-h-screen bg-bg-page text-fg">
      {/* Top bar */}
      <header className="no-print border-b border-border-subtle bg-bg-shell">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Home
            </Link>
            <span className="text-border-strong">/</span>
            <div className="flex items-center gap-2 font-semibold text-fg">
              <Scissors className="h-4 w-4 text-accent-text" aria-hidden="true" />
              <span>ReCut OS Interactive Demo</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="amber">Read-only public sandbox</Badge>
            <Button asChild size="sm">
              <Link href="/login">Sign in for persistent workspace</Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8"
      >
        {/* Mandatory illustrative demo banner */}
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-border bg-amber-soft px-4 py-3 text-xs text-amber-text"
        >
          <div className="flex items-center gap-2.5 font-medium">
            <FlaskConical className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Illustrative workshop example — results are computed from sample
              inputs.
            </span>
          </div>
          <span className="font-mono text-[11px] text-fg-muted">
            Input hash: {evaluation.inputHash} · Seed:{' '}
            {activePreset.problem.seed ?? 42}
          </span>
        </div>

        {/* Scenario presets bar */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>1. Select Deterministic Workshop Scenario</CardTitle>
                <CardDescription>
                  Every scenario executes the real TypeScript guillotine optimizer
                  and independent cut-tree verifier—including zero-savings and
                  infeasible cases.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetCurrentPreset}
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Reset fixture
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    runPlanner(activePreset, enabledStockIds, kerfOverrideMm)
                  }
                >
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  Generate cutting plan
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              role="group"
              aria-label="Sample benchmark fixtures"
              className="flex flex-wrap gap-2"
            >
              {presets.map((p, idx) => (
                <button
                  key={p.fixtureId}
                  type="button"
                  onClick={() => handlePresetChange(idx)}
                  aria-pressed={idx === selectedPresetIdx}
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                    idx === selectedPresetIdx
                      ? 'border-accent bg-accent-soft text-fg'
                      : 'border-border-subtle bg-bg-subtle text-fg-muted hover:border-border-strong hover:text-fg'
                  }`}
                >
                  <span className="block font-semibold">{p.problem.job.title}</span>
                  <span className="font-mono text-[11px] text-fg-muted">
                    {p.fixtureId}
                  </span>
                </button>
              ))}
            </div>

            {/* Interactive inputs overview: Material + Remnant toggles + Job parts */}
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="space-y-3 rounded-lg border border-border-subtle bg-bg-subtle p-4 lg:col-span-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                    Material & Available Offcuts
                  </h3>
                  <label className="flex items-center gap-2 text-xs text-fg">
                    <span>Saw kerf (mm):</span>
                    <select
                      aria-label="Saw kerf width in millimeters"
                      value={kerfOverrideMm}
                      onChange={(e) => {
                        const nextKerf = Number(e.target.value);
                        setKerfOverrideMm(nextKerf);
                        runPlanner(activePreset, enabledStockIds, nextKerf);
                      }}
                      className="rounded border border-border-strong bg-bg-page px-2 py-1 font-mono text-xs text-fg"
                    >
                      <option value={0}>0 mm</option>
                      <option value={3}>3 mm</option>
                      <option value={4}>4 mm</option>
                      <option value={5}>5 mm</option>
                    </select>
                  </label>
                </div>

                <div className="rounded border border-border-subtle bg-bg-card p-2.5 text-xs tabular-nums">
                  <div className="font-medium text-fg">
                    {primaryMaterial.name}
                  </div>
                  <div className="mt-0.5 text-fg-muted">
                    Standard sheet:{' '}
                    {formatDimensionsMm(
                      primaryMaterial.standardWidthMm,
                      primaryMaterial.standardHeightMm
                    )}{' '}
                    ·{' '}
                    {formatMinorCurrency(
                      primaryMaterial.pricePerSheetMinor,
                      primaryMaterial.currencyCode
                    )}{' '}
                    · Grain: {primaryMaterial.grainAxis.toUpperCase()}
                  </div>
                </div>

                {activePreset.problem.stockItems.length === 0 ? (
                  <p className="text-xs text-fg-muted">
                    Zero remnants in rack for this fixture — planner must purchase
                    standard sheets.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] text-fg-muted">
                      Toggle remnants below to test live replanning:
                    </p>
                    {activePreset.problem.stockItems.map((s) => {
                      const checked = enabledStockIds.has(s.id);
                      return (
                        <label
                          key={s.id}
                          className="flex cursor-pointer items-center justify-between rounded border border-border-subtle bg-bg-card px-3 py-2 text-xs hover:border-border-strong"
                        >
                          <span className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleRemnant(s.id)}
                              className="h-4 w-4 accent-accent"
                            />
                            <span className="font-medium text-fg">
                              {s.label}
                            </span>
                          </span>
                          <span className="font-mono tabular-nums text-fg-muted">
                            {s.widthMm}×{s.heightMm} mm
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-lg border border-border-subtle bg-bg-subtle p-4 lg:col-span-7">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                    Job Order: {activePreset.problem.job.title}
                  </h3>
                  <Badge variant="neutral">
                    {activePreset.problem.job.parts.reduce(
                      (acc, p) => acc + p.quantity,
                      0
                    )}{' '}
                    total pieces
                  </Badge>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <caption className="sr-only">
                      Requested rectangular parts in sample job
                    </caption>
                    <thead>
                      <tr className="border-b border-border-subtle text-fg-muted">
                        <th scope="col" className="py-2 pr-3 font-medium">
                          Part
                        </th>
                        <th scope="col" className="py-2 pr-3 font-medium">
                          Dimensions
                        </th>
                        <th scope="col" className="py-2 pr-3 font-medium">
                          Qty
                        </th>
                        <th scope="col" className="py-2 pr-3 font-medium">
                          Rotation
                        </th>
                        <th scope="col" className="py-2 font-medium">
                          Grain
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle/70 tabular-nums">
                      {activePreset.problem.job.parts.map((part) => (
                        <tr key={part.id}>
                          <td className="py-2 pr-3 font-medium text-fg">
                            {part.label}
                          </td>
                          <td className="py-2 pr-3 font-mono text-fg">
                            {part.widthMm} × {part.heightMm} mm
                          </td>
                          <td className="py-2 pr-3 font-mono">{part.quantity}</td>
                          <td className="py-2 pr-3 text-fg-muted">
                            {part.allowRotation ? 'Allowed' : 'Locked'}
                          </td>
                          <td className="py-2 font-mono uppercase text-fg-muted">
                            {part.requiredGrainAxis}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results: either structured infeasibility or verified cutting plan + baseline */}
        {evaluation.optimized.status !== 'feasible' ? (
          <Card className="border-danger-border bg-bg-card">
            <CardHeader>
              <div className="flex items-center gap-2 text-danger-text">
                <AlertCircle className="h-5 w-5" aria-hidden="true" />
                <CardTitle className="text-danger-text">
                  Job Infeasible Under Current Constraints
                </CardTitle>
              </div>
              <CardDescription>
                ReCut OS never silently omits unplaceable parts. Review the exact
                constraint violations below:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {evaluation.optimized.diagnostics.map((d, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-danger-border bg-danger-soft p-3 text-fg"
                >
                  <span className="mr-2 font-mono uppercase text-danger-text">
                    [{d.code}]
                  </span>
                  {d.message}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold tracking-tight text-fg">
                2. Verified Cutting Plan & Baseline Comparison
              </h2>
              <div className="flex items-center gap-2 text-xs text-accent-text">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>
                  Independent cut-tree & conservation verifier passed in{' '}
                  {evaluation.optimized.durationMs} ms
                </span>
              </div>
            </div>

            <PlanComparisonWorkspace
              baseline={evaluation.baseline}
              optimized={evaluation.optimized}
              comparison={evaluation.comparison}
              currencyCode={evaluation.currencyCode}
            />
          </div>
        )}
      </main>
    </div>
  );
}
