import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import type { Database } from '@/lib/supabase/database.types';

function loadEnvConfig(): { url: string; key: string } | null {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    const envPath = path.join(process.cwd(), '.env.local');
    if (existsSync(envPath)) {
      const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq > 0) {
          const k = trimmed.slice(0, eq).trim();
          const v = trimmed.slice(eq + 1).trim();
          if (k === 'NEXT_PUBLIC_SUPABASE_URL') url = v;
          if (k === 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') key = v;
        }
      }
    }
  }

  if (
    !url ||
    !key ||
    url.includes('YOUR_PROJECT') ||
    key.includes('YOUR_SUPABASE_PUBLISHABLE_KEY')
  ) {
    return null;
  }
  return { url, key };
}

const envConfig = loadEnvConfig();
const describeIfConfigured = envConfig ? describe : describe.skip;

function makeIsolatedClient(url: string, key: string, accessToken?: string) {
  return createClient<Database>(url, key, {
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

describeIfConfigured(
  'Supabase RLS, cross-tenant FK isolation, and atomic commit conflict suite',
  () => {
    it(
      'enforces anonymous denial, two-user RLS isolation, composite FK checks, and single-spend commit_plan',
      { timeout: 60000 },
      async () => {
        const { url, key } = envConfig!;
        const anonClient = makeIsolatedClient(url, key);

        const runSuffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        const emailA = `recut-a-${runSuffix}@gmail.com`;
        const emailB = `recut-b-${runSuffix}@gmail.com`;
        const password = `ReCutTest!${runSuffix}`;

        // 1. Anonymous user must fail SELECT and INSERT on private tables
        const anonMatSelect = await anonClient.from('materials').select('*');
        expect(anonMatSelect.error).not.toBeNull();

        const anonRpc = await anonClient.rpc('commit_plan', {
          p_plan_id: '00000000-0000-0000-0000-000000000000',
        });
        expect(anonRpc.error).not.toBeNull();

        // 2. Sign up two distinct authenticated workshop owners
        const signUpA = await makeIsolatedClient(url, key).auth.signUp({
          email: emailA,
          password,
        });
        expect(signUpA.error).toBeNull();
        const userAId = signUpA.data.user!.id;
        const clientA = makeIsolatedClient(
          url,
          key,
          signUpA.data.session!.access_token
        );

        const signUpB = await makeIsolatedClient(url, key).auth.signUp({
          email: emailB,
          password,
        });
        expect(signUpB.error).toBeNull();
        const userBId = signUpB.data.user!.id;
        const clientB = makeIsolatedClient(
          url,
          key,
          signUpB.data.session!.access_token
        );
        expect(userAId).not.toBe(userBId);

      // 3. User A creates a material and a physical remnant
      const { data: matA, error: matAErr } = await clientA
        .from('materials')
        .insert({
          user_id: userAId,
          name: 'Test Birch 18mm',
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
        .select('*')
        .single();
      expect(matAErr).toBeNull();
      expect(matA).not.toBeNull();

      // Stock exceeding standard sheet dimensions must fail DB trigger
      const oversizedAttempt = await clientA.from('stock_items').insert({
        user_id: userAId,
        material_id: matA!.id,
        label: 'Oversized remnant',
        origin: 'remnant',
        width_mm: 3000,
        height_mm: 1500,
        state: 'available',
      });
      expect(oversizedAttempt.error).not.toBeNull();

      const { data: stockA, error: stockAErr } = await clientA
        .from('stock_items')
        .insert({
          user_id: userAId,
          material_id: matA!.id,
          label: 'Offcut A-1',
          origin: 'remnant',
          width_mm: 1000,
          height_mm: 600,
          state: 'available',
        })
        .select('*')
        .single();
      expect(stockAErr).toBeNull();
      expect(stockA).not.toBeNull();

      // 4. User B cannot read, update, delete, or reference User A's rows
      const bReadMat = await clientB
        .from('materials')
        .select('*')
        .eq('id', matA!.id);
      expect(bReadMat.error).toBeNull();
      expect(bReadMat.data).toHaveLength(0);

      // User B tries spoofing user_id = userAId on INSERT -> blocked by RLS WITH CHECK
      const bSpoofOwner = await clientB.from('materials').insert({
        user_id: userAId,
        name: 'Spoofed Material',
        category: 'Wood',
        thickness_mm: 12,
        standard_width_mm: 2440,
        standard_height_mm: 1220,
        price_per_sheet_minor: 100000,
        currency_code: 'INR',
        default_kerf_mm: 3,
        grain_axis: 'none',
        min_reusable_width_mm: 150,
        min_reusable_height_mm: 150,
      });
      expect(bSpoofOwner.error).not.toBeNull();

      // User B tries creating own stock_item referencing User A's material_id -> blocked by composite FK / trigger!
      const bCrossFkStock = await clientB.from('stock_items').insert({
        user_id: userBId,
        material_id: matA!.id,
        label: 'Cross-tenant steal attempt',
        origin: 'remnant',
        width_mm: 500,
        height_mm: 400,
        state: 'available',
      });
      expect(bCrossFkStock.error).not.toBeNull();

      // User B tries updating or deleting User A's stock item -> affects 0 rows
      const bUpdateStock = await clientB
        .from('stock_items')
        .update({ label: 'Hacked' })
        .eq('id', stockA!.id)
        .select('*');
      expect(bUpdateStock.data ?? []).toHaveLength(0);

      const bDeleteStock = await clientB
        .from('stock_items')
        .delete()
        .eq('id', stockA!.id)
        .select('*');
      expect(bDeleteStock.data ?? []).toHaveLength(0);

      // 5. Atomic commit & stale double-spend protection
      // User A creates two jobs and two draft plans both referencing physical remnant `stockA`
      const { data: job1 } = await clientA
        .from('jobs')
        .insert({ user_id: userAId, title: 'Batch 1', status: 'planned' })
        .select('*')
        .single();
      const { data: job2 } = await clientA
        .from('jobs')
        .insert({ user_id: userAId, title: 'Batch 2 (Stale)', status: 'planned' })
        .select('*')
        .single();

      const dummySnapshot = { jobId: job1!.id };
      const { data: plan1, error: plan1Err } = await clientA
        .from('plans')
        .insert({
          user_id: userAId,
          job_id: job1!.id,
          status: 'draft',
          algorithm_version: 'recut-guillotine-v1.0.0',
          algorithm_seed: 42,
          currency_code: 'INR',
          input_snapshot: dummySnapshot,
          baseline_result: {},
          optimized_summary: {},
          constraints_snapshot: {},
        })
        .select('*')
        .single();
      expect(plan1Err).toBeNull();

      const { data: plan2, error: plan2Err } = await clientA
        .from('plans')
        .insert({
          user_id: userAId,
          job_id: job2!.id,
          status: 'draft',
          algorithm_version: 'recut-guillotine-v1.0.0',
          algorithm_seed: 42,
          currency_code: 'INR',
          input_snapshot: dummySnapshot,
          baseline_result: {},
          optimized_summary: {},
          constraints_snapshot: {},
        })
        .select('*')
        .single();
      expect(plan2Err).toBeNull();

      // Insert plan_sheets on both plans pointing to the SAME physical `stockA`
      const sheetPayload = {
        user_id: userAId,
        sheet_index: 1,
        material_id: matA!.id,
        source_stock_id: stockA!.id,
        source_label: stockA!.label,
        source_type: 'available_remnant' as const,
        width_mm: 1000,
        height_mm: 600,
        kerf_mm: 3,
        placements: [],
        cut_tree: {},
        cuts: [],
        unallocated_regions: [
          {
            id: 'res-1',
            xMm: 603,
            yMm: 0,
            widthMm: 397,
            heightMm: 600,
            areaMm2: 238200,
            reusable: true,
          },
          {
            id: 'res-2',
            xMm: 0,
            yMm: 503,
            widthMm: 600,
            heightMm: 97,
            areaMm2: 58200,
            reusable: false,
          },
        ],
        sheet_metrics: {},
        estimated_new_sheet_cost_minor: 0,
      };

      expect(
        (
          await clientA
            .from('plan_sheets')
            .insert({ ...sheetPayload, plan_id: plan1!.id })
        ).error
      ).toBeNull();
      expect(
        (
          await clientA
            .from('plan_sheets')
            .insert({ ...sheetPayload, plan_id: plan2!.id })
        ).error
      ).toBeNull();

      // User B cannot commit User A's plan
      const bCommitAttempt = await clientB.rpc('commit_plan', {
        p_plan_id: plan1!.id,
      });
      expect(bCommitAttempt.error).not.toBeNull();

      // User A commits Plan 1 -> succeeds atomically!
      const commit1 = await clientA.rpc('commit_plan', {
        p_plan_id: plan1!.id,
      });
      expect(commit1.error).toBeNull();
      expect(commit1.data).toMatchObject({
        planId: plan1!.id,
        consumedStockCount: 1,
        pendingRemnantsCreated: 1,
      });

      // Verify stockA is now `consumed` and a `pending_confirmation` remnant exists
      const { data: refreshedStocks } = await clientA
        .from('stock_items')
        .select('*')
        .order('created_at', { ascending: true });
      const consumedOriginal = refreshedStocks?.find((s) => s.id === stockA!.id);
      const createdPending = refreshedStocks?.find(
        (s) => s.created_from_plan_id === plan1!.id
      );
      expect(consumedOriginal?.state).toBe('consumed');
      expect(createdPending?.state).toBe('pending_confirmation');
      expect(createdPending?.width_mm).toBe(397);
      expect(createdPending?.height_mm).toBe(600);

      // User A attempts to commit stale Plan 2 referencing already-consumed stockA -> MUST FAIL with STOCK_CONFLICT!
      const commit2Stale = await clientA.rpc('commit_plan', {
        p_plan_id: plan2!.id,
      });
      expect(commit2Stale.error).not.toBeNull();
      expect(commit2Stale.error?.message).toContain('STOCK_CONFLICT');

      // Verify Plan 2 remained `draft` (atomic rollback)
      const { data: plan2After } = await clientA
        .from('plans')
        .select('status')
        .eq('id', plan2!.id)
        .single();
      expect(plan2After?.status).toBe('draft');

      // Operator confirms pending remnant with measured dimensions 395x600 mm -> becomes `available`
      const confirmRes = await clientA.rpc('confirm_remnant', {
        p_stock_id: createdPending!.id,
        p_width_mm: 395,
        p_height_mm: 600,
        p_discard: false,
      });
      expect(confirmRes.error).toBeNull();

      const { data: confirmedRemnant } = await clientA
        .from('stock_items')
        .select('*')
        .eq('id', createdPending!.id)
        .single();
      expect(confirmedRemnant?.state).toBe('available');
      expect(confirmedRemnant?.width_mm).toBe(395);
    }
    );
  }
);
