'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { signoutIdle } from '@/app/(auth)/login/actions';
import {
  IDLE_HEARTBEAT_MS,
  IDLE_KEEPALIVE_PATH,
  IDLE_TIMEOUT_MS,
  IDLE_WARNING_MS,
} from '@/lib/auth/idle';

// Warning UI for the idle timeout. The actual enforcement lives in the proxy
// (lib/auth/idle.ts explains why) — this only exists so the sign-out doesn't
// arrive unannounced. If JS is off or the tab is closed, the proxy still expires
// the session; the user just doesn't get the countdown.

// Movement that shows someone is at the keyboard, but too easy to trigger by
// accident to count as "yes, keep me signed in" once the warning is up —
// reaching for the mouse to read the modal would dismiss it.
const PASSIVE_EVENTS = ['mousemove', 'wheel', 'scroll'];
// Deliberate input. These dismiss the warning: "click anywhere to continue".
const DELIBERATE_EVENTS = ['mousedown', 'keydown', 'touchstart'];

function formatCountdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export default function IdleTimeout() {
  // null while the user is active — the modal is mounted only during the warning.
  const [msLeft, setMsLeft] = useState(null);

  // Seeded in the mount effect rather than here — reading the clock during
  // render is impure, and on the server it would be the wrong clock anyway.
  const lastActivityRef = useRef(0);
  const lastPingRef = useRef(0);
  const warningRef = useRef(false);
  const signingOutRef = useRef(false);
  const stayButtonRef = useRef(null);

  const markActive = useCallback(() => {
    if (signingOutRef.current) return;
    lastActivityRef.current = Date.now();

    if (warningRef.current) {
      warningRef.current = false;
      setMsLeft(null);
    }

    // Keep the proxy's clock in step with real activity. Throttled, so reading
    // a page for ten minutes costs five requests rather than thousands.
    if (Date.now() - lastPingRef.current >= IDLE_HEARTBEAT_MS) {
      lastPingRef.current = Date.now();
      fetch(IDLE_KEEPALIVE_PATH, {
        method: 'POST',
        cache: 'no-store',
        keepalive: true,
      }).catch(() => {
        // Offline or mid-deploy. The next activity retries; worst case the
        // proxy expires the session, which is the safe direction to fail.
      });
    }
  }, []);

  const endSession = useCallback(() => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    signoutIdle().catch(() => {
      // The action redirects on success, so a rejection means it never landed.
      window.location.href = '/login?timeout=1';
    });
  }, []);

  useEffect(() => {
    // Mount is itself a page load, i.e. a request the proxy has just stamped,
    // so both clocks start together.
    lastActivityRef.current = Date.now();
    lastPingRef.current = Date.now();

    const onPassive = () => {
      if (!warningRef.current) markActive();
    };

    PASSIVE_EVENTS.forEach(event =>
      window.addEventListener(event, onPassive, { passive: true })
    );
    // Capture phase: a click that a component stops from bubbling is still
    // the user telling us they're here.
    DELIBERATE_EVENTS.forEach(event =>
      window.addEventListener(event, markActive, { capture: true, passive: true })
    );

    // Idle is measured as a wall-clock delta rather than a decrementing counter,
    // so it stays correct across background-tab throttling and laptop sleep.
    const tick = setInterval(() => {
      const idleFor = Date.now() - lastActivityRef.current;

      if (idleFor >= IDLE_TIMEOUT_MS) {
        endSession();
      } else if (idleFor >= IDLE_WARNING_MS) {
        warningRef.current = true;
        setMsLeft(IDLE_TIMEOUT_MS - idleFor);
      } else if (warningRef.current) {
        // Normally markActive() clears the warning, so this only catches the
        // odd case of idle time going DOWN on its own — an NTP correction or a
        // laptop waking with a re-synced clock. Without it the modal would be
        // stranded on screen with a frozen countdown.
        warningRef.current = false;
        setMsLeft(null);
      }
    }, 1000);

    return () => {
      PASSIVE_EVENTS.forEach(event => window.removeEventListener(event, onPassive));
      DELIBERATE_EVENTS.forEach(event =>
        window.removeEventListener(event, markActive, { capture: true })
      );
      clearInterval(tick);
    };
  }, [markActive, endSession]);

  const isWarning = msLeft !== null;
  useEffect(() => {
    if (isWarning) stayButtonRef.current?.focus();
  }, [isWarning]);

  if (!isWarning) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="idle-timeout-title"
      aria-describedby="idle-timeout-body"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-950/60 px-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-amber-50">
            <svg
              className="h-5 w-5 text-amber-500"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="idle-timeout-title" className="text-lg font-semibold text-gray-900">
              Still there?
            </h2>
            <p id="idle-timeout-body" className="mt-1 text-sm leading-relaxed text-gray-500">
              You&rsquo;ve been inactive for a while. For your security, we&rsquo;ll sign you out
              in{' '}
              <span
                aria-live="polite"
                className="font-semibold tabular-nums text-gray-900"
              >
                {formatCountdown(msLeft)}
              </span>
              . Click anywhere or press any key to stay signed in.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={endSession}
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            Sign out now
          </button>
          {/* The window-level listener already resets on any click, so this is
              belt-and-braces — but it keeps the button meaningful to anyone
              reading the markup, and to keyboard activation. */}
          <button
            ref={stayButtonRef}
            type="button"
            onClick={markActive}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  );
}
