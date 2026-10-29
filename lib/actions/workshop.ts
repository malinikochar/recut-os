'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  doesStockFitMaterialEnvelope,
  grainAxisSchema,
  materialFormInputSchema,
  stockItemFormInputSchema,
} from '@/lib/domain/schemas';
import {
  MAX_DIMENSION_MM,
  MAX_EXPANDED_PARTS_PER_JOB,
  MAX_PART_ROW_QUANTITY,
  type MaterialSpec,
  type OptimizationEvaluation,
  type OptimizationProblemInput,
  type PhysicalStockUnit,
} from '@/lib/domain/types';
import { evaluateOptimization, verifyPlan } from '@/lib/optimizer';
import type { Database, Json } from '@/lib/supabase/database.types';
import { createClient, getAuthenticatedIdentity } from '@/lib/supabase/server';

export interface ActionResult<T = undefined> {
  ok: boolean;
  data?: T;
  error?: string;
  conflict?: boolean;
}

const uuidSchema = z.string().uuid('Invalid identifier.');

function mapMaterialRow(
  row: Database['public']['Tables']['materials']['Row']
): MaterialSpec {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    thicknessMm: row.thickness_mm,
    standardWidthMm: row.standard_width_mm,
    standardHeightMm: row.standard_height_mm,
    pricePerSheetMinor: Number(row.price_per_sheet_minor),
    currencyCode: row.currency_code,
    kerfMm: row.default_kerf_mm,
    grainAxis: row.grain_axis,
    minReusableWidthMm: row.min_reusable_width_mm,
    minReusableHeightMm: row.min_reusable_height_mm,
  };
}

function mapStockRow(
  row: Database['public']['Tables']['stock_items']['Row']
): PhysicalStockUnit {
  return {
    id: row.id,
    materialId: row.material_id,
    label: row.label,
    origin: row.origin,
    state: row.state,
    widthMm: row.width_mm,
    heightMm: row.height_mm,
    createdFromPlanId: row.created_from_plan_id,
    createdFromPlanSheetId: row.created_from_plan_sheet_id,
    notes: row.notes,
  };
}

export async function upsertMaterialAction(input: {
  id?: string;
  name: string;
  category: string;
  thicknessMm: number;
  standardWidthMm: number;
  standardHeightMm: number;
  pricePerSheetMinor: number;
  currencyCode: string;
  kerfMm: number;
  grainAxis: 'none' | 'x' | 'y';
  minReusableWidthMm: number;
  minReusableHeightMm: number;
}): Promise<ActionResult<{ id: string }>> {
  const identity = await getAuthenticatedIdentity();
  if (!identity) {
    return { ok: false, error: 'Please sign in to modify materials.' };
  }

  const parsed = materialFormInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid material attributes.',
    };
  }

  const supabase = await createClient();
  const payload = {
    name: parsed.data.name,
    category: parsed.data.category,
    thickness_mm: parsed.data.thicknessMm,
    standard_width_mm: parsed.data.standardWidthMm,
    standard_height_mm: parsed.data.standardHeightMm,
    price_per_sheet_minor: parsed.data.pricePerSheetMinor,
    currency_code: parsed.data.currencyCode,
    default_kerf_mm: parsed.data.kerfMm,
    grain_axis: parsed.data.grainAxis,
    min_reusable_width_mm: parsed.data.minReusableWidthMm,
    min_reusable_height_mm: parsed.data.minReusableHeightMm,
  };

  if (input.id) {
    const idCheck = uuidSchema.safeParse(input.id);
    if (!idCheck.success) {
      return { ok: false, error: 'Invalid material ID.' };
    }
    const { data, error } = await supabase
      .from('materials')
      .update(payload)
      .eq('id', idCheck.data)
      .eq('user_id', identity.userId)
      .select('id')
      .single();

    if (error || !data) {
      return {
        ok: false,
        error: error?.message ?? 'Could not update material.',
      };
    }

    revalidatePath('/app');
    revalidatePath('/app/materials');
    revalidatePath('/app/inventory');
    revalidatePath('/app/jobs/new');
    return { ok: true, data: { id: data.id } };
  }

  const { data, error } = await supabase
    .from('materials')
    .insert({
      ...payload,
      user_id: identity.userId,
    })
    .select('id')
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? 'Could not create material.',
    };
  }

  revalidatePath('/app');
  revalidatePath('/app/materials');
  revalidatePath('/app/inventory');
  revalidatePath('/app/jobs/new');
  return { ok: true, data: { id: data.id } };
}

export async function deleteMaterialAction(
  materialId: string
): Promise<ActionResult> {
  const identity = await getAuthenticatedIdentity();
  if (!identity) {
    return { ok: false, error: 'Please sign in to modify materials.' };
  }
  const idCheck = uuidSchema.safeParse(materialId);
  if (!idCheck.success) {
    return { ok: false, error: 'Invalid material ID.' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('materials')
    .delete()
    .eq('id', idCheck.data)
    .eq('user_id', identity.userId);

  if (error) {
    if (error.code === '23503') {
      return {
        ok: false,
        error:
          'Cannot delete a material while physical stock items, jobs, or saved plans reference it.',
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath('/app');
  revalidatePath('/app/materials');
  return { ok: true };
}

export async function createStockItemAction(input: {
  materialId: string;
  label: string;
  origin: 'full_sheet' | 'remnant';
  widthMm: number;
  heightMm: number;
  notes?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  const identity = await getAuthenticatedIdentity();
  if (!identity) {
    return { ok: false, error: 'Please sign in to record stock.' };
  }

  const parsed = stockItemFormInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid stock dimensions.',
    };
  }

  const matIdCheck = uuidSchema.safeParse(parsed.data.materialId);
  if (!matIdCheck.success) {
    return { ok: false, error: 'Select a valid material.' };
  }

  const supabase = await createClient();
  const { data: matRow, error: matErr } = await supabase
    .from('materials')
    .select('*')
    .eq('id', matIdCheck.data)
    .eq('user_id', identity.userId)
    .single();

  if (matErr || !matRow) {
    return { ok: false, error: 'Selected material was not found in your catalog.' };
  }

  const material = mapMaterialRow(matRow);
  if (!doesStockFitMaterialEnvelope(parsed.data.widthMm, parsed.data.heightMm, material)) {
    return {
      ok: false,
      error: `Dimensions (${parsed.data.widthMm}×${parsed.data.heightMm} mm) exceed standard sheet bounds (${material.standardWidthMm}×${material.standardHeightMm} mm) for "${material.name}".`,
    };
  }

  const { data, error } = await supabase
    .from('stock_items')
    .insert({
      user_id: identity.userId,
      material_id: material.id,
      label: parsed.data.label,
      origin: parsed.data.origin,
      width_mm: parsed.data.widthMm,
      height_mm: parsed.data.heightMm,
      state: 'available',
      notes: parsed.data.notes ?? null,
    })
    .select('id')
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? 'Could not save physical stock item.',
    };
  }

  revalidatePath('/app');
  revalidatePath('/app/inventory');
  return { ok: true, data: { id: data.id } };
}

export async function deleteStockItemAction(
  stockId: string
): Promise<ActionResult> {
  const identity = await getAuthenticatedIdentity();
  if (!identity) {
    return { ok: false, error: 'Please sign in to modify inventory.' };
  }
  const idCheck = uuidSchema.safeParse(stockId);
  if (!idCheck.success) {
    return { ok: false, error: 'Invalid stock ID.' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('stock_items')
    .delete()
    .eq('id', idCheck.data)
    .eq('user_id', identity.userId);

  if (error) {
    if (error.code === '23503') {
      return {
        ok: false,
        error:
          'This stock unit is referenced by a saved plan. Delete the draft plan first if you wish to remove the stock item.',
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath('/app');
  revalidatePath('/app/inventory');
  return { ok: true };
}

const confirmRemnantInputSchema = z.object({
  stockId: z.string().uuid(),
  widthMm: z.number().int().min(1).max(MAX_DIMENSION_MM),
  heightMm: z.number().int().min(1).max(MAX_DIMENSION_MM),
  discard: z.boolean().default(false),
});

export async function confirmRemnantAction(input: {
  stockId: string;
  widthMm: number;
  heightMm: number;
  discard?: boolean;
}): Promise<ActionResult> {
  const identity = await getAuthenticatedIdentity();
  if (!identity) {
    return { ok: false, error: 'Please sign in to confirm remnants.' };
  }

  const parsed = confirmRemnantInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ??
        'Enter positive integer millimeter measurements.',
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('confirm_remnant', {
    p_stock_id: parsed.data.stockId,
    p_width_mm: parsed.data.widthMm,
    p_height_mm: parsed.data.heightMm,
    p_discard: parsed.data.discard,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/app');
  revalidatePath('/app/inventory');
  return { ok: true };
}

const saveJobSchema = z
  .object({
    jobId: z.string().uuid().optional(),
    title: z.string().trim().min(1, 'Job title is required.').max(160),
    notes: z.string().trim().max(1000).nullable().optional(),
    parts: z
      .array(
        z.object({
          label: z.string().trim().min(1, 'Part label is required.').max(120),
          materialId: z.string().uuid('Select a valid material for every part.'),
          widthMm: z
            .number()
            .int('Part width must be an integer (mm).')
            .min(1, 'Part width must be > 0.')
            .max(MAX_DIMENSION_MM),
          heightMm: z
            .number()
            .int('Part height must be an integer (mm).')
            .min(1, 'Part height must be > 0.')
            .max(MAX_DIMENSION_MM),
          quantity: z
            .number()
            .int('Quantity must be an integer.')
            .min(1, 'Quantity must be at least 1.')
            .max(MAX_PART_ROW_QUANTITY, `Quantity per row cannot exceed ${MAX_PART_ROW_QUANTITY}.`),
          allowRotation: z.boolean(),
          requiredGrainAxis: grainAxisSchema,
          notes: z.string().trim().max(500).nullable().optional(),
        })
      )
      .min(1, 'Add at least one required part to the job.')
      .max(MAX_EXPANDED_PARTS_PER_JOB),
  })
  .superRefine((val, ctx) => {
    const total = val.parts.reduce((acc, p) => acc + p.quantity, 0);
    if (total > MAX_EXPANDED_PARTS_PER_JOB) {
      ctx.addIssue({
        code: 'custom',
        path: ['parts'],
        message: `Total expanded part quantity (${total}) exceeds the MVP limit of ${MAX_EXPANDED_PARTS_PER_JOB} pieces per job.`,
      });
    }
  });

export async function saveJobWithPartsAction(
  rawInput: z.input<typeof saveJobSchema>
): Promise<ActionResult<{ jobId: string }>> {
  const identity = await getAuthenticatedIdentity();
  if (!identity) {
    return { ok: false, error: 'Please sign in to create or edit jobs.' };
  }

  const parsed = saveJobSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid job specification.',
    };
  }

  const supabase = await createClient();

  // Verify all referenced materials belong to the user
  const distinctMatIds = [...new Set(parsed.data.parts.map((p) => p.materialId))];
  const { data: ownedMats, error: matsErr } = await supabase
    .from('materials')
    .select('id, currency_code')
    .eq('user_id', identity.userId)
    .in('id', distinctMatIds);

  if (matsErr || !ownedMats || ownedMats.length !== distinctMatIds.length) {
    return {
      ok: false,
      error: 'One or more part rows reference a material outside your catalog.',
    };
  }

  const currencies = new Set(ownedMats.map((m) => m.currency_code));
  if (currencies.size > 1) {
    return {
      ok: false,
      error:
        'All materials in a single job must share the same currency code.',
    };
  }

  let jobId = parsed.data.jobId;

  if (jobId) {
    const { data: existingJob, error: fetchErr } = await supabase
      .from('jobs')
      .select('id, status')
      .eq('id', jobId)
      .eq('user_id', identity.userId)
      .single();

    if (fetchErr || !existingJob) {
      return { ok: false, error: 'Job not found.' };
    }
    if (existingJob.status === 'committed') {
      return {
        ok: false,
        error: 'Committed jobs are locked so production history stays auditable.',
      };
    }

    const { error: updErr } = await supabase
      .from('jobs')
      .update({
        title: parsed.data.title,
        notes: parsed.data.notes ?? null,
      })
      .eq('id', jobId)
      .eq('user_id', identity.userId);
    if (updErr) {
      return { ok: false, error: updErr.message };
    }

    const { error: delPartsErr } = await supabase
      .from('job_parts')
      .delete()
      .eq('job_id', jobId)
      .eq('user_id', identity.userId);
    if (delPartsErr) {
      return { ok: false, error: delPartsErr.message };
    }
  } else {
    const { data: createdJob, error: createErr } = await supabase
      .from('jobs')
      .insert({
        user_id: identity.userId,
        title: parsed.data.title,
        status: 'draft',
        notes: parsed.data.notes ?? null,
      })
      .select('id')
      .single();

    if (createErr || !createdJob) {
      return {
        ok: false,
        error: createErr?.message ?? 'Could not create cutting job.',
      };
    }
    jobId = createdJob.id;
  }

  const partInserts = parsed.data.parts.map((p) => ({
    user_id: identity.userId,
    job_id: jobId!,
    material_id: p.materialId,
    label: p.label,
    width_mm: p.widthMm,
    height_mm: p.heightMm,
    quantity: p.quantity,
    allow_rotation: p.allowRotation,
    required_grain_axis: p.requiredGrainAxis,
    notes: p.notes ?? null,
  }));

  const { error: partsErr } = await supabase.from('job_parts').insert(partInserts);
  if (partsErr) {
    return { ok: false, error: partsErr.message };
  }

  revalidatePath('/app');
  revalidatePath('/app/jobs');
  revalidatePath(`/app/jobs/${jobId}`);
  return { ok: true, data: { jobId } };
}

export async function deleteJobAction(jobId: string): Promise<ActionResult> {
  const identity = await getAuthenticatedIdentity();
  if (!identity) {
    return { ok: false, error: 'Please sign in to delete jobs.' };
  }
  const idCheck = uuidSchema.safeParse(jobId);
  if (!idCheck.success) {
    return { ok: false, error: 'Invalid job ID.' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', idCheck.data)
    .eq('user_id', identity.userId);

  if (error) {
    return {
      ok: false,
      error:
        error.code === '23503'
          ? 'Committed jobs with inventory lineage cannot be deleted.'
          : error.message,
    };
  }

  revalidatePath('/app');
  revalidatePath('/app/jobs');
  return { ok: true };
}

export async function deleteDraftPlanAction(
  planId: string
): Promise<ActionResult<{ jobId: string }>> {
  const identity = await getAuthenticatedIdentity();
  if (!identity) {
    return { ok: false, error: 'Please sign in to delete draft plans.' };
  }
  const idCheck = uuidSchema.safeParse(planId);
  if (!idCheck.success) {
    return { ok: false, error: 'Invalid plan ID.' };
  }

  const supabase = await createClient();
  const { data: planRow, error: fetchErr } = await supabase
    .from('plans')
    .select('id, job_id, status')
    .eq('id', idCheck.data)
    .eq('user_id', identity.userId)
    .single();

  if (fetchErr || !planRow) {
    return { ok: false, error: 'Plan not found.' };
  }
  if (planRow.status === 'committed') {
    return {
      ok: false,
      error: 'Committed plans are immutable audit records and cannot be deleted.',
    };
  }

  const { error: delErr } = await supabase
    .from('plans')
    .delete()
    .eq('id', planRow.id)
    .eq('user_id', identity.userId);

  if (delErr) {
    return { ok: false, error: delErr.message };
  }

  revalidatePath('/app');
  revalidatePath(`/app/jobs/${planRow.job_id}`);
  return { ok: true, data: { jobId: planRow.job_id } };
}

/**
 * Loads canonical job, materials, and available stock from Supabase for the authenticated
 * owner, executes both baseline and ReCut OS guillotine planners, verifies the result, and
 * persists an immutable draft plan snapshot if feasible.
 */
export async function generateAndSavePlanAction(input: {
  jobId: string;
  seed?: number;
}): Promise<
  ActionResult<{
    planId?: string;
    evaluation: OptimizationEvaluation;
  }>
> {
  const identity = await getAuthenticatedIdentity();
  if (!identity) {
    return { ok: false, error: 'Please sign in to generate and save plans.' };
  }

  const idCheck = uuidSchema.safeParse(input.jobId);
  if (!idCheck.success) {
    return { ok: false, error: 'Invalid job ID.' };
  }

  const seed = Number.isInteger(input.seed) ? Number(input.seed) : 42;
  const supabase = await createClient();

  const { data: jobRow, error: jobErr } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', idCheck.data)
    .eq('user_id', identity.userId)
    .single();

  if (jobErr || !jobRow) {
    return { ok: false, error: 'Cutting job not found.' };
  }
  if (jobRow.status === 'committed') {
    return {
      ok: false,
      error: 'This job already has a committed production plan.',
    };
  }

  const { data: partRows, error: partsErr } = await supabase
    .from('job_parts')
    .select('*')
    .eq('job_id', jobRow.id)
    .eq('user_id', identity.userId)
    .order('created_at', { ascending: true });

  if (partsErr || !partRows || partRows.length === 0) {
    return { ok: false, error: 'This job has no part rows to optimize.' };
  }

  const materialIds = [...new Set(partRows.map((p) => p.material_id))];
  const { data: materialRows, error: matErr } = await supabase
    .from('materials')
    .select('*')
    .eq('user_id', identity.userId)
    .in('id', materialIds);

  if (matErr || !materialRows || materialRows.length !== materialIds.length) {
    return {
      ok: false,
      error: 'Could not load material specifications for this job.',
    };
  }

  const { data: stockRows, error: stockErr } = await supabase
    .from('stock_items')
    .select('*')
    .eq('user_id', identity.userId)
    .in('material_id', materialIds)
    .in('state', ['available', 'pending_confirmation'])
    .order('created_at', { ascending: true });

  if (stockErr) {
    return { ok: false, error: stockErr.message };
  }

  const problem: OptimizationProblemInput = {
    materials: materialRows.map(mapMaterialRow),
    stockItems: (stockRows ?? []).map(mapStockRow),
    job: {
      id: jobRow.id,
      title: jobRow.title,
      parts: partRows.map((p) => ({
        id: p.id,
        label: p.label,
        materialId: p.material_id,
        widthMm: p.width_mm,
        heightMm: p.height_mm,
        quantity: p.quantity,
        allowRotation: p.allow_rotation,
        requiredGrainAxis: p.required_grain_axis,
        notes: p.notes,
      })),
    },
    seed,
    timeBudgetMs: 1500,
  };

  const evaluation = evaluateOptimization(problem);
  if (evaluation.optimized.status !== 'feasible') {
    return {
      ok: false,
      error:
        evaluation.optimized.explanation ??
        'Cutting job is infeasible under current stock and material constraints.',
      data: { evaluation },
    };
  }

  // Server-side independent verification gate prior to persistence
  const verification = verifyPlan(problem, evaluation.optimized);
  if (!verification.valid) {
    return {
      ok: false,
      error: `Verifier rejected layout: ${verification.errors
        .map((e) => e.message)
        .join('; ')}`,
      data: { evaluation },
    };
  }

  const constraintsSnapshot = {
    materials: problem.materials.map((m) => ({
      id: m.id,
      name: m.name,
      kerfMm: m.kerfMm,
      grainAxis: m.grainAxis,
      minReusableWidthMm: m.minReusableWidthMm,
      minReusableHeightMm: m.minReusableHeightMm,
      standardWidthMm: m.standardWidthMm,
      standardHeightMm: m.standardHeightMm,
      pricePerSheetMinor: m.pricePerSheetMinor,
    })),
    inputHash: evaluation.inputHash,
  };

  const { data: planRow, error: planInsertErr } = await supabase
    .from('plans')
    .insert({
      user_id: identity.userId,
      job_id: jobRow.id,
      status: 'draft',
      algorithm_version: evaluation.optimized.algorithmVersion,
      algorithm_seed: evaluation.optimized.seed,
      currency_code: evaluation.currencyCode,
      input_snapshot: problem as unknown as Json,
      baseline_result: evaluation.baseline as unknown as Json,
      optimized_summary: {
        status: evaluation.optimized.status,
        strategyLabel: evaluation.optimized.strategyLabel,
        explanation: evaluation.optimized.explanation,
        metrics: evaluation.optimized.metrics,
        warnings: evaluation.optimized.warnings,
        durationMs: evaluation.optimized.durationMs,
      } as unknown as Json,
      comparison_summary: (evaluation.comparison ?? null) as unknown as Json,
      constraints_snapshot: constraintsSnapshot as unknown as Json,
    })
    .select('id')
    .single();

  if (planInsertErr || !planRow) {
    return {
      ok: false,
      error: planInsertErr?.message ?? 'Failed to save draft plan.',
    };
  }

  const sheetInserts = evaluation.optimized.sheets.map((sheet) => ({
    user_id: identity.userId,
    plan_id: planRow.id,
    sheet_index: sheet.sheetIndex,
    material_id: sheet.materialId,
    source_stock_id: sheet.sourceStockId ?? null,
    source_label: sheet.sourceLabel,
    source_type: sheet.sourceType,
    width_mm: sheet.widthMm,
    height_mm: sheet.heightMm,
    kerf_mm: sheet.kerfMm,
    placements: sheet.placements as unknown as Json,
    cut_tree: sheet.cutTree as unknown as Json,
    cuts: sheet.cuts as unknown as Json,
    unallocated_regions: sheet.residuals as unknown as Json,
    sheet_metrics: sheet.sheetMetrics as unknown as Json,
    estimated_new_sheet_cost_minor: sheet.estimatedNewSheetCostMinor,
  }));

  const { error: sheetsInsertErr } = await supabase
    .from('plan_sheets')
    .insert(sheetInserts);

  if (sheetsInsertErr) {
    await supabase
      .from('plans')
      .delete()
      .eq('id', planRow.id)
      .eq('user_id', identity.userId);
    return {
      ok: false,
      error: sheetsInsertErr.message,
    };
  }

  if (jobRow.status === 'draft') {
    await supabase
      .from('jobs')
      .update({ status: 'planned' })
      .eq('id', jobRow.id)
      .eq('user_id', identity.userId);
  }

  revalidatePath('/app');
  revalidatePath('/app/jobs');
  revalidatePath(`/app/jobs/${jobRow.id}`);
  revalidatePath(`/app/plans/${planRow.id}`);

  return {
    ok: true,
    data: {
      planId: planRow.id,
      evaluation,
    },
  };
}

export async function commitSavedPlanAction(planId: string): Promise<
  ActionResult<{
    planId: string;
    consumedStockCount: number;
    pendingRemnantsCreated: number;
  }>
> {
  const identity = await getAuthenticatedIdentity();
  if (!identity) {
    return { ok: false, error: 'Please sign in to commit a cutting plan.' };
  }

  const idCheck = uuidSchema.safeParse(planId);
  if (!idCheck.success) {
    return { ok: false, error: 'Invalid plan ID.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('commit_plan', {
    p_plan_id: idCheck.data,
  });

  if (error) {
    const isConflict =
      error.message.includes('STOCK_CONFLICT') ||
      error.message.includes('ALREADY_COMMITTED') ||
      error.code === '40001' ||
      error.code === '23505';

    return {
      ok: false,
      conflict: isConflict,
      error: isConflict
        ? 'Inventory conflict: one or more physical stock items allocated to this plan were already consumed or modified. Open the job and generate a fresh plan against current stock.'
        : error.message,
    };
  }

  const resultObj = (data ?? {}) as {
    planId?: string;
    jobId?: string;
    consumedStockCount?: number;
    pendingRemnantsCreated?: number;
  };

  revalidatePath('/app');
  revalidatePath('/app/inventory');
  revalidatePath('/app/jobs');
  if (resultObj.jobId) {
    revalidatePath(`/app/jobs/${resultObj.jobId}`);
  }
  revalidatePath(`/app/plans/${idCheck.data}`);

  return {
    ok: true,
    data: {
      planId: idCheck.data,
      consumedStockCount: Number(resultObj.consumedStockCount ?? 0),
      pendingRemnantsCreated: Number(resultObj.pendingRemnantsCreated ?? 0),
    },
  };
}

/**
 * First-run onboarding action: seeds an empty authenticated workshop with a realistic
 * Birch Plywood 18mm material, 3 physical remnants, and a draft cabinet batch job so
 * an operator or judge can test persistence and atomic commit immediately.
 */
export async function seedStarterWorkshopAction(): Promise<
  ActionResult<{ jobId: string }>
> {
  const identity = await getAuthenticatedIdentity();
  if (!identity) {
    return { ok: false, error: 'Please sign in first.' };
  }

  const supabase = await createClient();

  const { data: mat, error: matErr } = await supabase
    .from('materials')
    .insert({
      user_id: identity.userId,
      name: 'Birch plywood 18 mm',
      category: 'Plywood',
      thickness_mm: 18,
      standard_width_mm: 2440,
      standard_height_mm: 1220,
      price_per_sheet_minor: 180000,
      currency_code: 'INR',
      default_kerf_mm: 3,
      grain_axis: 'none',
      min_reusable_width_mm: 150,
      min_reusable_height_mm: 150,
    })
    .select('id')
    .single();

  if (matErr || !mat) {
    return {
      ok: false,
      error: matErr?.message ?? 'Could not create starter material.',
    };
  }

  const { error: stockErr } = await supabase.from('stock_items').insert([
    {
      user_id: identity.userId,
      material_id: mat.id,
      label: 'Offcut REM-A (Rack 1)',
      origin: 'remnant',
      state: 'available',
      width_mm: 1220,
      height_mm: 800,
      notes: 'Clean offcut from prior wardrobe order',
    },
    {
      user_id: identity.userId,
      material_id: mat.id,
      label: 'Offcut REM-B (Rack 1)',
      origin: 'remnant',
      state: 'available',
      width_mm: 1000,
      height_mm: 600,
      notes: 'Square-edged birch offcut',
    },
    {
      user_id: identity.userId,
      material_id: mat.id,
      label: 'Offcut REM-C (Rack 2)',
      origin: 'remnant',
      state: 'available',
      width_mm: 700,
      height_mm: 420,
      notes: 'Bench shelf remnant',
    },
  ]);

  if (stockErr) {
    return { ok: false, error: stockErr.message };
  }

  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .insert({
      user_id: identity.userId,
      title: 'Small cabinet batch',
      status: 'draft',
      notes: 'Starter batch seeded during workshop onboarding',
    })
    .select('id')
    .single();

  if (jobErr || !job) {
    return { ok: false, error: jobErr?.message ?? 'Could not create starter job.' };
  }

  const { error: partsErr } = await supabase.from('job_parts').insert([
    {
      user_id: identity.userId,
      job_id: job.id,
      material_id: mat.id,
      label: 'Side panel',
      width_mm: 700,
      height_mm: 350,
      quantity: 2,
      allow_rotation: true,
      required_grain_axis: 'none',
    },
    {
      user_id: identity.userId,
      job_id: job.id,
      material_id: mat.id,
      label: 'Shelf',
      width_mm: 550,
      height_mm: 300,
      quantity: 3,
      allow_rotation: true,
      required_grain_axis: 'none',
    },
    {
      user_id: identity.userId,
      job_id: job.id,
      material_id: mat.id,
      label: 'Back brace',
      width_mm: 850,
      height_mm: 160,
      quantity: 2,
      allow_rotation: true,
      required_grain_axis: 'none',
    },
    {
      user_id: identity.userId,
      job_id: job.id,
      material_id: mat.id,
      label: 'Small divider',
      width_mm: 300,
      height_mm: 250,
      quantity: 3,
      allow_rotation: true,
      required_grain_axis: 'none',
    },
  ]);

  if (partsErr) {
    return { ok: false, error: partsErr.message };
  }

  revalidatePath('/app');
  revalidatePath('/app/materials');
  revalidatePath('/app/inventory');
  revalidatePath('/app/jobs');
  return { ok: true, data: { jobId: job.id } };
}
