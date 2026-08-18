import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listLeaves, listTickets } from '../../api';
import type { AuthUser } from '../../types/auth';
import { cn } from '../../utils/cn';
import { IconAlert, IconBell, IconCalendar, IconCheck, IconTicket } from '../ui/icons';

const READ_KEY = 'cs-trust-notif-read';

type Notice = {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: 'rose' | 'amber' | 'sky' | 'emerald';
};

function readIds(): string[] {
  try {
    const raw = localStorage.getItem(READ_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function saveReadIds(ids: string[]) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify(ids.slice(-80)));
  } catch {
    /* ignore */
  }
}

const toneClass = {
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  sky: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
} as const;

const toneIcon = {
  rose: IconTicket,
  amber: IconCalendar,
  sky: IconAlert,
  emerald: IconCheck,
} as const;

function pathsForRole(role: AuthUser['role']) {
  if (role === 'teacher') {
    return { tickets: '/teacher/tickets', leaves: '/teacher/leave' };
  }
  if (role === 'sponsor') {
    return { tickets: '/sponsor/tickets', leaves: '/sponsor/dashboard' };
  }
  return { tickets: '/admin/tickets', leaves: '/admin/leaves' };
}

export function NotificationsMenu({
  user,
  onOpenChange,
  forceClosed = false,
}: {
  user: AuthUser;
  onOpenChange?: (open: boolean) => void;
  forceClosed?: boolean;
}) {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [read, setRead] = useState<string[]>(() => readIds());

  const unreadCount = useMemo(
    () => notices.filter((item) => !read.includes(item.id)).length,
    [notices, read],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const paths = pathsForRole(user.role);
        const [tickets, leaves] = await Promise.all([
          listTickets().catch(() => []),
          user.role === 'sponsor' ? Promise.resolve([]) : listLeaves().catch(() => []),
        ]);

        const next: Notice[] = [];

        for (const ticket of tickets) {
          if (ticket.status === 'Resolved' || ticket.status === 'Closed') continue;
          next.push({
            id: `ticket:${ticket.id}`,
            title: `${ticket.id.toUpperCase()} · ${ticket.type}`,
            detail: ticket.status === 'Open' ? 'Open support ticket' : `${ticket.status} ticket`,
            href: paths.tickets,
            tone: ticket.status === 'Open' ? 'rose' : 'sky',
          });
        }

        if (user.role === 'admin') {
          for (const leave of leaves) {
            if (leave.status !== 'Pending') continue;
            next.push({
              id: `leave:${leave.id}`,
              title: `${leave.teacherName} · ${leave.type}`,
              detail: `Leave pending · ${leave.fromDate} to ${leave.toDate}`,
              href: paths.leaves,
              tone: 'amber',
            });
          }
        } else if (user.role === 'teacher') {
          for (const leave of leaves) {
            if (leave.status === 'Pending') {
              next.push({
                id: `leave:${leave.id}`,
                title: `${leave.type} leave pending`,
                detail: `Awaiting admin · ${leave.fromDate} to ${leave.toDate}`,
                href: paths.leaves,
                tone: 'amber',
              });
            } else if (leave.status === 'Approved' || leave.status === 'Rejected') {
              next.push({
                id: `leave:${leave.id}:${leave.status}`,
                title: `${leave.type} leave ${leave.status.toLowerCase()}`,
                detail: `${leave.fromDate} to ${leave.toDate}`,
                href: paths.leaves,
                tone: leave.status === 'Approved' ? 'emerald' : 'rose',
              });
            }
          }
        }

        if (!cancelled) setNotices(next.slice(0, 8));
      } catch {
        if (!cancelled) setNotices([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user.role]);

  useEffect(() => {
    if (forceClosed && open) {
      setOpen(false);
      onOpenChange?.(false);
    }
  }, [forceClosed, open, onOpenChange]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        onOpenChange?.(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        onOpenChange?.(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onOpenChange]);

  function toggleOpen() {
    setOpen((value) => {
      const next = !value;
      onOpenChange?.(next);
      if (next && notices.length) {
        const merged = [...new Set([...read, ...notices.map((item) => item.id)])];
        setRead(merged);
        saveReadIds(merged);
      }
      return next;
    });
  }

  function openNotice(notice: Notice) {
    setOpen(false);
    onOpenChange?.(false);
    navigate(notice.href);
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center bg-transparent text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggleOpen}
      >
        <IconBell />
        {unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[0.6rem] font-bold leading-4 text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.4rem)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Notifications</p>
            <p className="text-[0.7rem] text-slate-400">
              {loading ? 'Loading…' : `${notices.length} item${notices.length === 1 ? '' : 's'}`}
            </p>
          </div>

          {loading ? (
            <p className="px-3 py-8 text-center text-sm text-slate-500">Loading notifications…</p>
          ) : notices.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              You’re all caught up.
            </p>
          ) : (
            <ul className="max-h-[min(24rem,70vh)] overflow-y-auto overscroll-contain">
              {notices.map((notice) => {
                const Icon = toneIcon[notice.tone];
                return (
                  <li key={notice.id}>
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800"
                      onClick={() => openNotice(notice)}
                    >
                      <span
                        className={cn(
                          'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg',
                          toneClass[notice.tone],
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                          {notice.title}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                          {notice.detail}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
