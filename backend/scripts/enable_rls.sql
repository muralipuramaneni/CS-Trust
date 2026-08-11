-- Enable Row Level Security on all CS-Trust tables.
-- FastAPI (postgres / pooler role) continues to work; PostgREST anon/authenticated is blocked
-- until explicit policies are added (we intentionally add none — access is via JWT API only).

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users',
    'schools',
    'teachers',
    'sponsors',
    'students',
    'teacher_attendance',
    'student_attendance_sessions',
    'student_attendance_marks',
    'leave_requests',
    'syllabus_progress',
    'teaching_logs',
    'assets',
    'support_tickets',
    'events',
    'activities',
    'otp_challenges'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;
