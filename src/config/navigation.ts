import type { UserRole } from '../types/auth';
import type { ComponentType, SVGProps } from 'react';
import {
  IconBook,
  IconBox,
  IconCalendar,
  IconChart,
  IconClipboard,
  IconClock,
  IconEye,
  IconImage,
  IconLayout,
  IconSchool,
  IconTicket,
  IconUser,
  IconUsers,
} from '../components/ui/icons';

export interface NavItem {
  label: string;
  path: string;
  readOnly?: boolean;
  icon: ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;
  group?: string;
}

export const adminNav: NavItem[] = [
  { label: 'Dashboard', path: '/admin', icon: IconLayout, group: 'Overview' },
  { label: 'Schools', path: '/admin/schools', icon: IconSchool, group: 'People & Places' },
  { label: 'Teachers', path: '/admin/teachers', icon: IconUsers, group: 'People & Places' },
  {
    label: 'Assign Sponsor',
    path: '/admin/sponsors',
    icon: IconUser,
    group: 'People & Places',
  },
  {
    label: 'Teacher Attendance',
    path: '/admin/teacher-attendance',
    icon: IconClock,
    group: 'Operations',
  },
  { label: 'Leave Management', path: '/admin/leaves', icon: IconCalendar, group: 'Operations' },
  {
    label: 'Student Attendance',
    path: '/admin/student-attendance',
    icon: IconClipboard,
    group: 'Operations',
  },
  { label: 'Syllabus Monitoring', path: '/admin/syllabus', icon: IconBook, group: 'Learning' },
  { label: 'Assets', path: '/admin/assets', icon: IconBox, group: 'Resources' },
  { label: 'Support Tickets', path: '/admin/tickets', icon: IconTicket, group: 'Resources' },
  { label: 'Event Gallery', path: '/admin/events', icon: IconImage, group: 'Resources' },
  { label: 'Reports', path: '/admin/reports', icon: IconChart, group: 'Insights' },
];

export const teacherNav: NavItem[] = [
  { label: 'Dashboard', path: '/teacher', icon: IconLayout },
  { label: 'Clock In / Out', path: '/teacher/clock', icon: IconClock },
  { label: 'Students', path: '/teacher/students', icon: IconUsers },
  { label: 'New Admission', path: '/teacher/admission', icon: IconClipboard },
  { label: 'Student Attendance', path: '/teacher/attendance', icon: IconClipboard },
  { label: 'Daily Teaching Log', path: '/teacher/teaching-log', icon: IconBook },
  { label: 'Syllabus Progress', path: '/teacher/syllabus', icon: IconBook },
  { label: 'Leave', path: '/teacher/leave', icon: IconCalendar },
  { label: 'Assets', path: '/teacher/assets', icon: IconBox },
  { label: 'Support Tickets', path: '/teacher/tickets', icon: IconTicket },
  { label: 'Event Upload', path: '/teacher/events', icon: IconImage },
];

export const sponsorNav: NavItem[] = [
  { label: 'Dashboard', path: '/sponsor', icon: IconLayout, readOnly: true },
  { label: 'School Details', path: '/sponsor/schools', icon: IconSchool, readOnly: true },
  { label: 'Attendance', path: '/sponsor/attendance', icon: IconClipboard, readOnly: true },
  { label: 'Syllabus Progress', path: '/sponsor/syllabus', icon: IconBook, readOnly: true },
  { label: 'Event Gallery', path: '/sponsor/events', icon: IconImage, readOnly: true },
  { label: 'Asset Summary', path: '/sponsor/assets', icon: IconBox, readOnly: true },
  { label: 'Support Tickets', path: '/sponsor/tickets', icon: IconTicket, readOnly: true },
];

export function navForRole(role: UserRole): NavItem[] {
  switch (role) {
    case 'admin':
      return adminNav;
    case 'teacher':
      return teacherNav;
    case 'sponsor':
      return sponsorNav;
    default:
      return [];
  }
}

export { IconEye };
