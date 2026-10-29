import { expandJobParts } from '../domain/schemas';
import type {
  MaterialSpec,
  OptimizationProblemInput,
  PartInstance,
  PlanResult,
} from '../domain/types';
import {
  BASELINE_OPTIMIZER_VERSION,
  diagnoseProblemFeasibility,
  materializeWorkingSheets,
  runNewSheetsOnlyFFDPass,
} from './guillotine';
import { computePlanMetrics, createEmptyMetrics } from './metrics';
import { verifyPlan } from './verify';

/**
 * Deterministic New-Sheet-Only First-Fit Decreasing (FFD) Guillotine Baseline.
 *
 * Uses the exact same expanded part instances, kerf width, grain rules, and rotation
 * permissions as the ReCut OS optimizer, sourcing exclusively from virtual newly
 * purchased standard sheets. Verified by the same independent `verifyPlan` gate.
 */
export function runBaselineOptimizer(
  problem: OptimizationProblemInput
): PlanResult {
  const startMs = performance.now();
  const seed = problem.seed ?? 42;

  const diagnostics = diagnoseProblemFeasibility(problem, {
    baselineNewSheetsOnly: true,
  });
  if (diagnostics.length > 0) {
    return {
      algorithmVersion: BASELINE_OPTIMIZER_VERSION,
      strategyLabel: 'New-sheet-only First-Fit Decreasing (FFD) guillotine baseline',
      seed,
      status: 'infeasible',
      explanation: diagnostics.map((d) => d.message).join(' '),
      diagnostics,
      sheets: [],
      metrics: createEmptyMetrics(),
      warnings: [],
      durationMs: Math.round(performance.now() - startMs),
    };
  }

  const materialById = new Map<string, MaterialSpec>();
  for (const m of problem.materials) {
    materialById.set(m.id, m);
  }

  const allInstances = expandJobParts(problem.job.parts);
  const instancesByMaterial = new Map<string, PartInstance[]>();
  for (const inst of allInstances) {
    const list = instancesByMaterial.get(inst.materialId) ?? [];
    list.push(inst);
    instancesByMaterial.set(inst.materialId, list);
  }

  const materialIds = [...instancesByMaterial.keys()].sort((a, b) =>
    a.localeCompare(b)
  );
  const workingSheets = [];

  for (const matId of materialIds) {
    const material = materialById.get(matId)!;
    const matParts = instancesByMaterial.get(matId) ?? [];
    const packed = runNewSheetsOnlyFFDPass(material, matParts);
    if (!packed) {
      return {
        algorithmVersion: BASELINE_OPTIMIZER_VERSION,
        strategyLabel: 'New-sheet-only First-Fit Decreasing (FFD) guillotine baseline',
        seed,
        status: 'infeasible',
        explanation: `Baseline FFD could not pack parts onto standard sheets for "${material.name}".`,
        diagnostics: [
          {
            code: 'search_exhausted',
            materialId: matId,
            message: `Baseline FFD failed to pack "${material.name}".`,
          },
        ],
        sheets: [],
        metrics: createEmptyMetrics(),
        warnings: [],
        durationMs: Math.round(performance.now() - startMs),
      };
    }
    workingSheets.push(...packed);
  }

  const sheets = materializeWorkingSheets(workingSheets);
  const plan: PlanResult = {
    algorithmVersion: BASELINE_OPTIMIZER_VERSION,
    strategyLabel: 'New-sheet-only First-Fit Decreasing (FFD) guillotine baseline',
    seed,
    status: 'feasible',
    explanation:
      'Deterministic new-sheet-only First-Fit Decreasing guillotine baseline verified with identical part demand and saw kerf.',
    diagnostics: [],
    sheets,
    metrics: computePlanMetrics(sheets),
    warnings: [],
    durationMs: Math.round(performance.now() - startMs),
  };

  const verification = verifyPlan(problem, plan, { baselineNewSheetsOnly: true });
  if (!verification.valid) {
    return {
      algorithmVersion: BASELINE_OPTIMIZER_VERSION,
      strategyLabel: 'New-sheet-only First-Fit Decreasing (FFD) guillotine baseline',
      seed,
      status: 'infeasible',
      explanation: `Baseline plan failed independent verification: ${verification.errors
        .map((e) => e.message)
        .join('; ')}`,
      diagnostics: verification.errors.map((e) => ({
        code: 'verification_failed',
        message: e.message,
      })),
      sheets: [],
      metrics: createEmptyMetrics(),
      warnings: [],
      durationMs: Math.round(performance.now() - startMs),
    };
  }

  return plan;
}
