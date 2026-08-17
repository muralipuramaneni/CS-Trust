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
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
  /** Auth screens — smaller on phone so it clears the form card */
  form: 'h-11 w-11 max-h-11 max-w-11 sm:h-14 sm:w-14 sm:max-h-14 sm:max-w-14 lg:h-[5.25rem] lg:w-[5.25rem] lg:max-h-[5.25rem] lg:max-w-[5.25rem]',
} as const;

const nameSizeClasses = {
  sm: 'text-[0.78rem] leading-snug',
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
        'inline-flex min-w-0 max-w-full items-center gap-2',
        align === 'center' && 'justify-center',
        className,
      )}
    >
      <img
        src="/images/cs-trust-logo.png"
        alt={showName ? '' : 'Chaitanya Saradhi Trust'}
        className={cn(
          'block shrink-0 object-contain object-center',
          sizeClasses[size],
        )}
        decoding="async"
      />
      {showName ? (
        <span
          className={cn(
            'min-w-0 truncate font-semibold tracking-tight',
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
