export interface School {
  id: string;
  name: string;
  district: string;
  mandal: string;
  village: string;
  principalName: string;
  contactNumber: string;
  studentCount: number;
  computerCount: number;
  teacherCount: number;
  status: 'active' | 'disabled';
  syllabusCompletion: number;
  sponsorId?: string;
}

export interface TeacherProfile {
  id: string;
  employeeId: string;
  name: string;
  mobile: string;
  email: string;
  qualification: string;
  joiningDate: string;
  schoolId: string;
  assignedClasses: string[];
  active: boolean;
}

export interface Student {
  id: string;
  studentId: string;
  name: string;
  gender: 'Male' | 'Female' | 'Other';
  classGrade: string;
  section: string;
  parentName: string;
  parentPhone: string;
  schoolId: string;
  status: 'active' | 'inactive' | 'transferred';
}

export type AssetType =
  | 'Computer'
  | 'CPU'
  | 'Monitor'
  | 'Keyboard'
  | 'Mouse'
  | 'UPS';

export interface Asset {
  id: string;
  type: AssetType;
  quantity: number;
  workingStatus: 'Working' | 'Needs Repair' | 'Not Working';
  purchaseDate: string;
  warranty: string;
  schoolId: string;
}

export type TicketStatus = 'Open' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed';
export type TicketType = 'Hardware' | 'Software' | 'Internet' | 'Power' | 'Others';

export interface SupportTicket {
  id: string;
  type: TicketType;
  status: TicketStatus;
  schoolId: string;
  raisedBy: string;
  description: string;
  createdAt: string;
}

export interface LeaveRequest {
  id: string;
  teacherId: string;
  teacherName: string;
  type: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface EventItem {
  id: string;
  schoolId: string;
  name: string;
  date: string;
  description: string;
}

export interface ActivityItem {
  id: string;
  text: string;
  time: string;
}
