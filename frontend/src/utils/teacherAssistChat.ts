import { generateSyllabusSuggestion, suggestSyllabusTopics } from './teachingAssist';

export type TeacherAssistContext = {
  firstName: string;
  schoolName?: string;
  clockedIn: boolean;
  clockInTime?: string;
  hours?: string;
  studentCount: number;
  classCount: number;
  assignedClasses: string[];
  syllabusPct: number;
};

export type TeacherAssistReply = {
  text: string;
  href?: { to: string; label: string };
};

export const TEACHER_ASSIST_PROMPTS = [
  { id: 'clock-in', label: 'Clock in' },
  { id: 'clock-out', label: 'Clock out' },
  { id: 'attendance', label: 'Student attendance' },
  { id: 'syllabus', label: 'Syllabus notes' },
] as const;

function classLine(ctx: TeacherAssistContext): string {
  if (ctx.assignedClasses.length) return ctx.assignedClasses.join(', ');
  if (ctx.classCount) return `${ctx.classCount} assigned class${ctx.classCount === 1 ? '' : 'es'}`;
  return 'your assigned classes';
}

function schoolLine(ctx: TeacherAssistContext): string {
  return ctx.schoolName || 'your school';
}

export function welcomeTeacherAssist(ctx: TeacherAssistContext): TeacherAssistReply {
  const next = ctx.clockedIn
    ? 'You are clocked in. I can help with clock-out, attendance, or syllabus notes.'
    : 'Start with clock-in, then mark attendance and update syllabus notes.';
  return {
    text: `Hi ${ctx.firstName}. I’m your classroom assistant for ${schoolLine(ctx)}. ${next}`,
  };
}

export function teacherAssistReply(raw: string, ctx: TeacherAssistContext): TeacherAssistReply {
  const q = raw.trim().toLowerCase();

  if (/\bclock\s*in\b|\bsign\s*in\b|\bcheck\s*in\b/.test(q) || q === 'clock in') {
    if (ctx.clockedIn) {
      return {
        text: `You already clocked in${ctx.clockInTime ? ` at ${ctx.clockInTime}` : ''}. Stay on campus until the last period, then clock out from Clock in / out.`,
        href: { to: '/teacher/clock', label: 'Open clock in / out' },
      };
    }
    return {
      text: `Clock in before the first period at ${schoolLine(ctx)}. Use GPS-verified attendance so today’s working hours start correctly.`,
      href: { to: '/teacher/clock', label: 'Clock in now' },
    };
  }

  if (/\bclock\s*out\b|\bsign\s*out\b|\bcheck\s*out\b/.test(q) || q === 'clock out') {
    if (!ctx.clockedIn) {
      return {
        text: ctx.hours
          ? `You have already completed today’s duty (${ctx.hours}). No clock-out is pending.`
          : 'You are not clocked in yet. Clock in first, then clock out after the last period.',
        href: { to: '/teacher/clock', label: 'Open clock in / out' },
      };
    }
    return {
      text: `You are still on duty${ctx.clockInTime ? ` since ${ctx.clockInTime}` : ''}. Clock out after the last period so working hours are saved.`,
      href: { to: '/teacher/clock', label: 'Clock out now' },
    };
  }

  if (/\battend|\bpresent|\babsent|\broll|\bclass roll/.test(q) || q.includes('student')) {
    return {
      text: `Mark student attendance for ${classLine(ctx)} at ${schoolLine(ctx)}. ${
        ctx.studentCount ? `About ${ctx.studentCount} students are on roll.` : 'Select class and section, then mark Present or Absent.'
      } Submit once per class for today.`,
      href: { to: '/teacher/attendance', label: 'Mark attendance' },
    };
  }

  if (/\bsyllabus|\btopic|\bnotes?|\blesson|\bprogress|\bteach/.test(q)) {
    const classes = ctx.assignedClasses[0] ?? '';
    const match = String(classes).match(/^(\d+)\s*[-–]?\s*([A-Za-z])?$/);
    const suggestion = generateSyllabusSuggestion({
      subject: 'Computer basics',
      classGrade: match?.[1] ?? '',
      section: (match?.[2] ?? 'A').toUpperCase(),
      completedPct: ctx.syllabusPct,
    });
    const topics = suggestSyllabusTopics('Computer basics', 4).join(', ');
    return {
      text: [
        `Syllabus at ${schoolLine(ctx)} is ${ctx.syllabusPct}% complete.`,
        suggestion.note,
        `Suggested topics: ${topics}.`,
        'Update completion on Syllabus progress, or log today’s topic in the Daily Teaching Log.',
      ].join(' '),
      href: { to: '/teacher/syllabus', label: 'Update syllabus notes' },
    };
  }

  if (/\bhello\b|\bhi\b|\bhelp\b/.test(q)) {
    return welcomeTeacherAssist(ctx);
  }

  return {
    text: `I can help with clock in, clock out, student attendance, and syllabus notes for ${schoolLine(ctx)}. Pick a suggestion below or ask about one of those.`,
  };
}
