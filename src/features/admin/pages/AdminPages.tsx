import type { Dispatch, FormEvent, ReactNode, SetStateAction } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  Button,
  ConfirmDialog,
  FormField,
  Input,
  Modal,
  LeaveReviewActions,
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
  IconClock,
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
  Asset,
  EventItem,
  LeaveRequest,
  School,
  SponsorProfile,
  SupportTicket,
  TeacherProfile,
} from '../../../types/domain';
import {
  assets,
  events as seedEvents,
  leaves,
  recentActivities,
  schools,
  schools as seedSchools,
  sponsors,
  sponsors as seedSponsors,
  students,
  teachers,
  teachers as seedTeachers,
  tickets,
  tickets as seedTickets,
  assets as seedAssets,
  leaves as seedLeaves,
  schoolById,
} from '../../../data/mockData';
import { useAuth } from '../../auth/hooks/useAuth';
import { isValidEmail, isValidIndianPhone } from '../../../utils/validation';
import {
  clearFieldError,
  enterField,
  hasFieldErrors,
  type FieldErrors,
} from '../../../utils/formErrors';

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

  const presentTeachers = 2;
  const presentStudents = 318;
  const schoolsCovered = 2;
  const openTickets = tickets.filter(
    (t) => t.status === 'Open' || t.status === 'Assigned' || t.status === 'In Progress',
  ).length;
  const assetsCount = assets.reduce((sum, a) => sum + a.quantity, 0);
  const avgSyllabus = Math.round(
    schools.reduce((sum, s) => sum + s.syllabusCompletion, 0) / schools.length,
  );
  const pendingLeaves = leaves.filter((l) => l.status === 'Pending').length;
  const totalStudents = students.length + 530;
  const teacherPresencePct = Math.round((presentTeachers / Math.max(teachers.length, 1)) * 100);
  const activeSponsors = sponsors.filter((s) => s.active);
  const schoolsWithSponsor = schools.filter((s) => s.sponsorId).length;

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
              { label: 'Coverage', value: `${schoolsCovered}/${schools.length}`, hint: 'Schools live' },
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
            value={schools.length}
            hint="Active programmes"
            trend={{ label: '+1 this term', positive: true }}
            accent="brand"
            icon={<IconSchool className="h-4 w-4" />}
          />
          <StatCard
            label="Total Teachers"
            value={teachers.length}
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
            value={activeSponsors.length}
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
            detail: `of ${teachers.length} on roster`,
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
                        {schoolById(ticket.schoolId)?.name} — {ticket.description}
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
  const [schoolList, setSchoolList] = useState<School[]>(() => [...seedSchools]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewSchool, setViewSchool] = useState<School | null>(null);
  const [statusTarget, setStatusTarget] = useState<School | null>(null);
  const [form, setForm] = useState(emptySchoolForm);
  const [errors, setErrors] = useState<FieldErrors>({});

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

  const closeModal = () => {
    setOpen(false);
    setEditingId(null);
    setForm(emptySchoolForm);
    setErrors({});
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptySchoolForm);
    setErrors({});
    setOpen(true);
  };

  const openEdit = (school: School) => {
    setEditingId(school.id);
    setForm(schoolToForm(school));
    setErrors({});
    setOpen(true);
  };

  const handleSubmit = (e: FormEvent) => {
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

    if (editingId) {
      setSchoolList((prev) =>
        prev.map((s) => (s.id === editingId ? { ...s, ...fields } : s)),
      );
    } else {
      const next: School = {
        id: `sch_${Date.now()}`,
        ...fields,
        status: 'active',
        syllabusCompletion: 0,
      };
      setSchoolList((prev) => [next, ...prev]);
      setPage(1);
    }
    closeModal();
  };

  const setField = (key: keyof typeof emptySchoolForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    touchField(setErrors, key);
  };

  const toggleSchoolStatus = (school: School) => {
    const nextStatus = school.status === 'active' ? 'disabled' : 'active';
    setSchoolList((prev) =>
      prev.map((s) => (s.id === school.id ? { ...s, status: nextStatus } : s)),
    );
  };

  const viewSponsorName = viewSchool?.sponsorId
    ? sponsors.find((s) => s.id === viewSchool.sponsorId)?.name ?? '—'
    : 'Unassigned';

  return (
    <AdminShell
      title="School Management"
      description="Add and maintain schools, view full profiles, and disable programmes when needed."
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
                    <button
                      type="button"
                      onClick={() => setViewSchool(school)}
                      className="text-left font-medium text-sky-700 underline decoration-sky-700/30 underline-offset-2 transition hover:text-sky-800 hover:decoration-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1 dark:text-sky-400 dark:decoration-sky-400/40 dark:hover:text-sky-300 dark:hover:decoration-sky-300"
                    >
                      {school.name}
                    </button>
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
          <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingId ? 'Update School' : 'Save School'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(viewSchool)}
        onClose={() => setViewSchool(null)}
        title="School details"
        description={viewSchool?.name}
        className="max-w-xl"
      >
        {viewSchool ? (
          <div className="px-5 py-4">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge tone={viewSchool.status === 'disabled' ? 'warning' : 'success'}>
                {viewSchool.status === 'disabled' ? 'Disabled' : 'Active'}
              </Badge>
              <Badge tone={progressBadgeTone(viewSchool.syllabusCompletion)}>
                Syllabus {viewSchool.syllabusCompletion}% · {progressLabel(viewSchool.syllabusCompletion)}
              </Badge>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ['School name', viewSchool.name],
                  ['District', viewSchool.district],
                  ['Mandal', viewSchool.mandal],
                  ['Village / area', viewSchool.village || '—'],
                  ['Principal', viewSchool.principalName],
                  ['Contact', viewSchool.contactNumber],
                  ['Students', String(viewSchool.studentCount)],
                  ['Computers', String(viewSchool.computerCount)],
                  ['Teachers', String(viewSchool.teacherCount)],
                  ['Sponsor', viewSponsorName],
                  ['Syllabus completion', `${viewSchool.syllabusCompletion}%`],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400">
                    {label}
                  </dt>
                  <dd className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-100">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-4">
              <p className="mb-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400">
                Syllabus progress
              </p>
              <div className="flex items-center gap-3">
                <ProgressBar value={viewSchool.syllabusCompletion} className="min-w-0 flex-1" />
                <span className="shrink-0 text-xs font-bold tabular-nums text-slate-600 dark:text-slate-300">
                  {viewSchool.syllabusCompletion}%
                </span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const school = viewSchool;
                  setViewSchool(null);
                  setStatusTarget(school);
                }}
              >
                {viewSchool.status === 'disabled' ? 'Enable school' : 'Disable school'}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  const school = viewSchool;
                  setViewSchool(null);
                  openEdit(school);
                }}
              >
                Edit school
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(statusTarget)}
        title={
          statusTarget?.status === 'disabled' ? 'Enable school' : 'Disable school'
        }
        description={
          statusTarget?.status === 'disabled'
            ? `${statusTarget.name} will be marked Active and included in programme monitoring again.`
            : `${statusTarget?.name ?? 'This school'} will be disabled. It stays in the list but is treated as inactive for operations.`
        }
        confirmLabel={statusTarget?.status === 'disabled' ? 'Enable' : 'Disable'}
        confirmVariant={statusTarget?.status === 'disabled' ? 'primary' : 'destructive'}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => {
          if (!statusTarget) return;
          toggleSchoolStatus(statusTarget);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete school"
        description="This school will be removed from the list. This cannot be undone."
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return;
          setSchoolList((prev) => prev.filter((s) => s.id !== deleteId));
        }}
      />
    </AdminShell>
  );
}

const emptyTeacherForm = {
  name: '',
  mobile: '',
  email: '',
  qualification: '',
  schoolId: '',
  assignedClasses: '',
};

export function AdminTeachersPage() {
  const [list, setList] = useState<TeacherProfile[]>(() => [...seedTeachers]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    ...emptyTeacherForm,
    schoolId: schools[0]?.id ?? '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  const filtered = list.filter((teacher) =>
    matchesSearch(
      search,
      teacher.employeeId,
      teacher.name,
      teacher.mobile,
      teacher.email,
      teacher.qualification,
      schoolById(teacher.schoolId)?.name,
      teacher.assignedClasses.join(' '),
    ),
  );

  const closeTeacherModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm({ ...emptyTeacherForm, schoolId: schools[0]?.id ?? '' });
    setErrors({});
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyTeacherForm, schoolId: schools[0]?.id ?? '' });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (teacher: TeacherProfile) => {
    setEditingId(teacher.id);
    setForm({
      name: teacher.name,
      mobile: teacher.mobile,
      email: teacher.email,
      qualification: teacher.qualification,
      schoolId: teacher.schoolId,
      assignedClasses: teacher.assignedClasses.join(', '),
    });
    setErrors({});
    setModalOpen(true);
  };

  const setTeacherField = (key: keyof typeof emptyTeacherForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    touchField(setErrors, key);
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: FieldErrors = {};
    if (!form.name.trim()) nextErrors.name = enterField('name');
    if (!form.mobile.trim()) nextErrors.mobile = enterField('mobile number');
    else if (!isValidIndianPhone(form.mobile)) {
      nextErrors.mobile = 'Enter a valid 10-digit Indian mobile number.';
    }
    if (!form.email.trim()) nextErrors.email = enterField('email address');
    else if (!isValidEmail(form.email)) nextErrors.email = 'Enter a valid email address.';
    if (!form.schoolId) nextErrors.schoolId = 'Select a school.';
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;

    const classes = form.assignedClasses
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    if (editingId) {
      setList((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? {
                ...t,
                name: form.name.trim(),
                mobile: form.mobile.trim(),
                email: form.email.trim(),
                qualification: form.qualification.trim(),
                schoolId: form.schoolId,
                assignedClasses: classes,
              }
            : t,
        ),
      );
    } else {
      const next: TeacherProfile = {
        id: `tch_${Date.now()}`,
        employeeId: `EMP-${1000 + list.length + 1}`,
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim(),
        qualification: form.qualification.trim(),
        joiningDate: new Date().toISOString().slice(0, 10),
        schoolId: form.schoolId,
        assignedClasses: classes.length ? classes : ['6'],
        active: true,
      };
      setList((prev) => [next, ...prev]);
    }
    closeTeacherModal();
  };

  return (
    <AdminShell
      title="Teacher Management"
      description="Create logins, assign schools and classes, reset password, activate or deactivate access."
      actions={
        <>
          <TableSearch value={search} onChange={setSearch} placeholder="Search teachers…" />
          <Button type="button" variant="primary" onClick={openCreate}>
            Add Teacher
          </Button>
        </>
      }
    >
      <Card padding="none" className="overflow-x-auto overflow-y-clip">
        <DataTable
          className="overflow-visible"
          headers={[
            'Employee ID',
            'Name',
            'Mobile',
            'Email',
            'Qualification',
            'School',
            'Classes',
            'Status',
            'Actions',
          ]}
        >
          {filtered.length === 0 ? (
            <tr>
              <Td className="py-8 text-center text-slate-500" colSpan={9}>
                No teachers match your search.
              </Td>
            </tr>
          ) : (
            filtered.map((teacher) => (
              <tr key={teacher.id}>
                <Td>{teacher.employeeId}</Td>
                <Td className="font-medium text-slate-900 dark:text-slate-100">{teacher.name}</Td>
                <Td>{teacher.mobile}</Td>
                <Td>{teacher.email}</Td>
                <Td>{teacher.qualification}</Td>
                <Td>{schoolById(teacher.schoolId)?.name ?? '—'}</Td>
                <Td>{teacher.assignedClasses.join(', ')}</Td>
                <Td>
                  <Badge tone={teacher.active ? 'success' : 'danger'}>
                    {teacher.active ? 'Active' : 'Inactive'}
                  </Badge>
                </Td>
                <Td>
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

      <Modal
        open={modalOpen}
        onClose={closeTeacherModal}
        title={editingId ? 'Edit Teacher' : 'Add Teacher'}
        description={
          editingId
            ? 'Update teacher profile and school assignment.'
            : 'Enter teacher details to create their portal login.'
        }
      >
        <form noValidate onSubmit={handleSave} className="grid gap-3 px-5 py-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormField id="tch-name" label="Name" required error={errors.name}>
              <Input
                value={form.name}
                onChange={(e) => setTeacherField('name', e.target.value)}
                placeholder="Full name"
              />
            </FormField>
          </div>
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
          <FormField id="tch-school" label="School" required error={errors.schoolId}>
            <select
              className="field-control w-full"
              value={form.schoolId}
              onChange={(e) => setTeacherField('schoolId', e.target.value)}
            >
              <option value="">Select school</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="tch-classes" label="Classes">
            <Input
              value={form.assignedClasses}
              onChange={(e) => setTeacherField('assignedClasses', e.target.value)}
              placeholder="e.g. 6, 7, 8"
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField id="tch-qual" label="Qualification">
              <Input
                value={form.qualification}
                onChange={(e) => setTeacherField('qualification', e.target.value)}
                placeholder="e.g. B.Sc Computers, B.Ed"
              />
            </FormField>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={closeTeacherModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingId ? 'Update Teacher' : 'Save Teacher'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete teacher"
        description="This teacher will be removed from the list."
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return;
          setList((prev) => prev.filter((t) => t.id !== deleteId));
        }}
      />
    </AdminShell>
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
  const [schoolList, setSchoolList] = useState<School[]>(() => [...seedSchools]);
  const [sponsorList, setSponsorList] = useState<SponsorProfile[]>(() =>
    rebuildSponsorSchools(seedSchools, seedSponsors),
  );
  const [search, setSearch] = useState('');
  const [assigning, setAssigning] = useState<School | null>(null);
  const [selectedSponsorId, setSelectedSponsorId] = useState('');
  const [sponsorModalOpen, setSponsorModalOpen] = useState(false);
  const [editingSponsorId, setEditingSponsorId] = useState<string | null>(null);
  const [deleteSponsorId, setDeleteSponsorId] = useState<string | null>(null);
  const [sponsorForm, setSponsorForm] = useState(emptySponsorForm);
  const [errors, setErrors] = useState<FieldErrors>({});

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
  };

  const closeAssign = () => {
    setAssigning(null);
    setSelectedSponsorId('');
  };

  const closeSponsorModal = () => {
    setSponsorModalOpen(false);
    setEditingSponsorId(null);
    setSponsorForm(emptySponsorForm);
    setErrors({});
  };

  const openCreateSponsor = () => {
    setEditingSponsorId(null);
    setSponsorForm(emptySponsorForm);
    setErrors({});
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
    setSponsorModalOpen(true);
  };

  const setSponsorField = (key: keyof typeof emptySponsorForm, value: string) => {
    setSponsorForm((prev) => ({ ...prev, [key]: value }));
    touchField(setErrors, key);
  };

  const handleSponsorSubmit = (e: FormEvent) => {
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

    if (editingSponsorId) {
      setSponsorList((prev) =>
        prev.map((s) => (s.id === editingSponsorId ? { ...s, ...fields } : s)),
      );
    } else {
      const next: SponsorProfile = {
        id: `usr_sponsor_${Date.now()}`,
        ...fields,
        active: true,
        schoolIds: [],
      };
      setSponsorList((prev) => [next, ...prev]);
    }
    closeSponsorModal();
  };

  const applySponsor = (e: FormEvent) => {
    e.preventDefault();
    if (!assigning) return;
    const nextSponsorId = selectedSponsorId || undefined;

    setSchoolList((prev) => {
      const nextSchools = prev.map((s) =>
        s.id === assigning.id ? { ...s, sponsorId: nextSponsorId } : s,
      );
      setSponsorList((prevSponsors) => rebuildSponsorSchools(nextSchools, prevSponsors));
      return nextSchools;
    });
    closeAssign();
  };

  const confirmDeleteSponsor = () => {
    if (!deleteSponsorId) return;
    const id = deleteSponsorId;
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
        <form noValidate onSubmit={handleSponsorSubmit} className="px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField id="sponsor-name" label="Sponsor name" required error={errors.name}>
                <Input
                  value={sponsorForm.name}
                  onChange={(e) => setSponsorField('name', e.target.value)}
                  placeholder="e.g. Ananya Mehta"
                />
              </FormField>
            </div>
            <FormField id="sponsor-org" label="Organization" required error={errors.organization}>
              <Input
                value={sponsorForm.organization}
                onChange={(e) => setSponsorField('organization', e.target.value)}
                placeholder="Organization or foundation"
              />
            </FormField>
            <FormField id="sponsor-phone" label="Phone" required error={errors.phone}>
              <Input
                value={sponsorForm.phone}
                onChange={(e) => setSponsorField('phone', e.target.value)}
                placeholder="10-digit mobile"
              />
            </FormField>
            <div className="sm:col-span-2">
              <FormField id="sponsor-email" label="Email" required error={errors.email}>
                <Input
                  type="email"
                  value={sponsorForm.email}
                  onChange={(e) => setSponsorField('email', e.target.value)}
                  placeholder="sponsor@example.org"
                />
              </FormField>
            </div>
            <div className="sm:col-span-2">
              <FormField id="sponsor-address" label="Address" required error={errors.address}>
                <Input
                  value={sponsorForm.address}
                  onChange={(e) => setSponsorField('address', e.target.value)}
                  placeholder="Street, city, state, PIN"
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
            : 'Select a sponsor for this school.'
        }
      >
        <form onSubmit={applySponsor} className="px-5 py-4">
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
          <FormField id="assign-sponsor" label="Sponsor">
            <select
              className="field-control w-full"
              value={selectedSponsorId}
              onChange={(e) => setSelectedSponsorId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {sponsorList
                .filter((s) => s.active)
                .map((sponsor) => (
                  <option key={sponsor.id} value={sponsor.id}>
                    {sponsor.name} — {sponsor.organization}
                  </option>
                ))}
            </select>
          </FormField>
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
  teacher: string;
  school: string;
  clockIn: string;
  inLocation: string;
  clockOut: string;
  outLocation: string;
  hours: string;
};

function AttendanceHoursCell({
  hours,
  inLocation,
  outLocation,
}: {
  hours: string;
  inLocation: string;
  outLocation: string;
}) {
  const hasIn = Boolean(inLocation && inLocation !== '—');
  const hasOut = Boolean(outLocation && outLocation !== '—');
  const hasLocation = hasIn || hasOut;
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
                  <span className="relative block text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-slate-800 dark:text-slate-100">In:</span>{' '}
                    {hasIn ? inLocation : '—'}
                  </span>
                  <span className="relative mt-1 block text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-slate-800 dark:text-slate-100">Out:</span>{' '}
                    {hasOut ? outLocation : '—'}
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

const seedTeacherAttendance: AttendanceRow[] = [
  {
    id: 'ta_01',
    teacher: 'Priya Sharma',
    school: 'ZPHS Vijayawada East',
    clockIn: '09:05',
    inLocation: '16.5062° N, 80.6480° E',
    clockOut: '16:40',
    outLocation: '16.5061° N, 80.6482° E',
    hours: '7h 35m',
  },
  {
    id: 'ta_02',
    teacher: 'Ravi Kumar',
    school: 'ZPHS Guntur West',
    clockIn: '09:12',
    inLocation: '16.3067° N, 80.4365° E',
    clockOut: '—',
    outLocation: '—',
    hours: 'In progress',
  },
];

export function AdminTeacherAttendancePage() {
  const [list, setList] = useState<AttendanceRow[]>(() => [...seedTeacherAttendance]);
  const [search, setSearch] = useState('');
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

  const filtered = list.filter((row) =>
    matchesSearch(
      search,
      row.teacher,
      row.school,
      row.clockIn,
      row.clockOut,
      row.inLocation,
      row.outLocation,
      row.hours,
    ),
  );

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

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const nextErrors: FieldErrors = {};
    if (!form.teacher.trim()) nextErrors.teacher = enterField('teacher name');
    if (!form.school.trim()) nextErrors.school = enterField('school name');
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;

    setList((prev) =>
      prev.map((r) =>
        r.id === editing.id
          ? {
              ...r,
              teacher: form.teacher.trim(),
              school: form.school.trim(),
              clockIn: form.clockIn.trim(),
              clockOut: form.clockOut.trim(),
              hours: form.hours.trim(),
            }
          : r,
      ),
    );
    closeAttendanceModal();
  };

  return (
    <AdminShell
      title="Teacher Attendance Monitoring"
      description="Clock-in / clock-out times and GPS, working hours, daily and monthly history."
      actions={
        <TableSearch value={search} onChange={setSearch} placeholder="Search attendance…" />
      }
    >
      <Card className="mb-4">
        <div className="flex flex-wrap gap-3">
          <select className="field-control" defaultValue="">
            <option value="">All schools</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select className="field-control" defaultValue="">
            <option value="">All teachers</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <input type="date" className="field-control" defaultValue="2026-08-04" />
        </div>
      </Card>
      <Card padding="none" className="overflow-hidden">
        <DataTable
          headers={[
            'Teacher',
            'School',
            'Clock In',
            'Clock Out',
            'Hours',
            { label: 'Actions', className: 'text-right' },
          ]}
        >
          {filtered.length === 0 ? (
            <tr>
              <Td className="py-8 text-center text-slate-500" colSpan={6}>
                No attendance records match your search.
              </Td>
            </tr>
          ) : (
            filtered.map((row) => (
              <tr key={row.id}>
                <Td className="font-medium text-slate-900 dark:text-slate-100">{row.teacher}</Td>
                <Td>{row.school}</Td>
                <Td>{row.clockIn}</Td>
                <Td>{row.clockOut}</Td>
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
        onConfirm={() => {
          if (!deleteId) return;
          setList((prev) => prev.filter((r) => r.id !== deleteId));
        }}
      />
    </AdminShell>
  );
}

export function AdminLeavesPage() {
  const [list, setList] = useState<LeaveRequest[]>(() => [...seedLeaves]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<LeaveRequest | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: '',
    fromDate: '',
    toDate: '',
    reason: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  const filtered = list.filter((leave) =>
    matchesSearch(
      search,
      leave.teacherName,
      leave.type,
      leave.fromDate,
      leave.toDate,
      leave.reason,
      leave.status,
    ),
  );

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

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const nextErrors: FieldErrors = {};
    if (!form.type.trim()) nextErrors.type = enterField('leave type');
    if (!form.fromDate) nextErrors.fromDate = enterField('from date');
    if (!form.toDate) nextErrors.toDate = enterField('to date');
    if (!form.reason.trim()) nextErrors.reason = enterField('reason');
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;

    setList((prev) =>
      prev.map((l) =>
        l.id === editing.id
          ? {
              ...l,
              type: form.type.trim(),
              fromDate: form.fromDate,
              toDate: form.toDate,
              reason: form.reason.trim(),
            }
          : l,
      ),
    );
    closeLeaveModal();
  };

  const setStatus = (id: string, status: LeaveRequest['status']) => {
    setList((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
  };

  return (
    <AdminShell
      title="Teacher Leave Management"
      description="View leave requests, approve or reject, track balance and history."
      actions={<TableSearch value={search} onChange={setSearch} placeholder="Search leaves…" />}
    >
      <Card padding="none" className="overflow-hidden">
        <DataTable
          headers={[
            'Teacher',
            'Type',
            'From',
            'To',
            'Reason',
            'Status',
            { label: 'Review', className: 'text-center' },
            { label: 'Actions', className: 'text-right' },
          ]}
        >
          {filtered.length === 0 ? (
            <tr>
              <Td className="py-8 text-center text-slate-500" colSpan={8}>
                No leave requests match your search.
              </Td>
            </tr>
          ) : (
            filtered.map((leave) => (
              <tr key={leave.id}>
                <Td className="font-medium text-slate-900 dark:text-slate-100">
                  {leave.teacherName}
                </Td>
                <Td>{leave.type}</Td>
                <Td>{leave.fromDate}</Td>
                <Td>{leave.toDate}</Td>
                <Td className="max-w-[14rem]">
                  <span className="line-clamp-2">{leave.reason}</span>
                </Td>
                <Td>
                  <Badge
                    tone={
                      leave.status === 'Approved'
                        ? 'success'
                        : leave.status === 'Rejected'
                          ? 'danger'
                          : 'warning'
                    }
                  >
                    {leave.status}
                  </Badge>
                </Td>
                <Td className="text-center align-middle">
                  {leave.status === 'Pending' ? (
                    <LeaveReviewActions
                      onApprove={() => setStatus(leave.id, 'Approved')}
                      onReject={() => setStatus(leave.id, 'Rejected')}
                    />
                  ) : (
                    <span className="inline-flex h-8 items-center justify-center text-slate-400">
                      —
                    </span>
                  )}
                </Td>
                <Td className="text-right align-middle">
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
        onConfirm={() => {
          if (!deleteId) return;
          setList((prev) => prev.filter((l) => l.id !== deleteId));
        }}
      />
    </AdminShell>
  );
}

type ClassAttendanceSummary = {
  id: string;
  school: string;
  classLabel: string;
  teacher: string;
  enrolled: number;
  present: number;
  absent: number;
};

/** Class-level rollups for admin monitoring (individual student marking stays with teachers). */
const seedClassAttendance: ClassAttendanceSummary[] = [
  {
    id: 'sa_01',
    school: 'ZPHS Vijayawada East',
    classLabel: '7-A',
    teacher: 'Priya Sharma',
    enrolled: 32,
    present: 30,
    absent: 2,
  },
  {
    id: 'sa_02',
    school: 'ZPHS Vijayawada East',
    classLabel: '8-B',
    teacher: 'Priya Sharma',
    enrolled: 28,
    present: 27,
    absent: 1,
  },
  {
    id: 'sa_03',
    school: 'ZPHS Guntur West',
    classLabel: '9-B',
    teacher: 'Ravi Kumar',
    enrolled: 30,
    present: 27,
    absent: 3,
  },
  {
    id: 'sa_04',
    school: 'ZPHS Tirupati Central',
    classLabel: '6-A',
    teacher: 'Anitha Devi',
    enrolled: 34,
    present: 33,
    absent: 1,
  },
  {
    id: 'sa_05',
    school: 'ZPHS Visakhapatnam North',
    classLabel: '10-C',
    teacher: 'Suresh Babu',
    enrolled: 26,
    present: 22,
    absent: 4,
  },
  {
    id: 'sa_06',
    school: 'ZPHS Kakinada South',
    classLabel: '7-B',
    teacher: 'Lakshmi Rao',
    enrolled: 29,
    present: 25,
    absent: 4,
  },
];

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
  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [date, setDate] = useState('2026-08-04');

  const filtered = seedClassAttendance.filter((row) => {
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

  const schoolOptions = [
    ...new Set(seedClassAttendance.map((row) => row.school)),
  ].sort((a, b) => a.localeCompare(b));

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

const seedSyllabusRows: SyllabusRow[] = [
  {
    id: 'syl_01',
    school: 'ZPHS Vijayawada East',
    teacher: 'Priya Sharma',
    classLabel: '7-A',
    subject: 'Computer Basics',
    topic: 'MS Paint tools',
    completedPct: 72,
    topicsDone: 18,
    topicsTotal: 25,
  },
  {
    id: 'syl_02',
    school: 'ZPHS Vijayawada East',
    teacher: 'Priya Sharma',
    classLabel: '8-B',
    subject: 'Office Tools',
    topic: 'Word formatting',
    completedPct: 81,
    topicsDone: 22,
    topicsTotal: 27,
  },
  {
    id: 'syl_03',
    school: 'ZPHS Guntur West',
    teacher: 'Ravi Kumar',
    classLabel: '9-B',
    subject: 'Digital Safety',
    topic: 'Internet safety',
    completedPct: 64,
    topicsDone: 16,
    topicsTotal: 25,
  },
  {
    id: 'syl_04',
    school: 'ZPHS Tirupati Central',
    teacher: 'Anitha Devi',
    classLabel: '6-A',
    subject: 'Computer Basics',
    topic: 'Keyboard practice',
    completedPct: 88,
    topicsDone: 21,
    topicsTotal: 24,
  },
  {
    id: 'syl_05',
    school: 'ZPHS Visakhapatnam North',
    teacher: 'Suresh Babu',
    classLabel: '10-C',
    subject: 'Programming Intro',
    topic: 'Scratch loops',
    completedPct: 45,
    topicsDone: 9,
    topicsTotal: 20,
  },
  {
    id: 'syl_06',
    school: 'ZPHS Kakinada South',
    teacher: 'Lakshmi Rao',
    classLabel: '7-B',
    subject: 'Office Tools',
    topic: 'Excel basics',
    completedPct: 58,
    topicsDone: 14,
    topicsTotal: 24,
  },
  {
    id: 'syl_07',
    school: 'ZPHS Nellore East',
    teacher: 'Venkat Rao',
    classLabel: '8-A',
    subject: 'Digital Safety',
    topic: 'Cyber hygiene',
    completedPct: 75,
    topicsDone: 18,
    topicsTotal: 24,
  },
  {
    id: 'syl_08',
    school: 'ZPHS Kadapa West',
    teacher: 'Meena Kumari',
    classLabel: '6-B',
    subject: 'Computer Basics',
    topic: 'Parts of a computer',
    completedPct: 42,
    topicsDone: 8,
    topicsTotal: 19,
  },
];

export function AdminSyllabusPage() {
  const [list, setList] = useState<SyllabusRow[]>(() => [...seedSyllabusRows]);
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

  const handleSave = (e: FormEvent) => {
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

    setList((prev) =>
      prev.map((r) =>
        r.id === editing.id
          ? {
              ...r,
              topic: form.topic.trim(),
              completedPct: Math.round(completedPct),
              topicsDone: Math.round(topicsDone),
              topicsTotal: Math.round(topicsTotal),
            }
          : r,
      ),
    );
    closeSyllabusModal();
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
  const [list, setList] = useState<Asset[]>(() => [...seedAssets]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Asset | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    quantity: '',
    workingStatus: 'Working' as Asset['workingStatus'],
    warranty: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  const filtered = list.filter((asset) =>
    matchesSearch(
      search,
      asset.type,
      asset.quantity,
      asset.workingStatus,
      asset.purchaseDate,
      asset.warranty,
      schoolById(asset.schoolId)?.name,
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

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const nextErrors: FieldErrors = {};
    if (form.quantity === '' || Number.isNaN(Number(form.quantity))) {
      nextErrors.quantity = enterField('quantity');
    }
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;

    setList((prev) =>
      prev.map((a) =>
        a.id === editing.id
          ? {
              ...a,
              quantity: Number(form.quantity) || 0,
              workingStatus: form.workingStatus,
              warranty: form.warranty.trim(),
            }
          : a,
      ),
    );
    closeAssetModal();
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
                <Td>{schoolById(asset.schoolId)?.name}</Td>
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
        onConfirm={() => {
          if (!deleteId) return;
          setList((prev) => prev.filter((a) => a.id !== deleteId));
        }}
      />
    </AdminShell>
  );
}

export function AdminTicketsPage() {
  const [list, setList] = useState<SupportTicket[]>(() => [...seedTickets]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<SupportTicket | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    description: '',
    status: 'Open' as SupportTicket['status'],
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  const filtered = list.filter((ticket) =>
    matchesSearch(
      search,
      ticket.id,
      ticket.type,
      schoolById(ticket.schoolId)?.name,
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

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const nextErrors: FieldErrors = {};
    if (!form.description.trim()) nextErrors.description = enterField('description');
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;

    setList((prev) =>
      prev.map((t) =>
        t.id === editing.id
          ? { ...t, description: form.description.trim(), status: form.status }
          : t,
      ),
    );
    closeTicketModal();
  };

  return (
    <AdminShell
      title="Support Ticket Management"
      description="View, assign, update status and close tickets (Hardware, Software, Internet, Power, Others)."
      actions={
        <TableSearch value={search} onChange={setSearch} placeholder="Search tickets…" />
      }
    >
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
                <Td>{schoolById(ticket.schoolId)?.name}</Td>
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
        onConfirm={() => {
          if (!deleteId) return;
          setList((prev) => prev.filter((t) => t.id !== deleteId));
        }}
      />
    </AdminShell>
  );
}

export function AdminEventsPage() {
  const [list, setList] = useState<EventItem[]>(() => [...seedEvents]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', date: '', description: '' });
  const [errors, setErrors] = useState<FieldErrors>({});

  const filtered = list.filter((event) =>
    matchesSearch(
      search,
      event.name,
      event.date,
      event.description,
      schoolById(event.schoolId)?.name,
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

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const nextErrors: FieldErrors = {};
    if (!form.name.trim()) nextErrors.name = enterField('event name');
    if (!form.date) nextErrors.date = enterField('date');
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;

    setList((prev) =>
      prev.map((ev) =>
        ev.id === editing.id
          ? {
              ...ev,
              name: form.name.trim(),
              date: form.date,
              description: form.description.trim(),
            }
          : ev,
      ),
    );
    closeEventModal();
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
                  {schoolById(event.schoolId)?.name}
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
        onConfirm={() => {
          if (!deleteId) return;
          setList((prev) => prev.filter((ev) => ev.id !== deleteId));
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
