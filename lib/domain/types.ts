/**
 * Canonical domain types for ReCut OS.
 *
 * Invariants:
 * - All linear geometry values (`widthMm`, `heightMm`, `thicknessMm`, `kerfMm`, `xMm`, `yMm`)
 *   are safe integers in millimeters.
 * - All area values (`*AreaMm2`) are exact safe integers in square millimeters (`mm²`).
 * - All monetary values (`*Minor`) are safe integers in minor currency units (e.g. paise/cents).
 * - Every feasible `SheetPlan` carries an executable `CutNode` binary guillotine tree whose
 *   leaves and kerf strips partition `(0, 0, widthMm, heightMm)` without overlap or gap.
 */

export const MAX_DIMENSION_MM = 100_000;
export const MAX_THICKNESS_MM = 500;
export const MAX_KERF_MM = 50;
export const MAX_PART_ROW_QUANTITY = 50;
export const MAX_EXPANDED_PARTS_PER_JOB = 100;
export const MAX_STOCK_ITEMS_PER_RUN = 200;
export const MAX_SHEET_PRICE_MINOR = 100_000_000;

export type GrainAxis = 'none' | 'x' | 'y';
export type StockOrigin = 'full_sheet' | 'remnant';
export type StockState = 'available' | 'pending_confirmation' | 'consumed';
export type StockSourceType =
  | 'available_remnant'
  | 'available_full_sheet'
  | 'new_purchase';
export type JobStatus = 'draft' | 'planned' | 'committed';
export type PlanStatus = 'draft' | 'committed';
export type CutOrientation = 'vertical' | 'horizontal';
export type PlanSolveStatus = 'feasible' | 'infeasible' | 'timeout';

export type InfeasibilityReasonCode =
  | 'invalid_input'
  | 'currency_mismatch'
  | 'missing_material'
  | 'grain_mismatch'
  | 'part_exceeds_stock'
  | 'search_exhausted'
  | 'verification_failed';

export interface MaterialSpec {
  id: string;
  name: string;
  category: string;
  thicknessMm: number;
  standardWidthMm: number;
  standardHeightMm: number;
  pricePerSheetMinor: number;
  currencyCode: string;
  kerfMm: number;
  grainAxis: GrainAxis;
  minReusableWidthMm: number;
  minReusableHeightMm: number;
}

export interface PhysicalStockUnit {
  id: string;
  materialId: string;
  label: string;
  origin: StockOrigin;
  state: StockState;
  widthMm: number;
  heightMm: number;
  createdFromPlanId?: string | null;
  createdFromPlanSheetId?: string | null;
  notes?: string | null;
}

export interface JobPartSpec {
  id: string;
  label: string;
  materialId: string;
  widthMm: number;
  heightMm: number;
  quantity: number;
  allowRotation: boolean;
  requiredGrainAxis: GrainAxis;
  notes?: string | null;
}

export interface PartInstance {
  partInstanceId: string;
  partId: string;
  instanceIndex: number;
  label: string;
  materialId: string;
  widthMm: number;
  heightMm: number;
  allowRotation: boolean;
  requiredGrainAxis: GrainAxis;
}

export interface CuttingJobInput {
  id: string;
  title: string;
  parts: JobPartSpec[];
}

export interface OptimizationProblemInput {
  materials: MaterialSpec[];
  stockItems: PhysicalStockUnit[];
  job: CuttingJobInput;
  seed?: number;
  timeBudgetMs?: number;
}

export interface RectMm {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

export interface PartLeafNode extends RectMm {
  kind: 'part';
  id: string;
  partInstanceId: string;
  partId: string;
  label: string;
  rotated: boolean;
  originalWidthMm: number;
  originalHeightMm: number;
}

export interface ResidualLeafNode extends RectMm {
  kind: 'residual';
  id: string;
  reusable: boolean;
  areaMm2: number;
}

export interface GuillotineSplitNode extends RectMm {
  kind: 'split';
  id: string;
  stepOrder: number;
  orientation: CutOrientation;
  cutOffsetMm: number;
  kerfMm: number;
  kerfRect: RectMm;
  first: CutNode;
  second: CutNode | null;
}

export type CutNode = PartLeafNode | ResidualLeafNode | GuillotineSplitNode;

export interface PlacedPartSummary {
  partInstanceId: string;
  partId: string;
  label: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  originalWidthMm: number;
  originalHeightMm: number;
  rotated: boolean;
}

export interface ResidualRegionSummary {
  id: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  areaMm2: number;
  reusable: boolean;
}

export interface CutStepSummary {
  stepOrder: number;
  nodeId: string;
  orientation: CutOrientation;
  cutCoordinateMm: number;
  spanStartMm: number;
  spanEndMm: number;
  spanLengthMm: number;
  parentRect: RectMm;
  kerfMm: number;
  kerfAreaMm2: number;
}

export interface SheetMetrics {
  initialAreaMm2: number;
  partAreaMm2: number;
  recoverableRemnantAreaMm2: number;
  unusableScrapAreaMm2: number;
  kerfLossAreaMm2: number;
  cutCount: number;
  utilizationPct: number;
}

export interface SheetPlan {
  sheetIndex: number;
  sheetKey: string;
  materialId: string;
  materialName: string;
  sourceStockId?: string;
  sourceLabel: string;
  sourceType: StockSourceType;
  widthMm: number;
  heightMm: number;
  kerfMm: number;
  estimatedNewSheetCostMinor: number;
  placements: PlacedPartSummary[];
  cutTree: CutNode;
  cuts: CutStepSummary[];
  residuals: ResidualRegionSummary[];
  sheetMetrics: SheetMetrics;
}

export interface PlanMetrics {
  partCount: number;
  partAreaMm2: number;
  openedSheetCount: number;
  openedStockAreaMm2: number;
  newSheetCount: number;
  newSheetPurchaseCostMinor: number;
  availableRemnantUnitsUsed: number;
  availableRemnantAreaUsedMm2: number;
  availableFullSheetUnitsUsed: number;
  availableFullSheetAreaUsedMm2: number;
  recoverableRemnantCount: number;
  recoverableRemnantAreaMm2: number;
  unusableScrapAreaMm2: number;
  kerfLossAreaMm2: number;
  totalCutCount: number;
  usedMaterialUtilizationPct: number;
}

export interface InfeasibilityDiagnostic {
  code: InfeasibilityReasonCode;
  partId?: string;
  partLabel?: string;
  materialId?: string;
  message: string;
}

export interface PlanResult {
  algorithmVersion: string;
  strategyLabel: string;
  seed: number;
  status: PlanSolveStatus;
  explanation?: string;
  diagnostics: InfeasibilityDiagnostic[];
  sheets: SheetPlan[];
  metrics: PlanMetrics;
  warnings: string[];
  durationMs: number;
}

export interface ComparisonSummary {
  currencyCode: string;
  newSheetsDelta: number;
  costDeltaMinor: number;
  purchaseReductionPct: number | null;
  remnantUnitsUsed: number;
  remnantAreaUsedMm2: number;
  ownedFullSheetUnitsUsed: number;
  recoverableRemnantAreaDeltaMm2: number;
  unusableScrapDeltaMm2: number;
  kerfLossDeltaMm2: number;
  assumptions: string[];
  accountingNote: string;
}

export interface OptimizationEvaluation {
  inputHash: string;
  currencyCode: string;
  baseline: PlanResult;
  optimized: PlanResult;
  comparison: ComparisonSummary | null;
}

export interface VerificationError {
  code:
    | 'INVALID_STATUS'
    | 'SHEET_MATERIAL_MISSING'
    | 'STOCK_NOT_AVAILABLE'
    | 'STOCK_MATERIAL_MISMATCH'
    | 'STOCK_DIMENSION_MISMATCH'
    | 'DUPLICATE_SOURCE_STOCK'
    | 'NEW_SHEET_DIMENSION_MISMATCH'
    | 'NEW_SHEET_COST_MISMATCH'
    | 'INVALID_CUT_BOUNDS'
    | 'INVALID_KERF_RECT'
    | 'NEGATIVE_OR_ZERO_REGION'
    | 'OVERLAPPING_REGIONS'
    | 'PART_UNKNOWN'
    | 'PART_DUPLICATE'
    | 'PART_MISSING'
    | 'PART_MATERIAL_MISMATCH'
    | 'PART_DIMENSION_MISMATCH'
    | 'PART_ROTATION_FORBIDDEN'
    | 'PART_GRAIN_MISMATCH'
    | 'RESIDUAL_CLASSIFICATION_MISMATCH'
    | 'AREA_CONSERVATION_VIOLATION'
    | 'PLACEMENT_LIST_MISMATCH'
    | 'METRIC_MISMATCH';
  sheetIndex?: number;
  nodeId?: string;
  partInstanceId?: string;
  message: string;
}

export interface VerificationReport {
  valid: boolean;
  errors: VerificationError[];
}
