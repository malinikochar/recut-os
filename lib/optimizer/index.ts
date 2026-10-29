import {
  fixtureFileSchema,
  optimizationProblemInputSchema,
} from '../domain/schemas';
import type {
  OptimizationEvaluation,
  OptimizationProblemInput,
} from '../domain/types';
import { runBaselineOptimizer } from './baseline';
import {
  BASELINE_OPTIMIZER_VERSION,
  RECUT_OPTIMIZER_VERSION,
  runRecutGuillotineOptimizer,
} from './guillotine';
import {
  comparePlanQuality,
  computeComparisonSummary,
  computePlanMetrics,
  computeProblemHash,
} from './metrics';
import { verifyPlan } from './verify';

export {
  BASELINE_OPTIMIZER_VERSION,
  RECUT_OPTIMIZER_VERSION,
  comparePlanQuality,
  computeComparisonSummary,
  computePlanMetrics,
  computeProblemHash,
  runBaselineOptimizer,
  runRecutGuillotineOptimizer,
  verifyPlan,
};

/**
 * Validates raw optimization input, runs both the deterministic new-sheet-only baseline
 * and the ReCut OS remnant-first optimizer, independently verifies each feasible result,
 * and computes transparent comparison metrics.
 */
export function evaluateOptimization(
  rawInput: OptimizationProblemInput
): OptimizationEvaluation {
  const parsed = optimizationProblemInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const issueMessage = parsed.error.issues
      .map((i) => `${i.path.join('.') || 'input'}: ${i.message}`)
      .join('; ');
    const emptyPlan = {
      algorithmVersion: RECUT_OPTIMIZER_VERSION,
      strategyLabel: 'Validation gate',
      seed: rawInput.seed ?? 42,
      status: 'infeasible' as const,
      explanation: issueMessage,
      diagnostics: [
        {
          code: 'invalid_input' as const,
          message: issueMessage,
        },
      ],
      sheets: [],
      metrics: computePlanMetrics([]),
      warnings: [],
      durationMs: 0,
    };
    return {
      inputHash: 'invalid',
      currencyCode: rawInput.materials[0]?.currencyCode ?? 'INR',
      baseline: {
        ...emptyPlan,
        algorithmVersion: BASELINE_OPTIMIZER_VERSION,
      },
      optimized: emptyPlan,
      comparison: null,
    };
  }

  const problem = parsed.data;
  const currencyCode = problem.materials[0]?.currencyCode ?? 'INR';
  const inputHash = computeProblemHash(problem);

  const baseline = runBaselineOptimizer(problem);
  const optimized = runRecutGuillotineOptimizer(problem);
  const comparison = computeComparisonSummary({
    currencyCode,
    baseline,
    optimized,
  });

  return {
    inputHash,
    currencyCode,
    baseline,
    optimized,
    comparison,
  };
}

/**
 * Parses and normalizes a deterministic workshop JSON fixture into an `OptimizationProblemInput`.
 */
export function parseWorkshopFixture(rawJson: unknown): {
  fixtureId: string;
  title: string;
  note?: string;
  problem: OptimizationProblemInput;
} {
  const parsed = fixtureFileSchema.parse(rawJson);
  const problem: OptimizationProblemInput = {
    materials: parsed.materials.map((m) => ({
      id: m.id,
      name: m.name,
      category: m.category ?? 'Wood',
      thicknessMm: m.thicknessMm,
      standardWidthMm: m.standardWidthMm,
      standardHeightMm: m.standardHeightMm,
      pricePerSheetMinor: m.pricePerSheetMinor,
      currencyCode: m.currencyCode ?? parsed.currency,
      kerfMm: m.kerfMm,
      grainAxis: m.grainAxis,
      minReusableWidthMm: m.minReusableWidthMm,
      minReusableHeightMm: m.minReusableHeightMm,
    })),
    stockItems: parsed.stockItems.map((s) => ({
      id: s.id,
      materialId: s.materialId,
      label: s.label ?? `${s.id} (${s.widthMm}×${s.heightMm} mm)`,
      origin: s.origin,
      state: s.state,
      widthMm: s.widthMm,
      heightMm: s.heightMm,
      notes: s.notes ?? null,
    })),
    job: parsed.job,
    seed: parsed.benchmarkPolicy?.seed ?? 42,
    timeBudgetMs: 1500,
  };

  return {
    fixtureId: parsed.fixtureId,
    title: parsed.title,
    note: parsed.benchmarkPolicy?.note,
    problem,
  };
}
