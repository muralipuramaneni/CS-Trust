import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input, FormField, Modal, TableSearch } from '../../../components/ui';
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  ProgressBar,
  SectionTitle,
  StatCard,
} from '../../../components/ui/Surface';
import { DataTable, DataTableEmpty, Td } from '../../../components/ui/DataTable';
import {
  IconArrowRight,
  IconBook,
  IconBox,
  IconCalendar,
  IconCheck,
  IconClipboard,
  IconClock,
  IconImage,
  IconInfo,
  IconSchool,
  IconSpark,
  IconTicket,
  IconUsers,
} from '../../../components/ui/icons';
import {
  createLeave,
  createStudent,
  createStudentAttendanceSession,
  createSyllabus,
  createTeacherAttendance,
  createTeachingLog,
  createTicket,
  createEvent,
  getMyTeacherProfile,
  getSchool,
  listAssets,
  listLeaves,
  listStudents,
  listStudentAttendanceSessions,
  listTickets,
  listTeacherAttendance,
  updateTeacherAttendance,
  type TeacherAttendanceRow,
} from '../../../api';
import type {
  Asset,
  LeaveRequest,
  School,
  Student,
  SupportTicket,
  TeacherProfile,
} from '../../../types/domain';
import { useAuth } from '../../auth/hooks/useAuth';
import {
  LEAVE_TYPES,
  computeLeaveStats,
  leaveDayCount,
  leaveStatusTone,
} from '../../../utils/leave';
import {
  captureBrowserLocation,
  formatWorkingHours,
  isMeaningfulGpsLabel,
} from '../../../utils/geo';
import { localDateKey } from '../../../utils/date';
import { progressBadgeTone, progressLabel } from '../../../utils/progress';

function apiErrorMessage(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function useTeacherContext() {
  const { user } = useAuth();
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user || user.role !== 'teacher') {
        setTeacher(null);
        setProfileLoading(false);
        return;
      }
      setProfileLoading(true);
      try {
        const profile = await getMyTeacherProfile();
        if (!cancelled) setTeacher(profile);
      } catch {
        if (!cancelled) setTeacher(null);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const schoolId = user?.schoolId || teacher?.schoolId || '';
  return { teacher, schoolId, profileLoading };
}

export function TeacherDashboardPage() {
  const { user } = useAuth();
  const { teacher, schoolId } = useTeacherContext();
  const [school, setSchool] = useState<School | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<TeacherAttendanceRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const today = localDateKey();
  const hour = new Date().getHours();
  const greeting = greetingForHour(hour);
  const firstName =
    teacher?.name?.split(' ')[0] ?? user?.name?.split(' ')[0] ?? 'Teacher';

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(new Date()),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const tasks: Promise<unknown>[] = [
          listTickets({ schoolId: schoolId || undefined }),
          listLeaves(),
        ];
        if (schoolId) {
          tasks.unshift(getSchool(schoolId), listStudents({ schoolId }));
        }
        const results = await Promise.all(tasks);
        if (cancelled) return;

        let offset = 0;
        if (schoolId) {
          setSchool(results[0] as School);
          setStudents(results[1] as Student[]);
          offset = 2;
        } else {
          setSchool(null);
          setStudents([]);
        }
        setTickets(results[offset] as SupportTicket[]);
        setLeaves(results[offset + 1] as LeaveRequest[]);

        if (teacher?.id) {
          try {
            const rows = await listTeacherAttendance({
              date: today,
              teacherId: teacher.id,
              schoolId: schoolId || undefined,
            });
            if (!cancelled) {
              const open = rows.find(
                (r) => !r.clockOut || r.clockOut === '—' || r.hours === 'In progress',
              );
              setTodayAttendance(open ?? rows[0] ?? null);
            }
          } catch {
            if (!cancelled) setTodayAttendance(null);
          }
        }
      } catch (e) {
        if (!cancelled) setLoadError(apiErrorMessage(e, 'Failed to load dashboard'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId, teacher?.id, today]);

  const pendingLeaves = leaves.filter((l) => l.status === 'Pending').length;
  const openTickets = tickets.filter(
    (t) => t.status === 'Open' || t.status === 'Assigned' || t.status === 'In Progress',
  ).length;
  const studentCount = school?.studentCount ?? students.length;
  const classCount = teacher?.assignedClasses?.length ?? 0;
  const syllabusPct = school?.syllabusCompletion ?? 0;

  const clockedIn =
    todayAttendance &&
    (!todayAttendance.clockOut ||
      todayAttendance.clockOut === '—' ||
      todayAttendance.hours === 'In progress');
  const attendanceLabel = clockedIn
    ? todayAttendance?.clockIn || 'In'
    : todayAttendance?.clockOut
      ? 'Done'
      : 'Out';
  const attendanceHint = clockedIn
    ? 'On campus · clock out after last period'
    : todayAttendance
      ? `Worked ${todayAttendance.hours || '—'}`
      : 'Clock in before first period';

  const quickLinks = [
    {
      label: 'Clock in / out',
      detail: 'GPS verified attendance',
      to: '/teacher/clock',
      icon: IconClock,
      tone: 'text-sky-700 bg-sky-50 ring-sky-100 dark:text-sky-300 dark:bg-sky-500/15 dark:ring-sky-500/30',
    },
    {
      label: 'Student attendance',
      detail: 'Mark present / absent',
      to: '/teacher/attendance',
      icon: IconClipboard,
      tone: 'text-emerald-700 bg-emerald-50 ring-emerald-100 dark:text-emerald-300 dark:bg-emerald-500/15 dark:ring-emerald-500/30',
    },
    {
      label: 'Teaching log',
      detail: 'Submit daily topics',
      to: '/teacher/teaching-log',
      icon: IconBook,
      tone: 'text-orange-700 bg-orange-50 ring-orange-100 dark:text-orange-300 dark:bg-orange-500/15 dark:ring-orange-500/30',
    },
    {
      label: 'Syllabus progress',
      detail: 'Update completion %',
      to: '/teacher/syllabus',
      icon: IconCheck,
      tone: 'text-amber-800 bg-amber-50 ring-amber-100 dark:text-amber-300 dark:bg-amber-500/15 dark:ring-amber-500/30',
    },
  ] as const;

  if (loading) {
    return (
      <div className="w-full py-16 text-center text-sm text-slate-500">Loading dashboard…</div>
    );
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      {/* Hero band — aligns with admin dashboard language */}
      <section className="relative w-full overflow-hidden rounded-lg border border-orange-200/60 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-4 text-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.55)] sm:p-6 lg:p-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 top-0 h-56 w-56 rounded-full bg-orange-500/25 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-sky-400/15 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
              backgroundSize: '22px 22px',
            }}
          />
        </div>

        <div className="relative flex w-full flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
          <div className="min-w-0 flex-1 lg:max-w-2xl">
            <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-lg bg-white/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-orange-100 ring-1 ring-white/15 sm:text-[0.7rem] sm:tracking-[0.14em]">
              <IconSpark className="h-3.5 w-3.5 shrink-0 text-orange-300" />
              <span className="truncate">
                {school?.name ?? 'Your school'} · {todayLabel}
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-[2rem]">
              {greeting}, {firstName}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
              Your day at a glance — clock-in, class roll, syllabus, leave status and school
              support. Focus on what needs action before the next period.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/teacher/clock">
                <Button
                  type="button"
                  variant="primary"
                  className="!bg-white !text-slate-900 hover:!bg-orange-50"
                >
                  {clockedIn ? 'Clock out' : 'Clock in'}
                  <IconArrowRight />
                </Button>
              </Link>
              <Link to="/teacher/attendance">
                <Button
                  type="button"
                  variant="outline"
                  className="!border-white/25 !text-white hover:!bg-white/10"
                >
                  Mark attendance
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3 lg:w-auto lg:min-w-[20rem]">
            {[
              {
                label: 'Clock status',
                value: attendanceLabel,
                hint: clockedIn ? 'Currently in' : 'Not on shift',
              },
              {
                label: 'Classes',
                value: classCount || '—',
                hint: teacher?.assignedClasses?.join(', ') || 'Assigned sections',
              },
              {
                label: 'Syllabus',
                value: school ? `${syllabusPct}%` : '—',
                hint: 'School average',
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg bg-white/8 p-3 ring-1 ring-white/12 backdrop-blur-sm sm:p-3.5"
              >
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {item.label}
                </p>
                <p className="mt-1.5 truncate text-xl font-bold tracking-tight text-white sm:text-2xl">
                  {item.value}
                </p>
                <p className="mt-0.5 truncate text-[0.7rem] text-slate-400">{item.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {loadError ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">{loadError}</p>
      ) : null}

      {/* Primary KPI cards — same StatCard patterns as admin */}
      <section>
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Today at a glance
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Key metrics for your school and responsibilities
          </p>
        </div>
        <div className="grid w-full gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Assigned classes"
            value={classCount || '—'}
            hint={
              teacher?.assignedClasses?.length
                ? teacher.assignedClasses.join(' · ')
                : 'No classes linked yet'
            }
            accent="brand"
            icon={<IconClipboard className="h-4 w-4" />}
          />
          <StatCard
            label="Clock status"
            value={attendanceLabel}
            hint={attendanceHint}
            accent={clockedIn ? 'emerald' : 'sky'}
            icon={<IconClock className="h-4 w-4" />}
            trend={
              clockedIn
                ? { label: 'On duty', positive: true }
                : todayAttendance
                  ? { label: 'Completed', positive: true }
                  : { label: 'Not clocked in', positive: false }
            }
          />
          <StatCard
            label="Students"
            value={studentCount || '—'}
            hint={school?.name ? `On roll at ${school.name}` : 'School roster'}
            accent="emerald"
            icon={<IconUsers className="h-4 w-4" />}
          />
          <StatCard
            label="Syllabus completion"
            value={school ? `${syllabusPct}%` : '—'}
            hint="School average progress"
            accent="amber"
            icon={<IconBook className="h-4 w-4" />}
            trend={
              school
                ? {
                    label: progressLabel(syllabusPct),
                    positive: syllabusPct >= 50,
                  }
                : undefined
            }
          />
          <StatCard
            label="Leave status"
            value={pendingLeaves}
            hint={pendingLeaves === 1 ? 'Request awaiting admin' : 'Requests awaiting admin'}
            accent="rose"
            icon={<IconCalendar className="h-4 w-4" />}
            trend={
              pendingLeaves > 0
                ? { label: 'Needs review', positive: false }
                : { label: 'All clear', positive: true }
            }
          />
          <StatCard
            label="Open tickets"
            value={openTickets}
            hint="School support queue"
            accent="slate"
            icon={<IconTicket className="h-4 w-4" />}
            trend={
              openTickets > 0
                ? { label: 'Active issues', positive: false }
                : { label: 'None open', positive: true }
            }
          />
        </div>
      </section>

      {/* Quick actions pulse row */}
      <section className="grid w-full gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {quickLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to} className="group block min-w-0">
              <Card className="flex h-full items-center gap-4 p-4" hover>
                <span
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg ring-1 ring-inset ${item.tone}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {item.label}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.detail}</p>
                </div>
                <IconArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500 dark:text-slate-600" />
              </Card>
            </Link>
          );
        })}
      </section>

      {/* Detail sections */}
      <section className="grid w-full gap-4 lg:grid-cols-5 lg:gap-5">
        <Card className="min-w-0 lg:col-span-3" padding="lg">
          <SectionTitle
            action={
              <Link
                to="/teacher/students"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                View students <IconArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            School snapshot
          </SectionTitle>

          {school ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-100/90 bg-gradient-to-br from-slate-50/80 via-white to-sky-50/40 p-4 dark:border-slate-800 dark:from-slate-900/80 dark:via-slate-900 dark:to-sky-950/20">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-slate-50">
                      {school.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {[school.district, school.village].filter(Boolean).join(' · ') ||
                        'School details'}
                    </p>
                  </div>
                  <Badge tone={progressBadgeTone(syllabusPct)}>
                    {progressLabel(syllabusPct)}
                  </Badge>
                </div>
                <div className="mt-3.5 flex items-center gap-3">
                  <ProgressBar value={syllabusPct} variant="logo" className="min-w-0 flex-1" />
                  <span className="shrink-0 text-xs font-bold tabular-nums tracking-tight text-slate-600 dark:text-slate-300">
                    {syllabusPct}%
                  </span>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  {
                    label: 'Students',
                    value: String(studentCount || '—'),
                    icon: IconUsers,
                  },
                  {
                    label: 'Computers',
                    value: String(school.computerCount ?? '—'),
                    icon: IconBox,
                  },
                  {
                    label: 'Village',
                    value: school.village || '—',
                    icon: IconSchool,
                  },
                  {
                    label: 'Classes',
                    value: classCount ? String(classCount) : '—',
                    icon: IconClipboard,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="rounded-lg border border-slate-100 bg-white/80 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/50"
                    >
                      <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                        <Icon className="h-4 w-4" />
                      </div>
                      <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        {item.label}
                      </dt>
                      <dd className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {item.value}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          ) : (
            <EmptyState message="No school assigned yet" className="min-h-[10rem] py-8" />
          )}
        </Card>

        <Card className="min-w-0 lg:col-span-2" padding="lg">
          <SectionTitle
            action={
              <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">
                Shortcuts
              </span>
            }
          >
            More actions
          </SectionTitle>
          <ul className="space-y-2">
            {[
              {
                to: '/teacher/leave',
                label: 'Leave requests',
                detail: pendingLeaves
                  ? `${pendingLeaves} pending`
                  : 'View balance & history',
                icon: IconCalendar,
              },
              {
                to: '/teacher/tickets',
                label: 'Support tickets',
                detail: openTickets ? `${openTickets} open` : 'Raise school issues',
                icon: IconTicket,
              },
              {
                to: '/teacher/assets',
                label: 'School assets',
                detail: 'Computers & inventory',
                icon: IconBox,
              },
              {
                to: '/teacher/events',
                label: 'Event upload',
                detail: 'Share programme photos',
                icon: IconImage,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="group flex items-center gap-3 rounded-lg border border-slate-100 bg-gradient-to-r from-white to-slate-50/80 px-3 py-2.5 transition hover:border-sky-200/80 hover:shadow-[0_8px_24px_-16px_rgba(0,114,188,0.35)] dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/80 dark:hover:border-sky-800/60"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50 text-slate-600 ring-1 ring-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {item.label}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.detail}</p>
                    </div>
                    <IconArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>
    </div>
  );
}


export function TeacherClockPage() {
  const { user } = useAuth();
  const { schoolId, teacher, profileLoading } = useTeacherContext();
  const [status, setStatus] = useState<'out' | 'in'>('out');
  const [clockInAt, setClockInAt] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [gpsOk, setGpsOk] = useState(false);
  const [device, setDevice] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'ok' | 'warn' | 'error'>('ok');
  const [busy, setBusy] = useState(false);
  const [todayRow, setTodayRow] = useState<TeacherAttendanceRow | null>(null);
  const [schoolName, setSchoolName] = useState('');

  const today = localDateKey();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!schoolId) return;
      try {
        const school = await getSchool(schoolId);
        if (!cancelled) setSchoolName(school.name);
      } catch {
        if (!cancelled) setSchoolName('');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!teacher) return;
      try {
        const rows = await listTeacherAttendance({
          date: today,
          teacherId: teacher.id,
          schoolId: schoolId || undefined,
        });
        if (cancelled) return;
        const open = rows.find((r) => !r.clockOut || r.clockOut === '—' || r.hours === 'In progress');
        const row = open ?? rows[0] ?? null;
        setTodayRow(row);
        if (row && (!row.clockOut || row.clockOut === '—' || row.hours === 'In progress')) {
          setStatus('in');
          setClockInAt(row.clockIn);
          setLocation(row.inLocation);
          setGpsOk(isMeaningfulGpsLabel(row.inLocation));
        }
      } catch {
        // ignore preload errors
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [teacher, schoolId, today]);

  async function handleClock(action: 'in' | 'out') {
    if (!teacher || !schoolId) {
      setMessageTone('error');
      setMessage('Your account is not linked to a school yet. Ask an admin to assign you.');
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const loc = await captureBrowserLocation();
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const ua = navigator.userAgent.slice(0, 80);

      if (action === 'in') {
        const created = await createTeacherAttendance({
          teacherId: teacher.id,
          teacherName: teacher.name,
          schoolId,
          schoolName: schoolName || schoolId,
          date: today,
          clockIn: now,
          inLocation: loc.label,
          clockOut: '—',
          outLocation: '—',
          hours: 'In progress',
          device: ua,
          latitude: loc.latitude ?? null,
          longitude: loc.longitude ?? null,
        });
        setTodayRow(created);
        setStatus('in');
        setClockInAt(now);
        setLocation(loc.label);
        setGpsOk(loc.status === 'ok');
        setDevice(ua);
        if (loc.status === 'ok') {
          setMessageTone('ok');
          setMessage(`Clocked in at ${now}. GPS captured for admin verification.`);
        } else {
          setMessageTone('warn');
          setMessage(
            `Clocked in at ${now}, but GPS was not captured (${loc.label}). Enable location in your browser site settings, then clock out later with GPS if possible.`,
          );
        }
      } else if (todayRow) {
        const hours = formatWorkingHours(todayRow.clockIn || clockInAt || '', now);
        const updated = await updateTeacherAttendance(todayRow.id, {
          clockOut: now,
          outLocation: loc.label,
          hours,
          latitude: loc.latitude ?? todayRow.latitude ?? null,
          longitude: loc.longitude ?? todayRow.longitude ?? null,
        });
        setTodayRow(updated);
        setStatus('out');
        setLocation(loc.label);
        setGpsOk(loc.status === 'ok' || gpsOk);
        setMessageTone(loc.status === 'ok' ? 'ok' : 'warn');
        setMessage(
          loc.status === 'ok'
            ? `Clocked out at ${now}. Working hours: ${updated.hours || hours}.`
            : `Clocked out at ${now} (${updated.hours || hours}). GPS on clock-out was not captured.`,
        );
        setClockInAt(null);
      } else {
        setMessageTone('error');
        setMessage('No open clock-in found for today.');
      }
    } catch (e) {
      setMessageTone('error');
      setMessage(apiErrorMessage(e, 'Clock action failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title="Web Clock In / Clock Out"
        description="Captures time, GPS location and device info for administrator verification."
      />

      {/* Current status — full width */}
      <Card className="w-full" padding="lg">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <SectionTitle>Current status</SectionTitle>
            <p className="mt-1 text-xs text-slate-500">
              {schoolName || schoolId || 'School'} · {today}
            </p>
          </div>
          <Badge tone={status === 'in' ? 'success' : 'neutral'}>
            {status === 'in' ? 'Clocked in' : 'Clocked out'}
          </Badge>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'School', value: schoolName || schoolId || '—' },
            { label: 'Last clock-in', value: clockInAt ?? '—' },
            { label: 'GPS location', value: location ?? '—' },
            { label: 'Device', value: device ?? '—', small: true },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/50"
            >
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                {item.label}
              </p>
              <p
                className={[
                  'mt-1 break-words font-semibold text-slate-900 dark:text-slate-50',
                  item.small ? 'text-xs font-medium text-slate-600 dark:text-slate-300' : 'text-sm',
                ].join(' ')}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="primary"
            className="min-h-11 w-full sm:w-auto sm:min-w-[10rem]"
            disabled={busy || profileLoading || status === 'in' || !teacher || !schoolId}
            onClick={() => void handleClock('in')}
          >
            {busy && status === 'out' ? 'Clocking in…' : 'Clock In'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 w-full sm:w-auto sm:min-w-[10rem]"
            disabled={busy || status === 'out' || !todayRow}
            onClick={() => void handleClock('out')}
          >
            {busy && status === 'in' ? 'Clocking out…' : 'Clock Out'}
          </Button>
        </div>

        {!profileLoading && (!teacher || !schoolId) ? (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
            No teacher profile / school assignment found for {user?.email ?? 'this account'}.
            Ask an admin to create your teacher record and assign a school.
          </p>
        ) : null}
        {message ? (
          <p
            className={`mt-4 rounded-lg px-3 py-2 text-sm ${
              messageTone === 'error'
                ? 'bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-200'
                : messageTone === 'warn'
                  ? 'bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-100'
                  : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-100'
            }`}
          >
            {message}
          </p>
        ) : null}
      </Card>

      {/* Information section — below current status */}
      <section
        className="w-full rounded-xl border border-sky-200/80 bg-sky-50/70 px-4 py-4 dark:border-sky-500/25 dark:bg-sky-500/10 sm:px-5"
        aria-labelledby="clock-location-info-heading"
      >
        <div className="flex gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky-100 text-sky-700 ring-1 ring-sky-200/80 dark:bg-sky-500/20 dark:text-sky-200 dark:ring-sky-500/30">
            <IconInfo className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p
              id="clock-location-info-heading"
              className="text-sm font-semibold text-sky-950 dark:text-sky-50"
            >
              Why location is required
            </p>
            <p className="mt-1 text-sm leading-relaxed text-sky-900/80 dark:text-sky-100/85">
              Administrators verify that teachers clock in from the assigned school campus. When the
              browser asks for location, choose <strong>Allow</strong>.
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-sky-900/75 dark:text-sky-100/75">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-sky-500" aria-hidden />
                Use Chrome/Edge on localhost or HTTPS
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-sky-500" aria-hidden />
                Address bar lock icon → Site settings → Location → Allow
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-sky-500" aria-hidden />
                You can still clock in if GPS is blocked; admins will see that GPS was not granted
              </li>
            </ul>
            {!gpsOk && location ? (
              <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-xs text-sky-900/80 ring-1 ring-sky-200/60 dark:bg-slate-900/40 dark:text-sky-100/80 dark:ring-sky-500/20">
                Current GPS status: {location}
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

export function TeacherStudentsPage() {
  const { schoolId } = useTeacherContext();
  const [list, setList] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: '',
    gender: '' as '' | Student['gender'],
    classGrade: '',
    section: '',
    parentName: '',
    parentPhone: '',
  });

  async function refreshList() {
    const data = await listStudents(schoolId ? { schoolId } : undefined);
    setList(data);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listStudents(schoolId ? { schoolId } : undefined);
        if (!cancelled) setList(data);
      } catch (e) {
        if (!cancelled) setLoadError(apiErrorMessage(e, 'Failed to load students'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  function openAdd() {
    setForm({
      name: '',
      gender: '',
      classGrade: '',
      section: '',
      parentName: '',
      parentPhone: '',
    });
    setFormError(null);
    setAddOpen(true);
  }

  function closeAdd() {
    if (busy) return;
    setAddOpen(false);
    setFormError(null);
  }

  async function handleAddSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!schoolId) {
      setFormError('No school assigned to your account. Ask an admin to link your teacher profile.');
      return;
    }
    const name = form.name.trim();
    const classGrade = form.classGrade.trim();
    const section = form.section.trim().toUpperCase();
    const parentName = form.parentName.trim();
    const parentPhone = form.parentPhone.trim();
    if (!name) {
      setFormError('Enter student name.');
      return;
    }
    if (!form.gender) {
      setFormError('Select gender.');
      return;
    }
    if (!classGrade) {
      setFormError('Enter class (e.g. 7).');
      return;
    }
    if (!section) {
      setFormError('Enter section (e.g. A).');
      return;
    }
    if (!parentName) {
      setFormError('Enter parent name.');
      return;
    }
    if (!parentPhone || parentPhone.replace(/\D/g, '').length < 10) {
      setFormError('Enter a valid 10-digit parent phone.');
      return;
    }

    setBusy(true);
    setFormError(null);
    try {
      const created = await createStudent({
        name,
        gender: form.gender,
        classGrade,
        section,
        parentName,
        parentPhone,
        schoolId,
        status: 'active',
        studentId: `STU-${Date.now().toString().slice(-8)}`,
      });
      setList((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setAddOpen(false);
      try {
        await refreshList();
      } catch {
        // list already updated optimistically
      }
    } catch (e) {
      setFormError(apiErrorMessage(e, 'Failed to add student'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Student Management"
        description="Add, view and manage students for your school. Students do not have login accounts."
        actions={
          <Button type="button" variant="primary" onClick={openAdd} disabled={!schoolId && !loading}>
            Add Student
          </Button>
        }
      />
      {loadError ? <p className="mb-4 text-sm text-rose-600">{loadError}</p> : null}
      {!schoolId && !loading ? (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          Your account is not linked to a school. Contact an admin before adding students.
        </p>
      ) : null}

      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading students…</p>
        ) : list.length === 0 ? (
          <EmptyState message="No data found">
            <Button type="button" variant="primary" onClick={openAdd} disabled={!schoolId}>
              Add first student
            </Button>
          </EmptyState>
        ) : (
          <DataTable
            headers={[
              'Student ID',
              'Name',
              'Gender',
              'Class',
              'Section',
              'Parent',
              'Phone',
              'Status',
            ]}
          >
            {list.map((student) => (
              <tr key={student.id}>
                <Td>{student.studentId}</Td>
                <Td className="font-medium text-slate-900 dark:text-slate-100">{student.name}</Td>
                <Td>{student.gender}</Td>
                <Td>{student.classGrade}</Td>
                <Td>{student.section}</Td>
                <Td>{student.parentName}</Td>
                <Td className="tabular-nums">{student.parentPhone}</Td>
                <Td>
                  <Badge tone={student.status === 'active' ? 'success' : 'neutral'}>
                    {student.status}
                  </Badge>
                </Td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>

      <Modal
        open={addOpen}
        onClose={closeAdd}
        title="Add student"
        description="Register an active student for your assigned school."
      >
        <form noValidate onSubmit={(e) => void handleAddSubmit(e)} className="grid gap-3 px-5 py-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormField id="stu-name" label="Student name" required>
              <Input
                id="stu-name"
                value={form.name}
                disabled={busy}
                placeholder="Full name"
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </FormField>
          </div>
          <FormField id="stu-gender" label="Gender" required>
            <select
              id="stu-gender"
              className="field-control w-full"
              value={form.gender}
              disabled={busy}
              onChange={(e) =>
                setForm((f) => ({ ...f, gender: e.target.value as Student['gender'] | '' }))
              }
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </FormField>
          <FormField id="stu-class" label="Class" required>
            <Input
              id="stu-class"
              value={form.classGrade}
              disabled={busy}
              placeholder="e.g. 7"
              onChange={(e) => setForm((f) => ({ ...f, classGrade: e.target.value }))}
            />
          </FormField>
          <FormField id="stu-section" label="Section" required>
            <Input
              id="stu-section"
              value={form.section}
              disabled={busy}
              placeholder="e.g. A"
              onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
            />
          </FormField>
          <FormField id="stu-parent" label="Parent name" required>
            <Input
              id="stu-parent"
              value={form.parentName}
              disabled={busy}
              onChange={(e) => setForm((f) => ({ ...f, parentName: e.target.value }))}
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField id="stu-phone" label="Parent phone" required>
              <Input
                id="stu-phone"
                value={form.parentPhone}
                disabled={busy}
                inputMode="tel"
                placeholder="10-digit mobile"
                onChange={(e) => setForm((f) => ({ ...f, parentPhone: e.target.value }))}
              />
            </FormField>
          </div>
          {formError ? (
            <p className="sm:col-span-2 text-sm text-rose-600 dark:text-rose-400">{formError}</p>
          ) : null}
          <div className="sm:col-span-2 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button type="button" variant="ghost" disabled={busy} onClick={closeAdd}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={busy || !schoolId}>
              {busy ? 'Saving…' : 'Save student'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function TeacherAdmissionPage() {
  const { schoolId } = useTeacherContext();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!schoolId) {
      setError('No school assigned to your account.');
      return;
    }
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      await createStudent({
        name: String(form.get('name') ?? '').trim(),
        gender: String(form.get('gender') ?? 'Other') as Student['gender'],
        classGrade: String(form.get('class') ?? '').trim(),
        section: String(form.get('section') ?? '').trim(),
        parentName: String(form.get('parent') ?? '').trim(),
        parentPhone: String(form.get('phone') ?? '').trim(),
        schoolId,
        status: 'active',
        studentId: `STU-${Date.now()}`,
      });
      formEl.reset();
      setDone(true);
    } catch (e) {
      setError(apiErrorMessage(e, 'Failed to register student'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New Student Admission"
        description="Register a newly joined student for your assigned school."
      />
      <Card className="max-w-xl">
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <FormField id="adm-name" label="Student name" required>
            <Input id="adm-name" name="name" required placeholder="Full name" />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="adm-gender" label="Gender" required>
              <select id="adm-gender" name="gender" className="field-control w-full" required>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </FormField>
            <FormField id="adm-class" label="Class" required>
              <Input id="adm-class" name="class" required placeholder="e.g. 7" />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="adm-section" label="Section" required>
              <Input id="adm-section" name="section" required placeholder="e.g. A" />
            </FormField>
            <FormField id="adm-parent" label="Parent name" required>
              <Input id="adm-parent" name="parent" required />
            </FormField>
          </div>
          <FormField id="adm-phone" label="Parent phone" required>
            <Input id="adm-phone" name="phone" required inputMode="tel" placeholder="10-digit" />
          </FormField>
          <Button type="submit" variant="primary" disabled={busy}>
            Register Student
          </Button>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {done ? (
            <p className="text-sm text-emerald-700">Student registered successfully.</p>
          ) : null}
        </form>
      </Card>
    </div>
  );
}

export function TeacherAttendancePage() {
  const { schoolId, teacher } = useTeacherContext();
  const [list, setList] = useState<Student[]>([]);
  const [classGrade, setClassGrade] = useState('');
  const [section, setSection] = useState('');
  const [marks, setMarks] = useState<Record<string, 'P' | 'A'>>({});
  const [submitted, setSubmitted] = useState(false);
  const [existingSessionId, setExistingSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unmarked' | 'P' | 'A'>('all');
  const [listLoading, setListLoading] = useState(true);
  const today = localDateKey();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setListLoading(true);
      try {
        const data = await listStudents(schoolId ? { schoolId } : undefined);
        if (!cancelled) setList(data.filter((s) => s.status === 'active'));
      } catch (e) {
        if (!cancelled) setError(apiErrorMessage(e, 'Failed to load students'));
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  /** Unique class-section cohorts, preferring teacher’s assigned grades first. */
  const cohorts = useMemo(() => {
    const map = new Map<string, { classGrade: string; section: string; count: number }>();
    for (const s of list) {
      const grade = String(s.classGrade).trim();
      const sec = s.section.trim().toUpperCase() || 'A';
      if (!grade) continue;
      const key = `${grade}::${sec}`;
      const prev = map.get(key);
      if (prev) prev.count += 1;
      else map.set(key, { classGrade: grade, section: sec, count: 1 });
    }
    for (const raw of teacher?.assignedClasses ?? []) {
      const token = String(raw).trim();
      if (!token) continue;
      const match = token.match(/^(\d+)\s*[-–]?\s*([A-Za-z])?$/);
      if (match) {
        const grade = match[1];
        const sec = (match[2] ?? 'A').toUpperCase();
        const key = `${grade}::${sec}`;
        if (!map.has(key)) map.set(key, { classGrade: grade, section: sec, count: 0 });
      } else if (!map.has(`${token}::A`)) {
        map.set(`${token}::A`, { classGrade: token, section: 'A', count: 0 });
      }
    }
    const assigned = new Set(
      (teacher?.assignedClasses ?? []).map((c) => String(c).replace(/\D/g, '') || String(c)),
    );
    return [...map.values()].sort((a, b) => {
      const aPri = assigned.has(a.classGrade) ? 0 : 1;
      const bPri = assigned.has(b.classGrade) ? 0 : 1;
      if (aPri !== bPri) return aPri - bPri;
      const g = a.classGrade.localeCompare(b.classGrade, undefined, { numeric: true });
      if (g !== 0) return g;
      return a.section.localeCompare(b.section);
    });
  }, [list, teacher?.assignedClasses]);

  const classOptions = useMemo(() => {
    const grades = new Set(cohorts.map((c) => c.classGrade));
    return [...grades].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [cohorts]);

  const sectionOptions = useMemo(() => {
    if (!classGrade) return [] as string[];
    return cohorts
      .filter((c) => c.classGrade === classGrade)
      .map((c) => c.section)
      .sort((a, b) => a.localeCompare(b));
  }, [cohorts, classGrade]);

  // Default first cohort once data is ready
  useEffect(() => {
    if (classGrade || !cohorts.length) return;
    setClassGrade(cohorts[0].classGrade);
    setSection(cohorts[0].section);
  }, [cohorts, classGrade]);

  // Keep section valid when class changes
  useEffect(() => {
    if (!classGrade || !sectionOptions.length) return;
    if (!sectionOptions.includes(section)) {
      setSection(sectionOptions[0]);
    }
  }, [classGrade, section, sectionOptions]);

  const classStudents = useMemo(
    () =>
      list
        .filter(
          (s) =>
            s.classGrade === classGrade &&
            s.section.trim().toUpperCase() === section.trim().toUpperCase(),
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [list, classGrade, section],
  );

  const presentCount = Object.values(marks).filter((m) => m === 'P').length;
  const absentCount = Object.values(marks).filter((m) => m === 'A').length;
  const markedCount = presentCount + absentCount;
  const unmarkedCount = classStudents.filter((s) => !marks[s.id]).length;
  const total = classStudents.length;
  const progressPct = total ? Math.round((markedCount / total) * 100) : 0;

  const visibleStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return classStudents.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q) && !s.studentId.toLowerCase().includes(q)) {
        return false;
      }
      const m = marks[s.id];
      if (filter === 'unmarked') return !m;
      if (filter === 'P') return m === 'P';
      if (filter === 'A') return m === 'A';
      return true;
    });
  }, [classStudents, search, filter, marks]);

  async function loadExistingSession(nextClass: string, nextSection: string) {
    if (!schoolId || !nextClass) return;
    setChecking(true);
    setError(null);
    setSuccess(null);
    try {
      const sessions = await listStudentAttendanceSessions({
        schoolId,
        classGrade: nextClass,
        section: nextSection,
        date: today,
      });
      const existing = sessions[0] ?? null;
      if (existing) {
        const nextMarks: Record<string, 'P' | 'A'> = {};
        for (const mark of existing.marks) {
          nextMarks[mark.studentId] = mark.status;
        }
        setMarks(nextMarks);
        setExistingSessionId(existing.id);
        setSubmitted(true);
      } else {
        setMarks({});
        setExistingSessionId(null);
        setSubmitted(false);
      }
    } catch (e) {
      setError(apiErrorMessage(e, 'Failed to check existing attendance'));
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (!classGrade || !section) return;
    void loadExistingSession(classGrade, section);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when class context or date changes
  }, [classGrade, section, schoolId, today]);

  function selectClass(grade: string) {
    setClassGrade(grade);
    setSearch('');
    setFilter('all');
    const sections = cohorts
      .filter((c) => c.classGrade === grade)
      .map((c) => c.section)
      .sort((a, b) => a.localeCompare(b));
    setSection(sections[0] ?? 'A');
  }

  function selectSection(sec: string) {
    setSection(sec);
    setSearch('');
    setFilter('all');
  }

  function markStudent(id: string, status: 'P' | 'A') {
    if (submitted) return;
    setMarks((m) => ({ ...m, [id]: status }));
    setError(null);
  }

  function markAll(status: 'P' | 'A') {
    if (submitted || !classStudents.length) return;
    const next: Record<string, 'P' | 'A'> = { ...marks };
    for (const s of classStudents) next[s.id] = status;
    setMarks(next);
    setError(null);
    setFilter('all');
  }

  function markUnmarked(status: 'P' | 'A') {
    if (submitted) return;
    const next: Record<string, 'P' | 'A'> = { ...marks };
    for (const s of classStudents) {
      if (!next[s.id]) next[s.id] = status;
    }
    setMarks(next);
    setError(null);
  }

  function clearMarks() {
    if (submitted) return;
    setMarks({});
    setError(null);
  }

  async function submitAttendance() {
    if (!schoolId || !teacher) {
      setError('Missing school or teacher profile.');
      return;
    }
    if (!classStudents.length) {
      setError('No students in this class / section.');
      return;
    }
    if (unmarkedCount > 0) {
      setError(`Mark all students first (${unmarkedCount} remaining).`);
      setFilter('unmarked');
      return;
    }

    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await createStudentAttendanceSession({
        schoolId,
        classGrade,
        section,
        date: today,
        teacherId: teacher.id,
        teacherName: teacher.name,
        marks: classStudents.map((s) => ({
          studentId: s.id,
          status: marks[s.id],
        })),
      });
      setExistingSessionId(created.id);
      setSubmitted(true);
      setSuccess(`Attendance submitted for Class ${classGrade}-${section}.`);
    } catch (e) {
      setError(apiErrorMessage(e, 'Failed to submit attendance'));
      await loadExistingSession(classGrade, section);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full space-y-4 sm:space-y-5">
      <PageHeader
        title="Student Attendance"
        description={`Mark present / absent for your class, then submit once for ${today}.`}
        actions={
          total > 0 ? (
            <TableSearch value={search} onChange={setSearch} placeholder="Search student…" />
          ) : null
        }
      />

      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
          {success}
        </p>
      ) : null}

      {/* Filters — admin attendance title format, clean Class + Section selects */}
      <Card className="w-full" padding="lg">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[0.95rem] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              Filters
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Choose class and section to load today’s roll call
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {submitted ? <Badge tone="success">Submitted today</Badge> : null}
            {checking ? <Badge tone="neutral">Loading…</Badge> : null}
            {!submitted && classGrade && section ? (
              <Badge tone="info">
                Class {classGrade}-{section}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="grid min-w-[10rem] flex-1 gap-1.5 sm:max-w-xs">
            <span className="text-[0.95rem] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              Class
            </span>
            <select
              className="field-control"
              value={classGrade}
              disabled={listLoading || classOptions.length === 0}
              onChange={(e) => selectClass(e.target.value)}
            >
              <option value="">Select class</option>
              {classOptions.map((grade) => (
                <option key={grade} value={grade}>
                  Class {grade}
                </option>
              ))}
            </select>
          </label>

          <label className="grid min-w-[10rem] flex-1 gap-1.5 sm:max-w-xs">
            <span className="text-[0.95rem] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              Section
            </span>
            <select
              className="field-control"
              value={section}
              disabled={!classGrade || sectionOptions.length === 0}
              onChange={(e) => selectSection(e.target.value)}
            >
              <option value="">Select section</option>
              {sectionOptions.map((sec) => (
                <option key={sec} value={sec}>
                  Section {sec}
                </option>
              ))}
            </select>
          </label>

          <label className="grid min-w-[10rem] gap-1.5">
            <span className="text-[0.95rem] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              Date
            </span>
            <input type="date" className="field-control" value={today} readOnly />
          </label>
        </div>
      </Card>

      {/* KPI cards */}
      <div className="grid w-full gap-3 grid-cols-1 sm:grid-cols-3">
        <StatCard
          label="Present"
          value={presentCount}
          hint={total ? `${total} on roll` : 'Select a class'}
          accent="emerald"
          icon={<IconCheck className="h-4 w-4" />}
        />
        <StatCard
          label="Absent"
          value={absentCount}
          hint={unmarkedCount ? `${unmarkedCount} unmarked` : 'All marked'}
          accent="rose"
          icon={<IconUsers className="h-4 w-4" />}
        />
        <StatCard
          label="Progress"
          value={total ? `${progressPct}%` : '—'}
          hint={`${markedCount}/${total || 0} marked`}
          accent="brand"
          icon={<IconClipboard className="h-4 w-4" />}
        />
      </div>

      {total > 0 ? (
        <Card padding="md">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[0.95rem] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              Marking progress
            </p>
            <p className="text-xs text-slate-500">
              {unmarkedCount === 0 ? 'Ready to submit' : `${unmarkedCount} remaining`}
            </p>
          </div>
          <ProgressBar value={progressPct} variant="logo" />
        </Card>
      ) : null}

      {/* Class roll */}
      <Card padding="none" className="w-full overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-[0.95rem] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Class roll
                {classGrade && section ? (
                  <span className="font-medium text-slate-500">
                    {' '}
                    · {classGrade}-{section}
                  </span>
                ) : null}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Present (green) · Absent (red) · Submit once when every student is marked
              </p>
            </div>

            {total > 0 ? (
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 dark:border-slate-600 dark:bg-slate-800">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'unmarked', label: 'Open' },
                    { id: 'P', label: 'Present' },
                    { id: 'A', label: 'Absent' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    className={[
                      'inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-semibold transition',
                      filter === f.id
                        ? 'border-brand-500 bg-white text-brand-700 shadow-sm dark:border-brand-400 dark:bg-slate-700 dark:text-brand-300'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
                    ].join(' ')}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {!submitted && total > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="primary" onClick={() => markAll('P')}>
                Mark all present
              </Button>
              <Button type="button" variant="outline" onClick={() => markUnmarked('P')}>
                Fill unmarked present
              </Button>
              <Button type="button" variant="outline" onClick={() => markAll('A')}>
                Mark all absent
              </Button>
              <Button type="button" variant="ghost" onClick={clearMarks}>
                Clear
              </Button>
            </div>
          ) : null}
        </div>

        {listLoading || checking ? (
          <p className="py-12 text-center text-sm text-slate-500">Loading roll…</p>
        ) : !classGrade || !section ? (
          <EmptyState message="No data found" className="min-h-[10rem] py-10" />
        ) : classStudents.length === 0 ? (
          <EmptyState message="No data found" className="min-h-[10rem] py-10" />
        ) : visibleStudents.length === 0 ? (
          <EmptyState message="No data found" className="min-h-[10rem] py-10" />
        ) : (
          <>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">
              {visibleStudents.map((student) => {
                const mark = marks[student.id];
                return (
                  <li
                    key={student.id}
                    className={[
                      'flex flex-col gap-3 px-4 py-3',
                      !mark && !submitted ? 'bg-amber-50/40 dark:bg-amber-500/5' : '',
                    ].join(' ')}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-slate-50">
                        {student.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {student.studentId} · {student.classGrade}-{student.section}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={mark === 'P' ? 'primary' : 'outline'}
                        disabled={submitted}
                        className={mark === 'P' ? '!bg-emerald-600 hover:!bg-emerald-500' : ''}
                        onClick={() => markStudent(student.id, 'P')}
                      >
                        Present
                      </Button>
                      <Button
                        type="button"
                        variant={mark === 'A' ? 'destructive' : 'outline'}
                        disabled={submitted}
                        onClick={() => markStudent(student.id, 'A')}
                      >
                        Absent
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="hidden md:block">
              <DataTable headers={['Student', 'ID', 'Class', 'Attendance']}>
                {visibleStudents.map((student) => {
                  const mark = marks[student.id];
                  return (
                    <tr key={student.id}>
                      <Td className="font-medium text-slate-900 dark:text-slate-100">
                        {student.name}
                      </Td>
                      <Td className="tabular-nums text-slate-500">{student.studentId}</Td>
                      <Td>
                        {student.classGrade}-{student.section}
                      </Td>
                      <Td>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant={mark === 'P' ? 'primary' : 'outline'}
                            disabled={submitted}
                            className={[
                              '!h-9 !px-3 text-xs',
                              mark === 'P' ? '!bg-emerald-600 hover:!bg-emerald-500' : '',
                            ].join(' ')}
                            onClick={() => markStudent(student.id, 'P')}
                          >
                            Present
                          </Button>
                          <Button
                            type="button"
                            variant={mark === 'A' ? 'destructive' : 'outline'}
                            disabled={submitted}
                            className="!h-9 !px-3 text-xs"
                            onClick={() => markStudent(student.id, 'A')}
                          >
                            Absent
                          </Button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </DataTable>
            </div>
          </>
        )}

        {!submitted && total > 0 ? (
          <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/40 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                P {presentCount}
              </span>
              <span className="mx-2 text-slate-300">·</span>
              <span className="font-semibold text-rose-700 dark:text-rose-300">
                A {absentCount}
              </span>
              <span className="mx-2 text-slate-300">·</span>
              {unmarkedCount > 0 ? `${unmarkedCount} open` : 'Ready to submit'}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              {unmarkedCount > 0 ? (
                <Button type="button" variant="outline" onClick={() => markUnmarked('P')}>
                  Rest present
                </Button>
              ) : null}
              <Button
                type="button"
                variant="primary"
                disabled={busy || unmarkedCount > 0 || !schoolId || !teacher}
                onClick={() => void submitAttendance()}
              >
                {busy ? 'Submitting…' : 'Submit attendance'}
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      {submitted ? (
        <section
          className="w-full rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-4 dark:border-emerald-500/25 dark:bg-emerald-500/10 sm:px-5"
          aria-labelledby="attendance-locked-heading"
        >
          <div className="flex gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/80 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-500/30">
              <IconCheck className="h-4 w-4" />
            </span>
            <div>
              <p
                id="attendance-locked-heading"
                className="text-sm font-semibold text-emerald-950 dark:text-emerald-50"
              >
                Attendance locked for Class {classGrade}-{section}
              </p>
              <p className="mt-1 text-sm text-emerald-900/80 dark:text-emerald-100/85">
                Submitted for {today}
                {existingSessionId ? ` · Session ${existingSessionId}` : ''}. Contact an admin if a
                correction is needed. Choose another class in Filters to continue.
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function TeacherTeachingLogPage() {
  const { schoolId, teacher } = useTeacherContext();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!schoolId || !teacher) {
      setError('Missing school or teacher profile.');
      return;
    }
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    setBusy(true);
    setError(null);
    try {
      await createTeachingLog({
        teacherId: teacher.id,
        schoolId,
        classGrade: String(form.get('class') ?? '').trim(),
        section: String(form.get('section') ?? '').trim(),
        subject: String(form.get('subject') ?? '').trim(),
        topic: String(form.get('topic') ?? '').trim(),
        durationMinutes: Number(form.get('duration') ?? 0) || 0,
        remarks: String(form.get('remarks') ?? '').trim(),
        date: localDateKey(),
      });
      formEl.reset();
      setSaved(true);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to save teaching log'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Daily Teaching Log"
        description="Record class, subject, topic, duration and remarks."
      />
      <Card className="max-w-xl">
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="log-class" label="Class" required>
              <Input id="log-class" name="class" required placeholder="7" />
            </FormField>
            <FormField id="log-section" label="Section" required>
              <Input id="log-section" name="section" required placeholder="A" />
            </FormField>
          </div>
          <FormField id="log-subject" label="Subject" required>
            <Input id="log-subject" name="subject" required placeholder="Computer basics" />
          </FormField>
          <FormField id="log-topic" label="Today's topic" required>
            <Input id="log-topic" name="topic" required placeholder="MS Paint tools" />
          </FormField>
          <FormField id="log-duration" label="Duration (minutes)" required>
            <Input id="log-duration" name="duration" type="number" required placeholder="40" />
          </FormField>
          <FormField id="log-remarks" label="Remarks">
            <textarea
              id="log-remarks"
              name="remarks"
              className="field-control min-h-24 w-full"
              placeholder="Optional notes"
            />
          </FormField>
          <Button type="submit" variant="primary" disabled={busy}>
            Submit Log
          </Button>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {saved ? <p className="text-sm text-emerald-700">Teaching log saved.</p> : null}
        </form>
      </Card>
    </div>
  );
}

export function TeacherSyllabusPage() {
  const { schoolId, teacher } = useTeacherContext();
  const [schoolName, setSchoolName] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!schoolId) return;
      try {
        const school = await getSchool(schoolId);
        if (!cancelled) setSchoolName(school.name);
      } catch {
        if (!cancelled) setSchoolName('');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!schoolId || !teacher) {
      setError('Missing school or teacher profile.');
      return;
    }
    const form = new FormData(e.currentTarget);
    const completedPct = Number(form.get('pct') ?? 0) || 0;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await createSyllabus({
        schoolId,
        schoolName: schoolName || schoolId,
        teacherId: teacher.id,
        teacherName: teacher.name,
        classLabel: String(form.get('classLabel') ?? '7-A').trim() || '7-A',
        subject: String(form.get('chapter') ?? '').trim(),
        topic: String(form.get('topic') ?? '').trim(),
        completedPct,
        topicsDone: Math.round(completedPct / 4),
        topicsTotal: 25,
      });
      setSaved(true);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to update syllabus'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Syllabus Progress"
        description="Update chapter, topic and completion percentage for your classes."
      />
      <Card className="max-w-xl">
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <FormField id="syl-class" label="Class label" required>
            <Input id="syl-class" name="classLabel" required placeholder="7-A" />
          </FormField>
          <FormField id="syl-chapter" label="Chapter" required>
            <Input id="syl-chapter" name="chapter" required placeholder="Unit 3 · Graphics" />
          </FormField>
          <FormField id="syl-topic" label="Topic" required>
            <Input id="syl-topic" name="topic" required placeholder="Paint brush tools" />
          </FormField>
          <FormField id="syl-pct" label="Completion %" required>
            <Input
              id="syl-pct"
              name="pct"
              type="number"
              min={0}
              max={100}
              required
              placeholder="72"
            />
          </FormField>
          <Button type="submit" variant="primary" disabled={busy}>
            Update Progress
          </Button>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {saved ? (
            <p className="text-sm text-emerald-700">Syllabus progress updated.</p>
          ) : null}
        </form>
      </Card>
    </div>
  );
}

export function TeacherLeavePage() {
  const { user } = useAuth();
  const { schoolId, teacher } = useTeacherContext();
  const [school, setSchool] = useState<School | null>(null);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [panel, setPanel] = useState<'request' | 'balance' | 'history'>('request');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: 'Casual',
    fromDate: '',
    toDate: '',
    reason: '',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [leavesData, schoolData] = await Promise.all([
          listLeaves(teacher?.id ? { teacherId: teacher.id } : undefined),
          schoolId ? getSchool(schoolId) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setHistory(
          leavesData
            .filter((l) => !teacher || l.teacherId === teacher.id)
            .sort((a, b) => b.fromDate.localeCompare(a.fromDate)),
        );
        setSchool(schoolData);
      } catch (e) {
        if (!cancelled) setError(apiErrorMessage(e, 'Failed to load leaves'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [teacher, schoolId]);

  const stats = useMemo(() => computeLeaveStats(history), [history]);
  const myRequests = history.filter((l) => l.status === 'Pending');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.fromDate || !form.toDate || !form.reason.trim()) return;
    if (!teacher) {
      setError('Teacher profile not found.');
      return;
    }
    setError(null);
    try {
      const created = await createLeave({
        teacherId: teacher.id,
        teacherName: teacher.name ?? user?.name ?? 'Teacher',
        type: form.type,
        fromDate: form.fromDate,
        toDate: form.toDate,
        reason: form.reason.trim(),
        status: 'Pending',
      });
      setHistory((prev) => [created, ...prev]);
      setForm({ type: 'Casual', fromDate: '', toDate: '', reason: '' });
      setSent(true);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to submit leave'));
    }
  };

  const tabs: { id: typeof panel; label: string; count?: number }[] = [
    { id: 'request', label: 'New request' },
    { id: 'balance', label: 'Leave balance' },
    { id: 'history', label: 'Leave history', count: history.length },
  ];

  return (
    <div>
      <PageHeader
        title="My leave"
        description={`${teacher?.name ?? 'Teacher'} · ${school?.name ?? 'School'} · track balance, requests and history`}
      />
      {error ? <p className="mb-4 text-sm text-rose-600">{error}</p> : null}

      <section className="mb-5 overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white dark:border-slate-700">
        <div className="grid gap-px sm:grid-cols-3">
          {[
            { label: 'Total leaves', value: stats.total, hint: 'Annual allotment' },
            { label: 'Used leaves', value: stats.used, hint: 'Approved days' },
            {
              label: 'Balance leaves',
              value: stats.balance,
              hint: stats.pendingDays
                ? `${stats.pendingDays} day(s) pending`
                : 'Available to request',
            },
          ].map((m, i) => (
            <div
              key={m.label}
              className={`bg-white/5 px-5 py-5 ${i > 0 ? 'sm:border-l sm:border-white/10' : ''}`}
            >
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {m.label}
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{m.value}</p>
              <p className="mt-1 text-xs text-slate-400">{m.hint}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mb-4 inline-flex flex-wrap rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-700 dark:bg-slate-800/80">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setPanel(tab.id)}
            className={[
              'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition',
              panel === tab.id
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
            ].join(' ')}
          >
            {tab.label}
            {typeof tab.count === 'number' ? (
              <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[0.65rem] font-bold tabular-nums text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {tab.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {panel === 'request' ? (
        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3" padding="lg">
            <SectionTitle>Submit leave request</SectionTitle>
            <form className="mt-3 space-y-4" noValidate onSubmit={(e) => void handleSubmit(e)}>
              <FormField id="lv-type" label="Leave type" required>
                <select
                  id="lv-type"
                  className="field-control w-full"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  required
                >
                  {LEAVE_TYPES.map((type) => {
                    const remaining =
                      stats.byType.find((b) => b.type === type)?.remaining ?? 0;
                    return (
                      <option key={type} value={type}>
                        {type} ({remaining} days left)
                      </option>
                    );
                  })}
                </select>
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField id="lv-from" label="From date" required>
                  <Input
                    id="lv-from"
                    type="date"
                    required
                    value={form.fromDate}
                    onChange={(e) => setForm((f) => ({ ...f, fromDate: e.target.value }))}
                  />
                </FormField>
                <FormField id="lv-to" label="To date" required>
                  <Input
                    id="lv-to"
                    type="date"
                    required
                    value={form.toDate}
                    onChange={(e) => setForm((f) => ({ ...f, toDate: e.target.value }))}
                  />
                </FormField>
              </div>
              <FormField id="lv-reason" label="Reason" required>
                <textarea
                  id="lv-reason"
                  className="field-control min-h-24 w-full"
                  required
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="Brief reason for leave"
                />
              </FormField>
              <Button type="submit" variant="primary">
                Submit for approval
              </Button>
              {sent ? (
                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                  Request submitted. Track it under leave requests / history.
                </p>
              ) : null}
            </form>
          </Card>

          <Card className="lg:col-span-2" padding="lg">
            <SectionTitle>Your leave requests</SectionTitle>
            <p className="mt-1 text-xs text-slate-500">
              Pending applications awaiting admin approval.
            </p>
            {myRequests.length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="mt-4 space-y-3">
                {myRequests.map((leave) => (
                  <li
                    key={leave.id}
                    className="rounded-xl border border-amber-200/70 bg-amber-50/50 px-3 py-3 dark:border-amber-500/25 dark:bg-amber-500/10"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                        {leave.type}
                      </span>
                      <Badge tone="warning">Pending</Badge>
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-50">
                      {leave.fromDate} → {leave.toDate}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{leave.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : null}

      {panel === 'balance' ? (
        <section>
          <h3 className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
            View leave balance
          </h3>
          <p className="mb-4 text-xs text-slate-500">
            Balance = total − used (approved) − pending reserved days.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {stats.byType.map((row) => (
              <Card key={row.type} padding="lg">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {row.type}
                </p>
                <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                  {row.remaining}
                </p>
                <p className="text-sm text-slate-500">days balance</p>
                <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center text-xs dark:border-slate-800">
                  <div>
                    <dt className="text-slate-400">Total</dt>
                    <dd className="mt-0.5 font-semibold">{row.allotted}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Used</dt>
                    <dd className="mt-0.5 font-semibold">{row.used}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Pending</dt>
                    <dd className="mt-0.5 font-semibold text-amber-700 dark:text-amber-400">
                      {row.pending}
                    </dd>
                  </div>
                </dl>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {panel === 'history' ? (
        <section>
          <h3 className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
            Leave history
          </h3>
          <p className="mb-4 text-xs text-slate-500">All requests for your account, newest first.</p>
          <Card padding="none" className="overflow-hidden">
            <DataTable headers={['Type', 'From', 'To', 'Days', 'Reason', 'Status']}>
              {history.length === 0 ? (
                <DataTableEmpty colSpan={6} />
              ) : (
                history.map((leave) => (
                  <tr key={leave.id}>
                    <Td className="font-medium text-slate-900 dark:text-slate-100">
                      {leave.type}
                    </Td>
                    <Td>{leave.fromDate}</Td>
                    <Td>{leave.toDate}</Td>
                    <Td className="tabular-nums">
                      {leaveDayCount(leave.fromDate, leave.toDate)}
                    </Td>
                    <Td className="max-w-[14rem]">
                      <span className="line-clamp-2">{leave.reason}</span>
                    </Td>
                    <Td>
                      <Badge tone={leaveStatusTone(leave.status)}>{leave.status}</Badge>
                    </Td>
                  </tr>
                ))
              )}
            </DataTable>
          </Card>
        </section>
      ) : null}
    </div>
  );
}

export function TeacherAssetsPage() {
  const { schoolId } = useTeacherContext();
  const [schoolAssets, setSchoolAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listAssets(schoolId ? { schoolId } : undefined);
        if (!cancelled) setSchoolAssets(data);
      } catch (e) {
        if (!cancelled) setLoadError(apiErrorMessage(e, 'Failed to load assets'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  return (
    <div>
      <PageHeader
        title="Asset Verification"
        description="View assets assigned to your school. Report issues via support tickets."
      />
      {loadError ? <p className="mb-4 text-sm text-rose-600">{loadError}</p> : null}
      <Card>
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading assets…</p>
        ) : (
          <DataTable headers={['Type', 'Quantity', 'Status', 'Warranty']}>
            {schoolAssets.map((asset) => (
              <tr key={asset.id}>
                <Td className="font-medium text-slate-900">{asset.type}</Td>
                <Td>{asset.quantity}</Td>
                <Td>
                  <Badge
                    tone={
                      asset.workingStatus === 'Working'
                        ? 'success'
                        : asset.workingStatus === 'Needs Repair'
                          ? 'warning'
                          : 'danger'
                    }
                  >
                    {asset.workingStatus}
                  </Badge>
                </Td>
                <Td>{asset.warranty}</Td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
    </div>
  );
}

export function TeacherTicketsPage() {
  const { user } = useAuth();
  const { schoolId } = useTeacherContext();
  const [mine, setMine] = useState<SupportTicket[]>([]);
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issueType, setIssueType] = useState('Hardware');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listTickets(schoolId ? { schoolId } : undefined);
        if (!cancelled) setMine(data);
      } catch (e) {
        if (!cancelled) setError(apiErrorMessage(e, 'Failed to load tickets'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  async function submitTicket() {
    if (!schoolId) {
      setError('No school assigned.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const typeMap: Record<string, SupportTicket['type']> = {
        'Computer Issue': 'Hardware',
        'CPU Issue': 'Hardware',
        'Keyboard Issue': 'Hardware',
        'Mouse Issue': 'Hardware',
        'Software Issue': 'Software',
        'Internet Issue': 'Internet',
      };
      const created = await createTicket({
        type: typeMap[issueType] ?? 'Others',
        status: 'Open',
        schoolId,
        raisedBy: user?.name ?? 'Teacher',
        description: description.trim() || issueType,
        createdAt: localDateKey(),
      });
      setMine((prev) => [created, ...prev]);
      setDone(true);
    } catch (e) {
      setError(apiErrorMessage(e, 'Failed to submit ticket'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Raise Support Ticket"
        description="Report computer, CPU, keyboard, mouse, software or internet issues with photo and description."
      />
      {error ? <p className="mb-4 text-sm text-rose-600">{error}</p> : null}

      <div className="mb-4 flex gap-2 text-xs font-semibold">
        {['Issue type', 'Photo', 'Description', 'Submit'].map((label, i) => (
          <span
            key={label}
            className={
              step === i + 1
                ? 'rounded-lg bg-brand-600 px-3 py-1 text-white'
                : 'rounded-lg bg-slate-100 px-3 py-1 text-slate-600'
            }
          >
            {i + 1}. {label}
          </span>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          {step === 1 ? (
            <div className="space-y-4">
              <SectionTitle>Select issue type</SectionTitle>
              <select
                className="field-control w-full"
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
              >
                <option>Computer Issue</option>
                <option>CPU Issue</option>
                <option>Keyboard Issue</option>
                <option>Mouse Issue</option>
                <option>Software Issue</option>
                <option>Internet Issue</option>
              </select>
              <Button type="button" variant="primary" onClick={() => setStep(2)}>
                Next
              </Button>
            </div>
          ) : null}
          {step === 2 ? (
            <div className="space-y-4">
              <SectionTitle>Upload photo</SectionTitle>
              <input type="file" accept="image/*" className="field-control w-full" />
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="button" variant="primary" onClick={() => setStep(3)}>
                  Next
                </Button>
              </div>
            </div>
          ) : null}
          {step === 3 ? (
            <div className="space-y-4">
              <SectionTitle>Description</SectionTitle>
              <textarea
                className="field-control min-h-28 w-full"
                placeholder="Describe the issue"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button type="button" variant="primary" onClick={() => setStep(4)}>
                  Next
                </Button>
              </div>
            </div>
          ) : null}
          {step === 4 ? (
            <div className="space-y-4">
              <SectionTitle>Submit ticket</SectionTitle>
              <p className="text-sm text-slate-600">
                Ticket will be visible to administrators for assignment and tracking.
              </p>
              {!done ? (
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setStep(3)}>
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={busy}
                    onClick={() => void submitTicket()}
                  >
                    Submit Ticket
                  </Button>
                </div>
              ) : (
                <p className="text-sm font-medium text-emerald-700">Ticket submitted.</p>
              )}
            </div>
          ) : null}
        </Card>

        <Card>
          <SectionTitle>Your school tickets</SectionTitle>
          <ul className="space-y-3">
            {mine.map((ticket) => (
              <li
                key={ticket.id}
                className="rounded-lg border border-slate-100 px-3 py-2 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-900">
                    {ticket.id.toUpperCase()} · {ticket.type}
                  </span>
                  <Badge tone="info">{ticket.status}</Badge>
                </div>
                <p className="mt-1 text-slate-500">{ticket.description}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

export function TeacherEventsPage() {
  const { schoolId } = useTeacherContext();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!schoolId) {
      setError('No school assigned.');
      return;
    }
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    setBusy(true);
    setError(null);
    try {
      await createEvent({
        schoolId,
        name: String(form.get('name') ?? '').trim(),
        date: localDateKey(),
        description: String(form.get('description') ?? '').trim(),
      });
      formEl.reset();
      setSaved(true);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to upload event'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Event Upload"
        description="Upload images with event name and description for your school."
      />
      <Card className="max-w-xl">
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <FormField id="ev-name" label="Event name" required>
            <Input id="ev-name" name="name" required placeholder="Independence Day Tech Showcase" />
          </FormField>
          <FormField id="ev-desc" label="Description" required>
            <textarea
              id="ev-desc"
              name="description"
              className="field-control min-h-24 w-full"
              required
            />
          </FormField>
          <FormField id="ev-images" label="Images" required>
            <input
              id="ev-images"
              type="file"
              accept="image/*"
              multiple
              className="field-control w-full"
            />
          </FormField>
          <Button type="submit" variant="primary" disabled={busy}>
            Upload Event
          </Button>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {saved ? <p className="text-sm text-emerald-700">Event uploaded.</p> : null}
        </form>
      </Card>
    </div>
  );
}
