import { useMemo, useState, type FormEvent } from 'react';
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
  assets,
  leaves as seedLeaves,
  schoolById,
  studentsBySchool,
  teachers,
  tickets,
} from '../../../data/mockData';
import type { LeaveRequest } from '../../../types/domain';
import { useAuth } from '../../auth/hooks/useAuth';
import {
  LEAVE_TYPES,
  computeLeaveStats,
  leaveDayCount,
  leaveStatusTone,
} from '../../../utils/leave';

const TEACHER_SCHOOL = 'sch_01';

function useTeacherSchool() {
  const { user } = useAuth();
  return user?.schoolId ?? TEACHER_SCHOOL;
}

function resolveTeacherId(userEmail?: string, userName?: string) {
  const byEmail = teachers.find(
    (t) => userEmail && t.email.toLowerCase() === userEmail.toLowerCase(),
  );
  if (byEmail) return byEmail.id;
  const byName = teachers.find(
    (t) => userName && t.name.toLowerCase() === userName.toLowerCase(),
  );
  if (byName) return byName.id;
  return teachers[0]?.id ?? 'tch_01';
}

export function TeacherDashboardPage() {
  const schoolId = useTeacherSchool();
  const school = schoolById(schoolId);

  return (
    <div>
      <PageHeader
        title="Teacher Dashboard"
        description={`${school?.name ?? 'Assigned school'} · Today’s classes, attendance, tasks and leave.`}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Today's Classes" value="3" hint="6-A, 7-A, 8-B" />
        <StatCard label="Today's Attendance" value="92%" hint="28 / 30 present" />
        <StatCard label="Pending Tasks" value="2" hint="Log + syllabus update" />
        <StatCard label="Today's Syllabus" value="MS Paint" hint="Class 7 · 40 min" />
        <StatCard label="Leave Status" value="1 pending" hint="8–9 Aug casual" />
        <StatCard label="Open Tickets" value="1" hint="Hardware · lab row 2" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>Quick links</SectionTitle>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>Clock in with GPS before first period</li>
            <li>Mark student attendance for Class 7-A</li>
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
  const [status, setStatus] = useState<'out' | 'in'>('out');
  const [clockInAt, setClockInAt] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [device, setDevice] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function captureLocation(): Promise<string> {
    if (!navigator.geolocation) {
      return 'GPS unavailable — browser blocked location';
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          resolve(`${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`);
        },
        () => resolve('Location permission denied (demo mode)'),
        { enableHighAccuracy: true, timeout: 8000 },
      );
    });
  }

  async function handleClock(action: 'in' | 'out') {
    setBusy(true);
    setMessage(null);
    const loc = await captureLocation();
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const ua = navigator.userAgent.slice(0, 48) + '…';

    if (action === 'in') {
      setStatus('in');
      setClockInAt(now);
      setLocation(loc);
      setDevice(ua);
      setMessage(`Clocked in at ${now}. Admins can verify this location.`);
    } else {
      setStatus('out');
      setMessage(`Clocked out at ${now}. Working hours calculated from ${clockInAt ?? '—'}.`);
      setClockInAt(null);
    }
    setBusy(false);
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
              disabled={busy || status === 'in'}
              onClick={() => void handleClock('in')}
            >
              Clock In
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy || status === 'out'}
              onClick={() => void handleClock('out')}
            >
              Clock Out
            </Button>
          </div>
          {message ? (
            <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {message}
            </p>
          ) : null}
        </Card>
        <Card>
          <SectionTitle>Why location is required</SectionTitle>
          <p className="text-sm leading-relaxed text-slate-600">
            Administrators verify that teachers clock in from the assigned school campus. Grant
            browser location when prompted. Data is stored for attendance history only (frontend
            demo for Phase 1).
          </p>
        </Card>
      </div>
    </div>
  );
}

export function TeacherStudentsPage() {
  const schoolId = useTeacherSchool();
  const list = studentsBySchool(schoolId);

  return (
    <div>
      <PageHeader
        title="Student Management"
        description="Add, edit, transfer or mark students inactive. Students do not have login accounts."
        actions={<Button type="button" variant="primary">Add Student</Button>}
      />
      <Card>
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
      </Card>
    </div>
  );
}

export function TeacherAdmissionPage() {
  const [done, setDone] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setDone(true);
  }

  return (
    <div>
      <PageHeader
        title="New Student Admission"
        description="Register a newly joined student for your assigned school."
      />
      <Card className="max-w-xl">
        <form className="space-y-4" onSubmit={handleSubmit}>
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
          <Button type="submit" variant="primary">Register Student</Button>
          {done ? (
            <p className="text-sm text-emerald-700">
              Student registered (demo — not persisted to a backend).
            </p>
          ) : null}
        </form>
      </Card>
    </div>
  );
}

export function TeacherAttendancePage() {
  const schoolId = useTeacherSchool();
  const list = studentsBySchool(schoolId);
  const [step, setStep] = useState(1);
  const [marks, setMarks] = useState<Record<string, 'P' | 'A'>>({});
  const [submitted, setSubmitted] = useState(false);

  return (
    <div>
      <PageHeader
        title="Student Attendance"
        description="Select class & section, mark present / absent, then submit."
      />

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
          <select className="field-control w-full" defaultValue="7">
            <option value="7">Class 7</option>
            <option value="8">Class 8</option>
          </select>
          <select className="field-control w-full" defaultValue="A">
            <option value="A">Section A</option>
            <option value="B">Section B</option>
          </select>
          <Button type="button" variant="primary" onClick={() => setStep(2)}>
            Continue
          </Button>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <SectionTitle>Mark present / absent</SectionTitle>
          <DataTable headers={['Student', 'Class', 'Section', 'Attendance']}>
            {list.map((student) => (
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
          <div className="mt-4 flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="button" variant="primary" onClick={() => setStep(3)}>
              Review & submit
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card className="max-w-md">
          <SectionTitle>Submit attendance</SectionTitle>
          <p className="mb-4 text-sm text-slate-600">
            {Object.keys(marks).length} students marked for Class 7-A.
          </p>
          {!submitted ? (
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setSubmitted(true);
                }}
              >
                Submit Attendance
              </Button>
            </div>
          ) : (
            <p className="text-sm font-medium text-emerald-700">
              Attendance submitted successfully (demo).
            </p>
          )}
        </Card>
      ) : null}
    </div>
  );
}

export function TeacherTeachingLogPage() {
  const [saved, setSaved] = useState(false);

  return (
    <div>
      <PageHeader
        title="Daily Teaching Log"
        description="Record class, subject, topic, duration and remarks."
      />
      <Card className="max-w-xl">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSaved(true);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="log-class" label="Class" required>
              <Input id="log-class" required placeholder="7" />
            </FormField>
            <FormField id="log-section" label="Section" required>
              <Input id="log-section" required placeholder="A" />
            </FormField>
          </div>
          <FormField id="log-subject" label="Subject" required>
            <Input id="log-subject" required placeholder="Computer basics" />
          </FormField>
          <FormField id="log-topic" label="Today's topic" required>
            <Input id="log-topic" required placeholder="MS Paint tools" />
          </FormField>
          <FormField id="log-duration" label="Duration (minutes)" required>
            <Input id="log-duration" type="number" required placeholder="40" />
          </FormField>
          <FormField id="log-remarks" label="Remarks">
            <textarea
              id="log-remarks"
              className="field-control min-h-24 w-full"
              placeholder="Optional notes"
            />
          </FormField>
          <Button type="submit" variant="primary">Submit Log</Button>
          {saved ? (
            <p className="text-sm text-emerald-700">Teaching log saved (demo).</p>
          ) : null}
        </form>
      </Card>
    </div>
  );
}

export function TeacherSyllabusPage() {
  const [saved, setSaved] = useState(false);

  return (
    <div>
      <PageHeader
        title="Syllabus Progress"
        description="Update chapter, topic and completion percentage for your classes."
      />
      <Card className="max-w-xl">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSaved(true);
          }}
        >
          <FormField id="syl-chapter" label="Chapter" required>
            <Input id="syl-chapter" required placeholder="Unit 3 · Graphics" />
          </FormField>
          <FormField id="syl-topic" label="Topic" required>
            <Input id="syl-topic" required placeholder="Paint brush tools" />
          </FormField>
          <FormField id="syl-pct" label="Completion %" required>
            <Input id="syl-pct" type="number" min={0} max={100} required placeholder="72" />
          </FormField>
          <Button type="submit" variant="primary">Update Progress</Button>
          {saved ? (
            <p className="text-sm text-emerald-700">Syllabus progress updated (demo).</p>
          ) : null}
        </form>
      </Card>
    </div>
  );
}

export function TeacherLeavePage() {
  const { user } = useAuth();
  const schoolId = useTeacherSchool();
  const teacherId = resolveTeacherId(user?.email, user?.name);
  const teacher = teachers.find((t) => t.id === teacherId);

  const [history, setHistory] = useState<LeaveRequest[]>(() =>
    seedLeaves
      .filter((l) => l.teacherId === teacherId)
      .map((l) => ({ ...l }))
      .sort((a, b) => b.fromDate.localeCompare(a.fromDate)),
  );
  const [panel, setPanel] = useState<'request' | 'balance' | 'history'>('request');
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    type: 'Casual',
    fromDate: '',
    toDate: '',
    reason: '',
  });

  const stats = useMemo(() => computeLeaveStats(history), [history]);
  const myRequests = history.filter((l) => l.status === 'Pending');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.fromDate || !form.toDate || !form.reason.trim()) return;

    const next: LeaveRequest = {
      id: `lv_${Date.now()}`,
      teacherId,
      teacherName: teacher?.name ?? user?.name ?? 'Teacher',
      type: form.type,
      fromDate: form.fromDate,
      toDate: form.toDate,
      reason: form.reason.trim(),
      status: 'Pending',
    };
    setHistory((prev) => [next, ...prev]);
    setForm({ type: 'Casual', fromDate: '', toDate: '', reason: '' });
    setSent(true);
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
        description={`${teacher?.name ?? 'Teacher'} · ${schoolById(schoolId)?.name ?? 'School'} · track balance, requests and history`}
      />

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
            <form className="mt-3 space-y-4" noValidate onSubmit={handleSubmit}>
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
  const schoolId = useTeacherSchool();
  const schoolAssets = assets.filter((a) => a.schoolId === schoolId);

  return (
    <div>
      <PageHeader
        title="Asset Verification"
        description="View assets assigned to your school. Report issues via support tickets."
      />
      <Card>
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
      </Card>
    </div>
  );
}

export function TeacherTicketsPage() {
  const schoolId = useTeacherSchool();
  const mine = tickets.filter((t) => t.schoolId === schoolId);
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);

  return (
    <div>
      <PageHeader
        title="Raise Support Ticket"
        description="Report computer, CPU, keyboard, mouse, software or internet issues with photo and description."
      />

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
              <select className="field-control w-full">
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
                defaultValue=""
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
                  <Button type="button" variant="primary" onClick={() => setDone(true)}>
                    Submit Ticket
                  </Button>
                </div>
              ) : (
                <p className="text-sm font-medium text-emerald-700">Ticket submitted (demo).</p>
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
  const [saved, setSaved] = useState(false);

  return (
    <div>
      <PageHeader
        title="Event Upload"
        description="Upload images with event name and description for your school."
      />
      <Card className="max-w-xl">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSaved(true);
          }}
        >
          <FormField id="ev-name" label="Event name" required>
            <Input id="ev-name" required placeholder="Independence Day Tech Showcase" />
          </FormField>
          <FormField id="ev-desc" label="Description" required>
            <textarea id="ev-desc" className="field-control min-h-24 w-full" required />
          </FormField>
          <FormField id="ev-images" label="Images" required>
            <input id="ev-images" type="file" accept="image/*" multiple className="field-control w-full" />
          </FormField>
          <Button type="submit" variant="primary">Upload Event</Button>
          {saved ? (
            <p className="text-sm text-emerald-700">Event uploaded (demo).</p>
          ) : null}
        </form>
      </Card>
    </div>
  );
}
