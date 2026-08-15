'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/*
 * ⚠ TEMPORARY — added 15 Aug 2026 because Google Safe Browsing flagged the
 * domain as a deceptive site. See CLAUDE.md "Done #46" for the full context
 * and for how to remove it.
 *
 * A cookie-banner-style notice on /login that says plainly whose site this is
 * and that OKC never asks for credentials out of band. It does not clear the
 * Safe Browsing flag on its own — that needs a review request in Google Search
 * Console — but it is the standard anti-phishing signal a human reviewer looks
 * for on a login page, and it is worth having regardless.
 *
 * Deliberately self-contained: one file, no CSS additions, no props, no server
 * work. Removing the feature is deleting this file and the two lines that
 * render it in app/(auth)/login/LoginClient.jsx.
 *
 * ⚠ /login is also the ALB health check path (Done #41), so nothing here may
 * touch the database or throw during render — an outage caused by a cosmetic
 * banner would pull every instance out of the load balancer.
 */

const AUTO_DISMISS_MS = 15_000;
const TICK_MS = 250;
const STORAGE_KEY = 'okc-security-notice-dismissed';
// Bump when the copy changes so people who dismissed the old wording see the
// new one instead of it staying hidden forever.
const NOTICE_VERSION = '1';

const CONTACT_EMAIL = 'im@okc.com';

// Inlined at build time from NEXT_PUBLIC_SITE_URL. Wrapped because a missing
// or malformed value would otherwise throw while rendering the health check
// path; falling back to null just drops the domain from the copy.
const EXPECTED_HOST = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL).host;
  } catch {
    return null;
  }
})();

export default function SecurityNotice() {
  // Both start false so the server render and the first client render agree —
  // the real decision needs localStorage, which only exists after mount.
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);
  // A ref, not state: the countdown reads it every tick and must not restart
  // the timer each time the pointer moves on or off the card.
  const pausedRef = useRef(false);

  const dismiss = useCallback(() => {
    setLeaving(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, NOTICE_VERSION);
    } catch {
      // Storage disabled or full. The notice still closes; it just reappears
      // next visit, which is the harmless direction to fail.
    }
    // Unmount only after the fade-out has had time to run.
    window.setTimeout(() => setVisible(false), 200);
  }, []);

  // Decide whether to show at all. Deferred by a frame rather than run in the
  // effect body: setting state synchronously there is a cascading render (and
  // react-hooks/set-state-in-effect rejects it), while a frame later is both
  // cheap and after paint.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      let dismissed = null;
      try {
        dismissed = window.localStorage.getItem(STORAGE_KEY);
      } catch {
        // Private browsing: treat as never dismissed.
      }
      if (dismissed !== NOTICE_VERSION) setVisible(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Entrance transition. The element mounts already in its "hidden" classes,
  // so the visible state has to be applied on a later frame for the browser to
  // have something to animate between.
  useEffect(() => {
    if (!visible) return undefined;
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [visible]);

  // Auto-dismiss. Counted down in ticks rather than one setTimeout so hovering
  // can pause it — otherwise the notice can vanish just as someone reaches for
  // the contact link inside it.
  useEffect(() => {
    if (!visible || leaving) return undefined;
    let remaining = AUTO_DISMISS_MS;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      remaining -= TICK_MS;
      if (remaining <= 0) {
        clearInterval(id);
        dismiss();
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [visible, leaving, dismiss]);

  if (!visible) return null;

  const shown = entered && !leaving;

  return (
    // The wrapper spans the viewport so the card can be centred, but stays
    // click-through — only the card itself takes pointer events, so it never
    // swallows a click meant for the form behind it.
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-3 sm:p-5">
      <div
        role="status"
        aria-live="polite"
        onMouseEnter={() => {
          pausedRef.current = true;
        }}
        onMouseLeave={() => {
          pausedRef.current = false;
        }}
        // React's focus events bubble, so these also fire for the dismiss
        // button and the mailto link — keyboard users get the same pause.
        onFocus={() => {
          pausedRef.current = true;
        }}
        onBlur={() => {
          pausedRef.current = false;
        }}
        className={`pointer-events-auto w-full max-w-2xl rounded-2xl border border-[#d8e1ef] bg-white/95 p-4 shadow-xl shadow-slate-900/10 backdrop-blur transition-all duration-200 motion-reduce:transition-none sm:p-5 ${
          shown ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
        }`}
      >
        <div className="flex items-start gap-3 sm:gap-4">

          <span
            aria-hidden="true"
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#1554ff]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M12 3 4 6v6c0 4.4 3.4 8.3 8 9 4.6-.7 8-4.6 8-9V6l-8-3Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </span>

          <div className="min-w-0 flex-1">

            <p className="text-sm font-semibold text-[#071437]">
              You&rsquo;re on the official OKC investor portal
              {EXPECTED_HOST && (
                <>
                  {' — '}
                  <span className="font-mono font-medium">{EXPECTED_HOST}</span>
                </>
              )}
            </p>

            <p className="mt-1 text-sm leading-relaxed text-[#6b7894]">
              We use only the cookies needed to keep you signed in. OKC will never ask for
              your password, one-time code, or bank details by email, phone, or message
              &mdash; if something asks for those, don&rsquo;t respond and contact{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-medium text-[#1f6bff] hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>

          </div>

          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss notice"
            className="-m-1 shrink-0 rounded-lg p-1 text-[#7c8aa5] transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6bff]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>

        </div>
      </div>
    </div>
  );
}
