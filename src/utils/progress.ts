/**
 * Progress levels — logo / brand colors only (green for strong health).
 * High  ≥ 80% → green gradient
 * Medium 50–79% → logo orange gradient (mid)
 * Low   < 50% → soft peach → deep brand (logo blur family)
 */
export type ProgressLevel = 'high' | 'medium' | 'low';

export function progressLevel(value: number): ProgressLevel {
  if (value >= 80) return 'high';
  if (value >= 50) return 'medium';
  return 'low';
}

export function progressLabel(value: number): string {
  const level = progressLevel(value);
  if (level === 'high') return 'On track';
  if (level === 'medium') return 'Medium';
  return 'Needs focus';
}

export function progressBadgeTone(value: number): 'success' | 'brand' | 'warning' {
  const level = progressLevel(value);
  if (level === 'high') return 'success';
  if (level === 'medium') return 'brand';
  return 'warning';
}

/** Linear bar classes — soft logo-blur gradients */
export const progressBarGradient: Record<ProgressLevel, string> = {
  high: 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600',
  medium: 'bg-gradient-to-r from-brand-300 via-brand-500 to-brand-600',
  low: 'bg-gradient-to-r from-brand-200 via-brand-400 to-brand-700',
};

/** SVG ring stroke stops (logo + green only) */
export const progressRingStops: Record<
  ProgressLevel,
  { from: string; via?: string; to: string }
> = {
  high: { from: '#34d399', via: '#22c55e', to: '#15803d' },
  medium: { from: '#fdba74', via: '#f97316', to: '#ea580c' },
  low: { from: '#ffedd5', via: '#fb923c', to: '#c2410c' },
};

/** Solid gray track behind the fill */
export const progressTrackClass =
  'h-2.5 overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-700';
