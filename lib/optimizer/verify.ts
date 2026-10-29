import {
  expandJobParts,
  isOrientationCompatibleWithGrain,
  isResidualReusable,
} from '../domain/schemas';
import type {
  CutNode,
  MaterialSpec,
  OptimizationProblemInput,
  PartInstance,
  PhysicalStockUnit,
  PlanResult,
  RectMm,
  VerificationError,
  VerificationReport,
} from '../domain/types';

interface AtomicRegion extends RectMm {
  kind: 'part' | 'residual' | 'kerf';
  id: string;
}

function rectsOverlap(a: RectMm, b: RectMm): boolean {
  if (a.widthMm <= 0 || a.heightMm <= 0 || b.widthMm <= 0 || b.heightMm <= 0) {
    return false;
  }
  return (
    a.xMm < b.xMm + b.widthMm &&
    a.xMm + a.widthMm > b.xMm &&
    a.yMm < b.yMm + b.heightMm &&
    a.yMm + a.heightMm > b.yMm
  );
}

/**
 * Independently replays and verifies a `PlanResult` against the canonical
 * `OptimizationProblemInput`. Never trusts the planner's placement list or
 * metric totals without re-deriving them from the recursive `CutNode` tree.
 */
export function verifyPlan(
  problem: OptimizationProblemInput,
  plan: PlanResult,
  options?: { baselineNewSheetsOnly?: boolean }
): VerificationReport {
  const errors: VerificationError[] = [];

  if (plan.status !== 'feasible') {
    errors.push({
      code: 'INVALID_STATUS',
      message: `Cannot verify non-feasible plan status "${plan.status}".`,
    });
    return { valid: false, errors };
  }

  const materialById = new Map<string, MaterialSpec>();
  for (const m of problem.materials) {
    materialById.set(m.id, m);
  }

  const stockById = new Map<string, PhysicalStockUnit>();
  for (const s of problem.stockItems) {
    stockById.set(s.id, s);
  }

  const expectedInstances = expandJobParts(problem.job.parts);
  const instanceById = new Map<string, PartInstance>();
  for (const inst of expectedInstances) {
    instanceById.set(inst.partInstanceId, inst);
  }

  const usedStockIds = new Set<string>();
  const placedInstanceCounts = new Map<string, number>();

  let totalPartArea = 0;
  let totalOpenedArea = 0;
  let totalNewSheets = 0;
  let totalNewCostMinor = 0;
  let totalRemnantsUsed = 0;
  let totalRecoverableArea = 0;
  let totalScrapArea = 0;
  let totalKerfArea = 0;
  let totalCuts = 0;

  for (const sheet of plan.sheets) {
    const material = materialById.get(sheet.materialId);
    if (!material) {
      errors.push({
        code: 'SHEET_MATERIAL_MISSING',
        sheetIndex: sheet.sheetIndex,
        message: `Sheet ${sheet.sheetIndex} references unknown material "${sheet.materialId}".`,
      });
      continue;
    }

    if (sheet.widthMm <= 0 || sheet.heightMm <= 0) {
      errors.push({
        code: 'NEGATIVE_OR_ZERO_REGION',
        sheetIndex: sheet.sheetIndex,
        message: `Sheet ${sheet.sheetIndex} has non-positive dimensions ${sheet.widthMm}×${sheet.heightMm}.`,
      });
      continue;
    }

    // Validate stock provenance
    if (sheet.sourceType === 'new_purchase') {
      if (sheet.sourceStockId) {
        errors.push({
          code: 'NEW_SHEET_DIMENSION_MISMATCH',
          sheetIndex: sheet.sheetIndex,
          message: `Virtual purchased sheet ${sheet.sheetIndex} must not carry a physical sourceStockId.`,
        });
      }
      if (
        sheet.widthMm !== material.standardWidthMm ||
        sheet.heightMm !== material.standardHeightMm
      ) {
        errors.push({
          code: 'NEW_SHEET_DIMENSION_MISMATCH',
          sheetIndex: sheet.sheetIndex,
          message: `New sheet ${sheet.sheetIndex} (${sheet.widthMm}×${sheet.heightMm}) does not match standard ${material.standardWidthMm}×${material.standardHeightMm}.`,
        });
      }
      if (sheet.estimatedNewSheetCostMinor !== material.pricePerSheetMinor) {
        errors.push({
          code: 'NEW_SHEET_COST_MISMATCH',
          sheetIndex: sheet.sheetIndex,
          message: `New sheet ${sheet.sheetIndex} cost (${sheet.estimatedNewSheetCostMinor}) does not match material price (${material.pricePerSheetMinor}).`,
        });
      }
      totalNewSheets += 1;
      totalNewCostMinor += sheet.estimatedNewSheetCostMinor;
    } else {
      if (options?.baselineNewSheetsOnly) {
        errors.push({
          code: 'STOCK_NOT_AVAILABLE',
          sheetIndex: sheet.sheetIndex,
          message: `Baseline plan illegally used existing stock "${sheet.sourceStockId ?? ''}".`,
        });
      }
      if (!sheet.sourceStockId) {
        errors.push({
          code: 'STOCK_NOT_AVAILABLE',
          sheetIndex: sheet.sheetIndex,
          message: `Existing stock sheet ${sheet.sheetIndex} is missing sourceStockId.`,
        });
      } else {
        if (usedStockIds.has(sheet.sourceStockId)) {
          errors.push({
            code: 'DUPLICATE_SOURCE_STOCK',
            sheetIndex: sheet.sheetIndex,
            message: `Physical stock unit "${sheet.sourceStockId}" was allocated more than once.`,
          });
        }
        usedStockIds.add(sheet.sourceStockId);

        const stock = stockById.get(sheet.sourceStockId);
        if (!stock || stock.state !== 'available') {
          errors.push({
            code: 'STOCK_NOT_AVAILABLE',
            sheetIndex: sheet.sheetIndex,
            message: `Stock unit "${sheet.sourceStockId}" does not exist or is not in available state.`,
          });
        } else {
          if (stock.materialId !== sheet.materialId) {
            errors.push({
              code: 'STOCK_MATERIAL_MISMATCH',
              sheetIndex: sheet.sheetIndex,
              message: `Stock "${stock.id}" material "${stock.materialId}" mismatches sheet material "${sheet.materialId}".`,
            });
          }
          const expectedSourceType =
            stock.origin === 'remnant'
              ? 'available_remnant'
              : 'available_full_sheet';
          if (sheet.sourceType !== expectedSourceType) {
            errors.push({
              code: 'STOCK_MATERIAL_MISMATCH',
              sheetIndex: sheet.sheetIndex,
              message: `Stock "${stock.id}" origin "${stock.origin}" mismatches sourceType "${sheet.sourceType}".`,
            });
          }
          if (
            sheet.widthMm !== stock.widthMm ||
            sheet.heightMm !== stock.heightMm
          ) {
            errors.push({
              code: 'STOCK_DIMENSION_MISMATCH',
              sheetIndex: sheet.sheetIndex,
              message: `Sheet ${sheet.sheetIndex} (${sheet.widthMm}×${sheet.heightMm}) mismatches physical stock "${stock.id}" (${stock.widthMm}×${stock.heightMm}).`,
            });
          }
        }
      }
      if (sheet.estimatedNewSheetCostMinor !== 0) {
        errors.push({
          code: 'NEW_SHEET_COST_MISMATCH',
          sheetIndex: sheet.sheetIndex,
          message: `Owned stock sheet ${sheet.sheetIndex} must have 0 new purchase cost.`,
        });
      }
      if (sheet.sourceType === 'available_remnant') {
        totalRemnantsUsed += 1;
      }
    }

    // Replay cut tree from exact root bounds
    const atomicRegions: AtomicRegion[] = [];
    const treePartLeaves = new Map<
      string,
      { xMm: number; yMm: number; widthMm: number; heightMm: number; rotated: boolean }
    >();

    let sheetPartArea = 0;
    let sheetRecoverableArea = 0;
    let sheetScrapArea = 0;
    let sheetKerfArea = 0;
    let sheetCutCount = 0;

    const replayNode = (node: CutNode, expected: RectMm): void => {
      if (
        !Number.isSafeInteger(node.xMm) ||
        !Number.isSafeInteger(node.yMm) ||
        !Number.isSafeInteger(node.widthMm) ||
        !Number.isSafeInteger(node.heightMm)
      ) {
        errors.push({
          code: 'INVALID_CUT_BOUNDS',
          sheetIndex: sheet.sheetIndex,
          nodeId: node.id,
          message: `Node "${node.id}" contains non-integer geometry.`,
        });
        return;
      }

      if (node.widthMm <= 0 || node.heightMm <= 0) {
        errors.push({
          code: 'NEGATIVE_OR_ZERO_REGION',
          sheetIndex: sheet.sheetIndex,
          nodeId: node.id,
          message: `Node "${node.id}" has non-positive dimensions ${node.widthMm}×${node.heightMm}.`,
        });
        return;
      }

      if (
        node.xMm !== expected.xMm ||
        node.yMm !== expected.yMm ||
        node.widthMm !== expected.widthMm ||
        node.heightMm !== expected.heightMm
      ) {
        errors.push({
          code: 'INVALID_CUT_BOUNDS',
          sheetIndex: sheet.sheetIndex,
          nodeId: node.id,
          message: `Node "${node.id}" bounds (${node.xMm},${node.yMm},${node.widthMm}×${node.heightMm}) do not match parent subdivision (${expected.xMm},${expected.yMm},${expected.widthMm}×${expected.heightMm}).`,
        });
        return;
      }

      if (node.kind === 'part') {
        atomicRegions.push({
          kind: 'part',
          id: node.id,
          xMm: node.xMm,
          yMm: node.yMm,
          widthMm: node.widthMm,
          heightMm: node.heightMm,
        });
        sheetPartArea += node.widthMm * node.heightMm;

        const prevCount = placedInstanceCounts.get(node.partInstanceId) ?? 0;
        placedInstanceCounts.set(node.partInstanceId, prevCount + 1);
        if (prevCount >= 1) {
          errors.push({
            code: 'PART_DUPLICATE',
            sheetIndex: sheet.sheetIndex,
            nodeId: node.id,
            partInstanceId: node.partInstanceId,
            message: `Part instance "${node.partInstanceId}" was placed multiple times.`,
          });
        }
        treePartLeaves.set(node.partInstanceId, {
          xMm: node.xMm,
          yMm: node.yMm,
          widthMm: node.widthMm,
          heightMm: node.heightMm,
          rotated: node.rotated,
        });

        const spec = instanceById.get(node.partInstanceId);
        if (!spec) {
          errors.push({
            code: 'PART_UNKNOWN',
            sheetIndex: sheet.sheetIndex,
            nodeId: node.id,
            partInstanceId: node.partInstanceId,
            message: `Placed part instance "${node.partInstanceId}" is not in the job request.`,
          });
          return;
        }

        if (spec.materialId !== sheet.materialId) {
          errors.push({
            code: 'PART_MATERIAL_MISMATCH',
            sheetIndex: sheet.sheetIndex,
            nodeId: node.id,
            partInstanceId: node.partInstanceId,
            message: `Part "${spec.partInstanceId}" requires material "${spec.materialId}", placed on "${sheet.materialId}".`,
          });
        }

        const compat = isOrientationCompatibleWithGrain({
          partRequiredGrain: spec.requiredGrainAxis,
          allowRotation: spec.allowRotation,
          materialGrain: material.grainAxis,
          rotated: node.rotated,
        });
        if (!compat.ok) {
          errors.push({
            code:
              compat.reason === 'rotation_forbidden'
                ? 'PART_ROTATION_FORBIDDEN'
                : 'PART_GRAIN_MISMATCH',
            sheetIndex: sheet.sheetIndex,
            nodeId: node.id,
            partInstanceId: node.partInstanceId,
            message: `Part "${spec.partInstanceId}" violates ${compat.reason ?? 'orientation'} constraint on sheet ${sheet.sheetIndex}.`,
          });
        }

        const expectedW = node.rotated ? spec.heightMm : spec.widthMm;
        const expectedH = node.rotated ? spec.widthMm : spec.heightMm;
        if (
          node.widthMm !== expectedW ||
          node.heightMm !== expectedH ||
          node.originalWidthMm !== spec.widthMm ||
          node.originalHeightMm !== spec.heightMm
        ) {
          errors.push({
            code: 'PART_DIMENSION_MISMATCH',
            sheetIndex: sheet.sheetIndex,
            nodeId: node.id,
            partInstanceId: node.partInstanceId,
            message: `Part "${spec.partInstanceId}" leaf dimensions (${node.widthMm}×${node.heightMm}, rotated=${String(node.rotated)}) do not match requested (${expectedW}×${expectedH}).`,
          });
        }
        return;
      }

      if (node.kind === 'residual') {
        atomicRegions.push({
          kind: 'residual',
          id: node.id,
          xMm: node.xMm,
          yMm: node.yMm,
          widthMm: node.widthMm,
          heightMm: node.heightMm,
        });
        const expectedArea = node.widthMm * node.heightMm;
        const expectedReusable = isResidualReusable(
          node.widthMm,
          node.heightMm,
          material
        );
        if (node.areaMm2 !== expectedArea || node.reusable !== expectedReusable) {
          errors.push({
            code: 'RESIDUAL_CLASSIFICATION_MISMATCH',
            sheetIndex: sheet.sheetIndex,
            nodeId: node.id,
            message: `Residual "${node.id}" (${node.widthMm}×${node.heightMm}) reusable=${String(node.reusable)} area=${node.areaMm2} mismatches expected reusable=${String(expectedReusable)} area=${expectedArea}.`,
          });
        }
        if (expectedReusable) {
          sheetRecoverableArea += expectedArea;
        } else {
          sheetScrapArea += expectedArea;
        }
        return;
      }

      // Split node verification
      sheetCutCount += 1;
      if (node.kerfMm !== material.kerfMm) {
        errors.push({
          code: 'INVALID_KERF_RECT',
          sheetIndex: sheet.sheetIndex,
          nodeId: node.id,
          message: `Split "${node.id}" kerf (${node.kerfMm}) does not match material kerf (${material.kerfMm}).`,
        });
      }

      if (node.orientation === 'vertical') {
        const remW = node.widthMm - node.cutOffsetMm - node.kerfMm;
        if (
          node.cutOffsetMm <= 0 ||
          remW < 0 ||
          (node.kerfMm === 0 && remW === 0)
        ) {
          errors.push({
            code: 'INVALID_CUT_BOUNDS',
            sheetIndex: sheet.sheetIndex,
            nodeId: node.id,
            message: `Vertical split "${node.id}" offset ${node.cutOffsetMm} with kerf ${node.kerfMm} is invalid inside width ${node.widthMm} (remaining=${remW}).`,
          });
          return;
        }

        const expectedKerf: RectMm = {
          xMm: node.xMm + node.cutOffsetMm,
          yMm: node.yMm,
          widthMm: node.kerfMm,
          heightMm: node.heightMm,
        };
        if (
          node.kerfRect.xMm !== expectedKerf.xMm ||
          node.kerfRect.yMm !== expectedKerf.yMm ||
          node.kerfRect.widthMm !== expectedKerf.widthMm ||
          node.kerfRect.heightMm !== expectedKerf.heightMm
        ) {
          errors.push({
            code: 'INVALID_KERF_RECT',
            sheetIndex: sheet.sheetIndex,
            nodeId: node.id,
            message: `Vertical split "${node.id}" kerfRect does not match cut geometry.`,
          });
        }

        if (node.kerfMm > 0) {
          atomicRegions.push({
            kind: 'kerf',
            id: `${node.id}:kerf`,
            ...expectedKerf,
          });
          sheetKerfArea += expectedKerf.widthMm * expectedKerf.heightMm;
        }

        replayNode(node.first, {
          xMm: node.xMm,
          yMm: node.yMm,
          widthMm: node.cutOffsetMm,
          heightMm: node.heightMm,
        });

        if (remW === 0) {
          if (node.second !== null) {
            errors.push({
              code: 'INVALID_CUT_BOUNDS',
              sheetIndex: sheet.sheetIndex,
              nodeId: node.id,
              message: `Vertical edge-trim split "${node.id}" has zero remaining width but non-null second child.`,
            });
          }
        } else {
          if (node.second === null) {
            errors.push({
              code: 'AREA_CONSERVATION_VIOLATION',
              sheetIndex: sheet.sheetIndex,
              nodeId: node.id,
              message: `Vertical split "${node.id}" dropped ${remW} mm of remaining width.`,
            });
          } else {
            replayNode(node.second, {
              xMm: node.xMm + node.cutOffsetMm + node.kerfMm,
              yMm: node.yMm,
              widthMm: remW,
              heightMm: node.heightMm,
            });
          }
        }
      } else {
        const remH = node.heightMm - node.cutOffsetMm - node.kerfMm;
        if (
          node.cutOffsetMm <= 0 ||
          remH < 0 ||
          (node.kerfMm === 0 && remH === 0)
        ) {
          errors.push({
            code: 'INVALID_CUT_BOUNDS',
            sheetIndex: sheet.sheetIndex,
            nodeId: node.id,
            message: `Horizontal split "${node.id}" offset ${node.cutOffsetMm} with kerf ${node.kerfMm} is invalid inside height ${node.heightMm} (remaining=${remH}).`,
          });
          return;
        }

        const expectedKerf: RectMm = {
          xMm: node.xMm,
          yMm: node.yMm + node.cutOffsetMm,
          widthMm: node.widthMm,
          heightMm: node.kerfMm,
        };
        if (
          node.kerfRect.xMm !== expectedKerf.xMm ||
          node.kerfRect.yMm !== expectedKerf.yMm ||
          node.kerfRect.widthMm !== expectedKerf.widthMm ||
          node.kerfRect.heightMm !== expectedKerf.heightMm
        ) {
          errors.push({
            code: 'INVALID_KERF_RECT',
            sheetIndex: sheet.sheetIndex,
            nodeId: node.id,
            message: `Horizontal split "${node.id}" kerfRect does not match cut geometry.`,
          });
        }

        if (node.kerfMm > 0) {
          atomicRegions.push({
            kind: 'kerf',
            id: `${node.id}:kerf`,
            ...expectedKerf,
          });
          sheetKerfArea += expectedKerf.widthMm * expectedKerf.heightMm;
        }

        replayNode(node.first, {
          xMm: node.xMm,
          yMm: node.yMm,
          widthMm: node.widthMm,
          heightMm: node.cutOffsetMm,
        });

        if (remH === 0) {
          if (node.second !== null) {
            errors.push({
              code: 'INVALID_CUT_BOUNDS',
              sheetIndex: sheet.sheetIndex,
              nodeId: node.id,
              message: `Horizontal edge-trim split "${node.id}" has zero remaining height but non-null second child.`,
            });
          }
        } else {
          if (node.second === null) {
            errors.push({
              code: 'AREA_CONSERVATION_VIOLATION',
              sheetIndex: sheet.sheetIndex,
              nodeId: node.id,
              message: `Horizontal split "${node.id}" dropped ${remH} mm of remaining height.`,
            });
          } else {
            replayNode(node.second, {
              xMm: node.xMm,
              yMm: node.yMm + node.cutOffsetMm + node.kerfMm,
              widthMm: node.widthMm,
              heightMm: remH,
            });
          }
        }
      }
    };

    replayNode(sheet.cutTree, {
      xMm: 0,
      yMm: 0,
      widthMm: sheet.widthMm,
      heightMm: sheet.heightMm,
    });

    // Pairwise overlap & sheet boundary check across all atomic regions
    for (let i = 0; i < atomicRegions.length; i += 1) {
      const a = atomicRegions[i]!;
      if (
        a.xMm < 0 ||
        a.yMm < 0 ||
        a.xMm + a.widthMm > sheet.widthMm ||
        a.yMm + a.heightMm > sheet.heightMm
      ) {
        errors.push({
          code: 'INVALID_CUT_BOUNDS',
          sheetIndex: sheet.sheetIndex,
          nodeId: a.id,
          message: `Region "${a.id}" protrudes outside sheet ${sheet.sheetIndex} bounds.`,
        });
      }
      for (let j = i + 1; j < atomicRegions.length; j += 1) {
        const b = atomicRegions[j]!;
        if (rectsOverlap(a, b)) {
          errors.push({
            code: 'OVERLAPPING_REGIONS',
            sheetIndex: sheet.sheetIndex,
            nodeId: a.id,
            message: `Regions "${a.id}" and "${b.id}" overlap on sheet ${sheet.sheetIndex}.`,
          });
        }
      }
    }

    // Exact area conservation invariant per sheet
    const initialArea = sheet.widthMm * sheet.heightMm;
    const accountedArea =
      sheetPartArea + sheetRecoverableArea + sheetScrapArea + sheetKerfArea;
    if (initialArea !== accountedArea) {
      errors.push({
        code: 'AREA_CONSERVATION_VIOLATION',
        sheetIndex: sheet.sheetIndex,
        message: `Sheet ${sheet.sheetIndex} area conservation failed: initial=${initialArea} mm² != accounted=${accountedArea} mm² (parts=${sheetPartArea}, recoverable=${sheetRecoverableArea}, scrap=${sheetScrapArea}, kerf=${sheetKerfArea}).`,
      });
    }

    // Cross-check flat placement list against cutTree leaves
    if (sheet.placements.length !== treePartLeaves.size) {
      errors.push({
        code: 'PLACEMENT_LIST_MISMATCH',
        sheetIndex: sheet.sheetIndex,
        message: `Sheet ${sheet.sheetIndex} placements array length (${sheet.placements.length}) mismatches cutTree part leaves (${treePartLeaves.size}).`,
      });
    } else {
      for (const p of sheet.placements) {
        const leaf = treePartLeaves.get(p.partInstanceId);
        if (
          !leaf ||
          leaf.xMm !== p.xMm ||
          leaf.yMm !== p.yMm ||
          leaf.widthMm !== p.widthMm ||
          leaf.heightMm !== p.heightMm ||
          leaf.rotated !== p.rotated
        ) {
          errors.push({
            code: 'PLACEMENT_LIST_MISMATCH',
            sheetIndex: sheet.sheetIndex,
            partInstanceId: p.partInstanceId,
            message: `Sheet ${sheet.sheetIndex} placement summary for "${p.partInstanceId}" mismatches cutTree leaf.`,
          });
        }
      }
    }

    // Cross-check sheetMetrics
    if (
      sheet.sheetMetrics.initialAreaMm2 !== initialArea ||
      sheet.sheetMetrics.partAreaMm2 !== sheetPartArea ||
      sheet.sheetMetrics.recoverableRemnantAreaMm2 !== sheetRecoverableArea ||
      sheet.sheetMetrics.unusableScrapAreaMm2 !== sheetScrapArea ||
      sheet.sheetMetrics.kerfLossAreaMm2 !== sheetKerfArea ||
      sheet.sheetMetrics.cutCount !== sheetCutCount
    ) {
      errors.push({
        code: 'METRIC_MISMATCH',
        sheetIndex: sheet.sheetIndex,
        message: `Sheet ${sheet.sheetIndex} reported sheetMetrics do not match replayed cutTree values.`,
      });
    }

    totalOpenedArea += initialArea;
    totalPartArea += sheetPartArea;
    totalRecoverableArea += sheetRecoverableArea;
    totalScrapArea += sheetScrapArea;
    totalKerfArea += sheetKerfArea;
    totalCuts += sheetCutCount;
  }

  // Global part bijection check
  for (const expected of expectedInstances) {
    const count = placedInstanceCounts.get(expected.partInstanceId) ?? 0;
    if (count === 0) {
      errors.push({
        code: 'PART_MISSING',
        partInstanceId: expected.partInstanceId,
        message: `Requested part instance "${expected.partInstanceId}" (${expected.label}) was not placed.`,
      });
    }
  }

  // Global plan metrics check
  if (
    plan.metrics.partCount !== expectedInstances.length ||
    plan.metrics.partAreaMm2 !== totalPartArea ||
    plan.metrics.openedStockAreaMm2 !== totalOpenedArea ||
    plan.metrics.newSheetCount !== totalNewSheets ||
    plan.metrics.newSheetPurchaseCostMinor !== totalNewCostMinor ||
    plan.metrics.availableRemnantUnitsUsed !== totalRemnantsUsed ||
    plan.metrics.recoverableRemnantAreaMm2 !== totalRecoverableArea ||
    plan.metrics.unusableScrapAreaMm2 !== totalScrapArea ||
    plan.metrics.kerfLossAreaMm2 !== totalKerfArea ||
    plan.metrics.totalCutCount !== totalCuts
  ) {
    errors.push({
      code: 'METRIC_MISMATCH',
      message:
        'Plan top-level metrics do not match exact sum of verified sheet cut trees.',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
