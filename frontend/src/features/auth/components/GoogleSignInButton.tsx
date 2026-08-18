import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchGoogleAuthConfig } from '../../../api';

const GOOGLE_SCRIPT_ID = 'google-gsi-client';
const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

function envClientId() {
  return (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || '';
}

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();

  const existing = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    if (window.google?.accounts?.oauth2) return Promise.resolve();
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Google sign-in.')), {
        once: true,
      });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google sign-in.'));
    document.head.appendChild(script);
  });
}

interface GoogleSignInButtonProps {
  disabled?: boolean;
  onSuccess: (payload: { idToken?: string; accessToken?: string }) => void;
  onError: (message: string) => void;
}

export function GoogleSignInButton({
  disabled = false,
  onSuccess,
  onError,
}: GoogleSignInButtonProps) {
  const [busy, setBusy] = useState(false);
  const clientIdRef = useRef('');
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const config = await fetchGoogleAuthConfig();
        if (cancelled) return;
        clientIdRef.current = config.clientId?.trim() || envClientId();
      } catch {
        if (!cancelled) clientIdRef.current = envClientId();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClick = useCallback(async () => {
    if (disabled || busy) return;
    setBusy(true);
    try {
      let clientId = clientIdRef.current || envClientId();
      if (!clientId) {
        try {
          const config = await fetchGoogleAuthConfig();
          clientId = config.clientId?.trim() || envClientId();
          clientIdRef.current = clientId;
        } catch {
          clientId = envClientId();
        }
      }
      if (!clientId) {
        onErrorRef.current(
          'Google sign-in is not configured. Add GOOGLE_CLIENT_ID in backend/.env (or VITE_GOOGLE_CLIENT_ID in the frontend) and restart the server.',
        );
        return;
      }

      await loadGoogleScript();
      const oauth = window.google?.accounts?.oauth2;
      if (!oauth) {
        onErrorRef.current('Google sign-in failed to load. Check your network and try again.');
        return;
      }

      const client = oauth.initTokenClient({
        client_id: clientId,
        scope: 'openid email profile',
        callback: (response) => {
          if (response.error || !response.access_token) {
            onErrorRef.current(
              response.error_description || 'Google sign-in was cancelled. Please try again.',
            );
            return;
          }
          onSuccessRef.current({ accessToken: response.access_token });
        },
      });
      client.requestAccessToken({ prompt: 'select_account' });
    } catch (error) {
      onErrorRef.current(error instanceof Error ? error.message : 'Google sign-in is unavailable.');
    } finally {
      setBusy(false);
    }
  }, [busy, disabled]);

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={disabled || busy}
      className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
    >
      <GoogleMark />
      {busy ? 'Connecting to Google…' : 'Continue with Google'}
    </button>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
