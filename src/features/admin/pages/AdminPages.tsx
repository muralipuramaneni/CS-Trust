import type { FormEvent, ReactNode } from 'react';
import { useEffect, useState } from 'react';
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
  Student,
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
  students as seedStudents,
  teachers,
  teachers as seedTeachers,
  tickets,
  tickets as seedTickets,
  assets as seedAssets,
  leaves as seedLeaves,
  schoolById,
} from '../../../data/mockData';
import { useAuth } from '../../auth/hooks/useAuth';

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
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
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">Network at a glance</h2>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <IconTrendUp className="h-3.5 w-3.5" />
            Stable today
          </span>
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
                className="group rounded-lg border border-slate-100 bg-slate-50/50 p-4 transition hover:border-orange-100 hover:bg-orange-50/30"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="flex items-start gap-4">
                  <ProgressRing
                    value={school.syllabusCompletion}
                    size={58}
                    stroke={5}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{school.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {school.district} · {school.village} · {school.studentCount}{' '}
                          students
                        </p>
                      </div>
                      <Badge tone={progressBadgeTone(school.syllabusCompletion)}>
                        {progressLabel(school.syllabusCompletion)}
                      </Badge>
                    </div>
                    <ProgressBar value={school.syllabusCompletion} className="mt-3" />
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
  eyebrow = 'Admin',
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
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
  const [form, setForm] = useState(emptySchoolForm);

  const filteredSchools = schoolList.filter((school) =>
    matchesSearch(
      search,
      school.name,
      school.district,
      school.mandal,
      school.principalName,
      school.contactNumber,
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
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptySchoolForm);
    setOpen(true);
  };

  const openEdit = (school: School) => {
    setEditingId(school.id);
    setForm(schoolToForm(school));
    setOpen(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
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
  };

  return (
    <AdminShell
      title="School Management"
      description="Add, edit or delete schools; assign teachers and sponsors; open school dashboard."
      eyebrow={false}
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
      <Card padding="none" className="overflow-hidden">
        <DataTable
          headers={[
            'School',
            'District / Mandal',
            'Principal',
            'Contact',
            'Students',
            'Computers',
            'Teachers',
            'Actions',
          ]}
        >
          {pageSchools.length === 0 ? (
            <tr>
              <Td className="py-8 text-center text-slate-500" colSpan={8}>
                No schools match your search.
              </Td>
            </tr>
          ) : (
            pageSchools.map((school) => (
              <tr key={school.id}>
                <Td className="font-medium text-slate-900 dark:text-slate-100">{school.name}</Td>
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
                  <TableRowActions
                    onEdit={() => openEdit(school)}
                    onDelete={() => setDeleteId(school.id)}
                  />
                </Td>
              </tr>
            ))
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
        <form onSubmit={handleSubmit} className="px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField id="school-name" label="School name" required>
                <Input
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="e.g. ZPHS Vijayawada East"
                  required
                />
              </FormField>
            </div>
            <FormField id="school-district" label="District" required>
              <Input
                value={form.district}
                onChange={(e) => setField('district', e.target.value)}
                placeholder="District"
                required
              />
            </FormField>
            <FormField id="school-mandal" label="Mandal" required>
              <Input
                value={form.mandal}
                onChange={(e) => setField('mandal', e.target.value)}
                placeholder="Mandal"
                required
              />
            </FormField>
            <FormField id="school-village" label="Village / area">
              <Input
                value={form.village}
                onChange={(e) => setField('village', e.target.value)}
                placeholder="Village"
              />
            </FormField>
            <FormField id="school-principal" label="Principal name" required>
              <Input
                value={form.principalName}
                onChange={(e) => setField('principalName', e.target.value)}
                placeholder="Principal"
                required
              />
            </FormField>
            <FormField id="school-contact" label="Contact number" required>
              <Input
                value={form.contactNumber}
                onChange={(e) => setField('contactNumber', e.target.value)}
                placeholder="10-digit mobile"
                required
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

export function AdminTeachersPage() {
  const [list, setList] = useState<TeacherProfile[]>(() => [...seedTeachers]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<TeacherProfile | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', mobile: '', email: '', qualification: '' });

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

  const openEdit = (teacher: TeacherProfile) => {
    setEditing(teacher);
    setForm({
      name: teacher.name,
      mobile: teacher.mobile,
      email: teacher.email,
      qualification: teacher.qualification,
    });
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setList((prev) =>
      prev.map((t) =>
        t.id === editing.id
          ? {
              ...t,
              name: form.name.trim(),
              mobile: form.mobile.trim(),
              email: form.email.trim(),
              qualification: form.qualification.trim(),
            }
          : t,
      ),
    );
    setEditing(null);
  };

  return (
    <AdminShell
      title="Teacher Management"
      description="Create logins, assign schools and classes, reset password, activate or deactivate access."
      actions={
        <>
          <TableSearch value={search} onChange={setSearch} placeholder="Search teachers…" />
          <Button type="button" variant="primary">
            Add Teacher
          </Button>
        </>
      }
    >
      <Card padding="none" className="overflow-hidden">
        <DataTable
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
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit Teacher"
        description="Update teacher profile details."
      >
        <form onSubmit={handleSave} className="grid gap-3 px-5 py-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormField id="tch-name" label="Name" required>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </FormField>
          </div>
          <FormField id="tch-mobile" label="Mobile" required>
            <Input
              value={form.mobile}
              onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
              required
            />
          </FormField>
          <FormField id="tch-email" label="Email" required>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField id="tch-qual" label="Qualification">
              <Input
                value={form.qualification}
                onChange={(e) => setForm((f) => ({ ...f, qualification: e.target.value }))}
              />
            </FormField>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
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

  const unassignedCount = schoolList.filter((s) => !s.sponsorId).length;

  const filteredSponsors = sponsorList.filter((sponsor) =>
    matchesSearch(
      search,
      sponsor.name,
      sponsor.email,
      sponsor.phone,
      sponsor.organization,
      sponsor.address,
      sponsor.schoolIds
        .map((id) => schoolList.find((s) => s.id === id)?.name)
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
  };

  const openCreateSponsor = () => {
    setEditingSponsorId(null);
    setSponsorForm(emptySponsorForm);
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
    setSponsorModalOpen(true);
  };

  const setSponsorField = (key: keyof typeof emptySponsorForm, value: string) => {
    setSponsorForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSponsorSubmit = (e: FormEvent) => {
    e.preventDefault();
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
      description="Map donors and sponsors to schools so they can view assigned schools in read-only portal access (BRD: Assign the sponsor)."
      eyebrow={false}
      actions={
        <>
          <TableSearch value={search} onChange={setSearch} placeholder="Search…" />
          <Button type="button" variant="primary" onClick={openCreateSponsor}>
            Add Sponsor
          </Button>
        </>
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Sponsors" value={sponsorList.length} hint="Active accounts" />
        <StatCard
          label="Assigned schools"
          value={schoolList.filter((s) => s.sponsorId).length}
          hint={`of ${schoolList.length} schools`}
        />
        <StatCard
          label="Unassigned"
          value={unassignedCount}
          hint="Need a sponsor"
          accent={unassignedCount > 0 ? 'amber' : 'emerald'}
        />
      </div>

      <div className="mb-6">
        <SectionTitle>Sponsors</SectionTitle>
        <Card padding="none" className="mt-3 overflow-hidden">
          <DataTable
            headers={[
              'Sponsor',
              'Organization',
              'Contact',
              'Address',
              'Schools',
              'Status',
              'Actions',
            ]}
          >
            {filteredSponsors.length === 0 ? (
              <tr>
                <Td className="py-8 text-center text-slate-500" colSpan={7}>
                  No sponsors match your search.
                </Td>
              </tr>
            ) : (
              filteredSponsors.map((sponsor) => (
                <tr key={sponsor.id}>
                  <Td>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{sponsor.name}</p>
                    <p className="text-xs text-slate-500">{sponsor.email}</p>
                  </Td>
                  <Td>{sponsor.organization}</Td>
                  <Td>{sponsor.phone}</Td>
                  <Td className="max-w-[14rem]">
                    <span className="line-clamp-2 text-sm">{sponsor.address || '—'}</span>
                  </Td>
                  <Td>
                    {sponsor.schoolIds.length === 0
                      ? '—'
                      : sponsor.schoolIds
                          .map((id) => schoolList.find((s) => s.id === id)?.name ?? id)
                          .join(', ')}
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
              ))
            )}
          </DataTable>
        </Card>
      </div>

      <SectionTitle>School–sponsor assignments</SectionTitle>
      <Card padding="none" className="mt-3 overflow-hidden">
        <DataTable headers={['School', 'District / Mandal', 'Assigned sponsor', 'Actions']}>
          {filteredSchools.length === 0 ? (
            <tr>
              <Td className="py-8 text-center text-slate-500" colSpan={4}>
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
                  <Td className="font-medium text-slate-900 dark:text-slate-100">{school.name}</Td>
                  <Td>
                    {school.district}
                    <span className="text-slate-400"> · </span>
                    {school.mandal}
                  </Td>
                  <Td>
                    {sponsor ? (
                      <div>
                        <p className="font-medium text-slate-800 dark:text-slate-100">
                          {sponsor.name}
                        </p>
                        <p className="text-xs text-slate-500">{sponsor.organization}</p>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">Not assigned</span>
                    )}
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
        <form onSubmit={handleSponsorSubmit} className="px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField id="sponsor-name" label="Sponsor name" required>
                <Input
                  value={sponsorForm.name}
                  onChange={(e) => setSponsorField('name', e.target.value)}
                  placeholder="e.g. Ananya Mehta"
                  required
                />
              </FormField>
            </div>
            <FormField id="sponsor-org" label="Organization" required>
              <Input
                value={sponsorForm.organization}
                onChange={(e) => setSponsorField('organization', e.target.value)}
                placeholder="Organization or foundation"
                required
              />
            </FormField>
            <FormField id="sponsor-phone" label="Phone" required>
              <Input
                value={sponsorForm.phone}
                onChange={(e) => setSponsorField('phone', e.target.value)}
                placeholder="10-digit mobile"
                required
              />
            </FormField>
            <div className="sm:col-span-2">
              <FormField id="sponsor-email" label="Email" required>
                <Input
                  type="email"
                  value={sponsorForm.email}
                  onChange={(e) => setSponsorField('email', e.target.value)}
                  placeholder="sponsor@example.org"
                  required
                />
              </FormField>
            </div>
            <div className="sm:col-span-2">
              <FormField id="sponsor-address" label="Address" required>
                <Input
                  value={sponsorForm.address}
                  onChange={(e) => setSponsorField('address', e.target.value)}
                  placeholder="Street, city, state, PIN"
                  required
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
            ? `Select a sponsor for ${assigning.name}.`
            : 'Select a sponsor for this school.'
        }
      >
        <form onSubmit={applySponsor} className="px-5 py-4">
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
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
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
    setEditing(null);
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
            'In Location',
            'Clock Out',
            'Out Location',
            'Hours',
            'Actions',
          ]}
        >
          {filtered.length === 0 ? (
            <tr>
              <Td className="py-8 text-center text-slate-500" colSpan={8}>
                No attendance records match your search.
              </Td>
            </tr>
          ) : (
            filtered.map((row) => (
              <tr key={row.id}>
                <Td className="font-medium text-slate-900 dark:text-slate-100">{row.teacher}</Td>
                <Td>{row.school}</Td>
                <Td>{row.clockIn}</Td>
                <Td>{row.inLocation}</Td>
                <Td>{row.clockOut}</Td>
                <Td>{row.outLocation}</Td>
                <Td>{row.hours}</Td>
                <Td>
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
        onClose={() => setEditing(null)}
        title="Edit attendance"
        description="Update clock times and working hours."
      >
        <form onSubmit={handleSave} className="grid gap-3 px-5 py-4 sm:grid-cols-2">
          <FormField id="att-teacher" label="Teacher" required>
            <Input
              value={form.teacher}
              onChange={(e) => setForm((f) => ({ ...f, teacher: e.target.value }))}
              required
            />
          </FormField>
          <FormField id="att-school" label="School" required>
            <Input
              value={form.school}
              onChange={(e) => setForm((f) => ({ ...f, school: e.target.value }))}
              required
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
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
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
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
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
    setEditing(null);
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
          headers={['Teacher', 'Type', 'From', 'To', 'Reason', 'Status', 'Review', 'Actions']}
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
                <Td>{leave.reason}</Td>
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
                <Td>
                  {leave.status === 'Pending' ? (
                    <LeaveReviewActions
                      onApprove={() => setStatus(leave.id, 'Approved')}
                      onReject={() => setStatus(leave.id, 'Rejected')}
                    />
                  ) : (
                    '—'
                  )}
                </Td>
                <Td>
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
        onClose={() => setEditing(null)}
        title="Edit leave request"
        description="Update leave type, dates or reason."
      >
        <form onSubmit={handleSave} className="grid gap-3 px-5 py-4 sm:grid-cols-2">
          <FormField id="lv-type" label="Type" required>
            <Input
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              required
            />
          </FormField>
          <FormField id="lv-from" label="From" required>
            <Input
              type="date"
              value={form.fromDate}
              onChange={(e) => setForm((f) => ({ ...f, fromDate: e.target.value }))}
              required
            />
          </FormField>
          <FormField id="lv-to" label="To" required>
            <Input
              type="date"
              value={form.toDate}
              onChange={(e) => setForm((f) => ({ ...f, toDate: e.target.value }))}
              required
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField id="lv-reason" label="Reason" required>
              <Input
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                required
              />
            </FormField>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
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

export function AdminStudentAttendancePage() {
  const [list, setList] = useState<Student[]>(() => [...seedStudents]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', classGrade: '', section: '' });

  const filtered = list.filter((student) =>
    matchesSearch(
      search,
      student.studentId,
      student.name,
      student.classGrade,
      student.section,
    ),
  );

  const openEdit = (student: Student) => {
    setEditing(student);
    setForm({
      name: student.name,
      classGrade: student.classGrade,
      section: student.section,
    });
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setList((prev) =>
      prev.map((s) =>
        s.id === editing.id
          ? {
              ...s,
              name: form.name.trim(),
              classGrade: form.classGrade.trim(),
              section: form.section.trim(),
            }
          : s,
      ),
    );
    setEditing(null);
  };

  return (
    <AdminShell
      title="Student Attendance Monitoring"
      description="School-wise, class-wise, daily and monthly attendance with filters."
      actions={
        <TableSearch value={search} onChange={setSearch} placeholder="Search students…" />
      }
    >
      <Card className="mb-4">
        <div className="flex flex-wrap gap-3">
          <select className="field-control" defaultValue="sch_01">
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select className="field-control" defaultValue="7">
            <option value="7">Class 7</option>
            <option value="8">Class 8</option>
            <option value="9">Class 9</option>
          </select>
          <input type="date" className="field-control" defaultValue="2026-08-04" />
        </div>
      </Card>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Present" value={28} />
        <StatCard label="Absent" value={2} />
        <StatCard label="Attendance %" value="93%" />
      </div>
      <Card padding="none" className="overflow-hidden">
        <DataTable headers={['Student ID', 'Name', 'Class', 'Section', 'Status', 'Actions']}>
          {filtered.length === 0 ? (
            <tr>
              <Td className="py-8 text-center text-slate-500" colSpan={6}>
                No students match your search.
              </Td>
            </tr>
          ) : (
            filtered.map((student) => (
              <tr key={student.id}>
                <Td>{student.studentId}</Td>
                <Td className="font-medium text-slate-900 dark:text-slate-100">{student.name}</Td>
                <Td>{student.classGrade}</Td>
                <Td>{student.section}</Td>
                <Td>
                  <Badge tone="success">Present</Badge>
                </Td>
                <Td>
                  <TableRowActions
                    onEdit={() => openEdit(student)}
                    onDelete={() => setDeleteId(student.id)}
                  />
                </Td>
              </tr>
            ))
          )}
        </DataTable>
      </Card>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit student"
        description="Update student attendance roster details."
      >
        <form onSubmit={handleSave} className="grid gap-3 px-5 py-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormField id="stu-name" label="Name" required>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </FormField>
          </div>
          <FormField id="stu-class" label="Class" required>
            <Input
              value={form.classGrade}
              onChange={(e) => setForm((f) => ({ ...f, classGrade: e.target.value }))}
              required
            />
          </FormField>
          <FormField id="stu-section" label="Section" required>
            <Input
              value={form.section}
              onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
              required
            />
          </FormField>
          <div className="sm:col-span-2 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
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
        title="Delete student record"
        description="This student will be removed from the attendance list."
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return;
          setList((prev) => prev.filter((s) => s.id !== deleteId));
        }}
      />
    </AdminShell>
  );
}

type SyllabusRow = {
  id: string;
  school: string;
  teacher: string;
  classLabel: string;
  topic: string;
  completed: string;
  remaining: string;
};

const seedSyllabusRows: SyllabusRow[] = [
  {
    id: 'syl_01',
    school: 'ZPHS Vijayawada East',
    teacher: 'Priya Sharma',
    classLabel: '7-A',
    topic: 'MS Paint tools',
    completed: '72%',
    remaining: '4 topics',
  },
  {
    id: 'syl_02',
    school: 'ZPHS Guntur West',
    teacher: 'Ravi Kumar',
    classLabel: '9-B',
    topic: 'Internet safety',
    completed: '64%',
    remaining: '6 topics',
  },
];

export function AdminSyllabusPage() {
  const [list, setList] = useState<SyllabusRow[]>(() => [...seedSyllabusRows]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<SyllabusRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ topic: '', completed: '', remaining: '' });

  const filtered = list.filter((row) =>
    matchesSearch(
      search,
      row.school,
      row.teacher,
      row.classLabel,
      row.topic,
      row.completed,
      row.remaining,
    ),
  );

  const openEdit = (row: SyllabusRow) => {
    setEditing(row);
    setForm({ topic: row.topic, completed: row.completed, remaining: row.remaining });
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setList((prev) =>
      prev.map((r) =>
        r.id === editing.id
          ? {
              ...r,
              topic: form.topic.trim(),
              completed: form.completed.trim(),
              remaining: form.remaining.trim(),
            }
          : r,
      ),
    );
    setEditing(null);
  };

  return (
    <AdminShell
      title="Syllabus Monitoring"
      description="Track today’s topic, completed and remaining topics by school and teacher."
      actions={
        <TableSearch value={search} onChange={setSearch} placeholder="Search syllabus…" />
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Overall Completion" value="72%" />
        <StatCard label="School Progress (avg)" value="72%" />
        <StatCard label="Teacher Progress (avg)" value="68%" />
      </div>
      <Card padding="none" className="overflow-hidden">
        <DataTable
          headers={[
            'School',
            'Teacher',
            'Class',
            "Today's Topic",
            'Completed %',
            'Remaining',
            'Actions',
          ]}
        >
          {filtered.length === 0 ? (
            <tr>
              <Td className="py-8 text-center text-slate-500" colSpan={7}>
                No syllabus rows match your search.
              </Td>
            </tr>
          ) : (
            filtered.map((row) => (
              <tr key={row.id}>
                <Td>{row.school}</Td>
                <Td>{row.teacher}</Td>
                <Td>{row.classLabel}</Td>
                <Td>{row.topic}</Td>
                <Td>{row.completed}</Td>
                <Td>{row.remaining}</Td>
                <Td>
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
        onClose={() => setEditing(null)}
        title="Edit syllabus progress"
        description="Update topic and completion details."
      >
        <form onSubmit={handleSave} className="grid gap-3 px-5 py-4">
          <FormField id="syl-topic" label="Today's topic" required>
            <Input
              value={form.topic}
              onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
              required
            />
          </FormField>
          <FormField id="syl-completed" label="Completed %">
            <Input
              value={form.completed}
              onChange={(e) => setForm((f) => ({ ...f, completed: e.target.value }))}
            />
          </FormField>
          <FormField id="syl-remaining" label="Remaining">
            <Input
              value={form.remaining}
              onChange={(e) => setForm((f) => ({ ...f, remaining: e.target.value }))}
            />
          </FormField>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
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
        title="Delete syllabus row"
        description="This syllabus progress row will be removed."
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return;
          setList((prev) => prev.filter((r) => r.id !== deleteId));
        }}
      />
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
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
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
    setEditing(null);
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
        onClose={() => setEditing(null)}
        title="Edit asset"
        description="Update quantity, status and warranty."
      >
        <form onSubmit={handleSave} className="grid gap-3 px-5 py-4 sm:grid-cols-2">
          <FormField id="ast-qty" label="Quantity" required>
            <Input
              type="number"
              min={0}
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              required
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
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
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
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setList((prev) =>
      prev.map((t) =>
        t.id === editing.id
          ? { ...t, description: form.description.trim(), status: form.status }
          : t,
      ),
    );
    setEditing(null);
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
        onClose={() => setEditing(null)}
        title="Edit ticket"
        description="Update ticket description or status."
      >
        <form onSubmit={handleSave} className="grid gap-3 px-5 py-4">
          <FormField id="tkt-desc" label="Description" required>
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              required
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
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
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
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
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
    setEditing(null);
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
        onClose={() => setEditing(null)}
        title="Edit event"
        description="Update event name, date or description."
      >
        <form onSubmit={handleSave} className="grid gap-3 px-5 py-4">
          <FormField id="evt-name" label="Event name" required>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </FormField>
          <FormField id="evt-date" label="Date" required>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              required
            />
          </FormField>
          <FormField id="evt-desc" label="Description">
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </FormField>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
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
