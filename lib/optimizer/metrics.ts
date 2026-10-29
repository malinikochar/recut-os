import { createHash } from 'node:crypto';
import { isResidualReusable } from '../domain/schemas';
import type {
  ComparisonSummary,
  CutNode,
  CutStepSummary,
  MaterialSpec,
  OptimizationProblemInput,
  PlacedPartSummary,
  PlanMetrics,
  PlanResult,
  ResidualRegionSummary,
  SheetMetrics,
  SheetPlan,
} from '../domain/types';

export function computeProblemHash(input: OptimizationProblemInput): string {
  const canonical = {
    materials: [...input.materials].sort((a, b) => a.id.localeCompare(b.id)),
    stockItems: [...input.stockItems]
      .filter((s) => s.state === 'available')
      .sort((a, b) => a.id.localeCompare(b.id)),
    job: {
      id: input.job.id,
      parts: [...input.job.parts].sort((a, b) => a.id.localeCompare(b.id)),
    },
  };
  return createHash('sha256')
    .update(JSON.stringify(canonical))
    .digest('hex')
    .slice(0, 16);
}

/**
 * Extracts flat placements, residuals, ordered cut steps, and exact sheet metrics
 * from a constructive `CutNode` tree.
 */
export function summarizeCutTree(
  root: CutNode,
  sheetWidthMm: number,
  sheetHeightMm: number,
  material: MaterialSpec
): {
  cutTree: CutNode;
  placements: PlacedPartSummary[];
  residuals: ResidualRegionSummary[];
  cuts: CutStepSummary[];
  sheetMetrics: SheetMetrics;
} {
  const placements: PlacedPartSummary[] = [];
  const residuals: ResidualRegionSummary[] = [];
  const cuts: CutStepSummary[] = [];

  let stepCounter = 0;
  let partAreaMm2 = 0;
  let recoverableRemnantAreaMm2 = 0;
  let unusableScrapAreaMm2 = 0;
  let kerfLossAreaMm2 = 0;

  function renumberAndCollect(node: CutNode): CutNode {
    if (node.kind === 'part') {
      const area = node.widthMm * node.heightMm;
      partAreaMm2 += area;
      placements.push({
        partInstanceId: node.partInstanceId,
        partId: node.partId,
        label: node.label,
        xMm: node.xMm,
        yMm: node.yMm,
        widthMm: node.widthMm,
        heightMm: node.heightMm,
        originalWidthMm: node.originalWidthMm,
        originalHeightMm: node.originalHeightMm,
        rotated: node.rotated,
      });
      return node;
    }

    if (node.kind === 'residual') {
      const areaMm2 = node.widthMm * node.heightMm;
      const reusable = isResidualReusable(node.widthMm, node.heightMm, material);
      if (reusable) {
        recoverableRemnantAreaMm2 += areaMm2;
      } else {
        unusableScrapAreaMm2 += areaMm2;
      }
      const normalizedResidual: CutNode = {
        ...node,
        reusable,
        areaMm2,
      };
      residuals.push({
        id: normalizedResidual.id,
        xMm: normalizedResidual.xMm,
        yMm: normalizedResidual.yMm,
        widthMm: normalizedResidual.widthMm,
        heightMm: normalizedResidual.heightMm,
        areaMm2,
        reusable,
      });
      return normalizedResidual;
    }

    stepCounter += 1;
    const thisStep = stepCounter;
    const kerfAreaMm2 = node.kerfRect.widthMm * node.kerfRect.heightMm;
    kerfLossAreaMm2 += kerfAreaMm2;

    const cutCoordinateMm =
      node.orientation === 'vertical'
        ? node.xMm + node.cutOffsetMm
        : node.yMm + node.cutOffsetMm;
    const spanStartMm = node.orientation === 'vertical' ? node.yMm : node.xMm;
    const spanLengthMm =
      node.orientation === 'vertical' ? node.heightMm : node.widthMm;

    cuts.push({
      stepOrder: thisStep,
      nodeId: node.id,
      orientation: node.orientation,
      cutCoordinateMm,
      spanStartMm,
      spanEndMm: spanStartMm + spanLengthMm,
      spanLengthMm,
      parentRect: {
        xMm: node.xMm,
        yMm: node.yMm,
        widthMm: node.widthMm,
        heightMm: node.heightMm,
      },
      kerfMm: node.kerfMm,
      kerfAreaMm2,
    });

    const first = renumberAndCollect(node.first);
    const second = node.second ? renumberAndCollect(node.second) : null;

    return {
      ...node,
      stepOrder: thisStep,
      first,
      second,
    };
  }

  const normalizedTree = renumberAndCollect(root);
  const initialAreaMm2 = sheetWidthMm * sheetHeightMm;
  const utilizationPct =
    initialAreaMm2 > 0
      ? Number(((100 * partAreaMm2) / initialAreaMm2).toFixed(2))
      : 0;

  return {
    cutTree: normalizedTree,
    placements,
    residuals,
    cuts,
    sheetMetrics: {
      initialAreaMm2,
      partAreaMm2,
      recoverableRemnantAreaMm2,
      unusableScrapAreaMm2,
      kerfLossAreaMm2,
      cutCount: cuts.length,
      utilizationPct,
    },
  };
}

export function createEmptyMetrics(): PlanMetrics {
  return {
    partCount: 0,
    partAreaMm2: 0,
    openedSheetCount: 0,
    openedStockAreaMm2: 0,
    newSheetCount: 0,
    newSheetPurchaseCostMinor: 0,
    availableRemnantUnitsUsed: 0,
    availableRemnantAreaUsedMm2: 0,
    availableFullSheetUnitsUsed: 0,
    availableFullSheetAreaUsedMm2: 0,
    recoverableRemnantCount: 0,
    recoverableRemnantAreaMm2: 0,
    unusableScrapAreaMm2: 0,
    kerfLossAreaMm2: 0,
    totalCutCount: 0,
    usedMaterialUtilizationPct: 0,
  };
}

export function computePlanMetrics(sheets: SheetPlan[]): PlanMetrics {
  if (sheets.length === 0) {
    return createEmptyMetrics();
  }

  let partCount = 0;
  let partAreaMm2 = 0;
  let openedStockAreaMm2 = 0;
  let newSheetCount = 0;
  let newSheetPurchaseCostMinor = 0;
  let availableRemnantUnitsUsed = 0;
  let availableRemnantAreaUsedMm2 = 0;
  let availableFullSheetUnitsUsed = 0;
  let availableFullSheetAreaUsedMm2 = 0;
  let recoverableRemnantCount = 0;
  let recoverableRemnantAreaMm2 = 0;
  let unusableScrapAreaMm2 = 0;
  let kerfLossAreaMm2 = 0;
  let totalCutCount = 0;

  for (const sheet of sheets) {
    partCount += sheet.placements.length;
    partAreaMm2 += sheet.sheetMetrics.partAreaMm2;
    openedStockAreaMm2 += sheet.sheetMetrics.initialAreaMm2;

    if (sheet.sourceType === 'new_purchase') {
      newSheetCount += 1;
      newSheetPurchaseCostMinor += sheet.estimatedNewSheetCostMinor;
    } else if (sheet.sourceType === 'available_remnant') {
      availableRemnantUnitsUsed += 1;
      availableRemnantAreaUsedMm2 += sheet.sheetMetrics.initialAreaMm2;
    } else if (sheet.sourceType === 'available_full_sheet') {
      availableFullSheetUnitsUsed += 1;
      availableFullSheetAreaUsedMm2 += sheet.sheetMetrics.initialAreaMm2;
    }

    for (const r of sheet.residuals) {
      if (r.reusable) {
        recoverableRemnantCount += 1;
      }
    }

    recoverableRemnantAreaMm2 += sheet.sheetMetrics.recoverableRemnantAreaMm2;
    unusableScrapAreaMm2 += sheet.sheetMetrics.unusableScrapAreaMm2;
    kerfLossAreaMm2 += sheet.sheetMetrics.kerfLossAreaMm2;
    totalCutCount += sheet.sheetMetrics.cutCount;
  }

  const usedMaterialUtilizationPct =
    openedStockAreaMm2 > 0
      ? Number(((100 * partAreaMm2) / openedStockAreaMm2).toFixed(2))
      : 0;

  return {
    partCount,
    partAreaMm2,
    openedSheetCount: sheets.length,
    openedStockAreaMm2,
    newSheetCount,
    newSheetPurchaseCostMinor,
    availableRemnantUnitsUsed,
    availableRemnantAreaUsedMm2,
    availableFullSheetUnitsUsed,
    availableFullSheetAreaUsedMm2,
    recoverableRemnantCount,
    recoverableRemnantAreaMm2,
    unusableScrapAreaMm2,
    kerfLossAreaMm2,
    totalCutCount,
    usedMaterialUtilizationPct,
  };
}

/**
 * Lexicographic plan ranking per PRD Section 9.4:
 * 1. Feasible completion of all parts.
 * 2. Lower `newSheetPurchaseCostMinor`.
 * 3. Lower `unusableScrapAreaMm2 + kerfLossAreaMm2`.
 * 4. Fewer cut operations (`totalCutCount`).
 * 5. Fewer opened existing stock units (`availableRemnantUnitsUsed + availableFullSheetUnitsUsed`).
 * 6. Higher `recoverableRemnantAreaMm2` (tie-breaker preserving larger clean offcuts).
 *
 * Returns negative if `a` is strictly better than `b`, positive if `b` is better, 0 if tied.
 */
export function comparePlanQuality(a: PlanResult, b: PlanResult): number {
  const aFeasible = a.status === 'feasible' ? 0 : 1;
  const bFeasible = b.status === 'feasible' ? 0 : 1;
  if (aFeasible !== bFeasible) return aFeasible - bFeasible;

  if (a.metrics.newSheetPurchaseCostMinor !== b.metrics.newSheetPurchaseCostMinor) {
    return a.metrics.newSheetPurchaseCostMinor - b.metrics.newSheetPurchaseCostMinor;
  }

  const aTrueWaste = a.metrics.unusableScrapAreaMm2 + a.metrics.kerfLossAreaMm2;
  const bTrueWaste = b.metrics.unusableScrapAreaMm2 + b.metrics.kerfLossAreaMm2;
  if (aTrueWaste !== bTrueWaste) {
    return aTrueWaste - bTrueWaste;
  }

  if (a.metrics.totalCutCount !== b.metrics.totalCutCount) {
    return a.metrics.totalCutCount - b.metrics.totalCutCount;
  }

  const aExistingUsed =
    a.metrics.availableRemnantUnitsUsed + a.metrics.availableFullSheetUnitsUsed;
  const bExistingUsed =
    b.metrics.availableRemnantUnitsUsed + b.metrics.availableFullSheetUnitsUsed;
  if (aExistingUsed !== bExistingUsed) {
    return aExistingUsed - bExistingUsed;
  }

  if (a.metrics.recoverableRemnantAreaMm2 !== b.metrics.recoverableRemnantAreaMm2) {
    return b.metrics.recoverableRemnantAreaMm2 - a.metrics.recoverableRemnantAreaMm2;
  }

  return 0;
}

/**
 * Computes transparent baseline vs ReCut OS comparison metrics without clamping
 * zero or negative deltas.
 */
export function computeComparisonSummary(params: {
  currencyCode: string;
  baseline: PlanResult;
  optimized: PlanResult;
}): ComparisonSummary | null {
  const { currencyCode, baseline, optimized } = params;
  if (baseline.status !== 'feasible' || optimized.status !== 'feasible') {
    return null;
  }

  const newSheetsDelta =
    baseline.metrics.newSheetCount - optimized.metrics.newSheetCount;
  const costDeltaMinor =
    baseline.metrics.newSheetPurchaseCostMinor -
    optimized.metrics.newSheetPurchaseCostMinor;

  const purchaseReductionPct =
    baseline.metrics.newSheetPurchaseCostMinor > 0
      ? Number(
          (
            (100 * costDeltaMinor) /
            baseline.metrics.newSheetPurchaseCostMinor
          ).toFixed(2)
        )
      : null;

  return {
    currencyCode,
    newSheetsDelta,
    costDeltaMinor,
    purchaseReductionPct,
    remnantUnitsUsed: optimized.metrics.availableRemnantUnitsUsed,
    remnantAreaUsedMm2: optimized.metrics.availableRemnantAreaUsedMm2,
    ownedFullSheetUnitsUsed: optimized.metrics.availableFullSheetUnitsUsed,
    recoverableRemnantAreaDeltaMm2:
      optimized.metrics.recoverableRemnantAreaMm2 -
      baseline.metrics.recoverableRemnantAreaMm2,
    unusableScrapDeltaMm2:
      baseline.metrics.unusableScrapAreaMm2 -
      optimized.metrics.unusableScrapAreaMm2,
    kerfLossDeltaMm2:
      baseline.metrics.kerfLossAreaMm2 - optimized.metrics.kerfLossAreaMm2,
    assumptions: [
      'Baseline packs the identical expanded parts, rotation permissions, grain constraints, and saw kerf onto newly purchased standard sheets using First-Fit Decreasing (FFD) guillotine splits.',
      'ReCut OS prioritizes owned available remnants and owned full sheets before opening virtual new sheets, ranked lexicographically by new purchase spend, true waste (scrap + kerf), cut count, and stock units opened.',
      'Owned remnants have sunk acquisition cost (0 new purchase spend); consuming them reduces physical offcut inventory on hand.',
      'Qualifying residual rectangles remain Pending Confirmation after plan commit until an operator physically measures and confirms them.',
      'Solutions are deterministic heuristics, not proofs of mathematical global optimality.',
    ],
    accountingNote:
      'Estimated from these inputs. Purchase cost reduction measures avoided new-sheet spend relative to the new-sheet-only baseline; no physical material or emissions savings are claimed as verified.',
  };
}
