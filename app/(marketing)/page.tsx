import Link from 'next/link';
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  FlaskConical,
  Lock,
  Scale,
  Scissors,
  ShieldCheck,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function MarketingLandingPage() {
  return (
    <div className="min-h-screen bg-bg-page text-fg">
      {/* Header */}
      <header className="border-b border-border-subtle bg-bg-shell/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent-border bg-accent-soft text-accent-text">
              <Scissors className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <span className="text-base font-bold tracking-tight">ReCut OS</span>
              <span className="ml-2 hidden text-xs text-fg-muted md:inline">
                Intelligent Material Recovery
              </span>
            </div>
          </div>

          <nav aria-label="Public navigation" className="flex items-center gap-2 sm:gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/demo">Live Demo</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/app">Open workspace</Link>
            </Button>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main id="main-content">
        {/* Hero */}
        <section className="border-b border-border-subtle bg-gradient-to-b from-bg-shell to-bg-page py-16 sm:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
            <div className="space-y-6 lg:col-span-7">
              <Badge variant="default">
                Remnant-First 2D Guillotine Sheet Planner
              </Badge>

              <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-5xl sm:leading-[1.12]">
                Cut from the offcuts you already own before ordering new sheets.
              </h1>

              <p className="max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
                Small woodworking and acrylic shops accumulate valuable rectangular
                offcuts that go unused because checking feasibility by hand is slow.
                ReCut OS tracks each physical remnant, generates kerf-accurate
                guillotine saw trees, verifies every cut independently, and compares
                against a transparent new-sheet baseline.
              </p>

              <div className="flex flex-wrap items-center gap-3.5 pt-2">
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

              <p className="text-xs text-fg-muted">
                No sign-up required for the interactive demo. Deterministic integer-mm
                planner runs live on real fixture inputs.
              </p>
            </div>

            {/* Technical schematic preview */}
            <div className="lg:col-span-5">
              <Card className="border-border-strong bg-bg-card shadow-lg">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center justify-between border-b border-border-subtle pb-3 text-xs">
                    <span className="font-mono font-semibold text-accent-text">
                      GUILLOTINE SPLIT TREE · KERF = 3 mm
                    </span>
                    <Badge variant="neutral">Verified Geometry</Badge>
                  </div>

                  <svg
                    viewBox="0 0 420 230"
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
                          style={{ stroke: 'var(--svg-part-stroke)' }}
                          strokeOpacity="0.45"
                          strokeWidth="1.5"
                        />
                      </pattern>
                    </defs>
                    <g transform="translate(20, 20)">
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
                        strokeWidth="1.8"
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
                        fontFamily="monospace"
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
                        strokeWidth="1.8"
                      />
                      <text
                        x="115"
                        y="160"
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="600"
                        style={{ fill: 'var(--svg-part-label)' }}
                      >
                        BRACE · 700 × 160 mm
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
                        style={{ stroke: 'var(--svg-part-stroke)' }}
                        strokeDasharray="5 3"
                        strokeWidth="1.5"
                      />
                      <rect
                        x="248"
                        y="72"
                        width="118"
                        height="42"
                        rx="4"
                        style={{
                          fill: 'var(--svg-badge-bg)',
                          stroke: 'var(--border-subtle)',
                        }}
                        fillOpacity="0.94"
                        strokeWidth="1"
                      />
                      <text
                        x="307"
                        y="90"
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="700"
                        style={{ fill: 'var(--accent-text)' }}
                      >
                        PENDING REMNANT
                      </text>
                      <text
                        x="307"
                        y="105"
                        textAnchor="middle"
                        fontSize="10"
                        fontFamily="monospace"
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
                        strokeWidth="1.5"
                      />
                      <text
                        x="232"
                        y="32"
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="700"
                        style={{ fill: 'var(--amber-text)' }}
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
                        strokeWidth="1.5"
                      />
                      <text
                        x="42"
                        y="124"
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="700"
                        style={{ fill: 'var(--amber-text)' }}
                      >
                        2
                      </text>
                    </g>
                  </svg>

                  <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs tabular-nums">
                    <div className="rounded-lg border border-border-subtle bg-bg-subtle p-2.5">
                      <p className="text-fg-muted">Geometry</p>
                      <p className="mt-0.5 font-mono font-semibold text-fg">
                        Integer mm
                      </p>
                    </div>
                    <div className="rounded-lg border border-border-subtle bg-bg-subtle p-2.5">
                      <p className="text-fg-muted">Conservation</p>
                      <p className="mt-0.5 font-mono font-semibold text-accent-text">
                        100% Exact
                      </p>
                    </div>
                    <div className="rounded-lg border border-border-subtle bg-bg-subtle p-2.5">
                      <p className="text-fg-muted">Commit Model</p>
                      <p className="mt-0.5 font-mono font-semibold text-amber-text">
                        Row-Locked
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Engineering Pillars */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-fg">
              Built for shop-floor feasibility, not decorative bin-packing
            </h2>
            <p className="text-sm text-fg-muted">
              Every plan passes an independent cut-tree verifier and accounts for
              saw kerf, grain alignment, stock provenance, and operator confirmation.
            </p>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="space-y-3 p-5">
                <Boxes className="h-5 w-5 text-accent-text" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-fg">
                  Traceable Remnant Bank
                </h3>
                <p className="text-xs leading-relaxed text-fg-muted">
                  Each physical sheet or offcut has a unique ID, exact millimeter
                  dimensions, and explicit lifecycle from available to consumed.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 p-5">
                <CheckCircle2 className="h-5 w-5 text-accent-text" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-fg">
                  Verified Guillotine Trees
                </h3>
                <p className="text-xs leading-relaxed text-fg-muted">
                  Plans return ordered edge-to-edge rip and crosscut trees with real
                  blade kerf subtraction, replayed by an independent verifier.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 p-5">
                <Scale className="h-5 w-5 text-amber-text" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-fg">
                  Honest Baseline Accounting
                </h3>
                <p className="text-xs leading-relaxed text-fg-muted">
                  Compares against a deterministic new-sheet-only FFD baseline under
                  identical constraints—separating purchase spend, reusable offcuts,
                  and true scrap.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 p-5">
                <ShieldCheck className="h-5 w-5 text-accent-text" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-fg">
                  Atomic Commit & RLS
                </h3>
                <p className="text-xs leading-relaxed text-fg-muted">
                  Committing a plan row-locks source remnants in PostgreSQL, prevents
                  double-spending, and holds leftovers in pending confirmation.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="border-t border-border-subtle bg-bg-shell py-12">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-fg">
                Inspect a complete workshop batch in three clicks
              </h2>
              <p className="text-sm text-fg-muted">
                Explore the public deterministic fixture or sign in to create
                persistent materials, inventory, and committed cutting plans.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/demo">Launch public demo</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/login">
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                  Workshop sign in
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
