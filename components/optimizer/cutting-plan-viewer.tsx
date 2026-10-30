'use client';

import * as React from 'react';
import {
  CheckCircle2,
  Layers,
  Printer,
  Recycle,
  RotateCw,
  Scissors,
  ShoppingCart,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PlanResult, SheetPlan } from '@/lib/domain/types';
import {
  cn,
  formatAreaM2,
  formatDimensionsMm,
  formatMinorCurrency,
} from '@/lib/utils';

interface CuttingPlanViewerProps {
  plan: PlanResult;
  currencyCode: string;
  planTitle?: string;
}

function ProvenanceBadge({ sheet, currencyCode }: { sheet: SheetPlan; currencyCode: string }) {
  if (sheet.sourceType === 'available_remnant') {
    return (
      <Badge variant="default">
        <Recycle className="h-3.5 w-3.5" aria-hidden="true" />
        Available remnant
      </Badge>
    );
  }
  if (sheet.sourceType === 'available_full_sheet') {
    return (
      <Badge variant="neutral">
        <Layers className="h-3.5 w-3.5" aria-hidden="true" />
        Available full sheet
      </Badge>
    );
  }
  return (
    <Badge variant="amber">
      <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
      New standard sheet ({formatMinorCurrency(sheet.estimatedNewSheetCostMinor, currencyCode)})
    </Badge>
  );
}

export function CuttingPlanViewer({
  plan,
  currencyCode,
  planTitle = 'Executable Guillotine Cutting Plan',
}: CuttingPlanViewerProps) {
  const [activeSheetIdx, setActiveSheetIdx] = React.useState(0);
  const [selectedPartId, setSelectedPartId] = React.useState<string | null>(null);
  const [showCutSteps, setShowCutSteps] = React.useState(true);
  const [zoomScale, setZoomScale] = React.useState<1 | 1.35 | 1.7>(1);
  const [detailTab, setDetailTab] = React.useState<'cuts' | 'parts' | 'residuals'>(
    'cuts'
  );

  const safeIdx =
    plan.sheets.length === 0
      ? 0
      : Math.min(activeSheetIdx, plan.sheets.length - 1);
  const sheet = plan.sheets[safeIdx];
  const uid = React.useId().replace(/:/g, '');

  if (!sheet) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-fg-muted">
          No cutting sheets generated for this plan.
        </CardContent>
      </Card>
    );
  }

  const selectedPlacement =
    sheet.placements.find((p) => p.partInstanceId === selectedPartId) ??
    sheet.placements[0] ??
    null;

  // Padding in SVG logical units (scaled proportionally to sheet size so small remnants and full sheets both read crisply)
  const padLeft = Math.max(90, Math.round(sheet.widthMm * 0.065));
  const padTop = Math.max(75, Math.round(sheet.heightMm * 0.08));
  const padRight = Math.max(45, Math.round(sheet.widthMm * 0.035));
  const padBottom = Math.max(55, Math.round(sheet.heightMm * 0.06));

  const vbWidth = sheet.widthMm + padLeft + padRight;
  const vbHeight = sheet.heightMm + padTop + padBottom;
  const baseFont = Math.max(16, Math.round(Math.max(sheet.widthMm, sheet.heightMm) * 0.017));

  return (
    <div className="space-y-4">
      {/* Sheet selector bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Cutting plan sheets"
          className="flex flex-wrap gap-2"
        >
          {plan.sheets.map((s, idx) => {
            const isActive = idx === safeIdx;
            return (
              <button
                key={s.sheetKey}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setActiveSheetIdx(idx);
                  setSelectedPartId(null);
                }}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3.5 py-2 text-left text-xs transition-colors cursor-pointer',
                  isActive
                    ? 'border-accent bg-accent-soft text-fg'
                    : 'border-border-subtle bg-bg-subtle text-fg-muted hover:border-border-strong hover:text-fg'
                )}
              >
                <span className="font-mono font-semibold text-accent-text">
                  S{s.sheetIndex}
                </span>
                <span className="font-medium">{s.sourceLabel}</span>
                <span className="tabular-nums text-[11px] text-fg-muted">
                  {s.widthMm}×{s.heightMm}
                </span>
              </button>
            );
          })}
        </div>

        <div className="no-print flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={showCutSteps ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowCutSteps((v) => !v)}
            aria-pressed={showCutSteps}
          >
            <Scissors className="h-3.5 w-3.5" aria-hidden="true" />
            {showCutSteps ? 'Hide cut order' : 'Show cut order'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setZoomScale((z) => (z === 1 ? 1.35 : z === 1.35 ? 1.7 : 1))
            }
            aria-label={`Diagram zoom (${Math.round(zoomScale * 100)} percent)`}
          >
            {zoomScale > 1 ? (
              <ZoomOut className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span className="tabular-nums">{Math.round(zoomScale * 100)}%</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
          >
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            Print sheet
          </Button>
        </div>
      </div>

      {/* Main sheet card */}
      <Card>
        <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <CardTitle>
                Sheet #{sheet.sheetIndex}: {sheet.sourceLabel}
              </CardTitle>
              <ProvenanceBadge sheet={sheet} currencyCode={currencyCode} />
            </div>
            <p className="mt-1 text-xs text-fg-muted tabular-nums">
              {sheet.materialName} · Stock {formatDimensionsMm(sheet.widthMm, sheet.heightMm)} ·
              Saw kerf {sheet.kerfMm} mm · {sheet.placements.length} placed{' '}
              {sheet.placements.length === 1 ? 'part' : 'parts'} ·{' '}
              {sheet.sheetMetrics.cutCount} guillotine{' '}
              {sheet.sheetMetrics.cutCount === 1 ? 'cut' : 'cuts'} ·{' '}
              {sheet.sheetMetrics.utilizationPct}% area utilized
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-accent-text">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Cut-tree verified ({planTitle})</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Scroll-safe SVG container */}
          <div
            className="overflow-x-auto rounded-lg border border-border-subtle p-3"
            style={{ backgroundColor: 'var(--svg-canvas-bg)' }}
          >
            <div
              style={{
                width: zoomScale === 1 ? '100%' : `${Math.round(zoomScale * 100)}%`,
                minWidth: '320px',
              }}
            >
              <svg
                viewBox={`0 0 ${vbWidth} ${vbHeight}`}
                role="img"
                aria-labelledby={`svg-title-${uid} svg-desc-${uid}`}
                className="h-auto max-h-[540px] w-full select-none"
              >
                <title id={`svg-title-${uid}`}>
                  Sheet {sheet.sheetIndex} cutting layout for {sheet.sourceLabel} (
                  {sheet.widthMm} by {sheet.heightMm} millimeters)
                </title>
                <desc id={`svg-desc-${uid}`}>
                  Guillotine cutting diagram containing {sheet.placements.length} parts,{' '}
                  {sheet.residuals.filter((r) => r.reusable).length} recoverable remnant
                  zones, and {sheet.sheetMetrics.cutCount} straight edge-to-edge saw cuts
                  with {sheet.kerfMm} millimeter kerf. Full tabular cut list follows
                  immediately below.
                </desc>

                <defs>
                  {/* Diagonal hatch for recoverable remnants (grayscale-safe) */}
                  <pattern
                    id={`hatch-reusable-${uid}`}
                    width={Math.max(18, Math.round(baseFont * 1.1))}
                    height={Math.max(18, Math.round(baseFont * 1.1))}
                    patternTransform="rotate(45 0 0)"
                    patternUnits="userSpaceOnUse"
                  >
                    <rect
                      width="100%"
                      height="100%"
                      style={{ fill: 'var(--svg-remnant-bg)' }}
                    />
                    <line
                      x1="0"
                      y1="0"
                      x2="0"
                      y2={Math.max(18, Math.round(baseFont * 1.1))}
                      style={{ stroke: 'var(--svg-part-stroke)' }}
                      strokeOpacity="0.42"
                      strokeWidth={Math.max(2, Math.round(baseFont * 0.14))}
                    />
                  </pattern>

                  {/* Dotted grid for unusable scrap */}
                  <pattern
                    id={`dots-scrap-${uid}`}
                    width={Math.max(16, baseFont)}
                    height={Math.max(16, baseFont)}
                    patternUnits="userSpaceOnUse"
                  >
                    <rect
                      width="100%"
                      height="100%"
                      style={{ fill: 'var(--svg-scrap-bg)' }}
                    />
                    <circle
                      cx={Math.max(8, Math.round(baseFont * 0.5))}
                      cy={Math.max(8, Math.round(baseFont * 0.5))}
                      r={Math.max(1.5, baseFont * 0.1)}
                      style={{ fill: 'var(--svg-scrap-dot)' }}
                      fillOpacity="0.6"
                    />
                  </pattern>
                </defs>

                {/* Top horizontal dimension ruler */}
                <g
                  transform={`translate(${padLeft}, ${Math.round(padTop * 0.48)})`}
                  style={{
                    fill: 'var(--text-muted)',
                    stroke: 'var(--border-strong)',
                  }}
                >
                  <line
                    x1={0}
                    y1={0}
                    x2={sheet.widthMm}
                    y2={0}
                    strokeWidth={Math.max(1.5, baseFont * 0.09)}
                  />
                  <line
                    x1={0}
                    y1={-baseFont * 0.4}
                    x2={0}
                    y2={baseFont * 0.4}
                    strokeWidth={Math.max(1.5, baseFont * 0.09)}
                  />
                  <line
                    x1={sheet.widthMm}
                    y1={-baseFont * 0.4}
                    x2={sheet.widthMm}
                    y2={baseFont * 0.4}
                    strokeWidth={Math.max(1.5, baseFont * 0.09)}
                  />
                  <text
                    x={sheet.widthMm / 2}
                    y={-baseFont * 0.45}
                    textAnchor="middle"
                    stroke="none"
                    fontSize={baseFont * 0.85}
                    fontFamily="var(--font-mono), monospace"
                    style={{ fill: 'var(--text-primary)' }}
                  >
                    {sheet.widthMm} mm
                  </text>
                </g>

                {/* Left vertical dimension ruler */}
                <g
                  transform={`translate(${Math.round(padLeft * 0.52)}, ${padTop})`}
                  style={{
                    fill: 'var(--text-muted)',
                    stroke: 'var(--border-strong)',
                  }}
                >
                  <line
                    x1={0}
                    y1={0}
                    x2={0}
                    y2={sheet.heightMm}
                    strokeWidth={Math.max(1.5, baseFont * 0.09)}
                  />
                  <line
                    x1={-baseFont * 0.4}
                    y1={0}
                    x2={baseFont * 0.4}
                    y2={0}
                    strokeWidth={Math.max(1.5, baseFont * 0.09)}
                  />
                  <line
                    x1={-baseFont * 0.4}
                    y1={sheet.heightMm}
                    x2={baseFont * 0.4}
                    y2={sheet.heightMm}
                    strokeWidth={Math.max(1.5, baseFont * 0.09)}
                  />
                  <text
                    x={-baseFont * 0.55}
                    y={sheet.heightMm / 2}
                    textAnchor="middle"
                    transform={`rotate(-90, ${-baseFont * 0.55}, ${sheet.heightMm / 2})`}
                    stroke="none"
                    fontSize={baseFont * 0.85}
                    fontFamily="var(--font-mono), monospace"
                    style={{ fill: 'var(--text-primary)' }}
                  >
                    {sheet.heightMm} mm
                  </text>
                </g>

                {/* Stock sheet coordinate origin */}
                <g transform={`translate(${padLeft}, ${padTop})`}>
                  <rect
                    x={0}
                    y={0}
                    width={sheet.widthMm}
                    height={sheet.heightMm}
                    style={{
                      fill: 'var(--svg-sheet-bg)',
                      stroke: 'var(--svg-sheet-stroke)',
                    }}
                    strokeWidth={Math.max(2, baseFont * 0.14)}
                  />

                  {/* 1. Residual regions (recoverable vs scrap) */}
                  {sheet.residuals.map((res) => {
                    const canFitLabel =
                      res.widthMm >= baseFont * 5.2 &&
                      res.heightMm >= baseFont * 2.5;
                    return (
                      <g key={res.id}>
                        <rect
                          x={res.xMm}
                          y={res.yMm}
                          width={res.widthMm}
                          height={res.heightMm}
                          fill={
                            res.reusable
                              ? `url(#hatch-reusable-${uid})`
                              : `url(#dots-scrap-${uid})`
                          }
                          style={{
                            stroke: res.reusable
                              ? 'var(--svg-part-stroke)'
                              : 'var(--border-strong)',
                          }}
                          strokeDasharray={
                            res.reusable
                              ? `${baseFont * 0.5} ${baseFont * 0.3}`
                              : undefined
                          }
                          strokeWidth={Math.max(1.5, baseFont * 0.09)}
                        />
                        {canFitLabel && (
                          <g
                            transform={`translate(${res.xMm + res.widthMm / 2}, ${
                              res.yMm + res.heightMm / 2
                            })`}
                            pointerEvents="none"
                          >
                            <rect
                              x={-baseFont * 3.8}
                              y={-baseFont * 1.15}
                              width={baseFont * 7.6}
                              height={baseFont * 2.3}
                              rx={baseFont * 0.25}
                              style={{
                                fill: 'var(--svg-badge-bg)',
                                stroke: 'var(--border-subtle)',
                              }}
                              fillOpacity="0.92"
                              strokeWidth={Math.max(1, baseFont * 0.06)}
                            />
                            <text
                              textAnchor="middle"
                              y={-baseFont * 0.15}
                              fontSize={baseFont * 0.72}
                              fontWeight={600}
                              style={{
                                fill: res.reusable
                                  ? 'var(--accent-text)'
                                  : 'var(--text-muted)',
                              }}
                            >
                              {res.reusable ? 'REMNANT' : 'SCRAP'}
                            </text>
                            <text
                              textAnchor="middle"
                              y={baseFont * 0.78}
                              fontSize={baseFont * 0.68}
                              fontFamily="var(--font-mono), monospace"
                              style={{ fill: 'var(--text-primary)' }}
                            >
                              {res.widthMm}×{res.heightMm}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}

                  {/* 2. Placed part leaves (keyboard + pointer selectable) */}
                  {sheet.placements.map((p) => {
                    const isSelected =
                      selectedPlacement?.partInstanceId === p.partInstanceId;
                    const showFullText =
                      p.widthMm >= baseFont * 4.2 && p.heightMm >= baseFont * 2.4;
                    const showCompactText =
                      !showFullText &&
                      p.widthMm >= baseFont * 2.2 &&
                      p.heightMm >= baseFont * 1.3;

                    return (
                      <g
                        key={p.partInstanceId}
                        role="button"
                        tabIndex={0}
                        aria-label={`Part ${p.label}, instance ${p.partInstanceId}, ${p.widthMm} by ${p.heightMm} mm at X ${p.xMm}, Y ${p.yMm}${
                          p.rotated ? ', rotated 90 degrees' : ''
                        }`}
                        onClick={() => setSelectedPartId(p.partInstanceId)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedPartId(p.partInstanceId);
                          }
                        }}
                        className="cursor-pointer focus:outline-none"
                      >
                        <rect
                          x={p.xMm}
                          y={p.yMm}
                          width={p.widthMm}
                          height={p.heightMm}
                          style={{
                            fill: isSelected
                              ? 'var(--svg-part-fill-selected)'
                              : 'var(--svg-part-fill)',
                            stroke: isSelected
                              ? 'var(--svg-part-stroke-selected)'
                              : 'var(--svg-part-stroke)',
                          }}
                          strokeWidth={
                            isSelected
                              ? Math.max(3.5, baseFont * 0.22)
                              : Math.max(2, baseFont * 0.13)
                          }
                        />
                        {showFullText && (
                          <g
                            transform={`translate(${p.xMm + p.widthMm / 2}, ${
                              p.yMm + p.heightMm / 2
                            })`}
                            pointerEvents="none"
                          >
                            <text
                              textAnchor="middle"
                              y={-baseFont * 0.35}
                              fontSize={baseFont * 0.82}
                              fontWeight={700}
                              style={{ fill: 'var(--svg-part-label)' }}
                            >
                              {p.label.length > 20
                                ? `${p.label.slice(0, 18)}…`
                                : p.label}
                            </text>
                            <text
                              textAnchor="middle"
                              y={baseFont * 0.68}
                              fontSize={baseFont * 0.74}
                              fontFamily="var(--font-mono), monospace"
                              style={{ fill: 'var(--svg-part-sublabel)' }}
                            >
                              {p.widthMm}×{p.heightMm} mm
                              {p.rotated ? ' · 90°' : ''}
                            </text>
                          </g>
                        )}
                        {showCompactText && (
                          <text
                            x={p.xMm + p.widthMm / 2}
                            y={p.yMm + p.heightMm / 2 + baseFont * 0.28}
                            textAnchor="middle"
                            fontSize={baseFont * 0.68}
                            fontWeight={600}
                            style={{ fill: 'var(--svg-part-label)' }}
                            pointerEvents="none"
                          >
                            {p.partId}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* 3. Saw kerf strips & guillotine cut sequence numbers */}
                  {sheet.cuts.map((cut) => {
                    const isVert = cut.orientation === 'vertical';
                    const kx = isVert ? cut.cutCoordinateMm : cut.spanStartMm;
                    const ky = isVert ? cut.spanStartMm : cut.cutCoordinateMm;
                    const kw = isVert
                      ? Math.max(cut.kerfMm, Math.round(baseFont * 0.12))
                      : cut.spanLengthMm;
                    const kh = isVert
                      ? cut.spanLengthMm
                      : Math.max(cut.kerfMm, Math.round(baseFont * 0.12));

                    const badgeX = isVert
                      ? cut.cutCoordinateMm + cut.kerfMm / 2
                      : cut.spanStartMm + Math.min(cut.spanLengthMm * 0.5, Math.max(baseFont * 1.4, cut.spanLengthMm * 0.22));
                    const badgeY = isVert
                      ? cut.spanStartMm + Math.min(cut.spanLengthMm * 0.5, Math.max(baseFont * 1.4, cut.spanLengthMm * 0.22))
                      : cut.cutCoordinateMm + cut.kerfMm / 2;

                    return (
                      <g key={cut.nodeId} pointerEvents="none">
                        <rect
                          x={kx}
                          y={ky}
                          width={kw}
                          height={kh}
                          style={{ fill: 'var(--svg-kerf-fill)' }}
                          fillOpacity="0.92"
                        />
                        {showCutSteps && (
                          <g transform={`translate(${badgeX}, ${badgeY})`}>
                            <circle
                              r={baseFont * 0.72}
                              style={{
                                fill: 'var(--svg-badge-bg)',
                                stroke: 'var(--svg-cut-line)',
                              }}
                              strokeWidth={Math.max(1.5, baseFont * 0.1)}
                            />
                            <text
                              textAnchor="middle"
                              y={baseFont * 0.26}
                              fontSize={baseFont * 0.68}
                              fontWeight={700}
                              fontFamily="var(--font-mono), monospace"
                              style={{ fill: 'var(--amber-text)' }}
                            >
                              {cut.stepOrder}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>
          </div>

          {/* Non-color-only legend + Selected Piece Inspector */}
          <div className="grid gap-3 lg:grid-cols-12">
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border-subtle bg-bg-subtle px-4 py-3 text-xs text-fg-muted lg:col-span-7">
              <span className="font-semibold uppercase tracking-wider text-fg">
                Legend:
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block h-3.5 w-5 rounded-xs border"
                  style={{
                    backgroundColor: 'var(--svg-part-fill)',
                    borderColor: 'var(--svg-part-stroke)',
                  }}
                />
                Placed part (solid)
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block h-3.5 w-5 rounded-xs border border-dashed"
                  style={{
                    borderColor: 'var(--svg-part-stroke)',
                    backgroundImage:
                      'repeating-linear-gradient(45deg, var(--svg-remnant-bg), var(--svg-remnant-bg) 3px, var(--svg-part-stroke) 3px, var(--svg-part-stroke) 4px)',
                  }}
                />
                Recoverable remnant (hatched)
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block h-3.5 w-5 rounded-xs border"
                  style={{
                    backgroundColor: 'var(--svg-scrap-bg)',
                    borderColor: 'var(--border-strong)',
                  }}
                />
                Unusable scrap (dotted)
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block h-1.5 w-5"
                  style={{ backgroundColor: 'var(--svg-kerf-fill)' }}
                />
                Saw kerf ({sheet.kerfMm} mm) & cut #
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-bg-subtle px-4 py-3 text-xs lg:col-span-5">
              {selectedPlacement ? (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 font-semibold text-fg">
                    <span>{selectedPlacement.label}</span>
                    <span className="font-mono text-[11px] text-accent-text">
                      [{selectedPlacement.partInstanceId}]
                    </span>
                    {selectedPlacement.rotated && (
                      <span className="inline-flex items-center gap-1 rounded bg-accent-soft px-1.5 py-0.5 text-[10px] text-accent-text">
                        <RotateCw className="h-2.5 w-2.5" aria-hidden="true" />
                        Rotated 90°
                      </span>
                    )}
                  </div>
                  <p className="tabular-nums text-fg-muted">
                    Origin ({selectedPlacement.xMm}, {selectedPlacement.yMm}) mm · Cut size{' '}
                    {selectedPlacement.widthMm}×{selectedPlacement.heightMm} mm · Area{' '}
                    {formatAreaM2(selectedPlacement.widthMm * selectedPlacement.heightMm)}
                  </p>
                </div>
              ) : (
                <span className="text-fg-muted">
                  Select any part in the diagram or table to inspect coordinates.
                </span>
              )}
            </div>
          </div>

          {/* Per-sheet area conservation strip */}
          <div className="grid grid-cols-2 gap-2.5 rounded-lg border border-border-subtle bg-bg-subtle p-3 text-xs sm:grid-cols-5">
            <div>
              <span className="text-fg-muted">Initial Sheet Area</span>
              <p className="mt-0.5 font-mono font-semibold tabular-nums text-fg">
                {formatAreaM2(sheet.sheetMetrics.initialAreaMm2)}
              </p>
            </div>
            <div>
              <span className="text-fg-muted">Placed Parts</span>
              <p className="mt-0.5 font-mono font-semibold tabular-nums text-accent-text">
                {formatAreaM2(sheet.sheetMetrics.partAreaMm2)}
              </p>
            </div>
            <div>
              <span className="text-fg-muted">Recoverable Leftover</span>
              <p className="mt-0.5 font-mono font-semibold tabular-nums text-fg">
                {formatAreaM2(sheet.sheetMetrics.recoverableRemnantAreaMm2)}
              </p>
            </div>
            <div>
              <span className="text-fg-muted">Below-Threshold Scrap</span>
              <p className="mt-0.5 font-mono font-semibold tabular-nums text-fg-muted">
                {formatAreaM2(sheet.sheetMetrics.unusableScrapAreaMm2)}
              </p>
            </div>
            <div>
              <span className="text-fg-muted">Saw Kerf Removed</span>
              <p className="mt-0.5 font-mono font-semibold tabular-nums text-amber-text">
                {formatAreaM2(sheet.sheetMetrics.kerfLossAreaMm2)}
              </p>
            </div>
          </div>

          {/* Accessible textual cut list / parts / residuals tables */}
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap gap-2 border-b border-border-subtle pb-2">
              <Button
                type="button"
                size="sm"
                variant={detailTab === 'cuts' ? 'secondary' : 'ghost'}
                onClick={() => setDetailTab('cuts')}
              >
                Textual Cut Sequence ({sheet.cuts.length})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={detailTab === 'parts' ? 'secondary' : 'ghost'}
                onClick={() => setDetailTab('parts')}
              >
                Placed Parts ({sheet.placements.length})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={detailTab === 'residuals' ? 'secondary' : 'ghost'}
                onClick={() => setDetailTab('residuals')}
              >
                Residual Zones ({sheet.residuals.length})
              </Button>
            </div>

            {detailTab === 'cuts' && (
              <div className="overflow-x-auto">
                {sheet.cuts.length === 0 ? (
                  <p className="py-3 text-xs text-fg-muted">
                    Zero saw cuts required — part matches stock rectangle dimensions
                    exactly.
                  </p>
                ) : (
                  <table className="w-full border-collapse text-left text-xs">
                    <caption className="sr-only">
                      Ordered guillotine saw cuts for Sheet {sheet.sheetIndex}
                    </caption>
                    <thead>
                      <tr className="border-b border-border-subtle text-fg-muted">
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Step
                        </th>
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Cut Direction
                        </th>
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Blade Offset
                        </th>
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Sub-Rectangle Split
                        </th>
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Cut Length
                        </th>
                        <th scope="col" className="py-2 font-medium">
                          Kerf Area
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle/70 tabular-nums">
                      {sheet.cuts.map((c) => (
                        <tr key={c.nodeId}>
                          <td className="py-2 pr-4 font-mono font-semibold text-amber-text">
                            #{c.stepOrder}
                          </td>
                          <td className="py-2 pr-4 text-fg">
                            {c.orientation === 'vertical'
                              ? 'Vertical rip (along Y)'
                              : 'Horizontal crosscut (along X)'}
                          </td>
                          <td className="py-2 pr-4 font-mono text-fg">
                            {c.orientation === 'vertical'
                              ? `X = ${c.cutCoordinateMm} mm`
                              : `Y = ${c.cutCoordinateMm} mm`}
                          </td>
                          <td className="py-2 pr-4 font-mono text-fg-muted">
                            ({c.parentRect.xMm}, {c.parentRect.yMm}){' '}
                            {c.parentRect.widthMm}×{c.parentRect.heightMm} mm
                          </td>
                          <td className="py-2 pr-4 font-mono text-fg">
                            {c.spanLengthMm} mm
                          </td>
                          <td className="py-2 font-mono text-fg-muted">
                            {c.kerfAreaMm2.toLocaleString('en-US')} mm²
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {detailTab === 'parts' && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <caption className="sr-only">
                    Placed parts on Sheet {sheet.sheetIndex}
                  </caption>
                  <thead>
                    <tr className="border-b border-border-subtle text-fg-muted">
                      <th scope="col" className="py-2 pr-4 font-medium">
                        Instance ID
                      </th>
                      <th scope="col" className="py-2 pr-4 font-medium">
                        Label
                      </th>
                      <th scope="col" className="py-2 pr-4 font-medium">
                        Origin (X, Y)
                      </th>
                      <th scope="col" className="py-2 pr-4 font-medium">
                        Oriented Size
                      </th>
                      <th scope="col" className="py-2 font-medium">
                        Rotation
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle/70 tabular-nums">
                    {sheet.placements.map((p) => (
                      <tr
                        key={p.partInstanceId}
                        onClick={() => setSelectedPartId(p.partInstanceId)}
                        className="cursor-pointer hover:bg-bg-elevated/60"
                      >
                        <td className="py-2 pr-4 font-mono text-accent-text">
                          {p.partInstanceId}
                        </td>
                        <td className="py-2 pr-4 font-medium text-fg">
                          {p.label}
                        </td>
                        <td className="py-2 pr-4 font-mono text-fg-muted">
                          ({p.xMm}, {p.yMm}) mm
                        </td>
                        <td className="py-2 pr-4 font-mono text-fg">
                          {p.widthMm} × {p.heightMm} mm
                        </td>
                        <td className="py-2 text-fg-muted">
                          {p.rotated ? 'Rotated 90°' : 'As entered (0°)'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {detailTab === 'residuals' && (
              <div className="overflow-x-auto">
                {sheet.residuals.length === 0 ? (
                  <p className="py-3 text-xs text-fg-muted">
                    Zero residual regions on this sheet.
                  </p>
                ) : (
                  <table className="w-full border-collapse text-left text-xs">
                    <caption className="sr-only">
                      Residual offcuts and scrap regions on Sheet {sheet.sheetIndex}
                    </caption>
                    <thead>
                      <tr className="border-b border-border-subtle text-fg-muted">
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Origin (X, Y)
                        </th>
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Dimensions
                        </th>
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Area
                        </th>
                        <th scope="col" className="py-2 font-medium">
                          Classification
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle/70 tabular-nums">
                      {sheet.residuals.map((r) => (
                        <tr key={r.id}>
                          <td className="py-2 pr-4 font-mono text-fg-muted">
                            ({r.xMm}, {r.yMm}) mm
                          </td>
                          <td className="py-2 pr-4 font-mono text-fg">
                            {r.widthMm} × {r.heightMm} mm
                          </td>
                          <td className="py-2 pr-4 font-mono text-fg-muted">
                            {formatAreaM2(r.areaMm2)}
                          </td>
                          <td className="py-2">
                            {r.reusable ? (
                              <Badge variant="default">
                                Recoverable (pending confirmation)
                              </Badge>
                            ) : (
                              <Badge variant="muted">Below-threshold scrap</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
