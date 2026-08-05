import {
  Badge,
  Card,
  PageHeader,
  ProgressBar,
  SectionTitle,
  StatCard,
} from '../../../components/ui/Surface';
import { DataTable, Td } from '../../../components/ui/DataTable';
import {
  assets,
  events,
  recentActivities,
  schoolById,
  schools,
  studentsBySchool,
  teachersBySchool,
  tickets,
} from '../../../data/mockData';
import { useAuth } from '../../auth/hooks/useAuth';
import { progressBadgeTone, progressLabel } from '../../../utils/progress';

function useSponsoredSchools() {
  const { user } = useAuth();
  const ids = user?.schoolIds?.length
    ? user.schoolIds
    : schools.filter((s) => s.sponsorId === user?.id || s.sponsorId === 'usr_sponsor_01').map(
        (s) => s.id,
      );
  // Prefer assigned list; fall back to sch_01 + sch_02 from seed
  const resolved = ids.length ? ids : ['sch_01', 'sch_02'];
  return schools.filter((s) => resolved.includes(s.id));
}

export function SponsorDashboardPage() {
  const sponsored = useSponsoredSchools();
  const totalStudents = sponsored.reduce((sum, s) => sum + s.studentCount, 0);
  const totalTeachers = sponsored.reduce((sum, s) => sum + s.teacherCount, 0);
  const avgSyllabus = Math.round(
    sponsored.reduce((sum, s) => sum + s.syllabusCompletion, 0) / (sponsored.length || 1),
  );

  return (
    <div>
      <PageHeader
        title="Sponsor Dashboard"
        description="View-only insights for schools assigned to your sponsorship."
        readOnly
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Sponsored Schools" value={sponsored.length} />
        <StatCard label="Total Students" value={totalStudents} />
        <StatCard label="Teachers Assigned" value={totalTeachers} />
        <StatCard label="Today's Attendance" value="91%" hint="Students present (demo)" />
        <StatCard label="Syllabus Progress" value={`${avgSyllabus}%`} />
        <StatCard label="Recent Activities" value={recentActivities.length} />
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
            {recentActivities.map((item) => (
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
  const sponsored = useSponsoredSchools();

  return (
    <div>
      <PageHeader
        title="School Details"
        description="School info, teachers, student count and asset summary — view only."
        readOnly
      />
      <div className="space-y-4">
        {sponsored.map((school) => {
          const schoolTeachers = teachersBySchool(school.id);
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
                    <p className="text-sm text-slate-500">No assets listed.</p>
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
  const sponsored = useSponsoredSchools();
  const school = sponsored[0];
  const list = school ? studentsBySchool(school.id) : [];

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Teacher and student attendance for sponsored schools. No editing rights."
        readOnly
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>Teacher attendance</SectionTitle>
          <DataTable headers={['Teacher', 'School', 'Status', 'Hours']}>
            <tr>
              <Td className="font-medium text-slate-900">Priya Sharma</Td>
              <Td>{schoolById('sch_01')?.name}</Td>
              <Td>
                <Badge tone="success">Present</Badge>
              </Td>
              <Td>7h 35m</Td>
            </tr>
            <tr>
              <Td className="font-medium text-slate-900">Ravi Kumar</Td>
              <Td>{schoolById('sch_02')?.name}</Td>
              <Td>
                <Badge tone="success">Present</Badge>
              </Td>
              <Td>In progress</Td>
            </tr>
          </DataTable>
        </Card>
        <Card>
          <SectionTitle>Student attendance · {school?.name ?? 'School'}</SectionTitle>
          <DataTable headers={['Student', 'Class', 'Status']}>
            {list.map((student) => (
              <tr key={student.id}>
                <Td className="font-medium text-slate-900">{student.name}</Td>
                <Td>
                  {student.classGrade}-{student.section}
                </Td>
                <Td>
                  <Badge tone="success">Present</Badge>
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
  const sponsored = useSponsoredSchools();

  return (
    <div>
      <PageHeader
        title="Syllabus Progress"
        description="Class-wise progress, topics completed and remaining — view only."
        readOnly
      />
      <Card>
        <DataTable headers={['School', 'Class', 'Completed topics', 'Remaining', 'Progress']}>
          {sponsored.map((school) => (
            <tr key={school.id}>
              <Td className="font-medium text-slate-900">{school.name}</Td>
              <Td>6–10</Td>
              <Td>{Math.round(school.syllabusCompletion / 5)}</Td>
              <Td>{Math.round((100 - school.syllabusCompletion) / 5)}</Td>
              <Td>
                <div className="min-w-[8rem] space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800">{school.syllabusCompletion}%</span>
                    <Badge tone={progressBadgeTone(school.syllabusCompletion)}>
                      {progressLabel(school.syllabusCompletion)}
                    </Badge>
                  </div>
                  <ProgressBar value={school.syllabusCompletion} />
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
  const sponsored = useSponsoredSchools();
  const ids = new Set(sponsored.map((s) => s.id));
  const list = events.filter((e) => ids.has(e.schoolId));

  return (
    <div>
      <PageHeader
        title="Event Gallery"
        description="School events, student activities and photos — view only."
        readOnly
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {list.map((event) => (
          <Card key={event.id}>
            <div className="mb-3 h-36 rounded-lg bg-gradient-to-br from-sky-100 via-white to-orange-50" />
            <div className="mb-1 flex items-center gap-2">
              <Badge tone="info">View only</Badge>
              <span className="text-xs text-slate-400">{event.date}</span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
              {schoolById(event.schoolId)?.name}
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
  const sponsored = useSponsoredSchools();
  const ids = new Set(sponsored.map((s) => s.id));
  const list = assets.filter((a) => ids.has(a.schoolId));

  const types = ['Computer', 'CPU', 'Keyboard', 'Mouse', 'Monitor', 'UPS'] as const;
  const counts = Object.fromEntries(
    types.map((type) => [
      type,
      list.filter((a) => a.type === type).reduce((sum, a) => sum + a.quantity, 0),
    ]),
  ) as Record<(typeof types)[number], number>;

  return (
    <div>
      <PageHeader
        title="Asset Summary"
        description="Computers, CPU, keyboard, mouse, monitor and UPS for sponsored schools."
        readOnly
      />
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
              <Td>{schoolById(asset.schoolId)?.name}</Td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </div>
  );
}

export function SponsorTicketsPage() {
  const sponsored = useSponsoredSchools();
  const ids = new Set(sponsored.map((s) => s.id));
  const list = tickets.filter((t) => ids.has(t.schoolId));
  const open = list.filter(
    (t) => t.status === 'Open' || t.status === 'Assigned' || t.status === 'In Progress',
  );
  const resolved = list.filter((t) => t.status === 'Resolved' || t.status === 'Closed');

  return (
    <div>
      <PageHeader
        title="Support Tickets"
        description="Open and resolved tickets for sponsored schools — read-only."
        readOnly
      />
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
              <Td>{schoolById(ticket.schoolId)?.name}</Td>
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
