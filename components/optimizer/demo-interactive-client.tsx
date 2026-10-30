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
import { formatAreaM2, formatDimensionsMm, formatMinorCurrency } from '@/lib/utils';

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
    (preset: DemoPreset, stockSet: Set<string>, kerfMm: number) => {
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
      {/* Sticky 64px Dark Frosted Command Header (DESIGN.md shell-header) */}
      <header className="no-print cc-shell-glass sticky top-0 z-30 border-b">
        <div className="mx-auto flex min-h-16 max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-white/72 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Home
            </Link>
            <span className="text-white/25">/</span>
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-white">
                <Scissors className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span>ReCut OS Interactive Demo</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden rounded-full border border-amber-border bg-amber-soft px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.04em] uppercase text-amber-text md:inline-flex">
              Read-only public sandbox
            </span>
            <Button asChild size="sm">
              <Link href="/login">Sign in for persistent workspace</Link>
            </Button>
            <ThemeToggle variant="shell" />
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8"
      >
        {/* Mandatory illustrative demo banner */}
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-border bg-amber-soft px-4 py-3 text-xs text-amber-text"
        >
          <div className="flex items-center gap-2.5 font-semibold">
            <FlaskConical className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Illustrative workshop example — results are computed from sample
              inputs.
            </span>
          </div>
          <span className="rounded-md border border-amber-border/60 bg-bg-card/80 px-2.5 py-1 font-mono text-[11px] text-fg">
            Input hash: {evaluation.inputHash} · Seed:{' '}
            {activePreset.problem.seed ?? 42}
          </span>
        </div>

        {/* Scenario presets & live parameter control deck */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="cc-kicker text-accent-text">
                  Step 01 · Deterministic Scenario Matrix
                </p>
                <CardTitle className="mt-0.5">
                  1. Select Deterministic Workshop Scenario
                </CardTitle>
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

          <CardContent className="space-y-5">
            <div
              role="group"
              aria-label="Sample benchmark fixtures"
              className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5"
            >
              {presets.map((p, idx) => {
                const selected = idx === selectedPresetIdx;
                const pieces = p.problem.job.parts.reduce(
                  (sum, row) => sum + row.quantity,
                  0
                );
                return (
                  <button
                    key={p.fixtureId}
                    type="button"
                    onClick={() => handlePresetChange(idx)}
                    aria-pressed={selected}
                    className={`relative min-w-0 overflow-hidden rounded-lg border p-3 text-left text-xs transition-all cursor-pointer ${
                      selected
                        ? 'border-accent bg-accent-soft text-fg shadow-xs'
                        : 'border-border-subtle bg-bg-subtle text-fg-muted hover:border-border-strong hover:bg-bg-elevated hover:text-fg'
                    }`}
                  >
                    {selected && (
                      <span
                        className="absolute inset-x-0 top-0 h-1 bg-accent"
                        aria-hidden="true"
                      />
                    )}
                    <span className="line-clamp-1 block font-bold text-fg">
                      {p.problem.job.title}
                    </span>
                    <span className="mt-1 block truncate font-mono text-[11px] text-fg-muted">
                      {p.fixtureId}
                    </span>
                    <span className="mt-2 inline-block rounded bg-bg-card px-1.5 py-0.5 font-mono text-[10px] font-semibold text-accent-text">
                      {pieces} {pieces === 1 ? 'piece' : 'pieces'} ·{' '}
                      {p.problem.stockItems.length} rack{' '}
                      {p.problem.stockItems.length === 1 ? 'offcut' : 'offcuts'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Interactive inputs overview: Material + Remnant toggles + Job parts */}
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="min-w-0 space-y-3 rounded-xl border border-border-subtle bg-bg-subtle p-4 lg:col-span-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="cc-kicker text-fg-muted">
                    Material & Available Offcuts
                  </h3>
                  <label className="flex items-center gap-2 text-xs font-medium text-fg">
                    <span>Saw kerf (mm):</span>
                    <select
                      aria-label="Saw kerf width in millimeters"
                      value={kerfOverrideMm}
                      onChange={(e) => {
                        const nextKerf = Number(e.target.value);
                        setKerfOverrideMm(nextKerf);
                        runPlanner(activePreset, enabledStockIds, nextKerf);
                      }}
                      className="rounded-md border border-border-strong bg-bg-card px-2.5 py-1 font-mono text-xs font-semibold text-fg"
                    >
                      <option value={0}>0 mm</option>
                      <option value={3}>3 mm</option>
                      <option value={4}>4 mm</option>
                      <option value={5}>5 mm</option>
                    </select>
                  </label>
                </div>

                <div className="rounded-lg border border-border-subtle bg-bg-card p-3 text-xs tabular-nums">
                  <div className="font-bold text-fg">{primaryMaterial.name}</div>
                  <div className="mt-1 text-fg-muted">
                    Standard sheet:{' '}
                    <span className="font-mono text-fg">
                      {formatDimensionsMm(
                        primaryMaterial.standardWidthMm,
                        primaryMaterial.standardHeightMm
                      )}
                    </span>{' '}
                    ·{' '}
                    <span className="font-mono font-semibold text-accent-text">
                      {formatMinorCurrency(
                        primaryMaterial.pricePerSheetMinor,
                        primaryMaterial.currencyCode
                      )}
                    </span>{' '}
                    · Grain: {primaryMaterial.grainAxis.toUpperCase()}
                  </div>
                </div>

                {activePreset.problem.stockItems.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border-strong bg-bg-card/60 p-3 text-xs text-fg-muted">
                    Zero remnants in rack for this fixture — planner must purchase
                    standard sheets.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium text-fg-muted">
                      Toggle owned remnants below to test live replanning:
                    </p>
                    {activePreset.problem.stockItems.map((s) => {
                      const checked = enabledStockIds.has(s.id);
                      return (
                        <label
                          key={s.id}
                          className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-xs transition-colors ${
                            checked
                              ? 'border-accent-border bg-bg-card'
                              : 'border-border-subtle bg-bg-card/50 opacity-75'
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleRemnant(s.id)}
                              className="h-4 w-4 accent-accent"
                            />
                            <span className="font-semibold text-fg">
                              {s.label}
                            </span>
                          </span>
                          <span className="font-mono tabular-nums text-fg-muted">
                            {s.widthMm}×{s.heightMm} mm (
                            {formatAreaM2(s.widthMm * s.heightMm)})
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="min-w-0 space-y-3 rounded-xl border border-border-subtle bg-bg-subtle p-4 lg:col-span-7">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="cc-kicker text-fg-muted">
                    Job Order: {activePreset.problem.job.title}
                  </h3>
                  <Badge variant="default">
                    {activePreset.problem.job.parts.reduce(
                      (acc, p) => acc + p.quantity,
                      0
                    )}{' '}
                    total pieces
                  </Badge>
                </div>

                <div className="overflow-x-auto rounded-lg border border-border-subtle bg-bg-card">
                  <table className="w-full border-collapse text-left text-xs">
                    <caption className="sr-only">
                      Requested rectangular parts in sample job
                    </caption>
                    <thead>
                      <tr className="cc-table-head h-11 border-b border-border-subtle">
                        <th scope="col" className="cc-kicker px-3.5">
                          Part
                        </th>
                        <th scope="col" className="cc-kicker px-3">
                          Dimensions
                        </th>
                        <th scope="col" className="cc-kicker px-3">
                          Qty
                        </th>
                        <th scope="col" className="cc-kicker px-3">
                          Rotation
                        </th>
                        <th scope="col" className="cc-kicker px-3.5">
                          Grain
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle tabular-nums">
                      {activePreset.problem.job.parts.map((part) => (
                        <tr key={part.id}>
                          <td className="px-3.5 py-2.5 font-semibold text-fg">
                            {part.label}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-fg">
                            {part.widthMm} × {part.heightMm} mm
                          </td>
                          <td className="px-3 py-2.5 font-mono font-bold text-accent-text">
                            {part.quantity}
                          </td>
                          <td className="px-3 py-2.5 text-fg-muted">
                            {part.allowRotation ? 'Allowed' : 'Locked'}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono uppercase text-fg-muted">
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
                  <span className="mr-2 font-mono font-bold uppercase text-danger-text">
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
              <div>
                <p className="cc-kicker text-accent-text">
                  Step 02 · Audited Output & CAD Blueprint
                </p>
                <h2 className="text-xl font-bold tracking-tight text-fg">
                  2. Verified Cutting Plan & Baseline Comparison
                </h2>
              </div>
              <Badge variant="production">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Independent verifier passed ({evaluation.optimized.durationMs} ms)
              </Badge>
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
