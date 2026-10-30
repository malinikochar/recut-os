'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme/theme-provider';
import { cn } from '@/lib/utils';

export interface ThemeToggleProps {
  showLabel?: boolean;
  variant?: 'surface' | 'shell';
  className?: string;
}

export function ThemeToggle({
  showLabel = false,
  variant = 'surface',
  className,
}: ThemeToggleProps) {
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
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border text-xs font-medium transition-colors duration-150 cursor-pointer',
        variant === 'shell'
          ? 'border-white/15 bg-white/10 px-2.5 py-2 text-white/90 hover:border-accent hover:bg-accent hover:text-white'
          : 'border-border-strong bg-bg-card px-2.5 py-2 text-fg hover:bg-bg-elevated',
        !showLabel && 'h-9 w-9 p-0',
        className
      )}
    >
      <Sun
        className={cn(
          'theme-icon-sun h-4 w-4 shrink-0',
          variant === 'shell' ? 'text-accent-warm' : 'text-amber-text'
        )}
        aria-hidden="true"
      />
      <Moon
        className={cn(
          'theme-icon-moon h-4 w-4 shrink-0',
          variant === 'shell' ? 'text-accent-warm' : 'text-accent-text'
        )}
        aria-hidden="true"
      />
      {showLabel ? (
        <span>{theme === 'dark' ? 'Light theme' : 'Dark theme'}</span>
      ) : null}
    </button>
  );
}
