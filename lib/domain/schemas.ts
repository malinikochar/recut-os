import { z } from 'zod';
import {
  MAX_DIMENSION_MM,
  MAX_EXPANDED_PARTS_PER_JOB,
  MAX_KERF_MM,
  MAX_PART_ROW_QUANTITY,
  MAX_SHEET_PRICE_MINOR,
  MAX_STOCK_ITEMS_PER_RUN,
  MAX_THICKNESS_MM,
  type CutNode,
  type GrainAxis,
  type JobPartSpec,
  type MaterialSpec,
  type PartInstance,
} from './types';

const positiveSafeInt = (max: number, fieldLabel: string) =>
  z
    .number({ message: `${fieldLabel} must be a number.` })
    .int(`${fieldLabel} must be a whole integer (no decimals).`)
    .min(1, `${fieldLabel} must be greater than 0.`)
    .max(max, `${fieldLabel} cannot exceed ${max.toLocaleString('en-US')}.`);

const nonNegativeSafeInt = (max: number, fieldLabel: string) =>
  z
    .number({ message: `${fieldLabel} must be a number.` })
    .int(`${fieldLabel} must be a whole integer (no decimals).`)
    .min(0, `${fieldLabel} cannot be negative.`)
    .max(max, `${fieldLabel} cannot exceed ${max.toLocaleString('en-US')}.`);

export const grainAxisSchema = z.enum(['none', 'x', 'y']);
export const stockOriginSchema = z.enum(['full_sheet', 'remnant']);
export const stockStateSchema = z.enum([
  'available',
  'pending_confirmation',
  'consumed',
]);
export const stockSourceTypeSchema = z.enum([
  'available_remnant',
  'available_full_sheet',
  'new_purchase',
]);
export const cutOrientationSchema = z.enum(['vertical', 'horizontal']);
export const planSolveStatusSchema = z.enum([
  'feasible',
  'infeasible',
  'timeout',
]);

const materialBaseObjectSchema = z.object({
  id: z.string().trim().min(1, 'Material ID is required.').max(120),
  name: z.string().trim().min(1, 'Material name is required.').max(120),
  category: z
    .string()
    .trim()
    .min(1, 'Category is required.')
    .max(60)
    .default('Wood'),
  thicknessMm: positiveSafeInt(MAX_THICKNESS_MM, 'Thickness (mm)'),
  standardWidthMm: positiveSafeInt(MAX_DIMENSION_MM, 'Standard width (mm)'),
  standardHeightMm: positiveSafeInt(MAX_DIMENSION_MM, 'Standard height (mm)'),
  pricePerSheetMinor: nonNegativeSafeInt(
    MAX_SHEET_PRICE_MINOR,
    'Price per sheet (minor units)'
  ),
  currencyCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Currency code must be a 3-letter ISO code (e.g. INR).')
    .default('INR'),
  kerfMm: nonNegativeSafeInt(MAX_KERF_MM, 'Saw kerf (mm)'),
  grainAxis: grainAxisSchema,
  minReusableWidthMm: positiveSafeInt(
    MAX_DIMENSION_MM,
    'Minimum reusable width (mm)'
  ),
  minReusableHeightMm: positiveSafeInt(
    MAX_DIMENSION_MM,
    'Minimum reusable height (mm)'
  ),
});

function validateMaterialThresholds(
  mat: {
    minReusableWidthMm: number;
    minReusableHeightMm: number;
    standardWidthMm: number;
    standardHeightMm: number;
    grainAxis: GrainAxis;
  },
  ctx: z.RefinementCtx
) {
  const fitsStandard =
    (mat.minReusableWidthMm <= mat.standardWidthMm &&
      mat.minReusableHeightMm <= mat.standardHeightMm) ||
    (mat.grainAxis === 'none' &&
      mat.minReusableWidthMm <= mat.standardHeightMm &&
      mat.minReusableHeightMm <= mat.standardWidthMm);
  if (!fitsStandard) {
    ctx.addIssue({
      code: 'custom',
      path: ['minReusableWidthMm'],
      message:
        'Minimum reusable remnant dimensions cannot exceed the standard sheet dimensions.',
    });
  }
}

export const materialSpecSchema = materialBaseObjectSchema.superRefine(
  validateMaterialThresholds
);

export const materialFormInputSchema = materialBaseObjectSchema
  .omit({ id: true })
  .superRefine(validateMaterialThresholds);

export const physicalStockUnitSchema = z.object({
  id: z.string().trim().min(1, 'Stock ID is required.').max(120),
  materialId: z.string().trim().min(1, 'Material is required.').max(120),
  label: z.string().trim().min(1, 'Stock label is required.').max(120),
  origin: stockOriginSchema,
  state: stockStateSchema,
  widthMm: positiveSafeInt(MAX_DIMENSION_MM, 'Stock width (mm)'),
  heightMm: positiveSafeInt(MAX_DIMENSION_MM, 'Stock height (mm)'),
  createdFromPlanId: z.string().nullable().optional(),
  createdFromPlanSheetId: z.string().nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const stockItemFormInputSchema = physicalStockUnitSchema.omit({
  id: true,
  state: true,
  createdFromPlanId: true,
  createdFromPlanSheetId: true,
});

export const jobPartSpecSchema = z.object({
  id: z.string().trim().min(1, 'Part ID is required.').max(120),
  label: z.string().trim().min(1, 'Part label is required.').max(120),
  materialId: z.string().trim().min(1, 'Part material is required.').max(120),
  widthMm: positiveSafeInt(MAX_DIMENSION_MM, 'Part width (mm)'),
  heightMm: positiveSafeInt(MAX_DIMENSION_MM, 'Part height (mm)'),
  quantity: positiveSafeInt(MAX_PART_ROW_QUANTITY, 'Part quantity'),
  allowRotation: z.boolean(),
  requiredGrainAxis: grainAxisSchema,
  notes: z.string().trim().max(500).nullable().optional(),
});

export const cuttingJobInputSchema = z
  .object({
    id: z.string().trim().min(1, 'Job ID is required.').max(120),
    title: z.string().trim().min(1, 'Job title is required.').max(160),
    parts: z
      .array(jobPartSpecSchema)
      .min(1, 'At least one part row is required.')
      .max(MAX_EXPANDED_PARTS_PER_JOB, 'Too many part rows in a single job.'),
  })
  .superRefine((job, ctx) => {
    const seenIds = new Set<string>();
    let totalInstances = 0;
    job.parts.forEach((p, idx) => {
      if (seenIds.has(p.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['parts', idx, 'id'],
          message: `Duplicate part ID "${p.id}".`,
        });
      }
      seenIds.add(p.id);
      totalInstances += p.quantity;
    });

    if (totalInstances > MAX_EXPANDED_PARTS_PER_JOB) {
      ctx.addIssue({
        code: 'custom',
        path: ['parts'],
        message: `Expanded part quantity (${totalInstances}) exceeds MVP limit of ${MAX_EXPANDED_PARTS_PER_JOB} pieces per job.`,
      });
    }
  });

export const optimizationProblemInputSchema = z
  .object({
    materials: z.array(materialSpecSchema).min(1, 'At least one material is required.'),
    stockItems: z
      .array(physicalStockUnitSchema)
      .max(MAX_STOCK_ITEMS_PER_RUN, 'Too many stock items in a single optimization run.'),
    job: cuttingJobInputSchema,
    seed: z.number().int().min(0).max(2_147_483_647).default(42),
    timeBudgetMs: z.number().int().min(50).max(10_000).default(1500),
  })
  .superRefine((problem, ctx) => {
    const materialById = new Map<string, MaterialSpec>();
    for (const [idx, m] of problem.materials.entries()) {
      if (materialById.has(m.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['materials', idx, 'id'],
          message: `Duplicate material ID "${m.id}".`,
        });
      }
      materialById.set(m.id, m);
    }

    const seenStockIds = new Set<string>();
    for (const [idx, s] of problem.stockItems.entries()) {
      if (seenStockIds.has(s.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['stockItems', idx, 'id'],
          message: `Duplicate stock item ID "${s.id}".`,
        });
      }
      seenStockIds.add(s.id);

      const mat = materialById.get(s.materialId);
      if (!mat) {
        ctx.addIssue({
          code: 'custom',
          path: ['stockItems', idx, 'materialId'],
          message: `Stock item "${s.id}" references unknown material "${s.materialId}".`,
        });
      } else if (!doesStockFitMaterialEnvelope(s.widthMm, s.heightMm, mat)) {
        ctx.addIssue({
          code: 'custom',
          path: ['stockItems', idx, 'widthMm'],
          message: `Stock item "${s.label}" (${s.widthMm}×${s.heightMm} mm) exceeds standard sheet dimensions (${mat.standardWidthMm}×${mat.standardHeightMm} mm) for material "${mat.name}".`,
        });
      }
    }
  });

export const rectMmSchema = z.object({
  xMm: z.number().int().min(0).max(MAX_DIMENSION_MM),
  yMm: z.number().int().min(0).max(MAX_DIMENSION_MM),
  widthMm: z.number().int().min(0).max(MAX_DIMENSION_MM),
  heightMm: z.number().int().min(0).max(MAX_DIMENSION_MM),
});

export const cutNodeSchema: z.ZodType<CutNode> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('part'),
      id: z.string().min(1),
      xMm: z.number().int().min(0),
      yMm: z.number().int().min(0),
      widthMm: positiveSafeInt(MAX_DIMENSION_MM, 'Part leaf width'),
      heightMm: positiveSafeInt(MAX_DIMENSION_MM, 'Part leaf height'),
      partInstanceId: z.string().min(1),
      partId: z.string().min(1),
      label: z.string().min(1),
      rotated: z.boolean(),
      originalWidthMm: positiveSafeInt(MAX_DIMENSION_MM, 'Original part width'),
      originalHeightMm: positiveSafeInt(MAX_DIMENSION_MM, 'Original part height'),
    }),
    z.object({
      kind: z.literal('residual'),
      id: z.string().min(1),
      xMm: z.number().int().min(0),
      yMm: z.number().int().min(0),
      widthMm: positiveSafeInt(MAX_DIMENSION_MM, 'Residual width'),
      heightMm: positiveSafeInt(MAX_DIMENSION_MM, 'Residual height'),
      reusable: z.boolean(),
      areaMm2: z.number().int().min(1),
    }),
    z.object({
      kind: z.literal('split'),
      id: z.string().min(1),
      stepOrder: z.number().int().min(1),
      xMm: z.number().int().min(0),
      yMm: z.number().int().min(0),
      widthMm: positiveSafeInt(MAX_DIMENSION_MM, 'Split width'),
      heightMm: positiveSafeInt(MAX_DIMENSION_MM, 'Split height'),
      orientation: cutOrientationSchema,
      cutOffsetMm: positiveSafeInt(MAX_DIMENSION_MM, 'Cut offset'),
      kerfMm: nonNegativeSafeInt(MAX_KERF_MM, 'Split kerf'),
      kerfRect: rectMmSchema,
      first: cutNodeSchema,
      second: cutNodeSchema.nullable(),
    }),
  ])
);

export const fixtureFileSchema = z.object({
  fixtureId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/)
    .default('INR'),
  materials: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        name: z.string().trim().min(1),
        category: z.string().trim().min(1).default('Wood'),
        thicknessMm: positiveSafeInt(MAX_THICKNESS_MM, 'Thickness'),
        standardWidthMm: positiveSafeInt(MAX_DIMENSION_MM, 'Standard width'),
        standardHeightMm: positiveSafeInt(MAX_DIMENSION_MM, 'Standard height'),
        pricePerSheetMinor: nonNegativeSafeInt(MAX_SHEET_PRICE_MINOR, 'Price'),
        currencyCode: z
          .string()
          .trim()
          .toUpperCase()
          .regex(/^[A-Z]{3}$/)
          .optional(),
        kerfMm: nonNegativeSafeInt(MAX_KERF_MM, 'Kerf'),
        grainAxis: grainAxisSchema,
        minReusableWidthMm: positiveSafeInt(MAX_DIMENSION_MM, 'Min reusable width'),
        minReusableHeightMm: positiveSafeInt(
          MAX_DIMENSION_MM,
          'Min reusable height'
        ),
      })
    )
    .min(1),
  stockItems: z.array(
    z.object({
      id: z.string().trim().min(1),
      materialId: z.string().trim().min(1),
      label: z.string().trim().min(1).optional(),
      origin: stockOriginSchema,
      state: stockStateSchema,
      widthMm: positiveSafeInt(MAX_DIMENSION_MM, 'Stock width'),
      heightMm: positiveSafeInt(MAX_DIMENSION_MM, 'Stock height'),
      notes: z.string().nullable().optional(),
    })
  ),
  job: cuttingJobInputSchema,
  benchmarkPolicy: z
    .object({
      baseline: z.string(),
      optimized: z.string(),
      seed: z.number().int().min(0).default(42),
      note: z.string().optional(),
    })
    .optional(),
});

/**
 * Checks whether a physical stock rectangle fits inside the material's standard sheet envelope.
 * If grain is present (`x` or `y`), width and height axes must match without swapping.
 */
export function doesStockFitMaterialEnvelope(
  widthMm: number,
  heightMm: number,
  material: Pick<MaterialSpec, 'standardWidthMm' | 'standardHeightMm' | 'grainAxis'>
): boolean {
  if (widthMm <= material.standardWidthMm && heightMm <= material.standardHeightMm) {
    return true;
  }
  if (
    material.grainAxis === 'none' &&
    widthMm <= material.standardHeightMm &&
    heightMm <= material.standardWidthMm
  ) {
    return true;
  }
  return false;
}

/**
 * Conservative orientation & grain compatibility check (ADR-002).
 */
export function isOrientationCompatibleWithGrain(params: {
  partRequiredGrain: GrainAxis;
  allowRotation: boolean;
  materialGrain: GrainAxis;
  rotated: boolean;
}): { ok: boolean; reason?: 'rotation_forbidden' | 'grain_mismatch' } {
  const { partRequiredGrain, allowRotation, materialGrain, rotated } = params;

  if (rotated && !allowRotation) {
    return { ok: false, reason: 'rotation_forbidden' };
  }

  if (partRequiredGrain === 'none') {
    return { ok: true };
  }

  if (materialGrain === 'none') {
    return { ok: false, reason: 'grain_mismatch' };
  }

  if (!rotated) {
    return partRequiredGrain === materialGrain
      ? { ok: true }
      : { ok: false, reason: 'grain_mismatch' };
  }

  // Rotated 90 degrees: part's original X aligns with sheet Y, and part's original Y aligns with sheet X
  const rotatedMatches =
    (partRequiredGrain === 'x' && materialGrain === 'y') ||
    (partRequiredGrain === 'y' && materialGrain === 'x');
  return rotatedMatches
    ? { ok: true }
    : { ok: false, reason: 'grain_mismatch' };
}

/**
 * Determines whether a residual rectangle qualifies as a reusable remnant (ADR-003).
 */
export function isResidualReusable(
  widthMm: number,
  heightMm: number,
  material: Pick<
    MaterialSpec,
    'minReusableWidthMm' | 'minReusableHeightMm' | 'grainAxis'
  >
): boolean {
  if (
    widthMm >= material.minReusableWidthMm &&
    heightMm >= material.minReusableHeightMm
  ) {
    return true;
  }
  if (
    material.grainAxis === 'none' &&
    heightMm >= material.minReusableWidthMm &&
    widthMm >= material.minReusableHeightMm
  ) {
    return true;
  }
  return false;
}

/**
 * Deterministically expands JobPartSpec quantities into stable PartInstance objects.
 */
export function expandJobParts(parts: JobPartSpec[]): PartInstance[] {
  const expanded: PartInstance[] = [];
  for (const part of parts) {
    for (let i = 1; i <= part.quantity; i += 1) {
      expanded.push({
        partInstanceId: `${part.id}#${i}`,
        partId: part.id,
        instanceIndex: i,
        label: part.quantity > 1 ? `${part.label} (${i}/${part.quantity})` : part.label,
        materialId: part.materialId,
        widthMm: part.widthMm,
        heightMm: part.heightMm,
        allowRotation: part.allowRotation,
        requiredGrainAxis: part.requiredGrainAxis,
      });
    }
  }
  return expanded;
}
