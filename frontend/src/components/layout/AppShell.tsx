import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '../BrandMark';
import { Button } from '../ui';
import { useAuth } from '../../features/auth/hooks/useAuth';

interface AppShellProps {
  children: ReactNode;
  title?: string;
}

export function AppShell({ children, title }: AppShellProps) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-brand-50/40">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-6">
          <Link
            to="/"
            className="rounded-lg no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <BrandMark size="sm" />
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium text-slate-900">{user.name}</p>
                  <p className="text-xs capitalize text-muted">{user.role}</p>
                </div>
                <div
                  className="grid size-9 place-items-center rounded-lg bg-brand-100 font-semibold text-brand-700"
                  aria-hidden="true"
                >
                  {user.name.charAt(0)}
                </div>
                <Button variant="ghost" onClick={() => void logout()}>
                  Sign out
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-6 sm:py-12">
        {title ? (
          <h1 className="mb-6 text-3xl font-bold text-slate-900 sm:text-4xl">{title}</h1>
        ) : null}
        {children}
      </main>
    </div>
  );
}
