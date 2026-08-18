import type { AuthUser, SignupPayload } from '../types/auth';
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
} from '../types/domain';
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  clearAccessToken,
  setAccessToken,
  withQuery,
} from './client';

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface TeacherAttendanceRow {
  id: string;
  teacherId: string;
  teacherName: string;
  schoolId: string;
  schoolName: string;
  date: string;
  clockIn: string;
  inLocation: string;
  clockOut: string;
  outLocation: string;
  hours: string;
  device?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface SyllabusRow {
  id: string;
  schoolId: string;
  schoolName: string;
  teacherId?: string | null;
  teacherName: string;
  classLabel: string;
  subject: string;
  topic: string;
  completedPct: number;
  topicsDone: number;
  topicsTotal: number;
}

export interface TeachingLog {
  id: string;
  teacherId: string;
  schoolId: string;
  classGrade: string;
  section: string;
  period?: number;
  subject: string;
  topic: string;
  durationMinutes: number;
  remarks: string;
  date: string;
  createdAt?: string;
}

export interface ClassAttendanceSummary {
  id: string;
  school: string;
  classLabel: string;
  teacher: string;
  enrolled: number;
  present: number;
  absent: number;
  date?: string;
  schoolId?: string;
}

export interface DashboardSummary {
  schoolCount: number;
  activeSchoolCount: number;
  teacherCount: number;
  studentCount: number;
  sponsorCount: number;
  openTicketCount: number;
  pendingLeaveCount: number;
  avgSyllabusCompletion: number;
  recentActivities: ActivityItem[];
}

/* ── Auth ─────────────────────────────────────────────── */

export async function loginApi(
  email: string,
  password: string,
  rememberMe = true,
): Promise<AuthUser> {
  const result = await apiPost<TokenResponse>('/auth/login', { email, password });
  setAccessToken(result.access_token, rememberMe);
  return result.user;
}

export async function signupApi(payload: SignupPayload): Promise<AuthUser> {
  const result = await apiPost<TokenResponse>('/auth/signup', payload);
  setAccessToken(result.access_token, true);
  return result.user;
}

export async function fetchMe(): Promise<AuthUser> {
  return apiGet<AuthUser>('/auth/me');
}

export async function logoutApi(): Promise<void> {
  try {
    await apiPost('/auth/logout');
  } catch {
    // ignore network errors on logout
  } finally {
    clearAccessToken();
  }
}

export async function requestPasswordResetOtpApi(_phone: string) {
  throw new Error('Password reset is handled by an administrator.');
}

export async function verifyPasswordResetOtpApi(_phone: string, _otp: string) {
  throw new Error('Password reset is handled by an administrator.');
}

export async function confirmPasswordResetApi(_phone: string, _password: string) {
  throw new Error('Password reset is handled by an administrator.');
}

export async function changePasswordApi(body: {
  currentPassword?: string;
  newPassword: string;
}) {
  return apiPost<{ message: string }>('/auth/change-password', body);
}

export interface GoogleAuthConfig {
  clientId: string;
  enabled: boolean;
}

export async function fetchGoogleAuthConfig(): Promise<GoogleAuthConfig> {
  return apiGet<GoogleAuthConfig>('/auth/google/config');
}

export async function loginWithGoogleApi(
  payload: { idToken?: string; accessToken?: string; role?: 'admin' | 'teacher' | 'sponsor' },
  rememberMe = true,
): Promise<AuthUser> {
  const result = await apiPost<TokenResponse>('/auth/google', payload);
  setAccessToken(result.access_token, rememberMe);
  return result.user;
}

/* ── Schools ──────────────────────────────────────────── */

export const listSchools = (params?: { status?: string }) =>
  apiGet<School[]>(withQuery('/schools', params));

export const getSchool = (id: string) => apiGet<School>(`/schools/${id}`);

export const createSchool = (body: Partial<School>) =>
  apiPost<School>('/schools', body);

export const updateSchool = (id: string, body: Partial<School>) =>
  apiPatch<School>(`/schools/${id}`, body);

export const deleteSchool = (id: string) => apiDelete(`/schools/${id}`);

/* ── Teachers ─────────────────────────────────────────── */

export const listTeachers = (params?: { schoolId?: string }) =>
  apiGet<TeacherProfile[]>(withQuery('/teachers', params));

export const getMyTeacherProfile = () => apiGet<TeacherProfile>('/teachers/me');

export const getTeacher = (id: string) => apiGet<TeacherProfile>(`/teachers/${id}`);

export const createTeacher = (body: Partial<TeacherProfile> & { password?: string }) =>
  apiPost<{ teacher: TeacherProfile; tempPassword: string }>('/teachers', body);

export const updateTeacher = (id: string, body: Partial<TeacherProfile>) =>
  apiPatch<TeacherProfile>(`/teachers/${id}`, body);

export const deleteTeacher = (id: string) => apiDelete(`/teachers/${id}`);

export const resetTeacherPassword = (id: string) =>
  apiPost<{ tempPassword: string }>(`/teachers/${id}/reset-password`);

/* ── Sponsors ─────────────────────────────────────────── */

export const listSponsors = () => apiGet<SponsorProfile[]>('/sponsors');

export const createSponsor = (
  body: Partial<SponsorProfile> & { password?: string },
) =>
  apiPost<{ sponsor: SponsorProfile; tempPassword?: string }>('/sponsors', body);

export const updateSponsor = (id: string, body: Partial<SponsorProfile>) =>
  apiPatch<SponsorProfile>(`/sponsors/${id}`, body);

export const deleteSponsor = (id: string) => apiDelete(`/sponsors/${id}`);

export const resetSponsorPassword = (id: string) =>
  apiPost<{ tempPassword: string }>(`/sponsors/${id}/reset-password`);

/* ── Students ─────────────────────────────────────────── */

export const listStudents = (params?: { schoolId?: string }) =>
  apiGet<Student[]>(withQuery('/students', params));

export const createStudent = (body: Partial<Student>) =>
  apiPost<Student>('/students', body);

export const updateStudent = (id: string, body: Partial<Student>) =>
  apiPatch<Student>(`/students/${id}`, body);

export const deleteStudent = (id: string) => apiDelete(`/students/${id}`);

/* ── Attendance ───────────────────────────────────────── */

export const listTeacherAttendance = (params?: {
  date?: string;
  schoolId?: string;
  teacherId?: string;
}) => apiGet<TeacherAttendanceRow[]>(withQuery('/attendance/teachers', params));

export const createTeacherAttendance = (body: Partial<TeacherAttendanceRow>) =>
  apiPost<TeacherAttendanceRow>('/attendance/teachers', body);

export const updateTeacherAttendance = (
  id: string,
  body: Partial<TeacherAttendanceRow>,
) => apiPatch<TeacherAttendanceRow>(`/attendance/teachers/${id}`, body);

export const deleteTeacherAttendance = (id: string) =>
  apiDelete(`/attendance/teachers/${id}`);

export const listStudentAttendanceSessions = (params?: {
  date?: string;
  schoolId?: string;
  classGrade?: string;
  section?: string;
}) =>
  apiGet<
    Array<{
      id: string;
      schoolId: string;
      classGrade: string;
      section: string;
      date: string;
      teacherId: string;
      teacherName: string;
      marks: Array<{ id?: string; studentId: string; status: 'P' | 'A' }>;
    }>
  >(withQuery('/attendance/students/sessions', params));

export const createStudentAttendanceSession = (body: {
  schoolId: string;
  classGrade: string;
  section: string;
  date: string;
  teacherId: string;
  teacherName: string;
  marks: Array<{ studentId: string; status: 'P' | 'A' }>;
}) =>
  apiPost<{
    id: string;
    schoolId: string;
    classGrade: string;
    section: string;
    date: string;
    teacherId: string;
    teacherName: string;
    marks: Array<{ id?: string; studentId: string; status: 'P' | 'A' }>;
  }>('/attendance/students/sessions', body);

/* ── Leaves ───────────────────────────────────────────── */

export const listLeaves = (params?: { teacherId?: string; status?: string }) =>
  apiGet<LeaveRequest[]>(withQuery('/leaves', params));

export const createLeave = (body: Partial<LeaveRequest>) =>
  apiPost<LeaveRequest>('/leaves', body);

export const updateLeave = (id: string, body: Partial<LeaveRequest>) =>
  apiPatch<LeaveRequest>(`/leaves/${id}`, body);

export const deleteLeave = (id: string) => apiDelete(`/leaves/${id}`);

/* ── Syllabus / teaching logs / assets / tickets / events */

export const listSyllabus = (params?: { schoolId?: string }) =>
  apiGet<SyllabusRow[]>(withQuery('/syllabus', params));

export const createSyllabus = (body: Partial<SyllabusRow>) =>
  apiPost<SyllabusRow>('/syllabus', body);

export const updateSyllabus = (id: string, body: Partial<SyllabusRow>) =>
  apiPatch<SyllabusRow>(`/syllabus/${id}`, body);

export const deleteSyllabus = (id: string) => apiDelete(`/syllabus/${id}`);

export const listTeachingLogs = (params?: { teacherId?: string; date?: string }) =>
  apiGet<TeachingLog[]>(withQuery('/teaching-logs', params));

export const createTeachingLog = (body: Partial<TeachingLog>) =>
  apiPost<TeachingLog>('/teaching-logs', body);

export const updateTeachingLog = (id: string, body: Partial<TeachingLog>) =>
  apiPatch<TeachingLog>(`/teaching-logs/${id}`, body);

export const listAssets = (params?: { schoolId?: string }) =>
  apiGet<Asset[]>(withQuery('/assets', params));

export const createAsset = (body: Partial<Asset>) => apiPost<Asset>('/assets', body);

export const updateAsset = (id: string, body: Partial<Asset>) =>
  apiPatch<Asset>(`/assets/${id}`, body);

export const deleteAsset = (id: string) => apiDelete(`/assets/${id}`);

export const listTickets = (params?: { schoolId?: string; status?: string }) =>
  apiGet<SupportTicket[]>(withQuery('/tickets', params));

export const createTicket = (body: Partial<SupportTicket>) =>
  apiPost<SupportTicket>('/tickets', body);

export const updateTicket = (id: string, body: Partial<SupportTicket>) =>
  apiPatch<SupportTicket>(`/tickets/${id}`, body);

export const deleteTicket = (id: string) => apiDelete(`/tickets/${id}`);

export const listEvents = (params?: { schoolId?: string }) =>
  apiGet<EventItem[]>(withQuery('/events', params));

export const createEvent = (body: Partial<EventItem>) =>
  apiPost<EventItem>('/events', body);

export const updateEvent = (id: string, body: Partial<EventItem>) =>
  apiPatch<EventItem>(`/events/${id}`, body);

export const deleteEvent = (id: string) => apiDelete(`/events/${id}`);

export const listActivities = (limit = 20) =>
  apiGet<ActivityItem[]>(withQuery('/activities', { limit }));

export const getDashboardSummary = () =>
  apiGet<DashboardSummary>('/dashboard/summary');
