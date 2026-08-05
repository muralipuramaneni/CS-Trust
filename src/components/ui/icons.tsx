import type { ReactNode, SVGProps } from 'react';
import { cn } from '../../utils/cn';

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

function icon(paths: ReactNode, viewBox = '0 0 24 24') {
  return function Icon({ className, ...props }: IconProps) {
    return (
      <svg
        viewBox={viewBox}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className={cn('h-[1.1rem] w-[1.1rem] shrink-0', className)}
        {...props}
      >
        {paths}
      </svg>
    );
  };
}

export const IconLayout = icon(
  <>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </>,
);

export const IconSchool = icon(
  <>
    <path d="M3 10.5 12 4l9 6.5" />
    <path d="M5 9.5V18a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
    <path d="M9 19v-5h6v5" />
  </>,
);

export const IconUsers = icon(
  <>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </>,
);

export const IconClock = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>,
);

export const IconCalendar = icon(
  <>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M16 3v4M8 3v4M3 11h18" />
  </>,
);

export const IconClipboard = icon(
  <>
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <path d="M9 4V3h6v1" />
    <path d="M9 12h6M9 16h4" />
  </>,
);

export const IconBook = icon(
  <>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5V5.5Z" />
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
  </>,
);

export const IconBox = icon(
  <>
    <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
    <path d="M12 12 4 7.5M12 12l8-4.5M12 12v9" />
  </>,
);

export const IconTicket = icon(
  <>
    <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1a2 2 0 0 0 0 4v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a2 2 0 0 0 0-4V9Z" />
    <path d="M9 8v8" />
  </>,
);

export const IconImage = icon(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="1.5" />
    <path d="m21 16-4.5-4.5L7 21" />
  </>,
);

export const IconChart = icon(
  <>
    <path d="M4 19h16" />
    <path d="M7 16V10M12 16V6M17 16v-4" />
  </>,
);

export const IconLogout = icon(
  <>
    <path d="M10 17l-5-5 5-5" />
    <path d="M5 12h11" />
    <path d="M15 5h3a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-3" />
  </>,
);

export const IconMenu = icon(
  <>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </>,
);

export const IconSearch = icon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </>,
);

export const IconBell = icon(
  <>
    <path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 7H3s3 0 3-7" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </>,
);

export const IconTrendUp = icon(
  <>
    <path d="m4 16 5-5 4 4 7-8" />
    <path d="M14 7h6v6" />
  </>,
);

export const IconAlert = icon(
  <>
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
    <path d="M10.3 4.3 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
  </>,
);

export const IconCheck = icon(
  <>
    <path d="M20 6 9 17l-5-5" />
  </>,
);

export const IconMapPin = icon(
  <>
    <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </>,
);

export const IconSpark = icon(
  <>
    <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
  </>,
);

export const IconEye = icon(
  <>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </>,
);

export const IconChevronRight = icon(
  <>
    <path d="m9 6 6 6-6 6" />
  </>,
);

export const IconChevronLeft = icon(
  <>
    <path d="m15 6-6 6 6 6" />
  </>,
);

export const IconUser = icon(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20a8 8 0 0 1 16 0" />
  </>,
);

export const IconArrowRight = icon(
  <>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </>,
);

export const IconSun = icon(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </>,
);

export const IconMoon = icon(
  <>
    <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3a7 7 0 0 0 11.5 11.5Z" />
  </>,
);

export const IconEdit = icon(
  <>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </>,
);

export const IconTrash = icon(
  <>
    <path d="M4 7h16" />
    <path d="M10 11v6M14 11v6" />
    <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
    <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </>,
);
