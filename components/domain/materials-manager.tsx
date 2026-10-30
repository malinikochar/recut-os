'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Edit3,
  Layers,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  deleteMaterialAction,
  upsertMaterialAction,
} from '@/lib/actions/workshop';
import type { MaterialSpec } from '@/lib/domain/types';
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
import { formatDimensionsMm, formatMinorCurrency } from '@/lib/utils';

interface MaterialsManagerProps {
  materials: MaterialSpec[];
}

const DEFAULT_FORM = {
  id: '' as string,
  name: '',
  category: 'Plywood',
  thicknessMm: '18',
  standardWidthMm: '2440',
  standardHeightMm: '1220',
  priceMajor: '1800',
  currencyCode: 'INR',
  kerfMm: '3',
  grainAxis: 'none' as 'none' | 'x' | 'y',
  minReusableWidthMm: '150',
  minReusableHeightMm: '150',
};

function parseMajorToMinor(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return null;
  }
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num * 100);
}

export function MaterialsManager({ materials }: MaterialsManagerProps) {
  const router = useRouter();
  const [form, setForm] = React.useState(DEFAULT_FORM);
  const [submitting, setSubmitting] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const isEditing = Boolean(form.id);

  function loadForEdit(mat: MaterialSpec) {
    setError(null);
    setStatusMessage(null);
    setForm({
      id: mat.id,
      name: mat.name,
      category: mat.category,
      thicknessMm: String(mat.thicknessMm),
      standardWidthMm: String(mat.standardWidthMm),
      standardHeightMm: String(mat.standardHeightMm),
      priceMajor: (mat.pricePerSheetMinor / 100).toString(),
      currencyCode: mat.currencyCode,
      kerfMm: String(mat.kerfMm),
      grainAxis: mat.grainAxis,
      minReusableWidthMm: String(mat.minReusableWidthMm),
      minReusableHeightMm: String(mat.minReusableHeightMm),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setForm(DEFAULT_FORM);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);

    const priceMinor = parseMajorToMinor(form.priceMajor);
    if (priceMinor === null) {
      setError(
        'Enter a non-negative sheet price with at most 2 decimal places (e.g., 1800 or 1800.50).'
      );
      return;
    }

    const intFields = {
      thicknessMm: Number(form.thicknessMm),
      standardWidthMm: Number(form.standardWidthMm),
      standardHeightMm: Number(form.standardHeightMm),
      kerfMm: Number(form.kerfMm),
      minReusableWidthMm: Number(form.minReusableWidthMm),
      minReusableHeightMm: Number(form.minReusableHeightMm),
    };

    for (const [key, val] of Object.entries(intFields)) {
      if (!Number.isInteger(val)) {
        setError(`Field "${key}" must be an integer millimeter value.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await upsertMaterialAction({
        id: form.id || undefined,
        name: form.name,
        category: form.category,
        ...intFields,
        pricePerSheetMinor: priceMinor,
        currencyCode: form.currencyCode,
        grainAxis: form.grainAxis,
      });

      if (!res.ok) {
        setError(res.error ?? 'Failed to save material.');
        setSubmitting(false);
        return;
      }

      setStatusMessage(
        isEditing
          ? `Updated material "${form.name}".`
          : `Added material "${form.name}" to catalog.`
      );
      setForm(DEFAULT_FORM);
      router.refresh();
    } catch {
      setError('Network error while saving material.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(mat: MaterialSpec) {
    setError(null);
    setStatusMessage(null);
    setDeletingId(mat.id);
    try {
      const res = await deleteMaterialAction(mat.id);
      if (!res.ok) {
        setError(res.error ?? 'Could not delete material.');
        setDeletingId(null);
        return;
      }
      if (form.id === mat.id) {
        setForm(DEFAULT_FORM);
      }
      setStatusMessage(`Deleted material "${mat.name}".`);
      router.refresh();
    } catch {
      setError('Network error while deleting material.');
    } finally {
      setDeletingId(null);
    }
  }

  const previewMinor = parseMajorToMinor(form.priceMajor);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="cc-kicker text-accent-text">
                {isEditing ? 'Editing Specification' : 'New Specification'}
              </p>
              <CardTitle className="mt-0.5">
                {isEditing
                  ? 'Edit Material Specification'
                  : 'Add Sheet Material Specification'}
              </CardTitle>
              <CardDescription>
                Define standard sheet dimensions (integer mm), saw kerf width,
                grain axis, and minimum reusable remnant threshold.
              </CardDescription>
            </div>
            {isEditing && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetForm}
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Cancel Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-danger-border bg-danger-soft p-3 text-xs text-danger-text"
              >
                {error}
              </div>
            )}
            {statusMessage && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-lg border border-accent-border bg-accent-soft p-3 text-xs font-medium text-accent-text"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{statusMessage}</span>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="mat-name">Material Name</Label>
                <Input
                  id="mat-name"
                  required
                  placeholder="e.g., Birch plywood 18 mm"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mat-category">Category</Label>
                <SelectNative
                  id="mat-category"
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                >
                  <option value="Plywood">Plywood</option>
                  <option value="MDF">MDF / HDF</option>
                  <option value="Veneer">Veneer Panel</option>
                  <option value="Acrylic">Cast Acrylic</option>
                  <option value="Aluminum">Aluminum Sheet</option>
                  <option value="Composite">Composite / Laminate</option>
                </SelectNative>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mat-thickness">Thickness (mm)</Label>
                <Input
                  id="mat-thickness"
                  type="number"
                  min={1}
                  max={100000}
                  step={1}
                  required
                  value={form.thicknessMm}
                  onChange={(e) =>
                    setForm({ ...form, thicknessMm: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mat-width">Standard Sheet Width W (mm)</Label>
                <Input
                  id="mat-width"
                  type="number"
                  min={1}
                  max={100000}
                  step={1}
                  required
                  value={form.standardWidthMm}
                  onChange={(e) =>
                    setForm({ ...form, standardWidthMm: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mat-height">Standard Sheet Height H (mm)</Label>
                <Input
                  id="mat-height"
                  type="number"
                  min={1}
                  max={100000}
                  step={1}
                  required
                  value={form.standardHeightMm}
                  onChange={(e) =>
                    setForm({ ...form, standardHeightMm: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mat-currency">Currency</Label>
                <SelectNative
                  id="mat-currency"
                  value={form.currencyCode}
                  onChange={(e) =>
                    setForm({ ...form, currencyCode: e.target.value })
                  }
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </SelectNative>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mat-price">
                  Price per Standard Sheet ({form.currencyCode})
                </Label>
                <Input
                  id="mat-price"
                  inputMode="decimal"
                  required
                  value={form.priceMajor}
                  onChange={(e) =>
                    setForm({ ...form, priceMajor: e.target.value })
                  }
                />
                {previewMinor !== null && (
                  <p className="font-mono text-[11px] tabular-nums text-fg-subtle">
                    Stored exact: {previewMinor} minor units (
                    {formatMinorCurrency(previewMinor, form.currencyCode)})
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mat-kerf">Saw Blade Kerf (mm)</Label>
                <Input
                  id="mat-kerf"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  required
                  value={form.kerfMm}
                  onChange={(e) => setForm({ ...form, kerfMm: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mat-grain">Sheet Grain Axis</Label>
                <SelectNative
                  id="mat-grain"
                  value={form.grainAxis}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      grainAxis: e.target.value as 'none' | 'x' | 'y',
                    })
                  }
                >
                  <option value="none">None (isotropic)</option>
                  <option value="x">X — Along sheet width (W)</option>
                  <option value="y">Y — Along sheet height (H)</option>
                </SelectNative>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mat-min-w">Min Reusable Width (mm)</Label>
                <Input
                  id="mat-min-w"
                  type="number"
                  min={1}
                  max={100000}
                  step={1}
                  required
                  value={form.minReusableWidthMm}
                  onChange={(e) =>
                    setForm({ ...form, minReusableWidthMm: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mat-min-h">Min Reusable Height (mm)</Label>
                <Input
                  id="mat-min-h"
                  type="number"
                  min={1}
                  max={100000}
                  step={1}
                  required
                  value={form.minReusableHeightMm}
                  onChange={(e) =>
                    setForm({ ...form, minReusableHeightMm: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4">
              <p className="text-xs text-fg-subtle">
                Residual offcuts smaller than the minimum reusable rectangle on
                both orientations are classified as unusable scrap.
              </p>
              <Button type="submit" disabled={submitting}>
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
                    {isEditing ? 'Update Material' : 'Save Material'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Catalog list */}
      <Card>
        <CardHeader>
          <CardTitle>Workshop Material Catalog ({materials.length})</CardTitle>
          <CardDescription>
            Materials available for physical stock tracking and cutting jobs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {materials.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border-subtle bg-bg-subtle/60 p-8 text-center text-sm text-fg-muted">
              <Layers
                className="mx-auto mb-2 h-6 w-6 text-fg-subtle"
                aria-hidden="true"
              />
              <p>No materials defined yet. Use the form above to add one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border-subtle">
              <table className="w-full border-collapse text-left text-xs">
                <caption className="sr-only">
                  Material catalog specifications
                </caption>
                <thead>
                  <tr className="cc-table-head h-12 border-b border-border-subtle">
                    <th scope="col" className="cc-kicker px-4">
                      Material
                    </th>
                    <th scope="col" className="cc-kicker px-4">
                      Standard Sheet
                    </th>
                    <th scope="col" className="cc-kicker px-4">
                      Price / Sheet
                    </th>
                    <th scope="col" className="cc-kicker px-4">
                      Kerf & Grain
                    </th>
                    <th scope="col" className="cc-kicker px-4">
                      Min Reusable Offcut
                    </th>
                    <th scope="col" className="cc-kicker px-4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle tabular-nums">
                  {materials.map((mat) => (
                    <tr key={mat.id}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-fg">{mat.name}</p>
                        <p className="text-[11px] text-fg-subtle">
                          {mat.category} · {mat.thicknessMm} mm thick
                        </p>
                      </td>
                      <td className="px-4 py-3 font-mono text-fg">
                        {formatDimensionsMm(
                          mat.standardWidthMm,
                          mat.standardHeightMm
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-accent-text">
                        {formatMinorCurrency(
                          mat.pricePerSheetMinor,
                          mat.currencyCode
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="neutral">{mat.kerfMm} mm kerf</Badge>
                          <Badge
                            variant={
                              mat.grainAxis === 'none' ? 'muted' : 'amber'
                            }
                          >
                            {mat.grainAxis === 'none'
                              ? 'No grain'
                              : `Grain ${mat.grainAxis.toUpperCase()}`}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-fg-muted">
                        {formatDimensionsMm(
                          mat.minReusableWidthMm,
                          mat.minReusableHeightMm
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => loadForEdit(mat)}
                          >
                            <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={deletingId === mat.id}
                            onClick={() => handleDelete(mat)}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
