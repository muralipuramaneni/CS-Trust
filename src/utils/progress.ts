/**
 * Progress levels for labels/badges.
 * Linear bar uses a logo continuum: flame/ribbon orange → hands blue.
 */
export type ProgressLevel = 'high' | 'medium' | 'low';

/** Logo palette — CS Trust emblem (ribbon orange · hands blue) */
export const logoColors = {
  orangeSoft: '#FDBA74',
  orange: '#F58220',
  orangeDeep: '#E86A0C',
  sky: '#5EB8E8',
  blue: '#0072BC',
  blueDeep: '#005A96',
} as const;

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

export function progressBadgeTone(value: number): 'success' | 'info' | 'warning' {
  const level = progressLevel(value);
  if (level === 'high') return 'success';
  if (level === 'medium') return 'info';
  return 'warning';
}

/**
 * Linear bar fill — single sleek logo gradient (orange → blue).
 * Applied as Tailwind gradient utilities on the fill element.
 */
export const progressBarGradient: Record<ProgressLevel, string> = {
  high: 'bg-gradient-to-r from-[#5EB8E8] via-[#0072BC] to-[#005A96]',
  medium: 'bg-gradient-to-r from-[#F58220] via-[#3D9FD9] to-[#0072BC]',
  low: 'bg-gradient-to-r from-[#FDBA74] via-[#7BB8E0] to-[#3D9FD9]',
};

/** Prefer full logo continuum for syllabus / brand progress strips */
export const progressBarLogoGradient =
  'bg-gradient-to-r from-[#F58220] via-[#3D9FD9] to-[#0072BC]';

/** SVG ring stroke stops (logo orange → blue family) */
export const progressRingStops: Record<
  ProgressLevel,
  { from: string; via?: string; to: string }
> = {
  high: { from: logoColors.sky, via: logoColors.blue, to: logoColors.blueDeep },
  medium: { from: logoColors.orange, via: logoColors.sky, to: logoColors.blue },
  low: { from: logoColors.orangeSoft, via: '#7BB8E0', to: logoColors.sky },
};

/** Solid track behind the fill — low-contrast, pill shape */
export const progressTrackClass =
  'h-2 overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200/70 dark:bg-slate-800/90 dark:ring-slate-700/80';
