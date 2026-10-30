import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.04em] uppercase',
  {
    variants: {
      variant: {
        default: 'border-accent-border bg-accent-soft text-accent-text',
        production:
          'border-[color:var(--status-prod-border)] bg-[color:var(--status-prod-bg)] text-[color:var(--status-prod-fg)]',
        development:
          'border-[color:var(--status-dev-border)] bg-[color:var(--status-dev-bg)] text-[color:var(--status-dev-fg)]',
        integrated:
          'border-[color:var(--status-int-border)] bg-[color:var(--status-int-bg)] text-[color:var(--status-int-fg)]',
        neutral:
          'border-[color:var(--status-plan-border)] bg-[color:var(--status-plan-bg)] text-[color:var(--status-plan-fg)]',
        muted: 'border-border-subtle bg-bg-subtle text-fg-muted',
        amber: 'border-amber-border bg-amber-soft text-amber-text',
        error: 'border-danger-border bg-danger-soft text-danger-text',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
