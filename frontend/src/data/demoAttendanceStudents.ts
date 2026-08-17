import type { Student } from '../types/domain';

/** Static demo roster — 30 students in Class 7-A @ sch_01 for attendance tracking. */
export const DEMO_ATTENDANCE_SCHOOL_ID = 'sch_01';

const ROSTER: Array<{
  name: string;
  gender: Student['gender'];
  parentName: string;
}> = [
  { name: 'Lakshmi Priya', gender: 'Female', parentName: 'S. Priya' },
  { name: 'Vikram Singh', gender: 'Male', parentName: 'R. Singh' },
  { name: 'Padma Latha', gender: 'Female', parentName: 'N. Latha' },
  { name: 'Arjun Naidu', gender: 'Male', parentName: 'V. Naidu' },
  { name: 'Sneha Patel', gender: 'Female', parentName: 'A. Patel' },
  { name: 'Rahul Varma', gender: 'Male', parentName: 'K. Varma' },
  { name: 'Kavya Reddy', gender: 'Female', parentName: 'B. Reddy' },
  { name: 'Manoj Kumar', gender: 'Male', parentName: 'D. Kumar' },
  { name: 'Isha Begum', gender: 'Female', parentName: 'F. Begum' },
  { name: 'Harshith Goud', gender: 'Male', parentName: 'L. Goud' },
  { name: 'Ananya Reddy', gender: 'Female', parentName: 'V. Reddy' },
  { name: 'Karthik Rao', gender: 'Male', parentName: 'S. Rao' },
  { name: 'Divya Sri', gender: 'Female', parentName: 'K. Sri' },
  { name: 'Sai Teja', gender: 'Male', parentName: 'M. Teja' },
  { name: 'Ramesh Babu', gender: 'Male', parentName: 'P. Babu' },
  { name: 'Harika Chowdary', gender: 'Female', parentName: 'S. Chowdary' },
  { name: 'Nikhil Sharma', gender: 'Male', parentName: 'P. Sharma' },
  { name: 'Bhavana Sri', gender: 'Female', parentName: 'T. Sri' },
  { name: 'Yashwant Rao', gender: 'Male', parentName: 'M. Rao' },
  { name: 'Pooja Kumari', gender: 'Female', parentName: 'H. Kumari' },
  { name: 'Deepak Reddy', gender: 'Male', parentName: 'G. Reddy' },
  { name: 'Chaitra Nair', gender: 'Female', parentName: 'J. Nair' },
  { name: 'Siddharth Jain', gender: 'Male', parentName: 'R. Jain' },
  { name: 'Ayesha Khan', gender: 'Female', parentName: 'I. Khan' },
  { name: 'Rohan Das', gender: 'Male', parentName: 'S. Das' },
  { name: 'Meena Devi', gender: 'Female', parentName: 'R. Devi' },
  { name: 'Vamsi Krishna', gender: 'Male', parentName: 'K. Krishna' },
  { name: 'Swathi Kumari', gender: 'Female', parentName: 'L. Kumari' },
  { name: 'Pranav Kumar', gender: 'Male', parentName: 'N. Kumar' },
  { name: 'Keerthi Rao', gender: 'Female', parentName: 'S. Rao' },
];

export const demoAttendanceStudents: Student[] = ROSTER.map((row, index) => {
  const num = String(index + 1).padStart(2, '0');
  return {
    id: `demo_stu_7a_${num}`,
    studentId: `STU-7A${num}`,
    name: row.name,
    gender: row.gender,
    classGrade: '7',
    section: 'A',
    parentName: row.parentName,
    parentPhone: `9000001${String(100 + index).padStart(3, '0')}`,
    schoolId: DEMO_ATTENDANCE_SCHOOL_ID,
    status: 'active',
  };
});

/** Use static demo roster on the attendance screen (API rows merged when present). */
export function mergeAttendanceStudents(apiStudents: Student[], schoolId?: string | null): Student[] {
  if (schoolId && schoolId !== DEMO_ATTENDANCE_SCHOOL_ID) {
    return apiStudents.filter((s) => s.status === 'active');
  }

  const activeApi = apiStudents.filter((s) => s.status === 'active');
  const byKey = new Map<string, Student>();
  for (const student of activeApi) {
    byKey.set(student.id, student);
  }

  // Static roster is the source of truth for attendance tracking (30 in Class 7-A).
  for (const demo of demoAttendanceStudents) {
    byKey.set(demo.id, demo);
  }

  return [...byKey.values()].sort((a, b) => {
    const grade = a.classGrade.localeCompare(b.classGrade, undefined, { numeric: true });
    if (grade !== 0) return grade;
    const section = a.section.localeCompare(b.section);
    if (section !== 0) return section;
    return a.name.localeCompare(b.name);
  });
}
