import { useCallback, useState } from "react";
import { setApiActor } from "./api";
import type { User } from "./types";

/**
 * The signed-in session.
 *
 * Credentials are no longer in the bundle: the username/password pair is
 * checked by the API against the `users` table, which stores only a hash (see
 * backend/app/security.py), and the user record it returns is what this module
 * keeps. Everything the settings screen manages — adding people, editing them,
 * changing a password — flows through that same table.
 *
 * It is still a gate on the UI, not on the data. The API has no session of its
 * own: it accepts any request that reaches it, signed in or not, and `role` is
 * therefore a label the screens show rather than a permission anything
 * enforces. `is_active` *is* enforced, at sign-in. When Supabase Auth is wired
 * up, this is the module that changes; the components above it are not.
 */
export type SessionUser = User;

const SESSION_KEY = "loan-manager.session-user";

/** sessionStorage throws in some privacy modes, so every access is guarded. */
function read(): SessionUser | null {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as SessionUser;
    // A hand-edited value should not put a half-built user into the shell.
    return parsed && typeof parsed.id === "string" && typeof parsed.username === "string"
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function write(user: SessionUser | null): void {
  try {
    if (user) sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Not being able to persist it only costs the user a re-login on reload.
  }
}

// Set once at import, before anything renders: a reload restores the session
// from storage, and the very first request out has to already carry the name
// the activity log will credit.
setApiActor(read()?.username ?? null);

export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(read);

  const signIn = useCallback((next: SessionUser) => {
    write(next);
    setApiActor(next.username);
    setUser(next);
  }, []);

  const signOut = useCallback(() => {
    write(null);
    setApiActor(null);
    setUser(null);
  }, []);

  /**
   * Refresh the session from a freshly saved user record — so renaming
   * yourself, or changing your own role, shows up in the nav bar at once
   * instead of after the next sign-in.
   */
  const refresh = useCallback((next: SessionUser) => {
    setUser((current) => {
      if (!current || current.id !== next.id) return current;
      write(next);
      setApiActor(next.username);
      return next;
    });
  }, []);

  return { user, signIn, signOut, refresh };
}

/** "ליאור ברגמן" → "ל.ב" — the two-letter monogram in the nav bar avatar. */
export function initials(username: string): string {
  const parts = username.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join(".");
}
