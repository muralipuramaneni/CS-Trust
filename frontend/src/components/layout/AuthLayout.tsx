import type { ReactNode } from 'react';
import { BrandMark } from '../BrandMark';
import { ThemeToggle } from '../ui/ThemeToggle';
import { cn } from '../../utils/cn';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  eyebrow?: string;
}

const HERO = '/images/auth-hero-classroom.png';

const LAB = '/images/auth-overlay-lab.png';

const SPEAKER = '/images/auth-overlay-speaker.png';

const DONATION = '/images/auth-overlay-donation.png';

const STATS = [
  { value: '12.4K+', label: 'Students supported' },
  { value: '28', label: 'Active programs' },
  { value: '540', label: 'Volunteers' },
] as const;

const glass =
  'border border-white/20 bg-[#030a14]/72 shadow-[0_10px_24px_rgba(0,0,0,0.6)] backdrop-blur-[12px]';

const photoRing =
  'rounded-lg object-cover ring-2 ring-white/80 shadow-[0_12px_28px_rgba(0,0,0,0.38)]';

export function AuthLayout({
  children,
  title,
  subtitle,
  eyebrow,
}: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen lg:grid lg:grid-cols-2">
      {/* Top bar — desktop logo left; mobile only theme toggle so the logo can sit above the heading */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[60] flex items-center justify-end gap-3 px-4 py-3 sm:px-5 sm:py-4 lg:justify-between">
        <div className="pointer-events-auto hidden shrink-0 lg:block">
          <BrandMark size="form" align="left" />
        </div>
        <div className="pointer-events-auto shrink-0">
          <ThemeToggle compact />
        </div>
      </div>

      {/* LEFT collage */}
      <section
        className="relative hidden min-h-screen overflow-hidden lg:block"
        aria-label="Impact gallery"
      >
        <img
          src={HERO}
          alt=""
          className="auth-motion-kenburns absolute inset-0 size-full object-cover object-[center_40%]"
        />
        {/* Base vignette — darker for better visibility of overlays & logo */}
        <div
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,10,20,0.68)_0%,rgba(4,10,20,0.48)_42%,rgba(2,6,14,0.78)_100%)]"
          aria-hidden="true"
        />
        {/* Right edge darker for depth */}
        <div
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,14,0.2)_0%,transparent_35%,rgba(2,6,14,0.52)_100%)]"
          aria-hidden="true"
        />
        {/* Soft center lift still readable */}
        <div
          className="absolute inset-0 bg-black/15"
          aria-hidden="true"
        />

        <div className="absolute inset-0">
          {/*
            Image cluster on middle speaker:
            - Lab: small, top-right overlay of speaker
            - Donation: small, bottom-center of speaker
            - Community first: narrow, bottom-right overlay of speaker
          */}
          <div className="absolute inset-x-[4%] top-[8%] bottom-[13%]">
            {/* Middle speaker — base layer */}
            <img
              src={SPEAKER}
              alt="Community session with students"
              className={cn(
                'auth-motion-float absolute z-30',
                photoRing,
                'left-0 bottom-[8%]',
                'h-[54%] w-[54%]',
                'object-cover object-[42%_12%]',
              )}
            />

            {/* Top image — right side of middle image, smaller overlay */}
            <img
              src={LAB}
              alt="Students in computer lab"
              className={cn(
                'auth-motion-float-delayed absolute z-40',
                photoRing,
                'left-[28%] bottom-[46%]',
                'h-[20%] w-[26%]',
                'object-cover object-center',
              )}
            />

            {/* Bottom image — centered under middle image */}
            <div
              className={cn(
                'auth-motion-float-slow absolute z-40 overflow-hidden bg-white',
                'left-[18.5%] bottom-[4%]',
                'aspect-square w-[16%]',
                'rounded-lg ring-[2.5px] ring-white',
                'shadow-[0_10px_22px_rgba(0,0,0,0.35)]',
              )}
            >
              <img
                src={DONATION}
                alt="Donation"
                className="absolute inset-0 size-full object-cover object-center scale-[1.05]"
              />
            </div>

            {/* Community first — narrow, bottom-right of middle image, overlays */}
            <div
              className={cn(
                'auth-motion-fade absolute z-40',
                'left-[46%] bottom-[10%]',
                'w-[24%]',
                'rounded-lg px-3 py-2.5',
                glass,
              )}
            >
              <p className="text-[0.82rem] font-semibold leading-snug text-white">
                Community first
              </p>
              <p className="mt-0.5 text-[0.64rem] leading-snug text-white/80">
                Literacy · Life skills · Partnerships
              </p>
            </div>
          </div>

          {/* Stats bottom full width */}
          <div className="absolute inset-x-[4%] bottom-[2.8%] z-50 grid grid-cols-3 gap-2.5">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className={cn('rounded-lg px-2.5 py-2.5 text-center sm:px-3 sm:py-3', glass)}
              >
                <p className="text-[1.05rem] font-bold leading-none tracking-tight text-white xl:text-[1.12rem]">
                  {stat.value}
                </p>
                <p className="mt-1 text-[0.62rem] leading-snug text-white/75 xl:text-[0.68rem]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RIGHT form portal — hover reveals a light charity photo wash behind the form */}
      <section className="auth-form-side group/auth relative z-[2] grid min-h-screen place-items-center overflow-hidden bg-[#f4f7fb] px-5 pb-10 pt-16 dark:bg-slate-950 sm:px-7 sm:pt-[4.5rem] lg:px-7 lg:py-10">
        <div className="auth-charity-overlay pointer-events-none absolute inset-0 z-0" aria-hidden="true">
          <img
            src={HERO}
            alt=""
            className="absolute inset-0 size-full object-cover object-[center_35%] opacity-[0.42] dark:opacity-30"
          />
          <img
            src={DONATION}
            alt=""
            className="absolute -right-[8%] bottom-[-6%] h-[46%] w-[46%] rounded-lg object-cover opacity-25 blur-[0.5px] dark:opacity-20"
          />
          <div className="absolute inset-0 bg-[#f4f7fb]/78 dark:bg-slate-950/78" />
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50/35 via-transparent to-sky-50/30 dark:from-orange-950/20 dark:to-sky-950/20" />
        </div>

        <div className="relative z-10 flex w-full max-w-[24.5rem] flex-col items-stretch">
          {eyebrow ? (
            <p className="mb-2.5 text-center text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#ff6a00]">
              {eyebrow}
            </p>
          ) : null}

          <div
            className={cn(
              'w-full animate-[fadeUp_0.45s_cubic-bezier(0.22,1,0.36,1)_both]',
              'rounded-lg bg-white px-6 py-6 shadow-[0_18px_45px_rgba(15,23,42,0.09)] sm:px-7 sm:py-7',
              'dark:border dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_18px_45px_rgba(0,0,0,0.45)]',
            )}
          >
            <header className="mb-5 space-y-1.5">
              <div className="auth-motion-logo mb-4 flex justify-center lg:hidden">
                <BrandMark size="auth" align="center" />
              </div>
              <h1 className="text-center text-[1.45rem] font-bold leading-tight tracking-tight text-slate-900 sm:text-[1.55rem] lg:text-left dark:text-slate-50">
                {title}
              </h1>
              {subtitle ? (
                <p className="text-center text-[0.84rem] leading-relaxed text-slate-500 lg:text-left dark:text-slate-400">
                  {subtitle}
                </p>
              ) : null}
            </header>

            {children}
          </div>
        </div>
      </section>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes authKenBurns {
          0% { transform: scale(1) translate3d(0, 0, 0); }
          100% { transform: scale(1.06) translate3d(-1.2%, -0.8%, 0); }
        }
        @keyframes authFloat {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -8px, 0); }
        }
        @keyframes authFloatSoft {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -5px, 0); }
        }
        @keyframes authLogoIn {
          from { opacity: 0; transform: translate3d(0, 8px, 0) scale(0.96); }
          to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
        }
        @keyframes authFadeIn {
          from { opacity: 0; transform: translate3d(0, 6px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        .auth-motion-kenburns {
          animation: authKenBurns 22s ease-in-out alternate infinite;
          transform-origin: center 40%;
          will-change: transform;
        }
        .auth-motion-float {
          animation: authFloat 6.5s ease-in-out infinite;
          will-change: transform;
        }
        .auth-motion-float-delayed {
          animation: authFloat 7.5s ease-in-out 0.8s infinite;
          will-change: transform;
        }
        .auth-motion-float-slow {
          animation: authFloatSoft 8s ease-in-out 0.4s infinite;
          will-change: transform;
        }
        .auth-motion-fade {
          animation: authFadeIn 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.35s both;
        }
        .auth-motion-logo {
          animation: authLogoIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .auth-charity-overlay {
          opacity: 0;
          transition: opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @media (hover: hover) and (pointer: fine) {
          .auth-form-side:hover .auth-charity-overlay {
            opacity: 1;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .auth-motion-kenburns,
          .auth-motion-float,
          .auth-motion-float-delayed,
          .auth-motion-float-slow,
          .auth-motion-fade,
          .auth-motion-logo {
            animation: none;
          }
          .auth-charity-overlay {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
