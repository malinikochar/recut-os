import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Cpu,
  FlaskConical,
  GitBranch,
  Lock,
  Scale,
  Scissors,
  ShieldCheck,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const pipelineSteps = [
  {
    step: '01',
    kicker: 'Rack Provenance',
    title: 'Catalog Sheets & Physical Offcuts',
    body: 'Register sheet thickness, kerf width, grain axis, and individual shop remnants (quantity = 1 per rectangle) with integer-mm precision.',
  },
  {
    step: '02',
    kicker: 'Constructive Solver',
    title: 'Prioritize Owned Remnants First',
    body: 'Multi-pass constructive guillotine heuristics allocate existing available remnants before opening any modeled new standard sheets.',
  },
  {
    step: '03',
    kicker: 'Independent Audit',
    title: 'Replay Every Cut Tree & Kerf Strip',
    body: 'An independent verifier replays rip and crosscut splits from root to leaf, enforcing zero overlap, grain rules, and 100% area conservation.',
  },
  {
    step: '04',
    kicker: 'Transactional Commit',
    title: 'Row-Lock Stock & Stage Leftovers',
    body: 'Committing locks source remnants in PostgreSQL, prevents double-spending, and stages reusable leftovers as pending shop confirmation.',
  },
];

export default function MarketingLandingPage() {
  return (
    <div className="min-h-screen bg-bg-page text-fg">
      {/* Dark Frosted Command Center Header (DESIGN.md shell-header) */}
      <header className="cc-shell-glass sticky top-0 z-30 border-b">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-white shadow-xs">
              <Scissors className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="leading-tight">
              <span className="block text-sm font-bold tracking-tight text-white sm:text-base">
                ReCut OS
              </span>
              <span className="hidden font-mono text-[10px] tracking-[0.06em] uppercase text-accent-warm sm:block">
                Material Recovery Command Center
              </span>
            </div>
          </div>

          <div className="hidden items-center gap-5 text-xs font-medium text-white/72 md:flex">
            <a href="#pipeline" className="transition-colors hover:text-white">
              Command Pipeline
            </a>
            <a href="#architecture" className="transition-colors hover:text-white">
              Verification
            </a>
            <a href="#telemetry" className="transition-colors hover:text-white">
              Sample Telemetry
            </a>
          </div>

          <nav
            aria-label="Public navigation"
            className="flex items-center gap-2 sm:gap-2.5"
          >
            <Button asChild variant="shellGhost" size="sm">
              <Link href="/demo">Live Demo</Link>
            </Button>
            <Button asChild variant="shell" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/app">Open workspace</Link>
            </Button>
            <ThemeToggle variant="shell" />
          </nav>
        </div>
      </header>

      <main id="main-content">
        {/* Hero with warm stone drafting grid & dark-chromed CAD window */}
        <section className="cc-grid-canvas relative border-b border-border-subtle py-12 sm:py-20">
          <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:px-8">
            <div className="min-w-0 space-y-6 lg:col-span-7">
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge variant="production">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-[#00c758]"
                    aria-hidden="true"
                  />
                  Production Engine
                </Badge>
                <Badge variant="default">
                  Remnant-First 2D Guillotine Sheet Planner
                </Badge>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-5xl sm:leading-[1.08]">
                Cut from the offcuts you already own before ordering new sheets.
              </h1>

              <p className="max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
                Small woodworking and fabrication shops accumulate valuable
                rectangular remnants that go unused because checking feasibility
                by hand is slow. ReCut OS catalogs owned offcuts, computes
                kerf-accurate guillotine saw trees, verifies every split
                independently, and benchmarks against a transparent new-sheet
                baseline.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button asChild size="lg">
                  <Link href="/demo">
                    <FlaskConical className="h-4 w-4" aria-hidden="true" />
                    Try the live demo
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="lg">
                  <Link href="/app">Open workshop workspace</Link>
                </Button>
              </div>

              {/* Operational Telemetry Strip */}
              <div className="grid grid-cols-2 gap-3 pt-3 sm:grid-cols-4">
                <div className="rounded-xl border border-border-subtle bg-bg-card p-3.5 cc-card">
                  <p className="cc-kicker text-fg-subtle">Coordinates</p>
                  <p className="mt-1 font-mono text-sm font-bold text-fg">
                    Integer mm
                  </p>
                  <p className="mt-0.5 text-[11px] text-fg-muted">
                    Zero float drift
                  </p>
                </div>
                <div className="rounded-xl border border-border-subtle bg-bg-card p-3.5 cc-card">
                  <p className="cc-kicker text-fg-subtle">Area Audit</p>
                  <p className="mt-1 font-mono text-sm font-bold text-accent-text">
                    100% Exact
                  </p>
                  <p className="mt-0.5 text-[11px] text-fg-muted">
                    Parts + kerf + leftover
                  </p>
                </div>
                <div className="rounded-xl border border-border-subtle bg-bg-card p-3.5 cc-card">
                  <p className="cc-kicker text-fg-subtle">Baseline</p>
                  <p className="mt-1 font-mono text-sm font-bold text-fg">
                    New-Sheet FFD
                  </p>
                  <p className="mt-0.5 text-[11px] text-fg-muted">
                    Identical constraints
                  </p>
                </div>
                <div className="rounded-xl border border-border-subtle bg-bg-card p-3.5 cc-card">
                  <p className="cc-kicker text-fg-subtle">Inventory</p>
                  <p className="mt-1 font-mono text-sm font-bold text-fg">
                    Row-Locked
                  </p>
                  <p className="mt-0.5 text-[11px] text-fg-muted">
                    Atomic SQL commit
                  </p>
                </div>
              </div>
            </div>

            {/* Command-Center Frosted Header + CAD Schematic Preview */}
            <div className="min-w-0 lg:col-span-5">
              <div className="cc-card-raised overflow-hidden rounded-xl border border-border-strong bg-bg-card">
                {/* Dark frosted console title bar */}
                <div className="cc-shell-glass flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full bg-accent"
                      aria-hidden="true"
                    />
                    <span className="font-mono font-semibold tracking-[0.04em] text-white">
                      GUILLOTINE SPLIT TREE · KERF = 3 MM
                    </span>
                  </div>
                  <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-accent-warm">
                    Verified Geometry
                  </span>
                </div>

                <div className="space-y-4 p-5">
                  <svg
                    viewBox="0 0 420 232"
                    role="img"
                    aria-label="Schematic diagram showing edge-to-edge guillotine rip and crosscut splits with 3 millimeter saw kerf removal and recoverable hatched remnant"
                    className="w-full rounded-lg border border-border-subtle"
                    style={{ backgroundColor: 'var(--svg-canvas-bg)' }}
                  >
                    <defs>
                      <pattern
                        id="hero-hatch"
                        width="12"
                        height="12"
                        patternTransform="rotate(45 0 0)"
                        patternUnits="userSpaceOnUse"
                      >
                        <rect
                          width="12"
                          height="12"
                          style={{ fill: 'var(--svg-remnant-bg)' }}
                        />
                        <line
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="12"
                          style={{ stroke: 'var(--svg-remnant-stroke)' }}
                          strokeOpacity="0.45"
                          strokeWidth="1.5"
                        />
                      </pattern>
                    </defs>
                    <g transform="translate(20, 22)">
                      {/* Dimension callout top */}
                      <text
                        x="190"
                        y="-7"
                        textAnchor="middle"
                        fontSize="10"
                        fontFamily="var(--font-mono), monospace"
                        style={{ fill: 'var(--text-muted)' }}
                      >
                        OWNED OFFCUT REM-A · 1220 × 800 mm
                      </text>

                      {/* Outer remnant 380x190 */}
                      <rect
                        x="0"
                        y="0"
                        width="380"
                        height="190"
                        style={{
                          fill: 'var(--svg-sheet-bg)',
                          stroke: 'var(--svg-sheet-stroke)',
                        }}
                        strokeWidth="2"
                      />
                      {/* Part 1 */}
                      <rect
                        x="0"
                        y="0"
                        width="230"
                        height="118"
                        style={{
                          fill: 'var(--svg-part-fill)',
                          stroke: 'var(--svg-part-stroke)',
                        }}
                        strokeWidth="2"
                      />
                      <text
                        x="115"
                        y="56"
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight="700"
                        style={{ fill: 'var(--svg-part-label)' }}
                      >
                        SIDE PANEL #1
                      </text>
                      <text
                        x="115"
                        y="74"
                        textAnchor="middle"
                        fontSize="11"
                        fontFamily="var(--font-mono), monospace"
                        style={{ fill: 'var(--svg-part-sublabel)' }}
                      >
                        700 × 350 mm
                      </text>

                      {/* Horizontal kerf #2 inside left strip */}
                      <rect
                        x="0"
                        y="118"
                        width="230"
                        height="4"
                        style={{ fill: 'var(--svg-kerf-fill)' }}
                      />
                      {/* Part 2 */}
                      <rect
                        x="0"
                        y="122"
                        width="230"
                        height="68"
                        style={{
                          fill: 'var(--svg-part-fill)',
                          stroke: 'var(--svg-part-stroke)',
                        }}
                        strokeWidth="2"
                      />
                      <text
                        x="115"
                        y="160"
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="700"
                        style={{ fill: 'var(--svg-part-label)' }}
                      >
                        TOP BRACE · 700 × 160 mm
                      </text>

                      {/* Full-height vertical kerf #1 */}
                      <rect
                        x="230"
                        y="0"
                        width="4"
                        height="190"
                        style={{ fill: 'var(--svg-kerf-fill)' }}
                      />

                      {/* Recoverable remnant */}
                      <rect
                        x="234"
                        y="0"
                        width="146"
                        height="190"
                        fill="url(#hero-hatch)"
                        style={{ stroke: 'var(--svg-remnant-stroke)' }}
                        strokeDasharray="5 3"
                        strokeWidth="1.5"
                      />
                      <rect
                        x="246"
                        y="72"
                        width="122"
                        height="44"
                        rx="5"
                        style={{
                          fill: 'var(--svg-badge-bg)',
                          stroke: 'var(--border-subtle)',
                        }}
                        fillOpacity="0.95"
                        strokeWidth="1"
                      />
                      <text
                        x="307"
                        y="90"
                        textAnchor="middle"
                        fontSize="9.5"
                        fontWeight="700"
                        style={{ fill: 'var(--status-prod-fg)' }}
                      >
                        PENDING REMNANT
                      </text>
                      <text
                        x="307"
                        y="106"
                        textAnchor="middle"
                        fontSize="10"
                        fontFamily="var(--font-mono), monospace"
                        style={{ fill: 'var(--text-primary)' }}
                      >
                        517 × 800 mm
                      </text>

                      {/* Cut step badges */}
                      <circle
                        cx="232"
                        cy="28"
                        r="10"
                        style={{
                          fill: 'var(--svg-badge-bg)',
                          stroke: 'var(--svg-cut-line)',
                        }}
                        strokeWidth="1.6"
                      />
                      <text
                        x="232"
                        y="32"
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="700"
                        style={{ fill: 'var(--accent-text)' }}
                      >
                        1
                      </text>
                      <circle
                        cx="42"
                        cy="120"
                        r="10"
                        style={{
                          fill: 'var(--svg-badge-bg)',
                          stroke: 'var(--svg-cut-line)',
                        }}
                        strokeWidth="1.6"
                      />
                      <text
                        x="42"
                        y="124"
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="700"
                        style={{ fill: 'var(--accent-text)' }}
                      >
                        2
                      </text>
                    </g>
                  </svg>

                  {/* DESIGN.md orange telemetry utilization bar */}
                  <div className="space-y-1.5 rounded-lg border border-border-subtle bg-bg-subtle p-3 text-xs tabular-nums">
                    <div className="flex items-center justify-between">
                      <span className="cc-kicker text-fg-muted">
                        Sheet Area Allocation
                      </span>
                      <span className="font-mono font-semibold text-accent-text">
                        Parts 57.1% · Recoverable 42.4% · Kerf 0.5%
                      </span>
                    </div>
                    <div className="flex h-2 w-full overflow-hidden rounded-xs bg-bg-card">
                      <div
                        className="cc-telemetry-bar h-full"
                        style={{ width: '57.1%' }}
                      />
                      <div
                        className="h-full bg-[#00c758]/55"
                        style={{ width: '42.4%' }}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-fg-muted">
                    No sign-up required for the interactive sandbox. Deterministic
                    TypeScript planner executes live on sample workshop inputs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4-Stage Operational Command Pipeline */}
        <section
          id="pipeline"
          className="border-b border-border-subtle py-14 sm:py-16"
        >
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl space-y-1.5">
                <p className="cc-kicker text-accent-text">
                  End-to-End Execution Pipeline
                </p>
                <h2 className="text-2xl font-bold tracking-tight text-fg">
                  How ReCut OS turns offcut racks into verified saw sheets
                </h2>
              </div>
              <Badge variant="neutral">4 Deterministic Stages</Badge>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {pipelineSteps.map((item) => (
                <Card key={item.step} className="relative overflow-hidden">
                  <div
                    className="h-1 w-full bg-accent/75"
                    aria-hidden="true"
                  />
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-center justify-between">
                      <span className="cc-kicker text-accent-text">
                        {item.kicker}
                      </span>
                      <span className="rounded-md border border-border-subtle bg-bg-subtle px-2 py-0.5 font-mono text-xs font-bold text-fg">
                        {item.step}
                      </span>
                    </div>
                    <h3 className="text-base font-bold tracking-tight text-fg">
                      {item.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-fg-muted">
                      {item.body}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Engineering Pillars */}
        <section
          id="architecture"
          className="border-b border-border-subtle py-14 sm:py-16"
        >
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl space-y-1.5">
              <p className="cc-kicker text-accent-text">
                Industrial Verification Architecture
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-fg">
                Built for shop-floor feasibility, not decorative bin-packing
              </h2>
              <p className="text-sm text-fg-muted">
                Every optimizer output is treated as untrusted until checked by
                an independent cut-tree verifier and stored behind forced
                Row-Level Security.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="space-y-3 p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent-border bg-accent-soft text-accent-text">
                      <Boxes className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <Badge variant="production">Provenance</Badge>
                  </div>
                  <h3 className="text-base font-bold text-fg">
                    Traceable Remnant Bank
                  </h3>
                  <p className="text-xs leading-relaxed text-fg-muted">
                    Each physical sheet or offcut carries a unique ID, exact
                    millimeter dimensions, parent plan lineage, and lifecycle
                    state (`available`, `pending_confirmation`, `consumed`).
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-3 p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent-border bg-accent-soft text-accent-text">
                      <GitBranch className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <Badge variant="integrated">Verified Tree</Badge>
                  </div>
                  <h3 className="text-base font-bold text-fg">
                    Verified Guillotine Trees
                  </h3>
                  <p className="text-xs leading-relaxed text-fg-muted">
                    Plans return ordered edge-to-edge rip and crosscut binary
                    trees with blade kerf subtraction—never free-form
                    un-cuttable L-shapes or silent part omissions.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-3 p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-border bg-amber-soft text-amber-text">
                      <Scale className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <Badge variant="amber">Audited Delta</Badge>
                  </div>
                  <h3 className="text-base font-bold text-fg">
                    Honest Baseline Accounting
                  </h3>
                  <p className="text-xs leading-relaxed text-fg-muted">
                    Benchmarks against a deterministic new-sheet-only FFD
                    guillotine baseline under identical constraints—clearly
                    separating avoided spend, pending offcuts, and scrap.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-3 p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent-border bg-accent-soft text-accent-text">
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <Badge variant="development">Supabase RLS</Badge>
                  </div>
                  <h3 className="text-base font-bold text-fg">
                    Atomic Commit & Forced RLS
                  </h3>
                  <p className="text-xs leading-relaxed text-fg-muted">
                    Committing executes `SELECT ... FOR UPDATE` row locks in
                    PostgreSQL, blocks stale double-allocations, and isolates
                    every tenant table with forced RLS.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Sample Benchmark Telemetry Table (DESIGN.md table-header idiom) */}
        <section id="telemetry" className="py-14 sm:py-16">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <Card>
              <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>
                      Reproducible Fixture Telemetry (`sample-workshop-birch-18`)
                    </CardTitle>
                    <Badge variant="amber">Sample Input Computation</Badge>
                  </div>
                  <p className="mt-1 text-xs text-fg-muted">
                    Computed deterministically from `fixtures/sample-workshop.json`
                    (10 cabinet pieces, 18 mm Birch Plywood, 3 mm saw kerf).
                    Inspect or toggle individual remnants live in `/demo`.
                  </p>
                </div>
                <Button asChild size="sm">
                  <Link href="/demo">
                    <Activity className="h-3.5 w-3.5" aria-hidden="true" />
                    Inspect All 5 Fixtures
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <caption className="sr-only">
                      Sample fixture comparison between new-sheet baseline and ReCut OS
                    </caption>
                    <thead>
                      <tr className="cc-table-head h-12 border-b border-border-subtle">
                        <th scope="col" className="cc-kicker px-5">
                          Telemetry Dimension
                        </th>
                        <th scope="col" className="cc-kicker px-4">
                          New-Sheet FFD Baseline
                        </th>
                        <th scope="col" className="cc-kicker px-4">
                          ReCut OS Remnant-First
                        </th>
                        <th scope="col" className="cc-kicker px-5">
                          Verification Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle tabular-nums">
                      <tr>
                        <td className="px-5 py-3 font-semibold text-fg">
                          New Standard Sheets Ordered (2440 × 1220 mm)
                        </td>
                        <td className="px-4 py-3 font-mono text-fg-muted">
                          1 new sheet
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-accent-text">
                          0 new sheets
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant="production">3 Remnants Reused</Badge>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-5 py-3 font-semibold text-fg">
                          Requested Parts Placed (10 / 10 pieces)
                        </td>
                        <td className="px-4 py-3 font-mono text-fg-muted">
                          10 placed · 0 omitted
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-fg">
                          10 placed · 0 omitted
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1 text-fg-muted">
                            <CheckCircle2
                              className="h-3.5 w-3.5 text-[#00c758]"
                              aria-hidden="true"
                            />
                            Cut-tree replay passed
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-5 py-3 font-semibold text-fg">
                          Oversized / Impossible Fixture Handling
                        </td>
                        <td className="px-4 py-3 font-mono text-fg-muted">
                          Explicit `infeasible`
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-fg">
                          Explicit `[part_exceeds_stock]`
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant="neutral">Never Silently Omitted</Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Bottom Dark Frosted Command Footer & CTA */}
        <footer className="cc-shell-glass border-t py-12">
          <div className="mx-auto flex max-w-[1400px] flex-col justify-between gap-8 px-4 sm:px-6 lg:flex-row lg:items-center lg:px-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-base font-bold text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-white">
                  <Cpu className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>Inspect a complete workshop batch in one click</span>
              </div>
              <p className="max-w-xl text-sm text-white/72">
                Explore the deterministic public sandbox immediately or sign in
                to manage private materials, rack offcuts, and row-locked shop
                commits.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/demo">
                  <FlaskConical className="h-4 w-4" aria-hidden="true" />
                  Launch public demo
                </Link>
              </Button>
              <Button asChild variant="shell" size="lg">
                <Link href="/login">
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                  Workshop sign in
                </Link>
              </Button>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
