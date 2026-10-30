'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Copy,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { saveJobWithPartsAction } from '@/lib/actions/workshop';
import {
  MAX_EXPANDED_PARTS_PER_JOB,
  MAX_PART_ROW_QUANTITY,
  type GrainAxis,
  type MaterialSpec,
} from '@/lib/domain/types';
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
import { formatAreaM2 } from '@/lib/utils';

export interface EditablePartRow {
  rowKey: string;
  label: string;
  materialId: string;
  widthMm: string;
  heightMm: string;
  quantity: string;
  allowRotation: boolean;
  requiredGrainAxis: GrainAxis;
  notes: string;
}

interface JobEditorFormProps {
  mode: 'create' | 'edit';
  jobId?: string;
  initialTitle?: string;
  initialNotes?: string | null;
  initialParts?: Array<{
    label: string;
    materialId: string;
    widthMm: number;
    heightMm: number;
    quantity: number;
    allowRotation: boolean;
    requiredGrainAxis: GrainAxis;
    notes?: string | null;
  }>;
  materials: MaterialSpec[];
  readOnly?: boolean;
}

function makeRowKey() {
  return `row-${Math.random().toString(36).slice(2, 10)}`;
}

export function JobEditorForm({
  mode,
  jobId,
  initialTitle = '',
  initialNotes = '',
  initialParts,
  materials,
  readOnly = false,
}: JobEditorFormProps) {
  const router = useRouter();
  const materialById = React.useMemo(
    () => new Map(materials.map((m) => [m.id, m])),
    [materials]
  );
  const firstMaterial = materials[0];

  const [title, setTitle] = React.useState(initialTitle);
  const [notes, setNotes] = React.useState(initialNotes ?? '');
  const [rows, setRows] = React.useState<EditablePartRow[]>(() => {
    if (initialParts && initialParts.length > 0) {
      return initialParts.map((p) => ({
        rowKey: makeRowKey(),
        label: p.label,
        materialId: p.materialId,
        widthMm: String(p.widthMm),
        heightMm: String(p.heightMm),
        quantity: String(p.quantity),
        allowRotation: p.allowRotation,
        requiredGrainAxis: p.requiredGrainAxis,
        notes: p.notes ?? '',
      }));
    }
    return [
      {
        rowKey: makeRowKey(),
        label: 'Cabinet side panel',
        materialId: firstMaterial?.id ?? '',
        widthMm: '700',
        heightMm: '350',
        quantity: '2',
        allowRotation: true,
        requiredGrainAxis: firstMaterial?.grainAxis ?? 'none',
        notes: '',
      },
    ];
  });

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const summary = React.useMemo(() => {
    let totalPieces = 0;
    let totalAreaMm2 = 0;
    for (const r of rows) {
      const q = Number(r.quantity);
      const w = Number(r.widthMm);
      const h = Number(r.heightMm);
      if (Number.isFinite(q) && q > 0) {
        totalPieces += q;
        if (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0) {
          totalAreaMm2 += w * h * q;
        }
      }
    }
    return { totalPieces, totalAreaMm2 };
  }, [rows]);

  function addRow() {
    setRows((prev) => [
      ...prev,
      {
        rowKey: makeRowKey(),
        label: `Part ${prev.length + 1}`,
        materialId: firstMaterial?.id ?? '',
        widthMm: '500',
        heightMm: '300',
        quantity: '1',
        allowRotation: true,
        requiredGrainAxis: firstMaterial?.grainAxis ?? 'none',
        notes: '',
      },
    ]);
  }

  function duplicateRow(index: number) {
    setRows((prev) => {
      const target = prev[index];
      if (!target) return prev;
      const copy: EditablePartRow = {
        ...target,
        rowKey: makeRowKey(),
        label: `${target.label} (copy)`,
      };
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  }

  function removeRow(index: number) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function updateRow(index: number, patch: Partial<EditablePartRow>) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;

    setError(null);
    setStatusMessage(null);

    if (!title.trim()) {
      setError('Enter a descriptive job title.');
      return;
    }

    const parsedParts = [];
    for (const [i, r] of rows.entries()) {
      const w = Number(r.widthMm);
      const h = Number(r.heightMm);
      const q = Number(r.quantity);
      if (!Number.isInteger(w) || w <= 0 || !Number.isInteger(h) || h <= 0) {
        setError(
          `Row ${i + 1} ("${r.label || 'Unnamed'}"): width and height must be positive integer millimeters.`
        );
        return;
      }
      if (!Number.isInteger(q) || q < 1 || q > MAX_PART_ROW_QUANTITY) {
        setError(
          `Row ${i + 1} ("${r.label || 'Unnamed'}"): quantity must be an integer between 1 and ${MAX_PART_ROW_QUANTITY}.`
        );
        return;
      }
      parsedParts.push({
        label: r.label.trim(),
        materialId: r.materialId,
        widthMm: w,
        heightMm: h,
        quantity: q,
        allowRotation: r.allowRotation,
        requiredGrainAxis: r.requiredGrainAxis,
        notes: r.notes.trim() || null,
      });
    }

    setSubmitting(true);
    try {
      const res = await saveJobWithPartsAction({
        jobId,
        title: title.trim(),
        notes: notes.trim() || null,
        parts: parsedParts,
      });

      if (!res.ok || !res.data) {
        setError(res.error ?? 'Could not save cutting job.');
        setSubmitting(false);
        return;
      }

      if (mode === 'create') {
        router.push(`/app/jobs/${res.data.jobId}`);
        return;
      }

      setStatusMessage('Saved updated job manifest.');
      router.refresh();
    } catch {
      setError('Network error while saving cutting job.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>
              {readOnly
                ? 'Committed Part Manifest (Locked)'
                : mode === 'create'
                  ? 'Define Cutting Job & Required Parts'
                  : 'Edit Job Part Manifest'}
            </CardTitle>
            <CardDescription>
              Every requested piece is expanded into an exact placement
              requirement (`1–100` expanded pieces per job).
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 tabular-nums">
            <Badge
              variant={
                summary.totalPieces > MAX_EXPANDED_PARTS_PER_JOB
                  ? 'error'
                  : 'neutral'
              }
            >
              {summary.totalPieces} / {MAX_EXPANDED_PARTS_PER_JOB} pieces
            </Badge>
            <Badge variant="muted">
              Net area: {formatAreaM2(summary.totalAreaMm2)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
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
              className="flex items-center gap-2 rounded-lg border border-accent-border bg-accent-soft p-3 text-xs text-accent-text"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{statusMessage}</span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="job-title">Job Title / Order Reference</Label>
              <Input
                id="job-title"
                required
                disabled={readOnly}
                placeholder="e.g., Kitchen upper cabinets — Order #408"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="job-notes">Production Notes (optional)</Label>
              <Input
                id="job-notes"
                disabled={readOnly}
                placeholder="e.g., Edgeband front long edges after rip cuts"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-fg">
                Required Rectangular Parts ({rows.length}{' '}
                {rows.length === 1 ? 'row' : 'rows'})
              </h3>
              {!readOnly && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addRow}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add Part Row
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {rows.map((row, idx) => {
                const selectedMat = materialById.get(row.materialId);
                return (
                  <div
                    key={row.rowKey}
                    className="rounded-xl border border-border-subtle bg-bg-subtle p-4"
                  >
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
                      <div className="space-y-1 lg:col-span-3">
                        <Label htmlFor={`part-label-${row.rowKey}`}>
                          Part Label
                        </Label>
                        <Input
                          id={`part-label-${row.rowKey}`}
                          required
                          disabled={readOnly}
                          value={row.label}
                          onChange={(e) =>
                            updateRow(idx, { label: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-1 lg:col-span-3">
                        <Label htmlFor={`part-mat-${row.rowKey}`}>
                          Material
                        </Label>
                        <SelectNative
                          id={`part-mat-${row.rowKey}`}
                          disabled={readOnly}
                          value={row.materialId}
                          onChange={(e) => {
                            const nextMatId = e.target.value;
                            const nextMat = materialById.get(nextMatId);
                            updateRow(idx, {
                              materialId: nextMatId,
                              requiredGrainAxis: nextMat?.grainAxis ?? 'none',
                            });
                          }}
                        >
                          {materials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </SelectNative>
                      </div>

                      <div className="space-y-1 lg:col-span-2">
                        <Label htmlFor={`part-w-${row.rowKey}`}>
                          Width (mm)
                        </Label>
                        <Input
                          id={`part-w-${row.rowKey}`}
                          type="number"
                          min={1}
                          step={1}
                          required
                          disabled={readOnly}
                          value={row.widthMm}
                          onChange={(e) =>
                            updateRow(idx, { widthMm: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-1 lg:col-span-2">
                        <Label htmlFor={`part-h-${row.rowKey}`}>
                          Height (mm)
                        </Label>
                        <Input
                          id={`part-h-${row.rowKey}`}
                          type="number"
                          min={1}
                          step={1}
                          required
                          disabled={readOnly}
                          value={row.heightMm}
                          onChange={(e) =>
                            updateRow(idx, { heightMm: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-1 lg:col-span-2">
                        <Label htmlFor={`part-q-${row.rowKey}`}>Quantity</Label>
                        <Input
                          id={`part-q-${row.rowKey}`}
                          type="number"
                          min={1}
                          max={MAX_PART_ROW_QUANTITY}
                          step={1}
                          required
                          disabled={readOnly}
                          value={row.quantity}
                          onChange={(e) =>
                            updateRow(idx, { quantity: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle/80 pt-3">
                      <div className="flex flex-wrap items-center gap-4">
                        <label
                          htmlFor={`part-rot-${row.rowKey}`}
                          className="inline-flex cursor-pointer items-center gap-2 text-xs text-fg"
                        >
                          <input
                            id={`part-rot-${row.rowKey}`}
                            type="checkbox"
                            disabled={readOnly}
                            checked={row.allowRotation}
                            onChange={(e) =>
                              updateRow(idx, {
                                allowRotation: e.target.checked,
                              })
                            }
                            className="h-4 w-4 rounded border-border-strong bg-bg-page accent-accent"
                          />
                          <span>Allow 90° rotation</span>
                        </label>

                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor={`part-grain-${row.rowKey}`}
                            className="text-xs text-fg-muted"
                          >
                            Required Grain:
                          </Label>
                          <SelectNative
                            id={`part-grain-${row.rowKey}`}
                            disabled={readOnly}
                            className="h-8 w-44 text-xs"
                            value={row.requiredGrainAxis}
                            onChange={(e) =>
                              updateRow(idx, {
                                requiredGrainAxis: e.target.value as GrainAxis,
                              })
                            }
                          >
                            <option value="none">Any / None</option>
                            <option value="x">Along part width (X)</option>
                            <option value="y">Along part height (Y)</option>
                          </SelectNative>
                        </div>

                        {selectedMat && (
                          <span className="font-mono text-[11px] text-fg-subtle">
                            Envelope: {selectedMat.standardWidthMm}×
                            {selectedMat.standardHeightMm} mm · Kerf{' '}
                            {selectedMat.kerfMm} mm
                          </span>
                        )}
                      </div>

                      {!readOnly && (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => duplicateRow(idx)}
                          >
                            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                            Duplicate
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={rows.length <= 1}
                            onClick={() => removeRow(idx)}
                          >
                            <Trash2
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {!readOnly && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4">
              <p className="text-xs text-fg-muted">
                {mode === 'create'
                  ? 'After saving, open the job to run the guillotine optimizer against your live remnant stock.'
                  : 'Save part changes before generating a new cutting plan.'}
              </p>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    Saving Job...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" aria-hidden="true" />
                    {mode === 'create' ? 'Save Cutting Job' : 'Save Part Changes'}
                  </>
                )}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
