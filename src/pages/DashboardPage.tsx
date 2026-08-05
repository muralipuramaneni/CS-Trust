import { AppShell } from '../components/layout/AppShell';
import { useAuth } from '../features/auth/hooks/useAuth';
import { formatPhoneDisplay } from '../utils/validation';

const readiness = [
  {
    title: 'Login & signup',
    detail: 'Email sign-in, registration, and session handling.',
  },
  {
    title: 'Password recovery',
    detail: 'Phone OTP flow ready for SMS gateway integration.',
  },
  {
    title: 'Next: Phase 1 modules',
    detail: 'Schools, teachers, students, syllabus, and assets.',
  },
];

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <AppShell title="Dashboard">
      <section className="space-y-8">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white p-7 shadow-card sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
            Phase 1 · Auth complete
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            Welcome{user?.name ? `, ${user.name}` : ''}
          </h2>
          <p className="mt-3 max-w-2xl text-[0.98rem] leading-relaxed text-muted">
            You are signed in to the Chaitanya Saradhi portal. Feature modules will follow
            next using this design system.
          </p>
          {user ? (
            <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 px-4 py-3">
                <dt className="text-muted">Email</dt>
                <dd className="mt-1 font-medium text-slate-900">{user.email}</dd>
              </div>
              <div className="rounded-lg bg-slate-50 px-4 py-3">
                <dt className="text-muted">Phone</dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {user.phone ? formatPhoneDisplay(user.phone) : '—'}
                </dd>
              </div>
              <div className="rounded-lg bg-slate-50 px-4 py-3">
                <dt className="text-muted">Role</dt>
                <dd className="mt-1 font-medium capitalize text-slate-900">{user.role}</dd>
              </div>
            </dl>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {readiness.map((item) => (
            <article
              key={item.title}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-3 size-2.5 rounded-full bg-brand-500" aria-hidden="true" />
              <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
