import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Layers } from 'lucide-react';
import { JobEditorForm } from '@/components/domain/job-editor-form';
import { SeedWorkshopButton } from '@/components/domain/seed-workshop-button';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { MaterialSpec } from '@/lib/domain/types';
import { createClient, getAuthenticatedIdentity } from '@/lib/supabase/server';

export const metadata = {
  title: 'New Cutting Job — ReCut OS',
};

export default async function NewJobPage() {
  const identity = await getAuthenticatedIdentity();
  if (!identity) {
    redirect('/login');
  }

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from('materials')
    .select('*')
    .eq('user_id', identity.userId)
    .order('name', { ascending: true });

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
      <div className="space-y-2">
        <Link
          href="/app/jobs"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to Cutting Jobs
        </Link>
        <div>
          <p className="cc-kicker text-accent-text">Batch Intake</p>
          <h1 className="text-2xl font-bold leading-8 tracking-tight text-fg">
            Create Cutting Job
          </h1>
        </div>
      </div>

      {materials.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Define at Least One Material First</CardTitle>
            <CardDescription>
              Every cutting job references material specifications from your
              catalog so kerf, grain, and sheet envelope constraints are
              validated accurately.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-start gap-3">
            <Button asChild>
              <Link href="/app/materials">
                <Layers className="h-4 w-4" aria-hidden="true" />
                Add Material to Catalog
              </Link>
            </Button>
            <SeedWorkshopButton />
          </CardContent>
        </Card>
      ) : (
        <JobEditorForm mode="create" materials={materials} />
      )}
    </div>
  );
}
