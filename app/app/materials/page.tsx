import { redirect } from 'next/navigation';
import { MaterialsManager } from '@/components/domain/materials-manager';
import type { MaterialSpec } from '@/lib/domain/types';
import { createClient, getAuthenticatedIdentity } from '@/lib/supabase/server';

export const metadata = {
  title: 'Material Catalog — ReCut OS',
};

export default async function MaterialsPage() {
  const identity = await getAuthenticatedIdentity();
  if (!identity) {
    redirect('/login');
  }

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from('materials')
    .select('*')
    .eq('user_id', identity.userId)
    .order('created_at', { ascending: false });

  const materials: MaterialSpec[] = (rows ?? []).map((row) => ({
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

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-[#F2F0E9]">
          Material Catalog
        </h1>
        <p className="text-sm text-[#A9B4B4]">
          Configure sheet dimensions, unit prices, saw kerf widths, grain
          constraints, and minimum reusable offcut dimensions.
        </p>
      </div>

      <MaterialsManager materials={materials} />
    </div>
  );
}
