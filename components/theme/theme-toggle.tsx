'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme/theme-provider';
import { cn } from '@/lib/utils';

export interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export function ThemeToggle({ showLabel = false, className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const nextLabel =
    theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={nextLabel}
      title={nextLabel}
      data-testid="theme-toggle"
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-border-strong bg-bg-card px-2.5 py-2 text-xs font-medium text-fg transition-colors hover:bg-bg-elevated cursor-pointer',
        !showLabel && 'h-9 w-9 p-0',
        className
      )}
    >
      <Sun className="theme-icon-sun h-4 w-4 shrink-0 text-amber-text" aria-hidden="true" />
      <Moon className="theme-icon-moon h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
      {showLabel ? (
        <span>{theme === 'dark' ? 'Light theme' : 'Dark theme'}</span>
      ) : null}
    </button>
  );
}
