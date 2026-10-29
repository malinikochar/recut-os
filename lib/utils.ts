import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMinorCurrency(
  amountMinor: number,
  currencyCode: string = 'INR'
): string {
  const normalizedCode = currencyCode.trim().toUpperCase() || 'INR';
  const major = amountMinor / 100;
  try {
    return new Intl.NumberFormat(normalizedCode === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: normalizedCode,
      minimumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${normalizedCode} ${major.toFixed(2)}`;
  }
}

export function formatAreaM2(areaMm2: number): string {
  const m2 = areaMm2 / 1_000_000;
  return `${m2.toFixed(3)} m²`;
}

export function formatDimensionsMm(widthMm: number, heightMm: number): string {
  return `${widthMm.toLocaleString('en-US')} × ${heightMm.toLocaleString('en-US')} mm`;
}
