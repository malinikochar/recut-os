import { redirect } from 'next/navigation';
import { InventoryManager } from '@/components/domain/inventory-manager';
import type { MaterialSpec } from '@/lib/domain/types';
import { createClient, getAuthenticatedIdentity } from '@/lib/supabase/server';

export const metadata = {
  title: 'Sheet & Remnant Stock — ReCut OS',
};

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const identity = await getAuthenticatedIdentity();
  if (!identity) {
    redirect('/login');
  }

  const resolvedParams = await searchParams;
  const supabase = await createClient();

  const [materialsRes, stockRes] = await Promise.all([
    supabase
      .from('materials')
      .select('*')
      .eq('user_id', identity.userId)
      .order('name', { ascending: true }),
    supabase
      .from('stock_items')
      .select('*')
      .eq('user_id', identity.userId)
      .order('created_at', { ascending: false }),
  ]);

  const materials: MaterialSpec[] = (materialsRes.data ?? []).map((row) => ({
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
  }));

  const stockItems = (stockRes.data ?? []).map((row) => ({
    id: row.id,
    materialId: row.material_id,
    label: row.label,
    origin: row.origin,
    state: row.state,
    widthMm: row.width_mm,
    heightMm: row.height_mm,
    createdFromPlanId: row.created_from_plan_id,
    createdFromPlanSheetId: row.created_from_plan_sheet_id,
    consumedByPlanId: row.consumed_by_plan_id,
    notes: row.notes,
    createdAt: row.created_at,
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-[#F2F0E9]">
          Sheet & Remnant Stock
        </h1>
        <p className="text-sm text-[#A9B4B4]">
          Track owned full sheets and reusable offcuts by physical rectangle, and
          confirm post-cut remnants after shop measurement.
        </p>
      </div>

      <InventoryManager
        materials={materials}
        stockItems={stockItems}
        initialStateFilter={resolvedParams.state}
      />
    </div>
  );
}
