import { cn } from '../utils/cn';

interface BrandMarkProps {
  size?: 'sm' | 'md' | 'lg' | 'form';
  showTagline?: boolean;
  /** Show “Chaitanya Saradhi Trust” next to the logo */
  showName?: boolean;
  align?: 'left' | 'center';
  theme?: 'light' | 'dark';
  className?: string;
}

/** Equal box size for the logo so height and width stay aligned */
const sizeClasses = {
  sm: 'h-10 w-10',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
  form: 'h-16 w-16 max-h-16 max-w-16',
} as const;

const nameSizeClasses = {
  sm: 'text-[0.82rem] leading-snug',
  md: 'text-sm leading-snug',
  lg: 'text-base leading-snug',
  form: 'text-base leading-snug',
} as const;

export function BrandMark({
  size = 'md',
  showName = false,
  align = 'left',
  theme = 'light',
  className,
}: BrandMarkProps) {
  return (
    <div
      className={cn(
        'inline-flex min-w-0 items-center gap-2.5',
        align === 'center' && 'justify-center',
        className,
      )}
    >
      <img
        src="/images/cs-trust-logo.png"
        alt={showName ? '' : 'Chaitanya Saradhi Trust'}
        className={cn(
          'shrink-0 object-contain',
          sizeClasses[size],
        )}
        decoding="async"
      />
      {showName ? (
        <span
          className={cn(
            'min-w-0 font-semibold tracking-tight',
            nameSizeClasses[size],
            theme === 'dark' ? 'text-white' : 'text-slate-900',
          )}
        >
          Chaitanya Saradhi Trust
        </span>
      ) : null}
    </div>
  );
}
