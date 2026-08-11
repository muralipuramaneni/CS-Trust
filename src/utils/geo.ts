export type GeoCaptureStatus = 'ok' | 'denied' | 'unavailable' | 'timeout' | 'error';

export interface GeoCaptureResult {
  label: string;
  latitude?: number;
  longitude?: number;
  status: GeoCaptureStatus;
}

function formatCoords(latitude: number, longitude: number): string {
  const latHem = latitude >= 0 ? 'N' : 'S';
  const lngHem = longitude >= 0 ? 'E' : 'W';
  return `${Math.abs(latitude).toFixed(5)}° ${latHem}, ${Math.abs(longitude).toFixed(5)}° ${lngHem}`;
}

export function isMeaningfulGpsLabel(label: string | null | undefined): boolean {
  if (!label) return false;
  const value = label.trim();
  if (!value || value === '—') return false;
  const lower = value.toLowerCase();
  if (lower.includes('permission denied')) return false;
  if (lower.includes('gps not granted')) return false;
  if (lower.includes('unavailable')) return false;
  if (lower.includes('timed out')) return false;
  if (lower.includes('needs https')) return false;
  return true;
}

/** Capture browser GPS with clear status for UI + admin verification. */
export function captureBrowserLocation(timeoutMs = 12000): Promise<GeoCaptureResult> {
  if (typeof window === 'undefined') {
    return Promise.resolve({
      label: 'GPS unavailable',
      status: 'unavailable',
    });
  }

  if (!window.isSecureContext) {
    return Promise.resolve({
      label: 'GPS needs HTTPS (or localhost)',
      status: 'unavailable',
    });
  }

  if (!navigator.geolocation) {
    return Promise.resolve({
      label: 'GPS unavailable in this browser',
      status: 'unavailable',
    });
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        resolve({
          label: formatCoords(latitude, longitude),
          latitude,
          longitude,
          status: 'ok',
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          resolve({
            label: 'GPS not granted — enable location for this site',
            status: 'denied',
          });
          return;
        }
        if (error.code === error.TIMEOUT) {
          resolve({
            label: 'GPS timed out — try again outdoors',
            status: 'timeout',
          });
          return;
        }
        if (error.code === error.POSITION_UNAVAILABLE) {
          resolve({
            label: 'GPS unavailable — check device location services',
            status: 'unavailable',
          });
          return;
        }
        resolve({
          label: 'GPS error — try again',
          status: 'error',
        });
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 30_000,
      },
    );
  });
}

export function parseClockMinutes(value: string): number | null {
  const text = value.trim();
  if (!text || text === '—') return null;

  const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function formatWorkingHours(clockIn: string, clockOut: string): string {
  const start = parseClockMinutes(clockIn);
  const end = parseClockMinutes(clockOut);
  if (start === null || end === null) return '—';
  let delta = end - start;
  if (delta < 0) delta += 24 * 60;
  const hours = Math.floor(delta / 60);
  const minutes = delta % 60;
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
}
