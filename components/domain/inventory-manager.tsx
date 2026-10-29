'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Boxes,
  Check,
  CheckCircle2,
  Filter,
  Loader2,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  confirmRemnantAction,
  createStockItemAction,
  deleteStockItemAction,
} from '@/lib/actions/workshop';
import type { MaterialSpec, PhysicalStockUnit } from '@/lib/domain/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input, Label, SelectNative } from '@/components/ui/input';
import { formatAreaM2, formatDimensionsMm } from '@/lib/utils';

interface StockItemWithLineage extends PhysicalStockUnit {
  consumedByPlanId: string | null;
  createdAt: string;
}

interface InventoryManagerProps {
  materials: MaterialSpec[];
  stockItems: StockItemWithLineage[];
  initialStateFilter?: string;
}

function PendingRemnantRowControls({
  item,
  onSuccess,
  onError,
}: {
  item: StockItemWithLineage;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [widthMm, setWidthMm] = React.useState(String(item.widthMm));
  const [heightMm, setHeightMm] = React.useState(String(item.heightMm));
  const [busy, setBusy] = React.useState(false);

  async function handleConfirm(discard: boolean) {
    setBusy(true);
    try {
      const res = await confirmRemnantAction({
        stockId: item.id,
        widthMm: discard ? item.widthMm : Number(widthMm),
        heightMm: discard ? item.heightMm : Number(heightMm),
        discard,
      });
      if (!res.ok) {
        onError(res.error ?? 'Failed to verify remnant.');
        setBusy(false);
        return;
      }
      onSuccess(
        discard
          ? `Marked "${item.label}" as discarded scrap.`
          : `Confirmed "${item.label}" (${widthMm}×${heightMm} mm) as available on rack.`
      );
    } catch {
      onError('Network error while confirming remnant.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-[#E8AA65]/35 bg-[#E8AA65]/10 p-2.5">
      <div className="space-y-1">
        <Label htmlFor={`rem-w-${item.id}`} className="text-[11px] text-[#F0C28D]">
          Measured W (mm)
        </Label>
        <Input
          id={`rem-w-${item.id}`}
          type="number"
          min={1}
          step={1}
          className="h-8 w-28 text-xs"
          value={widthMm}
          onChange={(e) => setWidthMm(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`rem-h-${item.id}`} className="text-[11px] text-[#F0C28D]">
          Measured H (mm)
        </Label>
        <Input
          id={`rem-h-${item.id}`}
          type="number"
          min={1}
          step={1}
          className="h-8 w-28 text-xs"
          value={heightMm}
          onChange={(e) => setHeightMm(e.target.value)}
        />
      </div>
      <Button
        type="button"
        size="sm"
        disabled={busy}
        onClick={() => handleConfirm(false)}
      >
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
        Confirm Available
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={busy}
        onClick={() => handleConfirm(true)}
      >
        <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
        Discard Scrap
      </Button>
    </div>
  );
}

export function InventoryManager({
  materials,
  stockItems,
  initialStateFilter = 'all',
}: InventoryManagerProps) {
  const router = useRouter();
  const materialById = React.useMemo(
    () => new Map(materials.map((m) => [m.id, m])),
    [materials]
  );

  const defaultMaterial = materials[0];

  const [createForm, setCreateForm] = React.useState({
    materialId: defaultMaterial?.id ?? '',
    origin: 'remnant' as 'remnant' | 'full_sheet',
    label: '',
    widthMm: '1000',
    heightMm: '600',
    notes: '',
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  // Filters
  const [filterMaterial, setFilterMaterial] = React.useState<string>('all');
  const [filterState, setFilterState] = React.useState<string>(
    ['available', 'pending_confirmation', 'consumed'].includes(initialStateFilter)
      ? initialStateFilter
      : 'all'
  );
  const [filterOrigin, setFilterOrigin] = React.useState<string>('all');
  const [minWidthFilter, setMinWidthFilter] = React.useState<string>('');
  const [minHeightFilter, setMinHeightFilter] = React.useState<string>('');

  function handleOriginOrMaterialChange(
    nextMaterialId: string,
    nextOrigin: 'remnant' | 'full_sheet'
  ) {
    const mat = materialById.get(nextMaterialId);
    if (nextOrigin === 'full_sheet' && mat) {
      setCreateForm((prev) => ({
        ...prev,
        materialId: nextMaterialId,
        origin: nextOrigin,
        widthMm: String(mat.standardWidthMm),
        heightMm: String(mat.standardHeightMm),
      }));
    } else {
      setCreateForm((prev) => ({
        ...prev,
        materialId: nextMaterialId,
        origin: nextOrigin,
      }));
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);

    const w = Number(createForm.widthMm);
    const h = Number(createForm.heightMm);
    if (!Number.isInteger(w) || !Number.isInteger(h) || w <= 0 || h <= 0) {
      setError('Enter positive integer millimeter dimensions.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createStockItemAction({
        materialId: createForm.materialId,
        label: createForm.label,
        origin: createForm.origin,
        widthMm: w,
        heightMm: h,
        notes: createForm.notes || null,
      });

      if (!res.ok) {
        setError(res.error ?? 'Could not record physical stock item.');
        setSubmitting(false);
        return;
      }

      setStatusMessage(`Recorded physical stock "${createForm.label}".`);
      setCreateForm((prev) => ({
        ...prev,
        label: '',
        notes: '',
      }));
      router.refresh();
    } catch {
      setError('Network error while recording stock item.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item: StockItemWithLineage) {
    setError(null);
    setStatusMessage(null);
    setDeletingId(item.id);
    try {
      const res = await deleteStockItemAction(item.id);
      if (!res.ok) {
        setError(res.error ?? 'Could not delete stock item.');
        setDeletingId(null);
        return;
      }
      setStatusMessage(`Removed "${item.label}" from inventory.`);
      router.refresh();
    } catch {
      setError('Network error while deleting stock item.');
    } finally {
      setDeletingId(null);
    }
  }

  const filteredItems = React.useMemo(() => {
    const minW = minWidthFilter.trim() ? Number(minWidthFilter) : 0;
    const minH = minHeightFilter.trim() ? Number(minHeightFilter) : 0;

    return stockItems.filter((item) => {
      if (filterMaterial !== 'all' && item.materialId !== filterMaterial) {
        return false;
      }
      if (filterState !== 'all' && item.state !== filterState) {
        return false;
      }
      if (filterOrigin !== 'all' && item.origin !== filterOrigin) {
        return false;
      }
      if (minW > 0 && item.widthMm < minW) {
        return false;
      }
      if (minH > 0 && item.heightMm < minH) {
        return false;
      }
      return true;
    });
  }, [
    stockItems,
    filterMaterial,
    filterState,
    filterOrigin,
    minWidthFilter,
    minHeightFilter,
  ]);

  if (materials.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Add a Material Specification First</CardTitle>
          <CardDescription>
            Every physical sheet or remnant rectangle belongs to a specific
            material thickness and standard sheet envelope.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/app/materials">Go to Material Catalog</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Record new stock form */}
      <Card>
        <CardHeader>
          <CardTitle>Record Owned Sheet or Remnant Offcut</CardTitle>
          <CardDescription>
            Each physical rectangle is tracked individually (`quantity = 1` per
            record) so cutting layouts map 1-to-1 to real shop pieces.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-[#E05A5A]/50 bg-[#E05A5A]/15 p-3 text-xs text-[#FF9999]"
              >
                {error}
              </div>
            )}
            {statusMessage && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-lg border border-[#29B49B]/40 bg-[#29B49B]/10 p-3 text-xs text-[#5CE1C9]"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{statusMessage}</span>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              <div className="space-y-1.5 lg:col-span-2">
                <Label htmlFor="stock-material">Material</Label>
                <SelectNative
                  id="stock-material"
                  value={createForm.materialId}
                  onChange={(e) =>
                    handleOriginOrMaterialChange(
                      e.target.value,
                      createForm.origin
                    )
                  }
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.standardWidthMm}×{m.standardHeightMm} mm)
                    </option>
                  ))}
                </SelectNative>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stock-origin">Stock Origin</Label>
                <SelectNative
                  id="stock-origin"
                  value={createForm.origin}
                  onChange={(e) =>
                    handleOriginOrMaterialChange(
                      createForm.materialId,
                      e.target.value as 'remnant' | 'full_sheet'
                    )
                  }
                >
                  <option value="remnant">Remnant Offcut</option>
                  <option value="full_sheet">Owned Full Sheet</option>
                </SelectNative>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stock-label">Rack Label / Tag</Label>
                <Input
                  id="stock-label"
                  required
                  placeholder="e.g., Offcut REM-D (Rack 2)"
                  value={createForm.label}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, label: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stock-width">Width W (mm)</Label>
                <Input
                  id="stock-width"
                  type="number"
                  min={1}
                  max={100000}
                  step={1}
                  required
                  value={createForm.widthMm}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, widthMm: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stock-height">Height H (mm)</Label>
                <Input
                  id="stock-height"
                  type="number"
                  min={1}
                  max={100000}
                  step={1}
                  required
                  value={createForm.heightMm}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, heightMm: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
                <Label htmlFor="stock-notes">Shop Notes (optional)</Label>
                <Input
                  id="stock-notes"
                  placeholder="e.g., Clean factory edge on X axis, stored Bay B"
                  value={createForm.notes}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, notes: e.target.value })
                  }
                />
              </div>

              <div className="flex items-end sm:col-span-2 lg:col-span-2">
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? (
                    <>
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Add to Rack Inventory
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Filter & Inventory ledger */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>
                Physical Stock & Remnant Ledger ({filteredItems.length} of{' '}
                {stockItems.length})
              </CardTitle>
              <CardDescription>
                Only `available` items enter cutting optimization. Confirm
                `pending_confirmation` offcuts after measuring on the saw.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Filter controls */}
          <div className="grid gap-3 rounded-xl border border-[#2A363C] bg-[#11171B] p-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <Label htmlFor="flt-material" className="flex items-center gap-1.5">
                <Filter className="h-3 w-3 text-[#29B49B]" aria-hidden="true" />
                Material
              </Label>
              <SelectNative
                id="flt-material"
                value={filterMaterial}
                onChange={(e) => setFilterMaterial(e.target.value)}
              >
                <option value="all">All materials</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </SelectNative>
            </div>

            <div className="space-y-1">
              <Label htmlFor="flt-state">Lifecycle State</Label>
              <SelectNative
                id="flt-state"
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
              >
                <option value="all">All states</option>
                <option value="available">Available on rack</option>
                <option value="pending_confirmation">
                  Pending confirmation
                </option>
                <option value="consumed">Consumed / discarded</option>
              </SelectNative>
            </div>

            <div className="space-y-1">
              <Label htmlFor="flt-origin">Origin</Label>
              <SelectNative
                id="flt-origin"
                value={filterOrigin}
                onChange={(e) => setFilterOrigin(e.target.value)}
              >
                <option value="all">Remnants & full sheets</option>
                <option value="remnant">Remnants only</option>
                <option value="full_sheet">Full sheets only</option>
              </SelectNative>
            </div>

            <div className="space-y-1">
              <Label htmlFor="flt-min-w">Min Width (mm)</Label>
              <Input
                id="flt-min-w"
                type="number"
                min={0}
                placeholder="Any"
                value={minWidthFilter}
                onChange={(e) => setMinWidthFilter(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="flt-min-h">Min Height (mm)</Label>
              <Input
                id="flt-min-h"
                type="number"
                min={0}
                placeholder="Any"
                value={minHeightFilter}
                onChange={(e) => setMinHeightFilter(e.target.value)}
              />
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#2A363C] p-8 text-center text-sm text-[#A9B4B4]">
              <Boxes
                className="mx-auto mb-2 h-6 w-6 text-[#738287]"
                aria-hidden="true"
              />
              <p>No physical stock records match the selected filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <caption className="sr-only">
                  Physical sheet and remnant stock items
                </caption>
                <thead>
                  <tr className="border-b border-[#2A363C] text-[#A9B4B4]">
                    <th scope="col" className="py-2.5 pr-4 font-medium">
                      Label & Provenance
                    </th>
                    <th scope="col" className="py-2.5 pr-4 font-medium">
                      Material
                    </th>
                    <th scope="col" className="py-2.5 pr-4 font-medium">
                      Dimensions & Area
                    </th>
                    <th scope="col" className="py-2.5 pr-4 font-medium">
                      Origin & State
                    </th>
                    <th scope="col" className="py-2.5 font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A363C]/60 tabular-nums">
                  {filteredItems.map((item) => {
                    const mat = materialById.get(item.materialId);
                    return (
                      <tr key={item.id} className="align-top">
                        <td className="py-3 pr-4">
                          <p className="font-medium text-[#F2F0E9]">
                            {item.label}
                          </p>
                          {item.notes && (
                            <p className="mt-0.5 text-[11px] text-[#738287]">
                              {item.notes}
                            </p>
                          )}
                          <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                            {item.createdFromPlanId && (
                              <Link
                                href={`/app/plans/${item.createdFromPlanId}`}
                                className="text-[#5CE1C9] hover:underline"
                              >
                                Created from Plan {item.createdFromPlanId.slice(0, 8)}
                              </Link>
                            )}
                            {item.consumedByPlanId && (
                              <Link
                                href={`/app/plans/${item.consumedByPlanId}`}
                                className="text-[#A9B4B4] hover:underline"
                              >
                                Consumed by Plan {item.consumedByPlanId.slice(0, 8)}
                              </Link>
                            )}
                          </div>
                          {item.state === 'pending_confirmation' && (
                            <PendingRemnantRowControls
                              item={item}
                              onSuccess={(msg) => {
                                setError(null);
                                setStatusMessage(msg);
                                router.refresh();
                              }}
                              onError={(msg) => {
                                setStatusMessage(null);
                                setError(msg);
                              }}
                            />
                          )}
                        </td>
                        <td className="py-3 pr-4 text-[#A9B4B4]">
                          {mat ? mat.name : 'Unknown material'}
                        </td>
                        <td className="py-3 pr-4 font-mono text-[#F2F0E9]">
                          <div>
                            {formatDimensionsMm(item.widthMm, item.heightMm)}
                          </div>
                          <div className="text-[11px] text-[#738287]">
                            {formatAreaM2(item.widthMm * item.heightMm)}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap gap-1.5">
                            <Badge
                              variant={
                                item.origin === 'remnant' ? 'neutral' : 'muted'
                              }
                            >
                              {item.origin === 'remnant'
                                ? 'Remnant'
                                : 'Full sheet'}
                            </Badge>
                            <Badge
                              variant={
                                item.state === 'available'
                                  ? 'default'
                                  : item.state === 'pending_confirmation'
                                    ? 'amber'
                                    : 'muted'
                              }
                            >
                              {item.state}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3">
                          {item.state !== 'consumed' ? (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              disabled={deletingId === item.id}
                              onClick={() => handleDelete(item)}
                            >
                              <Trash2
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                              Remove
                            </Button>
                          ) : (
                            <span className="text-[11px] text-[#738287]">
                              Audit locked
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
