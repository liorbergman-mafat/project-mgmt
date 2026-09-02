import { useEffect, useRef } from "react";

/**
 * Idle logout: after this long with no user interaction *anywhere in the app*
 * (any open tab), the session is ended and the login screen comes back.
 */
export const IDLE_LIMIT_MS = 15 * 60 * 1000;

// The last-activity timestamp lives in localStorage so activity in one tab
// keeps the others alive — "no activity on the site" means every tab is idle.
const STORAGE_KEY = "lm.last-activity";
// How often to check whether the limit has passed.
const CHECK_MS = 30 * 1000;
// Don't touch localStorage on every mouse move — once every this often is plenty.
const WRITE_THROTTLE_MS = 20 * 1000;
// Set for the login screen to read, so an idle logout can explain itself.
export const IDLE_FLAG_KEY = "lm.idle-logout";

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "pointerdown",
  "keydown",
  "wheel",
  "touchstart",
  "scroll",
];

/**
 * Runs only while `active` (i.e. signed in). Calls `onIdle` — pass `signOut` —
 * once the app has gone `IDLE_LIMIT_MS` without interaction.
 */
export function useIdleLogout(active: boolean, onIdle: () => void): void {
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!active) return;

    const readLast = (): number => {
      try {
        const v = Number(localStorage.getItem(STORAGE_KEY));
        return Number.isFinite(v) && v > 0 ? v : Date.now();
      } catch {
        return Date.now();
      }
    };
    const writeLast = (t: number): void => {
      try {
        localStorage.setItem(STORAGE_KEY, String(t));
      } catch {
        // Private mode / storage disabled — the in-tab timer below still works,
        // it just won't coordinate across tabs.
      }
    };

    // Fresh start whenever the session (re)starts.
    writeLast(Date.now());
    let lastWrite = Date.now();

    const bump = (): void => {
      const now = Date.now();
      if (now - lastWrite >= WRITE_THROTTLE_MS) {
        lastWrite = now;
        writeLast(now);
      }
    };

    const check = (): void => {
      if (Date.now() - readLast() < IDLE_LIMIT_MS) return;
      try {
        sessionStorage.setItem(IDLE_FLAG_KEY, "1");
      } catch {
        /* ignore */
      }
      onIdleRef.current();
    };

    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, bump, { passive: true }),
    );
    // Background tabs get their timers throttled, so a laptop shut for 20
    // minutes might not fire one in time — re-check the moment the tab is
    // looked at again.
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);

    const id = window.setInterval(check, CHECK_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, bump));
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(id);
    };
  }, [active]);
}
