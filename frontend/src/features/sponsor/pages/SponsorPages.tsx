import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  ProgressBar,
  SectionTitle,
  StatCard,
} from '../../../components/ui/Surface';
import { DataTable, Td } from '../../../components/ui/DataTable';
import {
  listActivities,
  listAssets,
  listEvents,
  listSchools,
  listStudents,
  listSyllabus,
  listTeacherAttendance,
  listTeachers,
  listTickets,
} from '../../../api';
import type {
  ActivityItem,
  Asset,
  EventItem,
  School,
  Student,
  SupportTicket,
  TeacherProfile,
} from '../../../types/domain';
import type { SyllabusRow, TeacherAttendanceRow } from '../../../api';
import { useAuth } from '../../auth/hooks/useAuth';
import { progressBadgeTone, progressLabel } from '../../../utils/progress';

function apiErrorMessage(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

function useSponsoredSchools() {
  const { user } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listSchools();
        if (cancelled) return;
        const ids = user?.schoolIds?.length
          ? new Set(user.schoolIds)
          : new Set(data.filter((s) => s.sponsorId === user?.id).map((s) => s.id));
        // API already scopes by role for sponsors; still prefer assigned ids when present
        setSchools(ids.size ? data.filter((s) => ids.has(s.id)) : data);
      } catch (e) {
        if (!cancelled) setLoadError(apiErrorMessage(e, 'Failed to load schools'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.schoolIds]);

  return { schools, loading, loadError };
}

export function SponsorDashboardPage() {
  const { schools: sponsored, loading, loadError } = useSponsoredSchools();
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listActivities();
        if (!cancelled) setActivities(data);
      } catch {
        // optional feed
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalStudents = sponsored.reduce((sum, s) => sum + s.studentCount, 0);
  const totalTeachers = sponsored.reduce((sum, s) => sum + s.teacherCount, 0);
  const avgSyllabus = Math.round(
    sponsored.reduce((sum, s) => sum + s.syllabusCompletion, 0) / (sponsored.length || 1),
  );

  if (loading) {
    return <div className="py-16 text-center text-sm text-slate-500">Loading dashboard…</div>;
  }

  return (
    <div>
      <PageHeader
        title="Sponsor Dashboard"
        description="View-only insights for schools assigned to your sponsorship."
        readOnly
      />
      {loadError ? <p className="mb-4 text-sm text-rose-600">{loadError}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Sponsored Schools" value={sponsored.length} />
        <StatCard label="Total Students" value={totalStudents} />
        <StatCard label="Teachers Assigned" value={totalTeachers} />
        <StatCard label="Today's Attendance" value="—" hint="See Attendance page" />
        <StatCard label="Syllabus Progress" value={`${avgSyllabus}%`} />
        <StatCard label="Recent Activities" value={activities.length} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>Sponsored schools</SectionTitle>
          <DataTable headers={['School', 'District', 'Students', 'Syllabus']}>
            {sponsored.map((school) => (
              <tr key={school.id}>
                <Td className="font-medium text-slate-900">{school.name}</Td>
                <Td>{school.district}</Td>
                <Td>{school.studentCount}</Td>
                <Td>{school.syllabusCompletion}%</Td>
              </tr>
            ))}
          </DataTable>
        </Card>
        <Card>
          <SectionTitle>Recent activities</SectionTitle>
          <ul className="space-y-3">
            {activities.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                <span className="text-slate-700">{item.text}</span>
                <span className="shrink-0 text-xs text-slate-400">{item.time}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

export function SponsorSchoolsPage() {
  const { schools: sponsored, loading, loadError } = useSponsoredSchools();
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [teachersData, assetsData] = await Promise.all([listTeachers(), listAssets()]);
        if (cancelled) return;
        setTeachers(teachersData);
        setAssets(assetsData);
      } catch {
        // page still shows school cards
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="py-16 text-center text-sm text-slate-500">Loading schools…</div>;
  }

  return (
    <div>
      <PageHeader
        title="School Details"
        description="School info, teachers, student count and asset summary — view only."
        readOnly
      />
      {loadError ? <p className="mb-4 text-sm text-rose-600">{loadError}</p> : null}
      <div className="space-y-4">
        {sponsored.map((school) => {
          const schoolTeachers = teachers.filter((t) => t.schoolId === school.id);
          const schoolAssets = assets.filter((a) => a.schoolId === school.id);
          return (
            <Card key={school.id}>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{school.name}</h2>
                  <p className="text-sm text-slate-500">
                    {school.village}, {school.mandal}, {school.district}
                  </p>
                </div>
                <Badge tone="info">View only</Badge>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Principal</p>
                  <p className="font-medium text-slate-900">{school.principalName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Contact</p>
                  <p className="font-medium text-slate-900">{school.contactNumber}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Students</p>
                  <p className="font-medium text-slate-900">{school.studentCount}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Teachers</p>
                  <p className="font-medium text-slate-900">{schoolTeachers.length}</p>
                </div>
              </div>
              <div className="mt-4">
                <SectionTitle>Teachers</SectionTitle>
                <DataTable headers={['Name', 'Classes', 'Email']}>
                  {schoolTeachers.map((t) => (
                    <tr key={t.id}>
                      <Td className="font-medium text-slate-900">{t.name}</Td>
                      <Td>{t.assignedClasses.join(', ')}</Td>
                      <Td>{t.email}</Td>
                    </tr>
                  ))}
                </DataTable>
              </div>
              <div className="mt-4">
                <SectionTitle>Asset summary</SectionTitle>
                <div className="flex flex-wrap gap-2">
                  {schoolAssets.length === 0 ? (
                    <EmptyState className="min-h-[8rem] py-6" />
                  ) : (
                    schoolAssets.map((a) => (
                      <Badge key={a.id} tone="neutral">
                        {a.type}: {a.quantity}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function SponsorAttendancePage() {
  const { schools: sponsored, loading, loadError } = useSponsoredSchools();
  const [teacherRows, setTeacherRows] = useState<TeacherAttendanceRow[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const school = sponsored[0];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [attendance, studentList] = await Promise.all([
          listTeacherAttendance(),
          school ? listStudents({ schoolId: school.id }) : Promise.resolve([]),
        ]);
        if (cancelled) return;
        const ids = new Set(sponsored.map((s) => s.id));
        setTeacherRows(attendance.filter((r) => ids.has(r.schoolId)));
        setStudents(studentList);
      } catch {
        // keep empty tables
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sponsored, school]);

  if (loading) {
    return <div className="py-16 text-center text-sm text-slate-500">Loading attendance…</div>;
  }

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Teacher and student attendance for sponsored schools. No editing rights."
        readOnly
      />
      {loadError ? <p className="mb-4 text-sm text-rose-600">{loadError}</p> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>Teacher attendance</SectionTitle>
          <DataTable headers={['Teacher', 'School', 'Status', 'Hours']}>
            {teacherRows.map((row) => (
              <tr key={row.id}>
                <Td className="font-medium text-slate-900">{row.teacherName}</Td>
                <Td>{row.schoolName}</Td>
                <Td>
                  <Badge
                    tone={
                      !row.clockOut || row.clockOut === '—' || row.hours === 'In progress'
                        ? 'warning'
                        : 'success'
                    }
                  >
                    {!row.clockOut || row.clockOut === '—' || row.hours === 'In progress'
                      ? 'In progress'
                      : 'Present'}
                  </Badge>
                </Td>
                <Td>{row.hours}</Td>
              </tr>
            ))}
          </DataTable>
        </Card>
        <Card>
          <SectionTitle>Student roster · {school?.name ?? 'School'}</SectionTitle>
          <DataTable headers={['Student', 'Class', 'Status']}>
            {students.map((student) => (
              <tr key={student.id}>
                <Td className="font-medium text-slate-900">{student.name}</Td>
                <Td>
                  {student.classGrade}-{student.section}
                </Td>
                <Td>
                  <Badge tone="success">Enrolled</Badge>
                </Td>
              </tr>
            ))}
          </DataTable>
        </Card>
      </div>
    </div>
  );
}

export function SponsorSyllabusPage() {
  const { schools: sponsored, loading, loadError } = useSponsoredSchools();
  const [rows, setRows] = useState<SyllabusRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listSyllabus();
        if (cancelled) return;
        const ids = new Set(sponsored.map((s) => s.id));
        setRows(ids.size ? data.filter((r) => ids.has(r.schoolId)) : data);
      } catch {
        // fall back to school-level averages below
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sponsored]);

  if (loading) {
    return <div className="py-16 text-center text-sm text-slate-500">Loading syllabus…</div>;
  }

  const displayRows =
    rows.length > 0
      ? rows
      : sponsored.map((school) => ({
          id: school.id,
          schoolId: school.id,
          schoolName: school.name,
          teacherName: '—',
          classLabel: '6–10',
          subject: 'Programme',
          topic: '—',
          completedPct: school.syllabusCompletion,
          topicsDone: Math.round(school.syllabusCompletion / 5),
          topicsTotal: 20,
        }));

  return (
    <div>
      <PageHeader
        title="Syllabus Progress"
        description="Class-wise progress, topics completed and remaining — view only."
        readOnly
      />
      {loadError ? <p className="mb-4 text-sm text-rose-600">{loadError}</p> : null}
      <Card>
        <DataTable headers={['School', 'Class', 'Completed topics', 'Remaining', 'Progress']}>
          {displayRows.map((row) => (
            <tr key={row.id}>
              <Td className="font-medium text-slate-900">{row.schoolName}</Td>
              <Td>{row.classLabel}</Td>
              <Td>{row.topicsDone}</Td>
              <Td>{Math.max(0, row.topicsTotal - row.topicsDone)}</Td>
              <Td>
                <div className="min-w-[8rem] space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800">{row.completedPct}%</span>
                    <Badge tone={progressBadgeTone(row.completedPct)}>
                      {progressLabel(row.completedPct)}
                    </Badge>
                  </div>
                  <ProgressBar value={row.completedPct} />
                </div>
              </Td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </div>
  );
}

export function SponsorEventsPage() {
  const { schools: sponsored, loading, loadError } = useSponsoredSchools();
  const [list, setList] = useState<EventItem[]>([]);
  const schoolName = useMemo(
    () => new Map(sponsored.map((s) => [s.id, s.name])),
    [sponsored],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listEvents();
        if (cancelled) return;
        const ids = new Set(sponsored.map((s) => s.id));
        setList(ids.size ? data.filter((e) => ids.has(e.schoolId)) : data);
      } catch {
        // empty gallery
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sponsored]);

  if (loading) {
    return <div className="py-16 text-center text-sm text-slate-500">Loading events…</div>;
  }

  return (
    <div>
      <PageHeader
        title="Event Gallery"
        description="School events, student activities and photos — view only."
        readOnly
      />
      {loadError ? <p className="mb-4 text-sm text-rose-600">{loadError}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {list.map((event) => (
          <Card key={event.id}>
            <div className="mb-3 h-36 rounded-lg bg-gradient-to-br from-sky-100 via-white to-orange-50" />
            <div className="mb-1 flex items-center gap-2">
              <Badge tone="info">View only</Badge>
              <span className="text-xs text-slate-400">{event.date}</span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
              {schoolName.get(event.schoolId) ?? event.schoolId}
            </p>
            <h3 className="mt-1 font-semibold text-slate-900">{event.name}</h3>
            <p className="mt-2 text-sm text-slate-600">{event.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function SponsorAssetsPage() {
  const { schools: sponsored, loading, loadError } = useSponsoredSchools();
  const [list, setList] = useState<Asset[]>([]);
  const schoolName = useMemo(
    () => new Map(sponsored.map((s) => [s.id, s.name])),
    [sponsored],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listAssets();
        if (cancelled) return;
        const ids = new Set(sponsored.map((s) => s.id));
        setList(ids.size ? data.filter((a) => ids.has(a.schoolId)) : data);
      } catch {
        // empty
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sponsored]);

  const types = ['Computer', 'CPU', 'Keyboard', 'Mouse', 'Monitor', 'UPS'] as const;
  const counts = Object.fromEntries(
    types.map((type) => [
      type,
      list.filter((a) => a.type === type).reduce((sum, a) => sum + a.quantity, 0),
    ]),
  ) as Record<(typeof types)[number], number>;

  if (loading) {
    return <div className="py-16 text-center text-sm text-slate-500">Loading assets…</div>;
  }

  return (
    <div>
      <PageHeader
        title="Asset Summary"
        description="Computers, CPU, keyboard, mouse, monitor and UPS for sponsored schools."
        readOnly
      />
      {loadError ? <p className="mb-4 text-sm text-rose-600">{loadError}</p> : null}
      <div className="mb-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {types.map((type) => (
          <StatCard key={type} label={type} value={counts[type] || 0} />
        ))}
      </div>
      <Card>
        <DataTable headers={['Type', 'Quantity', 'Status', 'School']}>
          {list.map((asset) => (
            <tr key={asset.id}>
              <Td className="font-medium text-slate-900">{asset.type}</Td>
              <Td>{asset.quantity}</Td>
              <Td>
                <Badge
                  tone={asset.workingStatus === 'Working' ? 'success' : 'warning'}
                >
                  {asset.workingStatus}
                </Badge>
              </Td>
              <Td>{schoolName.get(asset.schoolId) ?? asset.schoolId}</Td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </div>
  );
}

export function SponsorTicketsPage() {
  const { schools: sponsored, loading, loadError } = useSponsoredSchools();
  const [list, setList] = useState<SupportTicket[]>([]);
  const schoolName = useMemo(
    () => new Map(sponsored.map((s) => [s.id, s.name])),
    [sponsored],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listTickets();
        if (cancelled) return;
        const ids = new Set(sponsored.map((s) => s.id));
        setList(ids.size ? data.filter((t) => ids.has(t.schoolId)) : data);
      } catch {
        // empty
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sponsored]);

  const open = list.filter(
    (t) => t.status === 'Open' || t.status === 'Assigned' || t.status === 'In Progress',
  );
  const resolved = list.filter((t) => t.status === 'Resolved' || t.status === 'Closed');

  if (loading) {
    return <div className="py-16 text-center text-sm text-slate-500">Loading tickets…</div>;
  }

  return (
    <div>
      <PageHeader
        title="Support Tickets"
        description="Open and resolved tickets for sponsored schools — read-only."
        readOnly
      />
      {loadError ? <p className="mb-4 text-sm text-rose-600">{loadError}</p> : null}
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <StatCard label="Open / In progress" value={open.length} />
        <StatCard label="Resolved / Closed" value={resolved.length} />
      </div>
      <Card>
        <DataTable headers={['Ticket', 'Type', 'School', 'Status', 'Description']}>
          {list.map((ticket) => (
            <tr key={ticket.id}>
              <Td className="font-medium text-slate-900">{ticket.id.toUpperCase()}</Td>
              <Td>{ticket.type}</Td>
              <Td>{schoolName.get(ticket.schoolId) ?? ticket.schoolId}</Td>
              <Td>
                <Badge tone="info">{ticket.status}</Badge>
              </Td>
              <Td className="max-w-xs">{ticket.description}</Td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </div>
  );
}
