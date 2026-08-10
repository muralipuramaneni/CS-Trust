import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Button, Input, FormField } from '../../../components/ui';
import {
  Badge,
  Card,
  PageHeader,
  SectionTitle,
  StatCard,
} from '../../../components/ui/Surface';
import { DataTable, Td } from '../../../components/ui/DataTable';
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

function apiErrorMessage(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
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
  const { schoolId } = useTeacherContext();
  const [school, setSchool] = useState<School | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tasks: Promise<unknown>[] = [listTickets({ schoolId }), listLeaves()];
        if (schoolId) tasks.unshift(getSchool(schoolId));
        const results = await Promise.all(tasks);
        if (cancelled) return;
        let offset = 0;
        if (schoolId) {
          setSchool(results[0] as School);
          offset = 1;
        }
        setTickets(results[offset] as SupportTicket[]);
        setLeaves(results[offset + 1] as LeaveRequest[]);
      } catch (e) {
        if (!cancelled) setLoadError(apiErrorMessage(e, 'Failed to load dashboard'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  const pendingLeaves = leaves.filter((l) => l.status === 'Pending').length;
  const openTickets = tickets.filter(
    (t) => t.status === 'Open' || t.status === 'Assigned' || t.status === 'In Progress',
  ).length;

  if (loading) {
    return <div className="py-16 text-center text-sm text-slate-500">Loading dashboard…</div>;
  }

  return (
    <div>
      <PageHeader
        title="Teacher Dashboard"
        description={`${school?.name ?? 'Assigned school'} · Today’s classes, attendance, tasks and leave.`}
      />
      {loadError ? <p className="mb-4 text-sm text-rose-600">{loadError}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Today's Classes" value="—" hint="Check teaching log" />
        <StatCard label="Today's Attendance" value="—" hint="Mark class attendance" />
        <StatCard label="Pending Tasks" value="—" hint="Log + syllabus update" />
        <StatCard
          label="Syllabus"
          value={school ? `${school.syllabusCompletion}%` : '—'}
          hint="School average"
        />
        <StatCard
          label="Leave Status"
          value={`${pendingLeaves} pending`}
          hint="Awaiting admin"
        />
        <StatCard label="Open Tickets" value={openTickets} hint="School support queue" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>Quick links</SectionTitle>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>Clock in with GPS before first period</li>
            <li>Mark student attendance for your class</li>
            <li>Submit daily teaching log after last class</li>
            <li>Update syllabus completion %</li>
          </ul>
        </Card>
        <Card>
          <SectionTitle>School snapshot</SectionTitle>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-slate-500">Students</dt>
              <dd className="font-semibold text-slate-900">{school?.studentCount ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Computers</dt>
              <dd className="font-semibold text-slate-900">{school?.computerCount ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Village</dt>
              <dd className="font-semibold text-slate-900">{school?.village ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Syllabus</dt>
              <dd className="font-semibold text-slate-900">
                {school?.syllabusCompletion ?? '—'}%
              </dd>
            </div>
          </dl>
        </Card>
      </div>
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
    <div>
      <PageHeader
        title="Web Clock In / Clock Out"
        description="Captures time, GPS location and device info for administrator verification."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>Current status</SectionTitle>
          <p className="mb-4">
            <Badge tone={status === 'in' ? 'success' : 'neutral'}>
              {status === 'in' ? 'Clocked in' : 'Clocked out'}
            </Badge>
          </p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">School</dt>
              <dd className="font-medium text-slate-900">{schoolName || schoolId || '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Last clock-in</dt>
              <dd className="font-medium text-slate-900">{clockInAt ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">GPS location</dt>
              <dd className="max-w-[60%] text-right font-medium text-slate-900">
                {location ?? '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Device</dt>
              <dd className="max-w-[60%] break-all text-right text-xs text-slate-600">
                {device ?? '—'}
              </dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              disabled={busy || profileLoading || status === 'in' || !teacher || !schoolId}
              onClick={() => void handleClock('in')}
            >
              Clock In
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy || status === 'out' || !todayRow}
              onClick={() => void handleClock('out')}
            >
              Clock Out
            </Button>
          </div>
          {!profileLoading && (!teacher || !schoolId) ? (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              No teacher profile / school assignment found for {user?.email ?? 'this account'}.
              Ask an admin to create your teacher record and assign a school.
            </p>
          ) : null}
          {message ? (
            <p
              className={`mt-4 rounded-lg px-3 py-2 text-sm ${
                messageTone === 'error'
                  ? 'bg-rose-50 text-rose-800'
                  : messageTone === 'warn'
                    ? 'bg-amber-50 text-amber-900'
                    : 'bg-emerald-50 text-emerald-800'
              }`}
            >
              {message}
            </p>
          ) : null}
        </Card>
        <Card>
          <SectionTitle>Why location is required</SectionTitle>
          <p className="text-sm leading-relaxed text-slate-600">
            Administrators verify that teachers clock in from the assigned school campus. When the
            browser asks for location, choose <strong>Allow</strong>.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>Use Chrome/Edge on localhost or HTTPS</li>
            <li>Click the lock/tune icon in the address bar → Site settings → Location → Allow</li>
            <li>You can still clock in if GPS is blocked; admins will see that GPS was not granted</li>
          </ul>
          {!gpsOk && location ? (
            <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
              Current GPS status: {location}
            </p>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

export function TeacherStudentsPage() {
  const { schoolId } = useTeacherContext();
  const [list, setList] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  return (
    <div>
      <PageHeader
        title="Student Management"
        description="Add, edit, transfer or mark students inactive. Students do not have login accounts."
        actions={<Button type="button" variant="primary">Add Student</Button>}
      />
      {loadError ? <p className="mb-4 text-sm text-rose-600">{loadError}</p> : null}
      <Card>
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading students…</p>
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
                <Td className="font-medium text-slate-900">{student.name}</Td>
                <Td>{student.gender}</Td>
                <Td>{student.classGrade}</Td>
                <Td>{student.section}</Td>
                <Td>{student.parentName}</Td>
                <Td>{student.parentPhone}</Td>
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
  const [step, setStep] = useState(1);
  const [classGrade, setClassGrade] = useState('7');
  const [section, setSection] = useState('A');
  const [marks, setMarks] = useState<Record<string, 'P' | 'A'>>({});
  const [submitted, setSubmitted] = useState(false);
  const [existingSessionId, setExistingSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const today = localDateKey();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listStudents(schoolId ? { schoolId } : undefined);
        if (!cancelled) setList(data.filter((s) => s.status === 'active'));
      } catch (e) {
        if (!cancelled) setError(apiErrorMessage(e, 'Failed to load students'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  const classStudents = list.filter(
    (s) =>
      s.classGrade === classGrade &&
      s.section.trim().toUpperCase() === section.trim().toUpperCase(),
  );

  async function loadExistingSession(nextClass = classGrade, nextSection = section) {
    if (!schoolId) return false;
    setChecking(true);
    setError(null);
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
        setStep(3);
        return true;
      }
      setMarks({});
      setExistingSessionId(null);
      setSubmitted(false);
      return false;
    } catch (e) {
      setError(apiErrorMessage(e, 'Failed to check existing attendance'));
      return false;
    } finally {
      setChecking(false);
    }
  }

  async function continueToMarking() {
    const already = await loadExistingSession(classGrade, section);
    if (!already) setStep(2);
  }

  async function submitAttendance() {
    if (!schoolId || !teacher) {
      setError('Missing school or teacher profile.');
      return;
    }
    if (Object.keys(marks).length === 0) {
      setError('Mark at least one student present or absent.');
      return;
    }
    const unmarked = classStudents.filter((s) => !marks[s.id]);
    if (unmarked.length > 0) {
      setError(`Mark attendance for all students (${unmarked.length} remaining).`);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const created = await createStudentAttendanceSession({
        schoolId,
        classGrade,
        section,
        date: today,
        teacherId: teacher.id,
        teacherName: teacher.name,
        marks: Object.entries(marks).map(([studentId, status]) => ({ studentId, status })),
      });
      setExistingSessionId(created.id);
      setSubmitted(true);
      setStep(3);
    } catch (e) {
      setError(apiErrorMessage(e, 'Failed to submit attendance'));
      await loadExistingSession(classGrade, section);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Student Attendance"
        description={`Select class & section, mark present / absent, then submit once for ${today}.`}
      />
      {error ? <p className="mb-4 text-sm text-rose-600">{error}</p> : null}

      <div className="mb-4 flex gap-2 text-xs font-semibold">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={
              step === n
                ? 'rounded-lg bg-brand-600 px-3 py-1 text-white'
                : 'rounded-lg bg-slate-100 px-3 py-1 text-slate-600'
            }
          >
            Step {n}
          </span>
        ))}
      </div>

      {step === 1 ? (
        <Card className="max-w-md space-y-4">
          <SectionTitle>Select class & section</SectionTitle>
          <select
            className="field-control w-full"
            value={classGrade}
            onChange={(e) => {
              setClassGrade(e.target.value);
              setSubmitted(false);
              setExistingSessionId(null);
              setMarks({});
            }}
          >
            <option value="6">Class 6</option>
            <option value="7">Class 7</option>
            <option value="8">Class 8</option>
            <option value="9">Class 9</option>
            <option value="10">Class 10</option>
          </select>
          <select
            className="field-control w-full"
            value={section}
            onChange={(e) => {
              setSection(e.target.value);
              setSubmitted(false);
              setExistingSessionId(null);
              setMarks({});
            }}
          >
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
          </select>
          <Button
            type="button"
            variant="primary"
            disabled={checking || !schoolId}
            onClick={() => void continueToMarking()}
          >
            {checking ? 'Checking…' : 'Continue'}
          </Button>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <SectionTitle>
            Mark present / absent · Class {classGrade}-{section}
          </SectionTitle>
          {classStudents.length === 0 ? (
            <p className="py-6 text-sm text-slate-500">No active students in this class/section.</p>
          ) : (
            <DataTable headers={['Student', 'Class', 'Section', 'Attendance']}>
              {classStudents.map((student) => (
                <tr key={student.id}>
                  <Td className="font-medium text-slate-900">{student.name}</Td>
                  <Td>{student.classGrade}</Td>
                  <Td>{student.section}</Td>
                  <Td>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={
                          marks[student.id] === 'P'
                            ? 'rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white'
                            : 'rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600'
                        }
                        onClick={() => setMarks((m) => ({ ...m, [student.id]: 'P' }))}
                      >
                        Present
                      </button>
                      <button
                        type="button"
                        className={
                          marks[student.id] === 'A'
                            ? 'rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white'
                            : 'rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600'
                        }
                        onClick={() => setMarks((m) => ({ ...m, [student.id]: 'A' }))}
                      >
                        Absent
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </DataTable>
          )}
          <div className="mt-4 flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={busy || classStudents.length === 0}
              onClick={() => setStep(3)}
            >
              Review & submit
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card className="max-w-lg space-y-4">
          <SectionTitle>
            {submitted ? 'Attendance already submitted' : 'Review & submit'}
          </SectionTitle>
          <p className="text-sm text-slate-600">
            Class {classGrade}-{section} · {today}
            {existingSessionId ? ` · Session ${existingSessionId}` : ''}
          </p>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-slate-500">Present</dt>
              <dd className="font-semibold text-emerald-700">
                {Object.values(marks).filter((m) => m === 'P').length}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Absent</dt>
              <dd className="font-semibold text-rose-700">
                {Object.values(marks).filter((m) => m === 'A').length}
              </dd>
            </div>
          </dl>
          {submitted ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Attendance for this class/section today is locked. Contact an admin if a correction is
              needed.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={busy}
                onClick={() => void submitAttendance()}
              >
                {busy ? 'Submitting…' : 'Submit attendance'}
              </Button>
            </div>
          )}
          {submitted ? (
            <Button type="button" variant="secondary" onClick={() => setStep(1)}>
              Choose another class
            </Button>
          ) : null}
        </Card>
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
              <p className="mt-8 text-center text-sm text-slate-500">No open requests.</p>
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
                <tr>
                  <Td className="py-10 text-center text-slate-500" colSpan={6}>
                    No leave history yet.
                  </Td>
                </tr>
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
