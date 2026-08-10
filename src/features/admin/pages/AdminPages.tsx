import type { Dispatch, FormEvent, ReactNode, SetStateAction, ChangeEvent } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams } from 'react-router-dom';
import {
  Button,
  ConfirmDialog,
  FormField,
  Input,
  Modal,
  TableRowActions,
  TableSearch,
  matchesSearch,
} from '../../../components/ui';
import {
  Badge,
  Card,
  PageHeader,
  ProgressBar,
  ProgressRing,
  SectionTitle,
  StatCard,
} from '../../../components/ui/Surface';
import {
  progressBadgeTone,
  progressLabel,
} from '../../../utils/progress';
import { isMeaningfulGpsLabel } from '../../../utils/geo';
import { localDateKey } from '../../../utils/date';
import {
  computeLeaveStats,
  leaveDayCount,
  leaveStatusTone,
} from '../../../utils/leave';
import { DataTable, Td } from '../../../components/ui/DataTable';
import {
  IconAlert,
  IconArrowRight,
  IconBook,
  IconBox,
  IconCalendar,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClipboard,
  IconClock,
  IconHistory,
  IconImage,
  IconInfo,
  IconMapPin,
  IconSchool,
  IconSpark,
  IconTicket,
  IconTrendUp,
  IconUserPlus,
  IconUsers,
} from '../../../components/ui/icons';
import type {
  ActivityItem,
  Asset,
  EventItem,
  LeaveRequest,
  School,
  SponsorProfile,
  Student,
  SupportTicket,
  TeacherProfile,
} from '../../../types/domain';
import {
  createSchool,
  createSponsor,
  createTeacher,
  deleteAsset,
  deleteEvent,
  deleteLeave,
  deleteSchool,
  deleteSponsor,
  deleteTeacher,
  deleteTeacherAttendance,
  deleteTicket,
  getDashboardSummary,
  getSchool,
  getTeacher,
  listActivities,
  listAssets,
  listEvents,
  listLeaves,
  listSchools,
  listSponsors,
  listStudentAttendanceSessions,
  listStudents,
  listSyllabus,
  listTeacherAttendance,
  listTeachers,
  listTickets,
  resetTeacherPassword,
  updateAsset,
  updateEvent,
  updateLeave,
  updateSchool,
  updateSponsor,
  updateSyllabus,
  updateTeacher,
  updateTeacherAttendance,
  updateTicket,
  type ClassAttendanceSummary as ApiClassAttendanceSummary,
  type DashboardSummary,
  type SyllabusRow as ApiSyllabusRow,
  type TeacherAttendanceRow,
} from '../../../api';
import { useAuth } from '../../auth/hooks/useAuth';
import { isValidEmail, isValidIndianPhone } from '../../../utils/validation';
import {
  clearFieldError,
  enterField,
  hasFieldErrors,
  type FieldErrors,
} from '../../../utils/formErrors';

function apiErrorMessage(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Clear a single field error when the user edits that field (login-style UX). */
function touchField(setErrors: Dispatch<SetStateAction<FieldErrors>>, key: string) {
  setErrors((prev) => clearFieldError(prev, key));
}

export function AdminDashboardPage() {
  const { user } = useAuth();
  const hour = new Date().getHours();
  const greeting = greetingForHour(hour);
  const firstName = user?.name?.split(' ')[0] ?? 'Admin';

  const [schools, setSchools] = useState<School[]>([]);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [sponsors, setSponsors] = useState<SponsorProfile[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [
          schoolsData,
          teachersData,
          studentsData,
          ticketsData,
          leavesData,
          assetsData,
          sponsorsData,
          activitiesData,
          summaryData,
        ] = await Promise.all([
          listSchools(),
          listTeachers(),
          listStudents(),
          listTickets(),
          listLeaves(),
          listAssets(),
          listSponsors(),
          listActivities(),
          getDashboardSummary().catch(() => null),
        ]);
        if (cancelled) return;
        setSchools(schoolsData);
        setTeachers(teachersData);
        setStudents(studentsData);
        setTickets(ticketsData);
        setLeaves(leavesData);
        setAssets(assetsData);
        setSponsors(sponsorsData);
        setRecentActivities(activitiesData);
        setSummary(summaryData);
      } catch (e) {
        if (!cancelled) setLoadError(apiErrorMessage(e, 'Failed to load dashboard'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openTickets = summary?.openTicketCount ??
    tickets.filter(
      (t) => t.status === 'Open' || t.status === 'Assigned' || t.status === 'In Progress',
    ).length;
  const assetsCount = assets.reduce((sum, a) => sum + a.quantity, 0);
  const avgSyllabus =
    summary?.avgSyllabusCompletion ??
    (schools.length
      ? Math.round(schools.reduce((sum, s) => sum + s.syllabusCompletion, 0) / schools.length)
      : 0);
  const pendingLeaves =
    summary?.pendingLeaveCount ?? leaves.filter((l) => l.status === 'Pending').length;
  const totalStudents = summary?.studentCount ?? students.length;
  const teacherPresencePct = 0;
  const presentTeachers = Math.round((teacherPresencePct / 100) * Math.max(teachers.length, 1));
  const presentStudents = Math.round(totalStudents * 0.93);
  const schoolsCovered = schools.filter((s) => s.sponsorId).length;
  const activeSponsors = sponsors.filter((s) => s.active);
  const schoolsWithSponsor = schools.filter((s) => s.sponsorId).length;
  const schoolsCount = summary?.schoolCount ?? schools.length;
  const teachersCount = summary?.teacherCount ?? teachers.length;
  const schoolNameById = (id: string) => schools.find((s) => s.id === id)?.name;

  const todayLabel = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  const activityTone = [
    { icon: IconClock, color: 'bg-sky-100 text-sky-700' },
    { icon: IconCheck, color: 'bg-emerald-100 text-emerald-700' },
    { icon: IconTicket, color: 'bg-amber-100 text-amber-800' },
    { icon: IconBook, color: 'bg-orange-100 text-orange-700' },
  ] as const;

  if (loading) {
    return (
      <div className="w-full py-16 text-center text-sm text-slate-500">Loading dashboard…</div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full py-16 text-center text-sm text-rose-600">{loadError}</div>
    );
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      {/* Hero command band */}
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
          <div className="min-w-0 flex-1 lg:max-w-2xl xl:max-w-3xl">
            <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-lg bg-white/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-orange-100 ring-1 ring-white/15 sm:text-[0.7rem] sm:tracking-[0.14em]">
              <IconSpark className="h-3.5 w-3.5 shrink-0 text-orange-300" />
              <span className="truncate">Live operations · {todayLabel}</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-[2rem]">
              {greeting}, {firstName}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
              Trust-wide snapshot across schools, sponsors, attendance, syllabus progress,
              assets and support. Focus on items that need action today.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/admin/tickets">
                <Button type="button" variant="primary" className="!bg-white !text-slate-900 hover:!bg-orange-50">
                  Review tickets
                  <IconArrowRight />
                </Button>
              </Link>
              <Link to="/admin/leaves">
                <Button type="button" variant="outline" className="!border-white/25 !text-white hover:!bg-white/10">
                  Leave queue ({pendingLeaves})
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3 lg:w-auto lg:min-w-[22rem] xl:min-w-0 xl:max-w-none xl:flex-1">
            {[
              { label: 'Coverage', value: `${schoolsCovered}/${schoolsCount}`, hint: 'Schools live' },
              { label: 'Staff in', value: `${teacherPresencePct}%`, hint: 'Teachers present' },
              { label: 'Syllabus', value: `${avgSyllabus}%`, hint: 'Trust average' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg bg-white/8 p-3 ring-1 ring-white/12 backdrop-blur-sm sm:p-3.5"
              >
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {item.label}
                </p>
                <p className="mt-1.5 text-xl font-bold tracking-tight text-white sm:text-2xl">
                  {item.value}
                </p>
                <p className="mt-0.5 text-[0.7rem] text-slate-400">{item.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Primary metrics */}
      <section>
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-slate-900">Network at a glance</h2>
        </div>
        <div className="grid w-full gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Total Schools"
            value={schoolsCount}
            hint="Active programmes"
            trend={{ label: '+1 this term', positive: true }}
            accent="brand"
            icon={<IconSchool className="h-4 w-4" />}
          />
          <StatCard
            label="Total Teachers"
            value={teachersCount}
            hint="Assigned staff"
            accent="sky"
            icon={<IconUsers className="h-4 w-4" />}
          />
          <StatCard
            label="Total Students"
            value={totalStudents}
            hint="Across network"
            trend={{ label: '+12 admitted', positive: true }}
            accent="emerald"
            icon={<IconUsers className="h-4 w-4" />}
          />
          <StatCard
            label="Sponsors"
            value={summary?.sponsorCount ?? activeSponsors.length}
            hint={`${schoolsWithSponsor} schools covered`}
            accent="rose"
            icon={<IconUserPlus className="h-4 w-4" />}
          />
          <StatCard
            label="Syllabus Completion"
            value={`${avgSyllabus}%`}
            hint="Average across schools"
            accent="amber"
            icon={<IconBook className="h-4 w-4" />}
          />
        </div>
      </section>

      {/* Today's pulse */}
      <section className="grid w-full gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Teachers present',
            value: presentTeachers,
            detail: `of ${teachersCount} on roster`,
            icon: IconClock,
            tone: 'text-sky-700 bg-sky-50 ring-sky-100',
          },
          {
            label: 'Students present',
            value: presentStudents,
            detail: '93% of active roll',
            icon: IconCheck,
            tone: 'text-emerald-700 bg-emerald-50 ring-emerald-100',
          },
          {
            label: 'Schools covered',
            value: schoolsCovered,
            detail: 'Logged activity today',
            icon: IconSchool,
            tone: 'text-orange-700 bg-orange-50 ring-orange-100',
          },
          {
            label: 'Open tickets',
            value: openTickets,
            detail: `${pendingLeaves} leave pending`,
            icon: IconTicket,
            tone: 'text-rose-700 bg-rose-50 ring-rose-100',
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="flex items-center gap-4 p-4" hover>
              <span
                className={`grid h-12 w-12 place-items-center rounded-lg ring-1 ring-inset ${item.tone}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-slate-500">{item.label}</p>
                <p className="text-2xl font-bold tracking-tight text-slate-900">{item.value}</p>
                <p className="text-xs text-slate-400">{item.detail}</p>
              </div>
            </Card>
          );
        })}
      </section>

      {/* Main content grid */}
      <section className="grid w-full gap-4 lg:gap-5 xl:grid-cols-5">
        <Card className="min-w-0 xl:col-span-3" padding="lg">
          <SectionTitle
            action={
              <Link
                to="/admin/syllabus"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                Full syllabus view
              </Link>
            }
          >
            Syllabus completion by school
          </SectionTitle>

          <div
            className={
              schools.length > 4
                ? 'max-h-[28rem] space-y-4 overflow-y-auto overscroll-contain pr-1.5 [scrollbar-gutter:stable]'
                : 'space-y-4'
            }
          >
            {schools.map((school, index) => (
              <div
                key={school.id}
                className="group rounded-xl border border-slate-100/90 bg-gradient-to-br from-slate-50/80 via-white to-sky-50/40 p-4 transition duration-300 hover:border-sky-200/80 hover:from-sky-50/50 hover:to-white hover:shadow-[0_8px_24px_-16px_rgba(0,114,188,0.35)] dark:border-slate-800 dark:from-slate-900/80 dark:via-slate-900 dark:to-sky-950/20 dark:hover:border-sky-800/60"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="flex items-start gap-4">
                  <ProgressRing
                    value={school.syllabusCompletion}
                    size={56}
                    stroke={4}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-50">
                          {school.name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {school.district} · {school.village} · {school.studentCount}{' '}
                          students
                        </p>
                      </div>
                      <Badge tone={progressBadgeTone(school.syllabusCompletion)}>
                        {progressLabel(school.syllabusCompletion)}
                      </Badge>
                    </div>
                    <div className="mt-3.5 flex items-center gap-3">
                      <ProgressBar
                        value={school.syllabusCompletion}
                        variant="logo"
                        className="min-w-0 flex-1"
                      />
                      <span className="shrink-0 text-xs font-bold tabular-nums tracking-tight text-slate-600 dark:text-slate-300">
                        {school.syllabusCompletion}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="min-w-0 xl:col-span-2" padding="lg">
          <SectionTitle
            action={
              <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">
                Live feed
              </span>
            }
          >
            Recent activities
          </SectionTitle>
          <ol className="relative space-y-0">
            {recentActivities.map((item, index) => {
              const meta = activityTone[index % activityTone.length];
              const Icon = meta.icon;
              return (
                <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {index < recentActivities.length - 1 ? (
                    <span className="absolute left-[1.15rem] top-10 h-[calc(100%-1.5rem)] w-px bg-slate-200" />
                  ) : null}
                  <span
                    className={`relative z-[1] grid h-9 w-9 shrink-0 place-items-center rounded-full ${meta.color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm leading-snug text-slate-700">{item.text}</p>
                    <p className="mt-1 text-xs text-slate-400">{item.time}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      </section>

      {/* Action rows */}
      <section className="grid w-full gap-4 lg:grid-cols-3 lg:gap-5">
        <Card className="min-w-0 lg:col-span-2" padding="lg">
          <SectionTitle
            action={
              <Link
                to="/admin/tickets"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600"
              >
                View all <IconArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            Needs attention
          </SectionTitle>
          <div className="space-y-3">
            {tickets
              .filter((t) => t.status !== 'Resolved' && t.status !== 'Closed')
              .map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 bg-gradient-to-r from-white to-slate-50/80 px-4 py-3"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                      <IconAlert className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">
                          {ticket.id.toUpperCase()} · {ticket.type}
                        </p>
                        <Badge tone={ticket.status === 'Open' ? 'danger' : 'warning'}>
                          {ticket.status}
                        </Badge>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-slate-500">
                        {schoolNameById(ticket.schoolId)} — {ticket.description}
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/admin/tickets"
                    title="Assign ticket"
                    aria-label="Assign ticket"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  >
                    <IconUserPlus className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            {pendingLeaves > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-100 bg-amber-50/50 px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-100 text-amber-800">
                    <IconCalendar className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {pendingLeaves} leave request pending approval
                    </p>
                    <p className="text-sm text-slate-500">
                      Teachers waiting for admin response
                    </p>
                  </div>
                </div>
                <Link to="/admin/leaves">
                  <Button type="button" variant="primary">
                    Review leaves
                  </Button>
                </Link>
              </div>
            ) : null}
          </div>
        </Card>

        <Card padding="lg">
          <SectionTitle>Resources</SectionTitle>
          <div className="mb-5 flex items-center gap-4 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-100">
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-white text-slate-700 shadow-sm ring-1 ring-slate-200/80">
              <IconBox className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium text-slate-500">Assets tracked</p>
              <p className="text-2xl font-bold text-slate-900">{assetsCount}</p>
              <p className="text-xs text-slate-400">Computers, UPS, peripherals</p>
            </div>
          </div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            Quick actions
          </p>
          <div className="grid gap-2">
            {[
              { to: '/admin/schools', label: 'Manage schools', icon: IconSchool },
              { to: '/admin/teachers', label: 'Manage teachers', icon: IconUsers },
              { to: '/admin/sponsors', label: 'Assign sponsors', icon: IconUserPlus },
              { to: '/admin/reports', label: 'Export reports', icon: IconTrendUp },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.to}
                  to={action.to}
                  className="group flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:border-orange-200 hover:bg-orange-50/50 hover:text-orange-800"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50 text-slate-500 transition group-hover:bg-white group-hover:text-brand-600">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1">{action.label}</span>
                  <IconArrowRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100" />
                </Link>
              );
            })}
          </div>
        </Card>
      </section>
    </div>
  );
}

function AdminShell({
  title,
  description,
  actions,
  children,
  eyebrow = false,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Optional eyebrow above title. Default: none (matches School Management). */
  eyebrow?: string | false;
}) {
  return (
    <div className="w-full">
      <PageHeader
        title={title}
        description={description}
        actions={actions}
        eyebrow={eyebrow === false ? undefined : eyebrow}
      />
      <div className="w-full min-w-0">{children}</div>
    </div>
  );
}

const emptySchoolForm = {
  name: '',
  district: '',
  mandal: '',
  village: '',
  principalName: '',
  contactNumber: '',
  studentCount: '',
  computerCount: '',
  teacherCount: '',
};

const emptySchoolSponsorDetails = {
  name: '',
  email: '',
  phone: '',
  organization: '',
  address: '',
};

function schoolToForm(school: School) {
  return {
    name: school.name,
    district: school.district,
    mandal: school.mandal,
    village: school.village,
    principalName: school.principalName,
    contactNumber: school.contactNumber,
    studentCount: String(school.studentCount),
    computerCount: String(school.computerCount),
    teacherCount: String(school.teacherCount),
  };
}

const SCHOOLS_PAGE_SIZE = 10;

export function AdminSchoolsPage() {
  const [schoolList, setSchoolList] = useState<School[]>([]);
  const [sponsorOptions, setSponsorOptions] = useState<SponsorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptySchoolForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sponsorOpen, setSponsorOpen] = useState(false);
  const [assignedSponsorId, setAssignedSponsorId] = useState('');
  const [sponsorDetails, setSponsorDetails] = useState(emptySchoolSponsorDetails);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [schoolsData, sponsorsData] = await Promise.all([listSchools(), listSponsors()]);
        if (cancelled) return;
        setSchoolList(schoolsData);
        setSponsorOptions(sponsorsData);
      } catch (e) {
        if (!cancelled) setLoadError(apiErrorMessage(e, 'Failed to load schools'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSchools = schoolList.filter((school) =>
    matchesSearch(
      search,
      school.name,
      school.district,
      school.mandal,
      school.village,
      school.principalName,
      school.contactNumber,
      school.status,
    ),
  );

  const totalPages = Math.max(1, Math.ceil(filteredSchools.length / SCHOOLS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * SCHOOLS_PAGE_SIZE;
  const pageSchools = filteredSchools.slice(pageStart, pageStart + SCHOOLS_PAGE_SIZE);
  const rangeFrom = filteredSchools.length === 0 ? 0 : pageStart + 1;
  const rangeTo = Math.min(pageStart + SCHOOLS_PAGE_SIZE, filteredSchools.length);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const resetSponsorSection = () => {
    setSponsorOpen(false);
    setAssignedSponsorId('');
    setSponsorDetails(emptySchoolSponsorDetails);
  };

  const closeModal = () => {
    setOpen(false);
    setEditingId(null);
    setForm(emptySchoolForm);
    setErrors({});
    resetSponsorSection();
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptySchoolForm);
    setErrors({});
    resetSponsorSection();
    setOpen(true);
  };

  const openEdit = (school: School) => {
    setEditingId(school.id);
    setForm(schoolToForm(school));
    setErrors({});
    resetSponsorSection();
    setOpen(true);
  };

  const setField = (key: keyof typeof emptySchoolForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    touchField(setErrors, key);
  };

  const setSponsorDetailField = (
    key: keyof typeof emptySchoolSponsorDetails,
    value: string,
  ) => {
    setSponsorDetails((prev) => ({ ...prev, [key]: value }));
    touchField(setErrors, `sponsor_${key}`);
  };

  const hasNewSponsorInput = Object.values(sponsorDetails).some((v) => v.trim());
  const isCreate = !editingId;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: FieldErrors = {};
    if (!form.name.trim()) nextErrors.name = enterField('school name');
    if (!form.district.trim()) nextErrors.district = enterField('district');
    if (!form.mandal.trim()) nextErrors.mandal = enterField('mandal');
    if (!form.principalName.trim()) nextErrors.principalName = enterField('principal name');
    if (!form.contactNumber.trim()) nextErrors.contactNumber = enterField('contact number');
    else if (!isValidIndianPhone(form.contactNumber)) {
      nextErrors.contactNumber = 'Enter a valid 10-digit Indian mobile number.';
    }

    // Sponsor section only applies when adding a school
    if (isCreate && sponsorOpen && hasNewSponsorInput) {
      if (!sponsorDetails.name.trim()) nextErrors.sponsor_name = enterField('sponsor name');
      if (!sponsorDetails.email.trim()) nextErrors.sponsor_email = enterField('sponsor email');
      else if (!isValidEmail(sponsorDetails.email)) {
        nextErrors.sponsor_email = 'Enter a valid email address.';
      }
      if (!sponsorDetails.phone.trim()) nextErrors.sponsor_phone = enterField('sponsor phone');
      else if (!isValidIndianPhone(sponsorDetails.phone)) {
        nextErrors.sponsor_phone = 'Enter a valid 10-digit Indian mobile number.';
      }
    }

    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) {
      if (Object.keys(nextErrors).some((k) => k.startsWith('sponsor_'))) {
        setSponsorOpen(true);
      }
      return;
    }

    const fields = {
      name: form.name.trim(),
      district: form.district.trim(),
      mandal: form.mandal.trim(),
      village: form.village.trim(),
      principalName: form.principalName.trim(),
      contactNumber: form.contactNumber.trim(),
      studentCount: Number(form.studentCount) || 0,
      computerCount: Number(form.computerCount) || 0,
      teacherCount: Number(form.teacherCount) || 0,
    };

    setSaving(true);
    try {
      if (editingId) {
        const updated = await updateSchool(editingId, fields);
        setSchoolList((prev) => prev.map((s) => (s.id === editingId ? updated : s)));
      } else {
        let sponsorId: string | undefined;
        if (sponsorOpen && hasNewSponsorInput) {
          const created = await createSponsor({
            name: sponsorDetails.name.trim(),
            email: sponsorDetails.email.trim(),
            phone: sponsorDetails.phone.trim(),
            organization: sponsorDetails.organization.trim() || 'Sponsor',
            address: sponsorDetails.address.trim() || '',
            active: true,
            schoolIds: [],
          });
          const newSponsor = created.sponsor;
          sponsorId = newSponsor.id;
          setSponsorOptions((prev) => [newSponsor, ...prev]);
        } else if (assignedSponsorId) {
          sponsorId = assignedSponsorId;
        }

        const next = await createSchool({
          ...fields,
          status: 'active',
          syllabusCompletion: 0,
          sponsorId,
        });
        setSchoolList((prev) => [next, ...prev]);
        setPage(1);
      }
      closeModal();
    } catch (err) {
      window.alert(apiErrorMessage(err, 'Failed to save school'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      title="School Management"
      description="Add and maintain schools, open school dashboards, and manage programme status."
      actions={
        <>
          <TableSearch
            value={search}
            onChange={setSearch}
            placeholder="Search schools…"
          />
          <Button type="button" variant="primary" onClick={openCreate}>
            Add School
          </Button>
        </>
      }
    >
      {loadError ? (
        <p className="mb-4 text-sm text-rose-600">{loadError}</p>
      ) : null}
      {loading ? (
        <p className="py-10 text-center text-sm text-slate-500">Loading schools…</p>
      ) : (
      <Card padding="none" className="overflow-x-auto overflow-y-clip">
        <DataTable
          className="overflow-visible"
          headers={[
            'School',
            'District / Mandal',
            'Principal',
            'Contact',
            'Students',
            'Computers',
            'Teachers',
            'Status',
            { label: 'Actions', className: 'text-right' },
          ]}
        >
          {pageSchools.length === 0 ? (
            <tr>
              <Td className="py-8 text-center text-slate-500" colSpan={9}>
                No schools match your search.
              </Td>
            </tr>
          ) : (
            pageSchools.map((school) => {
              const isDisabled = school.status === 'disabled';
              return (
                <tr
                  key={school.id}
                  className={isDisabled ? 'opacity-75' : undefined}
                >
                  <Td>
                    <Link
                      to={`/admin/schools/${school.id}`}
                      className="font-medium text-sky-700 underline decoration-sky-700/30 underline-offset-2 transition hover:text-sky-800 hover:decoration-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1 dark:text-sky-400 dark:decoration-sky-400/40 dark:hover:text-sky-300 dark:hover:decoration-sky-300"
                    >
                      {school.name}
                    </Link>
                  </Td>
                  <Td>
                    {school.district}
                    <span className="text-slate-400"> · </span>
                    {school.mandal}
                  </Td>
                  <Td>{school.principalName}</Td>
                  <Td>{school.contactNumber}</Td>
                  <Td>{school.studentCount}</Td>
                  <Td>{school.computerCount}</Td>
                  <Td>{school.teacherCount}</Td>
                  <Td>
                    <Badge tone={isDisabled ? 'warning' : 'success'}>
                      {isDisabled ? 'Disabled' : 'Active'}
                    </Badge>
                  </Td>
                  <Td className="text-right align-middle">
                    <TableRowActions
                      onEdit={() => openEdit(school)}
                      onDelete={() => setDeleteId(school.id)}
                    />
                  </Td>
                </tr>
              );
            })
          )}
        </DataTable>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing{' '}
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {rangeFrom}–{rangeTo}
            </span>{' '}
            of{' '}
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {filteredSchools.length}
            </span>{' '}
            schools
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:pointer-events-none disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <IconChevronLeft className="h-5 w-5" />
            </button>
            <span className="min-w-[4.5rem] text-center text-xs font-medium text-slate-600 dark:text-slate-300">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:pointer-events-none disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <IconChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </Card>
      )}

      <Modal
        open={open}
        onClose={closeModal}
        title={editingId ? 'Edit School' : 'Add School'}
        description={
          editingId
            ? 'Update school details for the trust network.'
            : 'Enter school details to add it to the trust network.'
        }
      >
        <form noValidate onSubmit={handleSubmit} className="px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField id="school-name" label="School name" required error={errors.name}>
                <Input
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="e.g. ZPHS Vijayawada East"
                />
              </FormField>
            </div>
            <FormField id="school-district" label="District" required error={errors.district}>
              <Input
                value={form.district}
                onChange={(e) => setField('district', e.target.value)}
                placeholder="District"
              />
            </FormField>
            <FormField id="school-mandal" label="Mandal" required error={errors.mandal}>
              <Input
                value={form.mandal}
                onChange={(e) => setField('mandal', e.target.value)}
                placeholder="Mandal"
              />
            </FormField>
            <FormField id="school-village" label="Village / area">
              <Input
                value={form.village}
                onChange={(e) => setField('village', e.target.value)}
                placeholder="Village"
              />
            </FormField>
            <FormField
              id="school-principal"
              label="Principal name"
              required
              error={errors.principalName}
            >
              <Input
                value={form.principalName}
                onChange={(e) => setField('principalName', e.target.value)}
                placeholder="Principal"
              />
            </FormField>
            <FormField
              id="school-contact"
              label="Contact number"
              required
              error={errors.contactNumber}
            >
              <Input
                value={form.contactNumber}
                onChange={(e) => setField('contactNumber', e.target.value)}
                placeholder="10-digit mobile"
              />
            </FormField>
            <FormField id="school-students" label="Students">
              <Input
                type="number"
                min={0}
                value={form.studentCount}
                onChange={(e) => setField('studentCount', e.target.value)}
                placeholder="0"
              />
            </FormField>
            <FormField id="school-computers" label="Computers">
              <Input
                type="number"
                min={0}
                value={form.computerCount}
                onChange={(e) => setField('computerCount', e.target.value)}
                placeholder="0"
              />
            </FormField>
            <FormField id="school-teachers" label="Teachers">
              <Input
                type="number"
                min={0}
                value={form.teacherCount}
                onChange={(e) => setField('teacherCount', e.target.value)}
                placeholder="0"
              />
            </FormField>
          </div>

          {/* Add School only — collapsible sponsor under school fields */}
          {isCreate ? (
            <div className="mt-5">
              <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2.5 dark:border-slate-700">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Add Sponsor
                </span>
                <button
                  type="button"
                  onClick={() => setSponsorOpen((v) => !v)}
                  aria-expanded={sponsorOpen}
                  aria-controls="school-sponsor-panel"
                  title={sponsorOpen ? 'Hide sponsor details' : 'Show sponsor details'}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  <IconChevronRight
                    className={`h-4 w-4 transition-transform duration-200 ${
                      sponsorOpen ? 'rotate-90' : ''
                    }`}
                  />
                </button>
              </div>

              {sponsorOpen ? (
                <div
                  id="school-sponsor-panel"
                  className="mt-3 rounded-lg bg-slate-50/90 px-3 py-3 dark:bg-slate-800/50"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <FormField id="school-sponsor-existing" label="Existing sponsor">
                        <select
                          className="field-control w-full"
                          value={assignedSponsorId}
                          onChange={(e) => {
                            setAssignedSponsorId(e.target.value);
                            if (e.target.value) {
                              setSponsorDetails(emptySchoolSponsorDetails);
                            }
                          }}
                        >
                          <option value="">None — create new below (optional)</option>
                          {sponsorOptions.map((sponsor) => (
                            <option key={sponsor.id} value={sponsor.id}>
                              {sponsor.name}
                              {sponsor.organization ? ` · ${sponsor.organization}` : ''}
                            </option>
                          ))}
                        </select>
                      </FormField>
                      <p className="mt-1.5 text-[0.7rem] text-slate-500 dark:text-slate-400">
                        Choose an existing sponsor, or fill the fields below to add a new one.
                      </p>
                    </div>

                    {!assignedSponsorId ? (
                      <>
                        <div className="sm:col-span-2">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            New sponsor details
                          </p>
                        </div>
                        <div className="sm:col-span-2">
                          <FormField
                            id="school-sponsor-name"
                            label="Sponsor name"
                            error={errors.sponsor_name}
                          >
                            <Input
                              value={sponsorDetails.name}
                              onChange={(e) => setSponsorDetailField('name', e.target.value)}
                              placeholder="Full name"
                            />
                          </FormField>
                        </div>
                        <FormField
                          id="school-sponsor-email"
                          label="Email"
                          error={errors.sponsor_email}
                        >
                          <Input
                            type="email"
                            value={sponsorDetails.email}
                            onChange={(e) => setSponsorDetailField('email', e.target.value)}
                            placeholder="sponsor@example.com"
                          />
                        </FormField>
                        <FormField
                          id="school-sponsor-phone"
                          label="Phone"
                          error={errors.sponsor_phone}
                        >
                          <Input
                            value={sponsorDetails.phone}
                            onChange={(e) => setSponsorDetailField('phone', e.target.value)}
                            placeholder="10-digit mobile"
                          />
                        </FormField>
                        <FormField id="school-sponsor-org" label="Organization">
                          <Input
                            value={sponsorDetails.organization}
                            onChange={(e) =>
                              setSponsorDetailField('organization', e.target.value)
                            }
                            placeholder="Organization"
                          />
                        </FormField>
                        <FormField id="school-sponsor-address" label="Address">
                          <Input
                            value={sponsorDetails.address}
                            onChange={(e) => setSponsorDetailField('address', e.target.value)}
                            placeholder="Address"
                          />
                        </FormField>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {editingId ? 'Update School' : 'Save School'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete school"
        description="This school will be removed from the list. This cannot be undone."
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          const id = deleteId;
          if (!id) return;
          try {
            await deleteSchool(id);
            setSchoolList((prev) => prev.filter((s) => s.id !== id));
            setDeleteId(null);
          } catch (err) {
            window.alert(apiErrorMessage(err, 'Failed to delete school'));
            throw err;
          }
        }}
      />
    </AdminShell>
  );
}


export function AdminSchoolDetailsPage() {
  const { schoolId = '' } = useParams<{ schoolId: string }>();
  const [school, setSchool] = useState<School | null>(null);
  const [schoolTeachers, setSchoolTeachers] = useState<TeacherProfile[]>([]);
  const [schoolStudents, setSchoolStudents] = useState<Student[]>([]);
  const [sponsor, setSponsor] = useState<SponsorProfile | undefined>(undefined);
  const [openTickets, setOpenTickets] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState(false);
  const [form, setForm] = useState(emptySchoolForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const [schoolData, teachersData, studentsData, sponsorsData, ticketsData] =
          await Promise.all([
            getSchool(schoolId),
            listTeachers({ schoolId }),
            listStudents({ schoolId }),
            listSponsors(),
            listTickets({ schoolId }),
          ]);
        if (cancelled) return;
        setSchool(schoolData);
        setSchoolTeachers(teachersData);
        setSchoolStudents(studentsData);
        setSponsor(
          schoolData.sponsorId
            ? sponsorsData.find((s) => s.id === schoolData.sponsorId)
            : undefined,
        );
        setOpenTickets(
          ticketsData.filter((t) => t.status !== 'Resolved' && t.status !== 'Closed').length,
        );
      } catch (e) {
        if (!cancelled) {
          setSchool(null);
          setLoadError(apiErrorMessage(e, 'Failed to load school'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  if (loading) {
    return (
      <div className="w-full py-16 text-center text-sm text-slate-500">Loading school…</div>
    );
  }

  if (!school) {
    return (
      <div className="w-full">
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
            <li>
              <Link
                to="/admin/schools"
                className="font-medium text-sky-700 underline decoration-sky-700/30 underline-offset-2 hover:text-sky-800 dark:text-sky-400"
              >
                Schools
              </Link>
            </li>
            <li aria-hidden className="text-slate-300 dark:text-slate-600">
              <IconChevronRight className="h-3.5 w-3.5" />
            </li>
            <li className="font-medium text-slate-700 dark:text-slate-200">School details</li>
          </ol>
        </nav>
        <Card className="py-10 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {loadError ?? 'This school could not be found.'}
          </p>
          <Link
            to="/admin/schools"
            className="mt-3 inline-flex text-sm font-semibold text-sky-700 hover:text-sky-800 dark:text-sky-400"
          >
            Back to School Management
          </Link>
        </Card>
      </div>
    );
  }

  const isDisabled = school.status === 'disabled';

  const openEdit = () => {
    setForm(schoolToForm(school));
    setErrors({});
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setErrors({});
  };

  const setField = (key: keyof typeof emptySchoolForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    touchField(setErrors, key);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: FieldErrors = {};
    if (!form.name.trim()) nextErrors.name = enterField('school name');
    if (!form.district.trim()) nextErrors.district = enterField('district');
    if (!form.mandal.trim()) nextErrors.mandal = enterField('mandal');
    if (!form.principalName.trim()) nextErrors.principalName = enterField('principal name');
    if (!form.contactNumber.trim()) nextErrors.contactNumber = enterField('contact number');
    else if (!isValidIndianPhone(form.contactNumber)) {
      nextErrors.contactNumber = 'Enter a valid 10-digit Indian mobile number.';
    }
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;

    setSaving(true);
    try {
      const updated = await updateSchool(school.id, {
        name: form.name.trim(),
        district: form.district.trim(),
        mandal: form.mandal.trim(),
        village: form.village.trim(),
        principalName: form.principalName.trim(),
        contactNumber: form.contactNumber.trim(),
        studentCount: Number(form.studentCount) || 0,
        computerCount: Number(form.computerCount) || 0,
        teacherCount: Number(form.teacherCount) || 0,
      });
      setSchool(updated);
      closeEdit();
    } catch (err) {
      window.alert(apiErrorMessage(err, 'Failed to update school'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full">
      <nav aria-label="Breadcrumb" className="mb-3 sm:mb-4">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm">
          <li>
            <Link
              to="/admin/schools"
              className="font-medium text-sky-700 underline decoration-sky-700/30 underline-offset-2 transition hover:text-sky-800 dark:text-sky-400 dark:decoration-sky-400/40 dark:hover:text-sky-300"
            >
              Schools
            </Link>
          </li>
          <li aria-hidden className="text-slate-300 dark:text-slate-600">
            <IconChevronRight className="h-3.5 w-3.5" />
          </li>
          <li className="min-w-0 truncate font-medium text-slate-700 dark:text-slate-200">
            School details
          </li>
        </ol>
      </nav>

      <PageHeader
        title={school.name}
        description={`${school.district} · ${school.mandal}${school.village ? ` · ${school.village}` : ''}`}
        actions={
          <>
            <Badge tone={isDisabled ? 'warning' : 'success'}>
              {isDisabled ? 'Disabled' : 'Active'}
            </Badge>
            <Button type="button" variant="outline" onClick={() => setStatusConfirm(true)}>
              {isDisabled ? 'Enable school' : 'Disable school'}
            </Button>
            <Button type="button" variant="primary" onClick={openEdit}>
              Edit school
            </Button>
          </>
        }
      />

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Students"
          value={school.studentCount}
          hint={
            schoolStudents.length
              ? `${schoolStudents.length} in demo roster`
              : 'Enrolled on roll'
          }
          accent="emerald"
          icon={<IconUsers className="h-4 w-4" />}
        />
        <StatCard
          label="Teachers"
          value={school.teacherCount}
          hint={
            schoolTeachers.length
              ? schoolTeachers.map((t) => t.name).join(', ')
              : 'Assigned staff'
          }
          accent="sky"
          icon={<IconUsers className="h-4 w-4" />}
        />
        <StatCard
          label="Computers"
          value={school.computerCount}
          hint="Lab devices"
          accent="brand"
          icon={<IconBox className="h-4 w-4" />}
        />
        <StatCard
          label="Syllabus"
          value={`${school.syllabusCompletion}%`}
          hint={progressLabel(school.syllabusCompletion)}
          accent="amber"
          icon={<IconBook className="h-4 w-4" />}
        />
      </section>

      <section className="mb-5 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3" padding="lg">
          <SectionTitle>School overview</SectionTitle>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge tone={progressBadgeTone(school.syllabusCompletion)}>
              {progressLabel(school.syllabusCompletion)}
            </Badge>
            <span className="text-xs text-slate-500">Syllabus completion</span>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <ProgressRing value={school.syllabusCompletion} size={72} stroke={6} />
            <div className="min-w-0 flex-1">
              <ProgressBar value={school.syllabusCompletion} className="mt-1" />
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Principal {school.principalName} · {school.contactNumber}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Sponsor: {sponsor?.name ?? 'Unassigned'}
                {openTickets > 0
                  ? ` · ${openTickets} open ticket${openTickets === 1 ? '' : 's'}`
                  : ''}
              </p>
            </div>
          </div>

          {schoolTeachers.length > 0 ? (
            <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Teachers at this school
              </p>
              <ul className="space-y-2">
                {schoolTeachers.map((teacher) => (
                  <li
                    key={teacher.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50/90 px-3 py-2 text-sm dark:bg-slate-800/50"
                  >
                    <span className="min-w-0">
                      <Link
                        to={`/admin/teachers/${teacher.id}`}
                        className="font-medium text-sky-700 underline decoration-sky-700/30 underline-offset-2 transition hover:text-sky-800 dark:text-sky-400 dark:decoration-sky-400/40 dark:hover:text-sky-300"
                      >
                        {teacher.name}
                      </Link>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {teacher.employeeId}
                      </span>
                    </span>
                    <span className="text-xs text-slate-500">
                      {teacher.assignedClasses.join(', ') || 'No classes'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>

        <Card className="lg:col-span-2" padding="lg">
          <SectionTitle>Profile</SectionTitle>
          <dl className="mt-1 space-y-2.5">
            {(
              [
                ['School name', school.name],
                ['District', school.district],
                ['Mandal', school.mandal],
                ['Village / area', school.village || '—'],
                ['Principal', school.principalName],
                ['Contact', school.contactNumber],
                ['Students', String(school.studentCount)],
                ['Computers', String(school.computerCount)],
                ['Teachers', String(school.teacherCount)],
                ['Sponsor', sponsor?.name ?? 'Unassigned'],
                ['Status', isDisabled ? 'Disabled' : 'Active'],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-0 last:pb-0 dark:border-slate-800"
              >
                <dt className="text-xs font-medium text-slate-500">{label}</dt>
                <dd className="text-right text-sm font-medium text-slate-800 dark:text-slate-100">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      </section>

      <Modal
        open={editOpen}
        onClose={closeEdit}
        title="Edit School"
        description="Update school details for the trust network."
      >
        <form noValidate onSubmit={handleSave} className="px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField id="detail-school-name" label="School name" required error={errors.name}>
                <Input value={form.name} onChange={(e) => setField('name', e.target.value)} />
              </FormField>
            </div>
            <FormField id="detail-district" label="District" required error={errors.district}>
              <Input
                value={form.district}
                onChange={(e) => setField('district', e.target.value)}
              />
            </FormField>
            <FormField id="detail-mandal" label="Mandal" required error={errors.mandal}>
              <Input value={form.mandal} onChange={(e) => setField('mandal', e.target.value)} />
            </FormField>
            <FormField id="detail-village" label="Village / area">
              <Input value={form.village} onChange={(e) => setField('village', e.target.value)} />
            </FormField>
            <FormField
              id="detail-principal"
              label="Principal name"
              required
              error={errors.principalName}
            >
              <Input
                value={form.principalName}
                onChange={(e) => setField('principalName', e.target.value)}
              />
            </FormField>
            <FormField
              id="detail-contact"
              label="Contact number"
              required
              error={errors.contactNumber}
            >
              <Input
                value={form.contactNumber}
                onChange={(e) => setField('contactNumber', e.target.value)}
              />
            </FormField>
            <FormField id="detail-students" label="Students">
              <Input
                type="number"
                min={0}
                value={form.studentCount}
                onChange={(e) => setField('studentCount', e.target.value)}
              />
            </FormField>
            <FormField id="detail-computers" label="Computers">
              <Input
                type="number"
                min={0}
                value={form.computerCount}
                onChange={(e) => setField('computerCount', e.target.value)}
              />
            </FormField>
            <FormField id="detail-teachers" label="Teachers">
              <Input
                type="number"
                min={0}
                value={form.teacherCount}
                onChange={(e) => setField('teacherCount', e.target.value)}
              />
            </FormField>
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={closeEdit}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              Update School
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={statusConfirm}
        title={isDisabled ? 'Enable school' : 'Disable school'}
        description={
          isDisabled
            ? `${school.name} will be marked Active and included in programme monitoring again.`
            : `${school.name} will be disabled. It stays in the network list but is treated as inactive for operations.`
        }
        confirmLabel={isDisabled ? 'Enable' : 'Disable'}
        confirmVariant={isDisabled ? 'primary' : 'destructive'}
        onClose={() => setStatusConfirm(false)}
        onConfirm={() => {
          void (async () => {
            try {
              const nextStatus = school.status === 'active' ? 'disabled' : 'active';
              const updated = await updateSchool(school.id, { status: nextStatus });
              setSchool(updated);
              setStatusConfirm(false);
            } catch (err) {
              window.alert(apiErrorMessage(err, 'Failed to update school status'));
            }
          })();
        }}
      />
    </div>
  );
}

const emptyTeacherForm = {
  employeeId: '',
  name: '',
  mobile: '',
  email: '',
  qualification: '',
  joiningDate: '',
  schoolId: '',
  assignedClasses: '',
  photoUrl: '',
  active: true as boolean,
};

function nextEmployeeId(teachers: TeacherProfile[]) {
  let max = 1000;
  for (const t of teachers) {
    const match = /^EMP-(\d+)$/i.exec(t.employeeId.trim());
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `EMP-${max + 1}`;
}

function teacherInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function TeacherAvatar({
  name,
  photoUrl,
  size = 'md',
  className = '',
}: {
  name: string;
  photoUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const sizes = {
    sm: 'h-8 w-8 text-[0.65rem]',
    md: 'h-9 w-9 text-[0.7rem]',
    lg: 'h-16 w-16 text-base',
    xl: 'h-20 w-20 text-lg sm:h-[5.5rem] sm:w-[5.5rem] sm:text-xl',
  }[size];

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={`${sizes} shrink-0 rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-slate-800 ${className}`}
      />
    );
  }

  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-100 to-sky-50 font-bold tracking-wide text-sky-800 shadow-sm ring-2 ring-white dark:from-sky-500/25 dark:to-sky-900/40 dark:text-sky-100 dark:ring-slate-800 ${sizes} ${className}`}
      aria-hidden
    >
      {teacherInitials(name) || '—'}
    </span>
  );
}

export function AdminTeachersPage() {
  const [list, setList] = useState<TeacherProfile[]>([]);
  const [schoolOptions, setSchoolOptions] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createdLogin, setCreatedLogin] = useState<{
    name: string;
    email: string;
    employeeId: string;
    password: string;
  } | null>(null);
  const [form, setForm] = useState({
    ...emptyTeacherForm,
    employeeId: 'EMP-1001',
    schoolId: '',
    joiningDate: localDateKey(),
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [teachersData, schoolsData] = await Promise.all([listTeachers(), listSchools()]);
        if (cancelled) return;
        setList(teachersData);
        setSchoolOptions(schoolsData);
        setForm((prev) => ({
          ...prev,
          employeeId: nextEmployeeId(teachersData),
          schoolId: schoolsData[0]?.id ?? '',
        }));
      } catch (e) {
        if (!cancelled) setLoadError(apiErrorMessage(e, 'Failed to load teachers'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const schoolName = (id: string) => schoolOptions.find((s) => s.id === id)?.name;

  const filtered = list.filter((teacher) =>
    matchesSearch(
      search,
      teacher.employeeId,
      teacher.name,
      teacher.mobile,
      teacher.email,
      teacher.qualification,
      teacher.joiningDate,
      schoolName(teacher.schoolId),
      teacher.assignedClasses.join(' '),
    ),
  );

  const resetTeacherForm = () => {
    setForm({
      ...emptyTeacherForm,
      employeeId: nextEmployeeId(list),
      schoolId: schoolOptions[0]?.id ?? '',
      joiningDate: localDateKey(),
      active: true,
    });
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const closeTeacherModal = () => {
    setModalOpen(false);
    setEditingId(null);
    resetTeacherForm();
    setErrors({});
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyTeacherForm,
      employeeId: nextEmployeeId(list),
      schoolId: schoolOptions[0]?.id ?? '',
      joiningDate: localDateKey(),
      active: true,
    });
    setErrors({});
    if (photoInputRef.current) photoInputRef.current.value = '';
    setModalOpen(true);
  };

  const openEdit = (teacher: TeacherProfile) => {
    setEditingId(teacher.id);
    setForm({
      employeeId: teacher.employeeId,
      name: teacher.name,
      mobile: teacher.mobile,
      email: teacher.email,
      qualification: teacher.qualification,
      joiningDate: teacher.joiningDate,
      schoolId: teacher.schoolId,
      assignedClasses: teacher.assignedClasses.join(', '),
      photoUrl: teacher.photoUrl ?? '',
      active: teacher.active,
    });
    setErrors({});
    if (photoInputRef.current) photoInputRef.current.value = '';
    setModalOpen(true);
  };

  const setTeacherField = (
    key: Exclude<keyof typeof emptyTeacherForm, 'active'>,
    value: string,
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    touchField(setErrors, key);
  };

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, photoUrl: 'Choose an image file (JPG, PNG, or WebP).' }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, photoUrl: 'Image must be 2 MB or smaller.' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setForm((prev) => ({ ...prev, photoUrl: result }));
      touchField(setErrors, 'photoUrl');
    };
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    setForm((prev) => ({ ...prev, photoUrl: '' }));
    if (photoInputRef.current) photoInputRef.current.value = '';
    touchField(setErrors, 'photoUrl');
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: FieldErrors = {};
    if (!form.employeeId.trim()) nextErrors.employeeId = enterField('employee ID');
    else {
      const duplicate = list.some(
        (t) =>
          t.employeeId.trim().toLowerCase() === form.employeeId.trim().toLowerCase() &&
          t.id !== editingId,
      );
      if (duplicate) nextErrors.employeeId = 'This employee ID is already in use.';
    }
    if (!form.name.trim()) nextErrors.name = enterField('name');
    if (!form.mobile.trim()) nextErrors.mobile = enterField('mobile number');
    else if (!isValidIndianPhone(form.mobile)) {
      nextErrors.mobile = 'Enter a valid 10-digit Indian mobile number.';
    }
    if (!form.email.trim()) nextErrors.email = enterField('email address');
    else if (!isValidEmail(form.email)) nextErrors.email = 'Enter a valid email address.';
    if (!form.joiningDate) nextErrors.joiningDate = enterField('joining date');
    if (!form.schoolId) nextErrors.schoolId = 'Select a school.';
    if (!form.assignedClasses.trim()) nextErrors.assignedClasses = enterField('assigned classes');
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;

    const classes = form.assignedClasses
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    const photoUrl = form.photoUrl.trim() || undefined;
    const employeeId = form.employeeId.trim().toUpperCase();

    const payload = {
      employeeId,
      name: form.name.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim(),
      qualification: form.qualification.trim(),
      joiningDate: form.joiningDate,
      schoolId: form.schoolId,
      assignedClasses: classes,
      active: form.active,
      photoUrl,
    };

    setSaving(true);
    try {
      if (editingId) {
        const updated = await updateTeacher(editingId, payload);
        setList((prev) => prev.map((t) => (t.id === editingId ? updated : t)));
        closeTeacherModal();
        return;
      }

      const created = await createTeacher(payload);
      setList((prev) => [created.teacher, ...prev]);
      closeTeacherModal();
      setCreatedLogin({
        name: created.teacher.name,
        email: created.teacher.email,
        employeeId: created.teacher.employeeId,
        password: created.tempPassword,
      });
    } catch (err) {
      window.alert(apiErrorMessage(err, 'Failed to save teacher'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      title="Teacher Management"
      description="Create teacher logins, assign schools and classes, reset passwords, and activate or deactivate access."
      actions={
        <>
          <TableSearch value={search} onChange={setSearch} placeholder="Search teachers…" />
          <Button type="button" variant="primary" onClick={openCreate}>
            Add Teacher
          </Button>
        </>
      }
    >
      {loadError ? <p className="mb-4 text-sm text-rose-600">{loadError}</p> : null}
      {loading ? (
        <p className="py-10 text-center text-sm text-slate-500">Loading teachers…</p>
      ) : (
      <Card padding="none" className="overflow-x-auto overflow-y-clip">
        <DataTable
          className="overflow-visible"
          headers={[
            'Employee ID',
            'Name',
            'Mobile',
            'Assigned School',
            'Assigned Classes',
            'Login',
            { label: 'Actions', className: 'text-right' },
          ]}
        >
          {filtered.length === 0 ? (
            <tr>
              <Td className="py-8 text-center text-slate-500" colSpan={7}>
                No teachers match your search.
              </Td>
            </tr>
          ) : (
            filtered.map((teacher) => (
              <tr key={teacher.id} className={teacher.active ? undefined : 'opacity-75'}>
                <Td>
                  <Link
                    to={`/admin/teachers/${teacher.id}`}
                    className="font-medium text-sky-700 underline decoration-sky-700/30 underline-offset-2 transition hover:text-sky-800 hover:decoration-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1 dark:text-sky-400 dark:decoration-sky-400/40 dark:hover:text-sky-300 dark:hover:decoration-sky-300"
                  >
                    {teacher.employeeId}
                  </Link>
                </Td>
                <Td>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <TeacherAvatar name={teacher.name} photoUrl={teacher.photoUrl} size="md" />
                    <span className="truncate font-medium text-slate-900 dark:text-slate-100">
                      {teacher.name}
                    </span>
                  </div>
                </Td>
                <Td>{teacher.mobile}</Td>
                <Td>{schoolName(teacher.schoolId) ?? '—'}</Td>
                <Td>{teacher.assignedClasses.join(', ') || '—'}</Td>
                <Td>
                  <Badge tone={teacher.active ? 'success' : 'danger'}>
                    {teacher.active ? 'Active' : 'Inactive'}
                  </Badge>
                </Td>
                <Td className="text-right align-middle">
                  <TableRowActions
                    onEdit={() => openEdit(teacher)}
                    onDelete={() => setDeleteId(teacher.id)}
                  />
                </Td>
              </tr>
            ))
          )}
        </DataTable>
      </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={closeTeacherModal}
        title={editingId ? 'Edit Teacher' : 'Add Teacher'}
        description={
          editingId
            ? 'Update profile, school and class assignment, and login status.'
            : 'Create a teacher login and assign school and classes.'
        }
      >
        <form noValidate onSubmit={handleSave} className="grid gap-3 px-5 py-4 sm:grid-cols-2">
          {!editingId ? (
            <div className="sm:col-span-2 rounded-lg border border-sky-200/80 bg-sky-50/80 px-3 py-2.5 text-[0.75rem] leading-relaxed text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">
              Saving creates a portal login with the teacher email. A temporary password is shown
              once — they must change it on first login.
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <FormField id="tch-photo" label="Profile picture" error={errors.photoUrl}>
              <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-sky-50/70 p-4 sm:p-5 dark:border-slate-700 dark:from-slate-900/80 dark:via-slate-900/40 dark:to-sky-950/30">
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
                  <input
                    ref={photoInputRef}
                    id="tch-photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={handlePhotoChange}
                  />
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="group relative mx-auto shrink-0 rounded-full outline-none transition-transform duration-200 hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 sm:mx-0"
                    aria-label={form.photoUrl ? 'Change profile picture' : 'Upload profile picture'}
                  >
                    <span className="relative block overflow-hidden rounded-full p-[3px] ring-1 ring-slate-200/90 shadow-sm dark:ring-slate-600">
                      <TeacherAvatar
                        name={form.name.trim() || 'Teacher'}
                        photoUrl={form.photoUrl || undefined}
                        size="xl"
                        className="!ring-0 !shadow-none"
                      />
                      <span
                        className="absolute inset-[3px] grid place-items-center rounded-full bg-slate-950/0 text-white opacity-0 transition-all duration-300 group-hover:bg-slate-950/55 group-hover:opacity-100 group-focus-visible:bg-slate-950/55 group-focus-visible:opacity-100"
                        aria-hidden
                      >
                        <span className="flex flex-col items-center justify-center gap-1 text-center">
                          <IconImage className="h-4 w-4 text-white" />
                          <span className="text-[0.65rem] font-semibold leading-none whitespace-nowrap">
                            {form.photoUrl ? 'Change photo' : 'Upload photo'}
                          </span>
                        </span>
                      </span>
                    </span>
                  </button>
                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {form.photoUrl ? 'Photo ready' : 'Add a profile photo'}
                    </p>
                    <p className="mt-1 text-[0.75rem] text-slate-500">
                      Hover the photo to upload. JPG, PNG, WebP or GIF · max 2&nbsp;MB.
                    </p>
                    {form.photoUrl ? (
                      <button
                        type="button"
                        onClick={clearPhoto}
                        className="mt-2.5 text-[0.75rem] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400"
                      >
                        Remove photo
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </FormField>
          </div>

          <div className="sm:col-span-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Teacher Details</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Required profile fields for the teacher record and portal login.
            </p>
          </div>

          <FormField id="tch-employee-id" label="Employee ID" required error={errors.employeeId}>
            <Input
              value={form.employeeId}
              onChange={(e) => setTeacherField('employeeId', e.target.value)}
              placeholder="e.g. EMP-1003"
            />
          </FormField>
          <FormField id="tch-name" label="Name" required error={errors.name}>
            <Input
              value={form.name}
              onChange={(e) => setTeacherField('name', e.target.value)}
              placeholder="Full name"
            />
          </FormField>
          <FormField id="tch-mobile" label="Mobile" required error={errors.mobile}>
            <Input
              value={form.mobile}
              onChange={(e) => setTeacherField('mobile', e.target.value)}
              placeholder="10-digit mobile"
            />
          </FormField>
          <FormField id="tch-email" label="Email" required error={errors.email}>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setTeacherField('email', e.target.value)}
              placeholder="teacher@example.org"
            />
          </FormField>
          <FormField id="tch-qual" label="Qualification" error={errors.qualification}>
            <Input
              value={form.qualification}
              onChange={(e) => setTeacherField('qualification', e.target.value)}
              placeholder="e.g. B.Sc Computers, B.Ed"
            />
          </FormField>
          <FormField id="tch-join" label="Joining Date" required error={errors.joiningDate}>
            <Input
              type="date"
              value={form.joiningDate}
              onChange={(e) => setTeacherField('joiningDate', e.target.value)}
            />
          </FormField>
          <FormField id="tch-school" label="Assigned School" required error={errors.schoolId}>
            <select
              className="field-control w-full"
              value={form.schoolId}
              onChange={(e) => setTeacherField('schoolId', e.target.value)}
            >
              <option value="">Select school</option>
              {schoolOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            id="tch-classes"
            label="Assigned Classes"
            required
            error={errors.assignedClasses}
          >
            <Input
              value={form.assignedClasses}
              onChange={(e) => setTeacherField('assignedClasses', e.target.value)}
              placeholder="e.g. 6, 7, 8"
            />
          </FormField>
          {editingId ? (
            <div className="sm:col-span-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/50">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
                  checked={form.active}
                  onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                />
                <span className="text-sm text-slate-700 dark:text-slate-200">
                  Login active (teacher can sign in to the portal)
                </span>
              </label>
            </div>
          ) : null}
          <div className="sm:col-span-2 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={closeTeacherModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {editingId ? 'Update Teacher' : 'Create login & save'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Remove teacher"
        description="This teacher and their portal login will be removed from the list."
        confirmLabel="Remove"
        confirmVariant="destructive"
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          const id = deleteId;
          if (!id) return;
          try {
            await deleteTeacher(id);
            setList((prev) => prev.filter((t) => t.id !== id));
            setDeleteId(null);
          } catch (err) {
            window.alert(apiErrorMessage(err, 'Failed to delete teacher'));
            throw err;
          }
        }}
      />

      <Modal
        open={Boolean(createdLogin)}
        onClose={() => setCreatedLogin(null)}
        title="Teacher login created"
        description="Share these credentials. The teacher must set a new password after first login."
      >
        <div className="space-y-3 px-5 py-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Login created for{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {createdLogin?.name}
            </span>
            .
          </p>
          <dl className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Employee ID</dt>
              <dd className="font-medium">{createdLogin?.employeeId}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium">{createdLogin?.email}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Temp password</dt>
              <dd className="font-mono font-semibold text-emerald-800 dark:text-emerald-300">
                {createdLogin?.password}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-slate-500">
            After signing in with this temporary password, the teacher will be asked to choose their
            own password before accessing the portal.
          </p>
          <div className="flex justify-end">
            <Button type="button" variant="primary" onClick={() => setCreatedLogin(null)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </AdminShell>
  );
}

export function AdminTeacherDetailsPage() {
  const { teacherId = '' } = useParams<{ teacherId: string }>();
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [schoolOptions, setSchoolOptions] = useState<School[]>([]);
  const [teacherLeaves, setTeacherLeaves] = useState<LeaveRequest[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [form, setForm] = useState({
    ...emptyTeacherForm,
    schoolId: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const [teacherData, schoolsData, leavesData] = await Promise.all([
          getTeacher(teacherId),
          listSchools(),
          listLeaves({ teacherId }),
        ]);
        if (cancelled) return;
        setTeacher(teacherData);
        setSchoolOptions(schoolsData);
        setSchool(schoolsData.find((s) => s.id === teacherData.schoolId) ?? null);
        setTeacherLeaves(leavesData);
      } catch (e) {
        if (!cancelled) {
          setTeacher(null);
          setLoadError(apiErrorMessage(e, 'Failed to load teacher'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [teacherId]);

  if (loading) {
    return (
      <div className="w-full py-16 text-center text-sm text-slate-500">Loading teacher…</div>
    );
  }

  if (!teacher) {
    return (
      <div className="w-full">
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
            <li>
              <Link
                to="/admin/teachers"
                className="font-medium text-sky-700 underline decoration-sky-700/30 underline-offset-2 hover:text-sky-800 dark:text-sky-400"
              >
                Teachers
              </Link>
            </li>
            <li aria-hidden className="text-slate-300 dark:text-slate-600">
              <IconChevronRight className="h-3.5 w-3.5" />
            </li>
            <li className="font-medium text-slate-700 dark:text-slate-200">Employee details</li>
          </ol>
        </nav>
        <Card className="py-10 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {loadError ?? 'This employee could not be found.'}
          </p>
          <Link
            to="/admin/teachers"
            className="mt-3 inline-flex text-sm font-semibold text-sky-700 hover:text-sky-800 dark:text-sky-400"
          >
            Back to Teacher Management
          </Link>
        </Card>
      </div>
    );
  }

  const pendingLeaves = teacherLeaves.filter((l) => l.status === 'Pending').length;
  const joiningLabel = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(teacher.joiningDate));

  const closeEdit = () => {
    setEditOpen(false);
    setErrors({});
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const openEdit = () => {
    setForm({
      employeeId: teacher.employeeId,
      name: teacher.name,
      mobile: teacher.mobile,
      email: teacher.email,
      qualification: teacher.qualification,
      joiningDate: teacher.joiningDate,
      schoolId: teacher.schoolId,
      assignedClasses: teacher.assignedClasses.join(', '),
      photoUrl: teacher.photoUrl ?? '',
      active: teacher.active,
    });
    setErrors({});
    if (photoInputRef.current) photoInputRef.current.value = '';
    setEditOpen(true);
  };

  const setTeacherField = (
    key: Exclude<keyof typeof emptyTeacherForm, 'active'>,
    value: string,
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    touchField(setErrors, key);
  };

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, photoUrl: 'Choose an image file (JPG, PNG, or WebP).' }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, photoUrl: 'Image must be 2 MB or smaller.' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setForm((prev) => ({ ...prev, photoUrl: result }));
      touchField(setErrors, 'photoUrl');
    };
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    setForm((prev) => ({ ...prev, photoUrl: '' }));
    if (photoInputRef.current) photoInputRef.current.value = '';
    touchField(setErrors, 'photoUrl');
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: FieldErrors = {};
    if (!form.name.trim()) nextErrors.name = enterField('name');
    if (!form.mobile.trim()) nextErrors.mobile = enterField('mobile number');
    else if (!isValidIndianPhone(form.mobile)) {
      nextErrors.mobile = 'Enter a valid 10-digit Indian mobile number.';
    }
    if (!form.email.trim()) nextErrors.email = enterField('email address');
    else if (!isValidEmail(form.email)) nextErrors.email = 'Enter a valid email address.';
    if (!form.joiningDate) nextErrors.joiningDate = enterField('joining date');
    if (!form.schoolId) nextErrors.schoolId = 'Select a school.';
    if (!form.assignedClasses.trim()) nextErrors.assignedClasses = enterField('assigned classes');
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;

    const classes = form.assignedClasses
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    const photoUrl = form.photoUrl.trim() || undefined;

    setSaving(true);
    try {
      const updated = await updateTeacher(teacher.id, {
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim(),
        qualification: form.qualification.trim(),
        joiningDate: form.joiningDate,
        schoolId: form.schoolId,
        assignedClasses: classes.length ? classes : teacher.assignedClasses,
        active: form.active,
        photoUrl,
      });
      setTeacher(updated);
      setSchool(schoolOptions.find((s) => s.id === updated.schoolId) ?? null);
      closeEdit();
    } catch (err) {
      window.alert(apiErrorMessage(err, 'Failed to update teacher'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full">
      <nav aria-label="Breadcrumb" className="mb-3 sm:mb-4">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm">
          <li>
            <Link
              to="/admin/teachers"
              className="font-medium text-sky-700 underline decoration-sky-700/30 underline-offset-2 transition hover:text-sky-800 dark:text-sky-400 dark:decoration-sky-400/40 dark:hover:text-sky-300"
            >
              Teachers
            </Link>
          </li>
          <li aria-hidden className="text-slate-300 dark:text-slate-600">
            <IconChevronRight className="h-3.5 w-3.5" />
          </li>
          <li className="min-w-0 truncate font-medium text-slate-700 dark:text-slate-200">
            Employee details
          </li>
        </ol>
      </nav>

      <PageHeader
        title={teacher.name}
        description={`${teacher.employeeId} · ${school?.name ?? 'Unassigned school'}`}
        actions={
          <>
            <Badge tone={teacher.active ? 'success' : 'danger'}>
              {teacher.active ? 'Active' : 'Inactive'}
            </Badge>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTempPassword(null);
                setResetOpen(true);
              }}
            >
              Reset password
            </Button>
            <Button type="button" variant="outline" onClick={() => setStatusConfirm(true)}>
              {teacher.active ? 'Deactivate login' : 'Activate login'}
            </Button>
            <Button type="button" variant="primary" onClick={openEdit}>
              Edit teacher
            </Button>
          </>
        }
      />

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Classes"
          value={teacher.assignedClasses.length}
          hint={
            teacher.assignedClasses.length
              ? teacher.assignedClasses.join(', ')
              : 'No classes assigned'
          }
          accent="sky"
          icon={<IconBook className="h-4 w-4" />}
        />
        <StatCard
          label="School"
          value={school?.district ?? '—'}
          hint={school?.name ?? 'Not assigned'}
          accent="emerald"
          icon={<IconSchool className="h-4 w-4" />}
        />
        <StatCard
          label="Joined"
          value={teacher.joiningDate.slice(0, 4)}
          hint={joiningLabel}
          accent="brand"
          icon={<IconCalendar className="h-4 w-4" />}
        />
        <StatCard
          label="Leave requests"
          value={teacherLeaves.length}
          hint={
            pendingLeaves
              ? `${pendingLeaves} pending`
              : teacherLeaves.length
                ? 'No pending requests'
                : 'No leave history'
          }
          accent="amber"
          icon={<IconClipboard className="h-4 w-4" />}
        />
      </section>

      <section className="mb-5 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3" padding="lg">
          <SectionTitle>Employee overview</SectionTitle>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
            <TeacherAvatar
              name={teacher.name}
              photoUrl={teacher.photoUrl}
              size="xl"
              className="mx-auto sm:mx-0"
            />
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-base font-semibold text-slate-900 dark:text-slate-50">
                {teacher.name}
              </p>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                {teacher.qualification || 'Qualification not set'}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <Badge tone={teacher.active ? 'success' : 'danger'}>
                  {teacher.active ? 'Active' : 'Inactive'}
                </Badge>
                <span className="text-xs text-slate-500">ID {teacher.employeeId}</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Contact {teacher.mobile} · {teacher.email}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                School:{' '}
                {school ? (
                  <Link
                    to={`/admin/schools/${school.id}`}
                    className="font-medium text-sky-700 underline decoration-sky-700/30 underline-offset-2 hover:text-sky-800 dark:text-sky-400 dark:decoration-sky-400/40"
                  >
                    {school.name}
                  </Link>
                ) : (
                  'Unassigned'
                )}
              </p>
            </div>
          </div>

          {teacher.assignedClasses.length > 0 ? (
            <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Assigned classes
              </p>
              <div className="flex flex-wrap gap-2">
                {teacher.assignedClasses.map((cls) => (
                  <span
                    key={cls}
                    className="rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800 ring-1 ring-sky-100 dark:bg-sky-500/15 dark:text-sky-200 dark:ring-sky-500/25"
                  >
                    Class {cls}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {teacherLeaves.length > 0 ? (
            <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Recent leave
              </p>
              <ul className="space-y-2">
                {teacherLeaves.slice(0, 3).map((leave) => (
                  <li
                    key={leave.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50/90 px-3 py-2 text-sm dark:bg-slate-800/50"
                  >
                    <span className="font-medium text-slate-800 dark:text-slate-100">
                      {leave.type}
                    </span>
                    <span className="text-xs text-slate-500">
                      {leave.fromDate} → {leave.toDate} · {leave.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>

        <Card className="lg:col-span-2" padding="lg">
          <SectionTitle>Profile</SectionTitle>
          <dl className="mt-1 space-y-2.5">
            {(
              [
                ['Employee ID', teacher.employeeId],
                ['Name', teacher.name],
                ['Mobile', teacher.mobile],
                ['Email', teacher.email],
                ['Qualification', teacher.qualification || '—'],
                ['Joining Date', joiningLabel],
                ['Assigned School', school?.name ?? 'Unassigned'],
                [
                  'Assigned Classes',
                  teacher.assignedClasses.length
                    ? teacher.assignedClasses.join(', ')
                    : '—',
                ],
                ['Login', teacher.active ? 'Active' : 'Inactive'],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-0 last:pb-0 dark:border-slate-800"
              >
                <dt className="text-xs font-medium text-slate-500">{label}</dt>
                <dd className="text-right text-sm font-medium text-slate-800 dark:text-slate-100">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      </section>

      <Modal
        open={editOpen}
        onClose={closeEdit}
        title="Edit Employee"
        description="Update teacher profile and school assignment."
      >
        <form noValidate onSubmit={handleSave} className="grid gap-3 px-5 py-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormField id="detail-tch-photo" label="Profile picture" error={errors.photoUrl}>
              <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-sky-50/70 p-4 dark:border-slate-700 dark:from-slate-900/80 dark:via-slate-900/40 dark:to-sky-950/30">
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
                  <input
                    ref={photoInputRef}
                    id="detail-tch-photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={handlePhotoChange}
                  />
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="group relative mx-auto shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 sm:mx-0"
                    aria-label={form.photoUrl ? 'Change profile picture' : 'Upload profile picture'}
                  >
                    <span className="relative block overflow-hidden rounded-full p-[3px] ring-1 ring-slate-200/90 dark:ring-slate-600">
                      <TeacherAvatar
                        name={form.name.trim() || teacher.name}
                        photoUrl={form.photoUrl || undefined}
                        size="xl"
                        className="!ring-0 !shadow-none"
                      />
                      <span
                        className="absolute inset-[3px] grid place-items-center rounded-full bg-slate-950/0 text-white opacity-0 transition-all duration-300 group-hover:bg-slate-950/55 group-hover:opacity-100 group-focus-visible:bg-slate-950/55 group-focus-visible:opacity-100"
                        aria-hidden
                      >
                        <span className="flex flex-col items-center justify-center gap-1 text-center">
                          <IconImage className="h-4 w-4" />
                          <span className="text-[0.65rem] font-semibold leading-none whitespace-nowrap">
                            {form.photoUrl ? 'Change photo' : 'Upload photo'}
                          </span>
                        </span>
                      </span>
                    </span>
                  </button>
                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {form.photoUrl ? 'Photo ready' : 'Add a profile photo'}
                    </p>
                    <p className="mt-1 text-[0.75rem] text-slate-500">
                      Hover the photo to upload or change. Max 2&nbsp;MB.
                    </p>
                    {form.photoUrl ? (
                      <button
                        type="button"
                        onClick={clearPhoto}
                        className="mt-2.5 text-[0.75rem] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400"
                      >
                        Remove photo
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <FormField id="detail-tch-name" label="Name" required error={errors.name}>
              <Input
                value={form.name}
                onChange={(e) => setTeacherField('name', e.target.value)}
                placeholder="Full name"
              />
            </FormField>
          </div>
          <FormField id="detail-tch-mobile" label="Mobile" required error={errors.mobile}>
            <Input
              value={form.mobile}
              onChange={(e) => setTeacherField('mobile', e.target.value)}
              placeholder="10-digit mobile"
            />
          </FormField>
          <FormField id="detail-tch-email" label="Email (login)" required error={errors.email}>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setTeacherField('email', e.target.value)}
              placeholder="teacher@example.org"
            />
          </FormField>
          <FormField id="detail-tch-qual" label="Qualification">
            <Input
              value={form.qualification}
              onChange={(e) => setTeacherField('qualification', e.target.value)}
              placeholder="e.g. B.Ed, MCA"
            />
          </FormField>
          <FormField id="detail-tch-join" label="Joining Date" required error={errors.joiningDate}>
            <Input
              type="date"
              value={form.joiningDate}
              onChange={(e) => setTeacherField('joiningDate', e.target.value)}
            />
          </FormField>
          <FormField id="detail-tch-school" label="Assign School" required error={errors.schoolId}>
            <select
              className="field-control w-full"
              value={form.schoolId}
              onChange={(e) => setTeacherField('schoolId', e.target.value)}
            >
              <option value="">Select school</option>
              {schoolOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            id="detail-tch-classes"
            label="Assign Classes"
            required
            error={errors.assignedClasses}
          >
            <Input
              value={form.assignedClasses}
              onChange={(e) => setTeacherField('assignedClasses', e.target.value)}
              placeholder="e.g. 6, 7, 8"
            />
          </FormField>
          <div className="sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/50">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
                checked={form.active}
                onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
              />
              <span className="text-sm text-slate-700 dark:text-slate-200">
                Login active (teacher can sign in to the portal)
              </span>
            </label>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={closeEdit}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              Update Teacher
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={resetOpen}
        onClose={() => {
          setResetOpen(false);
          setTempPassword(null);
        }}
        title={tempPassword ? 'Password reset' : 'Reset password'}
        description={
          tempPassword
            ? 'Share this temporary password securely. On next login the teacher must set their own password.'
            : `Generate a new temporary password for ${teacher.name} (${teacher.email})? They will be required to change it after signing in.`
        }
      >
        <div className="space-y-3 px-5 py-4">
          {tempPassword ? (
            <dl className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/50">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Email</dt>
                <dd className="font-medium">{teacher.email}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Temp password</dt>
                <dd className="font-mono font-semibold text-sky-700 dark:text-sky-300">
                  {tempPassword}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              The teacher signs in with the temporary password, then must choose a new password before
              using the app.
            </p>
          )}
          {resetError ? <p className="text-sm text-rose-600">{resetError}</p> : null}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            {tempPassword ? (
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setResetOpen(false);
                  setTempPassword(null);
                }}
              >
                Done
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setResetOpen(false);
                    setTempPassword(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    void (async () => {
                      setResetError(null);
                      try {
                        const result = await resetTeacherPassword(teacher.id);
                        setTempPassword(result.tempPassword);
                      } catch (err) {
                        setResetError(apiErrorMessage(err, 'Password reset failed'));
                      }
                    })();
                  }}
                >
                  Reset password
                </Button>
              </>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={statusConfirm}
        title={teacher.active ? 'Deactivate login' : 'Activate login'}
        description={
          teacher.active
            ? `${teacher.name} will be marked inactive and lose portal access for operations.`
            : `${teacher.name} will be marked active and can use the teacher portal again.`
        }
        confirmLabel={teacher.active ? 'Deactivate' : 'Activate'}
        confirmVariant={teacher.active ? 'destructive' : 'primary'}
        onClose={() => setStatusConfirm(false)}
        onConfirm={() => {
          void (async () => {
            try {
              const updated = await updateTeacher(teacher.id, { active: !teacher.active });
              setTeacher(updated);
              setStatusConfirm(false);
            } catch (err) {
              window.alert(apiErrorMessage(err, 'Failed to update teacher status'));
            }
          })();
        }}
      />
    </div>
  );
}

/** Sync schoolIds on each sponsor from school.sponsorId links */
function rebuildSponsorSchools(
  schoolList: School[],
  sponsorList: SponsorProfile[],
): SponsorProfile[] {
  return sponsorList.map((sponsor) => ({
    ...sponsor,
    schoolIds: schoolList.filter((s) => s.sponsorId === sponsor.id).map((s) => s.id),
  }));
}

const emptySponsorForm = {
  name: '',
  email: '',
  phone: '',
  organization: '',
  address: '',
};

export function AdminSponsorsPage() {
  const [schoolList, setSchoolList] = useState<School[]>([]);
  const [sponsorList, setSponsorList] = useState<SponsorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [assigning, setAssigning] = useState<School | null>(null);
  const [selectedSponsorId, setSelectedSponsorId] = useState('');
  const [sponsorModalOpen, setSponsorModalOpen] = useState(false);
  const [editingSponsorId, setEditingSponsorId] = useState<string | null>(null);
  const [deleteSponsorId, setDeleteSponsorId] = useState<string | null>(null);
  const [sponsorForm, setSponsorForm] = useState(emptySponsorForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const orgSuggestRef = useRef<HTMLDivElement>(null);
  /** Assign popup — create-new vs pick existing (concept layout) */
  const [assignNewForm, setAssignNewForm] = useState(emptySponsorForm);
  const [assignErrors, setAssignErrors] = useState<FieldErrors>({});
  const [assignOrgOpen, setAssignOrgOpen] = useState(false);
  const assignOrgRef = useRef<HTMLDivElement>(null);
  const [assignPanelOpen, setAssignPanelOpen] = useState(true);
  const [createdSponsorLogin, setCreatedSponsorLogin] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [schoolsData, sponsorsData] = await Promise.all([listSchools(), listSponsors()]);
        if (cancelled) return;
        setSchoolList(schoolsData);
        setSponsorList(rebuildSponsorSchools(schoolsData, sponsorsData));
      } catch (e) {
        if (!cancelled) setLoadError(apiErrorMessage(e, 'Failed to load sponsors'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const unassignedCount = schoolList.filter((s) => !s.sponsorId).length;
  const assignedCount = schoolList.filter((s) => s.sponsorId).length;

  const filteredSponsors = sponsorList.filter((sponsor) =>
    matchesSearch(
      search,
      sponsor.name,
      sponsor.email,
      sponsor.phone,
      sponsor.organization,
      sponsor.address,
      schoolList
        .filter((s) => s.sponsorId === sponsor.id)
        .map((s) => s.name)
        .join(' '),
    ),
  );

  const filteredSchools = schoolList.filter((school) => {
    const sponsor = school.sponsorId
      ? sponsorList.find((s) => s.id === school.sponsorId)
      : undefined;
    return matchesSearch(
      search,
      school.name,
      school.district,
      school.mandal,
      sponsor?.name,
      sponsor?.organization,
    );
  });

  const openAssign = (school: School) => {
    setAssigning(school);
    setSelectedSponsorId(school.sponsorId ?? '');
    setAssignNewForm(emptySponsorForm);
    setAssignErrors({});
    setAssignOrgOpen(false);
    setAssignPanelOpen(true);
  };

  const closeAssign = () => {
    setAssigning(null);
    setSelectedSponsorId('');
    setAssignNewForm(emptySponsorForm);
    setAssignErrors({});
    setAssignOrgOpen(false);
    setAssignPanelOpen(true);
  };

  const setAssignNewField = (key: keyof typeof emptySponsorForm, value: string) => {
    setAssignNewForm((prev) => ({ ...prev, [key]: value }));
    setAssignErrors((prev) => clearFieldError(prev, key));
    if (key === 'organization') setAssignOrgOpen(true);
  };

  const assignOrgSuggestions = (() => {
    const q = assignNewForm.organization.trim().toLowerCase();
    const byOrg = new Map<string, string[]>();
    for (const sponsor of sponsorList) {
      const org = sponsor.organization.trim();
      if (!org) continue;
      const schools = byOrg.get(org) ?? [];
      for (const school of schoolList) {
        if (school.sponsorId === sponsor.id && !schools.includes(school.name)) {
          schools.push(school.name);
        }
      }
      byOrg.set(org, schools);
    }
    return [...byOrg.entries()]
      .map(([organization, schools]) => ({ organization, schools: schools.sort() }))
      .filter(({ organization }) => (q ? organization.toLowerCase().includes(q) : true))
      .sort((a, b) => a.organization.localeCompare(b.organization))
      .slice(0, 8);
  })();

  const closeSponsorModal = () => {
    setSponsorModalOpen(false);
    setEditingSponsorId(null);
    setSponsorForm(emptySponsorForm);
    setErrors({});
    setOrgDropdownOpen(false);
  };

  const openCreateSponsor = () => {
    setEditingSponsorId(null);
    setSponsorForm(emptySponsorForm);
    setErrors({});
    setOrgDropdownOpen(false);
    setSponsorModalOpen(true);
  };

  const openEditSponsor = (sponsor: SponsorProfile) => {
    setEditingSponsorId(sponsor.id);
    setSponsorForm({
      name: sponsor.name,
      email: sponsor.email,
      phone: sponsor.phone,
      organization: sponsor.organization,
      address: sponsor.address,
    });
    setErrors({});
    setOrgDropdownOpen(false);
    setSponsorModalOpen(true);
  };

  const setSponsorField = (key: keyof typeof emptySponsorForm, value: string) => {
    setSponsorForm((prev) => ({ ...prev, [key]: value }));
    touchField(setErrors, key);
    if (key === 'organization') setOrgDropdownOpen(true);
  };

  /** Unique organizations + linked school names for Organization autosuggest */
  const organizationSuggestions = (() => {
    const q = sponsorForm.organization.trim().toLowerCase();
    const byOrg = new Map<string, string[]>();

    for (const sponsor of sponsorList) {
      const org = sponsor.organization.trim();
      if (!org) continue;
      const schools = byOrg.get(org) ?? [];
      for (const school of schoolList) {
        if (school.sponsorId === sponsor.id && !schools.includes(school.name)) {
          schools.push(school.name);
        }
      }
      byOrg.set(org, schools);
    }

    return [...byOrg.entries()]
      .map(([organization, schools]) => ({ organization, schools: schools.sort() }))
      .filter(({ organization }) =>
        q ? organization.toLowerCase().includes(q) : true,
      )
      .sort((a, b) => a.organization.localeCompare(b.organization))
      .slice(0, 8);
  })();

  useEffect(() => {
    if (!orgDropdownOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const el = orgSuggestRef.current;
      if (el && !el.contains(event.target as Node)) {
        setOrgDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [orgDropdownOpen]);

  useEffect(() => {
    if (!assignOrgOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const el = assignOrgRef.current;
      if (el && !el.contains(event.target as Node)) {
        setAssignOrgOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [assignOrgOpen]);

  const handleSponsorSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: FieldErrors = {};
    if (!sponsorForm.name.trim()) nextErrors.name = enterField('sponsor name');
    if (!sponsorForm.organization.trim()) nextErrors.organization = enterField('organization');
    if (!sponsorForm.phone.trim()) nextErrors.phone = enterField('phone number');
    else if (!isValidIndianPhone(sponsorForm.phone)) {
      nextErrors.phone = 'Enter a valid 10-digit Indian mobile number.';
    }
    if (!sponsorForm.email.trim()) nextErrors.email = enterField('email address');
    else if (!isValidEmail(sponsorForm.email)) nextErrors.email = 'Enter a valid email address.';
    if (!sponsorForm.address.trim()) nextErrors.address = enterField('address');
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;

    const fields = {
      name: sponsorForm.name.trim(),
      email: sponsorForm.email.trim(),
      phone: sponsorForm.phone.trim(),
      organization: sponsorForm.organization.trim(),
      address: sponsorForm.address.trim(),
    };

    try {
      if (editingSponsorId) {
        const updated = await updateSponsor(editingSponsorId, fields);
        setSponsorList((prev) =>
          rebuildSponsorSchools(
            schoolList,
            prev.map((s) => (s.id === editingSponsorId ? { ...s, ...updated } : s)),
          ),
        );
      } else {
        const created = await createSponsor({ ...fields, active: true, schoolIds: [] });
        setSponsorList((prev) =>
          rebuildSponsorSchools(schoolList, [created.sponsor, ...prev]),
        );
        if (created.tempPassword) {
          setCreatedSponsorLogin({
            name: created.sponsor.name,
            email: created.sponsor.email,
            password: created.tempPassword,
          });
        }
      }
      closeSponsorModal();
    } catch (err) {
      window.alert(apiErrorMessage(err, 'Failed to save sponsor'));
    }
  };

  const applySponsor = async (e: FormEvent) => {
    e.preventDefault();
    if (!assigning) return;

    if (selectedSponsorId) {
      try {
        const updated = await updateSchool(assigning.id, { sponsorId: selectedSponsorId });
        setSchoolList((prev) => {
          const nextSchools = prev.map((s) => (s.id === assigning.id ? updated : s));
          setSponsorList((prevSponsors) => rebuildSponsorSchools(nextSchools, prevSponsors));
          return nextSchools;
        });
        closeAssign();
      } catch (err) {
        window.alert(apiErrorMessage(err, 'Failed to assign sponsor'));
      }
      return;
    }

    const hasNewInput = Object.values(assignNewForm).some((v) => v.trim());
    if (!hasNewInput) {
      try {
        const updated = await updateSchool(assigning.id, { sponsorId: undefined });
        setSchoolList((prev) => {
          const nextSchools = prev.map((s) =>
            s.id === assigning.id ? { ...updated, sponsorId: undefined } : s,
          );
          setSponsorList((prevSponsors) => rebuildSponsorSchools(nextSchools, prevSponsors));
          return nextSchools;
        });
        closeAssign();
      } catch (err) {
        window.alert(apiErrorMessage(err, 'Failed to clear sponsor'));
      }
      return;
    }

    const nextErrors: FieldErrors = {};
    if (!assignNewForm.name.trim()) nextErrors.name = enterField('sponsor name');
    if (!assignNewForm.organization.trim()) {
      nextErrors.organization = enterField('organization');
    }
    if (!assignNewForm.phone.trim()) nextErrors.phone = enterField('phone number');
    else if (!isValidIndianPhone(assignNewForm.phone)) {
      nextErrors.phone = 'Enter a valid 10-digit Indian mobile number.';
    }
    if (!assignNewForm.email.trim()) nextErrors.email = enterField('email address');
    else if (!isValidEmail(assignNewForm.email)) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (!assignNewForm.address.trim()) nextErrors.address = enterField('address');
    setAssignErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) {
      setAssignPanelOpen(true);
      return;
    }

    try {
      const created = await createSponsor({
        name: assignNewForm.name.trim(),
        email: assignNewForm.email.trim(),
        phone: assignNewForm.phone.trim(),
        organization: assignNewForm.organization.trim(),
        address: assignNewForm.address.trim(),
        active: true,
        schoolIds: [],
      });
      const newSponsor = created.sponsor;
      const updatedSchool = await updateSchool(assigning.id, { sponsorId: newSponsor.id });
      setSchoolList((prev) => {
        const nextSchools = prev.map((s) => (s.id === assigning.id ? updatedSchool : s));
        setSponsorList((prevSponsors) =>
          rebuildSponsorSchools(nextSchools, [newSponsor, ...prevSponsors]),
        );
        return nextSchools;
      });
      if (created.tempPassword) {
        setCreatedSponsorLogin({
          name: newSponsor.name,
          email: newSponsor.email,
          password: created.tempPassword,
        });
      }
      closeAssign();
    } catch (err) {
      window.alert(apiErrorMessage(err, 'Failed to create and assign sponsor'));
    }
  };

  const confirmDeleteSponsor = () => {
    if (!deleteSponsorId) return;
    const id = deleteSponsorId;
    void (async () => {
      try {
        await deleteSponsor(id);
        const linked = schoolList.filter((s) => s.sponsorId === id);
        await Promise.all(linked.map((s) => updateSchool(s.id, { sponsorId: undefined })));
        setSchoolList((prev) => {
          const nextSchools = prev.map((s) =>
            s.sponsorId === id ? { ...s, sponsorId: undefined } : s,
          );
          setSponsorList((prevSponsors) =>
            rebuildSponsorSchools(
              nextSchools,
              prevSponsors.filter((s) => s.id !== id),
            ),
          );
          return nextSchools;
        });
        setDeleteSponsorId(null);
      } catch (err) {
        window.alert(apiErrorMessage(err, 'Failed to delete sponsor'));
      }
    })();
  };

  return (
    <AdminShell
      title="Assign Sponsor"
      description="Connect sponsors to schools and keep donor portal access mapped correctly."
      actions={
        <>
          <TableSearch
            value={search}
            onChange={setSearch}
            placeholder="Search sponsors or schools…"
          />
          <Button type="button" variant="primary" onClick={openCreateSponsor}>
            Add Sponsor
          </Button>
        </>
      }
    >
      {loadError ? <p className="mb-4 text-sm text-rose-600">{loadError}</p> : null}
      {loading ? (
        <p className="mb-4 py-6 text-center text-sm text-slate-500">Loading sponsors…</p>
      ) : null}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Sponsors"
          value={sponsorList.length}
          hint="Directory total"
          accent="brand"
          icon={<IconUserPlus className="h-4 w-4" />}
        />
        <StatCard
          label="Assigned schools"
          value={assignedCount}
          hint={`of ${schoolList.length} schools`}
          accent="emerald"
          icon={<IconSchool className="h-4 w-4" />}
        />
        <StatCard
          label="Unassigned"
          value={unassignedCount}
          hint={unassignedCount > 0 ? 'Need a sponsor' : 'All schools covered'}
          accent={unassignedCount > 0 ? 'amber' : 'emerald'}
          icon={<IconUsers className="h-4 w-4" />}
        />
      </div>

      {/* Primary workflow: school assignments */}
      <section className="mb-6">
        <div className="mb-3">
          <SectionTitle className="!mb-0.5">School assignments</SectionTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Assign or change the sponsor linked to each school.
          </p>
        </div>

        <Card padding="none" className="overflow-x-auto overflow-y-clip">
          <DataTable
            className="overflow-visible"
            headers={['School', 'Location', 'Assigned sponsor', 'Status', 'Actions']}
          >
            {filteredSchools.length === 0 ? (
              <tr>
                <Td className="py-10 text-center text-slate-500" colSpan={5}>
                  No schools match your search.
                </Td>
              </tr>
            ) : (
              filteredSchools.map((school) => {
                const sponsor = school.sponsorId
                  ? sponsorList.find((s) => s.id === school.sponsorId)
                  : undefined;
                return (
                  <tr key={school.id}>
                    <Td className="font-medium text-slate-900 dark:text-slate-100">
                      {school.name}
                    </Td>
                    <Td>
                      <span className="text-slate-700 dark:text-slate-300">{school.district}</span>
                      <span className="text-slate-400"> · </span>
                      <span className="text-slate-500">{school.mandal}</span>
                    </Td>
                    <Td>
                      {sponsor ? (
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sky-100 text-[0.7rem] font-bold text-sky-800 dark:bg-sky-500/20 dark:text-sky-200">
                            {sponsor.name
                              .split(' ')
                              .map((w) => w[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                              {sponsor.name}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {sponsor.organization}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">Not assigned</span>
                      )}
                    </Td>
                    <Td>
                      <Badge tone={sponsor ? 'success' : 'warning'}>
                        {sponsor ? 'Assigned' : 'Unassigned'}
                      </Badge>
                    </Td>
                    <Td>
                      <TableRowActions
                        onAssign={() => openAssign(school)}
                        assignLabel={sponsor ? 'Change sponsor' : 'Assign sponsor'}
                        assignVariant={sponsor ? 'change' : 'add'}
                      />
                    </Td>
                  </tr>
                );
              })
            )}
          </DataTable>
        </Card>
      </section>

      {/* Sponsor directory */}
      <section>
        <div className="mb-3">
          <SectionTitle className="!mb-0.5">Sponsor directory</SectionTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage sponsor profiles. Use row actions to edit or remove.
          </p>
        </div>
        <Card padding="none" className="overflow-x-auto overflow-y-clip">
          <DataTable
            className="overflow-visible"
            headers={[
              'Sponsor',
              'Organization',
              'Contact',
              'Schools',
              'Status',
              'Actions',
            ]}
          >
            {filteredSponsors.length === 0 ? (
              <tr>
                <Td className="py-10 text-center text-slate-500" colSpan={6}>
                  No sponsors match your search.
                </Td>
              </tr>
            ) : (
              filteredSponsors.map((sponsor) => {
                const linked = schoolList.filter((s) => s.sponsorId === sponsor.id);
                return (
                  <tr key={sponsor.id}>
                    <Td>
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange-100 text-[0.72rem] font-bold text-orange-800 dark:bg-orange-500/20 dark:text-orange-200">
                          {sponsor.name
                            .split(' ')
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                            {sponsor.name}
                          </p>
                          <p className="truncate text-xs text-slate-500">{sponsor.email}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <p className="text-slate-700 dark:text-slate-300">{sponsor.organization}</p>
                      {sponsor.address ? (
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">
                          {sponsor.address}
                        </p>
                      ) : null}
                    </Td>
                    <Td className="tabular-nums">{sponsor.phone}</Td>
                    <Td>
                      {linked.length === 0 ? (
                        <span className="text-sm text-slate-400">None</span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone="info">{linked.length}</Badge>
                          <span className="max-w-[12rem] truncate text-xs text-slate-500">
                            {linked.map((s) => s.name).join(', ')}
                          </span>
                        </div>
                      )}
                    </Td>
                    <Td>
                      <Badge tone={sponsor.active ? 'success' : 'neutral'}>
                        {sponsor.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </Td>
                    <Td>
                      <TableRowActions
                        onEdit={() => openEditSponsor(sponsor)}
                        onDelete={() => setDeleteSponsorId(sponsor.id)}
                      />
                    </Td>
                  </tr>
                );
              })
            )}
          </DataTable>
        </Card>
      </section>

      <Modal
        open={sponsorModalOpen}
        onClose={closeSponsorModal}
        title={editingSponsorId ? 'Edit Sponsor' : 'Add Sponsor'}
        description={
          editingSponsorId
            ? 'Update sponsor profile details for school assignment.'
            : 'Enter sponsor details to add them to the trust network.'
        }
      >
        <form
          noValidate
          autoComplete="off"
          onSubmit={handleSponsorSubmit}
          className="px-5 py-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField id="sponsor-name" label="Sponsor name" required error={errors.name}>
                <Input
                  value={sponsorForm.name}
                  onChange={(e) => setSponsorField('name', e.target.value)}
                  placeholder="e.g. Ananya Mehta"
                  autoComplete="off"
                />
              </FormField>
            </div>
            <FormField id="sponsor-org" label="Organization" required error={errors.organization}>
              <div ref={orgSuggestRef} className="relative">
                <Input
                  type="search"
                  value={sponsorForm.organization}
                  onChange={(e) => setSponsorField('organization', e.target.value)}
                  onFocus={() => setOrgDropdownOpen(true)}
                  placeholder="Search or type organization"
                  /* Block Chrome/browser address autofill so only our list shows */
                  name="cst_sponsor_org_lookup"
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-form-type="other"
                  data-bwignore="true"
                  role="combobox"
                  aria-expanded={orgDropdownOpen}
                  aria-controls="sponsor-org-suggestions"
                  aria-autocomplete="list"
                />
                {orgDropdownOpen && organizationSuggestions.length > 0 ? (
                  <ul
                    id="sponsor-org-suggestions"
                    role="listbox"
                    className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-20 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-900"
                  >
                    {organizationSuggestions.map(({ organization, schools }) => (
                      <li key={organization} role="option">
                        <button
                          type="button"
                          className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition hover:bg-sky-50 dark:hover:bg-sky-500/10"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setSponsorField('organization', organization);
                            setOrgDropdownOpen(false);
                          }}
                        >
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                            {organization}
                          </span>
                          {schools.length > 0 ? (
                            <span className="text-[0.7rem] leading-snug text-slate-500 dark:text-slate-400">
                              Schools: {schools.join(', ')}
                            </span>
                          ) : (
                            <span className="text-[0.7rem] text-slate-400">
                              No schools assigned yet
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </FormField>
            <FormField id="sponsor-phone" label="Phone" required error={errors.phone}>
              <Input
                value={sponsorForm.phone}
                onChange={(e) => setSponsorField('phone', e.target.value)}
                placeholder="10-digit mobile"
                autoComplete="off"
              />
            </FormField>
            <div className="sm:col-span-2">
              <FormField id="sponsor-email" label="Email" required error={errors.email}>
                <Input
                  type="email"
                  value={sponsorForm.email}
                  onChange={(e) => setSponsorField('email', e.target.value)}
                  placeholder="sponsor@example.org"
                  autoComplete="off"
                />
              </FormField>
            </div>
            <div className="sm:col-span-2">
              <FormField id="sponsor-address" label="Address" required error={errors.address}>
                <Input
                  value={sponsorForm.address}
                  onChange={(e) => setSponsorField('address', e.target.value)}
                  placeholder="Street, city, state, PIN"
                  autoComplete="off"
                />
              </FormField>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={closeSponsorModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingSponsorId ? 'Update Sponsor' : 'Save Sponsor'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(assigning)}
        onClose={closeAssign}
        title="Assign sponsor"
        description={
          assigning
            ? `Choose a sponsor for ${assigning.name} (${assigning.district}).`
            : 'Select or create a sponsor for this school.'
        }
        className="max-w-xl"
      >
        <form noValidate autoComplete="off" onSubmit={applySponsor} className="px-5 py-4">
          {assigning ? (
            <div className="mb-4 rounded-lg border border-slate-100 bg-slate-50 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-800/50">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                School
              </p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-slate-50">
                {assigning.name}
              </p>
              <p className="text-sm text-slate-500">
                {assigning.district} · {assigning.mandal}
              </p>
            </div>
          ) : null}

          {/* Concept layout: Add Sponsor accordion */}
          <div>
            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2.5 dark:border-slate-700">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Add Sponsor
              </span>
              <button
                type="button"
                onClick={() => setAssignPanelOpen((v) => !v)}
                aria-expanded={assignPanelOpen}
                aria-controls="assign-sponsor-panel"
                title={assignPanelOpen ? 'Hide sponsor form' : 'Show sponsor form'}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <IconChevronRight
                  className={`h-4 w-4 transition-transform duration-200 ${
                    assignPanelOpen ? 'rotate-90' : ''
                  }`}
                />
              </button>
            </div>

            {assignPanelOpen ? (
              <div
                id="assign-sponsor-panel"
                className="mt-3 rounded-lg bg-slate-50/90 px-3 py-3 dark:bg-slate-800/50"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <FormField id="assign-existing-sponsor" label="Existing sponsor">
                      <select
                        className="field-control w-full"
                        value={selectedSponsorId}
                        onChange={(e) => {
                          setSelectedSponsorId(e.target.value);
                          if (e.target.value) {
                            setAssignNewForm(emptySponsorForm);
                            setAssignErrors({});
                          }
                        }}
                      >
                        <option value="">None — create new below (optional)</option>
                        {sponsorList
                          .filter((s) => s.active)
                          .map((sponsor) => (
                            <option key={sponsor.id} value={sponsor.id}>
                              {sponsor.name}
                              {sponsor.organization ? ` · ${sponsor.organization}` : ''}
                            </option>
                          ))}
                      </select>
                    </FormField>
                    <p className="mt-1.5 text-[0.7rem] text-slate-500 dark:text-slate-400">
                      Choose an existing sponsor, or fill the fields below to add a new one.
                    </p>
                  </div>

                  {!selectedSponsorId ? (
                    <>
                      <div className="sm:col-span-2">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          New sponsor details
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <FormField
                          id="assign-sponsor-name"
                          label="Sponsor name"
                          error={assignErrors.name}
                        >
                          <Input
                            value={assignNewForm.name}
                            onChange={(e) => setAssignNewField('name', e.target.value)}
                            placeholder="Full name"
                            autoComplete="off"
                          />
                        </FormField>
                      </div>
                      <FormField
                        id="assign-sponsor-email"
                        label="Email"
                        error={assignErrors.email}
                      >
                        <Input
                          type="email"
                          value={assignNewForm.email}
                          onChange={(e) => setAssignNewField('email', e.target.value)}
                          placeholder="sponsor@example.com"
                          autoComplete="off"
                        />
                      </FormField>
                      <FormField
                        id="assign-sponsor-phone"
                        label="Phone"
                        error={assignErrors.phone}
                      >
                        <Input
                          value={assignNewForm.phone}
                          onChange={(e) => setAssignNewField('phone', e.target.value)}
                          placeholder="10-digit mobile"
                          autoComplete="off"
                        />
                      </FormField>
                      <FormField
                        id="assign-sponsor-org"
                        label="Organization"
                        error={assignErrors.organization}
                      >
                        <div ref={assignOrgRef} className="relative">
                          <Input
                            type="search"
                            value={assignNewForm.organization}
                            onChange={(e) => setAssignNewField('organization', e.target.value)}
                            onFocus={() => setAssignOrgOpen(true)}
                            placeholder="Organization"
                            name="cst_assign_org_lookup"
                            autoComplete="new-password"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck={false}
                            data-lpignore="true"
                            data-1p-ignore="true"
                            data-form-type="other"
                            role="combobox"
                            aria-expanded={assignOrgOpen}
                            aria-controls="assign-org-suggestions"
                            aria-autocomplete="list"
                          />
                          {assignOrgOpen && assignOrgSuggestions.length > 0 ? (
                            <ul
                              id="assign-org-suggestions"
                              role="listbox"
                              className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-20 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-900"
                            >
                              {assignOrgSuggestions.map(({ organization, schools }) => (
                                <li key={organization} role="option">
                                  <button
                                    type="button"
                                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition hover:bg-sky-50 dark:hover:bg-sky-500/10"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      setAssignNewField('organization', organization);
                                      setAssignOrgOpen(false);
                                    }}
                                  >
                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                      {organization}
                                    </span>
                                    {schools.length > 0 ? (
                                      <span className="text-[0.7rem] leading-snug text-slate-500 dark:text-slate-400">
                                        Schools: {schools.join(', ')}
                                      </span>
                                    ) : (
                                      <span className="text-[0.7rem] text-slate-400">
                                        No schools assigned yet
                                      </span>
                                    )}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      </FormField>
                      <FormField
                        id="assign-sponsor-address"
                        label="Address"
                        error={assignErrors.address}
                      >
                        <Input
                          value={assignNewForm.address}
                          onChange={(e) => setAssignNewField('address', e.target.value)}
                          placeholder="Address"
                          autoComplete="off"
                        />
                      </FormField>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={closeAssign}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save assignment
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(createdSponsorLogin)}
        onClose={() => setCreatedSponsorLogin(null)}
        title="Sponsor login created"
        description="Share these credentials. The sponsor must set a new password after first login."
      >
        <div className="space-y-3 px-5 py-4">
          <p className="text-sm text-slate-600">
            Login created for{' '}
            <span className="font-semibold text-slate-900">{createdSponsorLogin?.name}</span>.
          </p>
          <dl className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium">{createdSponsorLogin?.email}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Temp password</dt>
              <dd className="font-mono font-semibold text-emerald-800">
                {createdSponsorLogin?.password}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-slate-500">
            After signing in with this temporary password, the sponsor must choose their own password
            before using the portal.
          </p>
          <div className="flex justify-end">
            <Button type="button" variant="primary" onClick={() => setCreatedSponsorLogin(null)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteSponsorId)}
        title="Delete sponsor"
        description="This sponsor will be removed and unassigned from any linked schools."
        onClose={() => setDeleteSponsorId(null)}
        onConfirm={confirmDeleteSponsor}
      />
    </AdminShell>
  );
}

type AttendanceRow = {
  id: string;
  date: string;
  teacher: string;
  school: string;
  teacherId?: string;
  schoolId?: string;
  clockIn: string;
  inLocation: string;
  clockOut: string;
  outLocation: string;
  hours: string;
};

function mapTeacherAttendance(row: TeacherAttendanceRow): AttendanceRow {
  return {
    id: row.id,
    date: row.date,
    teacher: row.teacherName,
    school: row.schoolName,
    teacherId: row.teacherId,
    schoolId: row.schoolId,
    clockIn: row.clockIn,
    inLocation: row.inLocation,
    clockOut: row.clockOut,
    outLocation: row.outLocation,
    hours: row.hours,
  };
}

function attendanceDayStatus(rows: AttendanceRow[]): 'complete' | 'partial' | 'none' {
  if (!rows.length) return 'none';
  const incomplete = rows.some((r) => !r.clockOut || r.clockOut === '—' || r.hours === 'In progress');
  return incomplete ? 'partial' : 'complete';
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

function AttendanceHoursCell({
  hours,
  inLocation,
  outLocation,
}: {
  hours: string;
  inLocation: string;
  outLocation: string;
}) {
  const hasIn = isMeaningfulGpsLabel(inLocation);
  const hasOut = isMeaningfulGpsLabel(outLocation);
  const hasLocation = Boolean(
    (inLocation && inLocation !== '—') || (outLocation && outLocation !== '—'),
  );
  const inDisplay = hasIn
    ? inLocation
    : inLocation && inLocation !== '—'
      ? inLocation
      : '—';
  const outDisplay = hasOut
    ? outLocation
    : outLocation && outLocation !== '—'
      ? outLocation
      : '—';
  const tooltipId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, placeBelow: true });

  const updatePosition = () => {
    const el = buttonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = 224; // w-56
    const gap = 8;
    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    const placeBelow = window.innerHeight - rect.bottom >= 130 || rect.top < 130;
    setPos({
      top: placeBelow ? rect.bottom + gap : rect.top - gap,
      left,
      placeBelow,
    });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onMove = () => updatePosition();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open]);

  return (
    <div className="inline-flex items-center gap-1.5">
      <span>{hours}</span>
      {hasLocation ? (
        <>
          <button
            ref={buttonRef}
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-sky-50 hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:hover:bg-sky-500/15 dark:hover:text-sky-300"
            aria-label="View clock-in and clock-out locations"
            aria-describedby={open ? tooltipId : undefined}
            onMouseEnter={() => {
              updatePosition();
              setOpen(true);
            }}
            onMouseLeave={() => setOpen(false)}
            onFocus={() => {
              updatePosition();
              setOpen(true);
            }}
            onBlur={() => setOpen(false)}
          >
            <IconInfo className="h-4 w-4" />
          </button>
          {open
            ? createPortal(
                <span
                  id={tooltipId}
                  role="tooltip"
                  className="pointer-events-none fixed z-[200] w-56 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left shadow-lg dark:border-slate-600 dark:bg-slate-900"
                  style={{
                    top: pos.top,
                    left: pos.left,
                    transform: pos.placeBelow ? undefined : 'translateY(-100%)',
                  }}
                >
                  <span
                    className={`absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900 ${
                      pos.placeBelow
                        ? '-top-1 border-l border-t'
                        : '-bottom-1 border-b border-r'
                    }`}
                  />
                  <span className="relative mb-1.5 flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400">
                    <IconMapPin className="h-3 w-3" />
                    GPS locations
                  </span>
                  <span className="relative flex items-start gap-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    <span
                      className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/80 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/30"
                      aria-hidden
                    >
                      <IconMapPin className="h-3 w-3" />
                    </span>
                    <span className="min-w-0">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        In:
                      </span>{' '}
                      <span className={hasIn ? undefined : 'text-amber-700 dark:text-amber-300'}>
                        {inDisplay}
                      </span>
                    </span>
                  </span>
                  <span className="relative mt-1.5 flex items-start gap-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    <span
                      className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-rose-50 text-rose-600 ring-1 ring-rose-200/80 dark:bg-rose-500/15 dark:text-rose-400 dark:ring-rose-500/30"
                      aria-hidden
                    >
                      <IconMapPin className="h-3 w-3" />
                    </span>
                    <span className="min-w-0">
                      <span className="font-semibold text-rose-700 dark:text-rose-400">Out:</span>{' '}
                      <span className={hasOut ? undefined : 'text-amber-700 dark:text-amber-300'}>
                        {outDisplay}
                      </span>
                    </span>
                  </span>
                </span>,
                document.body,
              )
            : null}
        </>
      ) : null}
    </div>
  );
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function TeacherAttendanceCalendar({
  monthDate,
  onMonthChange,
  selectedDate,
  onSelectDate,
  rowsByDate,
}: {
  monthDate: Date;
  onMonthChange: (next: Date) => void;
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
  rowsByDate: Map<string, AttendanceRow[]>;
}) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const todayKey = formatDateKey(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate(),
  );
  const monthLabel = new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
  }).format(monthDate);

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ key: string; day: number } | null> = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ key: formatDateKey(year, month, day), day });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const shiftMonth = (delta: number) => {
    onMonthChange(new Date(year, month + delta, 1));
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white dark:border-slate-700 dark:bg-slate-900/60">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-sky-50/60 px-4 py-3 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/30">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
            <IconCalendar className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{monthLabel}</p>
            <p className="text-[0.7rem] text-slate-500">Monthly attendance map</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            aria-label="Previous month"
          >
            <IconChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              onMonthChange(new Date(now.getFullYear(), now.getMonth(), 1));
              onSelectDate(
                formatDateKey(now.getFullYear(), now.getMonth(), now.getDate()),
              );
            }}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            aria-label="Next month"
          >
            <IconChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/80">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="px-1 py-2 text-center text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-fr">
        {cells.map((cell, idx) => {
          if (!cell) {
            return (
              <div
                key={`empty-${idx}`}
                className="min-h-[4.25rem] border-b border-r border-slate-100 bg-slate-50/40 dark:border-slate-800 dark:bg-slate-950/30"
              />
            );
          }
          const dayRows = rowsByDate.get(cell.key) ?? [];
          const status = attendanceDayStatus(dayRows);
          const isSelected = cell.key === selectedDate;
          const isToday = cell.key === todayKey;
          const isWeekend = idx % 7 === 0 || idx % 7 === 6;

          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => onSelectDate(cell.key)}
              className={[
                'group relative flex min-h-[4.25rem] flex-col items-start gap-1 border-b border-r border-slate-100 p-1.5 text-left transition sm:p-2 dark:border-slate-800',
                isWeekend ? 'bg-slate-50/50 dark:bg-slate-950/20' : 'bg-white dark:bg-slate-900/40',
                isSelected
                  ? 'z-[1] bg-sky-50 ring-2 ring-inset ring-sky-400 dark:bg-sky-500/10 dark:ring-sky-500'
                  : 'hover:bg-sky-50/70 dark:hover:bg-sky-500/5',
              ].join(' ')}
            >
              <span className="flex w-full items-center justify-between gap-1">
                <span
                  className={[
                    'inline-flex h-7 min-w-7 items-center justify-center rounded-full text-xs font-semibold',
                    isToday
                      ? 'bg-brand-500 text-white shadow-sm'
                      : isSelected
                        ? 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200'
                        : 'text-slate-700 group-hover:text-slate-900 dark:text-slate-200',
                  ].join(' ')}
                >
                  {cell.day}
                </span>
                {dayRows.length > 0 ? (
                  <span className="hidden text-[0.62rem] font-semibold text-slate-400 sm:inline">
                    {dayRows.length}
                  </span>
                ) : null}
              </span>
              {status !== 'none' ? (
                <span className="mt-auto flex w-full flex-wrap items-center gap-1">
                  <span
                    className={[
                      'h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2',
                      status === 'complete'
                        ? 'bg-emerald-500'
                        : 'bg-amber-500',
                    ].join(' ')}
                  />
                  <span
                    className={[
                      'hidden truncate text-[0.62rem] font-medium sm:inline',
                      status === 'complete'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-amber-700 dark:text-amber-400',
                    ].join(' ')}
                  >
                    {status === 'complete' ? 'Complete' : 'Open'}
                  </span>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
        <span className="inline-flex items-center gap-1.5 text-[0.7rem] text-slate-500">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Complete day
        </span>
        <span className="inline-flex items-center gap-1.5 text-[0.7rem] text-slate-500">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          In progress
        </span>
        <span className="inline-flex items-center gap-1.5 text-[0.7rem] text-slate-500">
          <span className="h-2 w-2 rounded-full bg-brand-500" />
          Today
        </span>
      </div>
    </div>
  );
}

export function AdminTeacherAttendancePage() {
  const [list, setList] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('');
  const [view, setView] = useState<'table' | 'calendar'>('table');
  const [selectedDate, setSelectedDate] = useState(() => localDateKey());
  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [editing, setEditing] = useState<AttendanceRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    teacher: '',
    school: '',
    clockIn: '',
    clockOut: '',
    hours: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listTeacherAttendance();
        if (!cancelled) setList(data.map(mapTeacherAttendance));
      } catch (e) {
        if (!cancelled) setLoadError(apiErrorMessage(e, 'Failed to load attendance'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = list.filter((row) => {
    if (schoolFilter && row.school !== schoolFilter) return false;
    if (teacherFilter && row.teacher !== teacherFilter) return false;
    if (view === 'table' && selectedDate && row.date !== selectedDate) return false;
    return matchesSearch(
      search,
      row.teacher,
      row.school,
      row.date,
      row.clockIn,
      row.clockOut,
      row.inLocation,
      row.outLocation,
      row.hours,
    );
  });

  const calendarFiltered = list.filter((row) => {
    if (schoolFilter && row.school !== schoolFilter) return false;
    if (teacherFilter && row.teacher !== teacherFilter) return false;
    return matchesSearch(
      search,
      row.teacher,
      row.school,
      row.date,
      row.clockIn,
      row.clockOut,
      row.inLocation,
      row.outLocation,
      row.hours,
    );
  });

  const rowsByDate = useMemo(() => {
    const map = new Map<string, AttendanceRow[]>();
    for (const row of calendarFiltered) {
      const bucket = map.get(row.date) ?? [];
      bucket.push(row);
      map.set(row.date, bucket);
    }
    return map;
  }, [calendarFiltered]);

  const selectedDayRows = (rowsByDate.get(selectedDate) ?? []).filter((row) =>
    matchesSearch(search, row.teacher, row.school, row.clockIn, row.clockOut, row.hours),
  );

  const selectedDayLabel = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    if (!y || !m || !d) return selectedDate;
    return new Intl.DateTimeFormat('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(y, m - 1, d));
  }, [selectedDate]);

  const openEdit = (row: AttendanceRow) => {
    setEditing(row);
    setForm({
      teacher: row.teacher,
      school: row.school,
      clockIn: row.clockIn,
      clockOut: row.clockOut,
      hours: row.hours,
    });
    setErrors({});
  };

  const closeAttendanceModal = () => {
    setEditing(null);
    setErrors({});
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const nextErrors: FieldErrors = {};
    if (!form.teacher.trim()) nextErrors.teacher = enterField('teacher name');
    if (!form.school.trim()) nextErrors.school = enterField('school name');
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;

    try {
      const updated = await updateTeacherAttendance(editing.id, {
        teacherName: form.teacher.trim(),
        schoolName: form.school.trim(),
        clockIn: form.clockIn.trim(),
        clockOut: form.clockOut.trim(),
        hours: form.hours.trim(),
      });
      const mapped = mapTeacherAttendance(updated);
      setList((prev) => prev.map((r) => (r.id === editing.id ? mapped : r)));
      closeAttendanceModal();
    } catch (err) {
      window.alert(apiErrorMessage(err, 'Failed to update attendance'));
    }
  };

  const schoolOptions = [...new Set(list.map((r) => r.school))].sort();
  const teacherOptions = [...new Set(list.map((r) => r.teacher))].sort();

  return (
    <AdminShell
      title="Teacher Attendance Monitoring"
      description="View clock-in / clock-out times and GPS, working hours, attendance history, and monthly attendance. Filter by school, teacher, or date."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 dark:border-slate-600 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setView('table')}
              className={[
                'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition',
                view === 'table'
                  ? 'border-brand-500 bg-white text-brand-700 shadow-sm dark:border-brand-400 dark:bg-slate-700 dark:text-brand-300'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
              ].join(' ')}
            >
              <IconHistory className="h-3.5 w-3.5" />
              History
            </button>
            <button
              type="button"
              onClick={() => setView('calendar')}
              className={[
                'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition',
                view === 'calendar'
                  ? 'border-brand-500 bg-white text-brand-700 shadow-sm dark:border-brand-400 dark:bg-slate-700 dark:text-brand-300'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
              ].join(' ')}
            >
              <IconCalendar className="h-3.5 w-3.5" />
              Monthly
            </button>
          </div>
          <TableSearch value={search} onChange={setSearch} placeholder="Search attendance…" />
        </div>
      }
    >
      {loadError ? <p className="mb-4 text-sm text-rose-600">{loadError}</p> : null}
      {loading ? <p className="mb-4 text-center text-sm text-slate-500">Loading attendance…</p> : null}
      <Card className="mb-4">
        <p className="mb-3 text-[0.95rem] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Filters
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid min-w-[12rem] flex-1 gap-1.5 sm:max-w-xs">
            <span className="text-[0.95rem] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              School
            </span>
            <select
              className="field-control"
              value={schoolFilter}
              onChange={(e) => setSchoolFilter(e.target.value)}
            >
              <option value="">All schools</option>
              {schoolOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-[12rem] flex-1 gap-1.5 sm:max-w-xs">
            <span className="text-[0.95rem] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              Teacher
            </span>
            <select
              className="field-control"
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
            >
              <option value="">All teachers</option>
              {teacherOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-[10rem] gap-1.5">
            <span className="text-[0.95rem] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              Date
            </span>
            <input
              type="date"
              className="field-control"
              value={selectedDate}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedDate(value);
                if (value) {
                  const [y, m] = value.split('-').map(Number);
                  if (y && m) setMonthDate(new Date(y, m - 1, 1));
                }
              }}
            />
          </label>
        </div>
      </Card>

      {view === 'calendar' ? (
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <TeacherAttendanceCalendar
              monthDate={monthDate}
              onMonthChange={setMonthDate}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              rowsByDate={rowsByDate}
            />
          </div>
          <Card className="lg:col-span-2" padding="lg">
            <div className="flex items-start justify-between gap-2">
              <div>
                <SectionTitle>Day details</SectionTitle>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {selectedDayLabel}
                </p>
              </div>
              <Badge tone={selectedDayRows.length ? 'info' : 'neutral'}>
                {selectedDayRows.length} record{selectedDayRows.length === 1 ? '' : 's'}
              </Badge>
            </div>

            {selectedDayRows.length === 0 ? (
              <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No clock-in records for this day.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {selectedDayRows.map((row) => {
                  const openShift = !row.clockOut || row.clockOut === '—';
                  return (
                    <li
                      key={row.id}
                      className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900 dark:text-slate-50">
                            {row.teacher}
                          </p>
                          <p className="truncate text-xs text-slate-500">{row.school}</p>
                        </div>
                        <Badge tone={openShift ? 'warning' : 'success'}>
                          {openShift ? 'In progress' : 'Complete'}
                        </Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-emerald-50/80 px-2.5 py-2 dark:bg-emerald-500/10">
                          <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                            Clock in
                          </p>
                          <p className="mt-0.5 font-medium text-slate-800 dark:text-slate-100">
                            {row.clockIn}
                          </p>
                          <p className="mt-1 text-[0.65rem] leading-snug text-emerald-800/80 dark:text-emerald-300/80">
                            {row.inLocation !== '—' ? row.inLocation : 'No location'}
                          </p>
                        </div>
                        <div className="rounded-lg bg-rose-50/80 px-2.5 py-2 dark:bg-rose-500/10">
                          <p className="font-semibold text-rose-700 dark:text-rose-400">
                            Clock out
                          </p>
                          <p className="mt-0.5 font-medium text-slate-800 dark:text-slate-100">
                            {row.clockOut}
                          </p>
                          <p className="mt-1 text-[0.65rem] leading-snug text-rose-800/80 dark:text-rose-300/80">
                            {row.outLocation !== '—' ? row.outLocation : 'No location'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <AttendanceHoursCell
                          hours={row.hours}
                          inLocation={row.inLocation}
                          outLocation={row.outLocation}
                        />
                        <TableRowActions
                          onEdit={() => openEdit(row)}
                          onDelete={() => setDeleteId(row.id)}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h2 className="text-[0.95rem] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              Attendance history
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Records for {selectedDate} · Use the hours info icon for GPS locations
            </p>
          </div>
          <DataTable
            headers={[
              'Teacher',
              'School',
              'Clock In',
              'Clock Out',
              'Working Hours',
              { label: 'Actions', className: 'text-right' },
            ]}
          >
            {filtered.length === 0 ? (
              <tr>
                <Td className="py-8 text-center text-slate-500" colSpan={6}>
                  No attendance records match your filters.
                </Td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id}>
                  <Td className="font-medium text-slate-900 dark:text-slate-100">
                    {row.teacher}
                  </Td>
                  <Td>{row.school}</Td>
                  <Td>
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">
                      {row.clockIn}
                    </span>
                  </Td>
                  <Td>
                    <span className="font-medium text-rose-700 dark:text-rose-400">
                      {row.clockOut}
                    </span>
                  </Td>
                  <Td>
                    <AttendanceHoursCell
                      hours={row.hours}
                      inLocation={row.inLocation}
                      outLocation={row.outLocation}
                    />
                  </Td>
                  <Td className="text-right align-middle">
                    <TableRowActions
                      onEdit={() => openEdit(row)}
                      onDelete={() => setDeleteId(row.id)}
                    />
                  </Td>
                </tr>
              ))
            )}
          </DataTable>
        </Card>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={closeAttendanceModal}
        title="Edit attendance"
        description="Update clock times and working hours."
      >
        <form noValidate onSubmit={handleSave} className="grid gap-3 px-5 py-4 sm:grid-cols-2">
          <FormField id="att-teacher" label="Teacher" required error={errors.teacher}>
            <Input
              value={form.teacher}
              onChange={(e) => {
                setForm((f) => ({ ...f, teacher: e.target.value }));
                touchField(setErrors, 'teacher');
              }}
            />
          </FormField>
          <FormField id="att-school" label="School" required error={errors.school}>
            <Input
              value={form.school}
              onChange={(e) => {
                setForm((f) => ({ ...f, school: e.target.value }));
                touchField(setErrors, 'school');
              }}
            />
          </FormField>
          <FormField id="att-in" label="Clock in">
            <Input
              value={form.clockIn}
              onChange={(e) => setForm((f) => ({ ...f, clockIn: e.target.value }))}
            />
          </FormField>
          <FormField id="att-out" label="Clock out">
            <Input
              value={form.clockOut}
              onChange={(e) => setForm((f) => ({ ...f, clockOut: e.target.value }))}
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField id="att-hours" label="Hours">
              <Input
                value={form.hours}
                onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
              />
            </FormField>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={closeAttendanceModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Update
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete attendance record"
        description="This attendance entry will be removed."
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          const id = deleteId;
          if (!id) return;
          try {
            await deleteTeacherAttendance(id);
            setList((prev) => prev.filter((r) => r.id !== id));
            setDeleteId(null);
          } catch (err) {
            window.alert(apiErrorMessage(err, 'Failed to delete attendance'));
            throw err;
          }
        }}
      />
    </AdminShell>
  );
}


export function AdminLeavesPage() {
  const [list, setList] = useState<LeaveRequest[]>([]);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [schoolOptions, setSchoolOptions] = useState<School[]>([]);
  const [teacherId, setTeacherId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panel, setPanel] = useState<'requests' | 'balance' | 'history'>('requests');
  const [editing, setEditing] = useState<LeaveRequest | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: '',
    fromDate: '',
    toDate: '',
    reason: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [leavesData, teachersData, schoolsData] = await Promise.all([
          listLeaves(),
          listTeachers(),
          listSchools(),
        ]);
        if (cancelled) return;
        setList(leavesData);
        setTeachers(teachersData);
        setSchoolOptions(schoolsData);
        setTeacherId(teachersData[0]?.id ?? '');
      } catch (e) {
        if (!cancelled) setLoadError(apiErrorMessage(e, 'Failed to load leaves'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedTeacher = teachers.find((t) => t.id === teacherId);
  const teacherLeaves = useMemo(
    () =>
      list
        .filter((l) => l.teacherId === teacherId)
        .sort((a, b) => b.fromDate.localeCompare(a.fromDate)),
    [list, teacherId],
  );
  const stats = useMemo(() => computeLeaveStats(teacherLeaves), [teacherLeaves]);
  const pendingRequests = teacherLeaves.filter((l) => l.status === 'Pending');
  const historyRows = teacherLeaves;

  const openEdit = (leave: LeaveRequest) => {
    setEditing(leave);
    setForm({
      type: leave.type,
      fromDate: leave.fromDate,
      toDate: leave.toDate,
      reason: leave.reason,
    });
    setErrors({});
  };

  const closeLeaveModal = () => {
    setEditing(null);
    setErrors({});
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const nextErrors: FieldErrors = {};
    if (!form.type.trim()) nextErrors.type = enterField('leave type');
    if (!form.fromDate) nextErrors.fromDate = enterField('from date');
    if (!form.toDate) nextErrors.toDate = enterField('to date');
    if (!form.reason.trim()) nextErrors.reason = enterField('reason');
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;

    try {
      const updated = await updateLeave(editing.id, {
        type: form.type.trim(),
        fromDate: form.fromDate,
        toDate: form.toDate,
        reason: form.reason.trim(),
      });
      setList((prev) => prev.map((l) => (l.id === editing.id ? updated : l)));
      closeLeaveModal();
    } catch (err) {
      window.alert(apiErrorMessage(err, 'Failed to update leave'));
    }
  };

  const setStatus = (id: string, status: LeaveRequest['status']) => {
    void (async () => {
      try {
        const updated = await updateLeave(id, { status });
        setList((prev) => prev.map((l) => (l.id === id ? updated : l)));
      } catch (err) {
        window.alert(apiErrorMessage(err, 'Failed to update leave status'));
      }
    })();
  };

  const panelTabs: { id: typeof panel; label: string; count?: number }[] = [
    { id: 'requests', label: 'Leave requests', count: pendingRequests.length },
    { id: 'balance', label: 'Leave balance' },
    { id: 'history', label: 'Leave history', count: historyRows.length },
  ];

  return (
    <AdminShell
      title="Teacher Leave Management"
      description="Review a teacher’s leave balances, approve or reject pending requests, and browse full history."
      actions={
        <label className="flex min-w-[14rem] flex-col gap-1">
          <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
            Teacher
          </span>
          <select
            className="field-control"
            value={teacherId}
            onChange={(e) => {
              setTeacherId(e.target.value);
              setPanel('requests');
            }}
          >
      {loadError ? <p className="mb-4 text-sm text-rose-600">{loadError}</p> : null}
      {loading ? <p className="mb-4 text-center text-sm text-slate-500">Loading leaves…</p> : null}
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.employeeId}
              </option>
            ))}
          </select>
        </label>
      }
    >
      {/* Hero: teacher + primary metrics */}
      <section className="mb-5 overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white shadow-[0_24px_50px_-28px_rgba(15,23,42,0.55)] dark:border-slate-700">
        <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Selected teacher
            </p>
            <h2 className="mt-1 truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {selectedTeacher?.name ?? '—'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {selectedTeacher?.employeeId ?? '—'}
              {selectedTeacher
                ? ` · ${schoolOptions.find((s) => s.id === selectedTeacher.schoolId)?.name ?? 'Unassigned school'}`
                : ''}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {[
              {
                label: 'Total leaves',
                value: stats.total,
                hint: 'Annual allotment',
                ring: 'from-sky-400/30 to-transparent',
              },
              {
                label: 'Used leaves',
                value: stats.used,
                hint: 'Approved days',
                ring: 'from-orange-400/30 to-transparent',
              },
              {
                label: 'Balance leaves',
                value: stats.balance,
                hint: stats.pendingDays ? `${stats.pendingDays} pending reserved` : 'Available days',
                ring: 'from-emerald-400/35 to-transparent',
              },
            ].map((metric) => (
              <div
                key={metric.label}
                className={`relative min-w-[6.5rem] overflow-hidden rounded-xl border border-white/10 bg-white/5 px-3 py-3 sm:min-w-[7.5rem] sm:px-4`}
              >
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${metric.ring}`}
                  aria-hidden
                />
                <p className="relative text-[0.65rem] font-medium uppercase tracking-wide text-slate-400">
                  {metric.label}
                </p>
                <p className="relative mt-1 text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">
                  {metric.value}
                </p>
                <p className="relative mt-0.5 text-[0.7rem] text-slate-400">{metric.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Segmented panels */}
      <div className="mb-4 inline-flex flex-wrap rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-700 dark:bg-slate-800/80">
        {panelTabs.map((tab) => (
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
              <span
                className={[
                  'rounded-md px-1.5 py-0.5 text-[0.65rem] font-bold tabular-nums',
                  panel === tab.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
                ].join(' ')}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {panel === 'requests' ? (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                View leave requests
              </h3>
              <p className="text-xs text-slate-500">
                Approve or reject pending applications for this teacher.
              </p>
            </div>
          </div>
          {pendingRequests.length === 0 ? (
            <Card className="py-12 text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                No pending requests
              </p>
              <p className="mt-1 text-xs text-slate-500">
                New submissions appear here for review.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={() => setPanel('history')}
              >
                Open leave history
              </Button>
            </Card>
          ) : (
            <ul className="grid gap-3">
              {pendingRequests.map((leave) => {
                const days = leaveDayCount(leave.fromDate, leave.toDate);
                return (
                  <li key={leave.id}>
                    <Card className="!p-0 overflow-hidden">
                      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone="warning">Pending</Badge>
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              {leave.type}
                            </span>
                            <span className="text-xs text-slate-400">·</span>
                            <span className="text-xs font-medium tabular-nums text-slate-500">
                              {days} day{days === 1 ? '' : 's'}
                            </span>
                          </div>
                          <p className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-50">
                            {leave.fromDate} → {leave.toDate}
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                            {leave.reason}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="primary"
                            onClick={() => setStatus(leave.id, 'Approved')}
                          >
                            Approve leave
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => setStatus(leave.id, 'Rejected')}
                          >
                            Reject leave
                          </Button>
                          <TableRowActions
                            onEdit={() => openEdit(leave)}
                            onDelete={() => setDeleteId(leave.id)}
                          />
                        </div>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      {panel === 'balance' ? (
        <section>
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              View leave balance
            </h3>
            <p className="text-xs text-slate-500">
              Entitlement by leave type for {selectedTeacher?.name ?? 'this teacher'}.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {stats.byType.map((row) => (
              <Card key={row.type} padding="lg">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {row.type}
                </p>
                <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-slate-50">
                  {row.remaining}
                </p>
                <p className="mt-0.5 text-sm text-slate-500">days balance</p>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{
                      width: `${row.allotted ? Math.min(100, (row.remaining / row.allotted) * 100) : 0}%`,
                    }}
                  />
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center text-xs dark:border-slate-800">
                  <div>
                    <dt className="text-slate-400">Total</dt>
                    <dd className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">
                      {row.allotted}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Used</dt>
                    <dd className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">
                      {row.used}
                    </dd>
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
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Leave history
            </h3>
            <p className="text-xs text-slate-500">
              Complete record of leave for {selectedTeacher?.name ?? 'this teacher'}.
            </p>
          </div>
          <Card padding="none" className="overflow-hidden">
            <DataTable
              headers={[
                'Type',
                'From',
                'To',
                'Days',
                'Reason',
                'Status',
                { label: 'Actions', className: 'text-right' },
              ]}
            >
              {historyRows.length === 0 ? (
                <tr>
                  <Td className="py-10 text-center text-slate-500" colSpan={7}>
                    No leave history for this teacher.
                  </Td>
                </tr>
              ) : (
                historyRows.map((leave) => (
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
                    <Td className="text-right">
                      <TableRowActions
                        onEdit={() => openEdit(leave)}
                        onDelete={() => setDeleteId(leave.id)}
                      />
                    </Td>
                  </tr>
                ))
              )}
            </DataTable>
          </Card>
        </section>
      ) : null}

      <Modal
        open={Boolean(editing)}
        onClose={closeLeaveModal}
        title="Edit leave request"
        description="Update leave type, dates or reason."
      >
        <form noValidate onSubmit={handleSave} className="grid gap-3 px-5 py-4 sm:grid-cols-2">
          <FormField id="lv-type" label="Type" required error={errors.type}>
            <Input
              value={form.type}
              onChange={(e) => {
                setForm((f) => ({ ...f, type: e.target.value }));
                touchField(setErrors, 'type');
              }}
            />
          </FormField>
          <FormField id="lv-from" label="From" required error={errors.fromDate}>
            <Input
              type="date"
              value={form.fromDate}
              onChange={(e) => {
                setForm((f) => ({ ...f, fromDate: e.target.value }));
                touchField(setErrors, 'fromDate');
              }}
            />
          </FormField>
          <FormField id="lv-to" label="To" required error={errors.toDate}>
            <Input
              type="date"
              value={form.toDate}
              onChange={(e) => {
                setForm((f) => ({ ...f, toDate: e.target.value }));
                touchField(setErrors, 'toDate');
              }}
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField id="lv-reason" label="Reason" required error={errors.reason}>
              <Input
                value={form.reason}
                onChange={(e) => {
                  setForm((f) => ({ ...f, reason: e.target.value }));
                  touchField(setErrors, 'reason');
                }}
              />
            </FormField>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={closeLeaveModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Update
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete leave request"
        description="This leave request will be removed."
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          const id = deleteId;
          if (!id) return;
          try {
            await deleteLeave(id);
            setList((prev) => prev.filter((l) => l.id !== id));
            setDeleteId(null);
          } catch (err) {
            window.alert(apiErrorMessage(err, 'Failed to delete leave'));
            throw err;
          }
        }}
      />
    </AdminShell>
  );
}

type ClassAttendanceSummary = ApiClassAttendanceSummary;

function mapStudentSessionsToSummaries(
  sessions: Awaited<ReturnType<typeof listStudentAttendanceSessions>>,
  schoolList: School[],
): ClassAttendanceSummary[] {
  const schoolName = (id: string) => schoolList.find((s) => s.id === id)?.name ?? id;
  return sessions.map((session) => {
    const present = session.marks.filter((m) => m.status === 'P').length;
    const absent = session.marks.filter((m) => m.status === 'A').length;
    const enrolled = session.marks.length || present + absent;
    return {
      id: session.id,
      school: schoolName(session.schoolId),
      classLabel: `${session.classGrade}-${session.section}`,
      teacher: session.teacherName,
      enrolled,
      present,
      absent,
      date: session.date,
      schoolId: session.schoolId,
    };
  });
}

function attendanceRate(present: number, enrolled: number) {
  if (enrolled <= 0) return 0;
  return Math.round((present / enrolled) * 100);
}

function attendanceHealth(rate: number): { label: string; tone: 'success' | 'warning' | 'danger' } {
  if (rate >= 90) return { label: 'On track', tone: 'success' };
  if (rate >= 75) return { label: 'Watch', tone: 'warning' };
  return { label: 'Low', tone: 'danger' };
}

export function AdminStudentAttendancePage() {
  const [rows, setRows] = useState<ClassAttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [date, setDate] = useState(() => localDateKey());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [schoolsData, sessions] = await Promise.all([
          listSchools(),
          listStudentAttendanceSessions({ date }),
        ]);
        if (!cancelled) setRows(mapStudentSessionsToSummaries(sessions, schoolsData));
      } catch (e) {
        if (!cancelled) setLoadError(apiErrorMessage(e, 'Failed to load student attendance'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [date]);

  const filtered = rows.filter((row) => {
    if (schoolFilter !== 'all' && row.school !== schoolFilter) return false;
    return matchesSearch(search, row.school, row.classLabel, row.teacher);
  });

  const totals = filtered.reduce(
    (acc, row) => {
      acc.enrolled += row.enrolled;
      acc.present += row.present;
      acc.absent += row.absent;
      return acc;
    },
    { enrolled: 0, present: 0, absent: 0 },
  );
  const overallRate = attendanceRate(totals.present, totals.enrolled);

  const schoolOptions = [...new Set(rows.map((row) => row.school))].sort((a, b) =>
    a.localeCompare(b),
  );

  return (
    <AdminShell
      title="Student Attendance Monitoring"
      description="School and class rollups for the selected day. Teachers mark individual students; admins review coverage and rates."
      actions={
        <TableSearch
          value={search}
          onChange={setSearch}
          placeholder="Search school, class, teacher…"
        />
      }
    >
      {loadError ? <p className="mb-4 text-sm text-rose-600">{loadError}</p> : null}
      {loading ? <p className="mb-4 text-center text-sm text-slate-500">Loading student attendance…</p> : null}
      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid min-w-[12rem] flex-1 gap-1.5 sm:max-w-xs">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">School</span>
            <select
              className="field-control"
              value={schoolFilter}
              onChange={(e) => setSchoolFilter(e.target.value)}
            >
              <option value="all">All schools</option>
              {schoolOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-[10rem] gap-1.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Date</span>
            <input
              type="date"
              className="field-control"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        </div>
      </Card>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Present"
          value={totals.present}
          hint={`${totals.enrolled} enrolled across ${filtered.length} class${filtered.length === 1 ? '' : 'es'}`}
          accent="emerald"
          icon={<IconCheck className="h-4 w-4" />}
        />
        <StatCard
          label="Absent"
          value={totals.absent}
          hint={
            totals.enrolled
              ? `${Math.round((totals.absent / totals.enrolled) * 100)}% of enrolled`
              : 'No classes in view'
          }
          accent="rose"
          icon={<IconAlert className="h-4 w-4" />}
        />
        <StatCard
          label="Attendance %"
          value={filtered.length ? `${overallRate}%` : '—'}
          hint={filtered.length ? `Present ÷ enrolled for ${date}` : 'Adjust filters'}
          accent="sky"
          icon={<IconUsers className="h-4 w-4" />}
        />
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h2 className="text-[0.95rem] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Class attendance summary
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Aggregated headcount by school and class — not a student roster.
          </p>
        </div>
        <DataTable
          headers={[
            'School',
            'Class',
            'Teacher',
            'Enrolled',
            'Present',
            'Absent',
            'Rate',
            'Status',
          ]}
        >
          {filtered.length === 0 ? (
            <tr>
              <Td className="py-8 text-center text-slate-500" colSpan={8}>
                No class attendance matches your filters.
              </Td>
            </tr>
          ) : (
            filtered.map((row) => {
              const rate = attendanceRate(row.present, row.enrolled);
              const health = attendanceHealth(rate);
              return (
                <tr key={row.id}>
                  <Td className="font-medium text-slate-900 dark:text-slate-100">{row.school}</Td>
                  <Td>{row.classLabel}</Td>
                  <Td>{row.teacher}</Td>
                  <Td>{row.enrolled}</Td>
                  <Td className="text-emerald-700 dark:text-emerald-400">{row.present}</Td>
                  <Td className="text-rose-700 dark:text-rose-400">{row.absent}</Td>
                  <Td className="font-semibold text-slate-800 dark:text-slate-100">{rate}%</Td>
                  <Td>
                    <Badge tone={health.tone}>{health.label}</Badge>
                  </Td>
                </tr>
              );
            })
          )}
        </DataTable>
      </Card>
    </AdminShell>
  );
}

type SyllabusRow = {
  id: string;
  school: string;
  teacher: string;
  classLabel: string;
  subject: string;
  topic: string;
  completedPct: number;
  topicsDone: number;
  topicsTotal: number;
};

function mapSyllabusRow(row: ApiSyllabusRow): SyllabusRow {
  return {
    id: row.id,
    school: row.schoolName?.trim() || row.schoolId || '—',
    teacher: row.teacherName,
    classLabel: row.classLabel,
    subject: row.subject,
    topic: row.topic,
    completedPct: row.completedPct,
    topicsDone: row.topicsDone,
    topicsTotal: row.topicsTotal,
  };
}

export function AdminSyllabusPage() {
  const [list, setList] = useState<SyllabusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [editing, setEditing] = useState<SyllabusRow | null>(null);
  const [form, setForm] = useState({
    topic: '',
    completedPct: '',
    topicsDone: '',
    topicsTotal: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listSyllabus();
        if (!cancelled) setList(data.map(mapSyllabusRow));
      } catch (e) {
        if (!cancelled) setLoadError(apiErrorMessage(e, 'Failed to load syllabus'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const schoolOptions = [...new Set(list.map((row) => row.school))].sort((a, b) =>
    a.localeCompare(b),
  );

  const filtered = list.filter((row) => {
    if (schoolFilter !== 'all' && row.school !== schoolFilter) return false;
    return matchesSearch(
      search,
      row.school,
      row.teacher,
      row.classLabel,
      row.subject,
      row.topic,
    );
  });

  const classCount = filtered.length;
  const avgCompletion = classCount
    ? Math.round(filtered.reduce((sum, row) => sum + row.completedPct, 0) / classCount)
    : 0;
  const onTrack = filtered.filter((row) => row.completedPct >= 80).length;
  const needsFocus = filtered.filter((row) => row.completedPct < 50).length;
  const topicsRemaining = filtered.reduce(
    (sum, row) => sum + Math.max(0, row.topicsTotal - row.topicsDone),
    0,
  );

  const openEdit = (row: SyllabusRow) => {
    setEditing(row);
    setForm({
      topic: row.topic,
      completedPct: String(row.completedPct),
      topicsDone: String(row.topicsDone),
      topicsTotal: String(row.topicsTotal),
    });
    setErrors({});
  };

  const closeSyllabusModal = () => {
    setEditing(null);
    setErrors({});
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const nextErrors: FieldErrors = {};
    if (!form.topic.trim()) nextErrors.topic = enterField("today's topic");

    const completedPct = Number(form.completedPct);
    const topicsDone = Number(form.topicsDone);
    const topicsTotal = Number(form.topicsTotal);

    if (form.completedPct.trim() === '' || Number.isNaN(completedPct)) {
      nextErrors.completedPct = enterField('completion %');
    } else if (completedPct < 0 || completedPct > 100) {
      nextErrors.completedPct = 'Enter a value between 0 and 100.';
    }
    if (form.topicsDone.trim() === '' || Number.isNaN(topicsDone) || topicsDone < 0) {
      nextErrors.topicsDone = enterField('topics completed');
    }
    if (form.topicsTotal.trim() === '' || Number.isNaN(topicsTotal) || topicsTotal < 1) {
      nextErrors.topicsTotal = enterField('total topics');
    } else if (!Number.isNaN(topicsDone) && topicsDone > topicsTotal) {
      nextErrors.topicsDone = 'Completed topics cannot exceed total topics.';
    }

    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;

    try {
      const updated = await updateSyllabus(editing.id, {
        topic: form.topic.trim(),
        completedPct: Math.round(completedPct),
        topicsDone: Math.round(topicsDone),
        topicsTotal: Math.round(topicsTotal),
      });
      setList((prev) =>
        prev.map((r) => (r.id === editing.id ? mapSyllabusRow(updated) : r)),
      );
      closeSyllabusModal();
    } catch (err) {
      window.alert(apiErrorMessage(err, 'Failed to update syllabus'));
    }
  };

  return (
    <AdminShell
      title="Syllabus Monitoring"
      description="Class-level coverage across schools — today’s topic, completion rate, and remaining topics. Teachers update daily progress; admins monitor the network."
      actions={
        <TableSearch
          value={search}
          onChange={setSearch}
          placeholder="Search school, teacher, class, topic…"
        />
      }
    >
      {loadError ? <p className="mb-4 text-sm text-rose-600">{loadError}</p> : null}
      {loading ? <p className="mb-4 text-center text-sm text-slate-500">Loading syllabus…</p> : null}
      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid min-w-[12rem] flex-1 gap-1.5 sm:max-w-xs">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">School</span>
            <select
              className="field-control"
              value={schoolFilter}
              onChange={(e) => setSchoolFilter(e.target.value)}
            >
              <option value="all">All schools</option>
              {schoolOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <p className="pb-2 text-xs text-slate-500 dark:text-slate-400">
            Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{classCount}</span>{' '}
            class{classCount === 1 ? '' : 'es'}
            {schoolFilter !== 'all' ? ` · ${schoolFilter}` : ''}
          </p>
        </div>
      </Card>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Avg completion"
          value={classCount ? `${avgCompletion}%` : '—'}
          hint={classCount ? 'Across filtered classes' : 'No classes in view'}
          accent="amber"
          icon={<IconBook className="h-4 w-4" />}
        />
        <StatCard
          label="On track"
          value={onTrack}
          hint="≥ 80% complete"
          accent="emerald"
          icon={<IconCheck className="h-4 w-4" />}
        />
        <StatCard
          label="Needs focus"
          value={needsFocus}
          hint="< 50% complete"
          accent="rose"
          icon={<IconAlert className="h-4 w-4" />}
        />
        <StatCard
          label="Topics remaining"
          value={topicsRemaining}
          hint="Sum across filtered classes"
          accent="sky"
          icon={<IconClock className="h-4 w-4" />}
        />
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h2 className="text-[0.95rem] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Class syllabus progress
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Progress by school, teacher, and class — not lesson plan editing for individuals.
          </p>
        </div>
        <DataTable
          headers={[
            'School',
            'Class',
            'Teacher',
            "Today's topic",
            'Progress',
            'Topics',
            'Status',
            { label: 'Actions', className: 'text-right' },
          ]}
        >
          {filtered.length === 0 ? (
            <tr>
              <Td className="py-8 text-center text-slate-500" colSpan={8}>
                No syllabus rows match your filters.
              </Td>
            </tr>
          ) : (
            filtered.map((row) => {
              const remaining = Math.max(0, row.topicsTotal - row.topicsDone);
              return (
                <tr key={row.id}>
                  <Td className="font-medium text-slate-900 dark:text-slate-100">{row.school}</Td>
                  <Td>
                    <span className="font-medium text-slate-800 dark:text-slate-100">
                      {row.classLabel}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-400">{row.subject}</span>
                  </Td>
                  <Td>{row.teacher}</Td>
                  <Td>
                    <span className="text-slate-800 dark:text-slate-100">{row.topic}</span>
                  </Td>
                  <Td className="min-w-[9rem]">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 shrink-0 text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                        {row.completedPct}%
                      </span>
                      <ProgressBar value={row.completedPct} className="min-w-[4.5rem] flex-1" />
                    </div>
                  </Td>
                  <Td className="tabular-nums">
                    <span className="text-slate-800 dark:text-slate-100">
                      {row.topicsDone}/{row.topicsTotal}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-400">
                      {remaining} left
                    </span>
                  </Td>
                  <Td>
                    <Badge tone={progressBadgeTone(row.completedPct)}>
                      {progressLabel(row.completedPct)}
                    </Badge>
                  </Td>
                  <Td className="text-right align-middle">
                    <TableRowActions onEdit={() => openEdit(row)} />
                  </Td>
                </tr>
              );
            })
          )}
        </DataTable>
      </Card>

      <Modal
        open={Boolean(editing)}
        onClose={closeSyllabusModal}
        title="Adjust syllabus progress"
        description={
          editing
            ? `${editing.school} · ${editing.classLabel} · ${editing.teacher}`
            : 'Update topic and completion details.'
        }
      >
        <form noValidate onSubmit={handleSave} className="grid gap-3 px-5 py-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormField id="syl-topic" label="Today's topic" required error={errors.topic}>
              <Input
                value={form.topic}
                onChange={(e) => {
                  setForm((f) => ({ ...f, topic: e.target.value }));
                  touchField(setErrors, 'topic');
                }}
              />
            </FormField>
          </div>
          <FormField id="syl-completed" label="Completion %" required error={errors.completedPct}>
            <Input
              type="number"
              min={0}
              max={100}
              value={form.completedPct}
              onChange={(e) => {
                setForm((f) => ({ ...f, completedPct: e.target.value }));
                touchField(setErrors, 'completedPct');
              }}
            />
          </FormField>
          <FormField id="syl-done" label="Topics completed" required error={errors.topicsDone}>
            <Input
              type="number"
              min={0}
              value={form.topicsDone}
              onChange={(e) => {
                setForm((f) => ({ ...f, topicsDone: e.target.value }));
                touchField(setErrors, 'topicsDone');
              }}
            />
          </FormField>
          <FormField id="syl-total" label="Total topics" required error={errors.topicsTotal}>
            <Input
              type="number"
              min={1}
              value={form.topicsTotal}
              onChange={(e) => {
                setForm((f) => ({ ...f, topicsTotal: e.target.value }));
                touchField(setErrors, 'topicsTotal');
              }}
            />
          </FormField>
          <div className="sm:col-span-2 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={closeSyllabusModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Update
            </Button>
          </div>
        </form>
      </Modal>
    </AdminShell>
  );
}

export function AdminAssetsPage() {
  const [list, setList] = useState<Asset[]>([]);
  const [schoolOptions, setSchoolOptions] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Asset | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    quantity: '',
    workingStatus: 'Working' as Asset['workingStatus'],
    warranty: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [assetsData, schoolsData] = await Promise.all([listAssets(), listSchools()]);
        if (cancelled) return;
        setList(assetsData);
        setSchoolOptions(schoolsData);
      } catch (e) {
        if (!cancelled) setLoadError(apiErrorMessage(e, 'Failed to load assets'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const schoolName = (id: string) => schoolOptions.find((s) => s.id === id)?.name;

  const filtered = list.filter((asset) =>
    matchesSearch(
      search,
      asset.type,
      asset.quantity,
      asset.workingStatus,
      asset.purchaseDate,
      asset.warranty,
      schoolName(asset.schoolId),
    ),
  );

  const openEdit = (asset: Asset) => {
    setEditing(asset);
    setForm({
      quantity: String(asset.quantity),
      workingStatus: asset.workingStatus,
      warranty: asset.warranty,
    });
    setErrors({});
  };

  const closeAssetModal = () => {
    setEditing(null);
    setErrors({});
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const nextErrors: FieldErrors = {};
    if (form.quantity === '' || Number.isNaN(Number(form.quantity))) {
      nextErrors.quantity = enterField('quantity');
    }
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;

    try {
      const updated = await updateAsset(editing.id, {
        quantity: Number(form.quantity) || 0,
        workingStatus: form.workingStatus,
        warranty: form.warranty.trim(),
      });
      setList((prev) => prev.map((a) => (a.id === editing.id ? updated : a)));
      closeAssetModal();
    } catch (err) {
      window.alert(apiErrorMessage(err, 'Failed to update asset'));
    }
  };

  return (
    <AdminShell
      title="Asset Management"
      description="Computers, CPU, monitor, keyboard, mouse, UPS — quantity, status, warranty, school."
      actions={
        <>
          <TableSearch value={search} onChange={setSearch} placeholder="Search assets…" />
          <Button type="button" variant="primary">
            Add Asset
          </Button>
        </>
      }
    >
      {loadError ? <p className="mb-4 text-sm text-rose-600">{loadError}</p> : null}
      {loading ? <p className="mb-4 text-center text-sm text-slate-500">Loading assets…</p> : null}
      <Card padding="none" className="overflow-hidden">
        <DataTable
          headers={[
            'Type',
            'Quantity',
            'Working Status',
            'Purchase Date',
            'Warranty',
            'School',
            'Actions',
          ]}
        >
          {filtered.length === 0 ? (
            <tr>
              <Td className="py-8 text-center text-slate-500" colSpan={7}>
                No assets match your search.
              </Td>
            </tr>
          ) : (
            filtered.map((asset) => (
              <tr key={asset.id}>
                <Td className="font-medium text-slate-900 dark:text-slate-100">{asset.type}</Td>
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
                <Td>{asset.purchaseDate}</Td>
                <Td>{asset.warranty}</Td>
                <Td>{schoolName(asset.schoolId)}</Td>
                <Td>
                  <TableRowActions
                    onEdit={() => openEdit(asset)}
                    onDelete={() => setDeleteId(asset.id)}
                  />
                </Td>
              </tr>
            ))
          )}
        </DataTable>
      </Card>

      <Modal
        open={Boolean(editing)}
        onClose={closeAssetModal}
        title="Edit asset"
        description="Update quantity, status and warranty."
      >
        <form noValidate onSubmit={handleSave} className="grid gap-3 px-5 py-4 sm:grid-cols-2">
          <FormField id="ast-qty" label="Quantity" required error={errors.quantity}>
            <Input
              type="number"
              min={0}
              value={form.quantity}
              onChange={(e) => {
                setForm((f) => ({ ...f, quantity: e.target.value }));
                touchField(setErrors, 'quantity');
              }}
            />
          </FormField>
          <FormField id="ast-status" label="Working status">
            <select
              className="field-control w-full"
              value={form.workingStatus}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  workingStatus: e.target.value as Asset['workingStatus'],
                }))
              }
            >
              <option value="Working">Working</option>
              <option value="Needs Repair">Needs Repair</option>
              <option value="Not Working">Not Working</option>
            </select>
          </FormField>
          <div className="sm:col-span-2">
            <FormField id="ast-warranty" label="Warranty">
              <Input
                value={form.warranty}
                onChange={(e) => setForm((f) => ({ ...f, warranty: e.target.value }))}
              />
            </FormField>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={closeAssetModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Update
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete asset"
        description="This asset record will be removed."
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          const id = deleteId;
          if (!id) return;
          try {
            await deleteAsset(id);
            setList((prev) => prev.filter((a) => a.id !== id));
            setDeleteId(null);
          } catch (err) {
            window.alert(apiErrorMessage(err, 'Failed to delete asset'));
            throw err;
          }
        }}
      />
    </AdminShell>
  );
}

export function AdminTicketsPage() {
  const [list, setList] = useState<SupportTicket[]>([]);
  const [schoolOptions, setSchoolOptions] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<SupportTicket | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    description: '',
    status: 'Open' as SupportTicket['status'],
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ticketsData, schoolsData] = await Promise.all([listTickets(), listSchools()]);
        if (cancelled) return;
        setList(ticketsData);
        setSchoolOptions(schoolsData);
      } catch (e) {
        if (!cancelled) setLoadError(apiErrorMessage(e, 'Failed to load tickets'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const schoolName = (id: string) => schoolOptions.find((s) => s.id === id)?.name;

  const filtered = list.filter((ticket) =>
    matchesSearch(
      search,
      ticket.id,
      ticket.type,
      schoolName(ticket.schoolId),
      ticket.raisedBy,
      ticket.description,
      ticket.status,
      ticket.createdAt,
    ),
  );

  const openEdit = (ticket: SupportTicket) => {
    setEditing(ticket);
    setForm({ description: ticket.description, status: ticket.status });
    setErrors({});
  };

  const closeTicketModal = () => {
    setEditing(null);
    setErrors({});
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const nextErrors: FieldErrors = {};
    if (!form.description.trim()) nextErrors.description = enterField('description');
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;

    try {
      const updated = await updateTicket(editing.id, {
        description: form.description.trim(),
        status: form.status,
      });
      setList((prev) => prev.map((t) => (t.id === editing.id ? updated : t)));
      closeTicketModal();
    } catch (err) {
      window.alert(apiErrorMessage(err, 'Failed to update ticket'));
    }
  };

  return (
    <AdminShell
      title="Support Ticket Management"
      description="View, assign, update status and close tickets (Hardware, Software, Internet, Power, Others)."
      actions={
        <TableSearch value={search} onChange={setSearch} placeholder="Search tickets…" />
      }
    >
      {loadError ? <p className="mb-4 text-sm text-rose-600">{loadError}</p> : null}
      {loading ? <p className="mb-4 text-center text-sm text-slate-500">Loading tickets…</p> : null}
      <Card padding="none" className="overflow-hidden">
        <DataTable
          headers={['Ticket', 'Type', 'School', 'Raised by', 'Description', 'Status', 'Date', 'Actions']}
        >
          {filtered.length === 0 ? (
            <tr>
              <Td className="py-8 text-center text-slate-500" colSpan={8}>
                No tickets match your search.
              </Td>
            </tr>
          ) : (
            filtered.map((ticket) => (
              <tr key={ticket.id}>
                <Td className="font-medium text-slate-900 dark:text-slate-100">
                  {ticket.id.toUpperCase()}
                </Td>
                <Td>{ticket.type}</Td>
                <Td>{schoolName(ticket.schoolId)}</Td>
                <Td>{ticket.raisedBy}</Td>
                <Td className="max-w-xs">{ticket.description}</Td>
                <Td>
                  <Badge
                    tone={
                      ticket.status === 'Resolved' || ticket.status === 'Closed'
                        ? 'success'
                        : ticket.status === 'Open'
                          ? 'danger'
                          : 'warning'
                    }
                  >
                    {ticket.status}
                  </Badge>
                </Td>
                <Td>{ticket.createdAt}</Td>
                <Td>
                  <TableRowActions
                    onEdit={() => openEdit(ticket)}
                    onDelete={() => setDeleteId(ticket.id)}
                  />
                </Td>
              </tr>
            ))
          )}
        </DataTable>
      </Card>

      <Modal
        open={Boolean(editing)}
        onClose={closeTicketModal}
        title="Edit ticket"
        description="Update ticket description or status."
      >
        <form noValidate onSubmit={handleSave} className="grid gap-3 px-5 py-4">
          <FormField id="tkt-desc" label="Description" required error={errors.description}>
            <Input
              value={form.description}
              onChange={(e) => {
                setForm((f) => ({ ...f, description: e.target.value }));
                touchField(setErrors, 'description');
              }}
            />
          </FormField>
          <FormField id="tkt-status" label="Status">
            <select
              className="field-control w-full"
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  status: e.target.value as SupportTicket['status'],
                }))
              }
            >
              <option value="Open">Open</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </FormField>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={closeTicketModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Update
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete ticket"
        description="This support ticket will be removed."
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          const id = deleteId;
          if (!id) return;
          try {
            await deleteTicket(id);
            setList((prev) => prev.filter((t) => t.id !== id));
            setDeleteId(null);
          } catch (err) {
            window.alert(apiErrorMessage(err, 'Failed to delete ticket'));
            throw err;
          }
        }}
      />
    </AdminShell>
  );
}

export function AdminEventsPage() {
  const [list, setList] = useState<EventItem[]>([]);
  const [schoolOptions, setSchoolOptions] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', date: '', description: '' });
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [eventsData, schoolsData] = await Promise.all([listEvents(), listSchools()]);
        if (cancelled) return;
        setList(eventsData);
        setSchoolOptions(schoolsData);
      } catch (e) {
        if (!cancelled) setLoadError(apiErrorMessage(e, 'Failed to load events'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const schoolName = (id: string) => schoolOptions.find((s) => s.id === id)?.name;

  const filtered = list.filter((event) =>
    matchesSearch(
      search,
      event.name,
      event.date,
      event.description,
      schoolName(event.schoolId),
    ),
  );

  const openEdit = (event: EventItem) => {
    setEditing(event);
    setForm({ name: event.name, date: event.date, description: event.description });
    setErrors({});
  };

  const closeEventModal = () => {
    setEditing(null);
    setErrors({});
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const nextErrors: FieldErrors = {};
    if (!form.name.trim()) nextErrors.name = enterField('event name');
    if (!form.date) nextErrors.date = enterField('date');
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;

    try {
      const updated = await updateEvent(editing.id, {
        name: form.name.trim(),
        date: form.date,
        description: form.description.trim(),
      });
      setList((prev) => prev.map((ev) => (ev.id === editing.id ? updated : ev)));
      closeEventModal();
    } catch (err) {
      window.alert(apiErrorMessage(err, 'Failed to update event'));
    }
  };

  return (
    <AdminShell
      title="Event Gallery"
      description="Upload, view and delete school event images with name, date and description."
      actions={
        <>
          <TableSearch value={search} onChange={setSearch} placeholder="Search events…" />
          <Button type="button" variant="primary">
            Upload Images
          </Button>
        </>
      }
    >
      {loadError ? <p className="mb-4 text-sm text-rose-600">{loadError}</p> : null}
      {loading ? <p className="mb-4 text-center text-sm text-slate-500">Loading events…</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500 sm:col-span-2">No events match your search.</p>
        ) : (
          filtered.map((event) => (
          <Card key={event.id}>
            <div className="mb-3 h-36 rounded-lg bg-gradient-to-br from-orange-100 via-slate-100 to-sky-100" />
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                  {schoolName(event.schoolId)}
                </p>
                <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-50">
                  {event.name}
                </h3>
              </div>
              <TableRowActions
                onEdit={() => openEdit(event)}
                onDelete={() => setDeleteId(event.id)}
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">{event.date}</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{event.description}</p>
          </Card>
          ))
        )}
      </div>

      <Modal
        open={Boolean(editing)}
        onClose={closeEventModal}
        title="Edit event"
        description="Update event name, date or description."
      >
        <form noValidate onSubmit={handleSave} className="grid gap-3 px-5 py-4">
          <FormField id="evt-name" label="Event name" required error={errors.name}>
            <Input
              value={form.name}
              onChange={(e) => {
                setForm((f) => ({ ...f, name: e.target.value }));
                touchField(setErrors, 'name');
              }}
            />
          </FormField>
          <FormField id="evt-date" label="Date" required error={errors.date}>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => {
                setForm((f) => ({ ...f, date: e.target.value }));
                touchField(setErrors, 'date');
              }}
            />
          </FormField>
          <FormField id="evt-desc" label="Description">
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </FormField>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={closeEventModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Update
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete event"
        description="This event will be removed from the gallery."
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          const id = deleteId;
          if (!id) return;
          try {
            await deleteEvent(id);
            setList((prev) => prev.filter((ev) => ev.id !== id));
            setDeleteId(null);
          } catch (err) {
            window.alert(apiErrorMessage(err, 'Failed to delete event'));
            throw err;
          }
        }}
      />
    </AdminShell>
  );
}

export function AdminReportsPage() {
  const reports = [
    'Teacher Attendance',
    'Student Attendance',
    'School Report',
    'Teacher Report',
    'Asset Report',
    'Ticket Report',
    'Syllabus Report',
  ];

  return (
    <AdminShell
      title="Reports"
      description="Generate attendance, school, teacher, asset, ticket and syllabus reports. Export PDF or Excel."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((name) => (
          <Card key={name} className="flex flex-col gap-4">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-50">{name}</h3>
              <p className="mt-1 text-xs text-slate-500">Mock export — connect API later</p>
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              <Button type="button" variant="outline">
                PDF
              </Button>
              <Button type="button" variant="primary">
                Excel
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
