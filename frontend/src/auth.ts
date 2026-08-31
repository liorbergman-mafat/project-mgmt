import { useCallback, useEffect, useState } from "react";
import { setApiOnExpired, setApiToken } from "./api";
import type { User } from "./types";

/**
 * The signed-in session.
 *
 * Sign-in checks the username/password pair against the `users` table, which
 * stores only a hash (see backend/app/security.py), and answers with a signed
 * bearer token plus the user record. The token is what makes this a real
 * session: the API refuses every request that does not carry a valid one, so
 * this module gates the data and not merely the screens.
 *
 * `role` is enforced server-side too — managing accounts and reading the
 * activity log require an administrator — and `is_active` is re-checked on
 * every request, so disabling an account ends its open session at once.
 */
export type SessionUser = User;

export interface Session {
  token: string;
  user: SessionUser;
}

const SESSION_KEY = "loan-manager.session";

/** sessionStorage throws in some privacy modes, so every access is guarded. */
function read(): Session | null {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Session;
    // A hand-edited value should not put a half-built session into the shell.
    // It buys nothing against the API — the token is signed — but it keeps the
    // components above from rendering against a malformed user.
    return parsed &&
      typeof parsed.token === "string" &&
      parsed.user &&
      typeof parsed.user.id === "string" &&
      typeof parsed.user.username === "string"
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function write(session: Session | null): void {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Not being able to persist it only costs the user a re-login on reload.
  }
}

// Set once at import, before anything renders: a reload restores the session
// from storage, and the very first request out has to already carry the token.
setApiToken(read()?.token ?? null);

export function useSession() {
  const [session, setSession] = useState<Session | null>(read);

  const signIn = useCallback((next: Session) => {
    write(next);
    setApiToken(next.token);
    setSession(next);
  }, []);

  const signOut = useCallback(() => {
    write(null);
    setApiToken(null);
    setSession(null);
  }, []);

  // The API rejecting the token has to end the session here too, or the shell
  // keeps rendering screens whose every request will fail.
  useEffect(() => {
    setApiOnExpired(signOut);
  }, [signOut]);

  /**
   * Refresh the session from a freshly saved user record — so renaming
   * yourself, or changing your own role, shows up in the nav bar at once
   * instead of after the next sign-in. The token is unaffected.
   */
  const refresh = useCallback((next: SessionUser) => {
    setSession((current) => {
      if (!current || current.user.id !== next.id) return current;
      const updated = { token: current.token, user: next };
      write(updated);
      return updated;
    });
  }, []);

  return { user: session?.user ?? null, signIn, signOut, refresh };
}

/** "ליאור ברגמן" → "ל.ב" — the two-letter monogram in the nav bar avatar. */
export function initials(username: string): string {
  const parts = username.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join(".");
}
