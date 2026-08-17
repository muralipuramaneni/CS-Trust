/** Lightweight on-device assist to draft teaching-log / syllabus topic text. */

export type TeachingAssistTone = 'standard' | 'short' | 'detailed';

const SUBJECT_HINTS: Record<string, string[]> = {
  computer: [
    'Hands-on practice with lab systems',
    'Students explore tools step by step',
    'Focus on digital literacy and safe use',
  ],
  english: [
    'Reading, speaking and writing practice',
    'Vocabulary building through examples',
    'Interactive classroom discussion',
  ],
  maths: [
    'Concept explanation with worked examples',
    'Practice problems for every learner',
    'Focus on accuracy and reasoning',
  ],
  math: [
    'Concept explanation with worked examples',
    'Practice problems for every learner',
    'Focus on accuracy and reasoning',
  ],
  science: [
    'Observation and real-life examples',
    'Simple demonstration of the concept',
    'Questions to check understanding',
  ],
  telugu: [
    'Reading and writing practice',
    'Grammar and vocabulary focus',
    'Oral activity for confidence',
  ],
  hindi: [
    'Reading and writing practice',
    'Grammar and vocabulary focus',
    'Oral activity for confidence',
  ],
  social: [
    'Map / timeline or discussion activity',
    'Connecting topic to daily life',
    'Short recap questions',
  ],
};

const SYLLABUS_TOPIC_SUGGESTIONS: Record<string, string[]> = {
  computer: [
    'Mouse & keyboard basics',
    'MS Paint tools',
    'Typing practice',
    'File & folder management',
    'Parts of a computer',
    'Internet safety rules',
  ],
  'ms office': [
    'Word formatting basics',
    'Insert images & tables',
    'Excel rows and columns',
    'Simple formulas',
    'PowerPoint slide design',
  ],
  internet: [
    'Safe browsing habits',
    'Email basics',
    'Searching for information',
    'Password safety',
  ],
  english: [
    'Reading comprehension',
    'Parts of speech',
    'Paragraph writing',
    'Listening & speaking practice',
    'Vocabulary of the week',
  ],
  maths: [
    'Fractions practice',
    'Word problems',
    'Geometry basics',
    'Number patterns',
    'Mental maths drills',
  ],
  math: [
    'Fractions practice',
    'Word problems',
    'Geometry basics',
    'Number patterns',
    'Mental maths drills',
  ],
  science: [
    'Living & non-living',
    'Human body systems',
    'States of matter',
    'Simple experiments',
    'Environment & pollution',
  ],
  telugu: [
    'Reading practice',
    'Letter writing',
    'Grammar revision',
    'Poem recitation',
  ],
  hindi: [
    'Reading practice',
    'Letter writing',
    'Grammar revision',
    'Poem recitation',
  ],
  social: [
    'Map skills',
    'Local government',
    'Indian freedom movement',
    'Natural resources',
  ],
  general: [
    'Concept introduction',
    'Practice worksheet',
    'Revision & doubt clearing',
    'Group activity',
    'Assessment prep',
  ],
};

function subjectBucket(subject: string): string {
  const s = subject.trim().toLowerCase();
  for (const key of Object.keys(SUBJECT_HINTS)) {
    if (s.includes(key)) return key;
  }
  for (const key of Object.keys(SYLLABUS_TOPIC_SUGGESTIONS)) {
    if (key !== 'general' && s.includes(key)) return key;
  }
  return 'general';
}

function classPhrase(classGrade: string, section: string): string {
  const grade = classGrade.trim();
  const sec = section.trim().toUpperCase();
  if (grade && sec) return `Class ${grade}-${sec}`;
  if (grade) return `Class ${grade}`;
  return 'the class';
}

function minutesPhrase(durationMinutes: number): string {
  if (!durationMinutes || durationMinutes <= 0) return 'this period';
  return `a ${durationMinutes}-minute session`;
}

function pickHints(subject: string): string[] {
  const bucket = subjectBucket(subject);
  return SUBJECT_HINTS[bucket] ?? [
    'Clear explanation with examples',
    'Guided practice and student participation',
    'Quick check of understanding before close',
  ];
}

/** Draft a topic description / remarks paragraph for the teaching log. */
export function generateTopicDescription(input: {
  subject: string;
  topic: string;
  classGrade?: string;
  section?: string;
  period?: number;
  durationMinutes?: number;
  tone?: TeachingAssistTone;
}): string {
  const subject = input.subject.trim() || 'the subject';
  const topic = input.topic.trim() || 'today’s topic';
  const cls = classPhrase(input.classGrade ?? '', input.section ?? '');
  const duration = minutesPhrase(input.durationMinutes ?? 0);
  const period =
    input.period && input.period > 0 ? `Period ${input.period}` : 'this period';
  const hints = pickHints(subject);
  const tone = input.tone ?? 'standard';

  if (tone === 'short') {
    return `Covered “${topic}” in ${subject} for ${cls} (${period}, ${duration}). ${hints[0]}.`;
  }

  if (tone === 'detailed') {
    return [
      `Today’s ${subject} lesson for ${cls} in ${period} focused on “${topic}” across ${duration}.`,
      `${hints[0]}. ${hints[1]}.`,
      `${hints[2]}.`,
      `Closed with a short recap and clarified doubts so students can revise independently.`,
    ].join(' ');
  }

  return [
    `Taught “${topic}” (${subject}) to ${cls} in ${period} (${duration}).`,
    `${hints[0]}. ${hints[1]}.`,
    `Ended with a quick recap to confirm learning.`,
  ].join(' ');
}

/** Clickable topic title ideas for syllabus / teaching updates. */
export function suggestSyllabusTopics(subject: string, limit = 6): string[] {
  const bucket = subjectBucket(subject);
  const list =
    SYLLABUS_TOPIC_SUGGESTIONS[bucket] ??
    SYLLABUS_TOPIC_SUGGESTIONS.general ??
    [];
  return list.slice(0, limit);
}

/** Draft a syllabus progress note teachers can use as the topic line or reference. */
export function generateSyllabusSuggestion(input: {
  subject: string;
  topic?: string;
  classGrade?: string;
  section?: string;
  completedPct?: number;
  topicsDone?: number;
  topicsTotal?: number;
  tone?: TeachingAssistTone;
}): { topic: string; note: string } {
  const subject = input.subject.trim() || 'the subject';
  const cls = classPhrase(input.classGrade ?? '', input.section ?? '');
  const ideas = suggestSyllabusTopics(subject, 4);
  const topic = input.topic?.trim() || ideas[0] || 'Concept practice';
  const pct = Math.min(100, Math.max(0, input.completedPct ?? 0));
  const done = input.topicsDone ?? 0;
  const total = Math.max(1, input.topicsTotal ?? 25);
  const remaining = Math.max(0, total - done);
  const hints = pickHints(subject);
  const tone = input.tone ?? 'standard';

  let note: string;
  if (tone === 'short') {
    note = `${cls}: “${topic}” in ${subject} · ${pct}% complete (${done}/${total}).`;
  } else if (tone === 'detailed') {
    note = [
      `Syllabus update for ${cls} in ${subject}: covered “${topic}”.`,
      `Completion is ${pct}% (${done} of ${total} topics; ${remaining} remaining).`,
      `${hints[0]}. ${hints[1]}.`,
      pct >= 80
        ? 'Class is on track — continue with revision and application tasks.'
        : pct >= 50
          ? 'Steady progress — plan extra practice for weaker areas.'
          : 'Needs focus — slow the pace and reinforce basics before moving ahead.',
    ].join(' ');
  } else {
    note = [
      `Updated ${subject} for ${cls} with topic “${topic}”.`,
      `Progress ${pct}% (${done}/${total} topics).`,
      `${hints[0]}.`,
    ].join(' ');
  }

  return { topic, note };
}

export const TEACHING_SUBJECT_OPTIONS = [
  'Computer basics',
  'MS Office',
  'Internet & safety',
  'English',
  'Mathematics',
  'Science',
  'Telugu',
  'Hindi',
  'Social studies',
  'Other',
] as const;

export const TEACHING_PERIODS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export const TEACHING_DURATION_PRESETS = [30, 40, 45, 50, 60] as const;

export type EventAssistTone = TeachingAssistTone | 'caption';
export type EventAudience = 'students' | 'parents' | 'community';

export const EVENT_TYPE_OPTIONS = [
  'Celebration',
  'Computer lab',
  'Sports day',
  'Workshop',
  'Community visit',
  'Exhibition',
  'Other',
] as const;

const EVENT_NAME_IDEAS: Record<string, string[]> = {
  celebration: [
    'Independence Day Tech Showcase',
    'Republic Day Cultural Hour',
    'Annual Day Highlights',
    'Festival Assembly',
  ],
  computer: [
    'Digital Skills Lab Day',
    'Typing Challenge',
    'MS Paint Exhibition',
    'Safe Internet Workshop',
  ],
  sports: [
    'Sports Day Snapshots',
    'Inter-class Games',
    'Morning Fitness Hour',
    'Team Spirit Day',
  ],
  workshop: [
    'Parent Digital Literacy Workshop',
    'Teacher Skill Share',
    'Career Awareness Session',
    'Hands-on Learning Hour',
  ],
  community: [
    'Community Outreach Visit',
    'Village Library Drive',
    'Health Awareness Camp',
    'School Open Day',
  ],
  exhibition: [
    'Student Project Exhibition',
    'Science & Tech Fair',
    'Art & Craft Display',
    'Innovation Corner',
  ],
  general: [
    'School Activity Day',
    'Class Showcase',
    'Learning Together',
    'Special Assembly',
  ],
};

function eventBucket(eventType: string, name = ''): string {
  const s = `${eventType} ${name}`.toLowerCase();
  if (s.includes('sport') || s.includes('game') || s.includes('fitness')) return 'sports';
  if (s.includes('lab') || s.includes('computer') || s.includes('digital') || s.includes('internet')) {
    return 'computer';
  }
  if (s.includes('workshop') || s.includes('training') || s.includes('session')) return 'workshop';
  if (s.includes('community') || s.includes('village') || s.includes('outreach') || s.includes('visit')) {
    return 'community';
  }
  if (s.includes('exhibit') || s.includes('fair') || s.includes('showcase') || s.includes('display')) {
    return 'exhibition';
  }
  if (s.includes('day') || s.includes('festival') || s.includes('celebration') || s.includes('assembly')) {
    return 'celebration';
  }
  return 'general';
}

export function suggestEventNames(eventType: string, extra = '', limit = 6): string[] {
  const bucket = eventBucket(eventType, extra);
  const extraWords = extra
    .split(/[\s,]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2)
    .slice(0, 3);
  const base = [...(EVENT_NAME_IDEAS[bucket] ?? EVENT_NAME_IDEAS.general)];
  if (extraWords.length) {
    const hint = extraWords.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    base.unshift(`${hint} at School`);
    base.unshift(`${eventType === 'Other' || !eventType ? 'School' : eventType} · ${hint}`);
  }
  return [...new Set(base)].slice(0, limit);
}

export function generateEventCopy(input: {
  eventType?: string;
  name?: string;
  extra?: string;
  schoolName?: string;
  date?: string;
  audience?: EventAudience;
  tone?: EventAssistTone;
}): { name: string; description: string } {
  const type = input.eventType?.trim() || 'School activity';
  const extra = input.extra?.trim();
  const names = suggestEventNames(type, extra || input.name || '', 4);
  const name = input.name?.trim() || names[0] || 'School Event';
  const school = input.schoolName?.trim() || 'our school';
  const date = input.date?.trim();
  const audience =
    input.audience === 'parents'
      ? 'parents and families'
      : input.audience === 'community'
        ? 'students, staff and the local community'
        : 'students';
  const tone = input.tone ?? 'standard';
  const extras = extra ? ` Focus: ${extra}.` : '';
  const when = date ? ` on ${date}` : '';

  let description: string;
  if (tone === 'short') {
    description = `${name}${when} at ${school} — ${type.toLowerCase()} with ${audience}.${extras}`;
  } else if (tone === 'caption') {
    description = `${name} ✨ ${type} at ${school}${when}. Moments of learning, teamwork and joy with ${audience}.${extras} #ChaitanyaSaradhi`;
  } else if (tone === 'detailed') {
    description = [
      `${school} hosted “${name}”${when}, a ${type.toLowerCase()} planned for ${audience}.`,
      extras.trim() || 'Students took part in activities, photos were captured, and highlights will be shared with the school community.',
      'The session encouraged participation, confidence and pride in school programmes.',
    ].join(' ');
  } else {
    description = [
      `“${name}” was organised at ${school}${when} as a ${type.toLowerCase()} for ${audience}.`,
      extras.trim() || 'Photos and a short description capture what students learned and enjoyed.',
    ].join(' ');
  }

  return { name, description: description.trim() };
}
