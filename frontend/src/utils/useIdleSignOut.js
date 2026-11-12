import { useCallback, useEffect, useRef, useState } from 'react';
import { getLastActivity, markActivity } from './tabSession';

export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
export const IDLE_WARNING_MS = 2 * 60 * 1000;

// Only the user's own input counts; background requests don't keep a tab signed in
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'];
const LISTENER = { capture: true, passive: true };
const MARK_EVERY_MS = 1000;

/**
 * Signs the tab out after timeoutMs without user input, with a warning for the last warningMs.
 * Returns warningDeadline (ms, while the warning shows) and stayActive.
 */
export default function useIdleSignOut({ enabled, onIdle, timeoutMs = IDLE_TIMEOUT_MS, warningMs = IDLE_WARNING_MS }) {
  const [warningDeadline, setWarningDeadline] = useState(null);
  const onIdleRef = useRef(onIdle);
  const checkRef = useRef(() => {});

  useEffect(() => {
    onIdleRef.current = onIdle;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    if (!getLastActivity()) markActivity();

    let timer = null;
    let warning = false;
    let lastMark = 0;

    const check = () => {
      clearTimeout(timer);
      const deadline = (getLastActivity() ?? Date.now()) + timeoutMs;
      const left = deadline - Date.now();
      if (left <= 0) {
        warning = false;
        setWarningDeadline(null);
        onIdleRef.current();
        return;
      }
      warning = left <= warningMs;
      setWarningDeadline(warning ? deadline : null);
      // Timers in hidden or sleeping tabs fire late; check() works from the clock, not the timer
      timer = setTimeout(check, warning ? left : left - warningMs);
    };

    const onActivity = () => {
      // Once the warning shows, only "Stay signed in" keeps the session
      if (warning) return;
      const now = Date.now();
      if (now - lastMark < MARK_EVERY_MS) return;
      lastMark = now;
      markActivity(now);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };

    ACTIVITY_EVENTS.forEach((type) => window.addEventListener(type, onActivity, LISTENER));
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    checkRef.current = check;
    timer = setTimeout(check, 0);

    return () => {
      clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((type) => window.removeEventListener(type, onActivity, LISTENER));
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
      checkRef.current = () => {};
      setWarningDeadline(null);
    };
  }, [enabled, timeoutMs, warningMs]);

  const stayActive = useCallback(() => {
    markActivity();
    checkRef.current();
  }, []);

  return { warningDeadline, stayActive };
}
