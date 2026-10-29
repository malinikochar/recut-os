import {
  expandJobParts,
  isOrientationCompatibleWithGrain,
  isResidualReusable,
} from '../domain/schemas';
import type {
  CutNode,
  InfeasibilityDiagnostic,
  MaterialSpec,
  OptimizationProblemInput,
  PartInstance,
  PartLeafNode,
  PhysicalStockUnit,
  PlanResult,
  ResidualLeafNode,
  SheetPlan,
  StockSourceType,
} from '../domain/types';
import {
  comparePlanQuality,
  computePlanMetrics,
  createEmptyMetrics,
  summarizeCutTree,
} from './metrics';
import { verifyPlan } from './verify';

export const RECUT_OPTIMIZER_VERSION = 'recut-guillotine-v1.0.0';
export const BASELINE_OPTIMIZER_VERSION = 'baseline-ffd-guillotine-v1.0.0';

export type SplitRule = 'SLAS' | 'LLAS' | 'MIN_WASTE';
export type FitRule = 'BAF' | 'BSSF' | 'BLSF' | 'FIRST_FIT';
export type StockPriorityMode =
  | 'new_sheets_only'
  | 'remnant_tightest_first'
  | 'remnant_largest_first'
  | 'existing_largest_first';

interface WorkingSheet {
  tempId: string;
  material: MaterialSpec;
  sourceStockId?: string;
  sourceLabel: string;
  sourceType: StockSourceType;
  widthMm: number;
  heightMm: number;
  estimatedNewSheetCostMinor: number;
  root: CutNode;
  placedParts: PartInstance[];
}

interface CandidatePlacement {
  sheetIdx: number;
  isNewVirtualSheet: boolean;
  stockCandidate?: PhysicalStockUnit;
  leaf: ResidualLeafNode;
  rotated: boolean;
  placedW: number;
  placedH: number;
  firstAxis: 'vertical_first' | 'horizontal_first';
  scoreTuple: [number, number, number, number];
}

/**
 * Deterministic 32-bit PRNG (Mulberry32) so identical `(input, seed)` always produces
 * identical candidate permutations across platforms.
 */
export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function deterministicShuffle<T>(items: readonly T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = tmp;
  }
  return copy;
}

function makeInitialResidualTree(
  sheetTempId: string,
  widthMm: number,
  heightMm: number,
  material: MaterialSpec
): ResidualLeafNode {
  return {
    kind: 'residual',
    id: `${sheetTempId}:r0`,
    xMm: 0,
    yMm: 0,
    widthMm,
    heightMm,
    reusable: isResidualReusable(widthMm, heightMm, material),
    areaMm2: widthMm * heightMm,
  };
}

function collectResidualLeaves(node: CutNode, out: ResidualLeafNode[] = []): ResidualLeafNode[] {
  if (node.kind === 'residual') {
    out.push(node);
    return out;
  }
  if (node.kind === 'part') {
    return out;
  }
  collectResidualLeaves(node.first, out);
  if (node.second) {
    collectResidualLeaves(node.second, out);
  }
  return out;
}

/**
 * Checks whether `placedW × placedH` can be separated from `rectW × rectH` with saw kerf `kerfMm`.
 * Along each axis:
 * - exact fit (`d === D`) requires 0 cuts;
 * - cut fit (`d + kerfMm <= D`) consumes `kerfMm` and leaves `D - d - kerfMm >= 0`;
 * - `D - kerfMm < d < D` is physically impossible because the blade kerf would eat into the part.
 */
export function canFitWithKerf(
  placedW: number,
  placedH: number,
  rectW: number,
  rectH: number,
  kerfMm: number
): {
  fits: boolean;
  needsVerticalCut: boolean;
  needsHorizontalCut: boolean;
  rightRemW: number;
  bottomRemH: number;
} {
  let needsVerticalCut = false;
  let rightRemW = 0;

  if (placedW === rectW) {
    needsVerticalCut = false;
    rightRemW = 0;
  } else if (placedW + kerfMm <= rectW) {
    needsVerticalCut = true;
    rightRemW = rectW - placedW - kerfMm;
  } else {
    return {
      fits: false,
      needsVerticalCut: false,
      needsHorizontalCut: false,
      rightRemW: -1,
      bottomRemH: -1,
    };
  }

  let needsHorizontalCut = false;
  let bottomRemH = 0;

  if (placedH === rectH) {
    needsHorizontalCut = false;
    bottomRemH = 0;
  } else if (placedH + kerfMm <= rectH) {
    needsHorizontalCut = true;
    bottomRemH = rectH - placedH - kerfMm;
  } else {
    return {
      fits: false,
      needsVerticalCut: false,
      needsHorizontalCut: false,
      rightRemW: -1,
      bottomRemH: -1,
    };
  }

  return {
    fits: true,
    needsVerticalCut,
    needsHorizontalCut,
    rightRemW,
    bottomRemH,
  };
}

/**
 * Replaces a single `targetLeafId` inside `node` with the guillotine subdivision
 * placing `part` at the top-left of that residual leaf.
 */
function replaceResidualLeafWithPlacement(params: {
  node: CutNode;
  targetLeafId: string;
  part: PartInstance;
  rotated: boolean;
  placedW: number;
  placedH: number;
  firstAxis: 'vertical_first' | 'horizontal_first';
  material: MaterialSpec;
  idSeed: string;
}): CutNode {
  const {
    node,
    targetLeafId,
    part,
    rotated,
    placedW,
    placedH,
    firstAxis,
    material,
    idSeed,
  } = params;

  if (node.kind === 'part') {
    return node;
  }

  if (node.kind === 'residual') {
    if (node.id !== targetLeafId) {
      return node;
    }

    const k = material.kerfMm;
    const fit = canFitWithKerf(placedW, placedH, node.widthMm, node.heightMm, k);
    if (!fit.fits) {
      throw new Error(`Internal invariant error: placement does not fit leaf ${node.id}`);
    }

    const partLeaf: PartLeafNode = {
      kind: 'part',
      id: `${idSeed}:part`,
      xMm: node.xMm,
      yMm: node.yMm,
      widthMm: placedW,
      heightMm: placedH,
      partInstanceId: part.partInstanceId,
      partId: part.partId,
      label: part.label,
      rotated,
      originalWidthMm: part.widthMm,
      originalHeightMm: part.heightMm,
    };

    const makeResidual = (
      suffix: string,
      xMm: number,
      yMm: number,
      w: number,
      h: number
    ): ResidualLeafNode | null => {
      if (w <= 0 || h <= 0) return null;
      return {
        kind: 'residual',
        id: `${idSeed}:${suffix}`,
        xMm,
        yMm,
        widthMm: w,
        heightMm: h,
        reusable: isResidualReusable(w, h, material),
        areaMm2: w * h,
      };
    };

    if (!fit.needsVerticalCut && !fit.needsHorizontalCut) {
      return partLeaf;
    }

    if (fit.needsVerticalCut && !fit.needsHorizontalCut) {
      return {
        kind: 'split',
        id: `${idSeed}:sv`,
        stepOrder: 1,
        xMm: node.xMm,
        yMm: node.yMm,
        widthMm: node.widthMm,
        heightMm: node.heightMm,
        orientation: 'vertical',
        cutOffsetMm: placedW,
        kerfMm: k,
        kerfRect: {
          xMm: node.xMm + placedW,
          yMm: node.yMm,
          widthMm: k,
          heightMm: node.heightMm,
        },
        first: partLeaf,
        second: makeResidual(
          'rv',
          node.xMm + placedW + k,
          node.yMm,
          fit.rightRemW,
          node.heightMm
        ),
      };
    }

    if (!fit.needsVerticalCut && fit.needsHorizontalCut) {
      return {
        kind: 'split',
        id: `${idSeed}:sh`,
        stepOrder: 1,
        xMm: node.xMm,
        yMm: node.yMm,
        widthMm: node.widthMm,
        heightMm: node.heightMm,
        orientation: 'horizontal',
        cutOffsetMm: placedH,
        kerfMm: k,
        kerfRect: {
          xMm: node.xMm,
          yMm: node.yMm + placedH,
          widthMm: node.widthMm,
          heightMm: k,
        },
        first: partLeaf,
        second: makeResidual(
          'rh',
          node.xMm,
          node.yMm + placedH + k,
          node.widthMm,
          fit.bottomRemH
        ),
      };
    }

    // Both vertical and horizontal cuts needed
    if (firstAxis === 'vertical_first') {
      const innerHorizontal: CutNode = {
        kind: 'split',
        id: `${idSeed}:sh_in`,
        stepOrder: 2,
        xMm: node.xMm,
        yMm: node.yMm,
        widthMm: placedW,
        heightMm: node.heightMm,
        orientation: 'horizontal',
        cutOffsetMm: placedH,
        kerfMm: k,
        kerfRect: {
          xMm: node.xMm,
          yMm: node.yMm + placedH,
          widthMm: placedW,
          heightMm: k,
        },
        first: partLeaf,
        second: makeResidual(
          'r_btm',
          node.xMm,
          node.yMm + placedH + k,
          placedW,
          fit.bottomRemH
        ),
      };

      return {
        kind: 'split',
        id: `${idSeed}:sv_out`,
        stepOrder: 1,
        xMm: node.xMm,
        yMm: node.yMm,
        widthMm: node.widthMm,
        heightMm: node.heightMm,
        orientation: 'vertical',
        cutOffsetMm: placedW,
        kerfMm: k,
        kerfRect: {
          xMm: node.xMm + placedW,
          yMm: node.yMm,
          widthMm: k,
          heightMm: node.heightMm,
        },
        first: innerHorizontal,
        second: makeResidual(
          'r_rgt',
          node.xMm + placedW + k,
          node.yMm,
          fit.rightRemW,
          node.heightMm
        ),
      };
    }

    // horizontal_first
    const innerVertical: CutNode = {
      kind: 'split',
      id: `${idSeed}:sv_in`,
      stepOrder: 2,
      xMm: node.xMm,
      yMm: node.yMm,
      widthMm: node.widthMm,
      heightMm: placedH,
      orientation: 'vertical',
      cutOffsetMm: placedW,
      kerfMm: k,
      kerfRect: {
        xMm: node.xMm + placedW,
        yMm: node.yMm,
        widthMm: k,
        heightMm: placedH,
      },
      first: partLeaf,
      second: makeResidual(
        'r_rgt',
        node.xMm + placedW + k,
        node.yMm,
        fit.rightRemW,
        placedH
      ),
    };

    return {
      kind: 'split',
      id: `${idSeed}:sh_out`,
      stepOrder: 1,
      xMm: node.xMm,
      yMm: node.yMm,
      widthMm: node.widthMm,
      heightMm: node.heightMm,
      orientation: 'horizontal',
      cutOffsetMm: placedH,
      kerfMm: k,
      kerfRect: {
        xMm: node.xMm,
        yMm: node.yMm + placedH,
        widthMm: node.widthMm,
        heightMm: k,
      },
      first: innerVertical,
      second: makeResidual(
        'r_btm',
        node.xMm,
        node.yMm + placedH + k,
        node.widthMm,
        fit.bottomRemH
      ),
    };
  }

  return {
    ...node,
    first: replaceResidualLeafWithPlacement({
      ...params,
      node: node.first,
    }),
    second: node.second
      ? replaceResidualLeafWithPlacement({
          ...params,
          node: node.second,
        })
      : null,
  };
}

function getAllowedOrientations(
  part: PartInstance,
  material: MaterialSpec
): Array<{ rotated: boolean; widthMm: number; heightMm: number }> {
  const orientations: Array<{ rotated: boolean; widthMm: number; heightMm: number }> = [];

  const unrotatedOk = isOrientationCompatibleWithGrain({
    partRequiredGrain: part.requiredGrainAxis,
    allowRotation: part.allowRotation,
    materialGrain: material.grainAxis,
    rotated: false,
  }).ok;

  if (unrotatedOk) {
    orientations.push({
      rotated: false,
      widthMm: part.widthMm,
      heightMm: part.heightMm,
    });
  }

  const rotatedOk = isOrientationCompatibleWithGrain({
    partRequiredGrain: part.requiredGrainAxis,
    allowRotation: part.allowRotation,
    materialGrain: material.grainAxis,
    rotated: true,
  }).ok;

  if (rotatedOk && (part.widthMm !== part.heightMm || !unrotatedOk)) {
    orientations.push({
      rotated: true,
      widthMm: part.heightMm,
      heightMm: part.widthMm,
    });
  }

  return orientations;
}

/**
 * Validates upfront whether every requested part has a valid material, compatible grain,
 * and fits on at least one available stock item or standard sheet.
 */
export function diagnoseProblemFeasibility(
  problem: OptimizationProblemInput,
  options?: { baselineNewSheetsOnly?: boolean }
): InfeasibilityDiagnostic[] {
  const diagnostics: InfeasibilityDiagnostic[] = [];
  const materialById = new Map<string, MaterialSpec>();
  const currencies = new Set<string>();

  for (const m of problem.materials) {
    materialById.set(m.id, m);
    currencies.add(m.currencyCode);
  }

  if (currencies.size > 1) {
    diagnostics.push({
      code: 'currency_mismatch',
      message: `Multiple currencies (${[...currencies].join(', ')}) cannot be combined in a single cost-ranked job.`,
    });
    return diagnostics;
  }

  const availableByMaterial = new Map<string, PhysicalStockUnit[]>();
  if (!options?.baselineNewSheetsOnly) {
    for (const s of problem.stockItems) {
      if (s.state === 'available') {
        const list = availableByMaterial.get(s.materialId) ?? [];
        list.push(s);
        availableByMaterial.set(s.materialId, list);
      }
    }
  }

  for (const part of problem.job.parts) {
    const material = materialById.get(part.materialId);
    if (!material) {
      diagnostics.push({
        code: 'missing_material',
        partId: part.id,
        partLabel: part.label,
        materialId: part.materialId,
        message: `Part "${part.label}" references unknown material "${part.materialId}".`,
      });
      continue;
    }

    const probeInstance: PartInstance = {
      partInstanceId: `${part.id}#1`,
      partId: part.id,
      instanceIndex: 1,
      label: part.label,
      materialId: part.materialId,
      widthMm: part.widthMm,
      heightMm: part.heightMm,
      allowRotation: part.allowRotation,
      requiredGrainAxis: part.requiredGrainAxis,
    };

    const allowedOrientations = getAllowedOrientations(probeInstance, material);
    if (allowedOrientations.length === 0) {
      diagnostics.push({
        code: 'grain_mismatch',
        partId: part.id,
        partLabel: part.label,
        materialId: part.materialId,
        message: `Part "${part.label}" requires grain "${part.requiredGrainAxis}" (allowRotation=${String(part.allowRotation)}), which is incompatible with "${material.name}" (grain "${material.grainAxis}").`,
      });
      continue;
    }

    const candidateEnvelopes: Array<{ w: number; h: number }> = [
      { w: material.standardWidthMm, h: material.standardHeightMm },
    ];
    for (const stock of availableByMaterial.get(material.id) ?? []) {
      candidateEnvelopes.push({ w: stock.widthMm, h: stock.heightMm });
    }

    const fitsAnyEnvelope = allowedOrientations.some((o) =>
      candidateEnvelopes.some(
        (env) =>
          canFitWithKerf(o.widthMm, o.heightMm, env.w, env.h, material.kerfMm).fits
      )
    );

    if (!fitsAnyEnvelope) {
      diagnostics.push({
        code: 'part_exceeds_stock',
        partId: part.id,
        partLabel: part.label,
        materialId: part.materialId,
        message: `Part "${part.label}" (${part.widthMm}×${part.heightMm} mm) cannot fit an available sheet or new standard sheet (${material.standardWidthMm}×${material.standardHeightMm} mm, kerf ${material.kerfMm} mm) with its current rotation and grain constraints.`,
      });
    }
  }

  return diagnostics;
}

function chooseSplitAxis(params: {
  rule: SplitRule;
  placedW: number;
  placedH: number;
  leaf: ResidualLeafNode;
  rightRemW: number;
  bottomRemH: number;
  material: MaterialSpec;
}): 'vertical_first' | 'horizontal_first' {
  const { rule, placedW, placedH, leaf, rightRemW, bottomRemH, material } = params;
  if (rule === 'SLAS') {
    // Shorter Leftover Axis Split: preserves the larger contiguous residual and minimizes kerf
    return rightRemW >= bottomRemH ? 'vertical_first' : 'horizontal_first';
  }
  if (rule === 'LLAS') {
    return rightRemW < bottomRemH ? 'vertical_first' : 'horizontal_first';
  }

  // MIN_WASTE: explicitly maximize reusable residual area, then largest residual rectangle
  const vR1Reusable = isResidualReusable(rightRemW, leaf.heightMm, material)
    ? rightRemW * leaf.heightMm
    : 0;
  const vR2Reusable = isResidualReusable(placedW, bottomRemH, material)
    ? placedW * bottomRemH
    : 0;
  const hR1Reusable = isResidualReusable(leaf.widthMm, bottomRemH, material)
    ? leaf.widthMm * bottomRemH
    : 0;
  const hR2Reusable = isResidualReusable(rightRemW, placedH, material)
    ? rightRemW * placedH
    : 0;

  const vReusable = vR1Reusable + vR2Reusable;
  const hReusable = hR1Reusable + hR2Reusable;
  if (vReusable !== hReusable) {
    return vReusable > hReusable ? 'vertical_first' : 'horizontal_first';
  }
  return rightRemW * leaf.heightMm >= leaf.widthMm * bottomRemH
    ? 'vertical_first'
    : 'horizontal_first';
}

function maxResultingResidualArea(
  placedW: number,
  placedH: number,
  rectW: number,
  rectH: number,
  rightRemW: number,
  bottomRemH: number
): number {
  const vMax = Math.max(
    rightRemW > 0 ? rightRemW * rectH : 0,
    bottomRemH > 0 ? placedW * bottomRemH : 0
  );
  const hMax = Math.max(
    bottomRemH > 0 ? rectW * bottomRemH : 0,
    rightRemW > 0 ? rightRemW * placedH : 0
  );
  return Math.max(vMax, hMax);
}

function scoreLeafFit(
  fitRule: FitRule,
  placedW: number,
  placedH: number,
  leaf: ResidualLeafNode,
  rightRemW: number,
  bottomRemH: number,
  sheetIdx: number
): [number, number, number] {
  const leftoverArea = leaf.widthMm * leaf.heightMm - placedW * placedH;
  const negMaxResidual = -maxResultingResidualArea(
    placedW,
    placedH,
    leaf.widthMm,
    leaf.heightMm,
    rightRemW,
    bottomRemH
  );
  const shortSide = Math.min(leaf.widthMm - placedW, leaf.heightMm - placedH);
  const longSide = Math.max(leaf.widthMm - placedW, leaf.heightMm - placedH);

  switch (fitRule) {
    case 'FIRST_FIT':
      return [sheetIdx, leftoverArea, negMaxResidual];
    case 'BSSF':
      return [shortSide, negMaxResidual, leftoverArea];
    case 'BLSF':
      return [longSide, negMaxResidual, shortSide];
    case 'BAF':
    default:
      return [leftoverArea, negMaxResidual, shortSide];
  }
}

function compareTuples(a: readonly number[], b: readonly number[]): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    if (a[i]! !== b[i]!) {
      return a[i]! - b[i]!;
    }
  }
  return a.length - b.length;
}

/**
 * Runs a single constructive guillotine pass for one material's part instances.
 */
function runSingleMaterialPass(params: {
  material: MaterialSpec;
  orderedParts: PartInstance[];
  availableStock: PhysicalStockUnit[];
  fitRule: FitRule;
  splitRule: SplitRule;
  stockPriority: StockPriorityMode;
  preferRotatedBias?: boolean;
  partRotationHint?: ReadonlyMap<string, boolean>;
  customStockOrder?: PhysicalStockUnit[];
}): WorkingSheet[] | null {
  const {
    material,
    orderedParts,
    availableStock,
    fitRule,
    splitRule,
    stockPriority,
    preferRotatedBias = false,
    partRotationHint,
    customStockOrder,
  } = params;

  const openSheets: WorkingSheet[] = [];
  const unusedStock =
    stockPriority === 'new_sheets_only'
      ? []
      : customStockOrder
        ? [...customStockOrder]
        : [...availableStock].sort((a, b) => {
            if (
              stockPriority !== 'existing_largest_first' &&
              a.origin !== b.origin
            ) {
              return a.origin === 'remnant' ? -1 : 1;
            }
            const areaA = a.widthMm * a.heightMm;
            const areaB = b.widthMm * b.heightMm;
            if (areaA !== areaB) {
              return stockPriority === 'remnant_tightest_first'
                ? areaA - areaB
                : areaB - areaA;
            }
            return a.id.localeCompare(b.id);
          });

  let placementCounter = 0;
  let newSheetCounter = 0;

  for (const part of orderedParts) {
    placementCounter += 1;
    let orientations = getAllowedOrientations(part, material);
    if (orientations.length === 0) {
      return null;
    }
    const hintedRot = partRotationHint?.get(part.partInstanceId);
    if (hintedRot !== undefined && orientations.length > 1) {
      orientations = [...orientations].sort(
        (a, b) => (a.rotated === hintedRot ? -1 : 1) - (b.rotated === hintedRot ? -1 : 1)
      );
    } else if (preferRotatedBias && orientations.length > 1) {
      orientations = [...orientations].reverse();
    }

    let bestOpenCandidate: CandidatePlacement | null = null;

    // 1. Try placing into an already-opened sheet first
    for (let sIdx = 0; sIdx < openSheets.length; sIdx += 1) {
      const wSheet = openSheets[sIdx]!;
      const leaves = collectResidualLeaves(wSheet.root);

      for (const leaf of leaves) {
        for (let oIdx = 0; oIdx < orientations.length; oIdx += 1) {
          const orient = orientations[oIdx]!;
          const fit = canFitWithKerf(
            orient.widthMm,
            orient.heightMm,
            leaf.widthMm,
            leaf.heightMm,
            material.kerfMm
          );
          if (!fit.fits) continue;

          const firstAxis = chooseSplitAxis({
            rule: splitRule,
            placedW: orient.widthMm,
            placedH: orient.heightMm,
            leaf,
            rightRemW: fit.rightRemW,
            bottomRemH: fit.bottomRemH,
            material,
          });

          const sourceRank =
            fitRule === 'FIRST_FIT'
              ? sIdx
              : wSheet.sourceType === 'available_remnant'
                ? 0
                : wSheet.sourceType === 'available_full_sheet'
                  ? 1
                  : 2;

          const [f0, f1, f2] = scoreLeafFit(
            fitRule,
            orient.widthMm,
            orient.heightMm,
            leaf,
            fit.rightRemW,
            fit.bottomRemH,
            sIdx
          );
          const hintPenalty =
            hintedRot !== undefined ? (orient.rotated === hintedRot ? 0 : 1) : 0;
          const tuple: [number, number, number, number] =
            fitRule === 'FIRST_FIT'
              ? [sIdx, f1, f2, oIdx]
              : [hintPenalty, f0, f1, sourceRank * 1000 + f2];

          if (
            !bestOpenCandidate ||
            compareTuples(tuple, bestOpenCandidate.scoreTuple) < 0
          ) {
            bestOpenCandidate = {
              sheetIdx: sIdx,
              isNewVirtualSheet: false,
              leaf,
              rotated: orient.rotated,
              placedW: orient.widthMm,
              placedH: orient.heightMm,
              firstAxis,
              scoreTuple: tuple,
            };
          }
        }
      }
    }

    if (bestOpenCandidate) {
      const targetSheet = openSheets[bestOpenCandidate.sheetIdx]!;
      targetSheet.root = replaceResidualLeafWithPlacement({
        node: targetSheet.root,
        targetLeafId: bestOpenCandidate.leaf.id,
        part,
        rotated: bestOpenCandidate.rotated,
        placedW: bestOpenCandidate.placedW,
        placedH: bestOpenCandidate.placedH,
        firstAxis: bestOpenCandidate.firstAxis,
        material,
        idSeed: `${targetSheet.tempId}:p${placementCounter}`,
      });
      targetSheet.placedParts.push(part);
      continue;
    }

    // 2. Otherwise open an unused available physical stock unit, picking the best valid orientation on the first matching stock unit
    let chosenStockIndex = -1;
    let chosenStockOrient: { rotated: boolean; widthMm: number; heightMm: number } | null =
      null;
    let bestStockOrientScore: [number, number] | null = null;

    for (let uIdx = 0; uIdx < unusedStock.length; uIdx += 1) {
      const stock = unusedStock[uIdx]!;
      for (const orient of orientations) {
        const fit = canFitWithKerf(
          orient.widthMm,
          orient.heightMm,
          stock.widthMm,
          stock.heightMm,
          material.kerfMm
        );
        if (!fit.fits) continue;

        const hintPenalty =
          hintedRot !== undefined ? (orient.rotated === hintedRot ? 0 : 1) : 0;
        const negMaxRes = -maxResultingResidualArea(
          orient.widthMm,
          orient.heightMm,
          stock.widthMm,
          stock.heightMm,
          fit.rightRemW,
          fit.bottomRemH
        );
        const score: [number, number] = [hintPenalty, negMaxRes];
        if (!bestStockOrientScore || compareTuples(score, bestStockOrientScore) < 0) {
          chosenStockIndex = uIdx;
          chosenStockOrient = orient;
          bestStockOrientScore = score;
        }
      }
      if (chosenStockIndex >= 0) break;
    }

    if (chosenStockIndex >= 0 && chosenStockOrient) {
      const [stock] = unusedStock.splice(chosenStockIndex, 1);
      if (!stock) return null;
      const tempId = `stock-${stock.id}`;
      const initialLeaf = makeInitialResidualTree(
        tempId,
        stock.widthMm,
        stock.heightMm,
        material
      );
      const fit = canFitWithKerf(
        chosenStockOrient.widthMm,
        chosenStockOrient.heightMm,
        stock.widthMm,
        stock.heightMm,
        material.kerfMm
      );
      const firstAxis = chooseSplitAxis({
        rule: splitRule,
        placedW: chosenStockOrient.widthMm,
        placedH: chosenStockOrient.heightMm,
        leaf: initialLeaf,
        rightRemW: fit.rightRemW,
        bottomRemH: fit.bottomRemH,
        material,
      });

      const root = replaceResidualLeafWithPlacement({
        node: initialLeaf,
        targetLeafId: initialLeaf.id,
        part,
        rotated: chosenStockOrient.rotated,
        placedW: chosenStockOrient.widthMm,
        placedH: chosenStockOrient.heightMm,
        firstAxis,
        material,
        idSeed: `${tempId}:p${placementCounter}`,
      });

      openSheets.push({
        tempId,
        material,
        sourceStockId: stock.id,
        sourceLabel: stock.label,
        sourceType:
          stock.origin === 'remnant' ? 'available_remnant' : 'available_full_sheet',
        widthMm: stock.widthMm,
        heightMm: stock.heightMm,
        estimatedNewSheetCostMinor: 0,
        root,
        placedParts: [part],
      });
      continue;
    }

    // 3. Otherwise open a virtual newly purchased standard sheet
    let newSheetOrient: { rotated: boolean; widthMm: number; heightMm: number } | null =
      null;
    for (const orient of orientations) {
      const fit = canFitWithKerf(
        orient.widthMm,
        orient.heightMm,
        material.standardWidthMm,
        material.standardHeightMm,
        material.kerfMm
      );
      if (fit.fits) {
        newSheetOrient = orient;
        break;
      }
    }

    if (!newSheetOrient) {
      return null;
    }

    newSheetCounter += 1;
    const tempId = `new-${material.id}-${newSheetCounter}`;
    const initialLeaf = makeInitialResidualTree(
      tempId,
      material.standardWidthMm,
      material.standardHeightMm,
      material
    );
    const fit = canFitWithKerf(
      newSheetOrient.widthMm,
      newSheetOrient.heightMm,
      material.standardWidthMm,
      material.standardHeightMm,
      material.kerfMm
    );
    const firstAxis = chooseSplitAxis({
      rule: splitRule,
      placedW: newSheetOrient.widthMm,
      placedH: newSheetOrient.heightMm,
      leaf: initialLeaf,
      rightRemW: fit.rightRemW,
      bottomRemH: fit.bottomRemH,
      material,
    });

    const root = replaceResidualLeafWithPlacement({
      node: initialLeaf,
      targetLeafId: initialLeaf.id,
      part,
      rotated: newSheetOrient.rotated,
      placedW: newSheetOrient.widthMm,
      placedH: newSheetOrient.heightMm,
      firstAxis,
      material,
      idSeed: `${tempId}:p${placementCounter}`,
    });

    openSheets.push({
      tempId,
      material,
      sourceStockId: undefined,
      sourceLabel: `New ${material.name} #${newSheetCounter}`,
      sourceType: 'new_purchase',
      widthMm: material.standardWidthMm,
      heightMm: material.standardHeightMm,
      estimatedNewSheetCostMinor: material.pricePerSheetMinor,
      root,
      placedParts: [part],
    });
  }

  return openSheets;
}

/**
 * Consolidation pass: if an opened existing remnant's parts can all fit into the OTHER
 * already-opened sheets (e.g., when a new sheet had to be purchased anyway and has ample
 * leftover space), repack without opening that extra offcut so we don't needlessly fragment
 * workshop stock!
 */
function tryConsolidateExistingStock(
  sheets: WorkingSheet[],
  material: MaterialSpec,
  fitRule: FitRule,
  splitRule: SplitRule
): WorkingSheet[] {
  if (sheets.length <= 1) return sheets;

  const existingIndices = sheets
    .map((s, idx) => ({ s, idx }))
    .filter(({ s }) => s.sourceType !== 'new_purchase')
    .sort((a, b) => a.s.placedParts.length - b.s.placedParts.length);

  let current = sheets;

  for (const candidate of existingIndices) {
    const targetStockId = candidate.s.sourceStockId;
    if (!targetStockId) continue;

    const remainingStock: PhysicalStockUnit[] = [];
    let newSheetCap = 0;
    const allParts: PartInstance[] = [];

    for (const ws of current) {
      allParts.push(...ws.placedParts);
      if (ws.sourceType === 'new_purchase') {
        newSheetCap += 1;
      } else if (ws.sourceStockId && ws.sourceStockId !== targetStockId) {
        remainingStock.push({
          id: ws.sourceStockId,
          materialId: material.id,
          label: ws.sourceLabel,
          origin: ws.sourceType === 'available_remnant' ? 'remnant' : 'full_sheet',
          state: 'available',
          widthMm: ws.widthMm,
          heightMm: ws.heightMm,
        });
      }
    }

    // Only keep consolidation if it uses <= newSheetCap new sheets!
    const sortedParts = [...allParts].sort(
      (a, b) =>
        b.widthMm * b.heightMm - a.widthMm * a.heightMm ||
        Math.max(b.widthMm, b.heightMm) - Math.max(a.widthMm, a.heightMm) ||
        a.partInstanceId.localeCompare(b.partInstanceId)
    );

    const repacked = runSingleMaterialPass({
      material,
      orderedParts: sortedParts,
      availableStock: remainingStock,
      fitRule,
      splitRule,
      stockPriority: 'remnant_largest_first',
    });

    if (repacked) {
      const repackedNewSheets = repacked.filter(
        (s) => s.sourceType === 'new_purchase'
      ).length;
      if (repackedNewSheets <= newSheetCap) {
        current = repacked;
      }
    }
  }

  return current;
}

export function materializeWorkingSheets(workingSheets: WorkingSheet[]): SheetPlan[] {
  return workingSheets.map((ws, idx) => {
    const sheetIndex = idx + 1;
    const summary = summarizeCutTree(ws.root, ws.widthMm, ws.heightMm, ws.material);
    return {
      sheetIndex,
      sheetKey: ws.sourceStockId ? `stock:${ws.sourceStockId}` : `sheet:${sheetIndex}:${ws.tempId}`,
      materialId: ws.material.id,
      materialName: ws.material.name,
      sourceStockId: ws.sourceStockId,
      sourceLabel: ws.sourceLabel,
      sourceType: ws.sourceType,
      widthMm: ws.widthMm,
      heightMm: ws.heightMm,
      kerfMm: ws.material.kerfMm,
      estimatedNewSheetCostMinor: ws.estimatedNewSheetCostMinor,
      placements: summary.placements,
      cutTree: summary.cutTree,
      cuts: summary.cuts,
      residuals: summary.residuals,
      sheetMetrics: summary.sheetMetrics,
    };
  });
}

export function sortPartsFFD(parts: readonly PartInstance[]): PartInstance[] {
  return [...parts].sort((a, b) => {
    const areaDiff = b.widthMm * b.heightMm - a.widthMm * a.heightMm;
    if (areaDiff !== 0) return areaDiff;
    const maxSideDiff =
      Math.max(b.widthMm, b.heightMm) - Math.max(a.widthMm, a.heightMm);
    if (maxSideDiff !== 0) return maxSideDiff;
    return a.partInstanceId.localeCompare(b.partInstanceId);
  });
}

/**
 * Deterministic remnant-first cost-prioritized 2D guillotine optimizer.
 * Evaluates multiple deterministic part orderings, split heuristics, and seeded
 * multi-start permutations within `timeBudgetMs`, verifies every candidate via
 * `verifyPlan`, and returns the lexicographically best feasible plan.
 */
export function runRecutGuillotineOptimizer(
  problem: OptimizationProblemInput
): PlanResult {
  const startMs = performance.now();
  const seed = problem.seed ?? 42;
  const timeBudgetMs = problem.timeBudgetMs ?? 1500;

  const diagnostics = diagnoseProblemFeasibility(problem, {
    baselineNewSheetsOnly: false,
  });
  if (diagnostics.length > 0) {
    return {
      algorithmVersion: RECUT_OPTIMIZER_VERSION,
      strategyLabel: 'Remnant-first lexicographic guillotine heuristic',
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

  const availableByMaterial = new Map<string, PhysicalStockUnit[]>();
  for (const s of problem.stockItems) {
    if (s.state === 'available') {
      const list = availableByMaterial.get(s.materialId) ?? [];
      list.push(s);
      availableByMaterial.set(s.materialId, list);
    }
  }

  const materialIds = [...instancesByMaterial.keys()].sort((a, b) =>
    a.localeCompare(b)
  );
  const rng = createSeededRng(seed);

  // Build deterministic ordering generators
  const deterministicOrderings: Array<(parts: PartInstance[]) => PartInstance[]> = [
    (parts) => sortPartsFFD(parts),
    (parts) =>
      [...parts].sort(
        (a, b) =>
          Math.max(b.widthMm, b.heightMm) - Math.max(a.widthMm, a.heightMm) ||
          b.widthMm * b.heightMm - a.widthMm * a.heightMm ||
          a.partInstanceId.localeCompare(b.partInstanceId)
      ),
    (parts) =>
      [...parts].sort(
        (a, b) =>
          2 * (b.widthMm + b.heightMm) - 2 * (a.widthMm + a.heightMm) ||
          b.widthMm * b.heightMm - a.widthMm * a.heightMm ||
          a.partInstanceId.localeCompare(b.partInstanceId)
      ),
    (parts) =>
      [...parts].sort(
        (a, b) =>
          Math.min(b.widthMm, b.heightMm) - Math.min(a.widthMm, a.heightMm) ||
          b.widthMm * b.heightMm - a.widthMm * a.heightMm ||
          a.partInstanceId.localeCompare(b.partInstanceId)
      ),
    // Smallest-first can pack tight remnants completely before larger pieces go to larger remnants
    (parts) => [...sortPartsFFD(parts)].reverse(),
  ];

  const methodConfigs: Array<{
    fitRule: FitRule;
    splitRule: SplitRule;
    stockPriority: StockPriorityMode;
    preferRotatedBias: boolean;
  }> = [
    {
      fitRule: 'BAF',
      splitRule: 'SLAS',
      stockPriority: 'remnant_largest_first',
      preferRotatedBias: false,
    },
    {
      fitRule: 'BAF',
      splitRule: 'SLAS',
      stockPriority: 'remnant_tightest_first',
      preferRotatedBias: false,
    },
    {
      fitRule: 'BSSF',
      splitRule: 'SLAS',
      stockPriority: 'remnant_largest_first',
      preferRotatedBias: false,
    },
    {
      fitRule: 'BSSF',
      splitRule: 'MIN_WASTE',
      stockPriority: 'remnant_tightest_first',
      preferRotatedBias: false,
    },
    {
      fitRule: 'BAF',
      splitRule: 'SLAS',
      stockPriority: 'remnant_largest_first',
      preferRotatedBias: true,
    },
    {
      fitRule: 'FIRST_FIT',
      splitRule: 'SLAS',
      stockPriority: 'new_sheets_only', // Always include new-sheets-only fallback so ReCut never accidentally buys MORE sheets than FFD new-sheet-only unless physically forced!
      preferRotatedBias: false,
    },
  ];

  // Solve per material independently (materials cannot substitute for one another)
  const chosenSheetsAllMaterials: WorkingSheet[] = [];
  let timedOut = false;

  const perMaterialBudgetMs = Math.max(
    50,
    Math.floor(timeBudgetMs / Math.max(1, materialIds.length))
  );

  for (const matId of materialIds) {
    const matStartMs = performance.now();
    const material = materialById.get(matId)!;
    const matParts = instancesByMaterial.get(matId) ?? [];
    const matStock = availableByMaterial.get(matId) ?? [];

    const subProblem: OptimizationProblemInput = {
      materials: [material],
      stockItems: matStock,
      job: {
        id: `${problem.job.id}:${matId}`,
        title: problem.job.title,
        parts: problem.job.parts.filter((p) => p.materialId === matId),
      },
      seed,
    };

    const best: {
      subPlan: PlanResult | null;
      workingSheets: WorkingSheet[] | null;
    } = {
      subPlan: null,
      workingSheets: null,
    };

    const evaluateCandidate = (rawWorking: WorkingSheet[] | null) => {
      if (!rawWorking) return;
      const variants = [
        rawWorking,
        tryConsolidateExistingStock(rawWorking, material, 'BAF', 'SLAS'),
      ];
      for (const wsList of variants) {
        const sheets = materializeWorkingSheets(wsList);
        const candidatePlan: PlanResult = {
          algorithmVersion: RECUT_OPTIMIZER_VERSION,
          strategyLabel: 'Remnant-first lexicographic guillotine heuristic',
          seed,
          status: 'feasible',
          diagnostics: [],
          sheets,
          metrics: computePlanMetrics(sheets),
          warnings: [],
          durationMs: 0,
        };
        const verification = verifyPlan(subProblem, candidatePlan);
        if (!verification.valid) {
          continue;
        }
        if (
          !best.subPlan ||
          comparePlanQuality(candidatePlan, best.subPlan) < 0
        ) {
          best.subPlan = candidatePlan;
          best.workingSheets = wsList;
        }
      }
    };

    // Phase A: deterministic structured orderings × method configs
    outerDeterministic: for (const orderFn of deterministicOrderings) {
      const ordered = orderFn(matParts);
      for (const cfg of methodConfigs) {
        if (
          best.subPlan &&
          performance.now() - matStartMs >= perMaterialBudgetMs
        ) {
          timedOut = true;
          break outerDeterministic;
        }
        const raw = runSingleMaterialPass({
          material,
          orderedParts: ordered,
          availableStock: matStock,
          fitRule: cfg.fitRule,
          splitRule: cfg.splitRule,
          stockPriority: cfg.stockPriority,
          preferRotatedBias: cfg.preferRotatedBias,
        });
        evaluateCandidate(raw);
      }
    }

    // Phase B: bounded seeded multi-start permutations (up to 40 seeds within time budget)
    const maxSeededTrials = 40;
    for (let trial = 0; trial < maxSeededTrials; trial += 1) {
      if (performance.now() - matStartMs >= perMaterialBudgetMs) {
        if (!best.subPlan) timedOut = true;
        break;
      }
      const permutedParts = deterministicShuffle(matParts, rng);
      const customStock =
        trial % 3 === 0 ? deterministicShuffle(matStock, rng) : undefined;
      const rotationHint =
        trial % 2 === 1
          ? new Map(permutedParts.map((p) => [p.partInstanceId, rng() >= 0.5]))
          : undefined;
      const cfg = methodConfigs[trial % (methodConfigs.length - 1)]!;
      const raw = runSingleMaterialPass({
        material,
        orderedParts: permutedParts,
        availableStock: matStock,
        fitRule: cfg.fitRule,
        splitRule: trial % 4 === 3 ? 'MIN_WASTE' : cfg.splitRule,
        stockPriority:
          trial % 2 === 0 ? 'remnant_largest_first' : 'remnant_tightest_first',
        preferRotatedBias: trial % 4 === 2,
        partRotationHint: rotationHint,
        customStockOrder: customStock,
      });
      evaluateCandidate(raw);
    }

    if (!best.workingSheets) {
      return {
        algorithmVersion: RECUT_OPTIMIZER_VERSION,
        strategyLabel: 'Remnant-first lexicographic guillotine heuristic',
        seed,
        status: timedOut ? 'timeout' : 'infeasible',
        explanation: timedOut
          ? 'Optimization time budget expired before a verified feasible guillotine layout was found.'
          : `Could not construct a verified feasible guillotine layout for material "${material.name}".`,
        diagnostics: [
          {
            code: timedOut ? 'search_exhausted' : 'verification_failed',
            materialId: material.id,
            message: `No verified guillotine cut plan found for material "${material.name}".`,
          },
        ],
        sheets: [],
        metrics: createEmptyMetrics(),
        warnings: [],
        durationMs: Math.round(performance.now() - startMs),
      };
    }

    chosenSheetsAllMaterials.push(...best.workingSheets);
  }

  const finalSheets = materializeWorkingSheets(chosenSheetsAllMaterials);
  const warnings: string[] = [];

  if (timedOut) {
    warnings.push(
      'Time budget reached during multi-start exploration; returning the best verified heuristic plan found so far.'
    );
  }
  const hasPendingStock = problem.stockItems.some(
    (s) => s.state === 'pending_confirmation'
  );
  if (hasPendingStock) {
    warnings.push(
      'Pending-confirmation remnants were excluded from planning until physically measured and confirmed.'
    );
  }

  const finalPlan: PlanResult = {
    algorithmVersion: RECUT_OPTIMIZER_VERSION,
    strategyLabel: 'Remnant-first lexicographic guillotine heuristic',
    seed,
    status: 'feasible',
    explanation:
      'Verified heuristic guillotine plan prioritizing existing remnants and minimizing new sheet purchases.',
    diagnostics: [],
    sheets: finalSheets,
    metrics: computePlanMetrics(finalSheets),
    warnings,
    durationMs: Math.round(performance.now() - startMs),
  };

  // Final full-problem independent verification gate
  const fullCheck = verifyPlan(problem, finalPlan);
  if (!fullCheck.valid) {
    return {
      algorithmVersion: RECUT_OPTIMIZER_VERSION,
      strategyLabel: 'Remnant-first lexicographic guillotine heuristic',
      seed,
      status: 'infeasible',
      explanation: `Independent cut-tree verifier rejected candidate plan: ${fullCheck.errors
        .map((e) => e.message)
        .join('; ')}`,
      diagnostics: fullCheck.errors.map((e) => ({
        code: 'verification_failed',
        message: e.message,
      })),
      sheets: [],
      metrics: createEmptyMetrics(),
      warnings,
      durationMs: Math.round(performance.now() - startMs),
    };
  }

  return finalPlan;
}

/**
 * Helper exported for baseline planner to run single deterministic FFD pass on virtual new sheets only.
 */
export function runNewSheetsOnlyFFDPass(
  material: MaterialSpec,
  parts: PartInstance[]
): WorkingSheet[] | null {
  const sorted = sortPartsFFD(parts);
  return runSingleMaterialPass({
    material,
    orderedParts: sorted,
    availableStock: [],
    fitRule: 'FIRST_FIT',
    splitRule: 'SLAS',
    stockPriority: 'new_sheets_only',
  });
}
