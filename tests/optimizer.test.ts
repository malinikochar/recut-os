import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  materialSpecSchema,
  optimizationProblemInputSchema,
} from '@/lib/domain/schemas';
import type {
  CutNode,
  MaterialSpec,
  OptimizationProblemInput,
  PlanResult,
} from '@/lib/domain/types';
import {
  evaluateOptimization,
  parseWorkshopFixture,
  runBaselineOptimizer,
  runRecutGuillotineOptimizer,
  verifyPlan,
} from '@/lib/optimizer';

const baseMaterial: MaterialSpec = {
  id: 'ply-18',
  name: 'Birch Plywood 18mm',
  category: 'Plywood',
  thicknessMm: 18,
  standardWidthMm: 2440,
  standardHeightMm: 1220,
  pricePerSheetMinor: 180000,
  currencyCode: 'INR',
  kerfMm: 3,
  grainAxis: 'none',
  minReusableWidthMm: 150,
  minReusableHeightMm: 150,
};

describe('Domain schema validation', () => {
  it('rejects zero, negative, fractional, and overflow geometry or invalid currency', () => {
    expect(
      materialSpecSchema.safeParse({ ...baseMaterial, thicknessMm: 0 }).success
    ).toBe(false);
    expect(
      materialSpecSchema.safeParse({ ...baseMaterial, standardWidthMm: -100 })
        .success
    ).toBe(false);
    expect(
      materialSpecSchema.safeParse({ ...baseMaterial, standardHeightMm: 1220.5 })
        .success
    ).toBe(false);
    expect(
      materialSpecSchema.safeParse({ ...baseMaterial, standardWidthMm: 500_000 })
        .success
    ).toBe(false);
    expect(
      materialSpecSchema.safeParse({ ...baseMaterial, currencyCode: 'RUPEE' })
        .success
    ).toBe(false);
    expect(
      materialSpecSchema.safeParse({ ...baseMaterial, pricePerSheetMinor: -1 })
        .success
    ).toBe(false);
  });

  it('rejects expanded part counts exceeding MVP bound (100) and oversized stock items', () => {
    const tooManyParts = optimizationProblemInputSchema.safeParse({
      materials: [baseMaterial],
      stockItems: [],
      job: {
        id: 'j1',
        title: 'Huge batch',
        parts: [
          {
            id: 'p1',
            label: 'Shelf',
            materialId: 'ply-18',
            widthMm: 300,
            heightMm: 200,
            quantity: 50,
            allowRotation: true,
            requiredGrainAxis: 'none',
          },
          {
            id: 'p2',
            label: 'Divider',
            materialId: 'ply-18',
            widthMm: 300,
            heightMm: 200,
            quantity: 51,
            allowRotation: true,
            requiredGrainAxis: 'none',
          },
        ],
      },
    });
    expect(tooManyParts.success).toBe(false);

    const oversizedStock = optimizationProblemInputSchema.safeParse({
      materials: [baseMaterial],
      stockItems: [
        {
          id: 's1',
          label: 'Impossible offcut',
          materialId: 'ply-18',
          origin: 'remnant',
          state: 'available',
          widthMm: 3000,
          heightMm: 1500,
        },
      ],
      job: {
        id: 'j2',
        title: 'Valid job',
        parts: [
          {
            id: 'p1',
            label: 'Shelf',
            materialId: 'ply-18',
            widthMm: 300,
            heightMm: 200,
            quantity: 1,
            allowRotation: true,
            requiredGrainAxis: 'none',
          },
        ],
      },
    });
    expect(oversizedStock.success).toBe(false);
  });
});

describe('Golden geometry, kerf, rotation, and grain invariants', () => {
  it('places an exact-fit part on a remnant with zero cuts and zero kerf loss', () => {
    const problem: OptimizationProblemInput = {
      materials: [baseMaterial],
      stockItems: [
        {
          id: 'rem-exact',
          label: 'Exact 800x400',
          materialId: 'ply-18',
          origin: 'remnant',
          state: 'available',
          widthMm: 800,
          heightMm: 400,
        },
      ],
      job: {
        id: 'job-exact',
        title: 'Exact fit test',
        parts: [
          {
            id: 'p1',
            label: 'Exact panel',
            materialId: 'ply-18',
            widthMm: 800,
            heightMm: 400,
            quantity: 1,
            allowRotation: false,
            requiredGrainAxis: 'none',
          },
        ],
      },
    };

    const plan = runRecutGuillotineOptimizer(problem);
    expect(plan.status).toBe('feasible');
    expect(verifyPlan(problem, plan).valid).toBe(true);
    expect(plan.metrics.newSheetCount).toBe(0);
    expect(plan.metrics.availableRemnantUnitsUsed).toBe(1);
    expect(plan.metrics.totalCutCount).toBe(0);
    expect(plan.metrics.kerfLossAreaMm2).toBe(0);
    expect(plan.metrics.usedMaterialUtilizationPct).toBe(100);
  });

  it('handles exact edge-trim where excess equals kerfMm (zero nonnegative residual) vs insufficient kerf room', () => {
    const tightMaterial: MaterialSpec = {
      ...baseMaterial,
      standardWidthMm: 1000,
      standardHeightMm: 600,
      kerfMm: 3,
    };

    // 997 + 3 == 1000: legal 1-cut edge trim with 0 residual width
    const legalTrim: OptimizationProblemInput = {
      materials: [tightMaterial],
      stockItems: [],
      job: {
        id: 'job-trim',
        title: 'Edge trim',
        parts: [
          {
            id: 'p-trim',
            label: 'Trimmed panel',
            materialId: 'ply-18',
            widthMm: 997,
            heightMm: 600,
            quantity: 1,
            allowRotation: false,
            requiredGrainAxis: 'none',
          },
        ],
      },
    };
    const trimPlan = runRecutGuillotineOptimizer(legalTrim);
    expect(trimPlan.status).toBe('feasible');
    expect(verifyPlan(legalTrim, trimPlan).valid).toBe(true);
    expect(trimPlan.metrics.totalCutCount).toBe(1);
    expect(trimPlan.metrics.kerfLossAreaMm2).toBe(3 * 600);
    expect(trimPlan.metrics.unusableScrapAreaMm2).toBe(0);

    // 998 on 1000 with 3mm kerf leaves only 2mm (< 3mm kerf): illegal!
    const illegalKerfGap: OptimizationProblemInput = {
      materials: [tightMaterial],
      stockItems: [],
      job: {
        id: 'job-illegal-gap',
        title: 'Insufficient kerf gap',
        parts: [
          {
            id: 'p-gap',
            label: '998mm panel',
            materialId: 'ply-18',
            widthMm: 998,
            heightMm: 600,
            quantity: 1,
            allowRotation: false,
            requiredGrainAxis: 'none',
          },
        ],
      },
    };
    const gapPlan = runRecutGuillotineOptimizer(illegalKerfGap);
    expect(gapPlan.status).toBe('infeasible');
    expect(gapPlan.diagnostics[0]?.code).toBe('part_exceeds_stock');
  });

  it('respects rotation lock and grain axis compatibility strictly', () => {
    const grainedMaterial: MaterialSpec = {
      ...baseMaterial,
      id: 'oak-y',
      name: 'Oak Veneer Y-Grain',
      standardWidthMm: 1000,
      standardHeightMm: 2000,
      grainAxis: 'y',
    };

    // Part requires X-grain (along its 1500mm width). Sheet has Y-grain (along 2000mm height).
    // With allowRotation=true, rotating 90° places 1500mm along Y -> matches sheet Y-grain!
    const rotatableGrainProblem: OptimizationProblemInput = {
      materials: [grainedMaterial],
      stockItems: [],
      job: {
        id: 'job-grain-rot',
        title: 'Rotated grain match',
        parts: [
          {
            id: 'door',
            label: 'Oak door',
            materialId: 'oak-y',
            widthMm: 1500,
            heightMm: 500,
            quantity: 1,
            allowRotation: true,
            requiredGrainAxis: 'x',
          },
        ],
      },
    };
    const okPlan = runRecutGuillotineOptimizer(rotatableGrainProblem);
    expect(okPlan.status).toBe('feasible');
    expect(verifyPlan(rotatableGrainProblem, okPlan).valid).toBe(true);
    expect(okPlan.sheets[0]?.placements[0]?.rotated).toBe(true);

    // Same part with allowRotation=false: impossible to align X-grain part on Y-grain sheet!
    const lockedGrainProblem: OptimizationProblemInput = {
      ...rotatableGrainProblem,
      job: {
        ...rotatableGrainProblem.job,
        parts: [
          {
            ...rotatableGrainProblem.job.parts[0]!,
            allowRotation: false,
          },
        ],
      },
    };
    const failPlan = runRecutGuillotineOptimizer(lockedGrainProblem);
    expect(failPlan.status).toBe('infeasible');
    expect(failPlan.diagnostics[0]?.code).toBe('grain_mismatch');
  });

  it('never uses pending_confirmation or consumed stock, and never substitutes materials', () => {
    const acrylicMaterial: MaterialSpec = {
      ...baseMaterial,
      id: 'acr-6',
      name: 'Acrylic 6mm',
      category: 'Acrylic',
      thicknessMm: 6,
    };

    const problem: OptimizationProblemInput = {
      materials: [baseMaterial, acrylicMaterial],
      stockItems: [
        {
          id: 'pending-rem',
          label: 'Unconfirmed plywood',
          materialId: 'ply-18',
          origin: 'remnant',
          state: 'pending_confirmation',
          widthMm: 900,
          heightMm: 500,
        },
        {
          id: 'consumed-rem',
          label: 'Consumed plywood',
          materialId: 'ply-18',
          origin: 'remnant',
          state: 'consumed',
          widthMm: 900,
          heightMm: 500,
        },
        {
          id: 'wrong-mat-rem',
          label: 'Available acrylic',
          materialId: 'acr-6',
          origin: 'remnant',
          state: 'available',
          widthMm: 900,
          heightMm: 500,
        },
      ],
      job: {
        id: 'job-ply',
        title: 'Plywood shelf',
        parts: [
          {
            id: 's1',
            label: 'Shelf',
            materialId: 'ply-18',
            widthMm: 600,
            heightMm: 300,
            quantity: 1,
            allowRotation: true,
            requiredGrainAxis: 'none',
          },
        ],
      },
    };

    const plan = runRecutGuillotineOptimizer(problem);
    expect(plan.status).toBe('feasible');
    expect(verifyPlan(problem, plan).valid).toBe(true);
    expect(plan.metrics.availableRemnantUnitsUsed).toBe(0);
    expect(plan.metrics.newSheetCount).toBe(1);
    expect(plan.warnings.length).toBeGreaterThan(0);
  });
});

describe('Independent cut-tree verifier adversarial rejection tests', () => {
  const simpleProblem: OptimizationProblemInput = {
    materials: [baseMaterial],
    stockItems: [
      {
        id: 'rem-1',
        label: 'Remnant 1000x600',
        materialId: 'ply-18',
        origin: 'remnant',
        state: 'available',
        widthMm: 1000,
        heightMm: 600,
      },
    ],
    job: {
      id: 'job-adv',
      title: 'Two parts',
      parts: [
        {
          id: 'p1',
          label: 'Part A',
          materialId: 'ply-18',
          widthMm: 400,
          heightMm: 300,
          quantity: 2,
          allowRotation: false,
          requiredGrainAxis: 'none',
        },
      ],
    },
  };

  it('rejects a plan with missing parts, duplicate stock IDs, dropped area, or corrupted split coordinates', () => {
    const validPlan = runRecutGuillotineOptimizer(simpleProblem);
    expect(verifyPlan(simpleProblem, validPlan).valid).toBe(true);

    // 1. Corrupt metric total -> METRIC_MISMATCH
    const tamperedMetrics: PlanResult = {
      ...validPlan,
      metrics: {
        ...validPlan.metrics,
        kerfLossAreaMm2: validPlan.metrics.kerfLossAreaMm2 - 1,
      },
    };
    const rMetrics = verifyPlan(simpleProblem, tamperedMetrics);
    expect(rMetrics.valid).toBe(false);
    expect(rMetrics.errors.some((e) => e.code === 'METRIC_MISMATCH')).toBe(true);

    // 2. Duplicate physical sourceStockId across two sheets -> DUPLICATE_SOURCE_STOCK
    const duplicateStock: PlanResult = {
      ...validPlan,
      sheets: [validPlan.sheets[0]!, { ...validPlan.sheets[0]!, sheetIndex: 2 }],
    };
    const rDupStock = verifyPlan(simpleProblem, duplicateStock);
    expect(rDupStock.valid).toBe(false);
    expect(
      rDupStock.errors.some((e) => e.code === 'DUPLICATE_SOURCE_STOCK')
    ).toBe(true);

    // 3. Forged non-guillotine / overlapping cutTree -> INVALID_CUT_BOUNDS / AREA_CONSERVATION_VIOLATION
    const forgedTree: CutNode = {
      kind: 'split',
      id: 'forged-split',
      stepOrder: 1,
      xMm: 0,
      yMm: 0,
      widthMm: 1000,
      heightMm: 600,
      orientation: 'vertical',
      cutOffsetMm: 400,
      kerfMm: 3,
      kerfRect: { xMm: 400, yMm: 0, widthMm: 3, heightMm: 600 },
      first: {
        kind: 'part',
        id: 'leaf-1',
        xMm: 0,
        yMm: 0,
        widthMm: 400,
        heightMm: 300, // Only 300 tall inside a 600-tall vertical split without a horizontal sub-split!
        partInstanceId: 'p1#1',
        partId: 'p1',
        label: 'Part A (1/2)',
        rotated: false,
        originalWidthMm: 400,
        originalHeightMm: 300,
      },
      second: null, // Dropped remaining 597mm width!
    };
    const forgedPlan: PlanResult = {
      ...validPlan,
      sheets: [
        {
          ...validPlan.sheets[0]!,
          cutTree: forgedTree,
        },
      ],
    };
    const rForged = verifyPlan(simpleProblem, forgedPlan);
    expect(rForged.valid).toBe(false);
    expect(
      rForged.errors.some(
        (e) =>
          e.code === 'INVALID_CUT_BOUNDS' ||
          e.code === 'AREA_CONSERVATION_VIOLATION' ||
          e.code === 'PART_MISSING'
      )
    ).toBe(true);
  });
});

describe('Sample workshop fixture & benchmark suite determinism', () => {
  it('solves sample-workshop.json deterministically, passes verifier on both baseline and ReCut, and fulfills batch from remnants', () => {
    const raw = JSON.parse(
      readFileSync(
        path.join(process.cwd(), 'fixtures/sample-workshop.json'),
        'utf8'
      )
    );
    const { problem } = parseWorkshopFixture(raw);

    const run1 = evaluateOptimization(problem);
    const run2 = evaluateOptimization(problem);

    expect(run1.baseline.status).toBe('feasible');
    expect(run1.optimized.status).toBe('feasible');
    expect(
      verifyPlan(problem, run1.baseline, { baselineNewSheetsOnly: true }).valid
    ).toBe(true);
    expect(verifyPlan(problem, run1.optimized).valid).toBe(true);

    // Deterministic equality (excluding wall-clock durationMs)
    expect({ ...run1.optimized, durationMs: 0 }).toEqual({
      ...run2.optimized,
      durationMs: 0,
    });
    expect({ ...run1.baseline, durationMs: 0 }).toEqual({
      ...run2.baseline,
      durationMs: 0,
    });

    // Baseline buys 1 standard sheet; ReCut fulfills all 10 cabinet pieces from existing remnants (0 new sheets)
    expect(run1.baseline.metrics.newSheetCount).toBe(1);
    expect(run1.optimized.metrics.newSheetCount).toBe(0);
    expect(run1.comparison?.newSheetsDelta).toBe(1);
    expect(run1.comparison?.costDeltaMinor).toBe(180000);
  });

  it('verifies all benchmark-suite fixtures including zero-savings and impossible-part cases', () => {
    const suiteRaw = JSON.parse(
      readFileSync(
        path.join(process.cwd(), 'fixtures/benchmark-suite.json'),
        'utf8'
      )
    ) as unknown[];

    for (const item of suiteRaw) {
      const fx = parseWorkshopFixture(item);
      const evaluation = evaluateOptimization(fx.problem);

      if (fx.fixtureId === 'impossible-oversized-part-v1') {
        expect(evaluation.baseline.status).toBe('infeasible');
        expect(evaluation.optimized.status).toBe('infeasible');
        expect(evaluation.optimized.diagnostics[0]?.code).toBe(
          'part_exceeds_stock'
        );
      } else {
        expect(evaluation.baseline.status).toBe('feasible');
        expect(evaluation.optimized.status).toBe('feasible');
        expect(
          verifyPlan(fx.problem, evaluation.baseline, {
            baselineNewSheetsOnly: true,
          }).valid
        ).toBe(true);
        expect(verifyPlan(fx.problem, evaluation.optimized).valid).toBe(true);
      }

      if (
        fx.fixtureId === 'no-inventory-v1' ||
        fx.fixtureId === 'poor-remnants-no-savings-v1'
      ) {
        expect(evaluation.comparison?.costDeltaMinor).toBe(0);
        // Consolidation ensures we do not needlessly consume tiny remnants when 1 new sheet holds everything
        expect(evaluation.optimized.metrics.availableRemnantUnitsUsed).toBe(0);
      }
    }
  });

  it('completes a 40-part, 15-remnant, 2-material benchmark well under the 3s PRD target', () => {
    const mdf: MaterialSpec = {
      ...baseMaterial,
      id: 'mdf-12',
      name: 'MDF 12mm',
      thicknessMm: 12,
      pricePerSheetMinor: 120000,
    };

    const stockItems = Array.from({ length: 15 }, (_, i) => ({
      id: `rem-${i + 1}`,
      label: `Remnant ${i + 1}`,
      materialId: i % 2 === 0 ? 'ply-18' : 'mdf-12',
      origin: 'remnant' as const,
      state: 'available' as const,
      widthMm: 900 + (i % 4) * 100,
      heightMm: 500 + (i % 3) * 100,
    }));

    const problem: OptimizationProblemInput = {
      materials: [baseMaterial, mdf],
      stockItems,
      job: {
        id: 'perf-job',
        title: '40-part multi-material workshop batch',
        parts: [
          {
            id: 'ply-a',
            label: 'Ply carcass',
            materialId: 'ply-18',
            widthMm: 550,
            heightMm: 380,
            quantity: 12,
            allowRotation: true,
            requiredGrainAxis: 'none',
          },
          {
            id: 'ply-b',
            label: 'Ply rail',
            materialId: 'ply-18',
            widthMm: 420,
            heightMm: 140,
            quantity: 8,
            allowRotation: true,
            requiredGrainAxis: 'none',
          },
          {
            id: 'mdf-a',
            label: 'MDF drawer base',
            materialId: 'mdf-12',
            widthMm: 480,
            heightMm: 410,
            quantity: 12,
            allowRotation: true,
            requiredGrainAxis: 'none',
          },
          {
            id: 'mdf-b',
            label: 'MDF back',
            materialId: 'mdf-12',
            widthMm: 600,
            heightMm: 280,
            quantity: 8,
            allowRotation: true,
            requiredGrainAxis: 'none',
          },
        ],
      },
      seed: 42,
      timeBudgetMs: 1500,
    };

    const start = performance.now();
    const baseline = runBaselineOptimizer(problem);
    const optimized = runRecutGuillotineOptimizer(problem);
    const elapsedMs = performance.now() - start;

    expect(baseline.status).toBe('feasible');
    expect(optimized.status).toBe('feasible');
    expect(verifyPlan(problem, baseline, { baselineNewSheetsOnly: true }).valid).toBe(true);
    expect(verifyPlan(problem, optimized).valid).toBe(true);
    expect(elapsedMs).toBeLessThan(3000);
  });
});
