import { Route, Routes } from 'react-router-dom';
import { LoginPage } from './features/auth/pages/LoginPage';
import { SignupPage } from './features/auth/pages/SignupPage';
import { ForgotPasswordPage } from './features/auth/pages/ForgotPasswordPage';
import { RoleRoute } from './routes/RoleRoute';
import { HomeRedirect } from './routes/ProtectedRoute';
import {
  AdminAssetsPage,
  AdminDashboardPage,
  AdminEventsPage,
  AdminLeavesPage,
  AdminReportsPage,
  AdminSchoolsPage,
  AdminSponsorsPage,
  AdminStudentAttendancePage,
  AdminSyllabusPage,
  AdminTeacherAttendancePage,
  AdminTeachersPage,
  AdminTicketsPage,
} from './features/admin/pages/AdminPages';
import {
  TeacherAdmissionPage,
  TeacherAssetsPage,
  TeacherAttendancePage,
  TeacherClockPage,
  TeacherDashboardPage,
  TeacherEventsPage,
  TeacherLeavePage,
  TeacherStudentsPage,
  TeacherSyllabusPage,
  TeacherTeachingLogPage,
  TeacherTicketsPage,
} from './features/teacher/pages/TeacherPages';
import {
  SponsorAssetsPage,
  SponsorAttendancePage,
  SponsorDashboardPage,
  SponsorEventsPage,
  SponsorSchoolsPage,
  SponsorSyllabusPage,
  SponsorTicketsPage,
} from './features/sponsor/pages/SponsorPages';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <RoleRoute allow={['admin']}>
            <AdminDashboardPage />
          </RoleRoute>
        }
      />
      <Route
        path="/admin/schools"
        element={
          <RoleRoute allow={['admin']}>
            <AdminSchoolsPage />
          </RoleRoute>
        }
      />
      <Route
        path="/admin/teachers"
        element={
          <RoleRoute allow={['admin']}>
            <AdminTeachersPage />
          </RoleRoute>
        }
      />
      <Route
        path="/admin/sponsors"
        element={
          <RoleRoute allow={['admin']}>
            <AdminSponsorsPage />
          </RoleRoute>
        }
      />
      <Route
        path="/admin/teacher-attendance"
        element={
          <RoleRoute allow={['admin']}>
            <AdminTeacherAttendancePage />
          </RoleRoute>
        }
      />
      <Route
        path="/admin/leaves"
        element={
          <RoleRoute allow={['admin']}>
            <AdminLeavesPage />
          </RoleRoute>
        }
      />
      <Route
        path="/admin/student-attendance"
        element={
          <RoleRoute allow={['admin']}>
            <AdminStudentAttendancePage />
          </RoleRoute>
        }
      />
      <Route
        path="/admin/syllabus"
        element={
          <RoleRoute allow={['admin']}>
            <AdminSyllabusPage />
          </RoleRoute>
        }
      />
      <Route
        path="/admin/assets"
        element={
          <RoleRoute allow={['admin']}>
            <AdminAssetsPage />
          </RoleRoute>
        }
      />
      <Route
        path="/admin/tickets"
        element={
          <RoleRoute allow={['admin']}>
            <AdminTicketsPage />
          </RoleRoute>
        }
      />
      <Route
        path="/admin/events"
        element={
          <RoleRoute allow={['admin']}>
            <AdminEventsPage />
          </RoleRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <RoleRoute allow={['admin']}>
            <AdminReportsPage />
          </RoleRoute>
        }
      />

      {/* Teacher */}
      <Route
        path="/teacher"
        element={
          <RoleRoute allow={['teacher']}>
            <TeacherDashboardPage />
          </RoleRoute>
        }
      />
      <Route
        path="/teacher/clock"
        element={
          <RoleRoute allow={['teacher']}>
            <TeacherClockPage />
          </RoleRoute>
        }
      />
      <Route
        path="/teacher/students"
        element={
          <RoleRoute allow={['teacher']}>
            <TeacherStudentsPage />
          </RoleRoute>
        }
      />
      <Route
        path="/teacher/admission"
        element={
          <RoleRoute allow={['teacher']}>
            <TeacherAdmissionPage />
          </RoleRoute>
        }
      />
      <Route
        path="/teacher/attendance"
        element={
          <RoleRoute allow={['teacher']}>
            <TeacherAttendancePage />
          </RoleRoute>
        }
      />
      <Route
        path="/teacher/teaching-log"
        element={
          <RoleRoute allow={['teacher']}>
            <TeacherTeachingLogPage />
          </RoleRoute>
        }
      />
      <Route
        path="/teacher/syllabus"
        element={
          <RoleRoute allow={['teacher']}>
            <TeacherSyllabusPage />
          </RoleRoute>
        }
      />
      <Route
        path="/teacher/leave"
        element={
          <RoleRoute allow={['teacher']}>
            <TeacherLeavePage />
          </RoleRoute>
        }
      />
      <Route
        path="/teacher/assets"
        element={
          <RoleRoute allow={['teacher']}>
            <TeacherAssetsPage />
          </RoleRoute>
        }
      />
      <Route
        path="/teacher/tickets"
        element={
          <RoleRoute allow={['teacher']}>
            <TeacherTicketsPage />
          </RoleRoute>
        }
      />
      <Route
        path="/teacher/events"
        element={
          <RoleRoute allow={['teacher']}>
            <TeacherEventsPage />
          </RoleRoute>
        }
      />

      {/* Sponsor (read-only) */}
      <Route
        path="/sponsor"
        element={
          <RoleRoute allow={['sponsor']}>
            <SponsorDashboardPage />
          </RoleRoute>
        }
      />
      <Route
        path="/sponsor/schools"
        element={
          <RoleRoute allow={['sponsor']}>
            <SponsorSchoolsPage />
          </RoleRoute>
        }
      />
      <Route
        path="/sponsor/attendance"
        element={
          <RoleRoute allow={['sponsor']}>
            <SponsorAttendancePage />
          </RoleRoute>
        }
      />
      <Route
        path="/sponsor/syllabus"
        element={
          <RoleRoute allow={['sponsor']}>
            <SponsorSyllabusPage />
          </RoleRoute>
        }
      />
      <Route
        path="/sponsor/events"
        element={
          <RoleRoute allow={['sponsor']}>
            <SponsorEventsPage />
          </RoleRoute>
        }
      />
      <Route
        path="/sponsor/assets"
        element={
          <RoleRoute allow={['sponsor']}>
            <SponsorAssetsPage />
          </RoleRoute>
        }
      />
      <Route
        path="/sponsor/tickets"
        element={
          <RoleRoute allow={['sponsor']}>
            <SponsorTicketsPage />
          </RoleRoute>
        }
      />

      <Route path="/dashboard" element={<HomeRedirect />} />
      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
