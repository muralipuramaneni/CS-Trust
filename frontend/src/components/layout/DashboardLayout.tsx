import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { BrandMark } from '../BrandMark';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { navForRole } from '../../config/navigation';
import { roleHomePath } from '../../types/auth';
import { cn } from '../../utils/cn';
import {
  IconBell,
  IconChevronLeft,
  IconChevronRight,
  IconLogout,
  IconMenu,
  IconSearch,
} from '../ui/icons';

interface DashboardLayoutProps {
  children: ReactNode;
}

const roleLabel: Record<string, string> = {
  admin: 'Administrator',
  teacher: 'Teacher',
  sponsor: 'Sponsor',
};

const SIDEBAR_COLLAPSED_KEY = 'cs-trust-sidebar-collapsed';

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const role = user?.role ?? 'admin';
  const items = useMemo(() => (user ? navForRole(user.role) : []), [user]);
  const home = roleHomePath(role);

  const pageTitle = useMemo(() => {
    const match = items.find(
      (item) =>
        item.path === location.pathname ||
        (item.path !== home && location.pathname.startsWith(item.path)),
    );
    return match?.label ?? roleLabel[role] ?? 'Portal';
  }, [items, location.pathname, home, role]);

  const groups = useMemo(() => {
    if (role !== 'admin') return null;
    const map = new Map<string, typeof items>();
    for (const item of items) {
      const key = item.group ?? 'Menu';
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [items, role]);

  const initials = useMemo(() => {
    if (!user?.name) return '?';
    return user.name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [user?.name]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    if (!userMenuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setUserMenuOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [userMenuOpen]);

  if (!user) return null;

  const today = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  async function handleLogout() {
    setUserMenuOpen(false);
    await logout();
    navigate('/login', { replace: true });
  }

  function renderNavItem(item: (typeof items)[number]) {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.path}
        to={item.path}
        end={item.path === home}
        title={collapsed ? item.label : undefined}
        onClick={() => setOpen(false)}
        className={({ isActive }) =>
          cn(
            'group flex items-center rounded-lg text-[0.84rem] font-medium transition-all duration-200',
            collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
            isActive
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
              : 'text-slate-300 hover:bg-white/8 hover:text-white',
          )
        }
      >
        {({ isActive }) => (
          <>
            <span
              className={cn(
                'grid h-8 w-8 shrink-0 place-items-center rounded-lg transition',
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-orange-300',
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            {!collapsed ? (
              <>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.readOnly ? (
                  <span
                    className={cn(
                      'rounded-lg px-1.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wide',
                      isActive ? 'bg-white/15 text-white' : 'bg-sky-500/15 text-sky-300',
                    )}
                  >
                    View
                  </span>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </NavLink>
    );
  }

  return (
    <div className="app-shell min-h-svh w-full overflow-x-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-400 dark:focus:bg-slate-900"
      >
        Skip to main content
      </a>

      <div className="flex min-h-svh w-full">
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-30 flex shrink-0 flex-col border-r transition-[width,transform] duration-300 ease-out lg:static lg:translate-x-0',
            collapsed
              ? 'w-[4.75rem] lg:w-[4.75rem]'
              : 'w-[min(17rem,88vw)] lg:w-64 xl:w-[17rem]',
            'border-white/8 bg-[#0b1220] text-slate-100 shadow-[inset_-1px_0_0_rgba(255,255,255,0.04)]',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div
            className={cn(
              'flex shrink-0 items-center gap-1 border-b border-white/8 py-3',
              collapsed ? 'flex-col gap-2 px-2' : 'px-2.5',
            )}
          >
            <Link
              to={home}
              className={cn(
                'inline-flex min-w-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
                collapsed ? 'justify-center' : 'flex-1',
              )}
              onClick={() => setOpen(false)}
              title="Chaitanya Saradhi Trust"
            >
              <BrandMark size="sm" showName={!collapsed} theme="dark" />
            </Link>
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className={cn(
                'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
                collapsed && 'mx-auto',
              )}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <IconChevronRight className="h-4 w-4" />
              ) : (
                <IconChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          <nav
            className={cn('flex-1 space-y-5 py-4', collapsed ? 'px-1.5' : 'px-2.5')}
            aria-label="Main"
          >
            {groups
              ? [...groups.entries()].map(([group, groupItems]) => (
                  <div key={group}>
                    {!collapsed ? (
                      <p className="mb-1.5 px-3 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {group}
                      </p>
                    ) : (
                      <div className="mx-auto mb-1.5 h-px w-6 bg-white/10" aria-hidden />
                    )}
                    <div className="space-y-0.5">{groupItems.map(renderNavItem)}</div>
                  </div>
                ))
              : items.map(renderNavItem)}
          </nav>

          <div
            className={cn(
              'mt-auto shrink-0 border-t border-white/8 py-3',
              collapsed ? 'px-1.5' : 'px-3',
            )}
          >
            {collapsed ? (
              <p className="text-center text-[0.6rem] leading-tight text-slate-500">
                © {new Date().getFullYear()}
              </p>
            ) : (
              <>
                <p className="text-center text-[0.65rem] leading-relaxed text-slate-500">
                  © {new Date().getFullYear()} Chaitanya Saradhi Trust
                </p>
                <p className="mt-0.5 text-center text-[0.62rem] leading-relaxed text-slate-600">
                  All rights reserved.
                </p>
              </>
            )}
          </div>
        </aside>

        {open ? (
          <button
            type="button"
            className="fixed inset-0 z-20 bg-slate-900/35 backdrop-blur-[2px] dark:bg-black/55 lg:hidden"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
        ) : null}

        <div className="flex min-h-svh min-w-0 w-full flex-1 flex-col">
          <header className="sticky top-0 z-10 w-full border-b border-slate-200/60 bg-white/75 px-3 py-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80 sm:px-4 md:px-6 xl:px-8">
            <div className="flex w-full items-center gap-2 sm:gap-3">
              <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 lg:hidden"
                onClick={() => setOpen(true)}
                aria-label="Open menu"
              >
                <IconMenu />
              </button>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 sm:text-base dark:text-slate-50">
                  {pageTitle}
                </p>
                <p className="hidden text-xs text-slate-500 sm:block dark:text-slate-400">{today}</p>
              </div>

              <div className="flex min-w-0 items-center gap-2">
                <label className="relative hidden min-w-0 sm:block">
                  <span className="sr-only">Search</span>
                  <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    placeholder="Search schools, teachers…"
                    className="h-10 w-full max-w-full rounded-lg border border-slate-200 bg-slate-50/80 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-brand-400 dark:focus:bg-slate-900 dark:focus:ring-brand-500/15 sm:w-44 md:w-56 lg:w-72 xl:w-80"
                  />
                </label>

                <ThemeToggle compact />

                <button
                  type="button"
                  className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center bg-transparent text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  aria-label="Notifications"
                >
                  <IconBell />
                  <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-brand-500" />
                </button>

                {/* Top-right user menu */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((value) => !value)}
                    className="inline-flex items-center gap-2.5 bg-transparent py-0.5 pl-0 pr-0"
                    aria-haspopup="menu"
                    aria-expanded={userMenuOpen}
                    aria-label="User menu"
                  >
                    <span className="hidden min-w-0 max-w-[10rem] flex-col text-left sm:flex">
                      <span className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {user.name}
                      </span>
                      <span className="truncate text-[0.65rem] text-slate-500 dark:text-slate-400">
                        {roleLabel[user.role]}
                      </span>
                    </span>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-xs font-bold text-white">
                      {initials}
                    </span>
                  </button>

                  {userMenuOpen ? (
                    <div
                      role="menu"
                      className="absolute right-0 top-[calc(100%+0.4rem)] z-50 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                          {user.name}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {user.email}
                        </p>
                      </div>
                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                        onClick={() => void handleLogout()}
                      >
                        <IconLogout className="h-4 w-4 text-slate-500" />
                        Logout
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </header>

          <main
            id="main-content"
            className="relative w-full min-w-0 flex-1 px-3 py-5 sm:px-4 sm:py-6 md:px-6 md:py-8 xl:px-8"
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-200/25 blur-3xl dark:bg-orange-500/10" />
              <div className="absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-sky-200/20 blur-3xl dark:bg-sky-500/10" />
            </div>
            <div className="relative mx-auto w-full max-w-none animate-fade-up">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
