import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Boxes,
  ClipboardList,
  FileCheck2,
  Layers,
  Plus,
} from 'lucide-react';
import { SeedWorkshopButton } from '@/components/domain/seed-workshop-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createClient, getAuthenticatedIdentity } from '@/lib/supabase/server';
import { formatAreaM2, formatDimensionsMm } from '@/lib/utils';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Workshop Overview — ReCut OS',
};

export default async function WorkshopOverviewPage() {
  const identity = await getAuthenticatedIdentity();
  if (!identity) {
    redirect('/login');
  }

  const supabase = await createClient();
  const [materialsRes, stockRes, jobsRes, plansRes] = await Promise.all([
    supabase
      .from('materials')
      .select('id, name, thickness_mm, currency_code')
      .eq('user_id', identity.userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('stock_items')
      .select('id, label, origin, state, width_mm, height_mm, material_id')
      .eq('user_id', identity.userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('jobs')
      .select('id, title, status, created_at, updated_at')
      .eq('user_id', identity.userId)
      .order('updated_at', { ascending: false })
      .limit(8),
    supabase
      .from('plans')
      .select('id, job_id, status, algorithm_version, created_at, committed_at')
      .eq('user_id', identity.userId)
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const materials = materialsRes.data ?? [];
  const stockItems = stockRes.data ?? [];
  const jobs = jobsRes.data ?? [];
  const plans = plansRes.data ?? [];

  const availableStock = stockItems.filter((s) => s.state === 'available');
  const availableRemnants = availableStock.filter((s) => s.origin === 'remnant');
  const pendingRemnants = stockItems.filter(
    (s) => s.state === 'pending_confirmation'
  );
  const availableAreaMm2 = availableStock.reduce(
    (sum, s) => sum + s.width_mm * s.height_mm,
    0
  );
  const committedPlanCount = plans.filter((p) => p.status === 'committed').length;

  const isEmptyWorkshop =
    materials.length === 0 && stockItems.length === 0 && jobs.length === 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#F2F0E9]">
            Workshop Recovery Console
          </h1>
          <p className="text-sm text-[#A9B4B4]">
            Manage physical sheet & remnant stock, generate verified guillotine
            cutting trees, and commit inventory-safe shop plans.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Button asChild variant="secondary" size="sm">
            <Link href="/app/inventory">
              <Boxes className="h-4 w-4" aria-hidden="true" />
              Record Stock / Remnant
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/app/jobs/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              New Cutting Job
            </Link>
          </Button>
        </div>
      </div>

      {/* Pending shop confirmation alert */}
      {pendingRemnants.length > 0 && (
        <div
          role="region"
          aria-label="Pending remnant verification notice"
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E8AA65]/45 bg-[#E8AA65]/10 p-4"
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              className="mt-0.5 h-5 w-5 shrink-0 text-[#E8AA65]"
              aria-hidden="true"
            />
            <div className="space-y-0.5 text-sm">
              <p className="font-semibold text-[#F2F0E9]">
                {pendingRemnants.length} offcut{' '}
                {pendingRemnants.length === 1 ? 'remnant requires' : 'remnants require'}{' '}
                physical shop measurement
              </p>
              <p className="text-xs text-[#F0C28D]">
                Pending remnants from committed plans are excluded from future
                cutting optimization until measured and confirmed on the rack.
              </p>
            </div>
          </div>
          <Button asChild variant="amber" size="sm">
            <Link href="/app/inventory?state=pending_confirmation">
              Verify Remnants
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      )}

      {/* First-run onboarding when workshop has zero materials */}
      {isEmptyWorkshop && (
        <Card className="border-[#29B49B]/40 bg-[#141B1F]">
          <CardHeader>
            <Badge variant="default" className="w-fit">
              First-Run Workshop Setup
            </Badge>
            <CardTitle className="pt-1 text-xl">
              Your private workshop database is ready
            </CardTitle>
            <CardDescription>
              Start from scratch by adding your sheet material specifications, or
              seed a complete starter batch (Birch plywood 18 mm, 3 physical
              offcuts, and a 10-piece cabinet job) directly into your account to
              test optimization and atomic inventory commits immediately.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-start gap-3">
            <SeedWorkshopButton />
            <Button asChild variant="secondary">
              <Link href="/app/materials">
                <Layers className="h-4 w-4" aria-hidden="true" />
                Add Your First Material Manually
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KPI summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="space-y-1 p-5">
            <div className="flex items-center justify-between text-xs font-medium text-[#A9B4B4]">
              <span>Material Catalog</span>
              <Layers className="h-4 w-4 text-[#29B49B]" aria-hidden="true" />
            </div>
            <div className="text-2xl font-bold tabular-nums text-[#F2F0E9]">
              {materials.length}
            </div>
            <p className="text-xs text-[#A9B4B4]">
              <Link
                href="/app/materials"
                className="text-[#5CE1C9] hover:underline"
              >
                Manage sheet specs & kerf
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-1 p-5">
            <div className="flex items-center justify-between text-xs font-medium text-[#A9B4B4]">
              <span>Available Owned Stock</span>
              <Boxes className="h-4 w-4 text-[#29B49B]" aria-hidden="true" />
            </div>
            <div className="flex items-baseline gap-2 tabular-nums">
              <span className="text-2xl font-bold text-[#F2F0E9]">
                {availableStock.length}
              </span>
              <span className="text-xs text-[#A9B4B4]">
                ({availableRemnants.length} remnants)
              </span>
            </div>
            <p className="text-xs tabular-nums text-[#A9B4B4]">
              {formatAreaM2(availableAreaMm2)} ready for allocation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-1 p-5">
            <div className="flex items-center justify-between text-xs font-medium text-[#A9B4B4]">
              <span>Pending Remnant Checks</span>
              <AlertCircle className="h-4 w-4 text-[#E8AA65]" aria-hidden="true" />
            </div>
            <div className="text-2xl font-bold tabular-nums text-[#F2F0E9]">
              {pendingRemnants.length}
            </div>
            <p className="text-xs text-[#A9B4B4]">
              {pendingRemnants.length > 0 ? (
                <Link
                  href="/app/inventory?state=pending_confirmation"
                  className="text-[#F0C28D] hover:underline"
                >
                  Confirm measured dimensions
                </Link>
              ) : (
                'All offcuts verified'
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-1 p-5">
            <div className="flex items-center justify-between text-xs font-medium text-[#A9B4B4]">
              <span>Jobs & Committed Plans</span>
              <FileCheck2 className="h-4 w-4 text-[#29B49B]" aria-hidden="true" />
            </div>
            <div className="flex items-baseline gap-2 tabular-nums">
              <span className="text-2xl font-bold text-[#F2F0E9]">
                {jobs.length}
              </span>
              <span className="text-xs text-[#A9B4B4]">
                ({committedPlanCount} committed)
              </span>
            </div>
            <p className="text-xs text-[#A9B4B4]">
              <Link href="/app/jobs" className="text-[#5CE1C9] hover:underline">
                View cutting jobs
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent jobs & available rack preview */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Cutting Jobs</CardTitle>
              <CardDescription>
                Open a job to edit parts, generate a cutting layout, or review
                saved plans.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/jobs">All Jobs</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#2A363C] p-6 text-center text-sm text-[#A9B4B4]">
                <ClipboardList
                  className="mx-auto mb-2 h-6 w-6 text-[#738287]"
                  aria-hidden="true"
                />
                <p>No cutting jobs recorded yet.</p>
                <Button asChild variant="secondary" size="sm" className="mt-3">
                  <Link href="/app/jobs/new">Create First Job</Link>
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-[#2A363C]/70">
                {jobs.map((job) => (
                  <li
                    key={job.id}
                    className="flex items-center justify-between gap-3 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/app/jobs/${job.id}`}
                        className="block truncate font-medium text-[#F2F0E9] hover:text-[#5CE1C9]"
                      >
                        {job.title}
                      </Link>
                      <p className="text-xs tabular-nums text-[#738287]">
                        Updated{' '}
                        {new Date(job.updated_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <Badge
                      variant={
                        job.status === 'committed'
                          ? 'default'
                          : job.status === 'planned'
                            ? 'amber'
                            : 'muted'
                      }
                    >
                      {job.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Available Remnant & Sheet Rack</CardTitle>
              <CardDescription>
                Owned rectangles eligible for immediate allocation before buying
                new standard sheets.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/inventory">Full Rack</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {availableStock.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#2A363C] p-6 text-center text-sm text-[#A9B4B4]">
                <Boxes
                  className="mx-auto mb-2 h-6 w-6 text-[#738287]"
                  aria-hidden="true"
                />
                <p>No available physical remnants or sheets on rack.</p>
                <Button asChild variant="secondary" size="sm" className="mt-3">
                  <Link href="/app/inventory">Add Remnant Stock</Link>
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-[#2A363C]/70">
                {availableStock.slice(0, 6).map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[#F2F0E9]">
                        {item.label}
                      </p>
                      <p className="font-mono text-xs tabular-nums text-[#A9B4B4]">
                        {formatDimensionsMm(item.width_mm, item.height_mm)} (
                        {formatAreaM2(item.width_mm * item.height_mm)})
                      </p>
                    </div>
                    <Badge
                      variant={item.origin === 'remnant' ? 'default' : 'neutral'}
                    >
                      {item.origin === 'remnant' ? 'Remnant' : 'Full sheet'}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Saved Plans */}
      {plans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saved Cutting Plans</CardTitle>
            <CardDescription>
              Draft plans can be inspected or committed once; committed plans are
              immutable shop records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <caption className="sr-only">Recent saved cutting plans</caption>
                <thead>
                  <tr className="border-b border-[#2A363C] text-[#A9B4B4]">
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Plan ID
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Engine
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Created
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Status
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A363C]/60 tabular-nums">
                  {plans.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2.5 pr-4 font-mono text-[#F2F0E9]">
                        {p.id.slice(0, 8)}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-[#A9B4B4]">
                        {p.algorithm_version}
                      </td>
                      <td className="py-2.5 pr-4 text-[#A9B4B4]">
                        {new Date(p.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge
                          variant={p.status === 'committed' ? 'default' : 'amber'}
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="py-2.5">
                        <Link
                          href={`/app/plans/${p.id}`}
                          className="font-medium text-[#5CE1C9] hover:underline"
                        >
                          Open Layout
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
