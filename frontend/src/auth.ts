import { useCallback, useState } from "react";

/**
 * PLACEHOLDER sign-in.
 *
 * The app has no authentication backend (see the Security section of the repo
 * README): the API is open and every request reaches it unauthenticated. This
 * module only decides which screen to render, so the login view in the design
 * has something to drive.
 *
 * The credential list below narrows the login screen to two known people, but
 * it grants **no** security: the pairs ship inside the browser bundle and are
 * readable by anyone who opens it, and nothing stops a direct call to the API.
 * It is a gate on the UI, not on the data.
 *
 * When Supabase Auth is wired up, replace `verify` and the session helpers with
 * the real session; the components above them do not need to change.
 */

/** The people allowed past the login screen. */
const USERS: ReadonlyArray<{ username: string; password: string }> = [
  { username: "ליאור ברגמן", password: "ליאור ברגמן" },
  { username: "חבר לבנוני", password: "Hever9764!" },
];

/** Collapses runs of whitespace so a stray double space still matches. */
function normalize(value: string): string {
  return value.trim().replace(/\s+/gu, " ");
}

/**
 * Checks a username/password pair against the list above.
 *
 * Returns the canonical username on success — so the session and the nav bar
 * show the spelling from `USERS`, not whatever casing was typed — or `null`.
 */
export function verify(username: string, password: string): string | null {
  const typed = normalize(username);
  const match = USERS.find(
    (user) => user.username.localeCompare(typed, undefined, { sensitivity: "accent" }) === 0,
  );
  return match && match.password === password ? match.username : null;
}

const SESSION_KEY = "loan-manager.session-user";

/** sessionStorage throws in some privacy modes, so every access is guarded. */
function read(): string | null {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    // A hand-edited value should not open the app to a name nobody granted.
    return USERS.some((user) => user.username === stored) ? stored : null;
  } catch {
    return null;
  }
}

export function useSession() {
  const [user, setUser] = useState<string | null>(read);

  const signIn = useCallback((username: string) => {
    try {
      sessionStorage.setItem(SESSION_KEY, username);
    } catch {
      // Not being able to persist it only costs the user a re-login on reload.
    }
    setUser(username);
  }, []);

  const signOut = useCallback(() => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Nothing to clean up.
    }
    setUser(null);
  }, []);

  return { user, signIn, signOut };
}

/** "l.bergman" → "L.B" — the two-letter monogram in the nav bar avatar. */
export function initials(username: string): string {
  const parts = username.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join(".");
}
