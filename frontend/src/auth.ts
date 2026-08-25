import { useCallback, useState } from "react";

/**
 * PLACEHOLDER sign-in.
 *
 * The app has no authentication (see the Security section of the repo README):
 * the API is open and every request reaches it unauthenticated. This module
 * only decides which screen to render, so the login view in the design has
 * something to drive — it grants **no** security whatsoever, and the value it
 * keeps never leaves the browser tab.
 *
 * When Supabase Auth is wired up, replace the body of these functions with the
 * real session; the components above them do not need to change.
 */
const SESSION_KEY = "loan-manager.session-user";

/** sessionStorage throws in some privacy modes, so every access is guarded. */
function read(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
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

/** "l.bergman" → "L.B" — the two-letter monogram in the sidebar avatar. */
export function initials(username: string): string {
  const parts = username.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join(".");
}
