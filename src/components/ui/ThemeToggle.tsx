import { useTheme } from '../../features/theme/ThemeContext';
import { cn } from '../../utils/cn';
import { IconMoon, IconSun } from './icons';

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
  showLabel?: boolean;
}

export function ThemeToggle({
  className,
  compact = false,
  showLabel = false,
}: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900',
        compact
          ? 'h-10 w-10 border-0 bg-transparent text-slate-600 shadow-none hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
          : 'h-10 w-full border border-slate-200/80 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-700',
        className,
      )}
    >
      {isDark ? <IconSun className="h-4 w-4 text-amber-400" /> : <IconMoon className="h-4 w-4" />}
      {showLabel ? <span>{isDark ? 'Light mode' : 'Dark mode'}</span> : null}
    </button>
  );
}
