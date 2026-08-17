import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input, FormField, Modal, TableSearch, TablePagination, IconActionButton } from '../../../components/ui';
import { useTablePagination } from '../../../hooks/useTablePagination';
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  ProgressBar,
  ProgressRing,
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
  IconTrash,
  IconUserPlus,
  IconUsers,
  IconX,
} from '../../../components/ui/icons';
import {
  createLeave,
  createStudent,
  createStudentAttendanceSession,
  createSyllabus,
  createTeacherAttendance,
  createTeachingLog,
  updateTeachingLog,
  createTicket,
  createEvent,
  getMyTeacherProfile,
  getSchool,
  listAssets,
  listEvents,
  listLeaves,
  listStudents,
  listStudentAttendanceSessions,
  listSyllabus,
  listTeachingLogs,
  listTickets,
  listTeacherAttendance,
  updateTeacherAttendance,
  type SyllabusRow,
  type TeacherAttendanceRow,
  type TeachingLog,
} from '../../../api';
import type {
  Asset,
  EventItem,
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
import { mergeAttendanceStudents } from '../../../data/demoAttendanceStudents';
import {
  generateTopicDescription,
  generateSyllabusSuggestion,
  generateEventCopy,
  suggestEventNames,
  suggestSyllabusTopics,
  EVENT_TYPE_OPTIONS,
  TEACHING_DURATION_PRESETS,
  TEACHING_PERIODS,
  TEACHING_SUBJECT_OPTIONS,
  type EventAssistTone,
  type EventAudience,
  type TeachingAssistTone,
} from '../../../utils/teachingAssist';

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
    if (busy) return;
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
        if (todayRow && todayRow.clockOut && todayRow.clockOut !== '—' && todayRow.hours !== 'In progress') {
          setMessageTone('warn');
          setMessage('You already completed clock-in/out for today.');
          return;
        }
        if (status === 'in') {
          setMessageTone('warn');
          setMessage('You are already clocked in.');
          return;
        }
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
            disabled={
              busy ||
              profileLoading ||
              status === 'in' ||
              !teacher ||
              !schoolId ||
              Boolean(
                todayRow &&
                  todayRow.clockOut &&
                  todayRow.clockOut !== '—' &&
                  todayRow.hours !== 'In progress',
              )
            }
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

  const studentsPagination = useTablePagination(list);

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
          <>
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
              {studentsPagination.pageItems.map((student) => (
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
          <TablePagination
            totalCount={studentsPagination.totalCount}
            page={studentsPagination.page}
            totalPages={studentsPagination.totalPages}
            rangeFrom={studentsPagination.rangeFrom}
            rangeTo={studentsPagination.rangeTo}
            onPageChange={studentsPagination.setPage}
            label="students"
          />
          </>
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
  const [listLoading, setListLoading] = useState(true);
  const today = localDateKey();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setListLoading(true);
      try {
        const data = await listStudents(schoolId ? { schoolId } : undefined);
        if (!cancelled) {
          setList(mergeAttendanceStudents(data, schoolId));
        }
      } catch (e) {
        if (!cancelled) {
          const fallback = mergeAttendanceStudents([], schoolId);
          if (fallback.length) {
            setList(fallback);
          } else {
            setError(apiErrorMessage(e, 'Failed to load students'));
          }
        }
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
            String(s.classGrade).trim() === classGrade &&
            s.section.trim().toUpperCase() === section.trim().toUpperCase(),
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [list, classGrade, section],
  );

  const presentCount = classStudents.filter((s) => marks[s.id] === 'P').length;
  const absentCount = classStudents.filter((s) => marks[s.id] === 'A').length;
  const markedCount = presentCount + absentCount;
  const unmarkedCount = classStudents.filter((s) => !marks[s.id]).length;
  const total = classStudents.length;
  const progressPct = total ? Math.round((markedCount / total) * 100) : 0;

  const visibleStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return classStudents;
    return classStudents.filter(
      (s) => s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q),
    );
  }, [classStudents, search]);

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
    const sections = cohorts
      .filter((c) => c.classGrade === grade)
      .map((c) => c.section)
      .sort((a, b) => a.localeCompare(b));
    setSection(sections[0] ?? 'A');
  }

  function selectSection(sec: string) {
    setSection(sec);
    setSearch('');
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
    if (busy || submitted) return;
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
      return;
    }

    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await createStudentAttendanceSession({
        schoolId,
        classGrade,
        section: section.trim().toUpperCase(),
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
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
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
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <TableSearch
                  value={search}
                  onChange={setSearch}
                  placeholder="Search student…"
                  className="w-full sm:w-52 md:w-56"
                />
                {!submitted ? (
                  <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
                    <IconActionButton
                      aria-label="Mark all present"
                      title="Mark all present"
                      className="hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-500/15 dark:hover:text-emerald-300"
                      onClick={() => markAll('P')}
                    >
                      <IconCheck className="h-4 w-4" />
                    </IconActionButton>
                    <IconActionButton
                      aria-label="Fill unmarked present"
                      title="Fill unmarked present"
                      className="hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-sky-500/15 dark:hover:text-sky-300"
                      onClick={() => markUnmarked('P')}
                    >
                      <IconUserPlus className="h-4 w-4" />
                    </IconActionButton>
                    <IconActionButton
                      aria-label="Mark all absent"
                      title="Mark all absent"
                      className="hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
                      onClick={() => markAll('A')}
                    >
                      <IconX className="h-4 w-4" />
                    </IconActionButton>
                    <IconActionButton
                      aria-label="Clear marks"
                      title="Clear marks"
                      className="hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                      onClick={clearMarks}
                    >
                      <IconTrash className="h-4 w-4" />
                    </IconActionButton>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
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

type PeriodDraft = {
  subject: string;
  topic: string;
  duration: string;
  remarks: string;
  existingId?: string;
};

function emptyPeriodDraft(): PeriodDraft {
  return {
    subject: 'Computer basics',
    topic: '',
    duration: '40',
    remarks: '',
  };
}

function isPresetSubject(value: string) {
  return TEACHING_SUBJECT_OPTIONS.includes(value as (typeof TEACHING_SUBJECT_OPTIONS)[number]);
}

export function TeacherTeachingLogPage() {
  const { schoolId, teacher } = useTeacherContext();
  const today = localDateKey();
  const [classGrade, setClassGrade] = useState('');
  const [section, setSection] = useState('');
  const [periods, setPeriods] = useState<PeriodDraft[]>(() =>
    TEACHING_PERIODS.map(() => emptyPeriodDraft()),
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<TeachingLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [aiBusyPeriod, setAiBusyPeriod] = useState<number | null>(null);

  const classOptions = useMemo(() => {
    const grades = new Set<string>();
    for (const raw of teacher?.assignedClasses ?? []) {
      const match = String(raw).trim().match(/^(\d+)/);
      if (match) grades.add(match[1]);
      else if (String(raw).trim()) grades.add(String(raw).trim());
    }
    return [...grades].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [teacher?.assignedClasses]);

  const sectionOptions = useMemo(() => {
    const sections = new Set<string>();
    for (const raw of teacher?.assignedClasses ?? []) {
      const match = String(raw).trim().match(/^(\d+)\s*[-–]?\s*([A-Za-z])?$/);
      if (!match) continue;
      if (classGrade && match[1] !== classGrade) continue;
      sections.add((match[2] ?? 'A').toUpperCase());
    }
    if (!sections.size) {
      sections.add('A');
      sections.add('B');
    }
    return [...sections].sort((a, b) => a.localeCompare(b));
  }, [teacher?.assignedClasses, classGrade]);

  const todayLogs = useMemo(
    () =>
      [...logs]
        .filter((row) => !row.date || row.date === today)
        .sort((a, b) => (a.period ?? 99) - (b.period ?? 99)),
    [logs, today],
  );

  const classLogs = useMemo(
    () =>
      todayLogs.filter(
        (row) =>
          row.classGrade === classGrade &&
          row.section.toUpperCase() === section.toUpperCase(),
      ),
    [todayLogs, classGrade, section],
  );

  useEffect(() => {
    if (!classGrade && classOptions[0]) setClassGrade(classOptions[0]);
  }, [classOptions, classGrade]);

  useEffect(() => {
    if (!classGrade || !sectionOptions.length) return;
    if (!sectionOptions.includes(section)) setSection(sectionOptions[0]);
  }, [classGrade, section, sectionOptions]);

  useEffect(() => {
    if (logsLoading) return;
    const next = TEACHING_PERIODS.map(() => emptyPeriodDraft());
    for (const row of classLogs) {
      const index = (row.period ?? 0) - 1;
      if (index < 0 || index >= next.length) continue;
      next[index] = {
        subject: row.subject || 'Computer basics',
        topic: row.topic || '',
        duration: String(row.durationMinutes || 40),
        remarks: row.remarks || '',
        existingId: row.id,
      };
    }
    setPeriods(next);
  }, [classGrade, section, classLogs, logsLoading]);

  async function refreshLogs() {
    if (!teacher?.id) {
      setLogs([]);
      setLogsLoading(false);
      return;
    }
    setLogsLoading(true);
    try {
      const data = await listTeachingLogs({ teacherId: teacher.id, date: today });
      setLogs(data);
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }

  useEffect(() => {
    void refreshLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacher?.id, today]);

  function updatePeriod(index: number, patch: Partial<PeriodDraft>) {
    setPeriods((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setSaved(false);
    setError(null);
  }

  function readyRows() {
    return periods
      .map((row, index) => ({ row, period: TEACHING_PERIODS[index] }))
      .filter(({ row }) => row.topic.trim() && row.subject.trim());
  }

  function runAiAssist(index: number) {
    const row = periods[index];
    if (!row?.topic.trim()) {
      setError(`Enter a topic for Period ${TEACHING_PERIODS[index]} first.`);
      return;
    }
    setAiBusyPeriod(TEACHING_PERIODS[index]);
    window.setTimeout(() => {
      const draft = generateTopicDescription({
        subject: row.subject,
        topic: row.topic,
        classGrade,
        section,
        period: TEACHING_PERIODS[index],
        durationMinutes: Number(row.duration) || 40,
        tone: 'standard',
      });
      updatePeriod(index, { remarks: draft });
      setAiBusyPeriod(null);
    }, 220);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!schoolId || !teacher) {
      setError('Missing school or teacher profile.');
      return;
    }
    if (!classGrade || !section) {
      setError('Select class and section first.');
      return;
    }
    const rows = readyRows();
    if (!rows.length) {
      setError('Fill at least one period topic, then save.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await Promise.all(
        rows.map(({ row, period }) => {
          const body = {
            teacherId: teacher.id,
            schoolId,
            classGrade: classGrade.trim(),
            section: section.trim().toUpperCase(),
            period,
            subject: row.subject.trim(),
            topic: row.topic.trim(),
            durationMinutes: Number(row.duration) || 0,
            remarks: row.remarks.trim(),
            date: today,
          };
          return row.existingId
            ? updateTeachingLog(row.existingId, body)
            : createTeachingLog(body);
        }),
      );
      setSaved(true);
      await refreshLogs();
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to save teaching log'));
    } finally {
      setBusy(false);
    }
  }

  const filledCount = readyRows().length;
  const savedCount = periods.filter((row) => row.existingId).length;
  const totalMinutes = readyRows().reduce(
    (sum, { row }) => sum + (Number(row.duration) || 0),
    0,
  );
  const canEdit = Boolean(classGrade && section && schoolId && teacher);

  return (
    <div className="w-full space-y-4 sm:space-y-5">
      <PageHeader
        title="Daily Teaching Log"
        description="Select class and section, then fill only the periods you taught today. Empty periods are skipped."
      />

      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
          Saved {filledCount} period{filledCount === 1 ? '' : 's'} for Class {classGrade}-{section}.
        </p>
      ) : null}

      <div className="grid w-full gap-3 grid-cols-1 sm:grid-cols-3">
        <StatCard
          label="Periods filled"
          value={logsLoading ? '…' : `${filledCount}/8`}
          hint="Ready to save"
          accent="brand"
          icon={<IconBook className="h-4 w-4" />}
        />
        <StatCard
          label="Already saved"
          value={logsLoading ? '…' : savedCount}
          hint={`Class ${classGrade || '—'}–${section || '—'}`}
          accent="emerald"
          icon={<IconCheck className="h-4 w-4" />}
        />
        <StatCard
          label="Teaching time"
          value={logsLoading ? '…' : `${totalMinutes}m`}
          hint="From filled periods"
          accent="sky"
          icon={<IconClock className="h-4 w-4" />}
        />
      </div>

      <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
        <Card padding="lg">
          <div className="mb-4">
            <p className="text-[0.95rem] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              Who did you teach?
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Choose class and section once. The period sheet below is for this group today.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField id="log-class" label="Class" required>
              <select
                id="log-class"
                className="field-control w-full"
                value={classGrade}
                onChange={(e) => {
                  setClassGrade(e.target.value);
                  setSection('');
                  setSaved(false);
                  setError(null);
                }}
                required
              >
                <option value="">Select class</option>
                {classOptions.map((grade) => (
                  <option key={grade} value={grade}>
                    Class {grade}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="log-section" label="Section" required>
              <select
                id="log-section"
                className="field-control w-full"
                value={section}
                disabled={!classGrade}
                onChange={(e) => {
                  setSection(e.target.value);
                  setSaved(false);
                  setError(null);
                }}
                required
              >
                <option value="">Select section</option>
                {sectionOptions.map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="log-date" label="Date">
              <input type="date" className="field-control w-full" value={today} readOnly />
            </FormField>
          </div>
        </Card>

        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
            <div>
              <h2 className="text-[0.95rem] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Today’s periods
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {classGrade && section
                  ? `Class ${classGrade}-${section} · fill subject and topic for each period you took`
                  : 'Select class and section to start'}
              </p>
            </div>
            <Badge tone={filledCount ? 'brand' : 'neutral'}>
              {filledCount} of 8 ready
            </Badge>
          </div>

          <div className="hidden border-b border-slate-100 bg-slate-50/80 px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 lg:grid lg:grid-cols-[4.75rem_minmax(10rem,0.9fr)_minmax(12rem,1.2fr)_7.5rem_minmax(12rem,1.1fr)_2.75rem] lg:gap-3 lg:px-5">
            <span>Period</span>
            <span>Subject</span>
            <span>Topic</span>
            <span>Duration</span>
            <span>Remarks</span>
            <span className="sr-only">Assist</span>
          </div>

          <div className={canEdit ? '' : 'pointer-events-none opacity-55'}>
            {TEACHING_PERIODS.map((period, index) => {
              const row = periods[index];
              const filled = Boolean(row.topic.trim() && row.subject.trim());
              const customSubject = !isPresetSubject(row.subject) || row.subject === '';
              return (
                <div
                  key={period}
                  className={[
                    'border-b border-slate-100 px-4 py-3 last:border-b-0 dark:border-slate-800 sm:px-5',
                    filled ? 'bg-emerald-50/40 dark:bg-emerald-500/5' : 'bg-white dark:bg-transparent',
                  ].join(' ')}
                >
                  <div className="grid gap-3 lg:grid-cols-[4.75rem_minmax(10rem,0.9fr)_minmax(12rem,1.2fr)_7.5rem_minmax(12rem,1.1fr)_2.75rem] lg:items-start">
                    <div className="flex items-center justify-between gap-2 lg:flex-col lg:items-start lg:justify-start lg:pt-2">
                      <span
                        className={[
                          'inline-flex h-9 min-w-9 items-center justify-center rounded-lg text-sm font-semibold',
                          filled
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
                        ].join(' ')}
                      >
                        {period}
                      </span>
                      {row.existingId ? (
                        <Badge tone="success">Saved</Badge>
                      ) : filled ? (
                        <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400">
                          New
                        </span>
                      ) : (
                        <span className="text-[0.65rem] font-medium text-slate-400">Skip</span>
                      )}
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[0.75rem] font-medium text-slate-600 lg:hidden dark:text-slate-300">
                        Subject
                      </label>
                      <select
                        className="field-control w-full"
                        value={customSubject ? 'Other' : row.subject}
                        onChange={(e) =>
                          updatePeriod(index, {
                            subject: e.target.value === 'Other' ? '' : e.target.value,
                          })
                        }
                        aria-label={`Period ${period} subject`}
                      >
                        {TEACHING_SUBJECT_OPTIONS.map((subject) => (
                          <option key={subject} value={subject}>
                            {subject}
                          </option>
                        ))}
                      </select>
                      {customSubject ? (
                        <Input
                          className="mt-2"
                          value={row.subject}
                          onChange={(e) => updatePeriod(index, { subject: e.target.value })}
                          placeholder="Custom subject"
                          aria-label={`Period ${period} custom subject`}
                        />
                      ) : null}
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[0.75rem] font-medium text-slate-600 lg:hidden dark:text-slate-300">
                        Topic
                      </label>
                      <Input
                        value={row.topic}
                        onChange={(e) => updatePeriod(index, { topic: e.target.value })}
                        placeholder="What you taught"
                        aria-label={`Period ${period} topic`}
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[0.75rem] font-medium text-slate-600 lg:hidden dark:text-slate-300">
                        Duration
                      </label>
                      <select
                        className="field-control w-full"
                        value={
                          TEACHING_DURATION_PRESETS.includes(
                            Number(row.duration) as (typeof TEACHING_DURATION_PRESETS)[number],
                          )
                            ? row.duration
                            : row.duration
                        }
                        onChange={(e) => updatePeriod(index, { duration: e.target.value })}
                        aria-label={`Period ${period} duration`}
                      >
                        {TEACHING_DURATION_PRESETS.map((mins) => (
                          <option key={mins} value={String(mins)}>
                            {mins} min
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[0.75rem] font-medium text-slate-600 lg:hidden dark:text-slate-300">
                        Remarks
                      </label>
                      <Input
                        value={row.remarks}
                        onChange={(e) => updatePeriod(index, { remarks: e.target.value })}
                        placeholder="Optional notes"
                        aria-label={`Period ${period} remarks`}
                      />
                    </div>

                    <div className="flex items-center lg:pt-1">
                      <button
                        type="button"
                        onClick={() => runAiAssist(index)}
                        disabled={!row.topic.trim() || aiBusyPeriod === period}
                        title="Draft remarks"
                        aria-label={`Draft remarks for period ${period}`}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200 dark:hover:bg-sky-500/20"
                      >
                        <IconSpark className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900/70 sm:px-5">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {filledCount
              ? `${filledCount} period${filledCount === 1 ? '' : 's'} will be saved. Empty rows are skipped.`
              : 'Add a topic in any period you taught, then save.'}
          </p>
          <Button type="submit" variant="primary" disabled={busy || !canEdit || filledCount === 0}>
            {busy ? 'Saving…' : 'Save today’s log'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function TeacherSyllabusPage() {
  const { schoolId, teacher } = useTeacherContext();
  const [schoolName, setSchoolName] = useState('');
  const [rows, setRows] = useState<SyllabusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    classGrade: '',
    section: '',
    subject: 'Computer basics',
    topic: '',
    completedPct: 60,
    topicsDone: 15,
    topicsTotal: 25,
  });
  const [aiDraft, setAiDraft] = useState('');
  const [aiSuggestedTopic, setAiSuggestedTopic] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiTone, setAiTone] = useState<TeachingAssistTone>('standard');

  const topicSuggestions = useMemo(
    () => suggestSyllabusTopics(form.subject || 'Computer basics', 6),
    [form.subject],
  );

  const classOptions = useMemo(() => {
    const grades = new Set<string>();
    for (const raw of teacher?.assignedClasses ?? []) {
      const match = String(raw).trim().match(/^(\d+)/);
      if (match) grades.add(match[1]);
      else if (String(raw).trim()) grades.add(String(raw).trim());
    }
    return [...grades].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [teacher?.assignedClasses]);

  const sectionOptions = useMemo(() => {
    const sections = new Set<string>();
    for (const raw of teacher?.assignedClasses ?? []) {
      const match = String(raw).trim().match(/^(\d+)\s*[-–]?\s*([A-Za-z])?$/);
      if (!match) continue;
      if (form.classGrade && match[1] !== form.classGrade) continue;
      sections.add((match[2] ?? 'A').toUpperCase());
    }
    if (!sections.size) {
      sections.add('A');
      sections.add('B');
    }
    return [...sections].sort((a, b) => a.localeCompare(b));
  }, [teacher?.assignedClasses, form.classGrade]);

  useEffect(() => {
    if (!form.classGrade && classOptions[0]) {
      setForm((f) => ({ ...f, classGrade: classOptions[0] }));
    }
  }, [classOptions, form.classGrade]);

  useEffect(() => {
    if (form.classGrade && sectionOptions.length && !sectionOptions.includes(form.section)) {
      setForm((f) => ({ ...f, section: sectionOptions[0] }));
    }
  }, [form.classGrade, form.section, sectionOptions]);

  async function refreshRows() {
    if (!schoolId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [school, data] = await Promise.all([
        getSchool(schoolId),
        listSyllabus({ schoolId }),
      ]);
      setSchoolName(school.name);
      const mine = teacher?.id
        ? data.filter((row) => !row.teacherId || row.teacherId === teacher.id)
        : data;
      setRows(
        [...mine].sort((a, b) => b.completedPct - a.completedPct || a.classLabel.localeCompare(b.classLabel)),
      );
    } catch (e) {
      setError(apiErrorMessage(e, 'Failed to load syllabus'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, teacher?.id]);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'completedPct' && typeof value === 'number') {
        const total = Math.max(1, next.topicsTotal);
        next.topicsDone = Math.min(total, Math.round((value / 100) * total));
      }
      if (key === 'topicsDone' || key === 'topicsTotal') {
        const total = Math.max(1, key === 'topicsTotal' ? Number(value) : next.topicsTotal);
        const done = Math.min(
          total,
          Math.max(0, key === 'topicsDone' ? Number(value) : next.topicsDone),
        );
        next.topicsTotal = total;
        next.topicsDone = done;
        next.completedPct = Math.round((done / total) * 100);
      }
      return next;
    });
    setSaved(false);
    setError(null);
  }

  function runAiAssist(tone: TeachingAssistTone = aiTone) {
    setAiBusy(true);
    setAiTone(tone);
    window.setTimeout(() => {
      const draft = generateSyllabusSuggestion({
        subject: form.subject,
        topic: form.topic,
        classGrade: form.classGrade,
        section: form.section,
        completedPct: form.completedPct,
        topicsDone: form.topicsDone,
        topicsTotal: form.topicsTotal,
        tone,
      });
      setAiSuggestedTopic(draft.topic);
      if (!form.topic.trim()) {
        setForm((prev) => ({ ...prev, topic: draft.topic }));
      }
      setAiDraft(draft.note);
      setAiBusy(false);
    }, 280);
  }

  function applyAiTopic() {
    const nextTopic = aiSuggestedTopic.trim() || topicSuggestions[0];
    if (!nextTopic) return;
    setField('topic', nextTopic);
  }

  const classLabel =
    form.classGrade && form.section
      ? `${form.classGrade}-${form.section.trim().toUpperCase()}`
      : form.classGrade || '—';

  const avgCompletion = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + row.completedPct, 0) / rows.length)
    : 0;
  const onTrack = rows.filter((row) => row.completedPct >= 80).length;
  const needsFocus = rows.filter((row) => row.completedPct < 50).length;
  const topicsRemaining = rows.reduce(
    (sum, row) => sum + Math.max(0, row.topicsTotal - row.topicsDone),
    0,
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!schoolId || !teacher) {
      setError('Missing school or teacher profile.');
      return;
    }
    if (!form.classGrade.trim() || !form.section.trim() || !form.subject.trim() || !form.topic.trim()) {
      setError('Please fill class, section, subject and topic.');
      return;
    }

    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await createSyllabus({
        schoolId,
        schoolName: schoolName || schoolId,
        teacherId: teacher.id,
        teacherName: teacher.name,
        classLabel,
        subject: form.subject.trim(),
        topic: form.topic.trim(),
        completedPct: Math.min(100, Math.max(0, form.completedPct)),
        topicsDone: Math.max(0, form.topicsDone),
        topicsTotal: Math.max(1, form.topicsTotal),
      });
      setSaved(true);
      setForm((f) => ({ ...f, topic: '' }));
      await refreshRows();
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to update syllabus'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full space-y-4 sm:space-y-5">
      <PageHeader
        title="Syllabus Progress"
        description={
          schoolName
            ? `Update chapter coverage for ${schoolName}. Use AI suggestions for topics and progress notes.`
            : 'Update chapter, topic and completion percentage for your classes. AI suggestions help fill topics quickly.'
        }
      />

      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
          Syllabus progress updated.
        </p>
      ) : null}

      <div className="grid w-full gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Avg completion"
          value={loading ? '…' : rows.length ? `${avgCompletion}%` : '—'}
          hint={rows.length ? 'Across your class updates' : 'No updates yet'}
          accent="amber"
          icon={<IconBook className="h-4 w-4" />}
        />
        <StatCard
          label="On track"
          value={loading ? '…' : onTrack}
          hint="≥ 80% complete"
          accent="emerald"
          icon={<IconCheck className="h-4 w-4" />}
        />
        <StatCard
          label="Needs focus"
          value={loading ? '…' : needsFocus}
          hint="< 50% complete"
          accent="rose"
          icon={<IconInfo className="h-4 w-4" />}
        />
        <StatCard
          label="Topics remaining"
          value={loading ? '…' : topicsRemaining}
          hint="Across tracked classes"
          accent="sky"
          icon={<IconClipboard className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card padding="lg" className="w-full">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[0.95rem] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Update progress
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Record today’s chapter coverage for a class
              </p>
            </div>
            <Badge tone={progressBadgeTone(form.completedPct)}>
              {progressLabel(form.completedPct)}
            </Badge>
          </div>

          <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id="syl-class" label="Class" required>
                <select
                  id="syl-class"
                  className="field-control w-full"
                  value={form.classGrade}
                  onChange={(e) => setField('classGrade', e.target.value)}
                  required
                >
                  <option value="">Select class</option>
                  {classOptions.map((grade) => (
                    <option key={grade} value={grade}>
                      Class {grade}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField id="syl-section" label="Section" required>
                <select
                  id="syl-section"
                  className="field-control w-full"
                  value={form.section}
                  onChange={(e) => setField('section', e.target.value)}
                  required
                >
                  <option value="">Select section</option>
                  {sectionOptions.map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField id="syl-subject" label="Subject / chapter" required>
              <select
                id="syl-subject"
                className="field-control w-full"
                value={
                  TEACHING_SUBJECT_OPTIONS.includes(
                    form.subject as (typeof TEACHING_SUBJECT_OPTIONS)[number],
                  )
                    ? form.subject
                    : 'Other'
                }
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'Other') setField('subject', '');
                  else setField('subject', value);
                }}
                required
              >
                {TEACHING_SUBJECT_OPTIONS.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </FormField>

            {!TEACHING_SUBJECT_OPTIONS.includes(
              form.subject as (typeof TEACHING_SUBJECT_OPTIONS)[number],
            ) || form.subject === '' ? (
              <FormField id="syl-subject-custom" label="Custom subject / chapter" required>
                <Input
                  id="syl-subject-custom"
                  value={form.subject}
                  onChange={(e) => setField('subject', e.target.value)}
                  placeholder="e.g. Unit 3 · Graphics"
                  required
                />
              </FormField>
            ) : null}

            <FormField id="syl-topic" label="Today's topic" required>
              <Input
                id="syl-topic"
                value={form.topic}
                onChange={(e) => setField('topic', e.target.value)}
                placeholder="e.g. Paint brush tools"
                required
              />
            </FormField>

            {topicSuggestions.length ? (
              <div className="-mt-1">
                <p className="mb-1.5 text-xs font-medium text-slate-500">AI topic suggestions</p>
                <div className="flex flex-wrap gap-1.5">
                  {topicSuggestions.map((idea) => (
                    <button
                      key={idea}
                      type="button"
                      onClick={() => setField('topic', idea)}
                      className={[
                        'rounded-md border px-2.5 py-1 text-xs font-medium transition',
                        form.topic === idea
                          ? 'border-brand-500 bg-brand-50 text-brand-800 dark:border-brand-400 dark:bg-orange-950/40 dark:text-brand-200'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-sky-500/40 dark:hover:bg-sky-500/10',
                      ].join(' ')}
                    >
                      {idea}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/50">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Completion · {classLabel}
                </p>
                <span className="text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                  {form.completedPct}%
                </span>
              </div>
              <ProgressBar value={form.completedPct} variant="logo" />
              <label className="mt-4 grid gap-1.5">
                <span className="text-xs font-medium text-slate-500">Adjust percentage</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={form.completedPct}
                  onChange={(e) => setField('completedPct', Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <FormField id="syl-done" label="Topics done">
                  <Input
                    id="syl-done"
                    type="number"
                    min={0}
                    max={form.topicsTotal}
                    value={form.topicsDone}
                    onChange={(e) => setField('topicsDone', Number(e.target.value) || 0)}
                  />
                </FormField>
                <FormField id="syl-total" label="Topics total">
                  <Input
                    id="syl-total"
                    type="number"
                    min={1}
                    value={form.topicsTotal}
                    onChange={(e) => setField('topicsTotal', Math.max(1, Number(e.target.value) || 1))}
                  />
                </FormField>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" variant="primary" disabled={busy || !schoolId || !teacher}>
                {busy ? 'Saving…' : 'Update progress'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={aiBusy}
                onClick={() => runAiAssist('standard')}
              >
                <span className="inline-flex items-center gap-1.5">
                  <IconSpark className="h-4 w-4" />
                  AI suggestions
                </span>
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-4">
          <section
            className="rounded-xl border border-sky-200/80 bg-sky-50/70 px-4 py-4 dark:border-sky-500/25 dark:bg-sky-500/10 sm:px-5"
            aria-labelledby="syllabus-ai-assist-heading"
          >
            <div className="flex gap-3">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky-100 text-sky-700 ring-1 ring-sky-200/80 dark:bg-sky-500/20 dark:text-sky-200 dark:ring-sky-500/30">
                <IconSpark className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p
                  id="syllabus-ai-assist-heading"
                  className="text-sm font-semibold text-sky-950 dark:text-sky-50"
                >
                  AI syllabus helper
                </p>
                <p className="mt-1 text-sm text-sky-900/80 dark:text-sky-100/85">
                  Pick a suggested topic or generate a progress note for Class {classLabel}.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(
                    [
                      { id: 'short', label: 'Short' },
                      { id: 'standard', label: 'Standard' },
                      { id: 'detailed', label: 'Detailed' },
                    ] as const
                  ).map((tone) => (
                    <button
                      key={tone.id}
                      type="button"
                      onClick={() => runAiAssist(tone.id)}
                      disabled={aiBusy}
                      className={[
                        'inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-semibold transition',
                        aiTone === tone.id && aiDraft
                          ? 'border-sky-500 bg-white text-sky-800 shadow-sm dark:border-sky-400 dark:bg-slate-800 dark:text-sky-200'
                          : 'border-sky-200/80 bg-white/60 text-sky-800 hover:bg-white dark:border-sky-500/30 dark:bg-slate-900/40 dark:text-sky-100',
                        'disabled:pointer-events-none disabled:opacity-50',
                      ].join(' ')}
                    >
                      {tone.label}
                    </button>
                  ))}
                </div>

                <div className="mt-3">
                  <p className="mb-1.5 text-xs font-medium text-sky-900/70 dark:text-sky-100/70">
                    Quick topics
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {topicSuggestions.map((idea) => (
                      <button
                        key={`ai-${idea}`}
                        type="button"
                        onClick={() => setField('topic', idea)}
                        className={[
                          'rounded-md border px-2.5 py-1 text-xs font-medium transition',
                          form.topic === idea
                            ? 'border-sky-500 bg-white text-sky-800 dark:border-sky-400 dark:bg-slate-800 dark:text-sky-200'
                            : 'border-sky-200/70 bg-white/70 text-sky-900 hover:bg-white dark:border-sky-500/25 dark:bg-slate-900/40 dark:text-sky-100',
                        ].join(' ')}
                      >
                        {idea}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-sky-200/70 bg-white/80 p-3 dark:border-sky-500/20 dark:bg-slate-900/50">
                  {aiBusy ? (
                    <p className="text-sm text-sky-800/80 dark:text-sky-200/80">Drafting…</p>
                  ) : aiDraft ? (
                    <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                      {aiDraft}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Choose Short / Standard / Detailed to draft a syllabus progress note, or tap a
                      quick topic above.
                    </p>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    disabled={!aiSuggestedTopic.trim() && !topicSuggestions.length}
                    onClick={applyAiTopic}
                  >
                    Use suggested topic
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={!aiDraft.trim()}
                    onClick={() => {
                      setAiDraft('');
                      setAiSuggestedTopic('');
                    }}
                  >
                    Clear draft
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <Card padding="lg" className="flex flex-col items-center text-center">
            <p className="text-[0.95rem] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              Live preview
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              How this update will look for Class {classLabel}
            </p>
            <div className="mt-5">
              <ProgressRing value={form.completedPct} size={104} stroke={8} />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {form.topic.trim() || 'Add today’s topic'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {form.subject || 'Subject'} · {form.topicsDone}/{form.topicsTotal} topics
            </p>
            <div className="mt-3">
              <Badge tone={progressBadgeTone(form.completedPct)}>
                {progressLabel(form.completedPct)}
              </Badge>
            </div>
          </Card>

          <Card padding="none" className="overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
              <h2 className="text-[0.95rem] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Your class progress
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Recent syllabus updates for your school
              </p>
            </div>
            {loading ? (
              <p className="py-10 text-center text-sm text-slate-500">Loading syllabus…</p>
            ) : rows.length === 0 ? (
              <EmptyState message="No syllabus updates yet" className="min-h-[9rem] py-8" />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.slice(0, 8).map((row) => {
                  const remaining = Math.max(0, row.topicsTotal - row.topicsDone);
                  return (
                    <li key={row.id} className="px-4 py-3 sm:px-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-slate-50">
                            {row.classLabel}
                            <span className="font-medium text-slate-500"> · {row.subject}</span>
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">{row.topic}</p>
                        </div>
                        <Badge tone={progressBadgeTone(row.completedPct)}>
                          {row.completedPct}%
                        </Badge>
                      </div>
                      <div className="mt-2.5 flex items-center gap-3">
                        <ProgressBar
                          value={row.completedPct}
                          variant="logo"
                          className="min-w-0 flex-1"
                        />
                        <span className="shrink-0 text-xs tabular-nums text-slate-500">
                          {row.topicsDone}/{row.topicsTotal}
                          {remaining ? ` · ${remaining} left` : ''}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
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
  const leaveHistoryPagination = useTablePagination(history, { resetDeps: [panel] });

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
                leaveHistoryPagination.pageItems.map((leave) => (
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
            <TablePagination
              totalCount={leaveHistoryPagination.totalCount}
              page={leaveHistoryPagination.page}
              totalPages={leaveHistoryPagination.totalPages}
              rangeFrom={leaveHistoryPagination.rangeFrom}
              rangeTo={leaveHistoryPagination.rangeTo}
              onPageChange={leaveHistoryPagination.setPage}
              label="requests"
            />
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

  const assetsPagination = useTablePagination(schoolAssets);

  return (
    <div>
      <PageHeader
        title="Asset Verification"
        description="View assets assigned to your school. Report issues via support tickets."
      />
      {loadError ? <p className="mb-4 text-sm text-rose-600">{loadError}</p> : null}
      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading assets…</p>
        ) : (
          <>
            <DataTable headers={['Type', 'Quantity', 'Status', 'Warranty']}>
              {assetsPagination.pageItems.map((asset) => (
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
            <TablePagination
              totalCount={assetsPagination.totalCount}
              page={assetsPagination.page}
              totalPages={assetsPagination.totalPages}
              rangeFrom={assetsPagination.rangeFrom}
              rangeTo={assetsPagination.rangeTo}
              onPageChange={assetsPagination.setPage}
              label="assets"
            />
          </>
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
  const today = localDateKey();
  const [schoolName, setSchoolName] = useState('');
  const [list, setList] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    eventType: 'Celebration' as string,
    name: '',
    date: today,
    description: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [aiExtra, setAiExtra] = useState('');
  const [aiAudience, setAiAudience] = useState<EventAudience>('students');
  const [aiTone, setAiTone] = useState<EventAssistTone>('standard');
  const [aiDraft, setAiDraft] = useState('');
  const [aiSuggestedName, setAiSuggestedName] = useState('');
  const [aiBusy, setAiBusy] = useState(false);

  const nameSuggestions = useMemo(
    () => suggestEventNames(form.eventType, `${form.name} ${aiExtra}`, 6),
    [form.eventType, form.name, aiExtra],
  );

  async function refreshEvents() {
    if (!schoolId) {
      setList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [school, events] = await Promise.all([
        getSchool(schoolId),
        listEvents({ schoolId }),
      ]);
      setSchoolName(school.name);
      setList([...events].sort((a, b) => b.date.localeCompare(a.date)));
    } catch (e) {
      setError(apiErrorMessage(e, 'Failed to load events'));
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setError(null);
  }

  function onPickImages(fileList: FileList | null) {
    const next = Array.from(fileList ?? []).filter((f) => f.type.startsWith('image/'));
    previews.forEach((url) => URL.revokeObjectURL(url));
    setFiles(next);
    setPreviews(next.map((file) => URL.createObjectURL(file)));
  }

  function runAiAssist(tone: EventAssistTone = aiTone) {
    setAiBusy(true);
    setAiTone(tone);
    window.setTimeout(() => {
      const draft = generateEventCopy({
        eventType: form.eventType,
        name: form.name,
        extra: aiExtra,
        schoolName,
        date: form.date,
        audience: aiAudience,
        tone,
      });
      setAiSuggestedName(draft.name);
      setAiDraft(draft.description);
      if (!form.name.trim()) setField('name', draft.name);
      setAiBusy(false);
    }, 280);
  }

  function applyAiName() {
    const next = aiSuggestedName.trim() || nameSuggestions[0];
    if (next) setField('name', next);
  }

  function applyAiDescription() {
    if (aiDraft.trim()) setField('description', aiDraft.trim());
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!schoolId) {
      setError('No school assigned.');
      return;
    }
    if (!form.name.trim() || !form.description.trim()) {
      setError('Please add an event name and description.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createEvent({
        schoolId,
        name: form.name.trim(),
        date: form.date || today,
        description: form.description.trim(),
      });
      setForm({
        eventType: form.eventType,
        name: '',
        date: today,
        description: '',
      });
      previews.forEach((url) => URL.revokeObjectURL(url));
      setFiles([]);
      setPreviews([]);
      setAiDraft('');
      setAiSuggestedName('');
      setAiExtra('');
      setSaved(true);
      await refreshEvents();
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to upload event'));
    } finally {
      setBusy(false);
    }
  }

  const thisMonth = list.filter((ev) => ev.date.slice(0, 7) === today.slice(0, 7)).length;

  return (
    <div className="w-full space-y-4 sm:space-y-5">
      <PageHeader
        title="Event Upload"
        description={
          schoolName
            ? `Share photos and a short story from ${schoolName}. Use AI to draft names and captions.`
            : 'Upload event images with a name and description. AI can draft flexible captions for you.'
        }
      />

      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
          Event uploaded.
        </p>
      ) : null}

      <div className="grid w-full gap-3 grid-cols-1 sm:grid-cols-3">
        <StatCard
          label="Events this month"
          value={loading ? '…' : thisMonth}
          hint={today.slice(0, 7)}
          accent="brand"
          icon={<IconImage className="h-4 w-4" />}
        />
        <StatCard
          label="Gallery total"
          value={loading ? '…' : list.length}
          hint={schoolName || 'Your school'}
          accent="sky"
          icon={<IconCalendar className="h-4 w-4" />}
        />
        <StatCard
          label="Photos selected"
          value={files.length}
          hint={files.length ? 'Ready to attach' : 'Optional preview'}
          accent="emerald"
          icon={<IconSpark className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Card padding="lg" className="w-full">
          <div className="mb-4">
            <p className="text-[0.95rem] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              New event
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Name the moment, add a description, then attach photos
            </p>
          </div>

          <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-500">Event type</p>
              <div className="flex flex-wrap gap-1.5">
                {EVENT_TYPE_OPTIONS.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setField('eventType', type)}
                    className={[
                      'rounded-md border px-2.5 py-1 text-xs font-medium transition',
                      form.eventType === type
                        ? 'border-brand-500 bg-brand-50 text-brand-800 dark:border-brand-400 dark:bg-orange-950/40 dark:text-brand-200'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
                    ].join(' ')}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id="ev-name" label="Event name" required>
                <Input
                  id="ev-name"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="Independence Day Tech Showcase"
                  required
                />
              </FormField>
              <FormField id="ev-date" label="Date" required>
                <Input
                  id="ev-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setField('date', e.target.value)}
                  required
                />
              </FormField>
            </div>

            {nameSuggestions.length ? (
              <div className="-mt-1">
                <p className="mb-1.5 text-xs font-medium text-slate-500">AI name suggestions</p>
                <div className="flex flex-wrap gap-1.5">
                  {nameSuggestions.map((idea) => (
                    <button
                      key={idea}
                      type="button"
                      onClick={() => setField('name', idea)}
                      className={[
                        'rounded-md border px-2.5 py-1 text-xs font-medium transition',
                        form.name === idea
                          ? 'border-brand-500 bg-brand-50 text-brand-800 dark:border-brand-400 dark:bg-orange-950/40 dark:text-brand-200'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
                      ].join(' ')}
                    >
                      {idea}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <FormField id="ev-desc" label="Description" required>
              <textarea
                id="ev-desc"
                className="field-control min-h-28 w-full"
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder="What happened, who joined, and what students learned…"
                required
              />
            </FormField>

            <FormField id="ev-images" label="Images">
              <input
                id="ev-images"
                type="file"
                accept="image/*"
                multiple
                className="field-control w-full"
                onChange={(e) => onPickImages(e.target.files)}
              />
            </FormField>
            {previews.length ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {previews.map((src, index) => (
                  <img
                    key={src}
                    src={src}
                    alt={files[index]?.name ?? `Photo ${index + 1}`}
                    className="h-20 w-full rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                  />
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" variant="primary" disabled={busy || !schoolId}>
                {busy ? 'Uploading…' : 'Upload event'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={aiBusy}
                onClick={() => runAiAssist('standard')}
              >
                <span className="inline-flex items-center gap-1.5">
                  <IconSpark className="h-4 w-4" />
                  Draft with AI
                </span>
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-4">
          <section
            className="rounded-xl border border-sky-200/80 bg-sky-50/70 px-4 py-4 dark:border-sky-500/25 dark:bg-sky-500/10 sm:px-5"
            aria-labelledby="event-ai-assist-heading"
          >
            <div className="flex gap-3">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky-100 text-sky-700 ring-1 ring-sky-200/80 dark:bg-sky-500/20 dark:text-sky-200 dark:ring-sky-500/30">
                <IconSpark className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p
                  id="event-ai-assist-heading"
                  className="text-sm font-semibold text-sky-950 dark:text-sky-50"
                >
                  AI event helper
                </p>
                <p className="mt-1 text-sm text-sky-900/80 dark:text-sky-100/85">
                  Mix event type, audience and extra keywords — then generate a name or caption.
                </p>

                <FormField id="ev-ai-extra" label="Extra keywords (optional)">
                  <Input
                    id="ev-ai-extra"
                    value={aiExtra}
                    onChange={(e) => setAiExtra(e.target.value)}
                    placeholder="e.g. typing contest, class 7, prizes"
                  />
                </FormField>

                <p className="mt-3 mb-1.5 text-xs font-medium text-sky-900/70 dark:text-sky-100/70">
                  Audience
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: 'students', label: 'Students' },
                      { id: 'parents', label: 'Parents' },
                      { id: 'community', label: 'Community' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setAiAudience(item.id)}
                      className={[
                        'rounded-md border px-2.5 py-1 text-xs font-semibold transition',
                        aiAudience === item.id
                          ? 'border-sky-500 bg-white text-sky-800 dark:border-sky-400 dark:bg-slate-800 dark:text-sky-200'
                          : 'border-sky-200/70 bg-white/70 text-sky-900 hover:bg-white dark:border-sky-500/25 dark:bg-slate-900/40 dark:text-sky-100',
                      ].join(' ')}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <p className="mt-3 mb-1.5 text-xs font-medium text-sky-900/70 dark:text-sky-100/70">
                  Style
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { id: 'short', label: 'Short' },
                      { id: 'standard', label: 'Standard' },
                      { id: 'detailed', label: 'Detailed' },
                      { id: 'caption', label: 'Caption' },
                    ] as const
                  ).map((tone) => (
                    <button
                      key={tone.id}
                      type="button"
                      onClick={() => runAiAssist(tone.id)}
                      disabled={aiBusy}
                      className={[
                        'inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-semibold transition',
                        aiTone === tone.id && aiDraft
                          ? 'border-sky-500 bg-white text-sky-800 shadow-sm dark:border-sky-400 dark:bg-slate-800 dark:text-sky-200'
                          : 'border-sky-200/80 bg-white/60 text-sky-800 hover:bg-white dark:border-sky-500/30 dark:bg-slate-900/40 dark:text-sky-100',
                        'disabled:pointer-events-none disabled:opacity-50',
                      ].join(' ')}
                    >
                      {tone.label}
                    </button>
                  ))}
                </div>

                <div className="mt-3 rounded-lg border border-sky-200/70 bg-white/80 p-3 dark:border-sky-500/20 dark:bg-slate-900/50">
                  {aiBusy ? (
                    <p className="text-sm text-sky-800/80 dark:text-sky-200/80">Drafting…</p>
                  ) : aiDraft ? (
                    <>
                      {aiSuggestedName ? (
                        <p className="mb-1 text-xs font-semibold text-sky-800 dark:text-sky-200">
                          {aiSuggestedName}
                        </p>
                      ) : null}
                      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                        {aiDraft}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Add keywords like “lab, class 8, mouse practice”, pick an audience, then choose
                      a style.
                    </p>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant="primary" disabled={!aiDraft.trim()} onClick={applyAiDescription}>
                    Use description
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!aiSuggestedName.trim() && !nameSuggestions.length}
                    onClick={applyAiName}
                  >
                    Use name
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={!aiDraft.trim()}
                    onClick={() => {
                      setAiDraft('');
                      setAiSuggestedName('');
                    }}
                  >
                    Clear draft
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <Card padding="none" className="overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
              <h2 className="text-[0.95rem] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Recent events
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">Latest uploads for your school</p>
            </div>
            {loading ? (
              <p className="py-10 text-center text-sm text-slate-500">Loading events…</p>
            ) : list.length === 0 ? (
              <EmptyState message="No events uploaded yet" className="min-h-[9rem] py-8" />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {list.slice(0, 6).map((event) => (
                  <li key={event.id} className="px-4 py-3 sm:px-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-semibold text-slate-900 dark:text-slate-50">{event.name}</p>
                      <Badge tone="info">{event.date}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                      {event.description}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
